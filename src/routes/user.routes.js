import { Router } from "express";
import { userSignup } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";

const router  = Router();

router.route('/signup').post(
    upload.fields([
        {
            name : 'userAvatar',
            maxCount : 1,
        },
        {
            name : 'userCoverImage',
            maxCount : 1
        }
    ]),
    
    userSignup
)

// router.route('/login').post(userLogin);

/* 
    http://localhost::5173/users/login 
    http://localhost::5173/users/signup

*/

export default router