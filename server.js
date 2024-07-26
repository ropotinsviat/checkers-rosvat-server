import "dotenv/config";
import { app, server } from "./socket.js";
import cors from "cors";
import cookieParser from "cookie-parser";
import config from "./config/index.js";
import router from "./router.js";
import recordController from "./controllers/record-controller.js";
import userController from "./controllers/user-controller.js";
import errorMiddleware from "./middlewares/error-middleware.js";

app.use(cors({ origin: [config.clientUrl], credentials: true }));
app.use(cookieParser());
app.use("/auth", router);
app.use("/rating", recordController.getRatings);
app.use("/games", recordController.getMatchHistory);
app.use("/gameData", recordController.getCompleteGameData);
app.use("/userData", userController.getUserData);
app.use("/setName", userController.setUserName);
app.use(errorMiddleware);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => console.log(`🚀 Server listening on port ${PORT}`));
