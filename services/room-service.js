import connection from "../db.js";
import gameService from "./game-service.js";
import jwt from "jsonwebtoken";
import config from "../config/index.js";
import ApiError from "../exceptions/api-error.js";

class RoomService {
  async createRoom(name = "", password = "", timeLimit = 180) {
    if (name !== "") {
      const [candidate] = await connection.query(
        "SELECT * FROM room WHERE LOWER(room_name) = LOWER(?)",
        [name]
      );
      if (candidate.length > 0)
        throw ApiError.BadRequest("Room name already exists!");
    }

    const [gameResult] = await connection.query(
      "INSERT INTO game (time_limit) VALUES (?)",
      [timeLimit]
    );
    const gameId = gameResult.insertId;

    const [roomResult] = await connection.query(
      "INSERT INTO room (game_id, room_name, password) VALUES (?, ?, ?)",
      [gameId, name, password]
    );
    const roomId = roomResult.insertId;

    return { gameId, roomId };
  }

  async deleteRoom(roomId) {
    const [roomResult] = await connection.query(
      "SELECT game_id FROM room WHERE room_id = ?",
      [roomId]
    );

    if (roomResult.length === 0) throw ApiError.BadRequest("Room not found");

    const gameId = roomResult[0].game_id;

    await connection.query("DELETE FROM game WHERE game_id = ?", [gameId]);
    await connection.query("DELETE FROM room WHERE room_id = ?", [roomId]);
  }

  async findRoom(name, password) {
    const [candidate] = await connection.query(
      "SELECT room_id, game_id FROM room WHERE room_name = ? AND password = ?",
      [name, password]
    );

    if (candidate.length === 0)
      throw ApiError.BadRequest("The room doesn't exist!");

    const gameId = candidate[0].game_id;
    const roomId = candidate[0].room_id;

    return { gameId, roomId };
  }

  async createPlayers(userId1, userId2, gameId) {
    if (!gameId) gameId = (await this.createRoom()).gameId;

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

  async setReady(playerId, ready) {
    const gameId = await gameService.getGameIdForPlayer(playerId);

    const gameData = await gameService.getGameData(gameId);
    if (gameData.start_time !== null)
      throw ApiError.BadRequest(
        "Cannot set ready because game was already started"
      );

    const val = ready ? -1 : null;

    await connection.query(
      `UPDATE room r
        JOIN game g ON r.game_id = g.game_id
        JOIN (
            SELECT p.color, p.game_id
            FROM player p
            WHERE p.player_id = ?
        ) p ON p.game_id = g.game_id
        SET 
            r.white_timer = CASE WHEN p.color = 1 THEN ? ELSE r.white_timer END,
            r.black_timer = CASE WHEN p.color = 0 THEN ? ELSE r.black_timer END;`,
      [playerId, val, val]
    );

    if (playerId === gameData.player1_id) gameData.white_timer = val;
    else if (playerId === gameData.player2_id) gameData.black_timer = val;

    if (gameData.white_timer === -1 && gameData.black_timer === -1) {
      await connection.query(
        `UPDATE game SET start_time = NOW() WHERE game_id = ?`,
        [gameId]
      );

      await connection.query(
        `UPDATE room r
        JOIN game g ON r.game_id = g.game_id
        SET 
            r.white_timer = 0,
            r.black_timer = 0,
            r.last_move_tst = NOW()
        WHERE g.game_id = ?`,
        [gameId]
      );

      gameData.white_timer = gameData.black_timer = 0;
    }

    return gameData;
  }
}

const roomService = new RoomService();
export default roomService;
