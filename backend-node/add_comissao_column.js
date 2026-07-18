require('dotenv').config();
const pool = require('./src/config/db');

async function addColumn() {
  try {
    // Check if column already exists
    const [rows] = await pool.query(`SHOW COLUMNS FROM profissionais WHERE Field = 'porcentagem_comissao'`);
    
    if (rows.length > 0) {
      console.log('Column porcentagem_comissao already exists');
      process.exit(0);
    }
    
    // Add column
    await pool.query(`ALTER TABLE profissionais ADD COLUMN porcentagem_comissao DECIMAL(5,2) DEFAULT 0 AFTER cargo`);
    console.log('Column porcentagem_comissao added successfully');
    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}
addColumn();
