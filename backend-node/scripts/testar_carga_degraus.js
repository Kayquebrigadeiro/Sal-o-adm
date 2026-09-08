/**
 * PASSO 2 — TESTE DE CARGA EM DEGRAUS (Node puro, adaptado do scripts/k6)
 * Fases: 5 → 10 → 20 → 35 → 50 usuários simultâneos, fluxo realista:
 * login → agenda → criar atendimento → executar/pagar (PUT) → homecare → fechamento.
 * Roda contra staging (3334) com os 20 salões do seed (salons_seed.json).
 * Métricas por fase: req/s, taxa de erro, avg/p95/max por rota.
 * Uso: node scripts/testar_carga_degraus.js
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3334';
const FASES = [5, 10, 20, 35, 50];
const FLOWS_POR_WORKER = 6;
const SEED = JSON.parse(fs.readFileSync(path.join(__dirname, 'salons_seed.json'), 'utf8'));

async function api(method, route, body = null, token = null) {
  const t0 = Date.now();
  const opts = { method, headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(60000) };
  if (token) opts.headers['Authorization'] = `Bearer ${token}`;
  if (body) opts.body = JSON.stringify(body);
  let status = 0, ok = false, data = null;
  try {
    const res = await fetch(`${BASE_URL}${route}`, opts);
    status = res.status; ok = res.ok;
    try { data = await res.json(); } catch {}
  } catch (e) { data = { error: e.message }; }
  return { ms: Date.now() - t0, status, ok, data };
}

function reg(rota, ms, rotaMap) { (rotaMap[rota] ||= []).push(ms); }
function p95(arr) { if (!arr.length) return 0; const s = [...arr].sort((a, b) => a - b); return s[Math.ceil(0.95 * s.length) - 1]; }
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function runPhase(nWorkers, sessoes) {
  const rotaMap = {};
  let reqs = 0, erros = 0;
  const t0 = Date.now();
  const workers = [];
  for (let w = 0; w < nWorkers; w++) {
    const s = sessoes[w % sessoes.length];
    workers.push((async () => {
      for (let f = 0; f < FLOWS_POR_WORKER; f++) {
        const hoje = new Date().toISOString().split('T')[0];
        const prof = s.profissionais[Math.floor(Math.random() * s.profissionais.length)];
        const proc = s.procedimentos[Math.floor(Math.random() * s.procedimentos.length)];

        let r = await api('GET', `/atendimentos?data=${hoje}`, null, s.token); reg('agenda', r.ms, rotaMap); reqs++; if (!r.ok) erros++;
        await sleep(100 + Math.random() * 250);

        r = await api('POST', '/atendimentos', {
          cliente: `Carga ${Math.random().toString(36).slice(2, 7)}`,
          data: hoje, horario: `${8 + Math.floor(Math.random() * 10)}:${Math.random() > 0.5 ? '00' : '30'}:00`,
          profissional_id: prof.id, procedimento_id: proc.id,
          comprimento: ['P', 'M', 'G'][Math.floor(Math.random() * 3)],
          valor_cobrado: proc.preco_p, valor_pago: 0, status: 'AGENDADO',
        }, s.token); reg('criar_atendimento', r.ms, rotaMap); reqs++; if (!r.ok) erros++;
        const atendId = r.data?.id;
        await sleep(100 + Math.random() * 250);

        if (atendId) {
          r = await api('PUT', `/atendimentos/${atendId}`, { status: 'EXECUTADO', valor_pago: proc.preco_p }, s.token);
          reg('atualizar_atendimento', r.ms, rotaMap); reqs++; if (!r.ok) erros++;
          await sleep(100 + Math.random() * 200);
        }

        r = await api('POST', '/cadastros/homecare', {
          data: hoje, cliente: `HC ${Math.random().toString(36).slice(2, 6)}`,
          produto: 'Produto Carga', custo_produto: 20, valor_venda: 90, valor_pago: 90,
        }, s.token); reg('homecare', r.ms, rotaMap); reqs++; if (!r.ok) erros++;
        await sleep(100 + Math.random() * 250);

        r = await api('GET', `/fechamento/${hoje.slice(0, 7)}`, null, s.token); reg('fechamento', r.ms, rotaMap); reqs++; if (!r.ok) erros++;
        await sleep(100 + Math.random() * 250);
      }
    })());
  }
  await Promise.all(workers);
  const wall = (Date.now() - t0) / 1000;
  return { reqs, erros, wall, rotaMap };
}

async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  PASSO 2 — TESTE DE CARGA EM DEGRAUS (pós-fixes)');
  console.log(`  Fases: ${FASES.join(' → ')} | ${FLOWS_POR_WORKER} fluxos/worker | ${SEED.length} salões no pool`);
  console.log('═══════════════════════════════════════════════════');

  console.log('\nLogando sessões...');
  const sessoes = [];
  for (let i = 0; i < Math.max(...FASES); i++) {
    const s = SEED[i % SEED.length];
    const r = await api('POST', '/auth/login', { email: s.email, senha: s.senha });
    if (!r.ok) { console.error(`❌ login ${s.email}: ${JSON.stringify(r.data)}`); process.exit(1); }
    // Salões reaproveitados podem ter arrays vazios no seed — resolve via API
    let profs = s.profissionais || [], procs = s.procedimentos || [];
    if (!profs.length || !procs.length) {
      const [pr, pc] = await Promise.all([
        api('GET', '/cadastros/profissionais', null, r.data.token),
        api('GET', '/cadastros/procedimentos', null, r.data.token),
      ]);
      profs = (pr.data || []).map(p => ({ id: p.id }));
      procs = (pc.data || []).map(p => ({ id: p.id, preco_p: Number(p.preco_p) || 60 }));
    }
    sessoes.push({ ...s, token: r.data.token, profissionais: profs, procedimentos: procs });
  }
  console.log(`✅ ${sessoes.length} sessões prontas\n`);

  const resumo = [];
  for (const fase of FASES) {
    process.stdout.write(`⏳ Fase ${fase} usuários simultâneos... `);
    const { reqs, erros, wall, rotaMap } = await runPhase(fase, sessoes);
    const linha = { fase, reqs, erros, wall, rps: Number((reqs / wall).toFixed(1)), rotas: {} };
    for (const [rota, arr] of Object.entries(rotaMap)) {
      linha.rotas[rota] = { n: arr.length, avg: Math.round(arr.reduce((a, b) => a + b, 0) / arr.length), p95: p95(arr), max: Math.max(...arr) };
    }
    resumo.push(linha);
    console.log(`${wall.toFixed(1)}s | ${reqs} reqs | ${(reqs / wall).toFixed(1)} req/s | ${erros} erros`);
    for (const [rota, m] of Object.entries(linha.rotas)) {
      console.log(`     ${rota.padEnd(22)} n=${String(m.n).padStart(4)} avg=${String(m.avg).padStart(5)}ms p95=${String(m.p95).padStart(5)}ms max=${String(m.max).padStart(6)}ms`);
    }
    await sleep(10000); // resfriamento entre fases
  }

  // Veredito por fase: erro<5% e p95 de criar/fechamento < 3000ms (mesmos thresholds do k6)
  console.log('\n─── VEREDITO ───');
  let falhas = 0;
  for (const r of resumo) {
    const criar = r.rotas.criar_atendimento?.p95 ?? 0;
    const fech = r.rotas.fechamento?.p95 ?? 0;
    const taxaErro = r.reqs ? (r.erros / r.reqs) * 100 : 100;
    const ok = taxaErro < 5 && criar < 3000 && fech < 3000;
    if (!ok) falhas++;
    console.log(`  ${ok ? '✅' : '❌'} ${String(r.fase).padStart(2)} usuários: erro=${taxaErro.toFixed(1)}% p95_criar=${criar}ms p95_fechamento=${fech}ms`);
  }
  fs.writeFileSync(path.join(__dirname, 'resultado_carga_degraus.json'), JSON.stringify({ data: new Date().toISOString(), resumo }, null, 2));
  console.log('\n📁 Métricas salvas em scripts/resultado_carga_degraus.json');
  console.log(falhas === 0 ? '✅ TODAS AS FASES PASSARAM' : `❌ ${falhas} fase(s) acima do threshold`);
  process.exit(falhas > 0 ? 1 : 0);
}

main().catch(e => { console.error('❌ ERRO FATAL:', e); process.exit(1); });

