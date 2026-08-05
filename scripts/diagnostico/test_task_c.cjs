const jwt = require('jsonwebtoken');
require('dotenv').config({ path: '../../backend-node/.env' });
const pool = require('../../backend-node/src/config/db');

async function main() {
  const [saloes] = await pool.query('SELECT id, nome FROM saloes LIMIT 1');
  const salao = saloes[0];
  console.log('Testando com o salão:', salao.nome, salao.id);

  // Garantir que tem 2 profissionais ativos
  const [profs] = await pool.query('SELECT id, nome FROM profissionais WHERE salao_id = ? AND ativo = 1', [salao.id]);
  console.log('Profissionais ativos antes:', profs.map(p => p.nome));
  
  if (profs.length < 2) {
    await pool.query('INSERT INTO profissionais (id, salao_id, nome, cargo, ativo) VALUES (UUID(), ?, "Prof Sem Atendimento", "FUNCIONARIO", 1)', [salao.id]);
    console.log('Criado profissional extra sem atendimentos.');
  }
  
  const token = jwt.sign(
    { id: 'uuid-vendedor', email: 'test@test.com', role: 'PROPRIETARIO', salao_id: salao.id },
    process.env.JWT_SECRET || 'secret_para_desenvolvimento_apenas_123',
    { expiresIn: '1d' }
  );
  
  const fetch = (await import('node-fetch')).default;
  const res = await fetch(`http://localhost:3333/relatorios/rendimento-professional?mes=2026-07`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  const data = await res.json();
  console.log('JSON DA RESPOSTA:');
  console.log(JSON.stringify(data, null, 2));
  
  await pool.end();
}
main().catch(console.error);
