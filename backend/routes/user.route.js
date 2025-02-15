import express from "express";
import {
    allUsers,
    deleteUser,
    forgotPassword,
    getUserDetails,
    getUserProfile,
    loginUser,
    logout,
    registerUser,
    resetPassword,
    updatePassword,
    updateProfile,
    updateUser,
    uploadAvatar,
} from "../controllers/user.controller.js";

const authRouter = express.Router();

import { authorizeRoles, isAuthenticatedUser } from "../middlewares/auth.js";

authRouter.route("/register").post(registerUser);
authRouter.route("/login").post(loginUser);
authRouter.route("/logout").get(logout);

authRouter.route("/password/forgot").post(forgotPassword);
authRouter.route("/password/reset/:token").put(resetPassword);

authRouter.route("/me").get(isAuthenticatedUser, getUserProfile);
authRouter.route("/me/update").put(isAuthenticatedUser, updateProfile);
authRouter.route("/password/update").put(isAuthenticatedUser, updatePassword);
authRouter.route("/me/upload_avatar").put(isAuthenticatedUser, uploadAvatar);

authRouter
    .route("/admin/users")
    .get(isAuthenticatedUser, authorizeRoles("admin"), allUsers);

authRouter
    .route("/admin/users/:id")
    .get(isAuthenticatedUser, authorizeRoles("admin"), getUserDetails)
    .put(isAuthenticatedUser, authorizeRoles("admin"), updateUser)
    .delete(isAuthenticatedUser, authorizeRoles("admin"), deleteUser);



export default authRouter;