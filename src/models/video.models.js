import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videoSchema = new Schema(
    {
        videoTitle : {
            type : String,
            required : true,
        },
        videoThumbnail : { 
            type : String, // Cloudinary URL
            required : true,
        },
        videoFile : {
            type : String, // Cloudinary URL
            required : true,
        },
        videoDescription : {
            type : String,
            required : true,
        },
        videoDuration : {
            type : Number, // extracted from Cloudinary URL
            required : true,
        },
        videoViews : {
            type : Number,
            default : 0
        },
        isPublished : {
            type : Boolean,
            default : true
        },
        videoOwner : {
            type : mongoose.Schema.Types.ObjectId,
            ref : 'User'
        }    

    },
    {
        timestamps : true
    }
)

videoSchema.plugin(mongooseAggregatePaginate)

export const Video = mongoose.model('Video', videoSchema);