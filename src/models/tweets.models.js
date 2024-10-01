import mongoose, { Schema } from "mongoose";

const tweetSchema = new Schema(
    {
        tweet_owner : {
            type : Schema.Types.ObjectId,
            ref : 'User'
        },
        tweet_content : {
            type : String,
            required : true,
            trim : true,
        },
        
    },
    {
        timestamps : true
    }
)

export const Tweet = mongoose.model('Tweet', tweetSchema);