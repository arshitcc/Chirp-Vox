import { Tweet } from "../models/tweets.models.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import mongoose, {isValidObjectId} from "mongoose";

const createTweet = asyncHandler(async(req,res) => {

    const {tweet_content} = req.body;

    if(!tweet_content.trim()){
        throw new ApiError(400, `Please Fill the field`);
    }

    const tweet = await Tweet.create({
        tweet_owner : req.user?.id,
        tweet_content
    });

    if(!tweet){
        throw new ApiError(500, `System Failed to make tweet!! Please Try Again !!`);
    }

    return res.status(200)
              .json(
                new ApiResponse(200, tweet, `Tweet Created Successfully`)
              );

})

const deleteTweet = asyncHandler(async(req,res) => {
    const {tweetId} = req.params;

    if(!isValidObjectId(tweetId)){
        throw new ApiError(400, `Invalid Tweet`);
    }

    const tweet = await Tweet.findById(tweetId);
    if(!tweet){
        throw new ApiError(404, `Tweet Not Found`);
    }

    if (tweet?.tweet_owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(400, `Unauthorized request to perform this action !!`);
    }

    await Tweet.findByIdAndDelete(tweetId);

    return res.status(200)
              .json(
                new ApiResponse(200, {}, `Tweet Deleted Successfully !!`)
              );
})

const getUserTweets = asyncHandler(async(req,res) => {

    const {userId} = req.params;

    if(!isValidObjectId(userId)){
        throw new ApiError(400, `Invalid User`);
    }

    const tweets = await Tweet.aggregate([
        {
            $match : {
                tweet_owner : new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup : {
                from : 'likes',
                localField : '_id',
                foreignField : 'liked_tweet',
                as : 'liked',
                pipeline : [
                    {
                        $project : {
                            liked_by : 1
                        }
                    }
                ]
            }
        },
        {
            $lookup : {
                from : 'users',
                localField : 'tweet_owner',
                foreignField : '_id',
                as : 'owner',
                pipeline : [
                    {
                        $project : {
                            userName : 1,
                            userFullName : 1,
                            userAvatar : 1,
                        }
                    }
                ]
            }
        },
        {
            $addFields : {
                likes : {
                    $size : '$liked'
                },
                isLiked : {
                    $cond : {
                        if: {
                            $in: [req.user?._id, "$liked.liked_by"]
                        },
                        then: true,
                        else: false
                    }
                },
                owner : {
                    $first : '$owner'
                },
            }
        },
        {
            $sort: {
                updatedAt: -1
            }
        },
        {
            $project: {
                tweet_content: 1,
                tweet_owner: 1,
                likes: 1,
                isLiked: 1,
                liked : 1,
                owner : 1,
                createdAt: 1,
            },
        },

    ]);

    if(!tweets){
        throw new ApiError(404, `No Tweets Found !!`);
    }

    return res.status(200)
              .json(
                new ApiResponse(200, tweets, `User Tweets fetched Successfully !!`)
              );

})

const updateTweet = asyncHandler(async(req,res) => {

    const {tweet_content} = req.body;
    const {tweetId} = req.params;

    if(!isValidObjectId(tweetId)){
        throw new ApiError(400, `Invalid Tweet !!`);
    }

    if(!tweet_content?.trim()){
        throw new ApiError(401, `Please Fill the field`);
    }

    const tweet = await Tweet.findById(tweetId);
    if(!tweet){
        throw new ApiError(404, `Tweet Not Found`);
    }

    if (tweet?.tweet_owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(400, `Unauthorized request to perform this action !!`);
    }

    const updatedTweet = await Tweet.findByIdAndUpdate(
        tweetId,
        {
            $set : {
                tweet_content
            }
        },
        {
            new : true
        }
    );

    if(!updatedTweet){
        throw new ApiError(500, `Unable to update your Tweet !!`);
    }

    return res.status(200)
              .json(
                new ApiResponse(200, updatedTweet, `Tweet updated Successfully !!`)
              );

})


export {
    createTweet,
    deleteTweet,
    getUserTweets,
    updateTweet
}