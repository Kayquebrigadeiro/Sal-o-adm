const mysql = require('mysql2/promise');

const connection_config = {
  host: 'gateway01.us-east-1.prod.aws.tidbcloud.com',
  port: 4000,
  user: 'SEU_USUARIO_DB_PROD',
  password: 'SUA_SENHA_DB_PROD',
  database: 'Salaosecreto',
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
