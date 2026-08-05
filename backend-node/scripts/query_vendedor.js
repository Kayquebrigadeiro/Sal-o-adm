require('dotenv').config();
const mysql = require('mysql2/promise');
async function main() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST, port: parseInt(process.env.DB_PORT),
    user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME, ssl: { rejectUnauthorized: true }
  });
  const [rows] = await pool.query("SELECT * FROM usuarios WHERE cargo = 'VENDEDOR' LIMIT 1");
  console.log(JSON.stringify(rows[0], null, 2));
  await pool.end();
}
main().catch(console.error);
