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

  async getMatchHistory(req, res) {
    try {
      const authHeader = req.headers["authorization"];
      const token = authHeader && authHeader.split(" ")[1];
      if (token == null) ApiError.BadRequest("Token hasn't provided!");

      const { user } = jwt.verify(token, config.tokenSecret);
      const games = await recordService.getUserGames(user.userId);
      res.json({ games });
    } catch (err) {
      res.json({ loggedIn: false });
    }
  }
}

const recordController = new RecordController();
export default recordController;
