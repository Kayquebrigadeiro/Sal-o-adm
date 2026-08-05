require('dotenv').config();
const pool = require('./src/config/db');

async function check() {
  try {
    const [rows] = await pool.query(`SHOW COLUMNS FROM perfis_acesso`);
    console.log(`=== perfis_acesso ===`);
    rows.forEach(row => {
      console.log(`  ${row.Field}: ${row.Type}${row.Null === 'YES' ? ' (nullable)' : ' (NOT NULL)'}`);
    });
    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}
check();
