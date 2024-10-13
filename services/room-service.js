import connection from "../db.js";
import jwt from "jsonwebtoken";
import config from "../config/index.js";

class RoomService {
  async createRoom(timeLimit = 300) {
    const [gameResult] = await connection.query(
      "INSERT INTO game (time_limit) VALUES (?)",
      [timeLimit]
    );
    const gameId = gameResult.insertId;

    const [roomResult] = await connection.query(
      "INSERT INTO room (game_id) VALUES (?)",
      [gameId]
    );
    const roomId = roomResult.insertId;

    return { gameId, roomId };
  }

  async createPlayers(userId1, userId2) {
    const gameId = (await this.createRoom()).gameId;

    const [player1Result] = await connection.query(
      "INSERT INTO player (user_id, game_id, color) VALUES (?, ?, 1)",
      [userId1, gameId]
    );
    const player1Id = player1Result.insertId;

    const [player2Result] = await connection.query(
      "INSERT INTO player (user_id, game_id, color) VALUES (?, ?, 0)",
      [userId2, gameId]
    );
    const player2Id = player2Result.insertId;

    const token1 = jwt.sign({ playerId: player1Id }, config.tokenSecret, {
      expiresIn: "6h",
    });
    const token2 = jwt.sign({ playerId: player2Id }, config.tokenSecret, {
      expiresIn: "6h",
    });

    return { token1, token2 };
  }
}

const roomService = new RoomService();
export default roomService;
