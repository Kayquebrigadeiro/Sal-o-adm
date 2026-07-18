const express = require('express');
const router = express.Router();
const autenticar = require('../middlewares/auth');
const { obterFechamentoMensal, salvarFechamentoMensal } = require('../controllers/fechamento.controller');

router.use(autenticar);

router.get('/:mes', obterFechamentoMensal);
router.post('/:mes', salvarFechamentoMensal);

module.exports = router;
