import connection from "../db.js";

class RecordService {
  async getUserGames(userId) {
    const [games] = await connection.query(
      `SELECT g.*, COUNT(m.move_id) AS moves_count,
            u1.name AS user_name, p1.color AS user_color,
            COALESCE(u2.name, 'Guest') AS opponent_name, p2.color AS opponent_color
        FROM game g
        JOIN player p1 ON g.game_id = p1.game_id
        LEFT JOIN user u1 ON p1.user_id = u1.user_id
        LEFT JOIN player p2 ON g.game_id = p2.game_id AND p1.player_id != p2.player_id
        LEFT JOIN user u2 ON p2.user_id = u2.user_id
        LEFT JOIN move m ON m.player_id = p1.player_id OR m.player_id = p2.player_id
        WHERE g.end_time IS NOT NULL AND u1.user_id = ?
        GROUP BY g.game_id, u1.name, p1.color, u2.name, p2.color
        ORDER BY g.end_time DESC`,
      [userId]
    );

    return games;
  }

  async getCompleteGameData(gameId) {
    const [games] = await connection.query(
      `SELECT g.*, 
        COALESCE(u1.name, 'Guest') AS player1_name,
        COALESCE(u2.name, 'Guest') AS player2_name
        FROM game g
        JOIN player p1 ON p1.game_id = g.game_id AND p1.color = 1
        JOIN player p2 ON p2.game_id = g.game_id AND p2.color = 0
        LEFT JOIN user u1 ON p1.user_id = u1.user_id
        LEFT JOIN user u2 ON p2.user_id = u2.user_id
        WHERE g.game_id = ?`,
      [gameId]
    );

    const [moves] = await connection.query(
      `SELECT m.*, p.color
        FROM game g
        JOIN player p ON p.game_id = g.game_id
        JOIN move m ON m.player_id = p.player_id
        WHERE g.game_id = ?
        ORDER BY m.move_id`,
      [gameId]
    );

    return { gameData: games[0], moves };
  }
}

const recordService = new RecordService();
export default recordService;
