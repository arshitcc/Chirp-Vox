import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import mongoose, {isValidObjectId} from "mongoose";
import { Video } from "../models/video.models.js";
import { Subscription } from "../models/subscriptions.models.js";

const getChannelStats = asyncHandler(async(req, res) => {
    const userId = req.user?._id;

    if(!userId || !isValidObjectId(userId)) {
        throw new ApiError(400, `Invalid User`);
    }

    const subscriberStats = await Subscription.aggregate([
        {
            $match : {
                channel : new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $group: {
                _id: null,
                totalSubscribers: { $sum: 1 }
            }
        }
    ])

    const channelStats = await Video.aggregate([
        {
            $match: {
                videoOwner: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup: {
                from: 'comments',
                foreignField: 'video',
                localField: '_id',
                as: 'comments'
            }
        },
        {
            $lookup: {
                from: 'likes',
                foreignField: 'liked_video',
                localField: '_id',
                as: 'likes'
            }
        },
        {
            $group: {
                _id: null,
                totalViews: { $sum: "$videoViews" },
                totalLikes: { $sum: { $size: "$likes" } },
                totalComments: { $sum: { $size: "$comments" } },
                totalVideos: { $sum: 1 },
            }
        }
    ]);

    const myChannelStats = {
        totalSubscribers: subscriberStats[0]?.totalSubscribers || 0,
        totalLikes: channelStats[0]?.totalLikes || 0,
        totalViews: channelStats[0]?.totalViews || 0,
        totalVideos: channelStats[0]?.totalVideos || 0,
        totalComments: channelStats[0]?.totalComments || 0
    };

    return res.status(200)
            .json(
                new ApiResponse(200, myChannelStats, `Channel Stats fetched Successfully !!`)
            );
});


const getChannelVideos = asyncHandler(async(req,res) => {

    const userId = req.user?._id;

    if(!userId || !isValidObjectId(userId)){
        throw new ApiError(400, `Invalid User`);
    }

    const videos = await Video.aggregate([
        {
            $match : {
                videoOwner : new mongoose.Types.ObjectId(userId)
            }       
        },
        {
            $lookup : {
                from : 'likes',
                foreignField : 'liked_video',
                localField : '_id',
                as : 'liked',
            }
        },
        {
            $lookup : {
                from :  'comments',
                foreignField : 'video',
                localField : '_id',
                as : 'comments'
            }
        },
        {
            $sort: {
                createdAt: -1
            }
        },
        {
            $addFields : {
                likes : {
                    $size : '$liked'
                },
                comments : {
                    $size : '$comments'
                },
                createdAt: {
                    $dateToParts: { date: "$createdAt" }
                },
            }
        }
    ])

    if(!videos){
        throw new ApiError(501, `System Failed to Fetch Channel Videos !!`);
    }

    return res.status(200)
              .json(
                new ApiResponse(200, videos, `Channel Videos fetched Successfully !!`)
              );
})


export {
    getChannelStats,
    getChannelVideos
}