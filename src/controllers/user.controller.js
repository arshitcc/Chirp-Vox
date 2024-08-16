import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.models.js";
import { uploadFile } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/apiResponse.js";
import jwt from 'jsonwebtoken'

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

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

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

export { userSignup, userLogin, userLogout, refreshAccessToken }