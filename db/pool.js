const { Pool } = require('pg');
require('dotenv').config();

// Используем DATABASE_URL если есть, иначе собираем из частей
const connectionString = process.env.DATABASE_URL || 
  `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false // нужно для Render
  }
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
