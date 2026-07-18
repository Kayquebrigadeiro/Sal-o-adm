const express = require('express');
const router = express.Router();
const salaoController = require('../controllers/salao.controller');
const authMiddleware = require('../middlewares/auth');
const apenasVendedor = require('../middlewares/apenasVendedor');

router.get('/', authMiddleware, apenasVendedor, salaoController.listarSaloes);
router.post('/criar-proprietaria', authMiddleware, apenasVendedor, salaoController.criarProprietaria);
router.delete('/:salao_id', authMiddleware, apenasVendedor, salaoController.deletarSalao);
router.put('/:id', authMiddleware, salaoController.atualizarSalao);
router.patch('/:id/configurar', authMiddleware, salaoController.configurarSalao);
router.get('/:id', authMiddleware, salaoController.obterSalao);

module.exports = router;
