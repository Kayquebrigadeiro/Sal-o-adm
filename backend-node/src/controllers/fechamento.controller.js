/**
 * Controller de Fechamento Mensal
 * Calcula métricas financeiras agregadas do mês
 */

const pool = require('../config/db');
const { calcularSaudeFinanceira } = require('../services/financialEngine.service');

/**
 * GET /fechamento/:mes
 * Calcula métricas de fechamento para um mês específico
 * @param mes no formato YYYY-MM
 */
async function calcularDadosFechamento(salao_id, mes) {
  const mesInicio = `${mes}-01`;
  const mesFim = new Date(mes + '-01');
  mesFim.setMonth(mesFim.getMonth() + 1);
  const mesFimStr = mesFim.toISOString().split('T')[0];
  
  const [faturamentoBruto] = await pool.query(
    `SELECT COALESCE(SUM(valor_cobrado), 0) as total FROM atendimentos WHERE salao_id = ? AND status = 'EXECUTADO' AND DATE(data) >= ? AND DATE(data) < ?`,
    [salao_id, mesInicio, mesFimStr]
  );
  
  const [receitaRecebida] = await pool.query(
    `SELECT COALESCE(SUM(valor_pago), 0) as total FROM atendimentos WHERE salao_id = ? AND status = 'EXECUTADO' AND DATE(data) >= ? AND DATE(data) < ?`,
    [salao_id, mesInicio, mesFimStr]
  );
  
  const [totalPendente] = await pool.query(
    `SELECT COALESCE(SUM(valor_pendente), 0) as total FROM atendimentos WHERE salao_id = ? AND status = 'EXECUTADO' AND DATE(data) >= ? AND DATE(data) < ?`,
    [salao_id, mesInicio, mesFimStr]
  );
  
  const [receitaHomecare] = await pool.query(
    `SELECT COALESCE(SUM(valor_venda), 0) as total FROM homecare WHERE salao_id = ? AND DATE(data) >= ? AND DATE(data) < ?`,
    [salao_id, mesInicio, mesFimStr]
  );
  
  const [receitaParalelos] = await pool.query(
    `SELECT COALESCE(SUM(valor), 0) as total FROM procedimentos_paralelos WHERE salao_id = ? AND DATE(data) >= ? AND DATE(data) < ?`,
    [salao_id, mesInicio, mesFimStr]
  );
  
  const receitaTotalCaixa = faturamentoBruto[0].total + receitaHomecare[0].total + receitaParalelos[0].total;
  
  const [lucroAtendimentos] = await pool.query(
    `SELECT COALESCE(SUM(lucro_liquido), 0) as total FROM atendimentos WHERE salao_id = ? AND status = 'EXECUTADO' AND DATE(data) >= ? AND DATE(data) < ?`,
    [salao_id, mesInicio, mesFimStr]
  );
  
  const [lucroPossivel] = await pool.query(
    `SELECT COALESCE(SUM(lucro_possivel), 0) as total FROM atendimentos WHERE salao_id = ? AND status = 'EXECUTADO' AND DATE(data) >= ? AND DATE(data) < ?`,
    [salao_id, mesInicio, mesFimStr]
  );

  const [totalAtendimentos] = await pool.query(
    `SELECT COUNT(id) as total FROM atendimentos WHERE salao_id = ? AND status = 'EXECUTADO' AND DATE(data) >= ? AND DATE(data) < ?`,
    [salao_id, mesInicio, mesFimStr]
  );

  const [lucroHomecare] = await pool.query(
    `SELECT COALESCE(SUM(valor_venda - custo_produto), 0) as total FROM homecare WHERE salao_id = ? AND DATE(data) >= ? AND DATE(data) < ?`,
    [salao_id, mesInicio, mesFimStr]
  );
  
  const [totalDespesas] = await pool.query(
    `SELECT COALESCE(SUM(valor), 0) as total FROM despesas WHERE salao_id = ? AND DATE(data) >= ? AND DATE(data) < ?`,
    [salao_id, mesInicio, mesFimStr]
  );
  
  const [totalSalarios] = await pool.query(
    `SELECT COALESCE(SUM(salario_fixo), 0) as total FROM profissionais WHERE salao_id = ? AND cargo = 'FUNCIONARIO' AND ativo = 1`,
    [salao_id]
  );

  const [totalGastosPessoais] = await pool.query(
    `SELECT COALESCE(SUM(valor), 0) as total FROM gastos_pessoais WHERE salao_id = ? AND DATE(criado_em) >= ? AND DATE(criado_em) < ?`,
    [salao_id, mesInicio, mesFimStr]
  );
  
  const saudeFinanceira = calcularSaudeFinanceira({
    lucroAtendimentosReal: lucroAtendimentos[0].total,
    lucroHomecare: lucroHomecare[0].total,
    totalDespesas: totalDespesas[0].total,
    totalSalarios: totalSalarios[0].total
  });
  
  return {
    faturamentoBruto: faturamentoBruto[0].total,
    receitaRecebida: receitaRecebida[0].total,
    totalPendente: totalPendente[0].total,
    receitaHomecare: receitaHomecare[0].total,
    receitaParalelos: receitaParalelos[0].total,
    receitaTotalCaixa,
    lucroAtendimentosReal: lucroAtendimentos[0].total,
    lucroPossivel: lucroPossivel[0].total,
    totalAtendimentos: totalAtendimentos[0].total,
    lucroHomecare: lucroHomecare[0].total,
    totalDespesas: totalDespesas[0].total,
    totalSalariosFixos: totalSalarios[0].total,
    totalGastosPessoais: totalGastosPessoais[0].total,
    saudeFinanceira,
    margemLucro: receitaTotalCaixa > 0 ? ((lucroAtendimentos[0].total / receitaTotalCaixa) * 100).toFixed(2) : 0
  };
}

/**
 * GET /fechamento/:mes
 */
async function obterFechamentoMensal(req, res) {
  try {
    const { mes } = req.params;
    const salao_id = req.user.salao_id;
    
    if (!/^\d{4}-\d{2}$/.test(mes)) {
      return res.status(400).json({ error: 'Formato de mês inválido (use YYYY-MM)' });
    }
    
    const dados = await calcularDadosFechamento(salao_id, mes);

    const dataMes = `${mes}-01`;
    const [existente] = await pool.query(
      `SELECT id FROM fechamentos WHERE salao_id = ? AND mes = ?`,
      [salao_id, dataMes]
    );

    res.json({ mes, isFechado: existente.length > 0, ...dados });
    
  } catch (error) {
    console.error('Erro ao obter fechamento:', error);
    res.status(500).json({ error: 'Erro ao calcular fechamento mensal' });
  }
}

/**
 * POST /fechamento/:mes
 * Salva um snapshot permanente do fechamento mensal.
 */
async function salvarFechamentoMensal(req, res) {
  try {
    const { mes } = req.params;
    const salao_id = req.user.salao_id;

    if (!/^\d{4}-\d{2}$/.test(mes)) {
      return res.status(400).json({ error: 'Formato de mês inválido (use YYYY-MM)' });
    }

    const dataMes = `${mes}-01`;

    // 1. Verifica se já existe fechamento
    const [existente] = await pool.query(
      `SELECT id FROM fechamentos WHERE salao_id = ? AND mes = ?`,
      [salao_id, dataMes]
    );

    if (existente.length > 0) {
      return res.status(400).json({ error: 'Mês já fechado. Operação não permitida.' });
    }

    // 2. Calcula os dados
    const dados = await calcularDadosFechamento(salao_id, mes);

    // 3. O resultado final da saúde financeira precisa considerar retiradas (gastos pessoais)
    const resultado_final = 
      dados.lucroAtendimentosReal + 
      dados.lucroHomecare - 
      dados.totalDespesas - 
      dados.totalGastosPessoais - 
      dados.totalSalariosFixos;

    // 4. Insere no banco
    const [result] = await pool.query(
      `INSERT INTO fechamentos (
        salao_id, mes, faturamento_bruto, lucro_liquido, lucro_possivel,
        total_atendimentos, total_pendente, total_despesas, total_gastos_pessoais,
        lucro_homecare, resultado_final
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        salao_id,
        dataMes,
        dados.faturamentoBruto,
        dados.lucroAtendimentosReal,
        dados.lucroPossivel,
        dados.totalAtendimentos,
        dados.totalPendente,
        dados.totalDespesas,
        dados.totalGastosPessoais,
        dados.lucroHomecare,
        resultado_final
      ]
    );

    res.json({ success: true, fechamentoId: result.insertId });

  } catch (error) {
    console.error('Erro ao salvar fechamento:', error);
    res.status(500).json({ error: 'Erro ao salvar fechamento mensal' });
  }
}

module.exports = {
  obterFechamentoMensal,
  salvarFechamentoMensal
};
