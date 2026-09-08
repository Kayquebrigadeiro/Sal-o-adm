/**
 * VALIDAÇÃO FINAL PRÉ-LANÇAMENTO — STAGING (porta 3334)
 * Cria o "Salão Beleza Real", simula 3 meses de operação real usando todas as
 * funcionalidades, fecha os 2 meses mais antigos e compara GET /fechamento/:mes
 * contra uma CONTAGEM INDEPENDENTE (réplica própria da financial engine).
 *
 * Uso: node scripts/simular_validacao_final.js
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3334';
const VENDEDOR = { email: 'vendedor-staging@teste.com', senha: 'Staging123!' };
const SALAO = {
  email: 'beleza.real@teste.com',
  senha: 'BelezaReal123!',
  nome: 'Mariana Costa',
  nome_salao: 'Salão Beleza Real',
  telefone: '11988887777',
};
const TAXA_MAQUININHA = 4.5;
const CUSTO_FIXO_ATEND = 25;

// ---------- RNG determinístico (seeded) ----------
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(20260904);
const rand = () => rng();
const randInt = (a, b) => a + Math.floor(rand() * (b - a + 1));
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------- Réplica INDEPENDENTE da financial engine (não importa o módulo do servidor) ----------
const r2 = (v) => Math.round((v + Number.EPSILON) * 100) / 100;
function calcAtendimento({ vc, cargo, pct, cv }) {
  const maq = r2((vc * TAXA_MAQUININHA) / 100);
  const com = cargo === 'FUNCIONARIO' && pct > 0 ? r2((vc * pct) / 100) : 0;
  const cvr = r2(cv);
  return {
    lucro: r2(vc - maq - CUSTO_FIXO_ATEND - cvr - com),
    lucroPossivel: r2(vc - CUSTO_FIXO_ATEND - cvr - com),
    maq, com, cv: cvr,
  };
}
function custoInsumos(produtos) {
  let total = 0;
  for (const p of produtos) {
    const custoPorUso = r2(p.preco_compra / p.qtd_aplicacoes);
    total = r2(total + r2(custoPorUso * p.qtd_por_uso));
  }
  return total;
}

// ---------- Helper HTTP ----------
async function api(method, route, body = null, token = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(30000),
  };
  if (token) opts.headers['Authorization'] = `Bearer ${token}`;
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE_URL}${route}`, opts);
  let data = null;
  try { data = await res.json(); } catch {}
  return { status: res.status, ok: res.ok, data };
}

// ---------- Mês/datas ----------
const HOJE = new Date();
const MES_ATUAL = `${HOJE.getFullYear()}-${String(HOJE.getMonth() + 1).padStart(2, '0')}`;
const DIA_HOJE = HOJE.getDate();
function addMeses(mes, delta) {
  const [y, m] = mes.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}
// 3 meses consecutivos: M-2 e M-1 (a fechar) + mês corrente (fica aberto)
const MESES = [addMeses(MES_ATUAL, -2), addMeses(MES_ATUAL, -1), MES_ATUAL];
const dataEm = (mes, dia) => `${mes}-${String(dia).padStart(2, '0')}`;

// ---------- Massa de dados ----------
const PROFISSIONAIS = [
  { nome: 'Ana Souza', cargo: 'PROPRIETARIO', porcentagem_comissao: 0, salario_fixo: 0, ativo: 1, peso: 0.15 },
  { nome: 'Beatriz Lima', cargo: 'FUNCIONARIO', porcentagem_comissao: 20, salario_fixo: 800, ativo: 1, peso: 0.25 },
  { nome: 'Carla Mendes', cargo: 'FUNCIONARIO', porcentagem_comissao: 30, salario_fixo: 1000, ativo: 1, peso: 0.25 },
  { nome: 'Danielle Rocha', cargo: 'FUNCIONARIO', porcentagem_comissao: 40, salario_fixo: 1200, ativo: 1, peso: 0.35 },
];

const PROCEDIMENTOS = [
  { nome: 'Coloração', categoria: 'SERVICO_CABELO', preco_p: 120, preco_m: 150, preco_g: 180, custo_variavel: 30, requer_comprimento: 1, ativo: 1, manual: true },
  { nome: 'Progressiva', categoria: 'SERVICO_CABELO', preco_p: 250, preco_m: null, preco_g: null, custo_variavel: 100, requer_comprimento: 1, ativo: 1, manual: false },
  { nome: 'Corte Feminino', categoria: 'SERVICO_CABELO', preco_p: 70, preco_m: 90, preco_g: 110, custo_variavel: 5, requer_comprimento: 1, ativo: 1, manual: true },
  { nome: 'Limpeza de Pele', categoria: 'SERVICO_ESTETICA', preco_p: 110, preco_m: null, preco_g: null, custo_variavel: 20, requer_comprimento: 1, ativo: 1, manual: false },
  { nome: 'Manicure', categoria: 'SERVICO_ESTETICA', preco_p: 50, preco_m: 60, preco_g: 75, custo_variavel: 8, requer_comprimento: 1, ativo: 1, manual: true },
  { nome: 'Botox Capilar', categoria: 'PRODUTO_APLICADO', preco_p: 180, preco_m: null, preco_g: null, custo_variavel: 40, requer_comprimento: 1, ativo: 1, manual: false },
];
function precoComprimento(proc, comp) {
  if (comp === 'M') return proc.preco_m != null ? proc.preco_m : r2(proc.preco_p * 1.2);
  if (comp === 'G') return proc.preco_g != null ? proc.preco_g : r2(proc.preco_p * 1.3);
  return proc.preco_p;
}

const PRODUTOS = [
  { nome: 'Matiz Aurora 100ml', preco_compra: 45, qtd_aplicacoes: 15, ativo: 1 },
  { nome: 'Máscara Reconstrutora 300g', preco_compra: 60, qtd_aplicacoes: 20, ativo: 1 },
  { nome: 'Água Oxigenada 40vol', preco_compra: 25, qtd_aplicacoes: 30, ativo: 1 },
  { nome: 'Sérum Capilar 60ml', preco_compra: 80, qtd_aplicacoes: 25, ativo: 1 },
];
// Vínculos procedimento→produto (custo_variável dinâmico substitui o estático)
const VINCULOS = [
  { procNome: 'Coloração', prodNome: 'Matiz Aurora 100ml', qtd_por_uso: 1 },
  { procNome: 'Coloração', prodNome: 'Água Oxigenada 40vol', qtd_por_uso: 1.5 },
  { procNome: 'Progressiva', prodNome: 'Máscara Reconstrutora 300g', qtd_por_uso: 2 },
];

const CLIENTES = [
  ['Juliana Alves', '11991234567'],
  ['Fernanda Dias', '11992345678'],
  ['Patrícia Gomes', '11993456789'],
  ['Renata Freitas', '11994567890'],
  ['Camila Torres', '11995678901'],
  ['Larissa Nunes', '11996789012'],
  ['Vanessa Prado', '11997890123'],
  ['Bianca Rios', '11998901234'],
];

const CUSTOS_FIXOS = [
  { descricao: 'Aluguel do ponto', tipo: 'ALUGUEL', valor: 1200, valor_mensal: 1200 },
  { descricao: 'Energia elétrica', tipo: 'ENERGIA', valor: 300, valor_mensal: 300 },
  { descricao: 'Internet fibra', tipo: 'INTERNET', valor: 150, valor_mensal: 150 },
];

const DESPESAS_VARIAVEIS = [ // 3 por mês
  { descricao: 'Manutenção do ar-condicionado', tipo: 'MANUTENCAO', valor: 250 },
  { descricao: 'Toalhas e uniformes', tipo: 'OUTRO', valor: 180 },
  { descricao: 'Impulsionamento no Instagram', tipo: 'MARKETING', valor: 300 },
  { descricao: 'Compra extra de descolorante', tipo: 'PRODUTOS', valor: 420 },
  { descricao: 'Manutenção da chapinha', tipo: 'MANUTENCAO', valor: 150 },
  { descricao: 'Reposição de esmaltes', tipo: 'PRODUTOS', valor: 260 },
  { descricao: 'Diarista de limpeza', tipo: 'OUTRO', valor: 340 },
  { descricao: 'Compra de luvas e toucas', tipo: 'PRODUTOS', valor: 190 },
  { descricao: 'Manutenção do secador', tipo: 'MANUTENCAO', valor: 220 },
];

// Mês (índice em MESES) em que cada gasto pessoal "aconteceu" — o backend usa
// DATE(criado_em) para atribuir o mês, então enviamos criado_em retroativo.
const GASTOS_PESSOAIS = [
  { descricao: 'Supermercado do mês', valor: 480, mesIdx: 0 },
  { descricao: 'Reforma de óculos', valor: 290, mesIdx: 0 },
  { descricao: 'Plano de saúde', valor: 350, mesIdx: 1 },
  { descricao: 'Farmácia', valor: 220, mesIdx: 1 },
  { descricao: 'Curso de atualização', valor: 450, mesIdx: 2 },
  { descricao: 'Presente de aniversário', valor: 150, mesIdx: 2 },
];

// Plano de atendimentos por mês: [total, executados, cancelados, agendados]
const PLAN_MES = [
  { total: 55, exec: 47, cancel: 8, agend: 0 },  // M-2
  { total: 48, exec: 41, cancel: 7, agend: 0 },  // M-1
  { total: 42, exec: 36, cancel: 4, agend: 2 },  // mês corrente (agendados futuros)
];
const PROCEDIMENTOS_COM_ADICIONAIS_POR_MES = 2; // → 6 atendimentos com adicionais no total

// ---------- Contagem independente ----------
const esperado = {};
for (const m of MESES) {
  esperado[m] = {
    atendTotal: 0, atendExec: 0, atendCancel: 0, atendAgend: 0,
    somaCobrado: 0, somaPago: 0, somaLucro: 0, somaPendente: 0,
    homecareVenda: 0, homecareLucro: 0, homecareQtd: 0,
    paralelosValor: 0, paralelosQtd: 0,
    despesasValor: 0, despesasQtd: 0,
    gastosValor: 0, gastosQtd: 0,
    adicionaisValor: 0, // valor dos adicionais (ver achado: não entra nos totais do POST)
  };
}
const erros = [];
const achados = []; // bugs/comportamentos curiosos

function pickPonderado() {
  const r = rand();
  let acc = 0;
  for (const p of PROFISSIONAIS) {
    acc += p.peso;
    if (r <= acc) return p;
  }
  return PROFISSIONAIS[PROFISSIONAIS.length - 1];
}

async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  VALIDAÇÃO FINAL — Salão Beleza Real (STAGING)');
  console.log(`  Meses simulados: ${MESES.join(', ')} (0=M-2, 1=M-1, 2=corrente)`);
  console.log('═══════════════════════════════════════════════════\n');

  // 1. Login vendedor
  const vendedorLogin = await api('POST', '/auth/login', VENDEDOR);
  if (!vendedorLogin.ok) throw new Error('Falha no login do vendedor: ' + JSON.stringify(vendedorLogin.data));
  const vendedorToken = vendedorLogin.data.token;
  console.log('✅ Vendedor logado');

  // 2. Criar salão (se email já existir, faz login direto)
  let salaoId;
  const createRes = await api('POST', '/salao/criar-proprietaria', { ...SALAO, vendedor_id: vendedorLogin.data.user_id }, vendedorToken);
  if (createRes.ok && createRes.data.salao_id) {
    salaoId = createRes.data.salao_id;
    console.log(`✅ Salão criado. salao_id: ${salaoId}`);
  } else {
    achados.push(`criar-proprietaria não criou (provável email já existente): ${JSON.stringify(createRes.data)} — usando login direto`);
    console.log('⚠️  Salão já existia — usando login direto');
  }
  const propLogin = await api('POST', '/auth/login', { email: SALAO.email, senha: SALAO.senha });
  if (!propLogin.ok) throw new Error('Falha no login da proprietária: ' + JSON.stringify(propLogin.data));
  const propToken = propLogin.data.token;
  salaoId = salaoId || propLogin.data.salao_id;
  if (!salaoId) {
    const lista = await api('GET', '/salao', null, vendedorToken);
    const alvo = (Array.isArray(lista.data) ? lista.data : []).find(s => s.nome === SALAO.nome_salao);
    salaoId = alvo && alvo.id;
  }
  if (!salaoId) throw new Error('salao_id não encontrado');
  console.log(`✅ Proprietária logada (salao_id: ${salaoId})\n`);

  // 3. Configurações
  const cfgList = await api('GET', '/cadastros/configuracoes', null, propToken);
  const cfg = cfgList.data[0];
  const cfgPut = await api('PUT', `/cadastros/configuracoes/${cfg.id}`, { taxa_maquininha_pct: TAXA_MAQUININHA, custo_fixo_por_atendimento: CUSTO_FIXO_ATEND }, propToken);
  if (!cfgPut.ok) { erros.push(`PUT configuracoes: ${JSON.stringify(cfgPut.data)}`); console.log('❌ Configurações'); }
  else console.log(`✅ Configurações: taxa_maquininha=${TAXA_MAQUININHA}%, custo_fixo_atend=${CUSTO_FIXO_ATEND}`);

  // 4. Custos fixos (mensais)
  for (const cf of CUSTOS_FIXOS) {
    let res = await api('POST', '/cadastros/custos-fixos', cf, propToken);
    if (!res.ok) {
      achados.push(`POST custos-fixos rejeitou payload ${JSON.stringify(cf)}: ${JSON.stringify(res.data)} — reenviando sem valor_mensal`);
      const { valor_mensal, ...semVm } = cf;
      res = await api('POST', '/cadastros/custos-fixos', semVm, propToken);
    }
    if (res.ok) console.log(`✅ Custo fixo: ${cf.descricao} R$${cf.valor}/mês`);
    else { erros.push(`custo fixo ${cf.descricao}: ${JSON.stringify(res.data)}`); console.log(`❌ Custo fixo ${cf.descricao}`); }
  }

  // 5. Profissionais
  for (const p of PROFISSIONAIS) {
    const body = { nome: p.nome, cargo: p.cargo, porcentagem_comissao: p.porcentagem_comissao, salario_fixo: p.salario_fixo, ativo: p.ativo };
    const res = await api('POST', '/cadastros/profissionais', body, propToken);
    if (res.ok && res.data.id) { p.id = res.data.id; console.log(`✅ Profissional: ${p.nome} (${p.cargo}, ${p.porcentagem_comissao}%, salário R$${p.salario_fixo})`); }
    else { erros.push(`profissional ${p.nome}: ${JSON.stringify(res.data)}`); console.log(`❌ Profissional ${p.nome}`); }
  }

  // 6. Procedimentos (3 com P/M/G manual, 3 só com P para testar fallback 1.2x/1.3x)
  for (const p of PROCEDIMENTOS) {
    const body = { nome: p.nome, categoria: p.categoria, preco_p: p.preco_p, preco_m: p.preco_m, preco_g: p.preco_g, custo_variavel: p.custo_variavel, requer_comprimento: p.requer_comprimento, ativo: p.ativo };
    const res = await api('POST', '/cadastros/procedimentos', body, propToken);
    if (res.ok && res.data.id) { p.id = res.data.id; console.log(`✅ Procedimento: ${p.nome} (P=${p.preco_p}, M=${p.preco_m ?? 'fallback'}, G=${p.preco_g ?? 'fallback'}, ${p.categoria})`); }
    else { erros.push(`procedimento ${p.nome}: ${JSON.stringify(res.data)}`); console.log(`❌ Procedimento ${p.nome}`); }
  }
  const procsDb = await api('GET', '/cadastros/procedimentos', null, propToken);
  for (const p of PROCEDIMENTOS.filter(x => !x.manual)) {
    const row = (procsDb.data || []).find(r => r.id === p.id);
    if (row) achados.push(`Fallback P/M/G de "${p.nome}": preco_m=${row.preco_m}, preco_g=${row.preco_g} no banco ${row.preco_m == null ? '(NULL — o backend Node NÃO aplica o fallback 1.2x/1.3x no cadastro; em produção isso era trigger do Postgres)' : '(preenchido automaticamente)'}`);
  }

  // 7. Produtos no catálogo + vínculos procedimento_produtos (custo variável dinâmico)
  for (const pr of PRODUTOS) {
    const res = await api('POST', '/cadastros/produtos', pr, propToken);
    if (res.ok && res.data.id) { pr.id = res.data.id; console.log(`✅ Produto: ${pr.nome} (compra R$${pr.preco_compra} / ${pr.qtd_aplicacoes} aplicações)`); }
    else { erros.push(`produto ${pr.nome}: ${JSON.stringify(res.data)}`); console.log(`❌ Produto ${pr.nome}`); }
  }
  for (const v of VINCULOS) {
    const proc = PROCEDIMENTOS.find(p => p.nome === v.procNome);
    const prod = PRODUTOS.find(p => p.nome === v.prodNome);
    const res = await api('POST', '/cadastros/procedimento_produtos', { procedimento_id: proc.id, produto_id: prod.id, qtd_por_uso: v.qtd_por_uso }, propToken);
    if (res.ok) console.log(`✅ Vínculo: ${v.procNome} ← ${v.prodNome} (qtd/uso ${v.qtd_por_uso})`);
    else { erros.push(`vínculo ${v.procNome}-${v.prodNome}: ${JSON.stringify(res.data)}`); console.log(`❌ Vínculo ${v.procNome}-${v.prodNome}`); }
  }
  // Custo variável EFETIVO (insumos quando vinculado; estático senão) — igual ao servidor
  const cvEfetivo = {};
  for (const p of PROCEDIMENTOS) {
    const vinc = VINCULOS.filter(v => v.procNome === p.nome).map(v => {
      const prod = PRODUTOS.find(pr => pr.nome === v.prodNome);
      return { preco_compra: prod.preco_compra, qtd_aplicacoes: prod.qtd_aplicacoes, qtd_por_uso: v.qtd_por_uso };
    });
    cvEfetivo[p.id] = vinc.length > 0 ? custoInsumos(vinc) : p.custo_variavel;
    if (vinc.length > 0) console.log(`   → custo variável DINÂMICO de ${p.nome}: R$${cvEfetivo[p.id]} (estático seria R$${p.custo_variavel})`);
  }

  // 8. Clientes
  for (const [nome, telefone] of CLIENTES) {
    const res = await api('POST', '/cadastros/clientes', { nome, telefone }, propToken);
    if (!res.ok) { erros.push(`cliente ${nome}: ${JSON.stringify(res.data)}`); console.log(`❌ Cliente ${nome}`); }
  }
  console.log(`✅ ${CLIENTES.length} clientes criados\n`);

  // 9. ATENDIMENTOS — 3 meses (PASSO 3)
  console.log('─── Gerando atendimentos (3 meses) ───');
  let adicionaisNoMes = 0;
  let adicionaisCriados = 0;
  for (let mi = 0; mi < MESES.length; mi++) {
    const mes = MESES[mi];
    const plan = PLAN_MES[mi];
    const statusArr = shuffle([
      ...Array(plan.exec).fill('EXECUTADO'),
      ...Array(plan.cancel).fill('CANCELADO'),
      ...Array(plan.agend).fill('AGENDADO'),
    ]);
    adicionaisNoMes = PROCEDIMENTOS_COM_ADICIONAIS_POR_MES;
    const e = esperado[mes];

    for (let i = 0; i < plan.total; i++) {
      const status = statusArr[i];
      const proc = PROCEDIMENTOS[Math.floor(rand() * PROCEDIMENTOS.length)];
      const rC = rand();
      const comp = rC < 0.6 ? 'P' : rC < 0.85 ? 'M' : 'G';
      const vc = precoComprimento(proc, comp);
      const prof = pickPonderado();

      // Datas espalhadas; no mês corrente, EXEC/CANCELADO até ontem e AGENDADO no futuro
      let dia;
      if (status === 'AGENDADO') dia = randInt(DIA_HOJE + 2, 27);
      else if (mes === MES_ATUAL) dia = randInt(1, Math.max(1, DIA_HOJE - 1));
      else dia = randInt(1, 27);

      // Pagamento: ~85% quitado, ~7% zero, ~8% parcial (só EXECUTADO)
      let vp = 0;
      if (status === 'EXECUTADO') {
        const r = rand();
        if (r < 0.85) vp = vc;
        else if (r < 0.92) vp = 0;
        else vp = r2(vc * (0.4 + rand() * 0.5));
      }

      const body = {
        cliente: pick(CLIENTES)[0],
        profissional_id: prof.id,
        data: dataEm(mes, dia),
        horario: `${String(randInt(9, 18)).padStart(2, '0')}:${pick(['00', '15', '30', '45'])}:00`,
        procedimento_id: proc.id,
        comprimento: comp,
        valor_cobrado: vc,
        valor_pago: vp,
        status,
      };

      // Até 2 atendimentos EXECUTADO por mês levam procedimentos adicionais
      if (status === 'EXECUTADO' && adicionaisNoMes > 0) {
        const qtdAd = randInt(1, 2);
        body.procedimentos_adicionais = [];
        for (let k = 0; k < qtdAd; k++) {
          const procAd = PROCEDIMENTOS[Math.floor(rand() * PROCEDIMENTOS.length)];
          body.procedimentos_adicionais.push({
            procedimento_id: procAd.id,
            comprimento: 'P',
            valor_cobrado: procAd.preco_p,
          });
          e.adicionaisValor += procAd.preco_p;
          adicionaisCriados++;
        }
        adicionaisNoMes--;
      }

      const res = await api('POST', '/atendimentos', body, propToken);
      if (!res.ok) { erros.push(`atendimento ${body.data}: ${JSON.stringify(res.data)}`); console.log(`❌ Atendimento ${body.data} ${status}`); continue; }

      e.atendTotal++;
      if (status === 'EXECUTADO') {
        e.atendExec++;
        e.somaCobrado = r2(e.somaCobrado + vc);
        e.somaPago = r2(e.somaPago + vp);
        e.somaPendente = r2(e.somaPendente + r2(vc - vp));
        const calc = calcAtendimento({ vc, cargo: prof.cargo, pct: prof.porcentagem_comissao, cv: cvEfetivo[proc.id] });
        e.somaLucro = r2(e.somaLucro + calc.lucro);
      } else if (status === 'CANCELADO') e.atendCancel++;
      else if (status === 'AGENDADO') e.atendAgend++;
    }
    console.log(`✅ ${mes}: ${plan.total} atendimentos criados (alvo ${plan.exec}E/${plan.cancel}C/${plan.agend}A)`);
  }
  console.log(`   → ${adicionaisCriados} procedimentos adicionais criados\n`);

  // 10. HomeCare — 4 vendas/mês (PASSO 4)
  console.log('─── HomeCare, Paralelos, Despesas e Gastos Pessoais ───');
  const PROD_HOMECARE = ['Shampoo Profissional 500ml', 'Máscara Reconstrutora 300g', 'Leave-in 200ml', 'Ampola de Queratina'];
  for (let mi = 0; mi < MESES.length; mi++) {
    const mes = MESES[mi];
    const e = esperado[mes];
    for (let i = 0; i < 4; i++) {
      const venda = randInt(80, 320);
      const custo = randInt(25, 110);
      const r = rand();
      const pago = r < 0.8 ? venda : r < 0.9 ? 0 : r2(venda * 0.5);
      const res = await api('POST', '/cadastros/homecare', {
        data: dataEm(mes, randInt(1, 27)),
        cliente: pick(CLIENTES)[0],
        produto: pick(PROD_HOMECARE),
        custo_produto: custo,
        valor_venda: venda,
        valor_pago: pago,
      }, propToken);
      if (!res.ok) { erros.push(`homecare ${mes}: ${JSON.stringify(res.data)}`); console.log(`❌ Homecare ${mes}`); continue; }
      e.homecareQtd++;
      e.homecareVenda = r2(e.homecareVenda + venda);
      e.homecareLucro = r2(e.homecareLucro + r2(venda - custo));
    }
  }
  console.log('✅ 12 vendas de HomeCare criadas');

  // 11. Procedimentos Paralelos — 2/mês
  const PARALELOS_DESC = ['Penteado para formatura', 'Maquiagem para festa', 'Penteado para casamento', 'Maquiagem editorial', 'Penteado infantil para festa', 'Maquiagem noiva (prova)'];
  let parIdx = 0;
  for (let mi = 0; mi < MESES.length; mi++) {
    const mes = MESES[mi];
    const e = esperado[mes];
    for (let i = 0; i < 2; i++) {
      const valor = randInt(120, 280);
      const prof = pickPonderado();
      const res = await api('POST', '/cadastros/procedimentos-paralelos', {
        data: dataEm(mes, randInt(1, 27)),
        cliente: pick(CLIENTES)[0],
        descricao: PARALELOS_DESC[parIdx++ % PARALELOS_DESC.length],
        valor,
        valor_pago: valor,
        valor_profissional: r2(valor * 0.4),
        profissional_id: prof.id,
      }, propToken);
      if (!res.ok) { erros.push(`paralelo ${mes}: ${JSON.stringify(res.data)}`); console.log(`❌ Paralelo ${mes}`); continue; }
      e.paralelosQtd++;
      e.paralelosValor = r2(e.paralelosValor + valor);
    }
  }
  console.log('✅ 6 procedimentos paralelos criados');

  // 12. Despesas variáveis — 3/mês (os custos fixos ficam em custos_fixos_itens)
  for (let mi = 0; mi < MESES.length; mi++) {
    const mes = MESES[mi];
    const e = esperado[mes];
    for (const d of DESPESAS_VARIAVEIS.slice(mi * 3, mi * 3 + 3)) {
      const res = await api('POST', '/cadastros/despesas', {
        data: dataEm(mes, randInt(1, 27)),
        descricao: d.descricao,
        tipo: d.tipo,
        valor: d.valor,
        valor_pago: d.valor,
      }, propToken);
      if (!res.ok) { erros.push(`despesa ${d.descricao}: ${JSON.stringify(res.data)}`); console.log(`❌ Despesa ${d.descricao}`); continue; }
      e.despesasQtd++;
      e.despesasValor = r2(e.despesasValor + d.valor);
    }
  }
  console.log('✅ 9 despesas variáveis criadas');

  // 13. Gastos Pessoais — 6, espalhados pelos 3 meses via criado_em retroativo
  for (const g of GASTOS_PESSOAIS) {
    const mes = MESES[g.mesIdx];
    const e = esperado[mes];
    const res = await api('POST', '/cadastros/gastos-pessoais', {
      descricao: g.descricao,
      valor: g.valor,
      criado_em: `${mes}-05 10:00:00`,
    }, propToken);
    if (!res.ok) {
      // fallback: sem criado_em (cai no mês corrente) — registrar achado
      const res2 = await api('POST', '/cadastros/gastos-pessoais', { descricao: g.descricao, valor: g.valor }, propToken);
      achados.push(`gasto_pessoal "${g.descricao}": envio de criado_em retroativo falhou (${JSON.stringify(res.data)}) — recriado sem criado_em (contará no mês corrente)`);
      if (!res2.ok) { erros.push(`gasto ${g.descricao}: ${JSON.stringify(res2.data)}`); continue; }
      esperado[MES_ATUAL].gastosQtd++;
      esperado[MES_ATUAL].gastosValor = r2(esperado[MES_ATUAL].gastosValor + g.valor);
      continue;
    }
    e.gastosQtd++;
    e.gastosValor = r2(e.gastosValor + g.valor);
  }
  console.log('✅ 6 gastos pessoais criados\n');

  // 14. FECHAR OS 2 MESES MAIS ANTIGOS (PASSO 5)
  console.log('─── Fechamento dos 2 meses mais antigos ───');
  const fechamentoInfo = {};
  for (const mes of [MESES[0], MESES[1]]) {
    const post1 = await api('POST', `/fechamento/${mes}`, null, propToken);
    if (!post1.ok) { erros.push(`POST fechamento ${mes}: ${JSON.stringify(post1.data)}`); console.log(`❌ Fechar ${mes}`); continue; }
    console.log(`✅ ${mes} fechado (fechamentoId: ${post1.data.fechamentoId})`);

    const post2 = await api('POST', `/fechamento/${mes}`, null, propToken);
    if (post2.status === 400) console.log(`✅ Re-fechamento de ${mes} corretamente bloqueado: "${post2.data.error}"`);
    else { achados.push(`Re-fechamento de ${mes} deveria dar 400, retornou ${post2.status}: ${JSON.stringify(post2.data)}`); console.log(`⚠️  Re-fechamento de ${mes} não bloqueou (status ${post2.status})`); }
    fechamentoInfo[mes] = { fechadoComSucesso: true, erroRefechamento: post2.status === 400 ? post2.data.error : null };
  }

  // Guarda anti-edição: criar atendimento em mês fechado deve dar 403
  const guardTest = await api('POST', '/atendimentos', {
    cliente: 'Teste Guarda', profissional_id: PROFISSIONAIS[1].id,
    data: dataEm(MESES[0], 15), horario: '10:00:00',
    procedimento_id: PROCEDIMENTOS[2].id, valor_cobrado: PROCEDIMENTOS[2].preco_p, valor_pago: 0,
  }, propToken);
  if (guardTest.status === 403) console.log(`✅ Guarda de mês fechado OK: criação em ${MESES[0]} bloqueada (403)`);
  else { achados.push(`Guarda de mês fechado: POST /atendimentos em ${MESES[0]} retornou ${guardTest.status} (esperado 403): ${JSON.stringify(guardTest.data)}`); console.log(`⚠️  Guarda de mês fechado não bloqueou (status ${guardTest.status})`); }

  // 15. GET /fechamento/:mes × 3 e comparação (PASSO 6)
  console.log('\n─── Comparação: contagem independente × GET /fechamento ───');
  const salariosFixosEsperado = r2(PROFISSIONAIS.filter(p => p.cargo === 'FUNCIONARIO' && p.ativo).reduce((s, p) => s + p.salario_fixo, 0));
  const divergencias = [];
  const relatorio = { salao: { ...SALAO, salao_id: salaoId }, gerado_em: new Date().toISOString(), meses: {} };

  for (const mes of MESES) {
    const get = await api('GET', `/fechamento/${mes}`, null, propToken);
    if (!get.ok) { erros.push(`GET fechamento ${mes}: ${JSON.stringify(get.data)}`); console.log(`❌ GET fechamento ${mes}`); continue; }
    const api_ = get.data;
    const e = esperado[mes];

    const linhas = [
      ['faturamentoBruto (soma valor_cobrado EXECUTADO)', e.somaCobrado, api_.faturamentoBruto],
      ['receitaRecebida (soma valor_pago EXECUTADO)', e.somaPago, api_.receitaRecebida],
      ['totalPendente', e.somaPendente, api_.totalPendente],
      ['lucroAtendimentosReal (soma lucro_liquido EXECUTADO)', e.somaLucro, api_.lucroAtendimentosReal],
      ['totalAtendimentos (EXECUTADO)', e.atendExec, api_.totalAtendimentos],
      ['receitaHomecare', e.homecareVenda, api_.receitaHomecare],
      ['lucroHomecare', e.homecareLucro, api_.lucroHomecare],
      ['receitaParalelos', e.paralelosValor, api_.receitaParalelos],
      ['totalDespesas (tabela despesas)', e.despesasValor, api_.totalDespesas],
      ['totalGastosPessoais', e.gastosValor, api_.totalGastosPessoais],
      ['totalSalariosFixos (FUNCIONARIO ativo)', salariosFixosEsperado, api_.totalSalariosFixos],
    ];

    console.log(`\n📅 ${mes} ${api_.isFechado ? '(FECHADO)' : '(aberto)'}`);
    for (const [nome, esp, apiv] of linhas) {
      const diff = r2(Number(apiv) - Number(esp));
      const okFlag = Math.abs(diff) <= 0.01;
      if (!okFlag) divergencias.push({ mes, campo: nome, esperado: Number(esp), api: Number(apiv), diff });
      console.log(`  ${okFlag ? '✔' : '✘'} ${nome}: esperado=${esp} | api=${apiv} ${okFlag ? '' : `(DIFF ${diff})`}`);
    }

    relatorio.meses[mes] = {
      independente: { ...e, salariosFixos: salariosFixosEsperado },
      api: api_,
      isFechado: api_.isFechado,
    };
  }

  // 16. Persistir contagem independente (JSON "planilha" + CSV)
  const outDir = __dirname;
  const jsonPath = path.join(outDir, 'validacao_final_beleza_real.json');
  const csvPath = path.join(outDir, 'validacao_final_beleza_real.csv');
  relatorio.divergencias = divergencias;
  relatorio.erros = erros;
  relatorio.achados = achados;
  fs.writeFileSync(jsonPath, JSON.stringify(relatorio, null, 2));

  let csv = 'mes;campo;esperado;api;diferenca;ok\n';
  for (const mes of MESES) {
    const r = relatorio.meses[mes];
    if (!r) continue;
    csv += `${mes};atendimentos_criados;${r.independente.atendTotal};-;-;-\n`;
    csv += `${mes};atendimentos_EXECUTADO;${r.independente.atendExec};${r.api.totalAtendimentos};${r2(r.api.totalAtendimentos - r.independente.atendExec)};${r.independente.atendExec === r.api.totalAtendimentos}\n`;
    csv += `${mes};atendimentos_CANCELADO;${r.independente.atendCancel};-;-;-\n`;
    csv += `${mes};atendimentos_AGENDADO;${r.independente.atendAgend};-;-;-\n`;
    const pares = [
      ['faturamento_bruto', r.independente.somaCobrado, r.api.faturamentoBruto],
      ['receita_recebida', r.independente.somaPago, r.api.receitaRecebida],
      ['total_pendente', r.independente.somaPendente, r.api.totalPendente],
      ['lucro_liquido_atendimentos', r.independente.somaLucro, r.api.lucroAtendimentosReal],
      ['receita_homecare', r.independente.homecareVenda, r.api.receitaHomecare],
      ['lucro_homecare', r.independente.homecareLucro, r.api.lucroHomecare],
      ['receita_paralelos', r.independente.paralelosValor, r.api.receitaParalelos],
      ['total_despesas', r.independente.despesasValor, r.api.totalDespesas],
      ['total_gastos_pessoais', r.independente.gastosValor, r.api.totalGastosPessoais],
      ['salarios_fixos', r.independente.salariosFixos, r.api.totalSalariosFixos],
    ];
    for (const [campo, esp, apiv] of pares) {
      csv += `${mes};${campo};${esp};${apiv};${r2(Number(apiv) - Number(esp))};${Math.abs(r2(Number(apiv) - Number(esp))) <= 0.01}\n`;
    }
  }
  fs.writeFileSync(csvPath, csv);

  // 17. Resumo final
  console.log('\n═══════════════════════════════════════════════════');
  console.log(`  RESULTADO: ${divergencias.length} divergência(s) | ${erros.length} erro(s) de API | ${achados.length} achado(s)`);
  console.log('═══════════════════════════════════════════════════');
  if (divergencias.length) {
    console.log('\n⚠️  DIVERGÊNCIAS (não corrigidas — apenas reportadas):');
    divergencias.forEach(d => console.log(`  • [${d.mes}] ${d.campo}: esperado=${d.esperado} | api=${d.api} | diff=${d.diff}`));
  }
  if (erros.length) {
    console.log('\n❌ ERROS DE API:');
    erros.forEach(x => console.log(`  • ${x}`));
  }
  if (achados.length) {
    console.log('\n🔎 ACHADOS / COMPORTAMENTOS:');
    achados.forEach(x => console.log(`  • ${x}`));
  }
  console.log(`\n📁 Contagem independente salva em:\n   ${jsonPath}\n   ${csvPath}`);






}

main().catch((e) => { console.error('❌ ERRO FATAL:', e); process.exit(1); });


