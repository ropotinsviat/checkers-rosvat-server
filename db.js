import mysql from "mysql2";

const connection = mysql
  .createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWROD,
  })
  .promise();

export default connection;
