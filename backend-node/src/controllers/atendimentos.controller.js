/**
 * Controller de Atendimentos (MySQL/TiDB)
 * Gerencia criação, atualização e listagem de atendimentos com cálculo financeiro
 */

const pool = require('../config/db');
const { v4: uuidv4 } = require('uuid');
const { calcularValoresAtendimento } = require('../services/financialEngine.service');
const { mesEstaFechado } = require('../services/fechamentoGuard.service');
const { invalidarFechamentoCache } = require('./fechamento.controller');

/**
 * POST /atendimentos
 * Cria um novo atendimento
 * Body: {
 *   cliente: string (nome do cliente),
 *   profissional_id: UUID,
 *   data: YYYY-MM-DD,
 *   horario: HH:MM:SS,
 *   procedimento_id: UUID (procedimento principal),
 *   comprimento: 'P'|'M'|'G' (opcional, default 'P'),
 *   valor_cobrado: number,
 *   valor_pago: number (opcional, default 0),
 *   procedimentos_adicionais: [ { procedimento_id, comprimento, valor_cobrado }, ... ] (opcional),
 *   status: 'AGENDADO'|'EXECUTADO'|'CANCELADO' (opcional)
 * }
 */
async function criarAtendimento(req, res) {
  const connection = await pool.getConnection();
  
  try {
    const { cliente, profissional_id, data, horario, procedimento_id, comprimento, valor_cobrado, valor_pago, procedimentos_adicionais, status } = req.body;
    const salao_id = req.user.salao_id;
    
    if (!cliente || !profissional_id || !data || !horario || !procedimento_id || !valor_cobrado) {
      return res.status(400).json({ error: 'Dados inválidos: cliente, profissional_id, data, horario, procedimento_id e valor_cobrado são obrigatórios' });
    }
    
    if (await mesEstaFechado(connection, salao_id, data)) {
      connection.release();
      return res.status(403).json({ error: 'Este mês já foi fechado e não pode mais ser alterado.' });
    }
    
    await connection.beginTransaction();
    
    // Buscar configurações
    const [configs] = await connection.query(
      'SELECT taxa_maquininha_pct, custo_fixo_por_atendimento FROM configuracoes WHERE salao_id = ? ORDER BY atualizado_em DESC LIMIT 1',
      [salao_id]
    );
    
    if (configs.length === 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'Configurações do salão não encontradas' });
    }
    
    const config = configs[0];
    
    // Buscar dados do profissional
    const [profissionais] = await connection.query(
      'SELECT cargo, porcentagem_comissao FROM profissionais WHERE id = ? AND salao_id = ?',
      [profissional_id, salao_id]
    );
    
    if (profissionais.length === 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'Profissional não encontrado' });
    }
    
    const prof = profissionais[0];
    
    // Buscar dados do procedimento principal
    const [procedimentos] = await connection.query(
      'SELECT custo_variavel FROM procedimentos WHERE id = ? AND salao_id = ?',
      [procedimento_id, salao_id]
    );
    
    if (procedimentos.length === 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'Procedimento não encontrado' });
    }
    
    const proc = procedimentos[0];
    
    // Buscar produtos associados ao procedimento para calcular custo_variavel dinamicamente
    const [produtosAssociados] = await connection.query(
      `SELECT pc.preco_compra, pc.qtd_aplicacoes, pp.qtd_por_uso
       FROM procedimento_produtos pp
       JOIN produtos_catalogo pc ON pp.produto_id = pc.id
       WHERE pp.procedimento_id = ? AND pp.salao_id = ?`,
      [procedimento_id, salao_id]
    );
    
    // Se houver produtos associados, calcular custo_variavel; senão, usar fallback do procedimento
    // IMPORTANTE: MySQL devuelve DECIMAL como string ("10.00"), por eso se convierte a número
    // para que roundToDecimal del financialEngine no lo descarte (typeof !== 'number' → 0)
    let custoVariavel = parseFloat(proc.custo_variavel) || 0;
    if (produtosAssociados.length > 0) {
      // Transformar dados para o formato esperado por calcularCustoVariavelInsumos
      const { calcularCustoVariavelInsumos } = require('../services/financialEngine.service');
      const produtos = produtosAssociados.map(p => ({
        precoCompra: parseFloat(p.preco_compra),
        qtdAplicacoes: parseFloat(p.qtd_aplicacoes),
        qtdPorUso: parseFloat(p.qtd_por_uso)
      }));
      custoVariavel = calcularCustoVariavelInsumos(produtos);
    }
    
    // Calcular valores do procedimento principal
    const valoresCalculados = calcularValoresAtendimento({
      valorCobrado: valor_cobrado,
      taxaMaquininhaPct: parseFloat(config.taxa_maquininha_pct),
      custoFixoPorAtendimento: parseFloat(config.custo_fixo_por_atendimento),
      cargoProfissional: prof.cargo,
      porcComissao: prof.porcentagem_comissao || 0,
      custoVariavel: custoVariavel
    });
    
    const atendimento_id = uuidv4();
    
    const vPago = valor_pago || 0;
    const vPendente = parseFloat(valor_cobrado) - parseFloat(vPago);

    // Inserir atendimento com valores calculados
    await connection.query(
      `INSERT INTO atendimentos (id, salao_id, data, horario, profissional_id, procedimento_id, comprimento, cliente, valor_cobrado, valor_pago, valor_pendente, valor_maquininha, valor_profissional, custo_fixo, custo_variavel, lucro_liquido, lucro_possivel, status, criado_em, atualizado_em)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        atendimento_id, salao_id, data, horario, profissional_id, procedimento_id, comprimento || 'P', cliente,
        valor_cobrado, vPago, vPendente,
        valoresCalculados.valorMaquininha,
        valoresCalculados.valorProfissional,
        valoresCalculados.custoFixo,
        valoresCalculados.custoVariavel,
        valoresCalculados.lucroLiquido,
        valoresCalculados.lucroPossivel,
        status || 'AGENDADO'
      ]
    );
    
    // Processar procedimentos adicionais se houver
    if (Array.isArray(procedimentos_adicionais) && procedimentos_adicionais.length > 0) {
      for (const procAd of procedimentos_adicionais) {
        const [procAdData] = await connection.query(
          'SELECT custo_variavel FROM procedimentos WHERE id = ? AND salao_id = ?',
          [procAd.procedimento_id, salao_id]
        );
        
        if (procAdData.length === 0) {
          await connection.rollback();
          return res.status(400).json({ error: `Procedimento adicional ${procAd.procedimento_id} não encontrado` });
        }
        
        // Buscar produtos associados ao procedimento adicional
        const [produtosAdicionais] = await connection.query(
          `SELECT pc.preco_compra, pc.qtd_aplicacoes, pp.qtd_por_uso
           FROM procedimento_produtos pp
           JOIN produtos_catalogo pc ON pp.produto_id = pc.id
           WHERE pp.procedimento_id = ? AND pp.salao_id = ?`,
          [procAd.procedimento_id, salao_id]
        );
        
        // IMPORTANTE: MySQL devuelve DECIMAL como string, convertir a número
        let custoVariavelAd = parseFloat(procAdData[0].custo_variavel) || 0;
        if (produtosAdicionais.length > 0) {
          const { calcularCustoVariavelInsumos } = require('../services/financialEngine.service');
          const produtos = produtosAdicionais.map(p => ({
            precoCompra: parseFloat(p.preco_compra),
            qtdAplicacoes: parseFloat(p.qtd_aplicacoes),
            qtdPorUso: parseFloat(p.qtd_por_uso)
          }));
          custoVariavelAd = calcularCustoVariavelInsumos(produtos);
        }
        
        const valoresAd = calcularValoresAtendimento({
          valorCobrado: procAd.valor_cobrado,
          taxaMaquininhaPct: parseFloat(config.taxa_maquininha_pct),
          custoFixoPorAtendimento: parseFloat(config.custo_fixo_por_atendimento),
          cargoProfissional: prof.cargo,
          porcComissao: prof.porcentagem_comissao || 0,
          custoVariavel: custoVariavelAd
        });
        
        const proc_ad_id = uuidv4();
        const adVPago = procAd.valor_pago || 0;
        const adVPendente = parseFloat(procAd.valor_cobrado) - parseFloat(adVPago);
        await connection.query(
          `INSERT INTO atendimento_procedimentos 
           (id, atendimento_id, procedimento_id, comprimento, valor_indicado, valor_cobrado, valor_pago, valor_pendente, sequencia, criado_em, atualizado_em)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          [
            proc_ad_id, atendimento_id, procAd.procedimento_id, procAd.comprimento || 'P',
            procAd.valor_indicado || procAd.valor_cobrado,
            procAd.valor_cobrado, adVPago, adVPendente,
            procAd.sequencia || 1
          ]
        );
      }
    }
    
    await connection.commit();

    // Invalidar cache de fechamento del mes afectado
    invalidarFechamentoCache(salao_id, data);
    
    res.status(201).json({
      sucesso: true,
      id: atendimento_id,
      salao_id,
      data,
      horario,
      cliente,
      profissional_id,
      procedimento_id,
      valor_cobrado,
      valor_pago: vPago,
      valor_pendente: vPendente,
      valor_maquininha: valoresCalculados.valorMaquininha,
      valor_profissional: valoresCalculados.valorProfissional,
      custo_fixo: valoresCalculados.custoFixo,
      custo_variavel: valoresCalculados.custoVariavel,
      lucro_liquido: valoresCalculados.lucroLiquido,
      lucro_possivel: valoresCalculados.lucroPossivel,
      status: status || 'AGENDADO'
    });
    
  } catch (err) {
    try { await connection.rollback(); } catch (e) {}
    console.error('Erro ao criar atendimento:', err);
    res.status(500).json({ error: 'Erro ao criar atendimento' });
  } finally {
    connection.release();
  }
}

/**
 * GET /atendimentos
 * Lista atendimentos do salão do usuário
 */
async function listarAtendimentos(req, res) {
  const connection = await pool.getConnection();
  
  try {
    const salao_id = req.user.salao_id;
    const { data } = req.query;
    
    let query = `
      SELECT a.*, 
             p.nome as profissional_nome,
             pr.nome as procedimento_nome
      FROM atendimentos a
      LEFT JOIN profissionais p ON a.profissional_id = p.id
      LEFT JOIN procedimentos pr ON a.procedimento_id = pr.id
      WHERE a.salao_id = ?
    `;
    const params = [salao_id];
    
    if (data) {
      query += ` AND a.data = ?`;
      params.push(data);
    }
    
    query += ` ORDER BY a.data DESC, a.horario DESC`;
    
    const [atendimentos] = await connection.query(query, params);
    
    res.json({ sucesso: true, count: atendimentos.length, data: atendimentos });
  } catch (err) {
    console.error('Erro ao listar atendimentos:', err);
    res.status(500).json({ error: 'Erro ao listar atendimentos' });
  } finally {
    connection.release();
  }
}

/**
 * GET /atendimentos/:id
 * Obtém um atendimento com seus procedimentos adicionais
 */
async function obterAtendimento(req, res) {
  const connection = await pool.getConnection();
  
  try {
    const { id } = req.params;
    const salao_id = req.user.salao_id;
    
    const [atendimentos] = await connection.query(
      'SELECT * FROM atendimentos WHERE id = ? AND salao_id = ?',
      [id, salao_id]
    );
    
    if (atendimentos.length === 0) {
      return res.status(404).json({ error: 'Atendimento não encontrado' });
    }
    
    const atendimento = atendimentos[0];
    
    const [adicionais] = await connection.query(
      'SELECT * FROM atendimento_procedimentos WHERE atendimento_id = ? ORDER BY criado_em',
      [id]
    );
    
    res.json({
      sucesso: true,
      ...atendimento,
      procedimentos_adicionais: adicionais
    });
  } catch (err) {
    console.error('Erro ao obter atendimento:', err);
    res.status(500).json({ error: 'Erro ao obter atendimento' });
  } finally {
    connection.release();
  }
}

/**
 * PUT /atendimentos/:id
 * Atualiza um atendimento
 */
async function atualizarAtendimento(req, res) {
  const connection = await pool.getConnection();
  
  try {
    const { id } = req.params;
    const { valor_pago, status, profissional_id, horario, data } = req.body;
    const salao_id = req.user.salao_id;
    
    const [atendimentos] = await connection.query(
      'SELECT * FROM atendimentos WHERE id = ? AND salao_id = ?',
      [id, salao_id]
    );
    
    if (atendimentos.length === 0) {
      return res.status(404).json({ error: 'Atendimento não encontrado' });
    }
    
    const atual = atendimentos[0];
    
    // Verificar se o mês NOVO está fechado (se data está sendo mudada)
    const dataParaVerificar = data || atual.data;
    if (await mesEstaFechado(connection, salao_id, dataParaVerificar)) {
      connection.release();
      return res.status(403).json({ error: 'Este mês já foi fechado e não pode mais ser alterado.' });
    }
    
    let query = 'UPDATE atendimentos SET atualizado_em = NOW()';
    let params = [];
    
    // Atualizar valor_pago (recalcula valor_pendente)
    if (valor_pago !== undefined) {
      const vPendente = parseFloat(atual.valor_cobrado) - parseFloat(valor_pago);
      query += ', valor_pago = ?, valor_pendente = ?';
      params.push(valor_pago, vPendente);
    }
    
    // Atualizar status
    if (status !== undefined) {
      query += ', status = ?';
      params.push(status);
    }
    
    // Atualizar horario
    if (horario !== undefined) {
      query += ', horario = ?';
      params.push(horario);
    }
    
    // Atualizar data
    if (data !== undefined) {
      query += ', data = ?';
      params.push(data);
    }
    
    // SE profissional_id está sendo atualizado, recalcular valores financeiros
    if (profissional_id !== undefined && profissional_id !== atual.profissional_id) {
      // Buscar novo profissional
      const [profissionais] = await connection.query(
        'SELECT cargo, porcentagem_comissao FROM profissionais WHERE id = ? AND salao_id = ?',
        [profissional_id, salao_id]
      );
      
      if (profissionais.length === 0) {
        connection.release();
        return res.status(404).json({ error: 'Profissional não encontrado' });
      }
      
      const novoProf = profissionais[0];
      
      // Buscar configurações para recalcular
      const [configs] = await connection.query(
        'SELECT taxa_maquininha_pct, custo_fixo_por_atendimento FROM configuracoes WHERE salao_id = ? ORDER BY atualizado_em DESC LIMIT 1',
        [salao_id]
      );
      
      const config = configs?.[0] || { taxa_maquininha_pct: 0, custo_fixo_por_atendimento: 0 };
      
      // Recalcular valores com novo profissional
      const valoresCalculados = calcularValoresAtendimento({
        valorCobrado: parseFloat(atual.valor_cobrado),
        taxaMaquininhaPct: parseFloat(config.taxa_maquininha_pct),
        custoFixoPorAtendimento: parseFloat(config.custo_fixo_por_atendimento),
        cargoProfissional: novoProf.cargo,
        porcComissao: novoProf.porcentagem_comissao || 0,
        custoVariavel: parseFloat(atual.custo_variavel) || 0
      });
      
      // Adicionar campos financeiros atualizados
      query += ', profissional_id = ?, valor_maquininha = ?, valor_profissional = ?, custo_fixo = ?, lucro_liquido = ?, lucro_possivel = ?';
      params.push(
        profissional_id,
        valoresCalculados.valorMaquininha,
        valoresCalculados.valorProfissional,
        valoresCalculados.custoFixo,
        valoresCalculados.lucroLiquido,
        valoresCalculados.lucroPossivel
      );
    } else if (profissional_id !== undefined) {
      // Profissional_id é igual ao atual, então só atualiza sem recalcular
      query += ', profissional_id = ?';
      params.push(profissional_id);
    }
    
    query += ' WHERE id = ? AND salao_id = ?';
    params.push(id, salao_id);
    
    await connection.query(query, params);

    // Invalidar cache de fechamento del mes afectado (nuevo y anterior)
    invalidarFechamentoCache(salao_id, dataParaVerificar);
    if (data && data !== dataParaVerificar) invalidarFechamentoCache(salao_id, data);
    
    res.json({ sucesso: true, message: 'Atendimento atualizado com sucesso' });
  } catch (err) {
    console.error('Erro ao atualizar atendimento:', err);
    res.status(500).json({ error: 'Erro ao atualizar atendimento' });
  } finally {
    connection.release();
  }
}

/**
 * DELETE /atendimentos/:id
 * Deleta um atendimento
 */
async function deletarAtendimento(req, res) {
  const connection = await pool.getConnection();
  
  try {
    const { id } = req.params;
    const salao_id = req.user.salao_id;
    
    const [atend] = await connection.query('SELECT data FROM atendimentos WHERE id = ? AND salao_id = ?', [id, salao_id]);
    if (atend.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Atendimento não encontrado' });
    }

    if (await mesEstaFechado(connection, salao_id, atend[0].data)) {
      connection.release();
      return res.status(403).json({ error: 'Este mês já foi fechado e não pode mais ser alterado.' });
    }

    const [result] = await connection.query(
      'DELETE FROM atendimentos WHERE id = ? AND salao_id = ?',
      [id, salao_id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Atendimento não encontrado' });
    }

    // Invalidar cache de fechamento del mes afectado
    invalidarFechamentoCache(salao_id, atend[0].data);
    
    res.json({ sucesso: true, message: 'Atendimento deletado com sucesso' });
  } catch (err) {
    console.error('Erro ao deletar atendimento:', err);
    res.status(500).json({ error: 'Erro ao deletar atendimento' });
  } finally {
    connection.release();
  }
}

/**
 * PUT /atendimentos/:id/procedimentos
 * Equivalente Node da RPC substituir_procedimentos_atendimento.
 * Substitui atomicamente todos os procedimentos de um atendimento,
 * recalculando os valores financeiros de cada um.
 * Body: { procedimentos: [{ procedimento_id, comprimento, valor_cobrado, valor_pago, valor_indicado, sequencia }] }
 */
async function substituirProcedimentosAtendimento(req, res) {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;
    const { procedimentos } = req.body;
    const salao_id = req.user.salao_id;

    if (!Array.isArray(procedimentos) || procedimentos.length === 0) {
      connection.release();
      return res.status(400).json({ error: 'procedimentos deve ser um array não-vazio' });
    }

    // Buscar atendimento
    const [atends] = await connection.query(
      'SELECT * FROM atendimentos WHERE id = ? AND salao_id = ?',
      [id, salao_id]
    );
    if (atends.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Atendimento não encontrado' });
    }
    const atend = atends[0];

    if (await mesEstaFechado(connection, salao_id, atend.data)) {
      connection.release();
      return res.status(403).json({ error: 'Este mês já foi fechado e não pode mais ser alterado.' });
    }

    // Buscar configurações e profissional (necessários para recálculo)
    const [configs] = await connection.query(
      'SELECT taxa_maquininha_pct, custo_fixo_por_atendimento FROM configuracoes WHERE salao_id = ? LIMIT 1',
      [salao_id]
    );
    if (configs.length === 0) {
      connection.release();
      return res.status(400).json({ error: 'Configurações do salão não encontradas' });
    }
    const config = configs[0];

    const [profs] = await connection.query(
      'SELECT cargo, porcentagem_comissao FROM profissionais WHERE id = ? AND salao_id = ?',
      [atend.profissional_id, salao_id]
    );
    if (profs.length === 0) {
      connection.release();
      return res.status(400).json({ error: 'Profissional não encontrado' });
    }
    const prof = profs[0];

    const { calcularCustoVariavelInsumos } = require('../services/financialEngine.service');

    await connection.beginTransaction();

    // 1. Apagar procedimentos antigos (equivalente ao DELETE da RPC)
    await connection.query(
      'DELETE FROM atendimento_procedimentos WHERE atendimento_id = ?',
      [id]
    );

    // 2. Inserir novos procedimentos com recálculo financeiro
    for (let idx = 0; idx < procedimentos.length; idx++) {
      const proc = procedimentos[idx];
      const seq = proc.sequencia || idx + 1;

      // Buscar custo variável do procedimento
      const [procData] = await connection.query(
        'SELECT custo_variavel FROM procedimentos WHERE id = ? AND salao_id = ?',
        [proc.procedimento_id, salao_id]
      );
      if (procData.length === 0) {
        await connection.rollback();
        connection.release();
        return res.status(400).json({ error: `Procedimento ${proc.procedimento_id} não encontrado` });
      }

      // Calcular custo variável via insumos ou fallback
      const [produtosAssoc] = await connection.query(
        `SELECT pc.preco_compra, pc.qtd_aplicacoes, pp.qtd_por_uso
         FROM procedimento_produtos pp
         JOIN produtos_catalogo pc ON pp.produto_id = pc.id
         WHERE pp.procedimento_id = ? AND pp.salao_id = ?`,
        [proc.procedimento_id, salao_id]
      );
      let custoVariavel = Number(procData[0].custo_variavel || 0);
      if (produtosAssoc.length > 0) {
        custoVariavel = calcularCustoVariavelInsumos(produtosAssoc.map(p => ({
          precoCompra: parseFloat(p.preco_compra),
          qtdAplicacoes: parseFloat(p.qtd_aplicacoes),
          qtdPorUso: parseFloat(p.qtd_por_uso)
        })));
      }

      const valoresCalc = calcularValoresAtendimento({
        valorCobrado: proc.valor_cobrado,
        taxaMaquininhaPct: parseFloat(config.taxa_maquininha_pct),
        custoFixoPorAtendimento: parseFloat(config.custo_fixo_por_atendimento),
        cargoProfissional: prof.cargo,
        porcComissao: prof.porcentagem_comissao || 0,
        custoVariavel
      });

      const vPago = proc.valor_pago || 0;
      const vPendente = parseFloat(proc.valor_cobrado) - parseFloat(vPago);

      await connection.query(
        `INSERT INTO atendimento_procedimentos
         (id, atendimento_id, procedimento_id, comprimento, valor_indicado, valor_cobrado, valor_pago, valor_pendente, sequencia, criado_em, atualizado_em)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          uuidv4(), id, proc.procedimento_id, proc.comprimento || null,
          proc.valor_indicado || proc.valor_cobrado,
          proc.valor_cobrado, vPago, vPendente, seq
        ]
      );
    }

    // 3. Agregar valores financeiros de todos os procedimentos
    let totalValorCobrado = 0;
    let totalValorPago = 0;
    let totalValorMaquininha = 0;
    let totalValorProfissional = 0;
    let totalCustoFixo = 0;
    let totalCustoVariavel = 0;
    let totalLucroLiquido = 0;
    let totalLucroPossivel = 0;

    for (let idx = 0; idx < procedimentos.length; idx++) {
      const proc = procedimentos[idx];

      // Buscar custo variável do procedimento (repetido do loop anterior, mas necessário para os totais)
      const [procData] = await connection.query(
        'SELECT custo_variavel FROM procedimentos WHERE id = ? AND salao_id = ?',
        [proc.procedimento_id, salao_id]
      );
      if (procData.length === 0) {
        await connection.rollback();
        connection.release();
        return res.status(400).json({ error: `Procedimento ${proc.procedimento_id} não encontrado` });
      }

      const [produtosAssoc] = await connection.query(
        `SELECT pc.preco_compra, pc.qtd_aplicacoes, pp.qtd_por_uso
         FROM procedimento_produtos pp
         JOIN produtos_catalogo pc ON pp.produto_id = pc.id
         WHERE pp.procedimento_id = ? AND pp.salao_id = ?`,
        [proc.procedimento_id, salao_id]
      );
      let custoVariavel = Number(procData[0].custo_variavel || 0);
      if (produtosAssoc.length > 0) {
        custoVariavel = calcularCustoVariavelInsumos(produtosAssoc.map(p => ({
          precoCompra: parseFloat(p.preco_compra),
          qtdAplicacoes: parseFloat(p.qtd_aplicacoes),
          qtdPorUso: parseFloat(p.qtd_por_uso)
        })));
      }

      const valoresCalc = calcularValoresAtendimento({
        valorCobrado: proc.valor_cobrado,
        taxaMaquininhaPct: parseFloat(config.taxa_maquininha_pct),
        custoFixoPorAtendimento: parseFloat(config.custo_fixo_por_atendimento),
        cargoProfissional: prof.cargo,
        porcComissao: prof.porcentagem_comissao || 0,
        custoVariavel
      });

      totalValorCobrado += parseFloat(proc.valor_cobrado);
      totalValorPago += parseFloat(proc.valor_pago || 0);
      totalValorMaquininha += valoresCalc.valorMaquininha;
      totalValorProfissional += valoresCalc.valorProfissional;
      totalCustoFixo += valoresCalc.custoFixo;
      totalCustoVariavel += valoresCalc.custoVariavel;
      totalLucroLiquido += valoresCalc.lucroLiquido;
      totalLucroPossivel += valoresCalc.lucroPossivel;
    }

    const totalPendente = totalValorCobrado - totalValorPago;

    // 4. Atualizar atendimento com valores agregados (mesmo comportamento de criarAtendimento)
    await connection.query(
      `UPDATE atendimentos SET
        procedimento_id = ?,
        valor_cobrado = ?,
        valor_pago = ?,
        valor_pendente = ?,
        valor_maquininha = ?,
        valor_profissional = ?,
        custo_fixo = ?,
        custo_variavel = ?,
        lucro_liquido = ?,
        lucro_possivel = ?,
        atualizado_em = NOW()
       WHERE id = ? AND salao_id = ?`,
      [
        procedimentos[0].procedimento_id,
        totalValorCobrado.toFixed(2),
        totalValorPago.toFixed(2),
        totalPendente.toFixed(2),
        totalValorMaquininha.toFixed(2),
        totalValorProfissional.toFixed(2),
        totalCustoFixo.toFixed(2),
        totalCustoVariavel.toFixed(2),
        totalLucroLiquido.toFixed(2),
        totalLucroPossivel.toFixed(2),
        id,
        salao_id
      ]
    );

    await connection.commit();

    // Invalidar cache de fechamento del mes afectado
    invalidarFechamentoCache(salao_id, atend.data);

    res.json({ sucesso: true, message: 'Procedimentos atualizados com sucesso' });
  } catch (err) {
    try { await connection.rollback(); } catch (e) {}
    console.error('Erro ao substituir procedimentos:', err);
    res.status(500).json({ error: 'Erro ao atualizar procedimentos do atendimento' });
  } finally {
    connection.release();
  }
}

module.exports = {
  criarAtendimento,
  listarAtendimentos,
  obterAtendimento,
  atualizarAtendimento,
  deletarAtendimento,
  substituirProcedimentosAtendimento
};
