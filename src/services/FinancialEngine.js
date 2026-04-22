// ============================================================================
//  FinancialEngine.js — Motor de Precificação para SaaS de Salão
// ============================================================================
//  Replica fielmente a lógica da planilha "NOVA PLANILHA DE SALAO 20233"
//  Todas as operações internas usam CENTAVOS (inteiros) para evitar
//  erros de ponto flutuante. Formatação com 2 casas decimais no output.
// ============================================================================

import {
  MULTIPLICADOR_COMPRIMENTO,
  PERCENTUAL_POR_CATEGORIA,
  TAXA_MAQUININHA_PADRAO,
} from './financialConstants.js';

// ---------------------------------------------------------------------------
//  Helpers internos — precisão de centavos
// ---------------------------------------------------------------------------

/** Converte reais para centavos (inteiro). */
const toCents = (reais) => Math.round((Number(reais) || 0) * 100);

/** Converte centavos para reais (2 casas decimais). */
const toReais = (centavos) => Number((centavos / 100).toFixed(2));

/** Arredonda reais para 2 casas decimais sem conversão de centavos. */
const round2 = (value) => Number((Number(value) || 0).toFixed(2));

// ============================================================================
//  Classe Principal
// ============================================================================

export class FinancialEngine {

  /**
   * @param {Object} config - Configurações do salão
   * @param {number} config.custoFixoPorAtendimento - Custo fixo rateado por atendimento (R$)
   * @param {number} config.taxaMaquininhaPct - Taxa da maquininha em % (ex: 5 para 5%)
   * @param {Object} [config.multiplicadores] - Override dos multiplicadores P/M/G
   * @param {Object} [config.percentuaisPorCategoria] - Override dos percentuais por categoria
   */
  constructor(config = {}) {
    this.custoFixo = Number(config.custoFixoPorAtendimento) || 0;
    this.taxaMaq = Number(config.taxaMaquininhaPct) || TAXA_MAQUININHA_PADRAO;
    this.multiplicadores = config.multiplicadores || MULTIPLICADOR_COMPRIMENTO;
    this.percentuais = config.percentuaisPorCategoria || PERCENTUAL_POR_CATEGORIA;
  }

  // -------------------------------------------------------------------------
  //  1. CUSTO FIXO RATEADO (replica célula J30 da aba VALORES)
  // -------------------------------------------------------------------------

  /**
   * Calcula o custo fixo rateado por atendimento (cabelo).
   * Fórmula: soma(todos os custos fixos mensais) / qtdCabelosMes
   *
   * Na planilha:
   *   J30 = SUM(J11:J29) = 10.65
   *   Onde cada J(n) = valor do custo / L9 (qtd cabelos mês = 100)
   *
   * @param {Object[]} despesasFixas - Array de { descricao, valor }
   * @param {number} qtdAtendimentosMes - Total de atendimentos no mês
   * @returns {number} Custo fixo por atendimento em R$
   */
  static calcularCustoFixoRateado(despesasFixas, qtdAtendimentosMes) {
    if (!qtdAtendimentosMes || qtdAtendimentosMes <= 0) {
      return 0;
    }
    const somaFixos = despesasFixas.reduce(
      (acc, d) => acc + toCents(d.valor),
      0
    );
    return toReais(Math.round(somaFixos / qtdAtendimentosMes));
  }

  // -------------------------------------------------------------------------
  //  2. VALOR BASE / PREÇO SUGERIDO (replica célula C5 / H7 da planilha)
  // -------------------------------------------------------------------------

  /**
   * Calcula o preço sugerido (Valor Base) usando engenharia reversa.
   *
   * Lógica da planilha (célula C5 da aba VALORES):
   *   Para P ou CORTE:
   *     base = custoPorAplicacao + custoFixoRateado + ganhoLiquido
   *   Para M:
   *     base = baseP * (1 + multiplicadorM/100)
   *   Para G:
   *     base = baseP * (1 + multiplicadorG/100)
   *
   *   Resultado final: base / (1 - taxaMaquininha/100)
   *   Ou seja: base / 0.95 quando maquininha = 5%
   *
   * @param {Object} params
   * @param {number} params.custoPorAplicacao - Custo do material por aplicação (R$)
   * @param {number} params.custoFixoRateado  - Custo fixo rateado (R$). Se null, usa this.custoFixo
   * @param {number} params.ganhoLiquido      - Ganho líquido fixo do procedimento (R$)
   * @param {string} params.comprimento       - 'P', 'M' ou 'G'
   * @param {number} [params.taxaMaquininha]   - Override da taxa (em %). Se null, usa this.taxaMaq
   * @returns {{ valorBase: number, valorBaseComMaquininha: number }}
   */
  calcularValorBase({
    custoPorAplicacao,
    custoFixoRateado,
    ganhoLiquido,
    comprimento = 'P',
    taxaMaquininha,
  }) {
    const cFixo = toCents(custoFixoRateado != null ? custoFixoRateado : this.custoFixo);
    const cMat = toCents(custoPorAplicacao);
    const cGanho = toCents(ganhoLiquido);
    const tMaq = Number(taxaMaquininha != null ? taxaMaquininha : this.taxaMaq);

    // Base P = custo + fixo + ganho
    const baseP = cMat + cFixo + cGanho;

    // Aplicar multiplicador por comprimento
    const mult = Number(this.multiplicadores[comprimento] || 0);
    const baseComMult = Math.round(baseP * (1 + mult / 100));

    // Divisor da maquininha: base / (1 - taxa/100) = base / 0.95
    const divisor = 1 - tMaq / 100;
    if (divisor <= 0) {
      return {
        valorBase: toReais(baseComMult),
        valorBaseComMaquininha: Infinity,
        erro: 'TAXA_MAQUININHA_INVALIDA',
      };
    }

    const valorFinal = Math.round(baseComMult / divisor);

    return {
      valorBase: toReais(baseComMult),
      valorBaseComMaquininha: toReais(valorFinal),
    };
  }

  // -------------------------------------------------------------------------
  //  2B. CALCULADORA P/M/G — Fórmula da Planilha (bottom-up)
  // -------------------------------------------------------------------------

  /**
   * Calcula os preços P, M e G a partir do ganho líquido desejado.
   *
   * Fórmula (replica a planilha "NOVA PLANILHA DE SALAO"):
   *   BASE    = custoFixo + custoMaterial + ganhoLiquido
   *   PREÇO P = BASE ÷ (1 - taxaMaquininha / 100)
   *   PREÇO M = PREÇO P × 1.20
   *   PREÇO G = PREÇO P × 1.30
   *
   * A divisão por (1 - taxa) garante que após o desconto da maquininha,
   * o valor líquido restante seja exatamente o subtotal BASE.
   * Os multiplicadores M e G já incluem a taxa proporcionalmente.
   *
   * @param {Object} params
   * @param {number} params.custoFixo          - Custo fixo rateado por atendimento (R$)
   * @param {number} params.custoMaterial      - Custo do material por aplicação (R$)
   * @param {number} params.ganhoLiquido       - Ganho líquido desejado pela dona (R$)
   * @param {number} [params.taxaMaquininhaPct] - Taxa da maquininha em % (ex: 5). Se null, usa this.taxaMaq
   * @returns {{ base: number, precoP: number, precoM: number, precoG: number, erro?: string }}
   */
  calcularPrecoPMG({
    custoFixo,
    custoMaterial,
    ganhoLiquido,
    taxaMaquininhaPct,
  }) {
    const cFixo   = toCents(custoFixo != null ? custoFixo : this.custoFixo);
    const cMat    = toCents(custoMaterial);
    const cGanho  = toCents(ganhoLiquido);
    const tMaq    = Number(taxaMaquininhaPct != null ? taxaMaquininhaPct : this.taxaMaq);

    // BASE = custo fixo + custo material + ganho líquido desejado
    const base = cFixo + cMat + cGanho;

    // Divisor da maquininha: (1 - taxa/100) → ex: 0.95 para 5%
    const divisor = 1 - tMaq / 100;
    if (divisor <= 0) {
      return {
        base: toReais(base),
        precoP: Infinity,
        precoM: Infinity,
        precoG: Infinity,
        erro: 'TAXA_MAQUININHA_INVALIDA',
      };
    }

    // PREÇO P = BASE ÷ (1 - taxa) → garante que o líquido seja exatamente BASE
    const precoP = Math.round(base / divisor);

    // PREÇO M e G são derivados de P × multiplicador
    // A taxa da maquininha já está embutida em P, então escala automaticamente
    const precoM = Math.round(precoP * 1.20);
    const precoG = Math.round(precoP * 1.30);

    return {
      base: toReais(base),
      precoP: toReais(precoP),
      precoM: toReais(precoM),
      precoG: toReais(precoG),
    };
  }

  // -------------------------------------------------------------------------
  //  3. PREÇO SUGERIDO GENÉRICO (Fórmula de Engenharia Reversa do prompt)
  // -------------------------------------------------------------------------

  /**
   * Calcula o preço sugerido para atingir uma margem alvo desejada.
   *
   * Fórmula: R_sug = TC / (1 - T_maq - T_com - T_tax - M_target)
   *
   * @param {Object} params
   * @param {number} params.custoTotal   - TC = custoFixo + custoMaterial (R$)
   * @param {number} params.taxaMaq      - Taxa da maquininha (decimal, ex: 0.05)
   * @param {number} params.taxaCom      - Taxa de comissão do profissional (decimal, ex: 0.40)
   * @param {number} params.taxaImposto  - Imposto (decimal, ex: 0). Default 0.
   * @param {number} params.margemAlvo   - Margem desejada (decimal, ex: 0.20)
   * @returns {{ precoSugerido: number, erro?: string }}
   */
  static calcularPrecoSugerido({
    custoTotal,
    taxaMaq = 0.05,
    taxaCom = 0,
    taxaImposto = 0,
    margemAlvo = 0.20,
  }) {
    const somaTaxas = taxaMaq + taxaCom + taxaImposto + margemAlvo;

    if (somaTaxas >= 1) {
      return {
        precoSugerido: Infinity,
        erro: 'MARGEM_IMPOSSIVEL',
        mensagem: `Custo percentual total (${round2(somaTaxas * 100)}%) é ≥ 100%. ` +
          'Reduza a comissão, a taxa ou a margem alvo.',
      };
    }

    const tc = toCents(custoTotal);
    const divisor = 1 - somaTaxas;
    const preco = Math.round(tc / divisor);

    return {
      precoSugerido: toReais(preco),
    };
  }

  // -------------------------------------------------------------------------
  //  4. LUCRO LÍQUIDO REAL DE UM ATENDIMENTO (replica aba DADOS col W)
  // -------------------------------------------------------------------------

  /**
   * Calcula o desmembramento financeiro completo de um atendimento.
   *
   * Lógica da planilha (aba DADOS):
   *   SE cargo = PROPRIETÁRIO:
   *     lucro = valor - maquininha - custoFixo - custoProduto
   *   SE cargo = FUNCIONÁRIO:
   *     lucro = valor - maquininha - comissão - custoFixo - custoProduto
   *
   * A comissão NÃO incide sobre a proprietária (ela trabalha pra si).
   *
   * @param {Object} params
   * @param {number}  params.valorCobrado         - R (Faturamento Bruto) em R$
   * @param {string}  params.categoriaProcedimento - 'CABELO', 'UNHAS', 'SOMBRANCELHA', etc.
   * @param {number}  [params.percentualComissao]  - Override do percentual de comissão
   * @param {number}  params.custoProduto          - Custo variável do material (R$)
   * @param {number}  [params.custoFixoRateado]    - Override do custo fixo (R$)
   * @param {number}  [params.taxaMaquininha]       - Override da taxa maquininha (%)
   * @param {string}  params.cargoProfissional     - 'PROPRIETARIO' ou 'FUNCIONARIO'
   * @returns {Object} Desmembramento financeiro completo
   */
  calcularAtendimento({
    valorCobrado,
    categoriaProcedimento,
    percentualComissao,
    custoProduto = 0,
    custoFixoRateado,
    taxaMaquininha,
    cargoProfissional = 'FUNCIONARIO',
  }) {
    const vCobrado = toCents(valorCobrado);
    const tMaq = Number(taxaMaquininha != null ? taxaMaquininha : this.taxaMaq);
    const cFixo = toCents(custoFixoRateado != null ? custoFixoRateado : this.custoFixo);
    const cProd = toCents(custoProduto);

    // Percentual de comissão — usa override ou busca pela categoria
    const pctComissao = Number(
      percentualComissao != null
        ? percentualComissao
        : (this.percentuais[categoriaProcedimento] || 0)
    );

    // Valores absolutos em centavos
    const valorMaquininha = Math.round(vCobrado * tMaq / 100);
    const valorComissao = Math.round(vCobrado * pctComissao / 100);

    // --- Cálculo de lucro ---
    const ehProprietario = (cargoProfissional || '').toUpperCase() === 'PROPRIETARIO';

    let lucroLiquido;
    let lucroPossivel;

    if (ehProprietario) {
      // Proprietária: não desconta comissão de si mesma
      lucroLiquido = vCobrado - valorMaquininha - cFixo - cProd;
      lucroPossivel = vCobrado - cFixo - cProd; // Sem maquininha = cenário ideal
    } else {
      // Funcionário: desconta comissão
      lucroLiquido = vCobrado - valorMaquininha - valorComissao - cFixo - cProd;
      lucroPossivel = vCobrado - valorComissao - cFixo - cProd;
    }

    // Rendimento do profissional (o que ele ganha)
    const rendimentoProfissional = ehProprietario
      ? vCobrado - valorMaquininha // Proprietária fica com tudo menos a maquininha
      : valorComissao;             // Funcionário ganha a comissão

    // Margem real
    const margemReal = vCobrado > 0
      ? round2((lucroLiquido / vCobrado) * 100)
      : 0;

    const margemPossivel = vCobrado > 0
      ? round2((lucroPossivel / vCobrado) * 100)
      : 0;

    return {
      // Inputs
      valorBruto: toReais(vCobrado),
      cargoProfissional: ehProprietario ? 'PROPRIETARIO' : 'FUNCIONARIO',

      // Deduções (centavo por centavo)
      valorMaquininha: toReais(valorMaquininha),
      valorComissao: ehProprietario ? 0 : toReais(valorComissao),
      custoFixo: toReais(cFixo),
      custoProduto: toReais(cProd),

      // Percentuais aplicados
      taxaMaquininhaPct: tMaq,
      percentualComissao: ehProprietario ? 0 : pctComissao,

      // Resultados
      rendimentoProfissional: toReais(rendimentoProfissional),
      lucroLiquido: toReais(lucroLiquido),
      lucroPossivel: toReais(lucroPossivel),
      margemReal,
      margemPossivel,

      // Alertas
      prejuizo: lucroLiquido < 0,
    };
  }

  // -------------------------------------------------------------------------
  //  5. HOMECARE — Venda de produtos (replica aba HOME CAR)
  // -------------------------------------------------------------------------

  /**
   * Calcula o lucro de uma venda de produto HomeCare.
   *
   * Fórmula da planilha:
   *   Lucro = valorVenda - custoProduto
   *   Pendência = valorVenda - valorPago
   *
   * SEM comissão, SEM custo fixo, SEM maquininha.
   *
   * @param {Object} params
   * @param {number} params.valorVenda   - Preço de venda ao cliente (R$)
   * @param {number} params.custoProduto  - Custo de aquisição do produto (R$)
   * @param {number} [params.valorPago]   - Quanto o cliente já pagou (R$)
   * @returns {Object} Resultado financeiro da venda
   */
  static calcularHomeCare({ valorVenda, custoProduto, valorPago = 0 }) {
    const vVenda = toCents(valorVenda);
    const vCusto = toCents(custoProduto);
    const vPago = toCents(valorPago);

    const lucro = vVenda - vCusto;
    const pendencia = vVenda - vPago;
    const margemLucro = vVenda > 0 ? round2((lucro / vVenda) * 100) : 0;

    return {
      valorVenda: toReais(vVenda),
      custoProduto: toReais(vCusto),
      valorPago: toReais(vPago),
      lucro: toReais(lucro),
      pendencia: toReais(pendencia),
      margemLucro,
      quitado: pendencia <= 0,
    };
  }

  // -------------------------------------------------------------------------
  //  6. PROCEDIMENTOS PARALELOS (replica aba PROCED PARALELO)
  // -------------------------------------------------------------------------

  /**
   * Calcula a pendência de um procedimento paralelo (serviço terceirizado).
   *
   * Fórmula da planilha:
   *   Pendência = valor - valorPago
   *
   * @param {Object} params
   * @param {number} params.valor     - Valor total do serviço (R$)
   * @param {number} params.valorPago - Quanto já foi pago (R$)
   * @returns {Object}
   */
  static calcularParalelo({ valor, valorPago = 0 }) {
    const v = toCents(valor);
    const vp = toCents(valorPago);
    const pendencia = v - vp;

    return {
      valor: toReais(v),
      valorPago: toReais(vp),
      pendencia: toReais(pendencia),
      quitado: pendencia <= 0,
    };
  }

  // -------------------------------------------------------------------------
  //  7. RESUMO MENSAL (replica aba GRAFICOS-FECHAMENTO)
  // -------------------------------------------------------------------------

  /**
   * Consolida os resultados financeiros de um período.
   *
   * @param {Object[]} atendimentos - Array de resultados de calcularAtendimento()
   * @param {Object[]} [homecare]   - Array de resultados de calcularHomeCare()
   * @param {Object[]} [paralelos]  - Array de resultados de calcularParalelo()
   * @returns {Object} Resumo financeiro consolidado
   */
  static calcularResumoMensal(atendimentos = [], homecare = [], paralelos = []) {
    let faturamentoBruto = 0;
    let lucroTotal = 0;
    let lucroPossivelTotal = 0;
    let totalMaquininha = 0;
    let totalComissao = 0;
    let totalCustoFixo = 0;
    let totalCustoProduto = 0;
    let totalPendente = 0;
    const porProcedimento = {};
    const porProfissional = {};

    for (const a of atendimentos) {
      const vb = toCents(a.valorBruto);
      faturamentoBruto += vb;
      lucroTotal += toCents(a.lucroLiquido);
      lucroPossivelTotal += toCents(a.lucroPossivel);
      totalMaquininha += toCents(a.valorMaquininha);
      totalComissao += toCents(a.valorComissao);
      totalCustoFixo += toCents(a.custoFixo);
      totalCustoProduto += toCents(a.custoProduto);

      // Agrupamento por procedimento (se disponível)
      if (a._procedimento) {
        if (!porProcedimento[a._procedimento]) {
          porProcedimento[a._procedimento] = { qtd: 0, faturamento: 0, lucro: 0 };
        }
        porProcedimento[a._procedimento].qtd++;
        porProcedimento[a._procedimento].faturamento += vb;
        porProcedimento[a._procedimento].lucro += toCents(a.lucroLiquido);
      }

      // Agrupamento por profissional (se disponível)
      if (a._profissional) {
        if (!porProfissional[a._profissional]) {
          porProfissional[a._profissional] = { qtd: 0, rendimento: 0, faturamento: 0 };
        }
        porProfissional[a._profissional].qtd++;
        porProfissional[a._profissional].rendimento += toCents(a.rendimentoProfissional);
        porProfissional[a._profissional].faturamento += vb;
      }
    }

    // HomeCare
    let lucroHomeCare = 0;
    let pendenciaHomeCare = 0;
    for (const h of homecare) {
      lucroHomeCare += toCents(h.lucro);
      pendenciaHomeCare += toCents(h.pendencia);
    }

    // Paralelos
    let totalParalelos = 0;
    let pendenciaParalelos = 0;
    for (const p of paralelos) {
      totalParalelos += toCents(p.valor);
      pendenciaParalelos += toCents(p.pendencia);
    }

    const qtdAtendimentos = atendimentos.length;
    const ticketMedio = qtdAtendimentos > 0
      ? Math.round(faturamentoBruto / qtdAtendimentos)
      : 0;

    // Converter agrupamentos para reais
    const procFormatado = {};
    for (const [k, v] of Object.entries(porProcedimento)) {
      procFormatado[k] = {
        quantidade: v.qtd,
        faturamento: toReais(v.faturamento),
        lucro: toReais(v.lucro),
        ticketMedio: v.qtd > 0 ? toReais(Math.round(v.faturamento / v.qtd)) : 0,
      };
    }

    const profFormatado = {};
    for (const [k, v] of Object.entries(porProfissional)) {
      profFormatado[k] = {
        atendimentos: v.qtd,
        rendimentoBruto: toReais(v.rendimento),
        faturamentoGerado: toReais(v.faturamento),
      };
    }

    return {
      // Totais
      totalAtendimentos: qtdAtendimentos,
      faturamentoBruto: toReais(faturamentoBruto),
      lucroLiquido: toReais(lucroTotal),
      lucroPossivel: toReais(lucroPossivelTotal),
      ticketMedio: toReais(ticketMedio),

      // Deduções totais
      totalMaquininha: toReais(totalMaquininha),
      totalComissao: toReais(totalComissao),
      totalCustoFixo: toReais(totalCustoFixo),
      totalCustoProduto: toReais(totalCustoProduto),

      // Margem global
      margemMedia: faturamentoBruto > 0
        ? round2((lucroTotal / faturamentoBruto) * 100)
        : 0,

      // HomeCare
      lucroHomeCare: toReais(lucroHomeCare),
      pendenciaHomeCare: toReais(pendenciaHomeCare),
      totalVendasHomeCare: homecare.length,

      // Paralelos
      totalParalelos: toReais(totalParalelos),
      pendenciaParalelos: toReais(pendenciaParalelos),

      // Agrupamentos
      porProcedimento: procFormatado,
      porProfissional: profFormatado,
    };
  }
}

export default FinancialEngine;
