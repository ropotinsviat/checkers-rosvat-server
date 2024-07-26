import config from "../config/index.js";
import jwt from "jsonwebtoken";
import queryString from "query-string";
import recordService from "../services/record-service.js";
import ApiError from "../exceptions/api-error.js";

class RecordController {
  async getRatings(_, res) {
    const rating = await recordService.getRating();
    res.json({ rating });
  }

  async getMatchHistory(req, res, next) {
    try {
      const authHeader = req.headers["authorization"];
      const token = authHeader && authHeader.split(" ")[1];
      if (token == null) ApiError.BadRequest("Token hasn't provided!");

      const { user } = jwt.verify(token, config.tokenSecret);
      const games = await recordService.getUserGames(user.userId);
      res.json({ games });
    } catch (e) {
      next(e);
    }
  }

  async getCompleteGameData(req, res, next) {
    try {
      const gameId = req.query.gameId;
      const completeGameData = await recordService.getCompleteGameData(gameId);
      res.json({ completeGameData });
    } catch (e) {
      next(e);
    }
  }
}

const recordController = new RecordController();
export default recordController;
