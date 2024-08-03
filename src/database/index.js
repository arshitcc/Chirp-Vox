import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async () => {
    try {
        const connectInstance = await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`);
        // mongoose gives a return object.
        console.log(`\n MongoDB Connected !! DB_HOST : ${connectInstance.connection.host} `);
    } catch (error) {
        console.error('MONGO_DB Connection ERROR : ',error);
        // console.log('ERROR : ',error);
        // throw error;
        process.exit(1); // this exit method is from node.js with referred exit-codes.
    }
}

export default connectDB