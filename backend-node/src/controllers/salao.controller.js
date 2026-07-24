const pool = require('../config/db');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

async function criarProprietaria(req, res) {
  const { email, senha, nome, nome_salao, telefone, vendedor_id } = req.body;
  if (!email || !senha || !nome || !nome_salao) return res.status(400).json({ error: 'Missing fields' });

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Gerar UUIDs explicitamente ANTES do insert
    const salao_id = uuidv4();
    const auth_user_id = uuidv4();

    const [salaoResult] = await connection.query(
      'INSERT INTO saloes (id, nome, nome_proprietaria, telefone, vendedor_id) VALUES (?, ?, ?, ?, ?)',
      [salao_id, nome_salao, nome, telefone || null, vendedor_id || null]
    );

    await connection.query(
      'INSERT INTO configuracoes (salao_id, taxa_maquininha_pct, custo_fixo_por_atendimento) VALUES (?, ?, ?)',
      [salao_id, 5.0, 10.65]
    );

    const senha_hash = await bcrypt.hash(senha, 10);
    await connection.query(
      'INSERT INTO usuarios_auth (id, email, senha_hash) VALUES (?, ?, ?)',
      [auth_user_id, email, senha_hash]
    );

    await connection.query(
      'INSERT INTO perfis_acesso (auth_user_id, salao_id, cargo, username) VALUES (?, ?, ?, ?)',
      [auth_user_id, salao_id, 'PROPRIETARIO', email]
    );

    await connection.query(
      'INSERT INTO logins_gerados (vendedor_id, salao_id, username, senha_temporaria, auth_user_id) VALUES (?, ?, ?, ?, ?)',
      [vendedor_id || null, salao_id, email, senha, auth_user_id]
    );

    await connection.commit();
    return res.json({ sucesso: true, salao_id, auth_user_id });
  } catch (err) {
    console.error(err);
    await connection.rollback();
    return res.status(500).json({ error: 'Transaction failed' });
  } finally {
    connection.release();
  }
}

async function deletarSalao(req, res) {
  const { salao_id } = req.params;
  if (!salao_id) return res.status(400).json({ error: 'salao_id required' });

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Note: This list follows the prompt order; adjust table names if necessary
    const deletes = [
      'DELETE ap FROM atendimento_procedimentos ap JOIN atendimentos a ON ap.atendimento_id = a.id WHERE a.salao_id = ?',
      'DELETE FROM atendimentos WHERE salao_id = ?',
      'DELETE FROM procedimento_produtos WHERE salao_id = ?',
      'DELETE FROM procedimentos WHERE salao_id = ?',
      'DELETE FROM produtos_catalogo WHERE salao_id = ?',
      'DELETE FROM custos_fixos_itens WHERE salao_id = ?',
      'DELETE FROM homecare WHERE salao_id = ?',
      'DELETE FROM procedimentos_paralelos WHERE salao_id = ?',
      'DELETE FROM despesas WHERE salao_id = ?',
      'DELETE FROM gastos_pessoais WHERE salao_id = ?',
      'DELETE FROM fechamentos WHERE salao_id = ?',
      'DELETE FROM pagamentos_assinatura WHERE salao_id = ?',
      'DELETE FROM assinaturas WHERE salao_id = ?',
      'DELETE FROM logins_gerados WHERE salao_id = ?',
      'DELETE FROM logs_acesso WHERE salao_id = ?',
      'DELETE FROM configuracoes WHERE salao_id = ?',
      'DELETE FROM profissionais WHERE salao_id = ?',
      'DELETE FROM clientes WHERE salao_id = ?',
      'DELETE FROM usuarios_auth WHERE id IN (SELECT auth_user_id FROM perfis_acesso WHERE salao_id = ?)',
      'DELETE FROM perfis_acesso WHERE salao_id = ?',
      'DELETE FROM saloes WHERE id = ?'
    ];

    for (const q of deletes) {
      await connection.query(q, [salao_id]);
    }

    await connection.commit();
    return res.json({ sucesso: true });
  } catch (err) {
    console.error(err);
    await connection.rollback();
    return res.status(500).json({ error: 'Deletion failed' });
  } finally {
    connection.release();
  }
}

async function listarSaloes(req, res) {
  if (req.user.cargo !== 'VENDEDOR') {
    return res.status(403).json({ error: 'Acesso negado' });
  }
  
  const vendedor_id = req.user.auth_user_id;

  try {
    const [saloes] = await pool.query(
      'SELECT id, nome, nome_proprietaria, telefone, ativo, criado_em FROM saloes WHERE vendedor_id = ? AND deletado_em IS NULL ORDER BY criado_em DESC',
      [vendedor_id]
    );
    return res.json(saloes);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to list saloes' });
  }
}

async function atualizarSalao(req, res) {
  const { id } = req.params;
  const { nome, nome_proprietaria, telefone } = req.body; if (!nome || !nome_proprietaria || !telefone) return res.status(400).json({ error: 'Missing fields' });
  if (req.user.salao_id !== id && req.user.cargo !== 'VENDEDOR') {
    return res.status(403).json({ error: 'Acesso negado' });
  }

  try {
    await pool.query(
      'UPDATE saloes SET nome = ?, nome_proprietaria = ?, telefone = ? WHERE id = ?',
      [nome, nome_proprietaria, telefone, id]
    );
    return res.json({ sucesso: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to update salao' });
  }
}

async function configurarSalao(req, res) {
  const { id } = req.params;
  if (req.user.salao_id !== id && req.user.cargo !== 'VENDEDOR') {
    return res.status(403).json({ error: 'Acesso negado' });
  }

  try {
    await pool.query('UPDATE saloes SET configurado = true WHERE id = ?', [id]);
    return res.json({ sucesso: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to configure salao' });
  }
}

async function obterSalao(req, res) {
  const { id } = req.params;
  if (req.user.salao_id !== id && req.user.cargo !== 'VENDEDOR') {
    return res.status(403).json({ error: 'Acesso negado' });
  }
  try {
    const [rows] = await pool.query('SELECT nome, nome_proprietaria, telefone FROM saloes WHERE id = ?', [id]);
    return res.json(rows[0] || {});
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch salao' });
  }
}

module.exports = { criarProprietaria, deletarSalao, listarSaloes, atualizarSalao, configurarSalao, obterSalao };
