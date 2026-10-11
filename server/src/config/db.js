import 'dotenv/config';
import { Sequelize } from 'sequelize';
import mysql from 'mysql2/promise';
 
const { DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD } = process.env;
 
const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
  host: DB_HOST,
  port: Number(DB_PORT) || 3306,
  dialect: 'mysql',
  logging: false,
});
 
// Creates the database if it does not exist yet, so no manual SQL is needed.
export async function ensureDatabase() {
  const conn = await mysql.createConnection({
    host: DB_HOST,
    port: Number(DB_PORT) || 3306,
    user: DB_USER,
    password: DB_PASSWORD,
  });
  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\``);
  await conn.end();
}
 
export default sequelize;
