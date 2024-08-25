import mongoose, {Schema} from "mongoose";

const likeSchema = new Schema(
    {
        liked_by : {
            type : Schema.Types.ObjectId,
            ref : 'User',
            required : true
        },
        content_type : {
            type : String,
            enum : ['Video','Comment','Playlist','Tweet'],
            required : true
        },
        content_id : {
            type : Schema.Types.ObjectId,
            required : true
        },
    },
    {
        timestamps : true
    }
);

export const Like = mongoose.model('Like',likeSchema);