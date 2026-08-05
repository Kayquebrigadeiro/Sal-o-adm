require('dotenv').config();
const mysql = require('mysql2/promise');

const connection_config = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '4000'),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: {
    minVersion: 'TLSv1.2',
    rejectUnauthorized: true
  }
};

async function check() {
  let conn;
  try {
    conn = await mysql.createConnection(connection_config);
    
    console.log('=== Colunas de custos_fixos_itens ===');
    const [cols] = await conn.execute(
      `DESCRIBE custos_fixos_itens`
    );
    cols.forEach(c => console.log(`  ${c.Field} - ${c.Type}`));
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    if (conn) await conn.end();
  }
}

check();
