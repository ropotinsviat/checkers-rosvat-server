import config from "../config/index.js";
import jwt from "jsonwebtoken";
import axios from "axios";
import userService from "../services/user-service.js";
import ApiError from "../exceptions/api-error.js";

class UserController {
  async getUserData(req, res, next) {
    try {
      const authHeader = req.headers["authorization"];
      const token = authHeader && authHeader.split(" ")[1];
      if (!token) throw ApiError.BadRequest("Token has not been provided!");

      const { user } = jwt.verify(token, config.tokenSecret);

      const userData = await userService.getUserData(user.userId);
      res.json({ userData });
    } catch (e) {
      next(e);
    }
  }

  async setUserName(req, res, next) {
    try {
      const authHeader = req.headers["authorization"];
      const token = authHeader && authHeader.split(" ")[1];
      if (!token) throw ApiError.BadRequest("Token has not been provided!");

      const { user } = jwt.verify(token, config.tokenSecret);
      const name = req.query.newName;

      if (!name || typeof name !== "string" || name.length < 1)
        throw ApiError.BadRequest("Incorrect name!");
      if (name.length > 50) throw ApiError.BadRequest("Name is too long!");

      await userService.setUserName(user.userId, name);
      res.end();
    } catch (e) {
      next(e);
    }
  }
}

const userController = new UserController();
export default userController;
