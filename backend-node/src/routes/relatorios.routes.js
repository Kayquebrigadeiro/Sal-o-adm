const express = require('express');
const router = express.Router();
const autenticar = require('../middlewares/auth');
const {
  obterRankingProcedimentos,
  obterRendimentoProfissional,
  obterAgendaDoDia,
  obterClientesResumo,
  obterGastosPessoaisResumo,
  obterCustoComposto,
  obterCustoCompostoSalao,
  obterAtendimentosCompleto,
  obterHomecareAnual
} = require('../controllers/relatorios.controller');

router.use(autenticar);

router.get('/ranking-procedimentos', obterRankingProcedimentos);
router.get('/rendimento-professional', obterRendimentoProfissional);
router.get('/agenda-do-dia', obterAgendaDoDia);
router.get('/clientes-resumo', obterClientesResumo);
router.get('/gastos-pessoais-resumo', obterGastosPessoaisResumo);
router.get('/custo-composto-salao', obterCustoCompostoSalao);
router.get('/custo-composto/:procedimento_id', obterCustoComposto);
router.get('/atendimentos-completo', obterAtendimentosCompleto);
router.get('/homecare-anual', obterHomecareAnual);

module.exports = router;
