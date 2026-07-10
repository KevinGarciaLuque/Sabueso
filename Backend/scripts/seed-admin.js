import 'dotenv/config';
import argon2 from 'argon2';
import mysql from 'mysql2/promise';

const db = await mysql.createConnection({
  host: process.env.DB_HOST, port: process.env.DB_PORT,
  user: process.env.DB_USER, password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

const hash = await argon2.hash('Admin123456');
await db.execute(
  `UPDATE usuarios SET password_hash = ? WHERE email = 'admin@sabueso.hn'`,
  [hash]
);
console.log('Admin actualizado correctamente.');
await db.end();
