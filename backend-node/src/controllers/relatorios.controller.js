/**
 * Controller de Relatórios (antigas views do PostgreSQL)
 * Traduz consultas do Postgres para MySQL/TiDB executadas em Node.js
 */

const pool = require('../config/db');

/**
 * GET /relatorios/ranking-procedimentos
 * Equivalente a view 'ranking_procedimentos'
 * Query params: mes=YYYY-MM (opcional)
 */
async function obterRankingProcedimentos(req, res) {
  try {
    const salao_id = req.user.salao_id;
    const { mes } = req.query;

    let query = `
      SELECT
        a.salao_id,
        DATE_FORMAT(a.data, '%Y-%m-01') as mes,
        pr.nome as procedimento,
        pr.categoria,
        SUM(IF(a.status = 'EXECUTADO', 1, 0)) as quantidade,
        SUM(IF(a.status = 'EXECUTADO', a.valor_cobrado, 0)) as receita_total,
        SUM(IF(a.status = 'EXECUTADO', a.lucro_liquido, 0)) as lucro_total,
        ROUND(
          SUM(IF(a.status = 'EXECUTADO', a.valor_cobrado, 0)) /
          NULLIF(SUM(IF(a.status = 'EXECUTADO', 1, 0)), 0),
          2
        ) as ticket_medio
      FROM atendimentos a
      JOIN procedimentos pr ON pr.id = a.procedimento_id
      WHERE a.salao_id = ?
    `;
    const params = [salao_id];

    if (mes) {
      if (!/^\d{4}-\d{2}$/.test(mes)) {
        return res.status(400).json({ error: 'Formato de mês inválido (use YYYY-MM)' });
      }
      const mesInicio = `${mes}-01`;
      const mesFim = new Date(mes + '-01');
      mesFim.setMonth(mesFim.getMonth() + 1);
      const mesFimStr = mesFim.toISOString().split('T')[0];

      query += ` AND a.data >= ? AND a.data < ?`;
      params.push(mesInicio, mesFimStr);
    }

    query += ` GROUP BY a.salao_id, DATE_FORMAT(a.data, '%Y-%m-01'), pr.nome, pr.categoria`;

    const [rows] = await pool.query(query, params);
    
    const formatted = rows.map(r => ({
      salao_id: r.salao_id,
      mes: r.mes,
      procedimento: r.procedimento,
      categoria: r.categoria,
      quantidade: Number(r.quantidade || 0),
      receita_total: Number(r.receita_total || 0),
      lucro_total: Number(r.lucro_total || 0),
      ticket_medio: Number(r.ticket_medio || 0)
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Erro no ranking-procedimentos:', error);
    res.status(500).json({ error: 'Erro ao obter ranking de procedimentos' });
  }
}

/**
 * GET /relatorios/rendimento-professional
 * Equivalente a view 'rendimento_por_profissional'
 * Query params: mes=YYYY-MM (opcional)
 */
async function obterRendimentoProfissional(req, res) {
  try {
    const salao_id = req.user.salao_id;
    const { mes } = req.query;

    let query = `
      SELECT
        a.salao_id,
        DATE_FORMAT(a.data, '%Y-%m-01') as mes,
        p.nome as profissional,
        p.cargo,
        SUM(IF(a.status = 'EXECUTADO', 1, 0)) as atendimentos,
        SUM(IF(a.status = 'EXECUTADO', a.valor_cobrado, 0)) as rendimento_bruto,
        SUM(IF(a.status = 'EXECUTADO', a.valor_cobrado, 0)) as faturamento_gerado
      FROM atendimentos a
      JOIN profissionais p ON p.id = a.profissional_id
      WHERE a.salao_id = ?
    `;
    const params = [salao_id];

    if (mes) {
      if (!/^\d{4}-\d{2}$/.test(mes)) {
        return res.status(400).json({ error: 'Formato de mês inválido (use YYYY-MM)' });
      }
      const mesInicio = `${mes}-01`;
      const mesFim = new Date(mes + '-01');
      mesFim.setMonth(mesFim.getMonth() + 1);
      const mesFimStr = mesFim.toISOString().split('T')[0];

      query += ` AND a.data >= ? AND a.data < ?`;
      params.push(mesInicio, mesFimStr);
    }

    query += ` GROUP BY a.salao_id, DATE_FORMAT(a.data, '%Y-%m-01'), p.id, p.nome, p.cargo`;

    const [rows] = await pool.query(query, params);

    const formatted = rows.map(r => ({
      salao_id: r.salao_id,
      mes: r.mes,
      profissional: r.profissional,
      cargo: r.cargo,
      atendimentos: Number(r.atendimentos || 0),
      rendimento_bruto: Number(r.rendimento_bruto || 0),
      faturamento_gerado: Number(r.faturamento_gerado || 0)
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Erro no rendimento-profissional:', error);
    res.status(500).json({ error: 'Erro ao obter rendimento por profissional' });
  }
}

/**
 * GET /relatorios/agenda-do-dia
 * Equivalente a view 'agenda_do_dia'
 * Query params: data=YYYY-MM-DD (opcional)
 */
async function obterAgendaDoDia(req, res) {
  try {
    const salao_id = req.user.salao_id;
    const { data } = req.query;

    let query = `
      SELECT
        a.id, a.salao_id, a.data, a.horario, a.cliente, a.comprimento,
        a.valor_cobrado, a.valor_pago, a.valor_pendente,
        a.valor_profissional, a.lucro_liquido, a.lucro_possivel, a.status, a.obs,
        p.id as profissional_id, p.nome as profissional_nome, p.cargo,
        pr.id as procedimento_id, pr.nome as procedimento_nome, pr.categoria, pr.requer_comprimento
      FROM atendimentos a
      LEFT JOIN profissionais p ON p.id = a.profissional_id
      LEFT JOIN procedimentos pr ON pr.id = a.procedimento_id
      WHERE a.salao_id = ?
    `;
    const params = [salao_id];

    if (data) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) {
        return res.status(400).json({ error: 'Formato de data inválido (use YYYY-MM-DD)' });
      }
      query += ` AND a.data = ?`;
      params.push(data);
    }

    query += ` ORDER BY a.data, a.horario, p.nome`;

    const [rows] = await pool.query(query, params);

    const formatted = rows.map(r => ({
      id: r.id,
      salao_id: r.salao_id,
      data: r.data,
      horario: r.horario,
      cliente: r.cliente,
      comprimento: r.comprimento,
      valor_cobrado: Number(r.valor_cobrado || 0),
      valor_pago: Number(r.valor_pago || 0),
      valor_pendente: Number(r.valor_pendente || 0),
      valor_profissional: Number(r.valor_profissional || 0),
      lucro_liquido: Number(r.lucro_liquido || 0),
      lucro_possivel: Number(r.lucro_possivel || 0),
      status: r.status,
      obs: r.obs,
      profissional_id: r.profissional_id,
      profissional_nome: r.profissional_nome,
      cargo: r.cargo,
      procedimento_id: r.procedimento_id,
      procedimento_nome: r.procedimento_nome,
      categoria: r.categoria,
      requer_comprimento: r.requer_comprimento === 1 || r.requer_comprimento === true
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Erro no agenda-do-dia:', error);
    res.status(500).json({ error: 'Erro ao obter agenda do dia' });
  }
}

/**
 * GET /relatorios/clientes-resumo
 * Equivalente a view 'clientes_com_resumo'
 */
async function obterClientesResumo(req, res) {
  try {
    const salao_id = req.user.salao_id;

    const query = `
      SELECT
        c.id,
        c.salao_id,
        c.nome,
        c.telefone,
        c.criado_em,
        COALESCE(SUM(a.valor_cobrado), 0) AS total_gasto,
        MAX(a.data) AS ultima_visita,
        COUNT(a.id) AS total_atendimentos
      FROM clientes c
      LEFT JOIN atendimentos a
        ON a.cliente = c.nome
        AND a.salao_id = c.salao_id
        AND a.status = 'EXECUTADO'
      WHERE c.salao_id = ?
      GROUP BY c.id, c.salao_id, c.nome, c.telefone, c.criado_em
      ORDER BY c.nome ASC
    `;

    const [rows] = await pool.query(query, [salao_id]);

    const formatted = rows.map(r => ({
      id: r.id,
      salao_id: r.salao_id,
      nome: r.nome,
      telefone: r.telefone,
      criado_em: r.criado_em,
      total_gasto: Number(r.total_gasto || 0),
      ultima_visita: r.ultima_visita,
      total_atendimentos: Number(r.total_atendimentos || 0)
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Erro no clientes-resumo:', error);
    res.status(500).json({ error: 'Erro ao obter resumo de clientes' });
  }
}

/**
 * GET /relatorios/gastos-pessoais-resumo
 * Equivalente a view 'gastos_pessoais_resumo'
 * Query params: mes=YYYY-MM (opcional)
 */
async function obterGastosPessoaisResumo(req, res) {
  try {
    const salao_id = req.user.salao_id;
    const { mes } = req.query;

    let query = `
      SELECT
        g.salao_id,
        DATE_FORMAT(g.criado_em, '%Y-%m-01') as mes,
        COUNT(*) as quantidade_gastos,
        SUM(g.valor) as total_gastos,
        ROUND(AVG(g.valor), 2) as gasto_medio
      FROM gastos_pessoais g
      WHERE g.salao_id = ?
    `;
    const params = [salao_id];

    if (mes) {
      if (!/^\d{4}-\d{2}$/.test(mes)) {
        return res.status(400).json({ error: 'Formato de mês inválido (use YYYY-MM)' });
      }
      const mesInicio = `${mes}-01`;
      const mesFim = new Date(mes + '-01');
      mesFim.setMonth(mesFim.getMonth() + 1);
      const mesFimStr = mesFim.toISOString().split('T')[0];

      query += ` AND g.criado_em >= ? AND g.criado_em < ?`;
      params.push(mesInicio, mesFimStr);
    }

    query += ` GROUP BY g.salao_id, DATE_FORMAT(g.criado_em, '%Y-%m-01') ORDER BY mes DESC`;

    const [rows] = await pool.query(query, params);

    const formatted = rows.map(r => ({
      salao_id: r.salao_id,
      mes: r.mes,
      quantidade_gastos: Number(r.quantidade_gastos || 0),
      total_gastos: Number(r.total_gastos || 0),
      gasto_medio: Number(r.gasto_medio || 0)
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Erro no gastos-pessoais-resumo:', error);
    res.status(500).json({ error: 'Erro ao obter resumo de gastos pessoais' });
  }
}

/**
 * GET /relatorios/custo-composto/:procedimento_id
 * Equivalente a view 'custo_composto_procedimento'
 */
async function obterCustoComposto(req, res) {
  try {
    const { procedimento_id } = req.params;
    const salao_id = req.user.salao_id;

    // 1. Buscar produtos associados ao procedimento
    const queryProdutos = `
      SELECT
        pc.preco_compra,
        pc.qtd_aplicacoes,
        pp.qtd_por_uso
      FROM procedimento_produtos pp
      JOIN produtos_catalogo pc ON pp.produto_id = pc.id
      WHERE pp.salao_id = ? AND pp.procedimento_id = ? AND pc.ativo = 1
    `;
    const [produtos] = await pool.query(queryProdutos, [salao_id, procedimento_id]);

    if (produtos.length > 0) {
      // Calcular pelos insumos
      let custoTotal = 0;
      for (const p of produtos) {
        const precoCompra = parseFloat(p.preco_compra) || 0;
        const qtdAplicacoes = parseFloat(p.qtd_aplicacoes) || 1;
        const qtdPorUso = parseFloat(p.qtd_por_uso) || 1;
        const custoPorUso = qtdAplicacoes > 0 ? (precoCompra / qtdAplicacoes) : 0;
        custoTotal += custoPorUso * qtdPorUso;
      }
      
      // Arredondar usando a mesma regra do motor financeiro (2 casas decimais)
      const custoTotalArredondado = Math.round((custoTotal + Number.EPSILON) * 100) / 100;

      return res.json({
        procedimento_id,
        salao_id,
        custo_total_composicao: custoTotalArredondado,
        qtd_produtos: produtos.length
      });
    }

    // 2. Fallback: buscar o custo_variavel direto do procedimento
    const queryProcedimento = `
      SELECT custo_variavel FROM procedimentos WHERE id = ? AND salao_id = ?
    `;
    const [procs] = await pool.query(queryProcedimento, [procedimento_id, salao_id]);

    if (procs.length === 0) {
      return res.status(404).json({ error: 'Procedimento não encontrado' });
    }

    const custoVariavelFallback = Number(procs[0].custo_variavel || 0);

    return res.json({
      procedimento_id,
      salao_id,
      custo_total_composicao: custoVariavelFallback,
      qtd_produtos: 0
    });
  } catch (error) {
    console.error('Erro no custo-composto:', error);
    res.status(500).json({ error: 'Erro ao obter custo composto do procedimento' });
  }
}

/**
 * GET /relatorios/atendimentos-completo
 * Equivalente a view 'v_atendimentos_completo'
 * Query params: data=YYYY-MM-DD (opcional)
 */
async function obterAtendimentosCompleto(req, res) {
  try {
    const salao_id = req.user.salao_id;
    const { data } = req.query;

    let query = `
      SELECT
        a.id,
        a.salao_id,
        a.data,
        a.horario,
        a.profissional_id,
        a.cliente,
        a.status,
        a.obs,
        a.valor_cobrado,
        a.valor_pago,
        a.valor_pendente,
        a.valor_maquininha,
        a.valor_profissional,
        a.custo_fixo,
        a.custo_variavel,
        a.lucro_liquido,
        a.lucro_possivel,
        a.criado_em,
        a.atualizado_em,
        p.nome as prof_nome,
        p.cargo as prof_cargo,
        ap.id as ap_id,
        ap.procedimento_id as ap_procedimento_id,
        proc.nome as ap_procedimento_nome,
        proc.categoria as ap_categoria,
        ap.comprimento as ap_comprimento,
        ap.valor_indicado as ap_valor_indicado,
        ap.valor_cobrado as ap_valor_cobrado,
        ap.valor_pago as ap_valor_pago,
        ap.sequencia as ap_sequencia
      FROM atendimentos a
      LEFT JOIN profissionais p ON p.id = a.profissional_id
      LEFT JOIN atendimento_procedimentos ap ON a.id = ap.atendimento_id
      LEFT JOIN procedimentos proc ON proc.id = ap.procedimento_id
      WHERE a.salao_id = ?
    `;
    const params = [salao_id];

    if (data) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) {
        return res.status(400).json({ error: 'Formato de data inválido (use YYYY-MM-DD)' });
      }
      query += ` AND a.data = ?`;
      params.push(data);
    }

    query += ` ORDER BY a.data DESC, a.horario DESC, ap.sequencia ASC`;

    const [rows] = await pool.query(query, params);

    const map = new Map();
    for (const row of rows) {
      if (!map.has(row.id)) {
        map.set(row.id, {
          id: row.id,
          salao_id: row.salao_id,
          data: row.data,
          horario: row.horario,
          profissional_id: row.profissional_id,
          cliente: row.cliente,
          status: row.status,
          obs: row.obs,
          valor_cobrado: Number(row.valor_cobrado || 0),
          valor_pago: Number(row.valor_pago || 0),
          valor_pendente: Number(row.valor_pendente || 0),
          valor_maquininha: Number(row.valor_maquininha || 0),
          valor_profissional: Number(row.valor_profissional || 0),
          custo_fixo: Number(row.custo_fixo || 0),
          custo_variavel: Number(row.custo_variavel || 0),
          lucro_liquido: Number(row.lucro_liquido || 0),
          lucro_possivel: Number(row.lucro_possivel || 0),
          criado_em: row.criado_em,
          atualizado_em: row.atualizado_em,
          profissionais: {
            nome: row.prof_nome || null,
            cargo: row.prof_cargo || null
          },
          procedimentos: []
        });
      }

      if (row.ap_id) {
        map.get(row.id).procedimentos.push({
          id: row.ap_id,
          procedimento_id: row.ap_procedimento_id,
          procedimento_nome: row.ap_procedimento_nome,
          categoria: row.ap_categoria,
          comprimento: row.ap_comprimento,
          valor_indicado: Number(row.ap_valor_indicado || 0),
          valor_cobrado: Number(row.ap_valor_cobrado || 0),
          valor_pago: Number(row.ap_valor_pago || 0),
          sequencia: row.ap_sequencia
        });
      }
    }

    res.json(Array.from(map.values()));
  } catch (error) {
    console.error('Erro no atendimentos-completo:', error);
    res.status(500).json({ error: 'Erro ao obter atendimentos completos' });
  }
}

/**
 * GET /relatorios/homecare-anual
 * Agrupa vendas e lucro de home care por mês em um determinado ano.
 * Query params: ano=YYYY
 */
async function obterHomecareAnual(req, res) {
  try {
    const salao_id = req.user.salao_id;
    const { ano } = req.query;

    if (!ano || !/^\d{4}$/.test(ano)) {
      return res.status(400).json({ error: 'Ano inválido. Forneça ?ano=YYYY' });
    }

    const dataInicio = `${ano}-01-01`;
    const dataFim = `${ano}-12-31`;

    const query = `
      SELECT
        DATE_FORMAT(data, '%Y-%m') as mes,
        SUM(valor_venda) as total_vendas,
        SUM(valor_venda - custo_produto) as total_lucro
      FROM homecare
      WHERE salao_id = ? AND data >= ? AND data <= ?
      GROUP BY DATE_FORMAT(data, '%Y-%m')
      ORDER BY mes ASC
    `;

    const [rows] = await pool.query(query, [salao_id, dataInicio, dataFim]);

    const formatted = rows.map(r => ({
      mes: r.mes,
      total_vendas: Number(r.total_vendas || 0),
      total_lucro: Number(r.total_lucro || 0)
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Erro no homecare-anual:', error);
    res.status(500).json({ error: 'Erro ao obter homecare anual' });
  }
}

/**
 * GET /relatorios/custo-composto-salao
 * Retorna o custo composto de TODOS os procedimentos do salão de uma vez.
 * Mesma lógica de obterCustoComposto, mas em lote para evitar N requisições.
 */
async function obterCustoCompostoSalao(req, res) {
  try {
    const salao_id = req.user.salao_id;

    // 1. Buscar todos os procedimentos do salão
    const [procs] = await pool.query(
      'SELECT id, custo_variavel FROM procedimentos WHERE salao_id = ?',
      [salao_id]
    );

    // 2. Buscar todos os produtos associados (todos os procedimentos de uma vez)
    const [todosProdutos] = await pool.query(
      `SELECT pp.procedimento_id, pc.preco_compra, pc.qtd_aplicacoes, pp.qtd_por_uso
       FROM procedimento_produtos pp
       JOIN produtos_catalogo pc ON pp.produto_id = pc.id
       WHERE pp.salao_id = ? AND pc.ativo = 1`,
      [salao_id]
    );

    // Indexar produtos por procedimento_id
    const produtosPorProc = {};
    for (const p of todosProdutos) {
      if (!produtosPorProc[p.procedimento_id]) produtosPorProc[p.procedimento_id] = [];
      produtosPorProc[p.procedimento_id].push(p);
    }

    // 3. Calcular custo para cada procedimento (mesma fórmula de obterCustoComposto)
    const resultado = procs.map(proc => {
      const produtos = produtosPorProc[proc.id] || [];
      let custo_total_composicao;

      if (produtos.length > 0) {
        let custoTotal = 0;
        for (const p of produtos) {
          const precoCompra = parseFloat(p.preco_compra) || 0;
          const qtdAplicacoes = parseFloat(p.qtd_aplicacoes) || 1;
          const qtdPorUso = parseFloat(p.qtd_por_uso) || 1;
          const custoPorUso = qtdAplicacoes > 0 ? (precoCompra / qtdAplicacoes) : 0;
          custoTotal += custoPorUso * qtdPorUso;
        }
        custo_total_composicao = Math.round((custoTotal + Number.EPSILON) * 100) / 100;
      } else {
        custo_total_composicao = Number(proc.custo_variavel || 0);
      }

      return {
        procedimento_id: proc.id,
        salao_id,
        custo_total_composicao,
        qtd_produtos: produtos.length
      };
    });

    res.json(resultado);
  } catch (error) {
    console.error('Erro no custo-composto-salao:', error);
    res.status(500).json({ error: 'Erro ao obter custos compostos do salão' });
  }
}

module.exports = {
  obterRankingProcedimentos,
  obterRendimentoProfissional,
  obterAgendaDoDia,
  obterClientesResumo,
  obterGastosPessoaisResumo,
  obterCustoComposto,
  obterCustoCompostoSalao,
  obterAtendimentosCompleto,
  obterHomecareAnual
};
