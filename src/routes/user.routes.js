import { Router } from "express";
import { refreshAccessToken, userLogin, userLogout, userSignup } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

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
);

router.route('/login').post(userLogin);
router.route('/logout').post(verifyJWT, userLogout);
router.route('/refresh-token').post(refreshAccessToken);

// router.route('/login').post(userLogin);

/* 
    http://localhost::5173/users/login 
    http://localhost::5173/users/signup

*/

export default router