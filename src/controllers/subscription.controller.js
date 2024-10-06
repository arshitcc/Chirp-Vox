import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import mongoose, {isValidObjectId} from "mongoose";
import { Subscription } from "../models/subscriptions.models.js";


const getSubscribedChannels = asyncHandler(async(req,res) => {

    const {subscriberId} = req.params;
    
    if(!isValidObjectId(subscriberId)){
        throw new ApiError(400, `Invalid Subscription`);
    }

    if(subscriberId.toString()!== req.user?._id.toString()){
        throw new ApiError(401, `Unauthorized Request to Perform this action`);
    }

    const subscribedChannels = await Subscription.aggregate([
        {
            $match : {
                subscriber : new mongoose.Types.ObjectId(subscriberId)
            }
        },
        {
            $lookup : {
                from : 'users',
                localField : 'channel',
                foreignField : '_id',
                as : 'subscribed',
                pipeline : [
                    {
                        $lookup : {
                            from : 'subscriptions',
                            foreignField : 'channel',
                            localField : `_id`,
                            as : 'subscribers'
                        }
                    },
                    {
                        $lookup : {
                            from : 'videos',
                            foreignField : 'videoOwner',
                            localField : '_id',
                            as : 'latestVideo',
                            pipeline : [
                                {
                                    $sort: {
                                        createdAt: -1
                                    }
                                },
                                {
                                    $limit: 1
                                },
                                {
                                    $project : {
                                        _id : 1,
                                        videoTitle : 1,
                                        videoViews : 1,
                                        videoDuration : 1,
                                        videoThumbnail : 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields : {
                            subscribers : {
                                $size : '$subscribers'
                            },
                        }
                    },
                    {
                        $project : {
                            _id : 1,
                            userName : 1,
                            userFullName : 1,
                            userAvatar : 1,
                            subscribers : 1,
                            latestVideo : 1
                        }
                    }
                ]
            }
        },
        {
            $addFields : {
                subscribed : {
                    $first : '$subscribed'
                }
            }
        },
        {
            $project : {
                _id : 0,
                subscriber : 0,
                updatedAt : 0,
            }
        }
    ])

    if(!subscribedChannels){
        throw new ApiError(500, `System Failed to Load Subscribed Channels`);
    }

    return res.status(200)
              .json(
                new ApiResponse(200, subscribedChannels, `Subscribed Channel Fetched Successfully`)
              );
})

const getUserChannelSubscribers = asyncHandler(async(req,res) => {

    const { channelId } = req.params;

    if(!isValidObjectId(channelId)){
        throw new ApiError(400, `Invalid Channel`);
    }

    if(channelId.toString()!== req.user?._id.toString()){
        throw new ApiError(401, `Unauthorized Request to Perform this action`);
    }

    const subscribers = await Subscription.aggregate([
        {
            $match : {
                channel : new mongoose.Types.ObjectId(channelId)
            }
        },
        {
            $lookup : {
                from : 'users',
                foreignField : '_id',
                localField : 'subscriber',
                as : 'subscribed',
                pipeline : [
                    {
                        $lookup : {
                            from : 'subscriptions',
                            foreignField : 'channel',
                            localField : '_id',
                            as : 'subscribers'
                        }
                    },
                    {
                        $addFields : {
                            subscribers : {
                                $size : '$subscribers',
                            },
                            hasSubscribed : {
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
                            _id : 1,
                            userName : 1,
                            userFullName : 1,
                            userAvatar : 1,
                            subscribers : 1,
                            hasSubscribed : 1
                        }
                    }
                ]
            }
        },
        {
            $addFields : {
                subscribed : {
                    $first : '$subscribed'
                }
            }
        },
        {
            $sort : {
                createdAt : -1
            }
        },
        {
            $project : {
                channel : 0,
                createdAt : 0,
            }
        }
    ])

    if(!subscribers){
        throw new ApiError(500, `System Failed to load subscribers`);
    }

    return res.status(200)
              .json(
                new ApiResponse(200, subscribers, `Subscribers Fetched Successfully !!`)
              );
})

const toggleSubscription = asyncHandler(async(req,res) => {

    const {channelId} = req.params;

    if(!isValidObjectId(channelId)){
        throw new ApiError(400, `Invalid Channel`);
    }

    const subscription = await Subscription.findOne({
        subscriber : req.user._id,
        channel : channelId
    });
    
    let isSubscribed = false;

    if(subscription) await Subscription.findByIdAndDelete(subscription?._id);
    else {
        await Subscription.create({
            subscriber : req.user._id,
            channel : channelId
        })
        isSubscribed = true;
    }

    return res.status(200)
              .json(
                new ApiResponse(200,{ isSubscribed },`Video-Subscription Toggled Successfully !!`)
              );
})

export {
    getSubscribedChannels,
    getUserChannelSubscribers,
    toggleSubscription
}