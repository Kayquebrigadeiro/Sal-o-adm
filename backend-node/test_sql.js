require('dotenv').config();
const pool = require('./src/config/db');

async function testarQuery() {
  const salao_id = 'eb25edad-aeed-4130-9bc3-2fdbd190b92c';
  const mes = '2026-07';

  let query = `
      SELECT
        p.salao_id,
        DATE_FORMAT(COALESCE(a.data, NOW()), '%Y-%m-01') as mes,
        p.nome as profissional,
        p.cargo,
        SUM(IF(a.status = 'EXECUTADO', 1, 0)) as atendimentos,
        SUM(IF(a.status = 'EXECUTADO', a.valor_cobrado, 0)) as rendimento_bruto,
        SUM(IF(a.status = 'EXECUTADO', a.valor_cobrado, 0)) as faturamento_gerado
      FROM profissionais p
      LEFT JOIN atendimentos a ON p.id = a.profissional_id AND a.salao_id = p.salao_id
    `;
  const params = [salao_id];

  const mesInicio = `${mes}-01`;
  const mesFim = new Date(mes + '-01');
  mesFim.setMonth(mesFim.getMonth() + 1);
  const mesFimStr = mesFim.toISOString().split('T')[0];

  query += ` AND a.data >= ? AND a.data < ?`;
  params.push(mesInicio, mesFimStr);

  query += ` WHERE p.salao_id = ? AND p.ativo = 1 GROUP BY p.salao_id, p.id, p.nome, p.cargo`;
  
  // O bug: falta um param push para o WHERE p.salao_id = ?
  // Vamos imprimir a query e params
  console.log("=== QUERY ===");
  console.log(query);
  console.log("=== PARAMS ===");
  console.log(params);

  try {
    const [rows] = await pool.query(query, params);
    console.log("=== RESULTADO ===");
    console.log(rows);
  } catch (err) {
    console.error("ERRO AO EXECUTAR QUERY:", err.message);
  }
  
  // Agora vamos tentar corrigir a query
  console.log("\n=== TENTANDO QUERY CORRIGIDA ===");
  let q2 = `
      SELECT
        p.salao_id,
        DATE_FORMAT(COALESCE(a.data, NOW()), '%Y-%m-01') as mes,
        p.nome as profissional,
        p.cargo,
        SUM(IF(a.status = 'EXECUTADO', 1, 0)) as atendimentos,
        SUM(IF(a.status = 'EXECUTADO', a.valor_cobrado, 0)) as rendimento_bruto,
        SUM(IF(a.status = 'EXECUTADO', a.valor_cobrado, 0)) as faturamento_gerado
      FROM profissionais p
      LEFT JOIN atendimentos a ON p.id = a.profissional_id AND a.salao_id = p.salao_id
        AND a.data >= ? AND a.data < ?
      WHERE p.salao_id = ? AND p.ativo = 1
      GROUP BY p.salao_id, p.id, p.nome, p.cargo
  `;
  const p2 = [mesInicio, mesFimStr, salao_id];
  console.log(q2);
  console.log(p2);
  
  try {
    const [rows2] = await pool.query(q2, p2);
    console.log("=== RESULTADO CORRIGIDO ===");
    console.log(rows2);
  } catch (err) {
    console.error(err);
  }
  
  process.exit(0);
}

testarQuery();
