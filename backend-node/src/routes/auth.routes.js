const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middlewares/auth');

router.post('/login', authController.login);
router.post('/verify-dashboard-password', authMiddleware, authController.verifyDashboardPassword);
router.post('/verify-login-password', authMiddleware, authController.verifyLoginPassword);

module.exports = router;
