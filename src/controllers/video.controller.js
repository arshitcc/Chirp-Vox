import mongoose, { isValidObjectId } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";
import { User } from "../models/user.models.js";
import { Video } from '../models/video.models.js'
import { Like } from "../models/likes.models.js";
import { Comment } from "../models/comments.models.js";
import { uploadFile, deleteFile } from "../utils/cloudinary.js";
import {ApiResponse} from '../utils/apiResponse.js'
import {ApiError} from '../utils/apiError.js'
import {asyncHandler} from '../utils/asyncHandler.js'

const getAllVideos = asyncHandler( async(req,res) => {

})

const publishVideo = asyncHandler( async(req,res) => {
    const {videoTitle, videoDescription} = req.body;

    if(!videoTitle?.trim() && !videoDescription?.trim()){
        throw new ApiError(400, `Provide the Fields : Title, Description `);
    }

    const videoFile_LocalPath = req.files?.videoFile?.[0]?.path;
    const videoThumbnail_LocalPath = req.files?.videoThumbnail?.[0]?.path;

    if(!videoFile_LocalPath?.trim()){
        throw new ApiError(402, `!! Video is Required !!`);
    }

    if(!videoThumbnail_LocalPath?.trim()){
        throw new ApiError(402, `!! Thumbnail is Required !!`);
    }

    const videoFile = await uploadFile(videoFile_LocalPath);
    const videoThumbnail = await uploadFile(videoThumbnail_LocalPath);

    if(!videoFile){
        throw new ApiError(403, `!! Video failed to Upload !!`);
    }

    if(!videoThumbnail){
        throw new ApiError(403, `!! Thumbnail failed to Upload !!`);
    }

    const video = await Video.create({
        videoTitle,
        videoDescription,
        videoDuration : videoFile.duration,
        videoFile : videoFile.url,
        videoThumbnail : videoThumbnail.url,
        videoOwner : req.user?._id,
        isPublished : false
    })

    const uploadedVideo = await Video.findById(video._id);

    if(!uploadedVideo){
        throw new ApiError(
            500, 
            `Video Upload Failed !! Try Again Later`
        );
    }

    return res.status(200)
              .json(
                new ApiResponse(200,video,`Video Uploaded Successfully`)
              );
})

const getVideo = asyncHandler( async(req,res) => {
    const {videoId} = req.params;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid Video");
    }

    if (!isValidObjectId(req.user?._id)) {
        throw new ApiError(401, "Invalid User");
    }

    const video = await Video.aggregate([
        {
            $match : {
                _id : new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup : {
                from : 'likes',
                localField : '_id',
                foreignField : 'liked_video',
                as : 'liked'
            }
        },
        {
            $lookup : {
                from : 'subscriptions',
                localField : 'videoOwner',
                foreignField : 'channel',
                as : 'subscribed',
            }
        },
        {
            $addFields : {
                subscribers : {
                    $size : '$subscribed'
                },
                likes : {
                    $size : '$liked'
                },
                isLiked : {
                    $cond : {
                        if : {
                            $in : [req.user._id,'$liked']
                        },
                        then : true,
                        else : false
                    }
                },
                isSubscribed : {
                    $cond : {
                        if : {
                            $in : [req.user._id, '$subscribed']
                        },
                        then : true,
                        else : false
                    }
                }
            }
        },
        {
            $project : {
                videoTitle : 1,
                videoDescription : 1,
                videoOwner : 1,
                videoFile : 1,
                videoThumbnail : 1,
                videoDuration : 1,
                videoViews : 1,
                createdAt : 1,
                likes : 1,
                subscribers : 1,
                isLiked : 1,
                isSubscribed : 1
            }
        }
    ])

    if(!video.length){
        throw new ApiError(403, `Video Not Found`);
    }

    await Video.findByIdAndUpdate(videoId,{
        $inc : {
            videoViews : 1
        }
    })

    await User.findByIdAndUpdate(req.user._id,{
        $addToSet: {
            userWatchHistory: videoId
        }
    })

    return res.status(200)
              .json(
                new ApiResponse(200, video[0], `Video Fetched Successfully`)
              );

})

const updateVideoDetails = asyncHandler( async(req,res) => {
    let {videoTitle, videoDescription} = req.body;
    const {videoId} = req.params;

    if(!isValidObjectId(videoId)){
        throw new ApiError(400, `Invalid Video Request`);
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, `Video Not Found`);
    }

    if(video.videoOwner.toString() !== req.user._id.toString()){
        throw new ApiError(
            401,
            `Unauthorized Request to perform this action`
        );
    }

    if(!videoTitle?.trim()) videoTitle = video.videoTitle;
    if(!videoDescription?.trim()) videoDescription = video.videoDescription;

    let videoThumbnail_LocalPath;
    if(!req.file?.path) videoThumbnail_LocalPath = "";
    else videoThumbnail_LocalPath = req.file.path;

    let videoThumbnail;
    if(videoThumbnail_LocalPath.trim()!=='') {
        const videoThumbnailFile = await uploadFile(videoThumbnail_LocalPath);
        videoThumbnail = videoThumbnailFile.url;
        await deleteFile(video.videoThumbnail);
    }
    else videoThumbnail = video.videoThumbnail;    

    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        {
            $set : {
                videoTitle,
                videoDescription,
                videoThumbnail
            }
        },
        {
            new : true
        }
    )

    if (!updatedVideo) {
        throw new ApiError(
            500, 
            `System Failed !! Try Again Later`
        );
    }

    return res.status(200)
              .json(
                new ApiResponse(200, updatedVideo, `Video Updated Successfully`)
              );

})

const deleteVideo = asyncHandler( async(req,res) => {

    const {videoId} = req.params;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, `Invalid Video`);
    }

    const video = await Video.findById(videoId);

    if(!video){
        throw new ApiError(404, `Video Not Found`);
    }

    if(video?.videoOwner.toString() !== req.user?._id.toString()){
        throw new ApiError(
            401,
            `Unauthorized Request to perform this action`
        );
    }

    const isDeleted = await Video.findByIdAndDelete(videoId);
    if(!isDeleted){
        throw new ApiError(
            500, 
            `System Failed !! Try Again Later`
        );
    }

    await deleteFile(video.videoFile);
    await deleteFile(video.videoThumbnail);
    await Like.deleteMany({
        liked_video : videoId
    })
    await Comment.deleteMany({
        video : videoId
    })

    return res.status(200)
              .json(
                new ApiResponse(200, {}, `Video Deleted Successfully`)
              );
})

const togglePublishStatus = asyncHandler( async(req,res) => {
    const {videoId} = req.params;

    if(!isValidObjectId(videoId)){
        throw new ApiError(400, `Invalid Video`);
    }

    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, `Video Not Found`);
    }

    if (video?.videoOwner.toString() !== req.user?._id.toString()) {
        throw new ApiError(
            401,
            `Unauthorized Request to perform this action`
        );
    }

    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        {
            $set : {
                isPublished : !video?.isPublished
            }
        },
        {
            new : true
        }
    )

    if (!updatedVideo) {
        throw new ApiError(
            500, 
            `System Failed !! Try Again Later`
        );
    }

    return res.status(200)
              .json(
                new ApiResponse(200, updatedVideo, `Video Publish Status Toggled Successfully`)
              );

})

export {
    publishVideo,
    getVideo,
    updateVideoDetails,
    deleteVideo,
    togglePublishStatus
}