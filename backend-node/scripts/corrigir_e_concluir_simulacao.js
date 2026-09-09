/**
 * LIMPEZA + CONCLUSÃO DA SIMULAÇÃO REALISTA (PRODUÇÃO)
 *  1. Remove duplicatas criadas por execuções interrompidas:
 *     - custo fixo "Água e esgoto" (mantém 1)
 *     - procedimento "Escova Modeladora Express" (mantém o que tem atendimento vinculado)
 *  2. Corrige custo_fixo_por_atendimento = rateio (total custos fixos ÷ 100)
 *  3. Completa as movimentações do mês aberto que faltam (idempotente)
 *  4. Recria o atendimento da engenharia reversa com o rateio correto
 *  5. Auditoria: reimprime fechamentos dos 3 meses
 */
require('dotenv').config();
const BASE_URL = process.env.BASE_URL || 'https://sal-o-adm-1.onrender.com';
const SALAO = { email: 'beleza.real@teste.com', senha: 'BelezaReal123!' };
const r2 = (v) => Math.round((v + Number.EPSILON) * 100) / 100;

async function api(method, route, body = null, token = null) {
  const opts = { method, headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(60000) };
  if (token) opts.headers['Authorization'] = `Bearer ${token}`;
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE_URL}${route}`, opts);
  let data = null;
  try { data = await res.json(); } catch {}
  return { status: res.status, ok: res.ok, data };
}

const HOJE = new Date();
const MES = `${HOJE.getFullYear()}-${String(HOJE.getMonth() + 1).padStart(2, '0')}`;
const DIA_HOJE = HOJE.getDate();
const dataEm = (dia) => `${MES}-${String(dia).padStart(2, '0')}`;

async function main() {
  const login = await api('POST', '/auth/login', SALAO);
  if (!login.ok) { console.log('❌ LOGIN', login.status); process.exit(1); }
  const t = login.data.token;
  console.log('✅ Login OK\n');

  // ── 1. Deduplicar custo fixo "Água e esgoto" ──
  const cfs = (await api('GET', '/cadastros/custos-fixos', null, t)).data.filter(c => c.ativo);
  const aguas = cfs.filter(c => c.descricao.includes('Água'));
  if (aguas.length > 1) {
    for (const a of aguas.slice(1)) {
      const del = await api('DELETE', `/cadastros/custos-fixos/${a.id}`, null, t);
      console.log(`${del.ok ? '🗑️' : '❌'} custo fixo duplicado removido: ${a.descricao} (${a.id.slice(0, 8)})`);
    }
  } else console.log(`ℹ️ Custos fixos OK (${cfs.length} itens, ${aguas.length} água)`);

  const cfsDepois = (await api('GET', '/cadastros/custos-fixos', null, t)).data.filter(c => c.ativo);
  const totalCF = r2(cfsDepois.reduce((s, c) => s + Number(c.valor), 0));
  const rateio = r2(totalCF / 100);
  console.log(`   → Total custos fixos: R$${totalCF} → rateio/atendimento: R$${rateio}`);

  // ── 2. Corrigir configuração ──
  const cfg = (await api('GET', '/cadastros/configuracoes', null, t)).data[0];
  if (Number(cfg.custo_fixo_por_atendimento) !== rateio) {
    const put = await api('PUT', `/cadastros/configuracoes/${cfg.id}`, { custo_fixo_por_atendimento: rateio }, t);
    console.log(`${put.ok ? '✅' : '❌'} config custo_fixo_por_atendimento = R$${rateio} (antes: ${cfg.custo_fixo_por_atendimento})`);
  } else console.log(`ℹ️ config já está correta (R$${rateio})`);

  // ── 3. Deduplicar procedimento novo; recriar atendimento com rateio correto ──
  const procs = (await api('GET', '/cadastros/procedimentos', null, t)).data;
  const escovas = procs.filter(p => p.nome === 'Escova Modeladora Express');
  const profs = (await api('GET', '/cadastros/profissionais', null, t)).data;
  const clientes = (await api('GET', '/cadastros/clientes', null, t)).data;
  const todosAtend = (await api('GET', '/atendimentos', null, t)).data;
  const atendRes = Array.isArray(todosAtend) ? todosAtend : todosAtend.data || [];
  const escovaComAtendimento = escovas.find(p => atendRes.some(a => a.procedimento_id === p.id));

  for (const p of escovas) {
    if (p.id !== escovaComAtendimento?.id) {
      const del = await api('DELETE', `/cadastros/procedimentos/${p.id}`, null, t);
      console.log(`${del.ok ? '🗑️' : '❌'} procedimento duplicado removido: Escova (R$${p.preco_p}, ${p.id.slice(0, 8)})`);
    }
  }
  if (!escovaComAtendimento) {
    console.log('❌ Nenhum atendimento da Escova encontrado — nada a corrigir');
  } else {
    const atsEscova = atendRes.filter(a => a.procedimento_id === escovaComAtendimento.id);
    const precoOk = r2(r2(rateio + 22 + 45) / (1 - Number(cfg.taxa_maquininha_pct) / 100));
    if (Number(escovaComAtendimento.preco_p) !== precoOk) {
      const put = await api('PUT', `/cadastros/procedimentos/${escovaComAtendimento.id}`, { preco_p: precoOk, preco_m: r2(precoOk * 1.2), preco_g: r2(precoOk * 1.3) }, t);
      console.log(`${put.ok ? '✅' : '❌'} Escova repré-precificada: R$${precoOk} (era R$${escovaComAtendimento.preco_p})`);
    }
    for (const a of atsEscova) {
      if (Number(a.custo_fixo) === rateio) { console.log(`ℹ️ Atendimento da Escova já tem custo fixo R$${rateio} (lucro R$${a.lucro_liquido})`); continue; }
      // PUT /:id/procedimentos recalcula TODOS os valores financeiros com a config atual
      const put = await api('PUT', `/atendimentos/${a.id}/procedimentos`, {
        procedimentos: [{ procedimento_id: escovaComAtendimento.id, comprimento: 'P', valor_cobrado: precoOk, valor_pago: precoOk }],
      }, t);
      console.log(`${put.ok ? '✅' : '❌'} Atendimento da Escova recalculado via PUT /procedimentos (custo fixo R$${rateio})`);
      if (put.ok) {
        const lucroEsperado = r2(precoOk * (1 - Number(cfg.taxa_maquininha_pct) / 100) - rateio - 22);
        console.log(`   → lucro esperado: R$${lucroEsperado} (ganho desejado R$45)`);
      } else console.log(`   resposta: ${JSON.stringify(put.data)}`);
    }
  }
  // ── 4. Completar movimentações do mês aberto (idempotente) ──
  const mesIni = `${MES}-01`, mesFim = `${MES}-${String(DIA_HOJE).padStart(2, '0')}`;
  const doMes = (x) => { const d = String(x.data).slice(0, 10); return d >= mesIni && d <= mesFim; };
  const todosAtend2 = (await api('GET', '/atendimentos', null, t)).data;
  const atendsMes = (Array.isArray(todosAtend2) ? todosAtend2 : todosAtend2.data || []).filter(a => doMes(a) && a.status === 'EXECUTADO');

  const procPorNome = Object.fromEntries((await api('GET', '/cadastros/procedimentos', null, t)).data.map(p => [p.nome, p]));
  const precoComprimento = (proc, comp) => {
    if (comp === 'M') return proc.preco_m != null ? Number(proc.preco_m) : r2(Number(proc.preco_p) * 1.2);
    if (comp === 'G') return proc.preco_g != null ? Number(proc.preco_g) : r2(Number(proc.preco_p) * 1.3);
    return Number(proc.preco_p);
  };
  const existeAtend = (procNome, vc) => atendsMes.some(a => a.procedimento_nome === procNome && Number(a.valor_cobrado) === vc);

  const FALTAM = [
    { proc: 'Botox Capilar', comp: 'P', profNome: 'Danielle Rocha', pago: 'zero' },
    { proc: 'Corte Feminino', comp: 'M', profNome: 'Beatriz Lima', pago: 'total' },
    { proc: 'Manicure', comp: 'G', profNome: 'Carla Mendes', pago: 'total' },
  ];
  const diasUsados = new Set(atendsMes.map(a => new Date(a.data).getUTCDate()));
  // Tenta dias livres, mas permite reuso (mais de um movimento no mesmo dia é realista)
  const novoDia = () => {
    const maxDia = Math.max(1, DIA_HOJE - 1);
    for (let tent = 0; tent < 30; tent++) {
      const d = 1 + Math.floor(Math.random() * maxDia);
      if (!diasUsados.has(d)) { diasUsados.add(d); return d; }
    }
    return 1 + Math.floor(Math.random() * maxDia);
  };

  for (const item of FALTAM) {
    const proc = procPorNome[item.proc];
    const prof = profs.find(p => p.nome === item.profNome);
    const vc = precoComprimento(proc, item.comp);
    if (existeAtend(item.proc, vc)) { console.log(`ℹ️ Atendimento ${item.proc} (${item.comp}) já existe`); continue; }
    const res = await api('POST', '/atendimentos', {
      cliente: clientes[Math.floor(Math.random() * clientes.length)].nome, profissional_id: prof.id,
      data: dataEm(novoDia()), horario: `${String(9 + Math.floor(Math.random() * 9)).padStart(2, '0')}:00:00`,
      procedimento_id: proc.id, comprimento: item.comp, valor_cobrado: vc,
      valor_pago: item.pago === 'total' ? vc : 0, status: 'EXECUTADO',
    }, t);
    console.log(`${res.ok ? '✅' : '❌'} ${item.proc} (${item.comp}) — ${item.profNome} — R$${vc} (${item.pago})`);
  }

  // HomeCare (alvo: 6 total no mês — 4 da simulação original + 2 novos)
  const hc = (await api('GET', '/cadastros/homecare', null, t)).data.filter(h => doMes(h));
  for (const [produto, custo, venda] of [['Máscara Reconstrutora 300g', 60, 180], ['Leave-in 200ml', 38, 95]]) {
    if (hc.some(h => h.produto === produto)) { console.log(`ℹ️ HomeCare "${produto}" já existe`); continue; }
    const res = await api('POST', '/cadastros/homecare', {
      data: dataEm(novoDia()), cliente: clientes[0].nome, produto, custo_produto: custo, valor_venda: venda, valor_pago: venda,
    }, t);
    console.log(`${res.ok ? '✅' : '❌'} HomeCare ${produto}: venda R$${venda}, custo R$${custo}`);
  }

  // Paralelo (alvo: 7 no mês)
  const pls = (await api('GET', '/cadastros/procedimentos-paralelos', null, t)).data.filter(p => doMes(p));
  if (!pls.some(p => p.descricao.includes('15 anos'))) {
    const carla = profs.find(p => p.nome === 'Carla Mendes');
    const res = await api('POST', '/cadastros/procedimentos-paralelos', {
      data: dataEm(novoDia()), cliente: clientes[1].nome, descricao: 'Maquiagem para festa de 15 anos',
      valor: 260, valor_pago: 260, valor_profissional: 104, profissional_id: carla.id,
    }, t);
    console.log(`${res.ok ? '✅' : '❌'} Paralelo "Maquiagem 15 anos" R$260`);
  } else console.log('ℹ️ Paralelo "15 anos" já existe');

  // Despesas (alvo: 5 no mês — 2 anteriores + 3 novas)
  const dps = (await api('GET', '/cadastros/despesas', null, t)).data.filter(d => doMes(d));
  for (const d of [
    { descricao: 'Reposição de tintas e amônia', tipo: 'MATERIAL', valor: 280 },
    { descricao: 'Manutenção do secador', tipo: 'EQUIPAMENTO', valor: 220 },
    { descricao: 'Anúncios patrocinados', tipo: 'OUTRO', valor: 250 },
  ]) {
    if (dps.some(x => x.descricao === d.descricao)) { console.log(`ℹ️ Despesa "${d.descricao}" já existe`); continue; }
    const res = await api('POST', '/cadastros/despesas', { data: dataEm(novoDia()), ...d, valor_pago: d.valor }, t);
    console.log(`${res.ok ? '✅' : '❌'} Despesa "${d.descricao}" (${d.tipo}) R$${d.valor}`);
  }

  // Gasto pessoal (alvo: 7)
  const gps = (await api('GET', '/cadastros/gastos-pessoais', null, t)).data;
  const gpMes = gps.filter(g => g.data ? doMes(g) : false);
  if (!gpMes.some(g => g.descricao === 'Curso de colorimetria avançada')) {
    let res = await api('POST', '/cadastros/gastos-pessoais', { data: dataEm(novoDia()), descricao: 'Curso de colorimetria avançada', valor: 320 }, t);
    if (!res.ok) res = await api('POST', '/cadastros/gastos-pessoais', { descricao: 'Curso de colorimetria avançada', valor: 320 }, t);
    console.log(`${res.ok ? '✅' : '❌'} Gasto pessoal "Curso de colorimetria" R$320`);
  } else console.log('ℹ️ Gasto pessoal "Curso de colorimetria" já existe');

  console.log('CONCLUIDO_PARTE_2');
}
main().catch(e => { console.error('ERRO FATAL:', e); process.exit(1); });
