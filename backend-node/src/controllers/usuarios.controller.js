const pool = require('../config/db');
const bcrypt = require('bcrypt');
const { randomBytes, randomUUID } = require('crypto');
const emailService = require('../services/email.service');

async function convidar(req, res) {
  try {
    const { email, role, cargo, nome } = req.body;
    const salao_id = req.user?.salao_id; // Get from token, not from body
    const userRole = role || cargo; // Accept both 'role' and 'cargo' for compatibility
    
    if (!email || !salao_id || !userRole) return res.status(400).json({ error: 'Missing fields' });

    const tempPass = randomBytes(6).toString('hex');
    const auth_user_id = randomUUID();
    const senha_hash = await bcrypt.hash(tempPass, 10);

    await pool.query('INSERT INTO usuarios_auth (id, email, senha_hash) VALUES (?, ?, ?)', [auth_user_id, email, senha_hash]);
    await pool.query('INSERT INTO perfis_acesso (auth_user_id, salao_id, cargo, username) VALUES (?, ?, ?, ?)', [auth_user_id, salao_id, userRole, email]);

    if (userRole === 'PROFISSIONAL' || userRole === 'PROFISSIONAL_CLT') {
      await pool.query('INSERT INTO profissionais (salao_id, auth_user_id, nome) VALUES (?, ?, ?)', [salao_id, auth_user_id, nome || null]);
    }

    emailService.sendInvitation(email, { tempPass, salao_id, userRole });

    return res.json({ sucesso: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal error' });
  }
}

module.exports = { convidar };
