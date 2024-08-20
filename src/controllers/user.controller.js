import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.models.js";
import { uploadFile } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/apiResponse.js";
import jwt from 'jsonwebtoken'
import mongoose from "mongoose";

const generateAccessAndRefreshTokens = async (user) => {
    try {
        // const user = await User.findById(user_id);
        const accessToken = await user.generateAccessToken();
        const refreshToken = await user.generateRefreshToken();
        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave : false })
        return {accessToken, refreshToken};

    } catch (error) {
        throw new ApiError(500,"!! Unable to generate Web Tokens !!");
    }
}

const userSignup = asyncHandler(async (req, res) => {
   
    /* 
        res.status(201).json({
            message : 'Account has been created BITCH!!',
        })
    */

    const {userFullName, userEmail, userName, userPassword, userConfirmPassword} = req.body;

    if(
        [userFullName, userEmail, userName, userPassword, userConfirmPassword].some((field) => 
            (field?.trim() === '')
        )
    ){
        throw new ApiError(400,"Please Fill all the fields !!");
    }

    if(userPassword !== userConfirmPassword){
        throw new ApiError(400,`Password didn't Match. Re-enter your password`);
    }


    /*
        if(User.findOne({userEmail})){
            throw new ApiError(401, 'User account already exists !!');
        }

        if(User.findOne({userName})){
            throw new ApiError(402, 'username is already taken!!')
        }
    */

    const userExists = await User.findOne({
        $or : [{userName}, {userEmail}]
    })

    if(userExists){
        throw new ApiError(401,"User with same username or useremail Already Exists");
    }

    // const userAvatar_LocalPath = req.files?.userAvatar[0]?.path ;
    let userAvatar_LocalPath;
    if (req.files && (req.files.userAvatar) && req.files.userAvatar.length > 0) {
        userAvatar_LocalPath = req.files.userAvatar[0].path
    }
    // console.log(userAvatar_LocalPath);
    if(!userAvatar_LocalPath) {
        throw new ApiError(400,'Profile Image is Requried!!');
    }

    
    let userCoverImage_LocalPath;
    if (req.files && (req.files.coverImage) && req.files.coverImage.length > 0) {
        userCoverImage_LocalPath = req.files.coverImage[0].path
    }
    // const userCoverImage_LocalPath = req.files?.userCoverImage[0]?.path


    const userAvatar = await uploadFile(userAvatar_LocalPath);
    console.log(`user controller : ${userAvatar}`);
    const userCoverImage = await uploadFile(userCoverImage_LocalPath); 
    // Already Applied check in utils if locally doesn't exists 

    // Another check if anything goes wrong in uploading and if you uploaded null in DB, DataBase is gonna crash.
    if(!userAvatar) throw new ApiError(400, 'Profile Image is Required !!');

    const user = await User.create({
        userFullName,
        userName : userName.toLowerCase(),
        userEmail,
        userPassword,
        userAvatar : userAvatar.url,
        userCoverImage : userCoverImage?.url || "",
    })

    const newUser = await User.findById(user._id).select(
        "-userPassword -refreshToken"
    )
    if(!newUser){
        throw new ApiError(500,'Something Went Wrong !! User not created !!');
    }
    console.log(newUser);
    
    return res.status(201).json(
        new ApiResponse(201,newUser,"User Registered Successfully !!")
    )
    


    console.log('userEmail : ',userEmail);
    console.log('userName : ',userName);
    console.log('userFullName : ',userFullName);

})

const userLogin = asyncHandler( async (req, res) => {

    /* 
        1. Collect the data from front-end.
        2. Validate all fields
        3. Search for the username or userEmail in the backend and match the password.
        3.1 As the password is encrypted. Bring the decrypted password
        4. Work on errors like 'user not found', 'wrong password entered'.
        5. Password Check
        6. Generate Access Token and Refresh Token
        7. Send secure cookies.
    */

    const {userName, userEmail, userPassword} = req.body;
   
    if(!userName && !userEmail){
        throw new ApiError(400,'Enter a valid useremail or username');
    } 

    if(userPassword.trim() === ""){
        throw new ApiError(400,'Please Fill all the fields');
    }

    const user = await User.findOne({
        $or : [{userEmail}, {userName}]
    })

    if(!user){
        throw new ApiError(401, `User doesn't exist`);
    }

    const isValidPassword = await user.isPasswordCorrect(userPassword);

    if(!isValidPassword){
        throw new ApiError(402,`Password didn't match`);
    }

    const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user);

    const loggedInUser = await User.findById(user._id).select("-userPassword -refreshToken");

    const options = {
        httpOnly : true,
        secure : true
    }

    return res.status(200)
              .cookie('accessToken',accessToken,options)
              .cookie('refreshToken',refreshToken,options)
              .json(
                new ApiResponse(
                    200,
                    {
                        user : loggedInUser,
                        accessToken,
                        refreshToken
                    },
                    "User Logged In Successfully"
                )
              )

    /* 
        res.cookie('token_name', 'token_value', {
            secure: true,           // Only send over HTTPS
            httpOnly: true,         // Not accessible via JavaScript
            sameSite: 'Lax',        // Protect against CSRF
            domain: 'example.com',  // Available to the domain and subdomains
            path: '/',              // Available across the site
            maxAge: 3600000         // 1-hour expiration
        });
    */
})

const userLogout = asyncHandler( async (req,res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set : {
                refreshToken : undefined
            }
        },
        {
            new : true
        }
    )

    const options = {
        httpOnly : true,
        secure : true
    }

    return res.status(200)
              .clearCookie('accessToken',options)
              .clearCookie('refreshToken',options)
              .json(
                new ApiResponse(200,{},"User Logged Out Successfully")
              )
})

const refreshAccessToken = asyncHandler( async (req, res) => {
    try {
        const myRefreshToken = req.cookies?.refreshToken || req.body.refreshToken;
        if(!myRefreshToken){
            throw new ApiError(401,"Unauthorised Request");
        }
        const myDecodedToken = jwt.verify(myRefreshToken,process.env.REFRESH_TOKEN_SECRET);
        if(!myDecodedToken){
            throw new ApiError(402,"Unauthorised Token Access");
        }
        const user = await User.findById(myDecodedToken?._id);
        if(!user){
            throw new ApiError(403, `Unauthorised Token Access`);
        }

        if(user.refreshToken !== myRefreshToken){
            throw new ApiError(404, `Unauthorised Refresh Token`);
        }

        const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user);

        const options = {
            httpOnly : true,
            secure : true
        }

        return res.status(200)
                  .cookie('accessToken',accessToken, options)
                  .cookie('refreshToken',refreshToken, options)
                  .json(
                    new ApiResponse(200,{
                        accessToken, 
                        refreshToken
                    },"New Refresh Token Generated Successfully !!")
                  )

    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }
})

const getCurrentUser = asyncHandler( async(req, res) => {
    return res.status(200)
              .json(new ApiResponse(200,req.user,"User Fetched Successfully !!"))
})

const updatePassword = asyncHandler( async(req, res) => {
    const {oldPassword, newPassword, confirmPassword} = req.body;

    if(
        [oldPassword, newPassword, confirmPassword].some((field) => field.trim() === "")
    ){
        throw new ApiError(403,"Enter your OLD password");
    }

    if(newPassword !== confirmPassword){
        throw new ApiError(403, "Password didn't match.")
    }

    const accessToken = req.cookies?.accessToken || req.headers("Authorization")?.replace("Bearer ","");
    const myToken = jwt.verify(accessToken,process.env.ACCESS_TOKEN_SECRET);
    if(!myToken){
        throw new ApiError(403, "Unauthorized Token");
    }
    const user = await User.findById(myToken._id);
    if(!user){
        throw new ApiError(403, "Unauthorized User");
    }

    const isValidPassword = await user.isPasswordCorrect(oldPassword);
    if(!isValidPassword){
        throw new ApiError(403, "Wrong Password !!");
    }

    user.userPassword = newPassword;
    user.save({validateBeforeSave : false});

    return res.status(200)
              .json(new ApiResponse(200,{},"Password Changed Successfully"))

})

const updateAccountDetails = asyncHandler( async(req, res) => {
    
    // verify JWT
    const {userFullName, userEmail} = req.body;
    if(!userFullName || !userEmail){
        throw new ApiError(401, "Please Enter all the fields.")
    }


    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set : {
                userEmail,
                userFullName
            }
        },
        {
            new : true
        }
    ).select('-userPassword')
    
    return res.status(200)
              .json(
                new ApiResponse(200, user, "!! Account details Updated Successfully !!")
              )
})

const updateAvatar = asyncHandler( async(req, res) => {

    // TODO : Remove Old avatar from cloudinary. Make a utility

    const newAvatar_LocalPath = req.file?.path || "";
    const newAvatar = (newAvatar_LocalPath !== "")? await uploadFile(newAvatar_LocalPath) : "";

    if(newAvatar === "" || !newAvatar.url){
        throw new ApiError(402, "Images not found");
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set : {
                userAvatar : newAvatar.url,

            }
        },
        {
            new : true
        }
    ).select('-userPassword');

    return res.status(200)
              .json(
                new ApiResponse(200, user, "!! Avatars Updated Successfully !!")
              )             
})

const updateCoverImage = asyncHandler( async(req, res) => {
    
    // TODO : Remove Old avatar from cloudinary. Make a utility

    const newCoverImage_LocalPath = req.file?.path || "";
    const newCoverImage = (newCoverImage_LocalPath !== "")? await uploadFile(newCoverImage_LocalPath) : "";

    if(newCoverImage === "" || !newCoverImage.url){
        throw new ApiError(402, "Cover Image not found");
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set : {
                userCoverImage : newCoverImage.url,
            }
        },
        {
            new : true
        }
    ).select('-userPassword');

    return res.status(200)
              .json(
                new ApiResponse(200, user, "!! Cover Image Updated Successfully !!")
              )             
})

const getChannel = asyncHandler( async(req, res) => {
    
    const {userName} = req.params;
    if(!userName || userName.trim()===""){
        throw new ApiError(401, "Invalid Channel Name");
    }

    const channel = await User.aggregate([
        {
            $match : {
                userName : userName?.toLowerCase()
            }
        },
        {
            $lookup : {
                from : "subscriptions",
                localField : "_id",
                foreignField : "channel",
                as : "subscribers"
            }
        },
        {
            $lookup : {
                from : 'subscriptions',
                localField : "_id",
                foreignField : "",
                as : "subscribedTo"
            }
        },
        {
            $addFields : {
                subscribersCount : {
                    $size : "$subscribers"
                },
                subscribedToCount : {
                    $size : "$subscribedTo"
                },
                isSubscribed : {
                    $cond : {
                        if : {$in : [req.user?._id, "$subscribers.subscriber"]},
                        then : true,
                        else : false
                    }
                }
            }
        },
        {
            $project : {
                userFullName : 1,
                userName : 1,
                userAvatar : 1,
                userCoverImage : 1,
                subscribersCount : 1,
                subscribedToCount : 1,
                isSubscribed : 1,
            }
        }
    ])

    // console.log(channel);

    if(!channel?.length){
        throw new ApiError(402, "Channel doesn't Exists");
    }

    return res.status(200)
              .json(new ApiResponse(200,channel[0], "Channel Fetched Successfully"))
    
})

const getWatchHistory = asyncHandler(async (req, res) => {

    const user = User.aggregate([
        {
            $match : {
                _id : new mongoose.Types.ObjectId(req.user?._id)
            }
        },
        {
            $lookup : {
                localField : 'userWatchHistory',
                from : 'videos',
                foreignField : 'videoOwner',
                as : 'userWatchHistory',
                pipeline : [
                    {
                        $lookup : {
                            localField : 'videoOwner',
                            from : 'users',
                            foreignField : '_id',
                            as : 'videoOwner',
                            pipeline : [
                                {
                                    $project : {
                                        userFullName : 1,
                                        userName : 1,
                                        userAvatar : 1,
                                        userCoverImage : 1
                                    }
                                }
                            ]
                        } 
                    },
                    {
                        $addFields : {
                            videoOwner : {
                                $first : '$videoOwner'
                            }
                        }
                    }
                ]
            }
        }
    ])

    // console.log(user);
    
    return res.status(200)
              .json(new ApiResponse(
                200,
                user[0].watchHistory,
                "Watch History fetched Successfully"
              )
            )
})

export { 
    userSignup, 
    userLogin, 
    userLogout, 
    refreshAccessToken, 
    getCurrentUser, 
    updatePassword, 
    updateAccountDetails, 
    updateAvatar, 
    updateCoverImage ,
    getChannel,
    getWatchHistory
}
