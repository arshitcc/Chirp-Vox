import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.models.js";
import { uploadFile } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/apiResponse.js";

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

export { userSignup }