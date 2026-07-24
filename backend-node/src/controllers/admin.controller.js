const pool = require('../config/db');
const bcrypt = require('bcrypt');
const { randomUUID } = require('crypto');

async function criarAdmin(req, res) {
  try {
    const { email, senha, nome, vendedor_id } = req.body;
    if (!email || !senha || senha.length < 8) return res.status(400).json({ error: 'Senha deve ter pelo menos 8 caracteres' });

    const auth_user_id = randomUUID();
    const senha_hash = await bcrypt.hash(senha, 10);

    await pool.query('INSERT INTO usuarios_auth (id, email, senha_hash) VALUES (?, ?, ?)', [auth_user_id, email, senha_hash]);
    await pool.query('INSERT INTO perfis_acesso (auth_user_id, salao_id, cargo, username) VALUES (?, ?, ?, ?)', [auth_user_id, null, 'VENDEDOR', nome || email]);

    return res.json({ sucesso: true, user_id: auth_user_id });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal error' });
  }
}

async function removerAdmin(req, res) {
  try {
    const { user_id } = req.params;
    const currentUser = req.user && req.user.auth_user_id;
    if (!user_id) return res.status(400).json({ error: 'user_id required' });
    if (currentUser === user_id) return res.status(400).json({ error: 'Cannot delete own account' });

    await pool.query('DELETE FROM perfis_acesso WHERE auth_user_id = ?', [user_id]);
    await pool.query('DELETE FROM usuarios_auth WHERE id = ?', [user_id]);

    return res.json({ sucesso: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal error' });
  }
}

async function listarAdmins(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT ua.id AS auth_user_id, ua.email, pa.username AS nome, ua.criado_em
       FROM usuarios_auth ua
       JOIN perfis_acesso pa ON pa.auth_user_id = ua.id
       WHERE pa.cargo = 'VENDEDOR' AND pa.salao_id IS NULL
       ORDER BY ua.criado_em ASC`
    );
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to list admins' });
  }
}

async function listarLoginsGerados(req, res) {
  if (req.user.cargo !== 'VENDEDOR') {
    return res.status(403).json({ error: 'Acesso negado' });
  }

  const { salao_id } = req.query;
  if (!salao_id) return res.status(400).json({ error: 'salao_id required' });

  try {
    const [logins] = await pool.query(
      'SELECT id, username, senha_temporaria, ativo, gerado_em FROM logins_gerados WHERE salao_id = ? ORDER BY gerado_em DESC',
      [salao_id]
    );
    return res.json(logins);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to list logins' });
  }
}

module.exports = { criarAdmin, removerAdmin, listarAdmins, listarLoginsGerados };
