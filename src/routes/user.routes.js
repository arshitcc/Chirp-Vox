import { Router } from "express";
import { 
    getChannel, 
    getCurrentUser, 
    getWatchHistory, 
    refreshAccessToken, 
    updateAvatar, 
    updateCoverImage, 
    updateEmail, 
    updateFullName, 
    updateHandle, 
    updatePassword, 
    userLogin, 
    userLogout, 
    userSignup 
} from "../controllers/user.controller.js";
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
router.route('/update-password').post(verifyJWT, updatePassword);
router.route('/update-email').post(verifyJWT,updateEmail);
router.route('/update-name').post(verifyJWT,updateFullName);
router.route('/update-handle').post(verifyJWT,updateHandle);


router.route('/update-avatar').patch(
    verifyJWT,
    upload.single('userAvatar'),
    updateAvatar
);

router.route('/update-cover-image').patch(
    verifyJWT,
    upload.single('userCoverImage'),
    updateCoverImage
);

router.route('/user').get(verifyJWT,getCurrentUser);
router.route('/channel/:userName').get(
    verifyJWT,
    getChannel
);

router.route('/watch-history').get(
    verifyJWT,
    getWatchHistory
)

/* 
    http://localhost::5173/users/login 
    http://localhost::5173/users/signup

*/

export default router