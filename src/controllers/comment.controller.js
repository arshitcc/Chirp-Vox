import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiError } from '../utils/apiError.js'
import { ApiResponse } from '../utils/apiResponse.js'
import mongoose, { isValidObjectId } from "mongoose";
import { Comment } from "../models/comments.models.js";
import { Video } from "../models/video.models.js";
import { Like } from "../models/likes.models.js";

const getComments = asyncHandler( async(req,res) => {

    const {videoId} = req.params;
    const {page = 1, limit = 10} = req.query;

    if(!isValidObjectId(videoId)){
        throw new ApiError(400, `Invalid Video`);
    }
    
    const myComments = Comment.aggregate([
        {
            $match: {
                video: new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "comment_owner",
                foreignField: "_id",
                as: "owner"
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "liked_comment",
                as: "liked"
            }
        },
        {
            $addFields: {
                likes: {
                    $size: "$liked"
                },
                owner: {
                    $first: "$owner"
                },
                isLiked: {
                    $cond: {
                        if: { $in: [req.user?._id, "$liked.liked_by"] },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $sort: {
                updatedAt: -1
            }
        },
        {
            $project: {
                comment_content : 1,
                likes : 1,
                owner: {
                    userName : 1,
                    userFullName : 1,
                    userAvatar : 1
                },
                updatedAt : 1,
                isLiked: 1
            }
        }
    ]);

    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10)
    };

    const comments = await Comment.aggregatePaginate(
        myComments,
        options
    );

    return res.status(200)
              .json(
                new ApiResponse(200, comments, `Comments Loaded Successfully !!`)
              );

})

const addComment = asyncHandler( async(req,res) => {

    const {videoId} = req.params;
    const {commentContent} = req.body;

    if(!commentContent?.trim()){
        throw new ApiError(400, `Please Provide all the fiels`);
    }

    if(!isValidObjectId(videoId)){
        throw new ApiError(401, `Invalid Video`);
    }
    const video = await Video.findById(videoId);
    if(!video){
        throw new ApiError(404, `Video Not Found !!`);
    }

    const comment = await Comment.create({
        comment_owner : req.user?.id,
        comment_content : commentContent,
        video : videoId
    });

    if(!comment){
        throw new ApiError(500, `Failed to add comment try again !!`);
    }

    return res.status(200)
              .json(
                new ApiResponse(200, comment, `Comment added Successfully`)
              );
})

const editComment = asyncHandler( async(req,res) => {

    const {commentId} = req.params;
    if(!commentId?.trim()){
        throw new ApiError(400, `Invalid Comment`);
    }
    const comment = await Comment.findById(commentId);
    if(!comment){
        throw new ApiError(404, `Comment Not Found  !!`);
    }
    if(comment.comment_owner.toString()!== req.user?._id.toString()){
        throw new ApiError(401, `Unauthorized Request to Perform this action`);
    }

    const {editedContent} = req.body;
    if(!editedContent?.trim()){
        throw new ApiError(401, `Please Fill the comment field !!`);
    } 

    const editedComment = await Comment.findByIdAndUpdate(
        comment._id,
        {
            $set : {
                comment_content : editedContent
            }
        },
        {
            new : true
        }
    );

    if(!editedComment){
        throw new ApiError(500, `System Failed !! Try again Later`);
    }

    return res.status(200)
              .json(
                new ApiResponse(200, editedComment, `Comment Edited Successfully !!`)
              );
})

const deleteComment = asyncHandler( async(req,res) => {

    const {commentId} = req.params;

    const comment = await Comment.findById(commentId);
    
    if(!comment){
        throw new ApiError(404, `Comment Not Found !!`);
    }

    if(comment?.comment_owner.toString() !== req.user?._id.toString()){
        throw new ApiError(401, `Unauthorized Request to perfom this action`);
    }

    await Comment.findByIdAndDelete(commentId);
    await Like.deleteMany({
        liked_comment : commentId, 
    });

    return res.status(200)
              .json(
                new ApiResponse(200, {}, `Comment Deleted Successfully !!`)
              );
})

export {
    getComments,
    addComment,
    editComment,
    deleteComment,
}