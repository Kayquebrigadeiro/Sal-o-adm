/**
 * SIMULAÇÃO REALISTA — Salão Beleza Real (PRODUÇÃO)
 * Complementa a simulação de 3 meses com as funcionalidades que ficaram de fora:
 *   1. Precificação: custo fixo por atendimento (rateio dos custos fixos) + ganho líquido desejado
 *      + teste de engenharia reversa (preço calculado a partir do ganho desejado)
 *   2. Custos fixos: adiciona Água (aluguel/energia/internet já existem)
 *   3. Despesas/Produtos: produtos no catálogo + vínculo procedimento→produto (custo variável dinâmico)
 *   4. Despesas variáveis com tipos válidos do ENUM
 *   5. Movimentações realistas no mês aberto (atendimentos, homecare, paralelos, gastos pessoais)
 *   6. AUDITORIA FINANCEIRA INDEPENDENTE: réplica própria do engine confere TODOS os atendimentos
 *      linha a linha e os fechamentos dos 3 meses
 *
 * Uso: node scripts/simulacao_producao_realista.js [--somente-auditoria]
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.BASE_URL || 'https://sal-o-adm-1.onrender.com';
const SALAO = {
  email: process.env.SALAO_EMAIL || 'beleza.real@teste.com',
  senha: process.env.SALAO_SENHA || 'BelezaReal123!',
};
const SOMENTE_AUDITORIA = process.argv.includes('--somente-auditoria');
const GANHO_DESEJADO_NOVO_PROC = 45;

// ════════════════════════════════════════════════════════════════
//  RÉPLICA INDEPENDENTE DO FINANCIAL ENGINE (não importa o módulo do servidor)
// ════════════════════════════════════════════════════════════════
const r2 = (v) => (typeof v !== 'number' || isNaN(v)) ? 0 : Math.round((v + Number.EPSILON) * 100) / 100;

function calcularCustoVariavelInsumos(produtos = []) {
  if (!Array.isArray(produtos) || produtos.length === 0) return 0;
  let total = 0;
  for (const p of produtos) {
    const custoPorUso = r2((p.preco_compra || 0) / (p.qtd_aplicacoes || 1));
    total = r2(total + custoPorUso * (p.qtd_por_uso || 0));
  }
  return total;
}

function calcularValoresAtendimento({ valorCobrado, taxaMaquininhaPct, custoFixoPorAtendimento, cargoProfissional, porcComissao, custoVariavel }) {
  const valorMaquininha = r2(valorCobrado * (taxaMaquininhaPct / 100));
  const custoFixo = r2(custoFixoPorAtendimento);
  let valorProfissional = 0;
  if (cargoProfissional === 'FUNCIONARIO' && porcComissao > 0) {
    valorProfissional = r2(valorCobrado * (porcComissao / 100));
  }
  const custoVar = r2(custoVariavel);
  const lucroLiquido = r2(valorCobrado - valorMaquininha - custoFixo - custoVar - valorProfissional);
  const lucroPossivel = r2(valorCobrado - custoFixo - custoVar - valorProfissional);
  return { valorMaquininha, custoFixo, valorProfissional, custoVariavel: custoVar, lucroLiquido, lucroPossivel };
}

// ════════════════════════════════════════════════════════════════
//  HTTP + datas + helpers
// ════════════════════════════════════════════════════════════════
async function api(method, route, body = null, token = null) {
  const opts = { method, headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(45000) };
  if (token) opts.headers['Authorization'] = `Bearer ${token}`;
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE_URL}${route}`, opts);
  let data = null;
  try { data = await res.json(); } catch {}
  return { status: res.status, ok: res.ok, data };
}

const HOJE = new Date();
const MES_ATUAL = `${HOJE.getFullYear()}-${String(HOJE.getMonth() + 1).padStart(2, '0')}`;
const DIA_HOJE = HOJE.getDate();
function addMeses(mes, delta) {
  const [y, m] = mes.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}
const MESES = [addMeses(MES_ATUAL, -2), addMeses(MES_ATUAL, -1), MES_ATUAL];
const MES_ABERTO = MES_ATUAL;
const dataEm = (mes, dia) => `${mes}-${String(dia).padStart(2, '0')}`;

const divergencias = [];
const erros = [];
const achados = [];
function conferir(mes, campo, esperado, veio, tolerancia = 0.01) {
  const diff = r2(Number(veio) - Number(esperado));
  const ok = Math.abs(diff) <= tolerancia;
  if (!ok) divergencias.push({ mes, campo, esperado: Number(esperado), veio: Number(veio), diff });
  console.log(`  ${ok ? '✔' : '✘'} ${campo}: esperado=${esperado} | sistema=${veio}${ok ? '' : ` (DIFF ${diff})`}`);
  return ok;
}
async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log(`  SIMULAÇÃO REALISTA — ${BASE_URL}`);
  console.log('═══════════════════════════════════════════════════');

  const login = await api('POST', '/auth/login', SALAO);
  if (!login.ok) { console.log('❌ LOGIN FALHOU:', login.status, JSON.stringify(login.data)); process.exit(1); }
  const t = login.data.token;
  const salaoId = login.data.salao_id;
  console.log(`✅ Login OK — salao_id: ${salaoId}\n`);

  // ═══════════════════════════════════════════════════════════
  //  FASE 1 — PRECIFICAÇÃO (o que ficou faltando)
  // ═══════════════════════════════════════════════════════════
  if (!SOMENTE_AUDITORIA) {
    console.log('─── FASE 1: Precificação ───');

    // 1a. Custo fixo de ÁGUA (aluguel/energia/internet já existem)
    let cfRes = await api('POST', '/cadastros/custos-fixos', { descricao: 'Água e esgoto', tipo: 'AGUA', valor: 90, valor_mensal: 90 }, t);
    if (!cfRes.ok) cfRes = await api('POST', '/cadastros/custos-fixos', { descricao: 'Água e esgoto', tipo: 'AGUA', valor: 90 }, t);
    if (cfRes.ok) console.log('✅ Custo fixo "Água e esgoto" (R$90) adicionado');
    else if (!JSON.stringify(cfRes.data).toLowerCase().includes('duplic')) erros.push(`custo fixo água: ${JSON.stringify(cfRes.data)}`);
    else console.log('ℹ️ Custo fixo "Água e esgoto" já existia');

    const cfList = (await api('GET', '/cadastros/custos-fixos', null, t)).data.filter(c => c.ativo);
    const totalCustosFixos = r2(cfList.reduce((s, c) => s + Number(c.valor), 0));
    console.log(`   → Total de custos fixos mensais: R$${totalCustosFixos} (${cfList.length} itens)`);

    // 1b. CUSTO FIXO POR ATENDIMENTO = rateio real (total ÷ qtd estimada de atendimentos/mês)
    const cfg = (await api('GET', '/cadastros/configuracoes', null, t)).data[0];
    const qtdEstimada = Number(cfg.qtd_atendimentos_mes) || 100;
    const custoFixoRateado = r2(totalCustosFixos / qtdEstimada); // calcularCustoFixoRateado
    const cfgPut = await api('PUT', `/cadastros/configuracoes/${cfg.id}`, { custo_fixo_por_atendimento: custoFixoRateado }, t);
    if (!cfgPut.ok) { erros.push(`PUT configuracoes: ${JSON.stringify(cfgPut.data)}`); console.log('❌ Configurações'); }
    else console.log(`✅ Custo fixo/atendimento = R$${custoFixoRateado} (rateio: R$${totalCustosFixos} ÷ ${qtdEstimada} atend./mês)`);

    // 1c. GANHO LÍQUIDO DESEJADO em todos os procedimentos
    let procs = (await api('GET', '/cadastros/procedimentos', null, t)).data;
    const GANHOS_DESEJADOS = {
      'Coloração': 60, 'Progressiva': 90, 'Corte Feminino': 30,
      'Limpeza de Pele': 40, 'Manicure': 20, 'Botox Capilar': 50,
    };
    for (const p of procs) {
      const ganho = GANHOS_DESEJADOS[p.nome];
      if (ganho == null) continue;
      const put = await api('PUT', `/cadastros/procedimentos/${p.id}`, { ganho_liquido_desejado: ganho }, t);
      if (!put.ok) erros.push(`PUT ganho desejado ${p.nome}: ${JSON.stringify(put.data)}`);
      else console.log(`✅ Ganho desejado de "${p.nome}": R$${ganho}`);
    }
    // 1d. ENGENHARIA REVERSA — preço a partir do ganho desejado:
    //     precoP = (custoFixo + custoMaterial + ganhoDesejado) / (1 - taxa/100)
    const taxaCfg = Number(cfg.taxa_maquininha_pct);
    const custoMaterialNovo = 22;
    const precoTeorico = r2(r2(custoFixoRateado + custoMaterialNovo + GANHO_DESEJADO_NOVO_PROC) / (1 - taxaCfg / 100));
    const novoProc = {
      nome: 'Escova Modeladora Express', categoria: 'SERVICO_CABELO',
      preco_p: precoTeorico, preco_m: r2(precoTeorico * 1.20), preco_g: r2(precoTeorico * 1.30),
      custo_variavel: custoMaterialNovo, requer_comprimento: 1, ativo: 1,
      ganho_liquido_desejado: GANHO_DESEJADO_NOVO_PROC,
    };
    const procNovoRes = await api('POST', '/cadastros/procedimentos', novoProc, t);
    if (!procNovoRes.ok) { erros.push(`procedimento novo: ${JSON.stringify(procNovoRes.data)}`); console.log('❌ Procedimento (engenharia reversa)'); }
    else {
      procs.push(procNovoRes.data);
      console.log(`✅ Engenharia reversa: "Escova Modeladora Express" com preço R$${precoTeorico}`);
      console.log(`   → fórmula: (R$${custoFixoRateado} + R$${custoMaterialNovo} + R$${GANHO_DESEJADO_NOVO_PROC}) ÷ ${1 - taxaCfg / 100} = R$${precoTeorico}`);
    }

    // 1e. PRODUTOS no catálogo (aba Despesas/Produto)
    for (const pr of [
      { nome: 'Tinta Fantasy 90ml', preco_compra: 55, qtd_aplicacoes: 18, ativo: 1 },
      { nome: 'Esmalte Premium 15ml', preco_compra: 12, qtd_aplicacoes: 30, ativo: 1 },
    ]) {
      const res = await api('POST', '/cadastros/produtos', pr, t);
      if (res.ok) console.log(`✅ Produto "${pr.nome}" no catálogo (R$${pr.preco_compra} / ${pr.qtd_aplicacoes} aplicações)`);
      else if (!JSON.stringify(res.data).toLowerCase().includes('duplic')) erros.push(`produto ${pr.nome}: ${JSON.stringify(res.data)}`);
      else console.log(`ℹ️ Produto "${pr.nome}" já existia`);
    }

    const todosProdutos = (await api('GET', '/cadastros/produtos', null, t)).data;
    const prodPorNome = Object.fromEntries(todosProdutos.map(p => [p.nome, p]));
    const procPorNome = Object.fromEntries(procs.map(p => [p.nome, p]));
    for (const v of [
      { procNome: 'Coloração', prodNome: 'Tinta Fantasy 90ml', qtd_por_uso: 1 },
      { procNome: 'Manicure', prodNome: 'Esmalte Premium 15ml', qtd_por_uso: 1 },
    ]) {
      if (!prodPorNome[v.prodNome] || !procPorNome[v.procNome]) { erros.push(`vínculo: ${v.prodNome} ou ${v.procNome} não encontrado`); continue; }
      const res = await api('POST', '/cadastros/procedimento_produtos', {
        procedimento_id: procPorNome[v.procNome].id, produto_id: prodPorNome[v.prodNome].id, qtd_por_uso: v.qtd_por_uso,
      }, t);
      if (res.ok) console.log(`✅ Vínculo ${v.procNome} → ${v.prodNome} (${v.qtd_por_uso} unid./uso)`);
      else if (!JSON.stringify(res.data).toLowerCase().includes('duplic')) erros.push(`vínculo ${v.procNome}→${v.prodNome}: ${JSON.stringify(res.data)}`);
      else console.log(`ℹ️ Vínculo ${v.procNome}→${v.prodNome} já existia`);
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  FASE 2 — MOVIMENTAÇÕES REALISTAS NO MÊS ABERTO
  // ═══════════════════════════════════════════════════════════
  if (!SOMENTE_AUDITORIA) {
    console.log('\n─── FASE 2: Movimentações no mês aberto (' + MES_ABERTO + ') ───');
    const procsDb = (await api('GET', '/cadastros/procedimentos', null, t)).data;
    const profs = (await api('GET', '/cadastros/profissionais', null, t)).data.filter(p => p.ativo);
    const clientes = (await api('GET', '/cadastros/clientes', null, t)).data;
    const nomeCliente = () => clientes[Math.floor(Math.random() * clientes.length)].nome;
    const precoComprimento = (proc, comp) => {
      if (comp === 'M') return proc.preco_m != null ? Number(proc.preco_m) : r2(Number(proc.preco_p) * 1.2);
      if (comp === 'G') return proc.preco_g != null ? Number(proc.preco_g) : r2(Number(proc.preco_p) * 1.3);
      return Number(proc.preco_p);
    };

    const PLAN = [
      { proc: 'Coloração', comp: 'G', profNome: 'Danielle Rocha', pago: 'total', adicional: true },
      { proc: 'Corte Feminino', comp: 'P', profNome: 'Beatriz Lima', pago: 'total' },
      { proc: 'Progressiva', comp: 'M', profNome: 'Carla Mendes', pago: 'total' },
      { proc: 'Manicure', comp: 'P', profNome: 'Beatriz Lima', pago: 'total' },
      { proc: 'Escova Modeladora Express', comp: 'P', profNome: 'Ana Souza', pago: 'total' },
      { proc: 'Limpeza de Pele', comp: 'P', profNome: 'Danielle Rocha', pago: 'total' },
      { proc: 'Coloração', comp: 'M', profNome: 'Carla Mendes', pago: 'parcial' },
      { proc: 'Botox Capilar', comp: 'P', profNome: 'Danielle Rocha', pago: 'zero' },
      { proc: 'Corte Feminino', comp: 'M', profNome: 'Beatriz Lima', pago: 'total' },
      { proc: 'Manicure', comp: 'G', profNome: 'Carla Mendes', pago: 'total' },
    ];

    const diasUsados = new Set();
    // Tenta dias livres, mas permite reuso (mais de um movimento no mesmo dia é realista)
    const novoDia = () => {
      const maxDia = Math.max(1, DIA_HOJE - 1);
      for (let tent = 0; tent < 30; tent++) {
        const d = 1 + Math.floor(Math.random() * maxDia);
        if (!diasUsados.has(d)) { diasUsados.add(d); return d; }
      }
      return 1 + Math.floor(Math.random() * maxDia);
    };

    for (const item of PLAN) {
      const proc = procsDb.find(p => p.nome === item.proc);
      const prof = profs.find(p => p.nome === item.profNome);
      if (!proc || !prof) { erros.push(`plana ${item.proc}/${item.profNome}: não encontrado`); continue; }
      const vc = precoComprimento(proc, item.comp);
      let vp = 0;
      if (item.pago === 'total') vp = vc;
      else if (item.pago === 'parcial') vp = r2(vc * 0.5);

      const body = {
        cliente: nomeCliente(), profissional_id: prof.id,
        data: dataEm(MES_ABERTO, novoDia()), horario: `${String(9 + Math.floor(Math.random() * 9)).padStart(2, '0')}:00:00`,
        procedimento_id: proc.id, comprimento: item.comp, valor_cobrado: vc, valor_pago: vp, status: 'EXECUTADO',
      };
      if (item.adicional) {
        const procAd = procsDb.find(p => p.nome === 'Corte Feminino');
        body.procedimentos_adicionais = [{ procedimento_id: procAd.id, comprimento: 'P', valor_cobrado: Number(procAd.preco_p) }];
        body.valor_pago = r2(vc + Number(procAd.preco_p));
      }
      const res = await api('POST', '/atendimentos', body, t);
      if (!res.ok) { erros.push(`atendimento ${item.proc}: ${JSON.stringify(res.data)}`); console.log(`❌ Atendimento ${item.proc}`); }
      else console.log(`✅ ${item.proc} (${item.comp}) — ${item.profNome} — R$${body.valor_cobrado} (${item.pago})${item.adicional ? ' + adicional' : ''}`);
    }

    // HomeCare
    for (const [produto, custo, venda] of [['Máscara Reconstrutora 300g', 60, 180], ['Leave-in 200ml', 38, 95]]) {
      const res = await api('POST', '/cadastros/homecare', {
        data: dataEm(MES_ABERTO, novoDia()), cliente: nomeCliente(), produto,
        custo_produto: custo, valor_venda: venda, valor_pago: venda,
      }, t);
      if (!res.ok) erros.push(`homecare: ${JSON.stringify(res.data)}`); else console.log(`✅ HomeCare ${produto}: venda R$${venda}, custo R$${custo}`);
    }

    // Procedimento paralelo
    const carla = profs.find(p => p.nome === 'Carla Mendes');
    const par = await api('POST', '/cadastros/procedimentos-paralelos', {
      data: dataEm(MES_ABERTO, novoDia()), cliente: nomeCliente(), descricao: 'Maquiagem para festa de 15 anos',
      valor: 260, valor_pago: 260, valor_profissional: 104, profissional_id: carla ? carla.id : profs[0].id,
    }, t);
    if (!par.ok) erros.push(`paralelo: ${JSON.stringify(par.data)}`); else console.log('✅ Paralelo "Maquiagem 15 anos" R$260 (R$104 p/ profissional)');

    // Despesas variáveis (tipos válidos do ENUM!)
    for (const d of [
      { data: dataEm(MES_ABERTO, novoDia()), descricao: 'Reposição de tintas e amônia', tipo: 'MATERIAL', valor: 280, valor_pago: 280 },
      { data: dataEm(MES_ABERTO, novoDia()), descricao: 'Manutenção do secador', tipo: 'EQUIPAMENTO', valor: 220, valor_pago: 220 },
      { data: dataEm(MES_ABERTO, novoDia()), descricao: 'Anúncios patrocinados', tipo: 'OUTRO', valor: 250, valor_pago: 250 },
    ]) {
      const res = await api('POST', '/cadastros/despesas', d, t);
      if (!res.ok) erros.push(`despesa ${d.descricao}: ${JSON.stringify(res.data)}`); else console.log(`✅ Despesa "${d.descricao}" (${d.tipo}) R$${d.valor}`);
    }

    // Gasto pessoal
    const gasto = await api('POST', '/cadastros/gastos-pessoais', { data: dataEm(MES_ABERTO, novoDia()), descricao: 'Curso de colorimetria avançada', valor: 320 }, t);
    if (!gasto.ok) {
      const retry = await api('POST', '/cadastros/gastos-pessoais', { descricao: 'Curso de colorimetria avançada', valor: 320 }, t);
      if (!retry.ok) erros.push(`gasto pessoal: ${JSON.stringify(retry.data)}`);
    } else console.log('✅ Gasto pessoal "Curso de colorimetria avançada" R$320');
  }

  // ═══════════════════════════════════════════════════════════
  //  FASE 3 — AUDITORIA FINANCEIRA INDEPENDENTE
  // ═══════════════════════════════════════════════════════════
  console.log('\n─── FASE 3: Auditoria financeira independente ───');
  const [cfg2, cfList2, procsDb2, profsDb2, prodsDb2, vincDb2] = await Promise.all([
    api('GET', '/cadastros/configuracoes', null, t).then(r => r.data[0]),
    api('GET', '/cadastros/custos-fixos', null, t).then(r => r.data.filter(c => c.ativo)),
    api('GET', '/cadastros/procedimentos', null, t).then(r => r.data),
    api('GET', '/cadastros/profissionais', null, t).then(r => r.data),
    api('GET', '/cadastros/produtos', null, t).then(r => r.data),
    api('GET', '/cadastros/procedimento_produtos', null, t).then(r => r.data),
  ]);
  const taxa = Number(cfg2.taxa_maquininha_pct);
  const cfAtend = Number(cfg2.custo_fixo_por_atendimento);
  const prodPorId = Object.fromEntries(prodsDb2.map(p => [p.id, p]));
  const profPorId = Object.fromEntries(profsDb2.map(p => [p.id, p]));

  const cvPorProc = {};
  for (const p of procsDb2) {
    const vinc = vincDb2.filter(v => v.procedimento_id === p.id).map(v => ({
      preco_compra: Number(prodPorId[v.produto_id].preco_compra),
      qtd_aplicacoes: Number(prodPorId[v.produto_id].qtd_aplicacoes),
      qtd_por_uso: Number(v.qtd_por_uso),
    }));
    cvPorProc[p.id] = { nome: p.nome, cv: vinc.length > 0 ? calcularCustoVariavelInsumos(vinc) : Number(p.custo_variavel), dinamico: vinc.length > 0 };
  }
  console.log('\n   Custo variável efetivo por procedimento:');
  for (const v of Object.values(cvPorProc)) console.log(`   • ${v.nome}: R$${v.cv}${v.dinamico ? ' (dinâmico via insumos)' : ''}`);

  const atendRes = await api('GET', '/atendimentos', null, t);
  if (!atendRes.ok) { console.log('❌ Falha ao listar atendimentos:', atendRes.status, JSON.stringify(atendRes.data)); process.exit(1); }
  const atendimentos = Array.isArray(atendRes.data) ? atendRes.data : (atendRes.data.data || []);

  const totalCustosFixosMensais = r2(cfList2.reduce((s, c) => s + Number(c.valor), 0));
  const salariosFixos = r2(profsDb2.filter(p => p.cargo === 'FUNCIONARIO' && p.ativo).reduce((s, p) => s + Number(p.salario_fixo), 0));
  console.log(`\n   Config: taxa maquininha=${taxa}% | custo fixo/atend=R$${cfAtend} | custos fixos mensais=R$${totalCustosFixosMensais} | salários fixos=R$${salariosFixos}`);

  // ── 3a. Verificação LINHA A LINHA de todos os atendimentos ──
  console.log('\n   [3a] Conferência engine × réplica independente (todos os atendimentos):');
  let linhasOk = 0;
  const errosLinha = [];
  for (const a of atendimentos) {
    if (a.status !== 'EXECUTADO') continue;
    const prof = profPorId[a.profissional_id] || { cargo: 'PROPRIETARIO', porcentagem_comissao: 0 };
    const vc = Number(a.valor_cobrado), vp = Number(a.valor_pago);
    const esperado = calcularValoresAtendimento({
      valorCobrado: vc, taxaMaquininhaPct: taxa, custoFixoPorAtendimento: Number(a.custo_fixo),
      cargoProfissional: prof.cargo, porcComissao: Number(prof.porcentagem_comissao), custoVariavel: Number(a.custo_variavel),
    });
    const problemas = [];
    if (Math.abs(Number(a.valor_maquininha) - esperado.valorMaquininha) > 0.01) problemas.push(`maquininha=${a.valor_maquininha}≠${esperado.valorMaquininha}`);
    if (Math.abs(Number(a.valor_profissional) - esperado.valorProfissional) > 0.01) problemas.push(`comissão=${a.valor_profissional}≠${esperado.valorProfissional}`);
    if (Math.abs(Number(a.lucro_liquido) - esperado.lucroLiquido) > 0.01) problemas.push(`lucro=${a.lucro_liquido}≠${esperado.lucroLiquido}`);
    if (Math.abs(Number(a.lucro_possivel) - esperado.lucroPossivel) > 0.01) problemas.push(`lucroPossivel=${a.lucro_possivel}≠${esperado.lucroPossivel}`);
    if (Math.abs(Number(a.valor_pendente) - r2(vc - vp)) > 0.01) problemas.push(`pendente=${a.valor_pendente}≠${r2(vc - vp)}`);
    if (problemas.length) errosLinha.push({ id: a.id, data: String(a.data).slice(0, 10), proc: a.procedimento_nome, problemas });
    else linhasOk++;
  }
  console.log(`   → ${linhasOk} EXECUTADOs conferem com a réplica | ${errosLinha.length} com divergência`);
  for (const e of errosLinha.slice(0, 10)) console.log(`   ✘ [${e.data}] ${e.proc}: ${e.problemas.join('; ')}`);
  if (errosLinha.length > 10) console.log(`   ... +${errosLinha.length - 10} outros`);
  divergencias.push(...errosLinha.map(e => ({ mes: e.data.slice(0, 7), campo: `atendimento ${e.proc} (${e.id.slice(0, 8)})`, esperado: e.problemas.join('; '), veio: '-', diff: null })));

  // ── 3b. Fechamentos dos 3 meses × somas independentes ──
  const relatorio = {
    salao: { ...SALAO, salao_id: salaoId, base: BASE_URL },
    gerado_em: new Date().toISOString(),
    config: { taxa_maquininha_pct: taxa, custo_fixo_por_atendimento: cfAtend, total_custos_fixos_mensais: totalCustosFixosMensais, salarios_fixos: salariosFixos },
    meses: {}, divergencias, erros, achados,
    auditoria_linhas: { ok: linhasOk, erro: errosLinha.length },
  };

  for (const mes of MESES) {
    const get = await api('GET', `/fechamento/${mes}`, null, t);
    if (!get.ok) { erros.push(`GET fechamento ${mes}`); continue; }
    const f = get.data;
    const ini = `${mes}-01`, fim = addMeses(mes, 1) + '-01';
    const doMes = (x) => { const d = String(x.data).slice(0, 10); return d >= ini && d < fim; };

    const ex = atendimentos.filter(a => a.status === 'EXECUTADO' && doMes(a));
    const esp = {
      faturamentoBruto: r2(ex.reduce((s, a) => s + Number(a.valor_cobrado), 0)),
      receitaRecebida: r2(ex.reduce((s, a) => s + Number(a.valor_pago), 0)),
      totalPendente: r2(ex.reduce((s, a) => s + Number(a.valor_pendente), 0)),
      lucroAtendimentosReal: r2(ex.reduce((s, a) => s + Number(a.lucro_liquido), 0)),
      totalAtendimentos: ex.length,
      receitaHomecare: 0, lucroHomecare: 0, receitaParalelos: 0, totalDespesas: 0, totalGastosPessoais: 0,
    };
    for (const r of ((await api('GET', '/cadastros/homecare', null, t)).data || [])) if (doMes(r)) { esp.receitaHomecare = r2(esp.receitaHomecare + Number(r.valor_venda)); esp.lucroHomecare = r2(esp.lucroHomecare + Number(r.valor_venda) - Number(r.custo_produto)); }
    for (const r of ((await api('GET', '/cadastros/procedimentos-paralelos', null, t)).data || [])) if (doMes(r)) esp.receitaParalelos = r2(esp.receitaParalelos + Number(r.valor));
    for (const r of ((await api('GET', '/cadastros/despesas', null, t)).data || [])) if (doMes(r)) esp.totalDespesas = r2(esp.totalDespesas + Number(r.valor));
    // Obs.: gastos_pessoais não tem coluna `data` — o mês é derivado de criado_em (decisão documentada no roadmap)
    for (const r of ((await api('GET', '/cadastros/gastos-pessoais', null, t)).data || [])) {
      const dRef = r.data || r.criado_em;
      const d = String(dRef).slice(0, 10);
      if (d >= ini && d < fim) esp.totalGastosPessoais = r2(esp.totalGastosPessoais + Number(r.valor));
    }

    // Resultado final do mês (mesma fórmula do POST /fechamento e do Dashboard)
    const resultadoFinal = r2(f.lucroAtendimentosReal + f.lucroHomecare - f.totalDespesas - f.totalGastosPessoais - f.totalSalariosFixos);
    const resultadoComCustosFixos = r2(resultadoFinal - totalCustosFixosMensais);

    console.log(`\n📅 ${mes} ${f.isFechado ? '(FECHADO)' : '(aberto)'}`);
    conferir(mes, 'faturamentoBruto', esp.faturamentoBruto, f.faturamentoBruto);
    conferir(mes, 'receitaRecebida', esp.receitaRecebida, f.receitaRecebida);
    conferir(mes, 'totalPendente', esp.totalPendente, f.totalPendente);
    conferir(mes, 'lucroAtendimentosReal', esp.lucroAtendimentosReal, f.lucroAtendimentosReal);
    conferir(mes, 'totalAtendimentos (EXECUTADO)', esp.totalAtendimentos, f.totalAtendimentos);
    conferir(mes, 'receitaHomecare', esp.receitaHomecare, f.receitaHomecare);
    conferir(mes, 'lucroHomecare', esp.lucroHomecare, f.lucroHomecare);
    conferir(mes, 'receitaParalelos', esp.receitaParalelos, f.receitaParalelos);
    conferir(mes, 'totalDespesas', esp.totalDespesas, f.totalDespesas);
    conferir(mes, 'totalGastosPessoais', esp.totalGastosPessoais, f.totalGastosPessoais);
    conferir(mes, 'totalSalariosFixos', salariosFixos, f.totalSalariosFixos);

    console.log(`   💰 Resultado do mês: R$${resultadoFinal} | já descontando os custos fixos mensais (R$${totalCustosFixosMensais}): R$${resultadoComCustosFixos}`);
    relatorio.meses[mes] = {
      independente: esp,
      api: { ...f, resultadoFinal, resultadoComCustosFixos },
      isFechado: f.isFechado,
    };
  }

  // ── 3c. Validação específica da ENGENHARIA REVERSA ──
  console.log('\n   [3c] Validação da engenharia reversa ("Escova Modeladora Express"):');
  const procNovoDb = procsDb2.find(p => p.nome === 'Escova Modeladora Express');
  const atendNovo = procNovoDb ? atendimentos.filter(a => a.procedimento_id === procNovoDb.id && a.status === 'EXECUTADO') : [];
  if (atendNovo.length === 0) {
    console.log('   ⚠️ Nenhum atendimento do procedimento novo — engenharia reversa não validada end-to-end.');
    achados.push('Engenharia reversa: nenhum atendimento do procedimento novo para validação end-to-end.');
  } else {
    for (const a of atendNovo) {
      // Proprietária (sem comissão): lucro deve ser ≈ ganho desejado (tolerância de arredondamento 2 centavos)
      conferir(String(a.data).slice(0, 7), `engenharia reversa — lucro do atendimento = ganho desejado (R$${GANHO_DESEJADO_NOVO_PROC})`, GANHO_DESEJADO_NOVO_PROC, Number(a.lucro_liquido), 0.02);
    }
  }

  // ── Resumo ──
  console.log('\n═══════════════════════════════════════════════════');
  console.log(`  RESULTADO: ${divergencias.length} divergência(s) | ${erros.length} erro(s) de API`);
  console.log('═══════════════════════════════════════════════════');
  if (divergencias.length) divergencias.forEach(d => console.log(`  ✘ [${d.mes}] ${d.campo}: esperado=${d.esperado} | sistema=${d.veio}`));
  if (erros.length) erros.forEach(x => console.log(`  ❌ ${x}`));
  if (achados.length) achados.forEach(x => console.log(`  🔎 ${x}`));

  const outPath = path.join(__dirname, 'simulacao_producao_realista.json');
  fs.writeFileSync(outPath, JSON.stringify(relatorio, null, 2));
  console.log(`\n📁 Relatório salvo em: ${outPath}`);
}

main().catch(e => { console.error('❌ ERRO FATAL:', e); process.exit(1); });







