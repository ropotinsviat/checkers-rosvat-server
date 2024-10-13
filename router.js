import express from "express";
import authController from "./controllers/auth-controller.js";
import recordController from "./controllers/record-controller.js";
const router = express.Router();

router.get("/auth/url", authController.getGoogleUrl);
router.get("/auth/token", authController.googleAuth);
router.get("/auth/logged_in", authController.loggedIn);
router.get("/games", recordController.getMatchHistory);
router.get("/game/:gameId", recordController.getCompleteGameData);

export default router;
