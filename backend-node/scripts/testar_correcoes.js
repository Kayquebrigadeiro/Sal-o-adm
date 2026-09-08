/**
 * TESTE DAS CORREÇÕES pós-validação (staging, porta 3334)
 * 1. POST /fechamento jul+ago (dados da simulação Beleza Real) + re-fechamento 400 + GET
 * 2. POST /atendimentos com procedimento adicional → valor_cobrado agregado
 * 3. POST /despesas com tipo inválido → 400 com mensagem clara
 * 4. POST /procedimentos sem preco_m/g → fallback 1.2x/1.3x
 * + guarda de mês fechado (403) após o fechamento funcionar
 */
const BASE_URL = 'http://localhost:3334';
const SALAO = { email: 'beleza.real@teste.com', senha: 'BelezaReal123!' };
const MES_JUL = '2026-07', MES_AGO = '2026-08', MES_SET = '2026-09';

let pass = 0, fail = 0;
const check = (label, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ✅ ${label}`); }
  else { fail++; console.log(`  ❌ ${label}${detail ? ' — ' + detail : ''}`); }
};

async function api(method, route, body = null, token = null) {
  const opts = { method, headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(30000) };
  if (token) opts.headers['Authorization'] = `Bearer ${token}`;
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE_URL}${route}`, opts);
  let data = null;
  try { data = await res.json(); } catch {}
  return { status: res.status, ok: res.ok, data };
}

async function main() {
  const login = await api('POST', '/auth/login', SALAO);
  check('Login proprietária', login.ok && !!login.data.token);
  const token = login.data.token;

  // IDs necessários
  const procs = await api('GET', '/cadastros/procedimentos', null, token);
  const corte = procs.data.find(p => p.nome === 'Corte Feminino');
  const profs = await api('GET', '/cadastros/profissionais', null, token);
  const prop = profs.data.find(p => p.cargo === 'PROPRIETARIO');

  console.log('\n── BUG 1 (crítico): POST /fechamento ──');
  const f1 = await api('POST', `/fechamento/${MES_JUL}`, null, token);
  const f1Ok = f1.status === 200 || (f1.status === 400 && /já fechado/i.test(f1.data?.error || ''));
  check(`POST /fechamento/${MES_JUL} → 200 (ou já fechado, se re-execução)`, f1Ok, JSON.stringify(f1.data));
  const f2 = await api('POST', `/fechamento/${MES_AGO}`, null, token);
  const f2Ok = f2.status === 200 || (f2.status === 400 && /já fechado/i.test(f2.data?.error || ''));
  check(`POST /fechamento/${MES_AGO} → 200 (ou já fechado, se re-execução)`, f2Ok, JSON.stringify(f2.data));

  const r1 = await api('POST', `/fechamento/${MES_JUL}`, null, token);
  check(`Re-fechamento ${MES_JUL} → 400 "Mês já fechado"`, r1.status === 400 && /já fechado/i.test(r1.data?.error || ''), JSON.stringify(r1.data));
  const r2 = await api('POST', `/fechamento/${MES_AGO}`, null, token);
  check(`Re-fechamento ${MES_AGO} → 400 "Mês já fechado"`, r2.status === 400 && /já fechado/i.test(r2.data?.error || ''), JSON.stringify(r2.data));

  const g1 = await api('GET', `/fechamento/${MES_JUL}`, null, token);
  check(`${MES_JUL} GET isFechado=true`, g1.data?.isFechado === true);
  check(`${MES_JUL} faturamentoBruto=7228 (esperado do relatório)`, Number(g1.data?.faturamentoBruto) === 7228, `api=${g1.data?.faturamentoBruto}`);
  check(`${MES_JUL} lucroAtendimentosReal=3011.46`, Number(g1.data?.lucroAtendimentosReal) === 3011.46, `api=${g1.data?.lucroAtendimentosReal}`);

  const g2 = await api('GET', `/fechamento/${MES_AGO}`, null, token);
  check(`${MES_AGO} GET isFechado=true`, g2.data?.isFechado === true);
  check(`${MES_AGO} faturamentoBruto=6074`, Number(g2.data?.faturamentoBruto) === 6074, `api=${g2.data?.faturamentoBruto}`);
  check(`${MES_AGO} lucroAtendimentosReal=2988.30`, Number(g2.data?.lucroAtendimentosReal) === 2988.3, `api=${g2.data?.lucroAtendimentosReal}`);

  const g3 = await api('GET', `/fechamento/${MES_SET}`, null, token);
  check(`${MES_SET} (corrente) GET isFechado=false`, g3.data?.isFechado === false);

  // Snapshot no banco (valores salvos em fechamentos)
  const mysql = require('mysql2/promise');
  require('dotenv').config();
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST, port: +process.env.DB_PORT, user: process.env.DB_USER,
    password: process.env.DB_PASSWORD, database: process.env.DB_NAME,
    ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: false },
  });
  const [snaps] = await conn.query(
    `SELECT mes, faturamento_bruto, lucro_liquido, resultado_final FROM fechamentos WHERE salao_id = ? ORDER BY mes`,
    [login.data.salao_id]
  );
  for (const s of snaps) {
    check(`Snapshot ${JSON.stringify(s.mes).slice(1, 8)} persistido com resultado_final finito`,
      Number.isFinite(Number(s.resultado_final)), JSON.stringify(s));
  }
  console.log(`   snapshots: ${snaps.map(s => `${JSON.stringify(s.mes).slice(1, 8)} fb=${s.faturamento_bruto} ll=${s.lucro_liquido} rf=${s.resultado_final}`).join(' | ')}`);

  console.log('\n── BUG 2: procedimentos_adicionais agregados no POST ──');
  const ate = await api('POST', '/atendimentos', {
    cliente: 'TESTE BUG2 (excluir)', profissional_id: prop.id,
    data: `${MES_SET}-20`, horario: '15:00:00',
    procedimento_id: corte.id, comprimento: 'P',
    valor_cobrado: 100, valor_pago: 100, status: 'AGENDADO',
    procedimentos_adicionais: [{ procedimento_id: corte.id, comprimento: 'P', valor_cobrado: 50 }],
  }, token);
  check('POST atendimento com adicional → 201', ate.status === 201, JSON.stringify(ate.data));
  check('valor_cobrado retornado = 150 (100 principal + 50 adicional)', Number(ate.data?.valor_cobrado) === 150, `api=${ate.data?.valor_cobrado}`);
  check('lucro_liquido agregado = 83.25 (150 - 6.75 maq - 50 cf(2x25) - 10 cv)', Number(ate.data?.lucro_liquido) === 83.25, `api=${ate.data?.lucro_liquido}`);
  const ateGet = await api('GET', `/atendimentos/${ate.data.id}`, null, token);
  check('Persistido no banco: valor_cobrado=150', Number(ateGet.data?.valor_cobrado) === 150, `db=${ateGet.data?.valor_cobrado}`);
  check('Persistido no banco: lucro_liquido=83.25', Number(ateGet.data?.lucro_liquido) === 83.25, `db=${ateGet.data?.lucro_liquido}`);
  check('Procedimento adicional gravado (1 linha)', (ateGet.data?.procedimentos_adicionais || []).length === 1);
  const ateIdParaLimpar = ate.data?.id;

  console.log('\n── BUG 3: tipo de despesa inválido → 400 ──');
  const dInv = await api('POST', '/cadastros/despesas', { data: `${MES_SET}-21`, descricao: 'TESTE TIPO INVÁLIDO', tipo: 'INVALIDO', valor: 10 }, token);
  check('POST /despesas tipo INVALIDO → 400', dInv.status === 400, JSON.stringify(dInv.data));
  check('Mensagem clara com os tipos válidos', /tipo inválido, use um dos seguintes:/.test(dInv.data?.error || ''), JSON.stringify(dInv.data));
  const dOk = await api('POST', '/cadastros/despesas', { data: `${MES_SET}-21`, descricao: 'TESTE TIPO VALIDO (excluir)', tipo: 'EQUIPAMENTO', valor: 10 }, token);
  check('POST /despesas tipo EQUIPAMENTO (válido) → 201', dOk.status === 201, JSON.stringify(dOk.data));
  const dOkId = dOk.data?.id;
  const dUpd = dOkId ? await api('PUT', `/cadastros/despesas/${dOkId}`, { tipo: 'NEM_EXISTE' }, token) : { status: 0 };
  check('PUT /despesas tipo inválido → 400', dUpd.status === 400, JSON.stringify(dUpd.data));

  console.log('\n── BUG 4: fallback M/G no cadastro de procedimento ──');
  const pFb = await api('POST', '/cadastros/procedimentos', {
    nome: 'TESTE FALLBACK MG (excluir)', categoria: 'SERVICO_CABELO',
    preco_p: 100, custo_variavel: 10, requer_comprimento: 1, ativo: 1,
  }, token);
  check('POST /procedimentos sem preco_m/g → 201', pFb.status === 201, JSON.stringify(pFb.data));
  check('preco_m preenchido automaticamente = 120', Number(pFb.data?.preco_m) === 120, `api=${pFb.data?.preco_m}`);
  check('preco_g preenchido automaticamente = 130', Number(pFb.data?.preco_g) === 130, `api=${pFb.data?.preco_g}`);
  const pFbGet = pFb.data?.id ? await api('GET', `/cadastros/procedimentos/${pFb.data.id}`, null, token) : null;
  check('Persistido no banco: preco_m=120, preco_g=130', Number(pFbGet?.data?.preco_m) === 120 && Number(pFbGet?.data?.preco_g) === 130, `db m=${pFbGet?.data?.preco_m} g=${pFbGet?.data?.preco_g}`);
  const pMan = await api('POST', '/cadastros/procedimentos', {
    nome: 'TESTE MANUAL MG (excluir)', categoria: 'SERVICO_CABELO',
    preco_p: 80, preco_m: 95, preco_g: 110, custo_variavel: 10, requer_comprimento: 1, ativo: 1,
  }, token);
  check('preco_m/g manuais respeitados (95/110)', Number(pMan.data?.preco_m) === 95 && Number(pMan.data?.preco_g) === 110, `api=${pMan.data?.preco_m}/${pMan.data?.preco_g}`);

  console.log('\n── Guarda de mês fechado (agora deve funcionar) ──');
  const guard = await api('POST', '/atendimentos', {
    cliente: 'TESTE GUARDA', profissional_id: prop.id,
    data: `${MES_JUL}-15`, horario: '10:00:00',
    procedimento_id: corte.id, valor_cobrado: 70, valor_pago: 0,
  }, token);
  check(`POST /atendimentos em ${MES_JUL} fechado → 403`, guard.status === 403, `status=${guard.status} ${JSON.stringify(guard.data)}`);

  // Limpeza dos artefatos de teste (não afetam a simulação)
  if (ateIdParaLimpar) {
    await conn.query('DELETE FROM atendimento_procedimentos WHERE atendimento_id = ?', [ateIdParaLimpar]);
    await conn.query('DELETE FROM atendimentos WHERE id = ?', [ateIdParaLimpar]);
  }
  if (dOkId) await conn.query('DELETE FROM despesas WHERE id = ?', [dOkId]);
  if (pFb.data?.id) await conn.query('DELETE FROM procedimentos WHERE id = ?', [pFb.data.id]);
  if (pMan.data?.id) await conn.query('DELETE FROM procedimentos WHERE id = ?', [pMan.data.id]);
  await conn.end();
  console.log('\n🧹 Artefatos de teste removidos do banco (atendimento/despesa/procedimentos de teste)');

  console.log(`\n════ RESULTADO: ${pass} passou(m), ${fail} falhou(ram) ════`);
  process.exit(fail > 0 ? 1 : 0);


}

main().catch((e) => { console.error('❌ ERRO FATAL:', e); process.exit(1); });
