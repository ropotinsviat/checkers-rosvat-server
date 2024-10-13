import config from "../config/index.js";
import jwt from "jsonwebtoken";
import queryString from "query-string";
import getTokenParams from "../utils/google-util.js";
import axios from "axios";
import userService from "../services/user-service.js";
import ApiError from "../exceptions/api-error.js";

const authParams = queryString.stringify({
  client_id: config.clientId,
  redirect_uri: config.redirectUrl,
  response_type: "code",
  scope: "openid profile email",
  access_type: "offline",
  state: "standard_oauth",
  prompt: "consent",
});

class AuthController {
  getGoogleUrl(_, res) {
    res.json({ url: `${config.authUrl}?${authParams}` });
  }

  async googleAuth(req, res, next) {
    try {
      const { code } = req.query;
      if (!code)
        throw ApiError.BadRequest("Authorization code must be provided");

      const tokenParam = getTokenParams(code);
      const {
        data: { id_token },
      } = await axios.post(`${config.tokenUrl}?${tokenParam}`);
      if (!id_token) throw ApiError.BadRequest("Token has not been provided!");

      const { email, name, picture } = jwt.decode(id_token);

      const userId = await userService.createIfAbsent(email, name);
      const user = { name, email, picture, userId };

      const token = jwt.sign({ user }, config.tokenSecret, {
        expiresIn: config.tokenExpiration,
      });
      res.json({ token });
    } catch (e) {
      next(e);
    }
  }

  loggedIn(req, res, next) {
    try {
      const authHeader = req.headers["authorization"];
      const token = authHeader && authHeader.split(" ")[1];
      if (!token) throw ApiError.BadRequest("Token has not been provided!");

      const { user } = jwt.verify(token, config.tokenSecret);
      const newToken = jwt.sign({ user }, config.tokenSecret, {
        expiresIn: config.tokenExpiration,
      });

      res.json({ user, newToken });
    } catch (e) {
      res.end();
    }
  }
}

const authController = new AuthController();
export default authController;
