// require('dotenv').config({path : './env})
import dotenv from 'dotenv'
import connectDB from "./database/index.js"

dotenv.config({
    path : './env'
})

connectDB();


// Bad-Approach : 
/*
    function connectDB(){}
    connectDB();
*/

// Approach : 2 : write this is database-folder

// Approach : 1

/*

import express from 'express'
const app = express();

;( async () => {
    try {
       await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`);

       app.on('error', (error) => {
        console.log('APP not connected to Database');
        throw error;
       })

       app.listen(process.env.PORT, () => {
        console.log(`APP is listening on PORT : ${process.env.PORT}`)
       })
    } catch (error) {
        console.error('ERROR : ',error);
        console.log('ERROR : ',error);
        throw error;
    }
} )()

*/