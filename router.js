import express from "express";
import authController from "./controllers/auth-controller.js";
const router = express.Router();

router.get("/url", authController.getGoogleUrl);
router.get("/token", authController.googleAuth);
router.get("/logged_in", authController.loggedIn);

export default router;
