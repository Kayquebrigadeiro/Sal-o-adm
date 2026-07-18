const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const authMiddleware = require('../middlewares/auth');
const apenasVendedor = require('../middlewares/apenasVendedor');

router.get('/', authMiddleware, apenasVendedor, adminController.listarAdmins);
router.get('/logins-gerados', authMiddleware, apenasVendedor, adminController.listarLoginsGerados);
router.post('/criar-admin', authMiddleware, apenasVendedor, adminController.criarAdmin);
router.delete('/:user_id', authMiddleware, apenasVendedor, adminController.removerAdmin);

module.exports = router;
