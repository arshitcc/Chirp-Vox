import mongoose, {Schema} from "mongoose";

const playlistSchema = new Schema(
    {
        playlist_name : {
            type : String,
            required : true,
            trim : true
        },
        playlist_owner : {
            type : Schema.Types.ObjectId,
            ref : 'User'
        },
        playlist_description : {
            type : String,
            required:  true,
        },
        playlist_videos : [
            {
                type : Schema.Types.ObjectId,
                ref : 'Video'
            }
        ]
    },
    {
        timestamps : true
    }
)

export const Playlist = mongoose.model('Playlist',playlistSchema);