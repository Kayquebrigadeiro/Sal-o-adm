/**
 * COMPLEMENTO DA VALIDAÇÃO — recria as despesas que falharam por tipo inválido
 * (usando tipos válidos do ENUM) e retesta POST /fechamento + GET /fechamento.
 * Não altera código do backend — apenas reporta.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3334';
const SALAO = { email: 'beleza.real@teste.com', senha: 'BelezaReal123!' };
const MESES = ['2026-07', '2026-08', '2026-09'];

const r2 = (v) => Math.round((v + Number.EPSILON) * 100) / 100;

async function api(method, route, body = null, token = null) {
  const opts = { method, headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(30000) };
  if (token) opts.headers['Authorization'] = `Bearer ${token}`;
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE_URL}${route}`, opts);
  let data = null;
  try { data = await res.json(); } catch {}
  return { status: res.status, ok: res.ok, data };
}

// As 7 despesas que falharam (mes, descricao, valor, tipo_valido)
const REFAZER = [
  { mes: MESES[0], data: '2026-07-09', descricao: 'Manutenção do ar-condicionado', valor: 250, tipo: 'EQUIPAMENTO' },
  { mes: MESES[0], data: '2026-07-22', descricao: 'Impulsionamento no Instagram', valor: 300, tipo: 'OUTRO' },
  { mes: MESES[1], data: '2026-08-25', descricao: 'Compra extra de descolorante', valor: 420, tipo: 'PRODUTO' },
  { mes: MESES[1], data: '2026-08-11', descricao: 'Manutenção da chapinha', valor: 150, tipo: 'EQUIPAMENTO' },
  { mes: MESES[1], data: '2026-08-18', descricao: 'Reposição de esmaltes', valor: 260, tipo: 'PRODUTO' },
  { mes: MESES[2], data: '2026-09-08', descricao: 'Compra de luvas e toucas', valor: 190, tipo: 'PRODUTO' },
  { mes: MESES[2], data: '2026-09-28', descricao: 'Manutenção do secador', valor: 220, tipo: 'EQUIPAMENTO' },
];
// Totais de despesas ESPERADOS após conclusão (3 por mês)
const DESPESAS_ESPERADO = { [MESES[0]]: 730, [MESES[1]]: 830, [MESES[2]]: 750 };

async function main() {
  const login = await api('POST', '/auth/login', SALAO);
  if (!login.ok) throw new Error('login falhou');
  const token = login.data.token;
  console.log('✅ Proprietária logada\n');

  // 1. Recriar despesas com tipo válido
  for (const d of REFAZER) {
    const res = await api('POST', '/cadastros/despesas', {
      data: d.data, descricao: d.descricao, tipo: d.tipo, valor: d.valor, valor_pago: d.valor,
    }, token);
    console.log(`${res.ok ? '✅' : '❌'} Despesa ${d.descricao} (tipo ${d.tipo}): ${res.ok ? 'criada' : JSON.stringify(res.data)}`);
  }

  // 2. Retestar POST /fechamento nos 2 meses antigos
  console.log('\n─── Reteste: POST /fechamento ───');
  const fechamentoReteste = {};
  for (const mes of [MESES[0], MESES[1]]) {
    const post = await api('POST', `/fechamento/${mes}`, null, token);
    fechamentoReteste[mes] = { status: post.status, resposta: post.data };
    console.log(`${post.ok ? '✅' : '❌'} POST /fechamento/${mes} → ${post.status} ${post.ok ? JSON.stringify(post.data) : JSON.stringify(post.data)}`);
  }

  // 3. GET /fechamento × 3 e comparação final
  console.log('\n─── Comparação final ───');
  const divergencias = [];
  for (const mes of MESES) {
    const get = await api('GET', `/fechamento/${mes}`, null, token);
    if (!get.ok) { console.log(`❌ GET fechamento ${mes}`); continue; }
    const a = get.data;
    const linhas = [
      ['faturamentoBruto', a.faturamentoBruto, 'faturamentoBruto'],
      ['receitaRecebida', a.receitaRecebida, 'receitaRecebida'],
      ['totalPendente', a.totalPendente, 'totalPendente'],
      ['lucroAtendimentosReal', a.lucroAtendimentosReal, 'lucroAtendimentosReal'],
      ['totalAtendimentos', a.totalAtendimentos, 'totalAtendimentos'],
      ['receitaHomecare', a.receitaHomecare, 'receitaHomecare'],
      ['lucroHomecare', a.lucroHomecare, 'lucroHomecare'],
      ['receitaParalelos', a.receitaParalelos, 'receitaParalelos'],
      ['totalDespesas', a.totalDespesas, 'despesasValor'],
      ['totalGastosPessoais', a.totalGastosPessoais, 'gastosValor'],
      ['totalSalariosFixos', a.totalSalariosFixos, 'salariosFixos'],
    ];
    console.log(`\n📅 ${mes} ${a.isFechado ? '(FECHADO)' : '(aberto)'}`);
    for (const [campo, apiv] of linhas) console.log(`   api.${campo} = ${apiv}`);
  }

  // 4. Atualizar JSON/CSV da contagem independente
  const jsonPath = path.join(__dirname, 'validacao_final_beleza_real.json');
  const csvPath = path.join(__dirname, 'validacao_final_beleza_real.csv');
  const rel = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  for (const mes of MESES) {
    if (rel.meses[mes]) rel.meses[mes].independente.despesasValor = DESPESAS_ESPERADO[mes];
    if (rel.meses[mes]) rel.meses[mes].independente.despesasQtd = 3;
  }
  rel.complemento = {
    despesas_recriadas_com_tipo_valido: REFAZER,
    reteste_post_fechamento: fechamentoReteste,
    despesas_esperado_por_mes: DESPESAS_ESPERADO,
  };
  fs.writeFileSync(jsonPath, JSON.stringify(rel, null, 2));

  let csv = fs.readFileSync(csvPath, 'utf8');
  for (const mes of MESES) {
    const api_ = rel.meses[mes].api;
    csv += `${mes};total_despesas_apos_complemento;${DESPESAS_ESPERADO[mes]};${api_.totalDespesas};${r2(Number(api_.totalDespesas) - DESPESAS_ESPERADO[mes])};${Math.abs(r2(Number(api_.totalDespesas) - DESPESAS_ESPERADO[mes])) <= 0.01}\n`;
  }
  fs.writeFileSync(csvPath, csv);
  console.log(`\n📁 JSON/CSV atualizados: ${jsonPath}`);
}

main().catch((e) => { console.error('❌ ERRO FATAL:', e); process.exit(1); });
