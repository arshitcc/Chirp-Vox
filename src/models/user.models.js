import mongoose, {Schema} from "mongoose";
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

const userSchema = new Schema(
    {
    
        userName : {
            type : String,
            required : true,
            unique : true,
            lowercase : true,
            trim : true,
            index : true, 
            //[Be careful this looses performances of the app if used more than necessary] make 'index' true if you want to enable searching on that field or (say) use this data in frequent-searching 
        },

        userEmail : {
            type : String,
            required : true,
            unique : true,
            lowercase : true,
            trim : true
        },
        userFullName : {
            type : String,
            required : true,
            trim : true,
            index : true
        },
        userAvatar : {
            type : String, // cloudinary URL, [It stores your data and provides a url for that],
            required : true,
        },
        userCoverImage : {
            type : String, // cloudinary URL, [It stores your data and provides a url for that],
            required : false,
        },
        userWatchHistory : [
            {
                type : mongoose.Schema.Types.ObjectId,
                ref : 'Video'
            }
        ],
        userPassword : {
            type : String,
            required : [true,"!! Password is required !!"],
        },
        refreshToken : {
            type : String,
        },   
    }
,
    { 
        timestamps : true
    }
)

userSchema.pre('save', async function (next) { // Do a pre-thing before you actually do 'save'

    if(!this.isModified('userPassword')) return next();

    this.userPassword = await bcrypt.hash(this.userPassword, 5);
    next();

    /*
        if(this.isModified('userPassword')){
            this.userPassword = bcrypt.hash(this.userPassword, 5);
            next();
        }
    */
})

userSchema.methods.isPasswordCorrect = async function (userPassword){ // cryptographic computation is used so use await
    return await bcrypt.compare(userPassword, this.userPassword); 
    // returns boolear if givenPassword and stored encrypted password
}

userSchema.methods.generateAccessToken = async function (){  // mostly no-need to async
    return await jwt.sign(
        {
            _id : this._id, // from mongoDB,
            email : this.userEmail,
            username : this.userName,
            fullname : this.userFullName,
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn : process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}
userSchema.methods.generateRefreshToken = async function (){
    return await jwt.sign(
        {
            _id : this._id, // from mongoDB,
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn : process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}

export const User = mongoose.model('User',userSchema);