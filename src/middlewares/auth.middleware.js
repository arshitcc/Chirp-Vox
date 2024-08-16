import { User } from "../models/user.models.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from 'jsonwebtoken'

export const verifyJWT = asyncHandler( async(req, _, next) => {
    try {
        const token = req.cookies?.accessToken || req.headers("Authorization")?.replace("Bearer ","");
        if(!token){
            throw new ApiError(400, "Unauthorised User");
        }

        const myToken = jwt.verify(token,process.env.ACCESS_TOKEN_SECRET); // token_data only not user_data
        const user = await User.findById(myToken?._id).select("-password -refreshToken");
        if(!user){
            throw new ApiError(401, "Unauthorised Token Access");
        }
        req.user = user; // new key in request created. It could be req.your_name
        next()
    } catch (error) {
        throw new ApiError(402,error.message || "Unauthorised Token Access");
    }
})