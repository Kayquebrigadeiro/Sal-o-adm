/**
 * Testes da Financial Engine
 * Script simples para validar fórmulas sem dependências externas
 */

const {
  roundToDecimal,
  calcularValoresAtendimento,
  calcularPrecoPorComprimento,
  calcularEngenhariaReversa,
  calcularCustoFixoRateado,
  calcularCustoVariavelInsumos,
  calcularSaudeFinanceira
} = require('./src/services/financialEngine.service');

let passados = 0;
let falhados = 0;

function assert(condicao, mensagem) {
  if (condicao) {
    console.log(`✓ ${mensagem}`);
    passados++;
  } else {
    console.error(`✗ FALHOU: ${mensagem}`);
    falhados++;
  }
}

function assertEqual(valor1, valor2, mensagem) {
  assert(Math.abs(valor1 - valor2) < 0.01, `${mensagem} (esperado: ${valor2}, obtido: ${valor1})`);
}

console.log('\n=== TESTES FINANCIAL ENGINE ===\n');

// Teste 1: Arredondamento
console.log('Testes de arredondamento:');
assertEqual(roundToDecimal(10.125), 10.12, 'Arredondamento bancário 10.125');
assertEqual(roundToDecimal(10.135), 10.13, 'Arredondamento bancário 10.135');
assertEqual(roundToDecimal(10.145), 10.15, 'Arredondamento bancário 10.145');
assertEqual(roundToDecimal(10.155), 10.16, 'Arredondamento bancário 10.155');

// Teste 2: Cálculo de valores de atendimento
console.log('\nTestes de cálculo de valores de atendimento:');
const resultado1 = calcularValoresAtendimento({
  valorCobrado: 100,
  taxaMaquininhaPct: 2.5,
  custoFixoPorAtendimento: 10,
  cargoProfissional: 'FUNCIONARIO',
  porcComissao: 20,
  custoVariavel: 15
});

assertEqual(resultado1.valorMaquininha, 2.5, 'Maquininha: 100 * 2.5% = 2.50');
assertEqual(resultado1.custoFixo, 10, 'Custo fixo');
assertEqual(resultado1.valorProfissional, 20, 'Comissão: 100 * 20% = 20');
assertEqual(resultado1.custoVariavel, 15, 'Custo variável');
assertEqual(resultado1.lucroLiquido, 52.5, 'Lucro líquido: 100 - 2.5 - 10 - 15 - 20 = 52.5');
assertEqual(resultado1.lucroPossivel, 55, 'Lucro possível: 100 - 10 - 15 - 20 = 55 (sem maquininha)');

// Teste 3: Sem comissão (profissional não é funcionário)
console.log('\nTestes sem comissão:');
const resultado2 = calcularValoresAtendimento({
  valorCobrado: 100,
  taxaMaquininhaPct: 2.5,
  custoFixoPorAtendimento: 10,
  cargoProfissional: 'PROPRIETARIO',
  porcComissao: 20, // Ignorado porque não é FUNCIONARIO
  custoVariavel: 15
});

assertEqual(resultado2.valorProfissional, 0, 'Nenhuma comissão para não-funcionário');
assertEqual(resultado2.lucroLiquido, 72.5, 'Lucro sem comissão: 100 - 2.5 - 10 - 15 = 72.5');

// Teste 4: Comissão zero
console.log('\nTestes com comissão zero:');
const resultado3 = calcularValoresAtendimento({
  valorCobrado: 100,
  taxaMaquininhaPct: 0,
  custoFixoPorAtendimento: 0,
  cargoProfissional: 'FUNCIONARIO',
  porcComissao: 0,
  custoVariavel: 0
});

assertEqual(resultado3.valorProfissional, 0, 'Nenhuma comissão quando % = 0');
assertEqual(resultado3.lucroLiquido, 100, 'Lucro = valor cobrado');

// Teste 5: Cálculo de preço por comprimento
console.log('\nTestes de preço por comprimento:');
const precos1 = calcularPrecoPorComprimento({ precoP: 100 });
assertEqual(precos1.p, 100, 'Preço P = 100');
assertEqual(precos1.m, 120, 'Preço M = 100 * 1.20 = 120');
assertEqual(precos1.g, 130, 'Preço G = 100 * 1.30 = 130');

// Teste 6: Com preços definidos
console.log('\nTestes de preço com valores definidos:');
const precos2 = calcularPrecoPorComprimento({ precoP: 100, precoM: 115, precoG: 140 });
assertEqual(precos2.p, 100, 'Preço P');
assertEqual(precos2.m, 115, 'Preço M definido');
assertEqual(precos2.g, 140, 'Preço G definido');

// Teste 7: Engenharia reversa
console.log('\nTestes de engenharia reversa:');
const engRevers = calcularEngenhariaReversa({
  custoFixo: 10,
  custoMaterial: 15,
  ganhoDesejado: 50,
  taxaMaquininhaPct: 2.5
});

// BASE = 10 + 15 + 50 = 75
// Preço_P = 75 / (1 - 0.025) = 75 / 0.975 = 76.92
assertEqual(engRevers.precoP, roundToDecimal(75 / 0.975), 'Preço P reverso');
assertEqual(engRevers.precoM, roundToDecimal(engRevers.precoP * 1.20), 'Preço M reverso = P * 1.20');
assertEqual(engRevers.precoG, roundToDecimal(engRevers.precoP * 1.30), 'Preço G reverso = P * 1.30');

// Teste 8: Custo fixo rateado
console.log('\nTestes de custo fixo rateado:');
const custoRateado = calcularCustoFixoRateado(1000, 50);
assertEqual(custoRateado, 20, 'Custo fixo rateado: 1000 / 50 = 20');

const custoRateado2 = calcularCustoFixoRateado(1000, 30);
assertEqual(custoRateado2, roundToDecimal(1000 / 30), 'Custo fixo rateado: 1000 / 30 = 33.33');

// Teste 9: Custo variável por insumos
console.log('\nTestes de custo variável por insumos:');
const custoVar = calcularCustoVariavelInsumos([
  { precoCompra: 100, qtdAplicacoes: 10, qtdPorUso: 2 }, // 10 * 2 = 20
  { precoCompra: 50, qtdAplicacoes: 5, qtdPorUso: 3 }    // 30 * 3 = 90
]);
// (100/10)*2 + (50/5)*3 = 10*2 + 10*3 = 20 + 30 = 50
assertEqual(custoVar, 50, 'Custo variável insumos');

// Teste 10: Saúde financeira
console.log('\nTestes de saúde financeira:');
const saudeF = calcularSaudeFinanceira({
  lucroAtendimentosReal: 1000,
  lucroHomecare: 200,
  totalDespesas: 300,
  totalSalarios: 500
});
// 1000 + 200 - 300 - 500 = 400
assertEqual(saudeF, 400, 'Saúde financeira: 1000 + 200 - 300 - 500 = 400');

// Resumo
console.log(`\n=== RESUMO ===`);
console.log(`Testes passados: ${passados}`);
console.log(`Testes falhados: ${falhados}`);
console.log(`Total: ${passados + falhados}\n`);

if (falhados > 0) {
  process.exit(1);
} else {
  console.log('✓ TODOS OS TESTES PASSARAM!\n');
  process.exit(0);
}
