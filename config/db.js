// config/db.js
// Connexion MySQL centralisée — modifier uniquement le .env le jour J
require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test de connexion au démarrage (utile pour debug rapide le jour J)
async function testConnection() {
  try {
    const conn = await pool.getConnection();
    console.log('✅ MySQL connecté avec succès');
    conn.release();
  } catch (err) {
    console.error('❌ Erreur connexion MySQL:', err.message);
  }
}

module.exports = { pool, testConnection };
