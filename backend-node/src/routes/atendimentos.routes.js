const express = require('express');
const router = express.Router();
const autenticar = require('../middlewares/auth');
const {
  criarAtendimento,
  atualizarAtendimento,
  listarAtendimentos,
  obterAtendimento,
  substituirProcedimentosAtendimento
} = require('../controllers/atendimentos.controller');

// Todas as rotas exigem autenticação
router.use(autenticar);

router.post('/', criarAtendimento);
router.put('/:id/procedimentos', substituirProcedimentosAtendimento);
router.put('/:id', atualizarAtendimento);
router.get('/', listarAtendimentos);
router.get('/:id', obterAtendimento);

module.exports = router;
