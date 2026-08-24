/**
 * Controller CRUD Genérico
 * Reutilizável para tabelas simples sem lógica especial
 */

const pool = require('../config/db');
const { v4: uuidv4 } = require('uuid');
const { mesEstaFechado } = require('../services/fechamentoGuard.service');
const { invalidarFechamentoCache } = require('./fechamento.controller');

// Tabelas que afetam o fechamento mensal e a coluna usada como data-base.
// gastos_pessoais NÃO possui coluna `data` — o mês é derivado de `criado_em`.
const TABELAS_FECHAMENTO = {
  homecare: 'data',
  despesas: 'data',
  procedimentos_paralelos: 'data',
  gastos_pessoais: 'criado_em'
};

/**
 * Mapeia campos de entrada para campos de banco de dados
 * Permite compatibilidade entre nomes diferentes (ex: porc_comissao -> porcentagem_comissao)
 */
function mapearCampos(nomeTabela, dados) {
  const mapeamento = {
    'profissionais': {
      'porc_comissao': 'porcentagem_comissao'
    }
  };
  
  const mapper = mapeamento[nomeTabela] || {};
  const resultado = { ...dados };
  
  Object.keys(mapper).forEach(nomeAntigo => {
    if (nomeAntigo in resultado) {
      resultado[mapper[nomeAntigo]] = resultado[nomeAntigo];
      delete resultado[nomeAntigo];
    }
  });
  
  return resultado;
}

/**
 * Cria uma factory de funções CRUD para uma tabela
 */
function createCRUDController(nomeTabela, campos = []) {
  return {
    /**
     * GET /:nomeTabela
     * Lista todos os registros da tabela (filtrado por salao_id)
     */
    async listar(req, res) {
      try {
        const salao_id = req.user.salao_id;
        const [resultados] = await pool.query(
          `SELECT * FROM ${nomeTabela} WHERE salao_id = ? ORDER BY id DESC`,
          [salao_id]
        );
        // Segurança: nunca expor dashboard_pin para o frontend
        if (nomeTabela === 'configuracoes') {
          const sanitizado = resultados.map(({ dashboard_pin, ...rest }) => rest);
          return res.json(sanitizado);
        }
        res.json(resultados);
      } catch (error) {
        console.error(`Erro ao listar ${nomeTabela}:`, error);
        res.status(500).json({ error: `Erro ao listar ${nomeTabela}` });
      }
    },

    /**
     * GET /:nomeTabela/:id
     * Obtém um registro específico
     */
    async obterPorId(req, res) {
      try {
        const { id } = req.params;
        const salao_id = req.user.salao_id;
        const [resultados] = await pool.query(
          `SELECT * FROM ${nomeTabela} WHERE id = ? AND salao_id = ?`,
          [id, salao_id]
        );
        if (resultados.length === 0) {
          return res.status(404).json({ error: `${nomeTabela} não encontrado` });
        }
        // Segurança: nunca expor dashboard_pin para o frontend
        if (nomeTabela === 'configuracoes') {
          const { dashboard_pin, ...rest } = resultados[0];
          return res.json(rest);
        }
        res.json(resultados[0]);
      } catch (error) {
        console.error(`Erro ao obter ${nomeTabela}:`, error);
        res.status(500).json({ error: `Erro ao obter ${nomeTabela}` });
      }
    },

    /**
     * POST /:nomeTabela
     * Cria um novo registro
     */
    async criar(req, res) {
      try {
        const salao_id = req.user.salao_id;
        let dados = mapearCampos(nomeTabela, { ...req.body, salao_id });

        if (typeof dados !== 'object' || Array.isArray(dados) || dados === null || Object.keys(dados).length === 0) {
          return res.status(400).json({ error: 'Dados inválidos ou vazios' });
        }
        
        // Mapeamento de campos para tabelas que não possuem 'nome'
        // Mapeia 'nome' para 'descricao' para tabelas que usam esse campo
        const tabelasComDescricao = ['custos_fixos_itens', 'despesas', 'procedimentos_paralelos'];
        if (tabelasComDescricao.includes(nomeTabela) && dados.nome && !dados.descricao) {
          dados.descricao = dados.nome;
          delete dados.nome;
        }
        
        // Para configuracoes, remover 'nome' se for enviado (é uma tabela de config global)
        if (nomeTabela === 'configuracoes' && dados.nome) {
          delete dados.nome;
        }
        
        // Para homecare, mapear 'nome' para 'cliente' se necessário
        if (nomeTabela === 'homecare' && dados.nome && !dados.cliente) {
          dados.cliente = dados.nome;
          delete dados.nome;
        }
        
        // Adicionar defaults para tabelas que requerem data
        const tabelasComData = ['despesas', 'homecare', 'procedimentos_paralelos'];
        if (tabelasComData.includes(nomeTabela) && !dados.data) {
          dados.data = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        }

        if (tabelasComData.includes(nomeTabela) && dados.data) {
          if (await mesEstaFechado(pool, salao_id, dados.data)) {
            return res.status(403).json({ error: 'Este mês já foi fechado e não pode mais ser alterado.' });
          }
        }
        
        // Adicionar defaults para homecare
        if (nomeTabela === 'homecare') {
          if (!dados.produto) dados.produto = 'Produto Teste';
          if (!dados.custo_produto) dados.custo_produto = 0;
          if (!dados.valor_venda) dados.valor_venda = 0;
          if (!dados.valor_pago) dados.valor_pago = 0;
          // Reforço de robustez: calcular valor_pendente y lucro en el backend
          // (capa extra de protección contra datos manipulados viniendo de la API)
          dados.valor_pendente = parseFloat(dados.valor_venda || 0) - parseFloat(dados.valor_pago || 0);
          dados.lucro = parseFloat(dados.valor_venda || 0) - parseFloat(dados.custo_produto || 0);
        }
        
        // Adicionar defaults para procedimentos_paralelos
        if (nomeTabela === 'procedimentos_paralelos') {
          if (!dados.cliente) dados.cliente = 'Cliente Padrão';
          if (!dados.valor) dados.valor = 0;
          if (!dados.valor_pago) dados.valor_pago = 0;
          if (!dados.valor_profissional) dados.valor_profissional = 0;
        }
        
        // Adicionar defaults para despesas
        if (nomeTabela === 'despesas') {
          if (!dados.tipo) dados.tipo = 'OUTRO';
          if (!dados.valor) dados.valor = 0;
          if (!dados.valor_pago) dados.valor_pago = 0;
        }
        
        // Gerar UUID para a coluna 'id' se não foi fornecido
        if (!dados.id) {
          dados.id = uuidv4();
        }

        // Validar e sanitizar chaves para evitar SQL injection estrutural
        const chavesInvalidas = Object.keys(dados).filter(k => !/^[a-zA-Z0-9_]+$/.test(k));
        if (chavesInvalidas.length > 0) {
          return res.status(400).json({ error: 'Nomes de campos inválidos detectados' });
        }
        
        const camposNomes = Object.keys(dados).join(', ');
        const placeholders = Object.keys(dados).map(() => '?').join(', ');
        const valores = Object.values(dados);
        
        const [resultado] = await pool.query(
          `INSERT INTO ${nomeTabela} (${camposNomes}) VALUES (${placeholders})`,
          valores
        );

        // Invalidar cache de fechamento se a tabela afeta o fechamento mensal
        const colunaDataCriar = TABELAS_FECHAMENTO[nomeTabela];
        if (colunaDataCriar) {
          const fechaRegistro = dados[colunaDataCriar] || dados.criado_em || new Date().toISOString().split('T')[0];
          invalidarFechamentoCache(salao_id, fechaRegistro);
        }
        
        res.status(201).json({
          id: dados.id,
          ...dados
        });
      } catch (error) {
        console.error(`Erro ao criar ${nomeTabela}:`, error);
        res.status(500).json({ error: `Erro ao criar ${nomeTabela}` });
      }
    },

    /**
     * PUT /:nomeTabela/:id
     * Atualiza um registro existente
     */
    async atualizar(req, res) {
      try {
        const { id } = req.params;
        const salao_id = req.user.salao_id;
        
        // Verificar se existe
        const [existe] = await pool.query(
          `SELECT id FROM ${nomeTabela} WHERE id = ? AND salao_id = ?`,
          [id, salao_id]
        );
        
        if (existe.length === 0) {
          return res.status(404).json({ error: `${nomeTabela} não encontrado` });
        }
        
        // Mapear campos antes de atualizar
        let dadosUpdate = mapearCampos(nomeTabela, { ...req.body });
        
        // Capturar a data anterior do registro para invalidar o cache do mês correto
        // (gastos_pessoais não tem coluna `data`; usa criado_em)
        const colunaDataUpd = TABELAS_FECHAMENTO[nomeTabela];
        let dataAnterior = null;
        if (colunaDataUpd) {
          const [regAnterior] = await pool.query(
            `SELECT ${colunaDataUpd} AS dt FROM ${nomeTabela} WHERE id = ? AND salao_id = ?`,
            [id, salao_id]
          );
          dataAnterior = regAnterior[0]?.dt || null;
        }
        
        // Aplicar mesma lógica de mapeamento de nome que na criação
        const tabelasComDescricao = ['custos_fixos_itens', 'despesas', 'procedimentos_paralelos'];
        if (tabelasComDescricao.includes(nomeTabela) && dadosUpdate.nome && !dadosUpdate.descricao) {
          dadosUpdate.descricao = dadosUpdate.nome;
          delete dadosUpdate.nome;
        }
        
        if (nomeTabela === 'configuracoes' && dadosUpdate.nome) {
          delete dadosUpdate.nome;
        }
        
        if (nomeTabela === 'homecare' && dadosUpdate.nome && !dadosUpdate.cliente) {
          dadosUpdate.cliente = dadosUpdate.nome;
          delete dadosUpdate.nome;
        }

        // Reforço de robustez: recalcular valor_pendente y lucro en el backend
        // si cambian valor_venda, valor_pago o custo_produto (capa extra de protección)
        if (nomeTabela === 'homecare') {
          const [hcAtual] = await pool.query(
            `SELECT valor_venda, valor_pago, custo_produto FROM ${nomeTabela} WHERE id = ? AND salao_id = ?`,
            [id, salao_id]
          );
          const hc = hcAtual[0] || {};
          const valorVenda = dadosUpdate.valor_venda !== undefined ? dadosUpdate.valor_venda : hc.valor_venda;
          const valorPago = dadosUpdate.valor_pago !== undefined ? dadosUpdate.valor_pago : hc.valor_pago;
          const custoProduto = dadosUpdate.custo_produto !== undefined ? dadosUpdate.custo_produto : hc.custo_produto;
          dadosUpdate.valor_pendente = parseFloat(valorVenda || 0) - parseFloat(valorPago || 0);
          dadosUpdate.lucro = parseFloat(valorVenda || 0) - parseFloat(custoProduto || 0);
        }

        const tabelasComData = ['despesas', 'homecare', 'procedimentos_paralelos'];
        if (tabelasComData.includes(nomeTabela)) {
          const [atual] = await pool.query(`SELECT data FROM ${nomeTabela} WHERE id = ? AND salao_id = ?`, [id, salao_id]);
          if (atual.length > 0 && await mesEstaFechado(pool, salao_id, atual[0].data)) {
            return res.status(403).json({ error: 'Este mês já foi fechado e não pode mais ser alterado.' });
          }
          if (dadosUpdate.data && await mesEstaFechado(pool, salao_id, dadosUpdate.data)) {
            return res.status(403).json({ error: 'Este mês já foi fechado e não pode mais ser alterado.' });
          }
        }
        
        // Validar e sanitizar chaves para evitar SQL injection estrutural
        const chavesInvalidas = Object.keys(dadosUpdate).filter(k => !/^[a-zA-Z0-9_]+$/.test(k));
        if (chavesInvalidas.length > 0) {
          return res.status(400).json({ error: 'Nomes de campos inválidos detectados' });
        }
        
        // Atualizar
        const camposUpdate = Object.keys(dadosUpdate).map(k => `${k} = ?`).join(', ');
        const valores = [...Object.values(dadosUpdate), id, salao_id];
        
        if (!camposUpdate) {
          return res.json({ id, message: 'Nenhum campo para atualizar' });
        }
        
        await pool.query(
          `UPDATE ${nomeTabela} SET ${camposUpdate} WHERE id = ? AND salao_id = ?`,
          valores
        );

        // Invalidar cache de fechamento do mês anterior e do novo mês (se mudou)
        if (colunaDataUpd) {
          const dataNova = dadosUpdate[colunaDataUpd] !== undefined ? dadosUpdate[colunaDataUpd] : dataAnterior;
          if (dataAnterior) invalidarFechamentoCache(salao_id, dataAnterior);
          if (dataNova && dataNova !== dataAnterior) invalidarFechamentoCache(salao_id, dataNova);
        }
        
        res.json({ id, message: `${nomeTabela} atualizado com sucesso` });
      } catch (error) {
        console.error(`Erro ao atualizar ${nomeTabela}:`, error);
        res.status(500).json({ error: `Erro ao atualizar ${nomeTabela}` });
      }
    },

    /**
     * DELETE /:nomeTabela/:id
     * Remove um registro
     */
    async deletar(req, res) {
      try {
        const { id } = req.params;
        const salao_id = req.user.salao_id;

        const tabelasComData = ['despesas', 'homecare', 'procedimentos_paralelos'];
        if (tabelasComData.includes(nomeTabela)) {
          const [atual] = await pool.query(`SELECT data FROM ${nomeTabela} WHERE id = ? AND salao_id = ?`, [id, salao_id]);
          if (atual.length > 0 && await mesEstaFechado(pool, salao_id, atual[0].data)) {
            return res.status(403).json({ error: 'Este mês já foi fechado e não pode mais ser alterado.' });
          }
        }
        
        // Capturar a data do registro ANTES de deletar, para invalidar o cache
        // do mês correto (gastos_pessoais não tem coluna `data`; usa criado_em)
        const colunaDataDel = TABELAS_FECHAMENTO[nomeTabela];
        let dataRegistro = null;
        if (colunaDataDel) {
          const [regDel] = await pool.query(
            `SELECT ${colunaDataDel} AS dt FROM ${nomeTabela} WHERE id = ? AND salao_id = ?`,
            [id, salao_id]
          );
          dataRegistro = regDel[0]?.dt || null;
        }

        const [resultado] = await pool.query(
          `DELETE FROM ${nomeTabela} WHERE id = ? AND salao_id = ?`,
          [id, salao_id]
        );
        
        if (resultado.affectedRows === 0) {
          return res.status(404).json({ error: `${nomeTabela} não encontrado` });
        }

        // Invalidar cache de fechamento do mês do registro removido
        if (dataRegistro) {
          invalidarFechamentoCache(salao_id, dataRegistro);
        }
        
        res.json({ id, message: `${nomeTabela} removido com sucesso` });
      } catch (error) {
        console.error(`Erro ao deletar ${nomeTabela}:`, error);
        res.status(500).json({ error: `Erro ao deletar ${nomeTabela}` });
      }
    }
  };
}

/**
 * Controller customizado para procedimento_produtos
 * Suporta filtro por procedimento_id via query param
 */
function createProcedimentoProdutosController() {
  return {
    async listar(req, res) {
      try {
        const salao_id = req.user.salao_id;
        const { procedimento_id } = req.query;
        
        let query = `SELECT pp.*, pc.preco_compra, pc.qtd_aplicacoes FROM procedimento_produtos pp
                     JOIN produtos_catalogo pc ON pp.produto_id = pc.id
                     WHERE pp.salao_id = ?`;
        const params = [salao_id];
        
        if (procedimento_id) {
          query += ` AND pp.procedimento_id = ?`;
          params.push(procedimento_id);
        }
        
        query += ` ORDER BY pp.criado_em DESC`;
        
        const [resultados] = await pool.query(query, params);
        res.json(resultados);
      } catch (error) {
        console.error('Erro ao listar procedimento_produtos:', error);
        res.status(500).json({ error: 'Erro ao listar procedimento_produtos' });
      }
    },

    async obterPorId(req, res) {
      try {
        const { id } = req.params;
        const salao_id = req.user.salao_id;
        const [resultados] = await pool.query(
          `SELECT pp.*, pc.preco_compra, pc.qtd_aplicacoes FROM procedimento_produtos pp
           JOIN produtos_catalogo pc ON pp.produto_id = pc.id
           WHERE pp.id = ? AND pp.salao_id = ?`,
          [id, salao_id]
        );
        if (resultados.length === 0) {
          return res.status(404).json({ error: 'procedimento_produtos não encontrado' });
        }
        res.json(resultados[0]);
      } catch (error) {
        console.error('Erro ao obter procedimento_produtos:', error);
        res.status(500).json({ error: 'Erro ao obter procedimento_produtos' });
      }
    },

    async criar(req, res) {
      try {
        const salao_id = req.user.salao_id;
        const { procedimento_id, produto_id, qtd_por_uso } = req.body;
        
        if (!procedimento_id || !produto_id) {
          return res.status(400).json({ error: 'procedimento_id e produto_id são obrigatórios' });
        }
        
        const id = uuidv4();
        await pool.query(
          `INSERT INTO procedimento_produtos (id, salao_id, procedimento_id, produto_id, qtd_por_uso, criado_em)
           VALUES (?, ?, ?, ?, ?, NOW())`,
          [id, salao_id, procedimento_id, produto_id, qtd_por_uso || 1]
        );
        
        res.status(201).json({ id, message: 'procedimento_produtos criado com sucesso' });
      } catch (error) {
        console.error('Erro ao criar procedimento_produtos:', error);
        res.status(500).json({ error: 'Erro ao criar procedimento_produtos' });
      }
    },

    async atualizar(req, res) {
      try {
        const { id } = req.params;
        const salao_id = req.user.salao_id;
        const { qtd_por_uso } = req.body;
        
        if (qtd_por_uso === undefined) {
          return res.json({ id, message: 'Nenhum campo para atualizar' });
        }
        
        await pool.query(
          `UPDATE procedimento_produtos SET qtd_por_uso = ? WHERE id = ? AND salao_id = ?`,
          [qtd_por_uso, id, salao_id]
        );
        
        res.json({ id, message: 'procedimento_produtos atualizado com sucesso' });
      } catch (error) {
        console.error('Erro ao atualizar procedimento_produtos:', error);
        res.status(500).json({ error: 'Erro ao atualizar procedimento_produtos' });
      }
    },

    async deletar(req, res) {
      try {
        const { id } = req.params;
        const salao_id = req.user.salao_id;
        
        const [resultado] = await pool.query(
          `DELETE FROM procedimento_produtos WHERE id = ? AND salao_id = ?`,
          [id, salao_id]
        );
        
        if (resultado.affectedRows === 0) {
          return res.status(404).json({ error: 'procedimento_produtos não encontrado' });
        }
        
        res.json({ id, message: 'procedimento_produtos removido com sucesso' });
      } catch (error) {
        console.error('Erro ao deletar procedimento_produtos:', error);
        res.status(500).json({ error: 'Erro ao deletar procedimento_produtos' });
      }
    }
  };
}

module.exports = { createCRUDController, createProcedimentoProdutosController };
