/**
 * FASE 5 — VALIDAÇÃO DE INTEGRIDADE PÓS-CARGA
 * Verifica a integridade dos dados financeiros após o teste de carga.
 * Recalcula manualmente os valores e compara com o banco.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('../src/config/db');

const seedPath = path.join(__dirname, 'salons_seed.json');
const salons = JSON.parse(fs.readFileSync(seedPath, 'utf8'));

// Função de arredondamento igual ao motor financeiro
const roundToDecimal = (value) => {
  if (typeof value !== 'number' || isNaN(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
};

async function main() {
  console.log('============================================');
  console.log('  FASE 5 — VALIDACAO DE INTEGRIDADE POS-CARGA');
  console.log('============================================\n');

  // Selecionar 5 salões aleatórios do seed
  const shuffled = [...salons].sort(() => Math.random() - 0.5).slice(0, 5);
  console.log('Saloes selecionados: ' + shuffled.map(s => s.email).join(', ') + '\n');

  let totalAtendimentos = 0;
  let inconsistentes = 0;
  let pendenteNegativo = 0;
  let statusInconsistente = 0;
  const erros = [];

  for (const salao of shuffled) {
    console.log('--- Salao: ' + salao.email + ' (' + salao.salao_id + ') ---');

    // Buscar todos os atendimentos do salão
    const [atendimentos] = await pool.query(
      'SELECT * FROM atendimentos WHERE salao_id = ?',
      [salao.salao_id]
    );

    console.log('  Atendimentos encontrados: ' + atendimentos.length);
    totalAtendimentos += atendimentos.length;

    for (const atd of atendimentos) {
      const valorCobrado = parseFloat(atd.valor_cobrado);
      const valorPago = parseFloat(atd.valor_pago);
      const valorPendente = parseFloat(atd.valor_pendente);
      const valorMaquininha = parseFloat(atd.valor_maquininha);
      const valorProfissional = parseFloat(atd.valor_profissional);
      const custoFixo = parseFloat(atd.custo_fixo);
      const custoVariavel = parseFloat(atd.custo_variavel);
      const lucroLiquido = parseFloat(atd.lucro_liquido);
      const lucroPossivel = parseFloat(atd.lucro_possivel);

      // ===== CONSISTENCIA INTERNA (usa valores armazenados no proprio registro) =====
      // 1. lucro_liquido deve ser: valor_cobrado - valor_maquininha - custo_fixo - custo_variavel - valor_profissional
      const esperadoLucroLiquido = roundToDecimal(valorCobrado - valorMaquininha - custoFixo - custoVariavel - valorProfissional);
      const diffLucro = Math.abs(lucroLiquido - esperadoLucroLiquido);
      if (diffLucro > 0.01) {
        inconsistentes++;
        erros.push({
          salao: salao.email,
          atendimento: atd.id,
          tipo: 'lucro_liquido_inconsistente',
          valor_cobrado: valorCobrado,
          valor_maquininha: valorMaquininha,
          custo_fixo: custoFixo,
          custo_variavel: custoVariavel,
          valor_profissional: valorProfissional,
          esperado: esperadoLucroLiquido,
          recebido: lucroLiquido,
          diff: diffLucro
        });
      }

      // 2. lucro_possivel deve ser: valor_cobrado - custo_fixo - custo_variavel - valor_profissional
      const esperadoLucroPossivel = roundToDecimal(valorCobrado - custoFixo - custoVariavel - valorProfissional);
      const diffLucroPossivel = Math.abs(lucroPossivel - esperadoLucroPossivel);
      if (diffLucroPossivel > 0.01) {
        inconsistentes++;
        erros.push({
          salao: salao.email,
          atendimento: atd.id,
          tipo: 'lucro_possivel_inconsistente',
          esperado: esperadoLucroPossivel,
          recebido: lucroPossivel,
          diff: diffLucroPossivel
        });
      }

      // 3. valor_pendente deve ser: valor_cobrado - valor_pago
      const esperadoPendente = roundToDecimal(valorCobrado - valorPago);
      const diffPendente = Math.abs(valorPendente - esperadoPendente);
      if (diffPendente > 0.01) {
        inconsistentes++;
        erros.push({
          salao: salao.email,
          atendimento: atd.id,
          tipo: 'valor_pendente_inconsistente',
          esperado: esperadoPendente,
          recebido: valorPendente,
          diff: diffPendente
        });
      }

      // 4. valor_pendente negativo (bug de pagamento)
      if (valorPendente < 0) {
        pendenteNegativo++;
        erros.push({
          salao: salao.email,
          atendimento: atd.id,
          tipo: 'valor_pendente_negativo',
          valor_pendente: valorPendente
        });
      }

      // 5. status EXECUTADO com pagamento parcial (valor_pago > 0 e valor_pendente != 0)
      if (atd.status === 'EXECUTADO' && valorPago > 0 && Math.abs(valorPendente) > 0.01) {
        statusInconsistente++;
        erros.push({
          salao: salao.email,
          atendimento: atd.id,
          tipo: 'status_executado_pagamento_parcial',
          valor_pago: valorPago,
          valor_pendente: valorPendente
        });
      }
    }
  }

  // Resumo
  console.log('\n============================================');
  console.log('  RESUMO DA VALIDACAO DE INTEGRIDADE');
  console.log('============================================');
  console.log('  Total de atendimentos verificados: ' + totalAtendimentos);
  console.log('  Atendimentos com lucro_liquido inconsistente: ' + inconsistentes);
  console.log('  Atendimentos com valor_pendente negativo: ' + pendenteNegativo);
  console.log('  Atendimentos com status EXECUTADO + pagamento parcial: ' + statusInconsistente);
  console.log('  Percentual de inconsistencias: ' + (totalAtendimentos > 0 ? ((inconsistentes / totalAtendimentos) * 100).toFixed(2) : 0) + '%');
  console.log('============================================\n');

  if (erros.length > 0) {
    console.log('DETALHES DAS INCONSISTENCIAS:');
    erros.slice(0, 20).forEach(e => {
      console.log('  - [' + e.salao + '] ' + e.tipo + ': esperado=' + e.esperado + ', recebido=' + e.recebido + ', diff=' + e.diff);
    });
    if (erros.length > 20) console.log('  ... e mais ' + (erros.length - 20) + ' erros');
  }

  // Salvar relatório
  const reportPath = path.join(__dirname, 'validacao_integridade.json');
  fs.writeFileSync(reportPath, JSON.stringify({
    totalAtendimentos,
    inconsistentes,
    pendenteNegativo,
    statusInconsistente,
    erros
  }, null, 2));
  console.log('\nRelatorio salvo em: ' + reportPath);

  await pool.end();
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});