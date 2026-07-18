const express = require('express');
const router = express.Router();
const autenticar = require('../middlewares/auth');
const { createCRUDController, createProcedimentoProdutosController } = require('../controllers/crud.controller');

// Criar controllers para cada tabela
const clientesController = createCRUDController('clientes');
const profissionaisController = createCRUDController('profissionais');
const procedimentosController = createCRUDController('procedimentos');
const produtosCatalogoController = createCRUDController('produtos_catalogo');
const custosFixosController = createCRUDController('custos_fixos_itens');
const configuracoesSalaoController = createCRUDController('configuracoes');
const despesasController = createCRUDController('despesas');
const homecareController = createCRUDController('homecare');
const procedimentosParaleloxController = createCRUDController('procedimentos_paralelos');
const gastosPessoaisController = createCRUDController('gastos_pessoais');
const procedimentoProdutosController = createProcedimentoProdutosController();

// Middleware de autenticação para todas
router.use(autenticar);

// ===== CLIENTES =====
router.get('/clientes', clientesController.listar);
router.get('/clientes/:id', clientesController.obterPorId);
router.post('/clientes', clientesController.criar);
router.put('/clientes/:id', clientesController.atualizar);
router.delete('/clientes/:id', clientesController.deletar);

// ===== PROFISSIONAIS =====
router.get('/profissionais', profissionaisController.listar);
router.get('/profissionais/:id', profissionaisController.obterPorId);
router.post('/profissionais', profissionaisController.criar);
router.put('/profissionais/:id', profissionaisController.atualizar);
router.delete('/profissionais/:id', profissionaisController.deletar);

// ===== PROCEDIMENTOS =====
router.get('/procedimentos', procedimentosController.listar);
router.get('/procedimentos/:id', procedimentosController.obterPorId);
router.post('/procedimentos', procedimentosController.criar);
router.put('/procedimentos/:id', procedimentosController.atualizar);
router.delete('/procedimentos/:id', procedimentosController.deletar);

// ===== PRODUTOS CATÁLOGO =====
router.get('/produtos', produtosCatalogoController.listar);
router.get('/produtos/:id', produtosCatalogoController.obterPorId);
router.post('/produtos', produtosCatalogoController.criar);
router.put('/produtos/:id', produtosCatalogoController.atualizar);
router.delete('/produtos/:id', produtosCatalogoController.deletar);

// ===== CUSTOS FIXOS =====
router.get('/custos-fixos', custosFixosController.listar);
router.get('/custos-fixos/:id', custosFixosController.obterPorId);
router.post('/custos-fixos', custosFixosController.criar);
router.put('/custos-fixos/:id', custosFixosController.atualizar);
router.delete('/custos-fixos/:id', custosFixosController.deletar);

// ===== CONFIGURAÇÕES DO SALÃO =====
router.get('/configuracoes', configuracoesSalaoController.listar);
router.get('/configuracoes/:id', configuracoesSalaoController.obterPorId);
router.post('/configuracoes', configuracoesSalaoController.criar);
router.put('/configuracoes/:id', configuracoesSalaoController.atualizar);
router.delete('/configuracoes/:id', configuracoesSalaoController.deletar);

// ===== DESPESAS =====
router.get('/despesas', despesasController.listar);
router.get('/despesas/:id', despesasController.obterPorId);
router.post('/despesas', despesasController.criar);
router.put('/despesas/:id', despesasController.atualizar);
router.delete('/despesas/:id', despesasController.deletar);

// ===== HOMECARE =====
router.get('/homecare', homecareController.listar);
router.get('/homecare/:id', homecareController.obterPorId);
router.post('/homecare', homecareController.criar);
router.put('/homecare/:id', homecareController.atualizar);
router.delete('/homecare/:id', homecareController.deletar);

// ===== PROCEDIMENTOS PARALELOS =====
router.get('/procedimentos-paralelos', procedimentosParaleloxController.listar);
router.get('/procedimentos-paralelos/:id', procedimentosParaleloxController.obterPorId);
router.post('/procedimentos-paralelos', procedimentosParaleloxController.criar);
router.put('/procedimentos-paralelos/:id', procedimentosParaleloxController.atualizar);
router.delete('/procedimentos-paralelos/:id', procedimentosParaleloxController.deletar);

// ===== GASTOS PESSOAIS =====
router.get('/gastos-pessoais', gastosPessoaisController.listar);
router.get('/gastos-pessoais/:id', gastosPessoaisController.obterPorId);
router.post('/gastos-pessoais', gastosPessoaisController.criar);
router.put('/gastos-pessoais/:id', gastosPessoaisController.atualizar);
router.delete('/gastos-pessoais/:id', gastosPessoaisController.deletar);

// ===== PROCEDIMENTO PRODUTOS =====
router.get('/procedimento_produtos', procedimentoProdutosController.listar);
router.get('/procedimento_produtos/:id', procedimentoProdutosController.obterPorId);
router.post('/procedimento_produtos', procedimentoProdutosController.criar);
router.put('/procedimento_produtos/:id', procedimentoProdutosController.atualizar);
router.delete('/procedimento_produtos/:id', procedimentoProdutosController.deletar);

module.exports = router;
