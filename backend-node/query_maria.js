require('dotenv').config();
const mysql = require('mysql2/promise');
async function main() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST, port: parseInt(process.env.DB_PORT),
    user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME, ssl: { rejectUnauthorized: true }
  });
  const [rows] = await pool.query("SELECT * FROM saloes WHERE nome = 'MARIA' OR proprietario_email = 'maria@gmail.com'");
  console.log(rows);
  await pool.end();
}
main().catch(console.error);
