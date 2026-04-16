// ============================================================================
//  financialConstants.js — Constantes extraídas da planilha VALORES
// ============================================================================
//  Fonte: "NOVA PLANILHA DE SALAO 20233 - Copia.xlsm", aba VALORES
//  Todas as constantes aqui são DEFAULTS que podem ser sobrescritas
//  pela configuração do salão no Supabase (tabela `configuracoes`).
// ============================================================================

/**
 * Multiplicadores de preço por comprimento de cabelo.
 * P = base (0% adicional), M = +20%, G = +30%.
 * Extraídos das células J4 e J5 da aba VALORES.
 */
export const MULTIPLICADOR_COMPRIMENTO = {
  P: 0,   // Base — sem acréscimo
  M: 20,  // +20% sobre o valor P
  G: 30,  // +30% sobre o valor P
};

/**
 * Percentual de comissão por categoria de procedimento.
 * Extraído da coluna AK:AM da aba VALORES e confirmado na aba DADOS col Q.
 * O percentual é sobre o VALOR COBRADO (faturamento bruto).
 */
export const PERCENTUAL_POR_CATEGORIA = {
  CABELO: 30,
  UNHAS: 45,
  SOMBRANCELHA: 50,
  'SOBRANCELHAS': 50,
  'EXTENSÃO DE CILIOS': 50,
  CILIOS: 50,
  'ADICIONAL': 50,
  BUSSO: 50,
  AXILA: 50,
  DEPILACAO: 50,
};

/**
 * Taxa padrão da maquininha de cartão (em %).
 * Configurável pela proprietária do salão.
 * Valor padrão: 5% (dividido por 0.95 na engenharia reversa).
 */
export const TAXA_MAQUININHA_PADRAO = 5;

/**
 * Custos fixos operacionais padrão (em R$).
 * Extraídos das células J8:J29 da aba VALORES.
 * O rateio é: soma(custos) / qtd_cabelos_mês.
 */
export const CUSTOS_FIXOS_PADRAO = {
  aluguel: 1750,
  energia: 190,
  agua: 120,
  internet: 150,
  produtos_limpeza: 55,
  alimentos_studio: 200,
  sistema_studio: 100,
  acessorios_fixo: 100,
  capsula_cafe: 150,
  salario_mirelly: 0, // Salário fixo de funcionário (varia por salão)
};

/**
 * Quantidade padrão de atendimentos/mês e dias úteis.
 * Extraído das células L9 e M9 da aba VALORES.
 */
export const QTD_CABELOS_MES_PADRAO = 100;
export const QTD_DIAS_UTEIS_PADRAO = 22;

/**
 * Produtos base do salão com custo por aplicação.
 * Extraído das linhas B11:F27 da aba VALORES.
 * Formato: { nome, precoTotal, qtdAplicacoes, custoPorAplicacao, ganhoLiquido }
 */
export const PRODUTOS_BASE_PADRAO = [
  { nome: 'PROGRESSIVA S/F', precoTotal: 135, qtdAplicacoes: 20, ganhoLiquido: 120 },
  { nome: 'BOTOX',           precoTotal: 190, qtdAplicacoes: 12, ganhoLiquido: 71 },
  { nome: 'FUSION',          precoTotal: 950, qtdAplicacoes: 120, ganhoLiquido: 80 },
  { nome: 'DETOX',           precoTotal: 600, qtdAplicacoes: 90, ganhoLiquido: 60 },
  { nome: 'PLASTICA DOS FIOS', precoTotal: 750, qtdAplicacoes: 90, ganhoLiquido: 90 },
  { nome: 'HIDRATAÇÃO',      precoTotal: 375, qtdAplicacoes: 80, ganhoLiquido: 50 },
  { nome: 'NUTRIÇÃO',        precoTotal: 375, qtdAplicacoes: 80, ganhoLiquido: 50 },
  { nome: 'RECONSTRUÇÃO',    precoTotal: 450, qtdAplicacoes: 70, ganhoLiquido: 75 },
  { nome: 'KIT LAVATORIO',   precoTotal: 280, qtdAplicacoes: 150, ganhoLiquido: 25 },
  { nome: 'RELAXAMENTO',     precoTotal: 0,   qtdAplicacoes: 20, ganhoLiquido: 0 },
  { nome: 'CORTE',           precoTotal: 200, qtdAplicacoes: 300, ganhoLiquido: 40 },
  { nome: 'UNHAS',           precoTotal: 4,   qtdAplicacoes: 1, ganhoLiquido: 20 },
  { nome: 'SOMBRANCELHA',    precoTotal: 2,   qtdAplicacoes: 1, ganhoLiquido: 20 },
  { nome: 'EXTENSÃO DE CILIOS', precoTotal: 50, qtdAplicacoes: 1, ganhoLiquido: 70 },
  { nome: 'BUSSO',           precoTotal: 3,   qtdAplicacoes: 1, ganhoLiquido: 22 },
  { nome: 'AXILA',           precoTotal: 3,   qtdAplicacoes: 1, ganhoLiquido: 22 },
  { nome: 'CILIOS',          precoTotal: 2,   qtdAplicacoes: 1, ganhoLiquido: 20 },
  { nome: 'DEPILAÇAO',       precoTotal: 8,   qtdAplicacoes: 1, ganhoLiquido: 65 },
  { nome: 'PROGRESSIVA C/F', precoTotal: 220, qtdAplicacoes: 15, ganhoLiquido: 80 },
];
