/**
 * FASE 3 — SIMULAÇÃO DE DIA REAL
 * Simula um dia completo de operação para 1 salão.
 * Usa o salão 3 do seed (índice 2) para isolamento dos testes da Fase 2.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3334';
const seedPath = path.join(__dirname, 'salons_seed.json');
const salons = JSON.parse(fs.readFileSync(seedPath, 'utf8'));

const SIM_DATE = '2025-02-15'; // Data da simulação
const SIM_MES = '2025-02';     // Mês da simulação

let log = [];
let summary = {
  atendimentosCriados: 0,
  atendimentosExecutados: 0,
  atendimentosCancelados: 0,
  atendimentosPagos: 0,
  receitaBruta: 0,
  lucroLiquido: 0,
  pendenciasAbertas: 0,
};

function logAction(timestamp, route, method, status, responseTime, expected, actual = '') {
  const entry = { timestamp, route, method, status, responseTime, expected, actual };
  log.push(entry);
  const ok = status >= 200 && status < 300;
  console.log(`[${timestamp}] ${method} ${route} → ${status} (${responseTime}ms) ${ok ? '✅' : '❌'} ${actual ? ' | ' + actual : ''}`);
}

async function api(method, route, body = null, token = null) {
  const t0 = Date.now();
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(15000),
  };
  if (token) opts.headers['Authorization'] = `Bearer ${token}`;
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE_URL}${route}`, opts);
  const responseTime = Date.now() - t0;
  let data;
  try { data = await res.json(); } catch { data = null; }
  return { status: res.status, ok: res.ok, data, responseTime };
}

function ts() {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

async function main() {
  console.log('═══════════════════════════════════════════');
  console.log('  FASE 3 — SIMULAÇÃO DE DIA REAL');
  console.log('═══════════════════════════════════════════\n');

  // Usar salão 3 (índice 2)
  const salao = salons[2];
  if (!salao) {
    console.error('❌ Salão 3 não encontrado no seed');
    process.exit(1);
  }

  console.log(`Salão: ${salao.email} (salao_id: ${salao.salao_id})`);
  console.log(`Data da simulação: ${SIM_DATE}\n`);

  // Login como proprietária
  const loginRes = await api('POST', '/auth/login', { email: salao.email, senha: salao.senha });
  if (!loginRes.ok || !loginRes.data.token) {
    console.error('❌ Falha no login:', loginRes.data);
    process.exit(1);
  }
  const token = loginRes.data.token;
  console.log('✅ Proprietária logada\n');

  const profs = salao.profissionais;
  const procs = salao.procedimentos;
  const procCor = procs.find(p => p.nome === 'Coloração'); // R$80, custo R$28
  const procCorte = procs.find(p => p.nome === 'Corte');   // R$60, custo R$5
  const procHidrat = procs.find(p => p.nome === 'Hidratação'); // R$120, custo R$30

  // ===== 08:00 — 3 agendamentos criados (manhã) =====
  console.log('─── 08:00 — 3 agendamentos criados ───');
  const atendimentos = [];
  for (let i = 0; i < 3; i++) {
    const res = await api('POST', '/atendimentos', {
      cliente: `Cliente Manhã ${i+1}`,
      profissional_id: profs[i % profs.length].id,
      data: SIM_DATE,
      horario: `${8 + i}:00:00`,
      procedimento_id: procCor.id,
      comprimento: 'P',
      valor_cobrado: 80,
      valor_pago: 0,
      status: 'AGENDADO'
    }, token);
    logAction(ts(), '/atendimentos', 'POST', res.status, res.responseTime, '201', res.data?.id ? `id=${res.data.id}` : res.data?.error);
    if (res.ok && res.data.id) {
      atendimentos.push(res.data);
      summary.atendimentosCriados++;
      summary.receitaBruta += 80;
    }
  }

  // ===== 09:00 — 1 agendamento movido para outro horário =====
  console.log('\n─── 09:00 — 1 agendamento movido para outro horário ───');
  if (atendimentos[0]) {
    const res = await api('PUT', `/atendimentos/${atendimentos[0].id}`, {
      data: SIM_DATE,
      horario: '09:30:00'
    }, token);
    logAction(ts(), `/atendimentos/${atendimentos[0].id}`, 'PUT', res.status, res.responseTime, '200', res.data?.message || '');
  }

  // ===== 10:00 — 2 atendimentos marcados como EXECUTADO =====
  console.log('\n─── 10:00 — 2 atendimentos marcados como EXECUTADO ───');
  for (let i = 0; i < 2 && i < atendimentos.length; i++) {
    const res = await api('PUT', `/atendimentos/${atendimentos[i].id}`, { status: 'EXECUTADO' }, token);
    logAction(ts(), `/atendimentos/${atendimentos[i].id}`, 'PUT', res.status, res.responseTime, '200', res.data?.message || '');
    if (res.ok) {
      summary.atendimentosExecutados++;
      summary.lucroLiquido += Number(atendimentos[i].lucro_liquido || 0);
    }
  }

  // ===== 11:00 — 1 atendimento cancelado =====
  console.log('\n─── 11:00 — 1 atendimento cancelado ───');
  if (atendimentos[2]) {
    const res = await api('PUT', `/atendimentos/${atendimentos[2].id}`, { status: 'CANCELADO' }, token);
    logAction(ts(), `/atendimentos/${atendimentos[2].id}`, 'PUT', res.status, res.responseTime, '200', res.data?.message || '');
    if (res.ok) summary.atendimentosCancelados++;
  }

  // ===== 12:00 — 1 venda de homecare criada =====
  console.log('\n─── 12:00 — 1 venda de homecare criada ───');
  const hcRes = await api('POST', '/cadastros/homecare', {
    cliente: 'Cliente HC Simulação',
    produto: 'Kit Hidratação',
    custo_produto: 40,
    valor_venda: 150,
    valor_pago: 100,
    data: SIM_DATE
  }, token);
  logAction(ts(), '/cadastros/homecare', 'POST', hcRes.status, hcRes.responseTime, '201', hcRes.data?.id ? `id=${hcRes.data.id}` : hcRes.data?.error);

  // ===== 13:00 — 2 atendimentos marcados como pagos =====
  console.log('\n─── 13:00 — 2 atendimentos marcados como pagos ───');
  for (let i = 0; i < 2 && i < atendimentos.length; i++) {
    const res = await api('PUT', `/atendimentos/${atendimentos[i].id}`, {
      valor_pago: 80,
      status: 'EXECUTADO'
    }, token);
    logAction(ts(), `/atendimentos/${atendimentos[i].id}`, 'PUT', res.status, res.responseTime, '200', res.data?.message || '');
    if (res.ok) summary.atendimentosPagos++;
  }

  // ===== 14:00 — 1 atendimento com procedimento adicional criado =====
  console.log('\n─── 14:00 — 1 atendimento com procedimento adicional criado ───');
  const atdAdRes = await api('POST', '/atendimentos', {
    cliente: 'Cliente Proc Adicional',
    profissional_id: profs[0].id,
    data: SIM_DATE,
    horario: '14:00:00',
    procedimento_id: procCorte.id,
    comprimento: 'P',
    valor_cobrado: 60,
    valor_pago: 0,
    status: 'AGENDADO',
    procedimentos_adicionais: [{
      procedimento_id: procHidrat.id,
      comprimento: 'G',
      valor_cobrado: 120
    }]
  }, token);
  logAction(ts(), '/atendimentos', 'POST', atdAdRes.status, atdAdRes.responseTime, '201', atdAdRes.data?.id ? `id=${atdAdRes.data.id}` : atdAdRes.data?.error);
  if (atdAdRes.ok && atdAdRes.data.id) {
    summary.atendimentosCriados++;
    summary.receitaBruta += 60 + 120; // procedimento principal + adicional
  }

  // ===== 15:00 — 1 despesa lançada =====
  console.log('\n─── 15:00 — 1 despesa lançada ───');
  const despRes = await api('POST', '/cadastros/despesas', {
    descricao: 'Despesa Simulação',
    valor: 200,
    tipo: 'MATERIAL',
    data: SIM_DATE,
    valor_pago: 200
  }, token);
  logAction(ts(), '/cadastros/despesas', 'POST', despRes.status, despRes.responseTime, '201', despRes.data?.id ? `id=${despRes.data.id}` : despRes.data?.error);

  // ===== 16:00 — GET /fechamento/:mes consultado =====
  console.log('\n─── 16:00 — GET /fechamento consultado ───');
  const fechRes = await api('GET', `/fechamento/${SIM_MES}`, null, token);
  logAction(ts(), `/fechamento/${SIM_MES}`, 'GET', fechRes.status, fechRes.responseTime, '200', fechRes.data ? `receita=${fechRes.data.faturamentoBruto}` : '');

  // ===== 17:00 — 2 novos agendamentos para o dia seguinte =====
  console.log('\n─── 17:00 — 2 novos agendamentos para o dia seguinte ───');
  const nextDay = '2025-02-16';
  for (let i = 0; i < 2; i++) {
    const res = await api('POST', '/atendimentos', {
      cliente: `Cliente Dia Seguinte ${i+1}`,
      profissional_id: profs[i % profs.length].id,
      data: nextDay,
      horario: `${10 + i}:00:00`,
      procedimento_id: procCor.id,
      comprimento: 'P',
      valor_cobrado: 80,
      valor_pago: 0,
      status: 'AGENDADO'
    }, token);
    logAction(ts(), '/atendimentos', 'POST', res.status, res.responseTime, '201', res.data?.id ? `id=${res.data.id}` : res.data?.error);
    if (res.ok && res.data.id) summary.atendimentosCriados++;
  }

  // ===== 18:00 — GET /atendimentos?data= consultado 3x =====
  console.log('\n─── 18:00 — GET /atendimentos?data= consultado 3x ───');
  for (let i = 0; i < 3; i++) {
    const res = await api('GET', `/atendimentos?data=${SIM_DATE}`, null, token);
    logAction(ts(), `/atendimentos?data=${SIM_DATE}`, 'GET', res.status, res.responseTime, '200', `count=${res.data?.count || 0}`);
  }

  // ===== RESUMO DO DIA =====
  console.log('\n═══════════════════════════════════════════');
  console.log('  RESUMO DA SIMULAÇÃO DE DIA REAL');
  console.log('═══════════════════════════════════════════');
  console.log(`  Atendimentos criados:     ${summary.atendimentosCriados}`);
  console.log(`  Atendimentos executados:  ${summary.atendimentosExecutados}`);
  console.log(`  Atendimentos cancelados:  ${summary.atendimentosCancelados}`);
  console.log(`  Atendimentos pagos:       ${summary.atendimentosPagos}`);
  console.log(`  Receita bruta do dia:     R$${summary.receitaBruta.toFixed(2)}`);
  console.log(`  Lucro líquido do dia:     R$${summary.lucroLiquido.toFixed(2)}`);
  console.log(`  Pendências abertas:       ${summary.pendenciasAbertas}`);
  console.log('═══════════════════════════════════════════\n');

  // Salvar log
  const logPath = path.join(__dirname, 'simulacao_dia_log.json');
  fs.writeFileSync(logPath, JSON.stringify({ summary, log }, null, 2));
  console.log(`Log salvo em: ${logPath}\n`);

  process.exit(0);
}

main().catch(err => {
  console.error('❌ Erro fatal:', err.message);
  process.exit(1);
});
