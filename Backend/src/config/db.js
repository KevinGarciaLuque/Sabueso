import mysql from 'mysql2/promise';
import { logger } from '../utils/logger.js';

const pool = mysql.createPool({
  host:               process.env.DB_HOST,
  port:               Number(process.env.DB_PORT) || 3306,
  user:               process.env.DB_USER,
  password:           process.env.DB_PASSWORD,
  database:           process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
  timezone:           'Z',
  decimalNumbers:     true,
  supportBigNumbers:  true,
  bigNumberStrings:   false,
});

export async function testConnection() {
  const conn = await pool.getConnection();
  const [rows] = await conn.query('SELECT VERSION() AS v');
  conn.release();
  logger.info({ mysqlVersion: rows[0].v }, 'MySQL conectado');
}

export default pool;
