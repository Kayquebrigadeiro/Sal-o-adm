require("dotenv").config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const Sentry = require('@sentry/node');
const authRoutes = require('./routes/auth.routes');
const salaoRoutes = require('./routes/salao.routes');
const adminRoutes = require('./routes/admin.routes');
const usuariosRoutes = require('./routes/usuarios.routes');
const atendimentosRoutes = require('./routes/atendimentos.routes');
const fechamentoRoutes = require('./routes/fechamento.routes');
const cadastrosRoutes = require('./routes/cadastros.routes');
const relatoriosRoutes = require('./routes/relatorios.routes');

const app = express();

// Sentry (opcional via SENTRY_DSN) — init feito em src/instrument.js (expressIntegration)
// O error handler do Sentry é registrado em `setupExpressErrorHandler` abaixo (antes do handler genérico).

// Rate limiting geral (configurável via env, default 300 req/15min por IP)
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 300,
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limit restrito para login (configurável via env, default 100 tentativas/15min por IP)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.LOGIN_RATE_LIMIT_MAX) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas tentativas de login. Tente novamente em 15 minutos.' },
});

app.use(generalLimiter);

// Headers de segurança (equivalente ao helmet, sem dependência extra)
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cache-Control', 'no-store');
  next();
});

// CORS configuration for production
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173').split(',').map(origin => origin.trim());
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin) || /\.vercel\.app$/.test(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());

// Rate limit restrito apenas na rota de login
app.use('/auth/login', loginLimiter);

app.use('/auth', authRoutes);
app.use('/salao', salaoRoutes);
app.use('/admin', adminRoutes);
app.use('/usuarios', usuariosRoutes);
app.use('/atendimentos', atendimentosRoutes);
app.use('/fechamento', fechamentoRoutes);
app.use('/cadastros', cadastrosRoutes);
app.use('/relatorios', relatoriosRoutes);

// health
app.get('/health', (req, res) => res.json({ ok: true }));

// Sentry error handler (deve vir antes do handler genérico)
if (process.env.SENTRY_DSN) {
  Sentry.setupExpressErrorHandler(app);
}

// generic error handler
app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status || 500;
  const message = status === 500 ? 'Internal server error' : (err.message || 'Internal server error');
  res.status(status).json({ error: message });
});

module.exports = app;
