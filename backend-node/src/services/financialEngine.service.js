/**
 * Financial Engine Service
 * Funções puras de cálculo financeiro - migradas de triggers PostgreSQL
 * Usa arredondamento bancário para evitar erros de ponto flutuante
 */

// Função helper para arredondar com precisão (2 casas decimais)
// Replica o comportamento do ROUND(x, 2) do PostgreSQL
const roundToDecimal = (value) => {
  if (typeof value !== 'number' || isNaN(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
};

/**
 * Calcula os valores financeiros de um atendimento/procedimento
 * @param {Object} params
 * @param {number} params.valorCobrado - Preço cobrado do cliente
 * @param {number} params.taxaMaquininhaPct - Taxa de processamento (%) ex: 2.5
 * @param {number} params.custoFixoPorAtendimento - Custo fixo configurado
 * @param {string} params.cargoProfissional - 'FUNCIONARIO' ou outro
 * @param {number} params.porcComissao - Porcentagem de comissão (0-100)
 * @param {number} params.custoVariavel - Custo de insumos/material
 * @returns {Object} { valorMaquininha, custoFixo, valorProfissional, custoVariavel, lucroLiquido, lucroPossivel }
 */
function calcularValoresAtendimento({
  valorCobrado,
  taxaMaquininhaPct = 0,
  custoFixoPorAtendimento = 0,
  cargoProfissional = '',
  porcComissao = 0,
  custoVariavel = 0
}) {
  const valorMaquininha = roundToDecimal(valorCobrado * (taxaMaquininhaPct / 100));
  const custoFixo = roundToDecimal(custoFixoPorAtendimento);
  
  // Comissão só é calculada se profissional é FUNCIONARIO e tem % de comissão
  let valorProfissional = 0;
  if (cargoProfissional === 'FUNCIONARIO' && porcComissao > 0) {
    valorProfissional = roundToDecimal(valorCobrado * (porcComissao / 100));
  }
  
  const custoVar = roundToDecimal(custoVariavel);
  
  // Lucro líquido = valor cobrado - maquininha - custo fixo - custo variável - comissão
  const lucroLiquido = roundToDecimal(
    valorCobrado - valorMaquininha - custoFixo - custoVar - valorProfissional
  );
  
  // Lucro possível = valor cobrado - custo fixo - custo variável - comissão
  // (NÃO desconta maquininha - intencional)
  const lucroPossivel = roundToDecimal(
    valorCobrado - custoFixo - custoVar - valorProfissional
  );
  
  return {
    valorMaquininha,
    custoFixo,
    valorProfissional,
    custoVariavel: custoVar,
    lucroLiquido,
    lucroPossivel
  };
}

/**
 * Calcula os preços por comprimento (P/M/G) com fallback automático
 * @param {Object} params
 * @param {number} params.precoP - Preço base (obrigatório)
 * @param {number} params.precoM - Preço médio (opcional, calcula 20% acima se não definido)
 * @param {number} params.precoG - Preço grande (opcional, calcula 30% acima se não definido)
 * @returns {Object} { p, m, g }
 */
function calcularPrecoPorComprimento({ precoP, precoM = null, precoG = null }) {
  const p = roundToDecimal(precoP || 0);
  
  const m = precoM !== null && precoM !== undefined
    ? roundToDecimal(precoM)
    : roundToDecimal(p * 1.20);
  
  const g = precoG !== null && precoG !== undefined
    ? roundToDecimal(precoG)
    : roundToDecimal(p * 1.30);
  
  return { p, m, g };
}

/**
 * Engenharia reversa: calcula preço sugerido a partir do ganho líquido desejado
 * @param {Object} params
 * @param {number} params.custoFixo - Custo fixo por atendimento
 * @param {number} params.custoMaterial - Custo do material/insumos
 * @param {number} params.ganhoDesejado - Ganho líquido que deseja obter
 * @param {number} params.taxaMaquininhaPct - Taxa de processamento (%)
 * @returns {Object} { precoP, precoM, precoG }
 */
function calcularEngenhariaReversa({
  custoFixo = 0,
  custoMaterial = 0,
  ganhoDesejado = 0,
  taxaMaquininhaPct = 0
}) {
  const base = roundToDecimal(custoFixo + custoMaterial + ganhoDesejado);
  const divisor = 1 - (taxaMaquininhaPct / 100);
  
  const precoP = divisor > 0
    ? roundToDecimal(base / divisor)
    : base;
  
  const precoM = roundToDecimal(precoP * 1.20);
  const precoG = roundToDecimal(precoP * 1.30);
  
  return { precoP, precoM, precoG };
}

/**
 * Calcula o custo fixo rateado por atendimento
 * @param {number} somaCustosFixos - Soma de todos os custos fixos mensais
 * @param {number} qtdAtendimentosMes - Quantidade estimada de atendimentos/mês
 * @returns {number} Custo fixo rateado
 */
function calcularCustoFixoRateado(somaCustosFixos, qtdAtendimentosMes) {
  if (qtdAtendimentosMes <= 0) return 0;
  return roundToDecimal(somaCustosFixos / qtdAtendimentosMes);
}

/**
 * Calcula o custo variável por insumos de um procedimento
 * @param {Array} produtos - Array de { precoCompra, qtdAplicacoes, qtdPorUso }
 * @returns {number} Custo variável total
 */
function calcularCustoVariavelInsumos(produtos = []) {
  if (!Array.isArray(produtos) || produtos.length === 0) return 0;
  
  let total = 0;
  produtos.forEach(produto => {
    const custoPorUso = roundToDecimal(
      (produto.precoCompra || 0) / (produto.qtdAplicacoes || 1)
    );
    total = roundToDecimal(total + custoPorUso * (produto.qtdPorUso || 0));
  });
  
  return total;
}

/**
 * Calcula as métricas de fechamento mensal
 * Funções auxiliares que serão usadas pelos queries agregados do MySQL
 */

/**
 * Calcula saúde financeira baseada em lucros e despesas
 * @param {Object} params
 * @param {number} params.lucroAtendimentosReal - Lucro real dos atendimentos executados
 * @param {number} params.lucroHomecare - Lucro de homecare
 * @param {number} params.totalDespesas - Total de despesas
 * @param {number} params.totalSalarios - Total de salários fixos
 * @returns {number} Saúde financeira
 */
function calcularSaudeFinanceira({
  lucroAtendimentosReal = 0,
  lucroHomecare = 0,
  totalDespesas = 0,
  totalSalarios = 0
}) {
  return roundToDecimal(
    lucroAtendimentosReal + lucroHomecare - totalDespesas - totalSalarios
  );
}

module.exports = {
  roundToDecimal,
  calcularValoresAtendimento,
  calcularPrecoPorComprimento,
  calcularEngenhariaReversa,
  calcularCustoFixoRateado,
  calcularCustoVariavelInsumos,
  calcularSaudeFinanceira
};
