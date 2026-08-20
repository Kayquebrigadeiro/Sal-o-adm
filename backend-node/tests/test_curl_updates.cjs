require('dotenv').config();
const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');

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

const JWT_SECRET = process.env.JWT_SECRET;

async function testCurlUpdates() {
  let conn;
  try {
    conn = await mysql.createConnection(connection_config);
    
    console.log('=== TESTE COM CURL: PUT /atendimentos/:id ===\n');
    
    // 1. Pegar user e gerar token
    const [users] = await conn.execute(
      `SELECT ua.id, pa.salao_id FROM usuarios_auth ua
       JOIN perfis_acesso pa ON ua.id = pa.auth_user_id
       LIMIT 1`
    );
    
    if (users.length === 0) {
      console.log('❌ Nenhum usuário encontrado');
      return;
    }
    
    const userId = users[0].id;
    const salaoId = users[0].salao_id;
    
    // Gerar JWT token
    const token = jwt.sign(
      { user_id: userId, salao_id: salaoId },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    // 2. Pegar um atendimento
    const [atendimentos] = await conn.execute(
      `SELECT id, profissional_id, data, horario, valor_cobrado, 
              valor_profissional, lucro_liquido, custo_variavel FROM atendimentos 
       WHERE salao_id = ? LIMIT 1`,
      [salaoId]
    );
    
    if (atendimentos.length === 0) {
      console.log('❌ Nenhum atendimento encontrado');
      return;
    }
    
    const aten = atendimentos[0];
    
    // 3. Pegar outro profissional
    const [profs] = await conn.execute(
      `SELECT id FROM profissionais WHERE salao_id = ? AND id != ? LIMIT 1`,
      [salaoId, aten.profissional_id]
    );
    
    console.log('📋 Dados para teste:\n');
    console.log(`Atendimento ID: ${aten.id}`);
    console.log(`JWT Token (use em Authorization: Bearer): ${token}\n`);
    
    console.log('🧪 TESTE 1: Mudança de DATA (sem profissional)\n');
    console.log('curl -X PUT http://localhost:3333/atendimentos/' + aten.id);
    console.log('  -H "Authorization: Bearer ' + token + '"');
    console.log('  -H "Content-Type: application/json"');
    console.log('  -d \'{"data": "2026-07-21", "horario": "14:00:00"}\'');
    console.log('\nEsperado: Status 200, atendimento movido para 21/07 às 14:00\n');
    
    if (profs.length > 0) {
      const novoProf = profs[0];
      console.log('🧪 TESTE 2: Mudança de PROFISSIONAL (com recálculo)\n');
      console.log('curl -X PUT http://localhost:3333/atendimentos/' + aten.id);
      console.log('  -H "Authorization: Bearer ' + token + '"');
      console.log('  -H "Content-Type: application/json"');
      console.log('  -d \'{"profissional_id": "' + novoProf.id + '"}\'');
      console.log('\nEsperado: Status 200, valor_profissional e lucro_liquido recalculados\n');
    }
    
    console.log('💾 Para executar em outro terminal, copie os comandos acima.');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    if (conn) await conn.end();
  }
}

testCurlUpdates();
