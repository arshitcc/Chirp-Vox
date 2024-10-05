import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import mongoose, {isValidObjectId} from "mongoose";
import { Like } from "../models/likes.models.js";

const getLikedVideos = asyncHandler(async(req,res) => {

    // const {} = req.query;
    const userId = req.user?._id;

    if(!isValidObjectId(userId)){
        throw new ApiError(400, `Invalid User`);
    }

    const liked = await Like.aggregate([
        {
            $match : {
                liked_by : new mongoose.Types.ObjectId(userId),
                liked_video: { $ne: null } 
            }
        },
        {
            $lookup : {
                from : 'videos',
                localField : 'liked_video',
                foreignField : '_id',
                as : 'videos'
            }
        },
        {
            $sort : {
                updatedAt : -1
            }
        },
        {
            $addFields: {
                videos : {
                    $first : '$videos'
                }
            }
        },
        
    ])

    if(!liked){
        throw new ApiError(404, `No Videos Found !!`);
    }

    return res.status(200)
              .json(
                new ApiResponse(200, liked, `Liked Videos Fetched Successfully !!`)
              );
})

const toggleVideoLike = asyncHandler(async(req,res) => {
    const {videoId} = req.params;

    if(!isValidObjectId(videoId)){
        throw new ApiError(400, `Invalid Video`);
    }

    const liked = await Like.findOne({
        liked_by : req.user._id,
        liked_video : videoId
    });

    let isLiked = false;

    if(liked) await Like.findByIdAndDelete(liked?._id);
    else {
        await Like.create({
            liked_by : req.user._id,
            liked_video : videoId
        })
        isLiked = true;
    }

    return res.status(200)
              .json(
                new ApiResponse(200,{ isLiked },`Video-Like Toggled Successfully !!`)
              );
})

const toggleTweetLike = asyncHandler(async(req,res) => {
    const {tweetId} = req.params;

    if(!isValidObjectId(tweetId)){
        throw new ApiError(400, `Invalid Tweet`);
    }

    const tweet = await Like.findOne({
        liked_by : req.user._id,
        liked_tweet : tweetId
    });
    
    let isLiked = false;

    if(tweet) await Like.findByIdAndDelete(tweet?._id);
    else {
        await Like.create({
            liked_by : req.user._id,
            liked_tweet : tweetId
        })
        isLiked = true;
    }

    return res.status(200)
              .json(
                new ApiResponse(200,{ isLiked },`Tweet-Like Toggled Successfully !!`)
              );
})

const toggleCommentLike = asyncHandler(async(req,res) => {
    const {commentId} = req.params;

    if(!isValidObjectId(commentId)){
        throw new ApiError(400, `Invalid Comment`);
    }

    const commented = await Like.findOne({
        liked_by : req.user._id,
        liked_comment : commentId
    });

    let isLiked = false;

    if(commented) await Like.findByIdAndDelete(commented?._id);
    else {
        await Like.create({
            liked_by : req.user._id,
            liked_comment : commentId
        })
        isLiked = true;
    }

    return res.status(200)
              .json(
                new ApiResponse(200,{ isLiked },`Video Toggled Successfully`)
              );
})

export {
    getLikedVideos,
    toggleVideoLike,
    toggleTweetLike,
    toggleCommentLike
}