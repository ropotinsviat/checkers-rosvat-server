import connection from "../db.js";
import {
  getArrayBoardFromString,
  getStringBoardFromArray,
  getMovesInfo,
} from "../game-engine/db-room-convertor.js";
import { handleMove } from "../game-engine/handle-move.js";
import ApiError from "../exceptions/api-error.js";

class GameService {
  async getGameIdForPlayer(playerId) {
    const [res] = await connection.query(
      `SELECT g.game_id
         FROM player p
         JOIN game g ON g.game_id = p.game_id
         WHERE p.player_id = ? AND g.end_time IS NULL`,
      [playerId]
    );

    if (res.length) return res[0].game_id;
    throw ApiError.BadRequest(
      `Couldn't find gameId for player with id: ${playerId}`
    );
  }

  async getGameData(gameId) {
    const [resGameData] = await connection.query(
      `SELECT r.*, g.*, 
        p1.player_id AS player1_id,  p2.player_id AS player2_id,
        u1.user_id AS user1_id, u2.user_id AS user2_id, 
        COALESCE(u1.name, 'Guest') AS player1_name,
        COALESCE(u2.name, 'Guest') AS player2_name,
        TIMESTAMPDIFF(SECOND, r.last_move_tst, NOW()) AS takenTime
        FROM game g
        JOIN room r ON r.game_id = g.game_id
        JOIN player p1 ON p1.game_id = g.game_id AND p1.color = 1
        JOIN player p2 ON p2.game_id = g.game_id AND p2.color = 0
        LEFT JOIN user u1 ON p1.user_id = u1.user_id
        LEFT JOIN user u2 ON p2.user_id = u2.user_id
        WHERE g.game_id = ?`,
      [gameId]
    );

    if (resGameData[0].turn === 1)
      resGameData[0].white_timer += resGameData[0].takenTime;
    else resGameData[0].black_timer += resGameData[0].takenTime;

    return resGameData[0];
  }

  async endGame(gameId, winnerColor) {
    await connection.query(
      `UPDATE game SET end_time = NOW(), winner_color = ? WHERE game_id = ?`,
      [winnerColor, gameId]
    );
    await connection.query(`DELETE FROM room WHERE game_id = ?`, [gameId]);
  }

  async move(playerId, move) {
    const gameId = await gameService.getGameIdForPlayer(playerId);
    const gameData = await gameService.getGameData(gameId);

    if (
      ((playerId === gameData.player1_id && gameData.turn === 1) ||
        (playerId === gameData.player2_id && gameData.turn === 0)) &&
      move &&
      move.hasOwnProperty("from") &&
      move.hasOwnProperty("to") &&
      Array.isArray(move.from) &&
      move.from.length === 2 &&
      move.from.every(
        (num) => typeof num === "number" && num >= 0 && num <= 9
      ) &&
      Array.isArray(move.to) &&
      move.to.length === 2 &&
      move.to.every((num) => typeof num === "number" && num >= 0 && num <= 9)
    ) {
      const arrayBoard = getArrayBoardFromString(gameData.board);

      const movesInfo = getMovesInfo(
        arrayBoard,
        gameData.turn === 1,
        gameData.attack_square
      );

      let validMove = false;
      for (let i = 0; i < movesInfo.moves.length; i++)
        if (
          movesInfo.moves[i].position[0] === move.from[0] &&
          movesInfo.moves[i].position[1] === move.from[1]
        )
          for (let j = 0; j < movesInfo.moves[i].moves.length; j++)
            if (
              movesInfo.moves[i].moves[j][0] === move.to[0] &&
              movesInfo.moves[i].moves[j][1] === move.to[1]
            )
              validMove = true;

      if (!validMove)
        throw ApiError.BadRequest(
          `Not valid move was perfomed by player with id: ${playerId}`
        );

      const res = handleMove(arrayBoard, gameData.turn === 1, move);
      const lastAttack =
        res.movesInfo.attack && (gameData.turn === 1) === res.turn
          ? `${move.to[0]}${move.to[1]}`
          : null;

      await connection.query(
        `INSERT INTO move (player_id, from_square, to_square) VALUES (?,?,?)`,
        [
          playerId,
          `${move.from[0]}${move.from[1]}`,
          `${move.to[0]}${move.to[1]}`,
        ]
      );

      await connection.query(
        `UPDATE room SET board = ?, turn = ?, last_move_tst = CURRENT_TIMESTAMP,
          white_timer = ?, black_timer = ?, attack_square = ?
          WHERE game_id = ?`,
        [
          getStringBoardFromArray(res.board),
          res.turn,
          gameData.white_timer,
          gameData.black_timer,
          lastAttack,
          gameId,
        ]
      );
    }

    return await gameService.getGameData(gameId);
  }
}

const gameService = new GameService();
export default gameService;
