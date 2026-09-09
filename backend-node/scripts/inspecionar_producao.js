/**
 * INSPEÇÃO DO ESTADO ATUAL — Salão Beleza Real (PRODUÇÃO)
 * Lista: configurações, custos fixos, produtos, vínculos, procedimentos,
 * profissionais, despesas, gastos pessoais, homecare, paralelos e fechamentos.
 */
const BASE_URL = process.env.BASE_URL || 'https://sal-o-adm-1.onrender.com';
const SALAO = { email: process.env.SALAO_EMAIL || 'beleza.real@teste.com', senha: process.env.SALAO_SENHA || 'BelezaReal123!' };

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
function addMeses(mes, delta) {
  const [y, m] = mes.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}
const MESES = [addMeses(MES_ATUAL, -2), addMeses(MES_ATUAL, -1), MES_ATUAL];

async function main() {
  console.log(`Base: ${BASE_URL}`);
  const login = await api('POST', '/auth/login', SALAO);
  if (!login.ok) { console.log('❌ LOGIN:', login.status, JSON.stringify(login.data)); return; }
  const t = login.data.token;
  const perfil = login.data;
  console.log(`✅ Login OK — salao_id: ${perfil.salao_id || '(ver perfil)'}\n`);

  for (const [label, route] of [
    ['CONFIGURAÇÕES', '/cadastros/configuracoes'],
    ['CUSTOS FIXOS', '/cadastros/custos-fixos'],
    ['PRODUTOS (catálogo)', '/cadastros/produtos'],
    ['PROCEDIMENTOS', '/cadastros/procedimentos'],
    ['VÍNCULOS proc-produto', '/cadastros/procedimento_produtos'],
    ['PROFISSIONAIS', '/cadastros/profissionais'],
    ['CLIENTES', '/cadastros/clientes'],
    ['DESPESAS', '/cadastros/despesas'],
    ['GASTOS PESSOAIS', '/cadastros/gastos-pessoais'],
    ['HOMECARE', '/cadastros/homecare'],
    ['PARALELOS', '/cadastros/procedimentos-paralelos'],
  ]) {
    const r = await api('GET', route, null, t);
    if (!r.ok) { console.log(`❌ ${label}: ${r.status} ${JSON.stringify(r.data)}`); continue; }
    const arr = Array.isArray(r.data) ? r.data : (r.data.items || []);
    console.log(`\n── ${label}: ${arr.length} registro(s)`);
    if (arr.length) console.log(JSON.stringify(arr.slice(0, 8), null, 0).slice(0, 1600));
  }

  for (const mes of MESES) {
    const r = await api('GET', `/fechamento/${mes}`, null, t);
    if (!r.ok) { console.log(`\n❌ fechamento ${mes}: ${r.status}`); continue; }
    console.log(`\n── FECHAMENTO ${mes} (isFechado=${r.data.isFechado})`);
    const { mes: _, isFechado: __, ...dados } = r.data;
    console.log(JSON.stringify(dados, null, 0));
  }
}
main().catch(e => { console.error('ERRO FATAL:', e.message); process.exit(1); });
