/**
 * PASSO 3 — STRESS DE ESCRITA EM DEGRAUS + VERIFICAÇÃO DE INTEGRIDADE
 * Fases cumulativas: 5 → 10 → 20 → 35 → 50 salões simulando 3 meses SIMULTANEAMENTE.
 * Pool: 20 salões do seed (salons_seed.json) + criação dinâmica até 50 (loadtest21..50).
 *
 * Integridade: antes de tudo, captura o BASELINE de cada salão (o que já existe no
 * banco por mês). Ao final, esperado = baseline + criado (réplica própria da engine)
 * é comparado com GET /fechamento/:mes de cada salão. Qualquer divergência é reportada.
 * Também fecha jul+ago de cada salão (valida o endpoint corrigido em escala).
 *
 * Uso: node scripts/testar_stress_escrita.js [--max-fase 50]
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3334';
const VENDEDOR = { email: 'vendedor-staging@teste.com', senha: 'Staging123!' };
const SENHA_SALAO = 'LoadTest123!';
const MESES = ['2026-07', '2026-08', '2026-09'];
const MES_CORRENTE = MESES[2];
const HOJE = new Date();
const DIA_HOJE = HOJE.getDate();
const FASES = [5, 10, 20, 35, 50];
const ATEND_POR_MES = 20; // por salão, por fase (leve o suficiente p/ escalar, fiel o suficiente p/ validar)
const SEED_PATH = path.join(__dirname, 'salons_seed.json');

const PROCEDIMENTOS_BASE = [
  { nome: 'Coloração', categoria: 'SERVICO_CABELO', preco_p: 80, custo_variavel: 28, requer_comprimento: 1, ativo: 1 },
  { nome: 'Progressiva', categoria: 'SERVICO_CABELO', preco_p: 250, custo_variavel: 135, requer_comprimento: 1, ativo: 1 },
  { nome: 'Corte', categoria: 'SERVICO_CABELO', preco_p: 60, custo_variavel: 5, requer_comprimento: 1, ativo: 1 },
  { nome: 'Hidratação', categoria: 'SERVICO_CABELO', preco_p: 120, custo_variavel: 30, requer_comprimento: 1, ativo: 1 },
];
const DESPESAS_FASE = [ // 2 por mês
  { descricao: 'Despesa fase A', tipo: 'OUTRO', valor: 120 },
  { descricao: 'Despesa fase B', tipo: 'MATERIAL', valor: 80 },
];

const r2 = (v) => Math.round((v + Number.EPSILON) * 100) / 100;
const randInt = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const dataEm = (mes, dia) => `${mes}-${String(dia).padStart(2, '0')}`;

async function api(method, route, body = null, token = null) {
  const t0 = Date.now();
  const opts = { method, headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(60000) };
  if (token) opts.headers['Authorization'] = `Bearer ${token}`;
  if (body) opts.body = JSON.stringify(body);
  try {
    const res = await fetch(`${BASE_URL}${route}`, opts);
    let data = null;
    try { data = await res.json(); } catch {}
    return { ms: Date.now() - t0, status: res.status, ok: res.ok, data };
  } catch (e) {
    return { ms: Date.now() - t0, status: 0, ok: false, data: { error: e.message } };
  }
}

// Réplica INDEPENDENTE do financial engine (taxa/custo fixo vêm da config real do salão)
function calcLucro({ vc, taxa, cf, cargo, pct, cv }) {
  const maq = r2(vc * taxa / 100);
  const com = cargo === 'FUNCIONARIO' && pct > 0 ? r2(vc * pct / 100) : 0;
  return r2(vc - maq - cf - r2(cv) - com);
}

function mesVazio() {
  return { atendTotal: 0, cobrado: 0, pago: 0, lucro: 0, exec: 0, cancel: 0, agend: 0, hcVenda: 0, hcLucro: 0, paralelos: 0, despesas: 0, gastos: 0 };
}
function soma(a, b) {
  const r = mesVazio();
  for (const k of Object.keys(r)) r[k] = r2(a[k] + b[k]);
  r.exec = a.exec + b.exec; r.cancel = a.cancel + b.cancel; r.agend = a.agend + b.agend;
  return r;
}

// Garante pool de salões até qtdAlvo (reutiliza os que já existem de auditorias
// anteriores; cria com base completa apenas os que faltarem)
async function garantirPool(qtdAlvo, vendedorToken, vendedorId) {
  const pool = JSON.parse(fs.readFileSync(SEED_PATH, 'utf8'));
  let criadosNovos = 0, reaproveitados = 0;

  while (pool.length < qtdAlvo) {
    const n = pool.length + 1;
    const email = `loadtest${n}@teste.com`;
    let entry = null;

    // 1) já existe? tenta login direto
    let login = await api('POST', '/auth/login', { email, senha: SENHA_SALAO });
    if (login.ok) {
      entry = { email, senha: SENHA_SALAO, salao_id: login.data.salao_id, auth_user_id: login.data.auth_user_id, profissionais: [], procedimentos: [] };
      reaproveitados++;
    } else {
      // 2) não existe → cria com base completa (3 profs + 4 procedimentos + clientes)
      const cri = await api('POST', '/salao/criar-proprietaria', {
        email, senha: SENHA_SALAO, nome: `Proprietária ${n}`,
        nome_salao: `Salão LoadTest ${n}`, telefone: `1199999${String(n).padStart(4, '0')}`,
        vendedor_id: vendedorId,
      }, vendedorToken);
      if (cri.ok && cri.data.salao_id) {
        const tk = (await api('POST', '/auth/login', { email, senha: SENHA_SALAO })).data.token;
        const profissionais = [];
        for (const p of [
          { nome: `Profissional ${n}.1`, cargo: 'PROPRIETARIO', porcentagem_comissao: 0, salario_fixo: 0, ativo: 1 },
          { nome: `Profissional ${n}.2`, cargo: 'FUNCIONARIO', porcentagem_comissao: 40, salario_fixo: 0, ativo: 1 },
          { nome: `Profissional ${n}.3`, cargo: 'FUNCIONARIO', porcentagem_comissao: 30, salario_fixo: 0, ativo: 1 },
        ]) {
          const r = await api('POST', '/cadastros/profissionais', p, tk);
          if (r.ok && r.data.id) profissionais.push({ id: r.data.id, cargo: p.cargo, comissao: p.porcentagem_comissao });
        }
        const procedimentos = [];
        for (const p of PROCEDIMENTOS_BASE) {
          const r = await api('POST', '/cadastros/procedimentos', p, tk);
          if (r.ok && r.data.id) procedimentos.push({ id: r.data.id, nome: p.nome, preco_p: p.preco_p });
        }
        for (let c = 0; c < 4; c++) await api('POST', '/cadastros/clientes', { nome: `Cliente ${n}.${c}`, telefone: `1199${String(n).padStart(3, '0')}${c}` }, tk);
        entry = { email, senha: SENHA_SALAO, salao_id: cri.data.salao_id, auth_user_id: cri.data.auth_user_id, profissionais, procedimentos };
        criadosNovos++;
      } else if (/Duplicate|Transaction failed/i.test(JSON.stringify(cri.data)) || cri.status === 500) {
        // 3) criado por execução anterior/concorrente → tenta login mais uma vez
        login = await api('POST', '/auth/login', { email, senha: SENHA_SALAO });
        if (login.ok) {
          entry = { email, senha: SENHA_SALAO, salao_id: login.data.salao_id, auth_user_id: login.data.auth_user_id, profissionais: [], procedimentos: [] };
          reaproveitados++;
        } else throw new Error(`não foi possível obter acesso ao salão ${n}: ${JSON.stringify(cri.data)} / ${JSON.stringify(login.data)}`);
      } else {
        throw new Error(`criar salão ${n}: ${JSON.stringify(cri.data)}`);
      }
    }

    pool.push(entry);
    fs.writeFileSync(SEED_PATH, JSON.stringify(pool, null, 2)); // persiste progresso incremental
    console.log(`   pool: ${pool.length}/${qtdAlvo} (${email}${entry.profissionais.length ? ', base criada' : ', reaproveitado'})`);
  }

  console.log(`✅ Pool pronto: ${pool.length} salões (${reaproveitados} reaproveitados, ${criadosNovos} criados agora)\n`);
  return pool;
}

// Baseline por mês do que JÁ EXISTE no banco do salão
async function capturarBaseline(salao) {
  const [cfgR, atR, hcR, despR, gpR, profR] = await Promise.all([
    api('GET', '/cadastros/configuracoes', null, salao.token),
    api('GET', '/atendimentos', null, salao.token),
    api('GET', '/cadastros/homecare', null, salao.token),
    api('GET', '/cadastros/despesas', null, salao.token),
    api('GET', '/cadastros/gastos-pessoais', null, salao.token),
    api('GET', '/cadastros/profissionais', null, salao.token),
  ]);
  const cfg = Array.isArray(cfgR.data) ? cfgR.data[0] : null;
  const base = {};
  for (const m of MESES) base[m] = mesVazio();

  const atends = atR.data?.data || [];
  for (const a of atends) {
    const m = String(a.data).slice(0, 7);
    if (!(m in base)) continue;
    if (a.status === 'EXECUTADO') {
      base[m].exec++; base[m].cobrado = r2(base[m].cobrado + Number(a.valor_cobrado));
      base[m].pago = r2(base[m].pago + Number(a.valor_pago));
      base[m].lucro = r2(base[m].lucro + Number(a.lucro_liquido));
    } else if (a.status === 'CANCELADO') base[m].cancel++;
    else if (a.status === 'AGENDADO') base[m].agend++;
  }
  for (const h of hcR.data || []) {
    const m = String(h.data).slice(0, 7);
    if (m in base) { base[m].hcVenda = r2(base[m].hcVenda + Number(h.valor_venda)); base[m].hcLucro = r2(base[m].hcLucro + Number(h.lucro)); }
  }
  for (const d of despR.data || []) {
    const m = String(d.data).slice(0, 7);
    if (m in base) base[m].despesas = r2(base[m].despesas + Number(d.valor));
  }
  for (const g of gpR.data || []) {
    const m = String(g.criado_em).slice(0, 7);
    if (m in base) base[m].gastos = r2(base[m].gastos + Number(g.valor));
  }

  // Mapa de profissionais para cálculo de comissão
  const profMap = {};
  for (const p of profR.data || []) profMap[p.id] = { cargo: p.cargo, pct: Number(p.porcentagem_comissao) || 0 };
  // Custo variável estático por procedimento (seed não tem vínculos de produto)
  const procR = await api('GET', '/cadastros/procedimentos', null, salao.token);
  const procMap = {};
  for (const p of procR.data || []) procMap[p.id] = { cv: Number(p.custo_variavel) || 0, preco_p: Number(p.preco_p) };

  return { base, taxa: Number(cfg?.taxa_maquininha_pct) || 0, cf: Number(cfg?.custo_fixo_por_atendimento) || 0, profMap, procMap, cfgId: cfg?.id };
}

// Simula 3 meses compactos de um salão (chamado em paralelo durante a fase)
async function simularSalao(salao, info, criado) {
  for (let mi = 0; mi < MESES.length; mi++) {
    const mes = MESES[mi];
    for (let i = 0; i < ATEND_POR_MES; i++) {
      const r = Math.random();
      const status = mi < 2 ? (r < 0.85 ? 'EXECUTADO' : 'CANCELADO')
                            : (r < 0.85 ? 'EXECUTADO' : r < 0.95 ? 'CANCELADO' : 'AGENDADO');
      const procId = pick(info.procIds);
      const profId = pick(info.profIds);
      const precoP = info.procMap[procId]?.preco_p || 60;
      const rc = Math.random();
      const comp = rc < 0.6 ? 'P' : rc < 0.85 ? 'M' : 'G';
      const vc = comp === 'M' ? r2(precoP * 1.2) : comp === 'G' ? r2(precoP * 1.3) : precoP;
      let dia;
      if (status === 'AGENDADO') dia = randInt(Math.min(DIA_HOJE + 2, 28), 28);
      else if (mes === MES_CORRENTE) dia = randInt(1, Math.max(1, DIA_HOJE - 1));
      else dia = randInt(1, 27);
      let vp = 0;
      if (status === 'EXECUTADO') { const rr = Math.random(); vp = rr < 0.85 ? vc : rr < 0.92 ? 0 : r2(vc * 0.6); }

      const res = await api('POST', '/atendimentos', {
        cliente: `Stress ${salao.email.split('@')[0]}`, profissional_id: profId,
        data: dataEm(mes, dia), horario: `${randInt(9, 18)}:00:00`,
        procedimento_id: procId, comprimento: comp, valor_cobrado: vc, valor_pago: vp, status,
      }, salao.token);
      if (!res.ok) { info.errosApi.push(`atend ${res.status} ${mes}`); continue; }
      const e = criado[mes];
      e.atendTotal++;
      if (status === 'EXECUTADO') {
        e.exec++; e.cobrado = r2(e.cobrado + vc); e.pago = r2(e.pago + vp);
        const p = info.profMap[profId] || { cargo: 'PROPRIETARIO', pct: 0 };
        e.lucro = r2(e.lucro + calcLucro({ vc, taxa: info.taxa, cf: info.cf, cargo: p.cargo, pct: p.pct, cv: info.procMap[procId]?.cv || 0 }));
      } else if (status === 'CANCELADO') e.cancel++;
      else e.agend++;
    }
    // HomeCare ×3
    for (let i = 0; i < 3; i++) {
      const v = randInt(60, 200), c = randInt(20, 80);
      const res = await api('POST', '/cadastros/homecare', { data: dataEm(mes, randInt(1, 27)), cliente: 'HC Stress', produto: 'Produto Stress', custo_produto: c, valor_venda: v, valor_pago: v }, salao.token);
      if (res.ok) { criado[mes].hcVenda = r2(criado[mes].hcVenda + v); criado[mes].hcLucro = r2(criado[mes].hcLucro + r2(v - c)); }
      else info.errosApi.push(`homecare ${res.status} ${mes}`);
    }
    // Paralelos ×2
    for (let i = 0; i < 2; i++) {
      const v = randInt(100, 250);
      const res = await api('POST', '/cadastros/procedimentos-paralelos', { data: dataEm(mes, randInt(1, 27)), cliente: 'Par Stress', descricao: 'Paralelo stress', valor: v, valor_pago: v, valor_profissional: r2(v * 0.3), profissional_id: pick(info.profIds) }, salao.token);
      if (res.ok) criado[mes].paralelos = r2(criado[mes].paralelos + v);
      else info.errosApi.push(`paralelo ${res.status} ${mes}`);
    }
    // Despesas ×2
    for (const d of DESPESAS_FASE) {
      const res = await api('POST', '/cadastros/despesas', { data: dataEm(mes, randInt(1, 27)), descricao: d.descricao, tipo: d.tipo, valor: d.valor, valor_pago: d.valor }, salao.token);
      if (res.ok) criado[mes].despesas = r2(criado[mes].despesas + d.valor);
      else info.errosApi.push(`despesa ${res.status} ${mes}`);
    }
    // Gasto pessoal ×1 (cai no mês corrente — usa criado_em)
    const g = 100 + randInt(0, 200);
    const res = await api('POST', '/cadastros/gastos-pessoais', { descricao: 'Gasto stress', valor: g }, salao.token);
    if (res.ok) criado[MES_CORRENTE].gastos = r2(criado[MES_CORRENTE].gastos + g);
    else info.errosApi.push(`gasto ${res.status}`);
  }
}

async function main() {
  const maxFase = Number(process.argv.includes('--max-fase') ? process.argv[process.argv.indexOf('--max-fase') + 1] : 50);
  const fases = FASES.filter(f => f <= maxFase);
  console.log('═══════════════════════════════════════════════════');
  console.log('  PASSO 3 — STRESS DE ESCRITA EM DEGRAUS + INTEGRIDADE');
  console.log(`  Fases: ${fases.join(' → ')} | ${ATEND_POR_MES} atend/mês/salão/fase | meses ${MESES.join(', ')}`);
  console.log('═══════════════════════════════════════════════════\n');

  // Login vendedor + garantir pool de salões
  const vendedorLogin = await api('POST', '/auth/login', VENDEDOR);
  if (!vendedorLogin.ok) throw new Error('login vendedor falhou');
  const pool = await garantirPool(Math.max(...fases), vendedorLogin.data.token, vendedorLogin.data.user_id);
  console.log(`Pool total: ${pool.length} salões\n`);

  // Login de todos os salões (1x cada)
  console.log('Logando salões...');
  for (const s of pool) {
    const r = await api('POST', '/auth/login', { email: s.email, senha: s.senha });
    if (!r.ok) throw new Error(`login ${s.email}: ${JSON.stringify(r.data)}`);
    s.token = r.data.token;
  }
  console.log(`✅ ${pool.length} salões logados\n`);

  // Baseline + info por salão
  console.log('Capturando baseline por salão...');
  const infos = {};
  for (const s of pool) infos[s.salao_id] = await capturarBaseline(s);
  const criados = {};
  for (const s of pool) {
    criados[s.salao_id] = {};
    for (const m of MESES) criados[s.salao_id][m] = mesVazio();
    infos[s.salao_id].errosApi = [];
    infos[s.salao_id].profIds = Object.keys(infos[s.salao_id].profMap);
    infos[s.salao_id].procIds = Object.keys(infos[s.salao_id].procMap);
  }
  console.log(`✅ Baselines prontos (${pool.length} salões)\n`);

  // Fases cumulativas
  for (const fase of fases) {
    const participantes = pool.slice(0, fase);
    console.log(`⏳ FASE ${fase}: ${fase} salões simulando 3 meses simultaneamente...`);
    const t0 = Date.now();
    await Promise.all(participantes.map(s => simularSalao(s, infos[s.salao_id], criados[s.salao_id])));
    const wall = ((Date.now() - t0) / 1000).toFixed(1);
    const erros = participantes.reduce((acc, s) => acc + infos[s.salao_id].errosApi.length, 0);
    const atend = participantes.reduce((acc, s) => acc + Object.values(criados[s.salao_id]).reduce((a, m) => a + m.atendTotal, 0), 0);
    console.log(`   → ${wall}s | ${atend} atendimentos criados | ${erros} erros de API\n`);
    await sleep(5000);
  }

  // Verificação de integridade: baseline + criado × GET /fechamento
  console.log('─── VERIFICAÇÃO DE INTEGRIDADE (baseline+criado × API) ───');
  const divergencias = [];
  for (const s of pool) {
    const info = infos[s.salao_id];
    for (const mes of MESES) {
      const g = await api('GET', `/fechamento/${mes}`, null, s.token);
      if (!g.ok) { divergencias.push({ salao: s.email, mes, campo: 'GET fechamento', esperado: '-', api: g.status }); continue; }
      const esp = soma(info.base[mes], criados[s.salao_id][mes]);
      const linhas = [
        ['faturamentoBruto', esp.cobrado, g.data.faturamentoBruto],
        ['receitaRecebida', esp.pago, g.data.receitaRecebida],
        ['lucroAtendimentosReal', esp.lucro, g.data.lucroAtendimentosReal],
        ['totalAtendimentos', esp.exec, g.data.totalAtendimentos],
        ['receitaHomecare', esp.hcVenda, g.data.receitaHomecare],
        ['lucroHomecare', esp.hcLucro, g.data.lucroHomecare],
        ['receitaParalelos', esp.paralelos, g.data.receitaParalelos],
        ['totalDespesas', esp.despesas, g.data.totalDespesas],
        ['totalGastosPessoais', esp.gastos, g.data.totalGastosPessoais],
      ];
      for (const [campo, e, a] of linhas) {
        if (Math.abs(Number(a) - Number(e)) > 0.01) divergencias.push({ salao: s.email, mes, campo, esperado: Number(e), api: Number(a) });
      }
    }
  }
  const checks = pool.length * MESES.length * 9;
  console.log(`   ${checks} comparações | ${divergencias.length} divergência(s)`);
  divergencias.slice(0, 15).forEach(d => console.log(`   ✘ ${d.salao} [${d.mes}] ${d.campo}: esperado=${d.esperado} api=${d.api}`));

  // Fechar jul+ago de todos os salões (endpoint corrigido em escala)
  console.log('\n─── Fechando 2026-07 e 2026-08 de todos os salões ───');
  let fechOk = 0, fechJaFechado = 0, fechErro = 0;
  for (let i = 0; i < pool.length; i += 10) {
    const lote = pool.slice(i, i + 10);
    await Promise.all(lote.flatMap(s => [MESES[0], MESES[1]].map(async mes => {
      const r = await api('POST', `/fechamento/${mes}`, null, s.token);
      if (r.ok) fechOk++;
      else if (r.status === 400 && /já fechado/i.test(r.data?.error || '')) fechJaFechado++;
      else fechErro++;
    })));
  }
  console.log(`   sucesso=${fechOk} | já-fechado=${fechJaFechado} | erro=${fechErro}`);

  const totalErrosApi = pool.reduce((a, s) => a + infos[s.salao_id].errosApi.length, 0);
  const resultado = {
    data: new Date().toISOString(), fases, pool: pool.length, atendPorMes: ATEND_POR_MES,
    comparacoes: checks, divergencias, totalErrosApi,
    errosPorTipo: (() => { const m = {}; pool.forEach(s => infos[s.salao_id].errosApi.forEach(e => { m[e.split(' ')[0]] = (m[e.split(' ')[0]] || 0) + 1; })); return m; })(),
    fechamentos: { sucesso: fechOk, jaFechado: fechJaFechado, erro: fechErro },
  };
  fs.writeFileSync(path.join(__dirname, 'resultado_stress_escrita.json'), JSON.stringify(resultado, null, 2));
  console.log('\n📁 Relatório salvo em scripts/resultado_stress_escrita.json');
  const aprovado = divergencias.length === 0 && fechErro === 0 && totalErrosApi === 0;
  console.log(aprovado ? '✅ STRESS APROVADO: integridade 100% sob carga' : '❌ STRESS COM PROBLEMAS — ver relatório acima');
  process.exit(aprovado ? 0 : 1);
}

main().catch(e => { console.error('❌ ERRO FATAL:', e); process.exit(1); });



