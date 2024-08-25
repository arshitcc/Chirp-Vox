import mongoose, {Schema} from "mongoose";

const commentSchema = new Schema(
    {
        comment_owner : {
            type : Schema.Types.ObjectId,
            ref : 'User'
        },
        comment_content : {
            type : String,
            required : true,
            trim: true,
        },
        video : {
            type : Schema.Types.ObjectId,
            ref : 'Video'
        }
    },
    {
        timestamps : true
    }
)

export const Comment = mongoose.model('Comment',commentSchema);