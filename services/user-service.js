import connection from "../db.js";

class UserService {
  async createIfAbsent(email, name) {
    let id = await this.getUserIdByEmail(email);
    if (!id) {
      const [result] = await connection.query(
        "INSERT INTO user (email, name) VALUES (?, ?)",
        [email, name]
      );
      id = result.insertId;
      console.log(`New user created with email: ${email} and name: ${name}`);
    }
    return id;
  }

  async getUserIdByEmail(email) {
    const [users] = await connection.query(
      "SELECT user_id FROM user WHERE email = ?",
      [email]
    );

    if (users.length > 0) return users[0].user_id;
    return null;
  }
}

const userService = new UserService();
export default userService;
