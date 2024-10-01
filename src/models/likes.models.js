import mongoose, {Schema} from "mongoose";

const likeSchema = new Schema(
    {
        liked_by : {
            type : Schema.Types.ObjectId,
            ref : 'User',
            required : true
        },
        liked_comment : {
            type : Schema.Types.ObjectId,
            ref : 'Comment',
        },
        liked_video : {
            type : Schema.Types.ObjectId,
            ref : 'Video',
        },
        liked_tweet : {
            type : Schema.Types.ObjectId,
            ref : 'Tweet',
        },
        
    },
    {
        timestamps : true
    }
);

export const Like = mongoose.model('Like',likeSchema);