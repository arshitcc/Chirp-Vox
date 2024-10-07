import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
    getAllVideos, 
    publishVideo,
    getVideo,
    deleteVideo,
    updateVideoDetails,
    togglePublishStatus
 } from "../controllers/video.controller.js";

const router = Router();

router.route('/').get(
    verifyJWT,
    getAllVideos
);

router.route('/publish').post(
    verifyJWT,
    upload.fields([
        {
            name : 'videoFile',
            maxCount : 1
        },
        {
            name : 'videoThumbnail',
            maxCount : 1
        }
    ]),
    publishVideo
)

router.route('/update/:videoId').patch(
    verifyJWT,
    upload.single('videoThumbnail'),
    updateVideoDetails
)

router.route('/v/:videoId').get(
    verifyJWT,
    getVideo
)

router.route('/delete/:videoId').delete(
    verifyJWT,
    deleteVideo
)

router.route('/publish/:videoId').patch(
    verifyJWT,
    togglePublishStatus
)

export default router


