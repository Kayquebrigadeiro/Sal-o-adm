require('dotenv').config();
const mysql = require('mysql2/promise');
async function main() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST, port: parseInt(process.env.DB_PORT),
    user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME, ssl: { rejectUnauthorized: true }
  });
  
  const salao_id = process.env.SALAO_ID_TESTE || '00000000-0000-0000-0000-000000000000';
  const mesInicio = '2026-07-01';
  const mesFim = '2026-08-01';
  
  console.log('=== SALÃO MARIA ===');
  const [atendimentos] = await pool.query(
    "SELECT COUNT(*) as qtd, COALESCE(SUM(lucro_liquido),0) as lucro FROM atendimentos WHERE salao_id = ? AND status = 'EXECUTADO'",
    [salao_id]
  );
  console.log('1. ATENDIMENTOS (EXECUTADO):', atendimentos[0].qtd, '| lucro:', atendimentos[0].lucro);
  
  const [homecare] = await pool.query(
    'SELECT COUNT(*) as qtd, COALESCE(SUM(valor_venda - custo_produto),0) as lucro FROM homecare WHERE salao_id = ?',
    [salao_id]
  );
  console.log('2. HOMECARE:', homecare[0].qtd, '| lucro:', homecare[0].lucro);
  
  const [despesas] = await pool.query(
    'SELECT COUNT(*) as qtd, COALESCE(SUM(valor),0) as total FROM despesas WHERE salao_id = ?',
    [salao_id]
  );
  console.log('3. DESPESAS:', despesas[0].qtd, '| total:', despesas[0].total);
  
  const [profissionais] = await pool.query(
    'SELECT COUNT(*) as qtd, COALESCE(SUM(salario_fixo),0) as total FROM profissionais WHERE salao_id = ? AND cargo = "FUNCIONARIO" AND ativo = 1',
    [salao_id]
  );
  console.log('4. PROFISSIONAIS:', profissionais[0].qtd, '| salario_fixo:', profissionais[0].total);
  
  const [gastos] = await pool.query(
    'SELECT COUNT(*) as qtd, COALESCE(SUM(valor),0) as total FROM gastos_pessoais WHERE salao_id = ?',
    [salao_id]
  );
  console.log('5. GASTOS PESSOAIS:', gastos[0].qtd, '| total:', gastos[0].total);
  
  await pool.end();
}
main().catch(console.error);
