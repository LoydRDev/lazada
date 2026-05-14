import mysql from 'mysql2/promise';

const required = ['DB_HOST', 'DB_USER', 'DB_NAME'];

export const isDbConfigured = required.every((key) => Boolean(process.env[key]));

export const pool = isDbConfigured
  ? mysql.createPool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      namedPlaceholders: true,
    })
  : null;

export const query = async (sql, params = {}) => {
  if (!pool) {
    throw new Error('Database is not configured');
  }
  const [rows] = await pool.execute(sql, params);
  return rows;
};
