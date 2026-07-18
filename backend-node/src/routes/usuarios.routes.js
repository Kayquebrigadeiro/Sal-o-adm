const express = require('express');
const router = express.Router();
const usuariosController = require('../controllers/usuarios.controller');
const authMiddleware = require('../middlewares/auth');

router.post('/convidar', authMiddleware, usuariosController.convidar);

module.exports = router;
