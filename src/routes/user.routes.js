import { Router } from "express";
import { userCreate } from "../controllers/user.controller.js";

const router  = Router();

router.route('/signup').post(userCreate);
// router.route('/login').post(userLogin);

/* 
    http://localhost::5173/users/login 
    http://localhost::5173/users/signup

*/

export default router