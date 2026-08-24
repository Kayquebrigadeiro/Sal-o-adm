const pool = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Proteção contra força bruta: contagem de tentativas falhas por IP
const loginAttempts = new Map();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutos

function isLockedOut(ip) {
  const record = loginAttempts.get(ip);
  if (!record) return false;
  if (record.count >= MAX_ATTEMPTS) {
    if (Date.now() - record.firstAttempt < LOCKOUT_MS) return true;
    loginAttempts.delete(ip); // janela expirou, reseta
  }
  return false;
}

function registerFailedAttempt(ip) {
  const record = loginAttempts.get(ip) || { count: 0, firstAttempt: Date.now() };
  record.count++;
  record.firstAttempt = record.firstAttempt || Date.now();
  loginAttempts.set(ip, record);
}

function clearAttempts(ip) {
  loginAttempts.delete(ip);
}

async function login(req, res) {
  try {
    const { email, senha } = req.body;
    const identificador = email; // Manteve o nome 'email' no payload por compatibilidade
    const ip = req.ip || req.connection.remoteAddress;

    if (!identificador || !senha) return res.status(400).json({ error: 'email/identificador and senha are required' });

    // Bloqueio por força bruta
    if (isLockedOut(ip)) {
      return res.status(429).json({ error: 'Muitas tentativas falhas. Tente novamente em 15 minutos.' });
    }

    let user = null;

    if (identificador.includes('@')) {
      const [rows] = await pool.query('SELECT id, email, senha_hash FROM usuarios_auth WHERE email = ?', [identificador]);
      user = rows[0];
    } else {
      const [perfis] = await pool.query('SELECT auth_user_id FROM perfis_acesso WHERE username = ?', [identificador]);
      if (perfis.length > 0 && perfis[0].auth_user_id) {
        const [rows] = await pool.query('SELECT id, email, senha_hash FROM usuarios_auth WHERE id = ?', [perfis[0].auth_user_id]);
        user = rows[0];
      }
    }

    if (!user) {
      registerFailedAttempt(ip);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const match = await bcrypt.compare(senha, user.senha_hash);
    if (!match) {
      registerFailedAttempt(ip);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    clearAttempts(ip);

    const [perfisData] = await pool.query('SELECT auth_user_id, salao_id, cargo FROM perfis_acesso WHERE auth_user_id = ?', [user.id]);
    const perfil = perfisData[0] || {};

    const payload = {
      auth_user_id: user.id,
      salao_id: perfil.salao_id || null,
      cargo: perfil.cargo || null
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });

    // Adicionado email e user_id no retorno para facilitar a montagem da sessao no frontend
    return res.json({ 
      token, 
      cargo: payload.cargo, 
      salao_id: payload.salao_id,
      email: user.email,
      user_id: user.id
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal error' });
  }
}

async function verifyDashboardPassword(req, res) {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'password required' });

    // Pega salao_id do token JWT
    const salaoId = req.user && req.user.salao_id;
    if (!salaoId) return res.status(401).json({ error: 'Unauthorized' });

    // Busca o dashboard_pin das configurações do salão
    const [rows] = await pool.query(
      'SELECT dashboard_pin FROM configuracoes WHERE salao_id = ?',
      [salaoId]
    );
    const config = rows[0];
    if (!config || !config.dashboard_pin) {
      // Se não tem PIN configurado, nega acesso
      return res.json({ authorized: false });
    }

    // Comparação direta (PIN curto de conveniência, não senha crítica)
    const match = password === config.dashboard_pin;
    return res.json({ authorized: match });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal error' });
  }
}

async function verifyLoginPassword(req, res) {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'password required' });

    const authUserId = req.user && req.user.auth_user_id;
    if (!authUserId) return res.status(401).json({ error: 'Unauthorized' });

    const [rows] = await pool.query('SELECT senha_hash FROM usuarios_auth WHERE id = ?', [authUserId]);
    const user = rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });

    const match = await bcrypt.compare(password, user.senha_hash);
    return res.json({ authorized: !!match });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal error' });
  }
}

module.exports = { login, verifyDashboardPassword, verifyLoginPassword };
