import { Router } from "express";
import {
    getComments,
    addComment,
    editComment,
    deleteComment
} from '../controllers/comment.controller.js'
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();
router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

router.route('/:videoId')
      .get(getComments)
      .post(addComment);
router.route('/c/:commentId')
      .patch(editComment)
      .delete(deleteComment);

export default router
