require('dotenv').config();
const pool = require('./src/config/db');

async function checkTables() {
  try {
    const tables = ['custos_fixos_itens', 'despesas', 'homecare', 'procedimentos_paralelos', 'configuracoes', 'clientes'];
    for (const table of tables) {
      try {
        const [rows] = await pool.query(`SHOW COLUMNS FROM ${table}`);
        console.log(`\n=== ${table} ===`);
        rows.forEach(row => {
          console.log(`  ${row.Field}: ${row.Type}${row.Null === 'YES' ? ' (nullable)' : ' (NOT NULL)'}`);
        });
      } catch (e) {
        console.log(`\n=== ${table} === ERROR: ${e.message}`);
      }
    }
    process.exit(0);
  } catch (e) {
    console.error('Fatal Error:', e.message);
    process.exit(1);
  }
}

checkTables();
