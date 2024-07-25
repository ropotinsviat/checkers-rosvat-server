import connection from "../db.js";

class RecordService {
  async getRating() {
    const [rating] = await connection.query(
      `SELECT u.name, u.score,
        SUM(CASE WHEN g.winner_color = p.color THEN 1 ELSE 0 END) AS wins,
        SUM(CASE WHEN g.winner_color IS NOT NULL AND g.winner_color != p.color THEN 1 ELSE 0 END) AS losses,
        SUM(CASE WHEN g.game_id IS NOT NULL AND g.winner_color IS NULL THEN 1 ELSE 0 END) AS draws
      FROM user u
      LEFT JOIN player p ON u.user_id = p.user_id
      LEFT JOIN game g ON p.game_id = g.game_id AND g.end_time IS NOT NULL
      GROUP BY u.user_id
      ORDER BY u.score DESC`
    );

    return rating;
  }

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

  async updateRating(winnerId, loserId) {}
}

const recordService = new RecordService();
export default recordService;
