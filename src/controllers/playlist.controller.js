import { Playlist } from "../models/playlists.models.js";
import { Video } from "../models/video.models.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import mongoose, {isValidObjectId} from "mongoose";


const createPlaylist = asyncHandler(async(req,res) => {
    const {title, description} = req.body;

    if(
        [title,description].some((field) => (!field || (field?.trim()==='')))
    ){
        throw new ApiError(400, `Fill Title and Description fields !!`);
    }

    const playlist = await Playlist.create({
        playlist_name : title,
        playlist_description : description,
        playlist_owner : req.user?._id
    });

    if(!playlist){
        throw new ApiError(500,`System Failed to create Playlist !!`);
    }

    return res.status(200)
              .json(
                new ApiResponse(200, playlist, `Playlist Created Successfully !!`)
              );
})

const deletePlaylist = asyncHandler(async(req,res) => {
    const {playlistId} = req.params;

    if(!isValidObjectId(playlistId)){
        throw new ApiError(400, `Invalid Playlist`);
    }

    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
        throw new ApiError(404, `Playlist not found !!`);
    }

    if(playlist.playlist_owner.toString() !== req.user._id.toString()){
        throw new ApiError(401, `Unauthorized Request to perform this action !!`);
    }

    await Playlist.findByIdAndDelete(playlistId);

    return res.status(200)
              .json(
                new ApiResponse(200, {}, `Playlist Deleted Successfully`)
              );
})

const updatePlaylist = asyncHandler(async(req,res) => {

    const {title, description} = req.body;
    const {playlistId} = req.params;

    if(
        [title, description].some((field) => field?.trim() === '')
    ){
        throw new ApiError(400, `Fill Title and Description Fields`);
    }

    const playlist = await Playlist.findById(playlistId);
    console.log(playlist);
    
    if (!playlist) {
        throw new ApiError(404, `Playlist not found !!`);
    }

    if(playlist.playlist_owner.toString() !== req.user._id.toString()){
        throw new ApiError(401, `Unauthorized Request to perform this action !!`);
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $set : {
                playlist_name : title,
                playlist_description : description
            }
        },
        {
            new : true
        }
    )

    if(!updatedPlaylist){
        throw new ApiError(500, `System Failed to update playlist`);
    }

    return res.status(200)
              .json(
                new ApiResponse(200, updatedPlaylist, `Playlist Updated Successfully !!`)
              );

})

const getPlaylistById = asyncHandler(async(req,res) => {
    const {playlistId} = req.params;

    if(!isValidObjectId(playlistId)){
        throw new ApiError(400, `Invalid Playlist`);
    }

    const playlist = await Playlist.aggregate([
        {
            $match : {
                _id : new mongoose.Types.ObjectId(playlistId)
            }
        },
        {
            $lookup : {
                from : 'videos',
                localField : 'playlist_videos',
                foreignField : '_id',
                as : 'videos',
                pipeline : [
                    {
                        $match : {
                            isPublished : true
                        }
                    }
                ]
            }
        },
        {
            $lookup : {
                from: 'users',
                localField: 'playlist_owner',
                foreignField: '_id',
                as: 'owner',
                pipeline : [
                    {
                        $project : {
                            userName : 1,
                            userFullName : 1,
                            userAvatar : 1
                        }
                    }
                ]
            }
        },
        {
            $addFields : {
                totalVideos : {
                    $size : '$videos'
                },
                totalViews : {
                    $sum : '$videos.videoViews'
                },
                totalDuration : {
                    $sum : '$videos.videoDuration'
                },
                owner : {
                    $first : '$owner'
                }
            }
        }
    ]);

    if(!playlist){
        throw new ApiError(400, `Playlist not found  !!`);
    }

    return res.status(200)
              .json(
                new ApiResponse(200, playlist,`Playlist fetched successfully !!`)
              );
})

const addVideoToPlaylist = asyncHandler(async(req,res) => {
    const {playlistId, videoId} = req.params;

    if(!isValidObjectId(playlistId) || !isValidObjectId(videoId)){
        throw new ApiError(400, `Invalid Video or Playlist`)
    }

    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
        throw new ApiError(404, `Playlist not found !!`);
    }

    if(playlist.playlist_owner.toString() !== req.user._id.toString()){
        throw new ApiError(401, `Unauthorized Request to perform this action !!`);
    }

    const video = await Video.findById(videoId);

    if(!video){
        throw new ApiError(404, `Video not found !!`);
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlist?._id,
        {
            $addToSet: {
                playlist_videos: videoId,
            },
        },
        {
            new: true
        }
    );

    if (!updatedPlaylist) {
        throw new ApiError(500, `System Failed !! Video not added to Playlist`);
    }

    console.log(updatedPlaylist);
    

    return res.status(200)
              .json(
                new ApiResponse(200, updatedPlaylist, `Video added to Playlist successfully !!`)
              );

})

const removeVideoFromPlaylist = asyncHandler(async(req,res) => {
    const {playlistId, videoId} = req.params;

    if(!isValidObjectId(playlistId) || !isValidObjectId(videoId)){
        throw new ApiError(400, `Invalid Video or Playlist`)
    }

    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
        throw new ApiError(404, `Playlist not found !!`);
    }

    if(playlist?.playlist_owner.toString() !== req.user?._id.toString()){
        throw new ApiError(401, `Unauthorized Request to perform this action !!`);
    }

    const video = await Video.findById(videoId);
    
    if(!video){
        throw new ApiError(404, `Video not found !!`);
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $pull: {
                playlist_videos: videoId,
            },
        },
        {
            new : true
        }
    );

    if (!updatedPlaylist) {
        throw new ApiError(500, `System Failed !! Video not removed from Playlist !!`);
    }

    return res.status(200)
              .json(
                new ApiResponse(200, updatePlaylist, `Video removed from Playlist successfully !!`)
              );

})

const getUserPlaylists = asyncHandler(async(req,res) => {
    const {userId} = req.params;

    if(!isValidObjectId(userId)){
        throw new ApiError(400, `Invalid User`);
    }

    const playlists = await Playlist.aggregate([
        {
            $match : {
                playlist_owner : new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup : {
                from : 'videos',
                foreignField : '_id',
                localField : 'playlist_videos',
                as : 'videos',
            }
        },
        {
            $addFields : {
                totalVideos : {
                    $size : '$videos'
                },
                totalViews : {
                    $sum : '$videos.videoViews'
                },
                totalDuration : {
                    $sum : '$videos.videoDuration'
                },
            }
        },
        {
            $project : {
                playlist_videos : 0
            }
        }
    ]);

    if(!playlists){
        throw new ApiError(404, `No Playlist found !!`);
    }

    return res.status(200)
              .json(
                new ApiResponse(200, playlists, `User-Playlists Fetched Successfully !!`)
              );

})



export {
    addVideoToPlaylist,
    createPlaylist,
    deletePlaylist,
    getPlaylistById,
    getUserPlaylists,
    removeVideoFromPlaylist,
    updatePlaylist
}