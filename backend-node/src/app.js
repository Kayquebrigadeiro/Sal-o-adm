const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth.routes');
const salaoRoutes = require('./routes/salao.routes');
const adminRoutes = require('./routes/admin.routes');
const usuariosRoutes = require('./routes/usuarios.routes');
const atendimentosRoutes = require('./routes/atendimentos.routes');
const fechamentoRoutes = require('./routes/fechamento.routes');
const cadastrosRoutes = require('./routes/cadastros.routes');
const relatoriosRoutes = require('./routes/relatorios.routes');

const app = express();

// CORS configuration for production
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173').split(',').map(origin => origin.trim());
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());

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

// generic error handler
app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status || 500;
  const message = status === 500 ? 'Internal server error' : (err.message || 'Internal server error');
  res.status(status).json({ error: message });
});

module.exports = app;
