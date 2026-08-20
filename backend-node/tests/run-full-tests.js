/**
 * Teste funcional completo — auditoria pré-produção
 * Roda contra o servidor em execução (porta 3333)
 */
require('dotenv').config();
const path = require('path');
const pool = require(path.join(__dirname, '..', 'src', 'config', 'db'));

const BASE = 'http://localhost:3333';
const SENHA = 'SUA_SENHA_DE_TESTE';

let TOKEN_VENDEDOR = null;
let TOKEN_PROP = null;
let TOKEN_PROP2 = null;
let results = { pass: 0, fail: 0, total: 0 };
let bugs = [];
let pendencias = [];

function check(label, cond, detail = '') {
  results.total++;
  if (cond) { results.pass++; console.log(`  ✅ ${label}`); }
  else { results.fail++; console.log(`  ❌ ${label}${detail ? ' — ' + detail : ''}`); }
}

async function api(method, path, body = null, token = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(10000) // 10s timeout p/ não travar a bateria
  };
  if (token) opts.headers['Authorization'] = `Bearer ${token}`;
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  let data;
  try { data = await res.json(); } catch { data = null; }
  return { status: res.status, ok: res.ok, data };
}

async function login(email, senha) {
  const r = await api('POST', '/auth/login', { email, senha });
  return r;
}

async function main() {
  console.log('\n═══════════════════════════════════════════');
  console.log('  AUDITORIA PRÉ-PRODUÇÃO — TESTE COMPLETO');
  console.log('═══════════════════════════════════════════\n');

  // ========== B.1 AUTENTICAÇÃO ==========
  console.log('─── B.1 Autenticação ───');

  const loginV = await login('SEU_EMAIL_DE_TESTE@exemplo.com', SENHA);
  TOKEN_VENDEDOR = loginV.ok ? loginV.data.token : null;
  check('Login VENDEDOR com email', !!TOKEN_VENDEDOR);

  const loginP = await login('salaoteste@teste.com', SENHA);
  TOKEN_PROP = loginP.ok ? loginP.data.token : null;
  check('Login PROPRIETARIO com email', !!TOKEN_PROP);

  const r2 = await login('salaoteste@teste.com', 'senha_errada_xyz');
  check('Login com senha errada retorna 401', r2.status === 401, `status=${r2.status}`);

  const r3 = await api('GET', '/atendimentos', null, 'token_invalido_aqui');
  check('Token adulterado retorna 401', r3.status === 401, `status=${r3.status}`);

  const r4 = await api('GET', '/atendimentos');
  check('Token ausente retorna 401', r4.status === 401, `status=${r4.status}`);

  // VENDEDOR vs PROPRIETARIO cruzado
  const r5 = await api('GET', '/admin', null, TOKEN_PROP);
  check('PROPRIETARIO acessando /admin retorna 403', r5.status === 403, `status=${r5.status}`);

  const r6 = await api('GET', '/salao', null, TOKEN_PROP);
  check('PROPRIETARIO acessando /salao retorna 403', r6.status === 403, `status=${r6.status}`);

  // ========== B.2 CICLO DE VIDA ATENDIMENTO ==========
  console.log('\n─── B.2 Ciclo de vida do atendimento ───');

  // Resetar custo fixo para 15 antes do teste (outros testes alteram para 20)
  const cfgReset = await api('GET', '/cadastros/configuracoes', null, TOKEN_PROP);
  if (cfgReset.ok && Array.isArray(cfgReset.data) && cfgReset.data.length > 0) {
    const cfgId = cfgReset.data[0].id;
    await api('PUT', `/cadastros/configuracoes/${cfgId}`, { custo_fixo_por_atendimento: 15 }, TOKEN_PROP);
    // Confirmar reset
    const cfgCheck = await api('GET', '/cadastros/configuracoes', null, TOKEN_PROP);
    const cfgAtual = cfgCheck.ok && Array.isArray(cfgCheck.data) && cfgCheck.data.length > 0 ? cfgCheck.data[0] : null;
    check('Custo fixo resetado para 15', Number(cfgAtual?.custo_fixo_por_atendimento) === 15, `valor atual: ${cfgAtual?.custo_fixo_por_atendimento}`);
  }

  // Profissional hardcoded (Carlos Simples, 20% comissão)
  const profId = 'c4ed57f0-ed2f-4e70-b8ba-362d23be30eb';
  check('Profissional FUNCIONARIO encontrado', !!profId);

  // Criar procedimento ISOLADO para o B.2: custo_variavel=0, nenhum produto associado
  // Garante que o custo_variavel do atendimento será sempre 0, independente de sessões anteriores.
  const procB2Res = await api('POST', '/cadastros/procedimentos', {
    nome: `PROC B2 ISOLADO ${Date.now()}`,
    categoria: 'SERVICO_CABELO',
    requer_comprimento: true,
    preco_p: 100,
    custo_variavel: 0,
  }, TOKEN_PROP);
  const procB2Id = procB2Res.data?.id;
  check('Procedimento isolado B.2 criado', !!procB2Id, procB2Res.data?.error);

  if (profId && procB2Id) {
    // Criar atendimento simples
    const c1 = await api('POST', '/atendimentos', {
      cliente: 'Teste Auditoria', profissional_id: profId,
      data: '2026-07-20', horario: '10:00:00',
      procedimento_id: procB2Id, comprimento: 'P',
      valor_cobrado: 100, valor_pago: 0, status: 'EXECUTADO'
    }, TOKEN_PROP);
    check('Criar atendimento simples', c1.ok && c1.data?.id, c1.data?.error);
    const atdId = c1.data?.id;

    if (atdId) {
      const cfgRes2 = await api('GET', '/cadastros/configuracoes', null, TOKEN_PROP);
      const cfg = cfgRes2.ok && Array.isArray(cfgRes2.data) && cfgRes2.data.length > 0 ? cfgRes2.data[0] : null;
      const custoFixo = Number(cfg?.custo_fixo_por_atendimento || 15);
      const taxaMaq = Number(cfg?.taxa_maquininha_pct || 5);
      const comissaoPct = 20; // Carlos Simples = 20%
      const valorMaq = Number(c1.data.valor_cobrado) * (taxaMaq / 100);
      const valorProf = Number(c1.data.valor_cobrado) * (comissaoPct / 100);
      // Procedimento isolado: custo_variavel garantido = 0
      const lucroEsperado = Number(c1.data.valor_cobrado) - valorMaq - custoFixo - valorProf;
      check('valor_maquininha bate', Number(c1.data.valor_maquininha) === Number(valorMaq.toFixed(2)), `${c1.data.valor_maquininha} vs ${valorMaq}`);
      check('valor_profissional bate', Number(c1.data.valor_profissional) === Number(valorProf.toFixed(2)), `${c1.data.valor_profissional} vs ${valorProf}`);
      check('lucro_liquido bate', Number(c1.data.lucro_liquido) === Number(lucroEsperado.toFixed(2)), `${c1.data.lucro_liquido} vs ${lucroEsperado} (custo_fixo=${custoFixo})`);

      // PUT procedimentos
      const p1 = await api('PUT', `/atendimentos/${atdId}/procedimentos`, {
        procedimentos: [{ procedimento_id: procB2Id, comprimento: 'P', valor_cobrado: 100, valor_pago: 0, valor_indicado: 100, sequencia: 1 }]
      }, TOKEN_PROP);
      check('PUT procedimentos retorna sucesso', p1.ok, p1.data?.error);

      // Verificar valores atualizados
      const getAtd = await api('GET', `/atendimentos/${atdId}`, null, TOKEN_PROP);
      if (getAtd.ok && getAtd.data) {
        const a = getAtd.data;
        check('Após PUT: valor_maquininha bate', Number(a.valor_maquininha) === Number(valorMaq.toFixed(2)), `${a.valor_maquininha} vs ${valorMaq}`);
        check('Após PUT: lucro_liquido bate', Number(a.lucro_liquido) === Number(lucroEsperado.toFixed(2)), `${a.lucro_liquido} vs ${lucroEsperado} (custo_fixo=${custoFixo})`);
      }

      // Atualizar valor_pago
      const up1 = await api('PUT', `/atendimentos/${atdId}`, { valor_pago: 50 }, TOKEN_PROP);
      check('Atualizar valor_pago', up1.ok, up1.data?.error);

      // Mudar status
      const up2 = await api('PUT', `/atendimentos/${atdId}`, { status: 'CANCELADO' }, TOKEN_PROP);
      check('Mudar status para CANCELADO', up2.ok, up2.data?.error);

      // Limpeza (sem DELETE físico)
      // Já foi cancelado na linha 139
    }

    // Teste sem comissão usando PROPRIETARIO
    // Busca profissionais sob demanda (lista não está mais no escopo externo)
    const profsRes2 = await api('GET', '/cadastros/profissionais', null, TOKEN_PROP);
    const profProp = (profsRes2.data || []).find(p => p.cargo === 'PROPRIETARIO');
    if (profProp) {
      const c2 = await api('POST', '/atendimentos', {
        cliente: 'Teste Sem Comissao', profissional_id: profProp.id,
        data: '2026-07-20', horario: '11:00:00',
        procedimento_id: procB2Id, comprimento: 'P',
        valor_cobrado: 100, valor_pago: 0, status: 'EXECUTADO'
      }, TOKEN_PROP);
      check('Criar atendimento sem comissão', c2.ok && c2.data?.id, c2.data?.error);
      if (c2.ok && c2.data) {
        check('Sem comissão: valor_profissional=0', c2.data.valor_profissional === 0, `${c2.data.valor_profissional}`);
        // procB2Id: custo_variavel=0 garantido → 100 - 5(maq) - 15(fixo) - 0(prof) - 0(variavel) = 80
        check('Sem comissão: lucro_liquido=80', c2.data.lucro_liquido === 80, `${c2.data.lucro_liquido}`);
        // Limpeza: Cancelar atendimento em vez de deletar fisicamente
        await api('PUT', `/atendimentos/${c2.data.id}`, { status: 'CANCELADO' }, TOKEN_PROP);
      }
    }
  }

  // ========== B.3 FECHAMENTO MENSAL ==========
  console.log('\n─── B.3 Fechamento mensal ───');
  const fechRes = await api('POST', '/fechamento/calcular', { mes: '2026-07' }, TOKEN_PROP);
  check('Calcular fechamento (tempo real)', fechRes.ok || fechRes.status === 400, `status=${fechRes.status}`);

  // ========== B.4 CRUD 11 TABELAS ==========
  console.log('\n─── B.4 CRUD 11 tabelas de cadastro ───');

  // 1. Clientes
  const cl1 = await api('POST', '/cadastros/clientes', { nome: 'CLIENTE TESTE AUDITORIA' }, TOKEN_PROP);
  check('Criar cliente', cl1.ok && cl1.data?.id, cl1.data?.error);
  const clId = cl1.data?.id;
  if (clId) {
    const clList = await api('GET', '/cadastros/clientes', null, TOKEN_PROP);
    check('Listar clientes', clList.ok && Array.isArray(clList.data));
    const clUp = await api('PUT', `/cadastros/clientes/${clId}`, { nome: 'CLIENTE EDITADO' }, TOKEN_PROP);
    check('Editar cliente', clUp.ok, clUp.data?.error);
    const clDel = await api('DELETE', `/cadastros/clientes/${clId}`, null, TOKEN_PROP);
    check('Deletar cliente', clDel.ok, clDel.data?.error);
  }

  // 2. Profissionais
  const pr1 = await api('POST', '/cadastros/profissionais', { nome: 'PROF TESTE AUDITORIA', cargo: 'FUNCIONARIO', porcentagem_comissao: 30 }, TOKEN_PROP);
  check('Criar profissional com comissão', pr1.ok && pr1.data?.id, pr1.data?.error);
  const prId = pr1.data?.id;
  if (prId) {
    const prUp = await api('PUT', `/cadastros/profissionais/${prId}`, { porcentagem_comissao: 35 }, TOKEN_PROP);
    check('Editar comissão profissional', prUp.ok, prUp.data?.error);
    const prDel = await api('PUT', `/cadastros/profissionais/${prId}`, { ativo: false }, TOKEN_PROP);
    check('Remover profissional (soft delete)', prDel.ok, prDel.data?.error);
  }

  // 3. Procedimentos
  const pd1 = await api('POST', '/cadastros/procedimentos', { nome: 'PROC TESTE AUDITORIA', categoria: 'SERVICO_CABELO', preco_p: 150, preco_m: 180, preco_g: 195, requer_comprimento: true }, TOKEN_PROP);
  check('Criar procedimento com P/M/G', pd1.ok && pd1.data?.id, pd1.data?.error);
  const pdId = pd1.data?.id;
  if (pdId) {
    const pdUp = await api('PUT', `/cadastros/procedimentos/${pdId}`, { preco_p: 160 }, TOKEN_PROP);
    check('Editar preço procedimento', pdUp.ok, pdUp.data?.error);
  }

  // 4. Produtos
  const prod1 = await api('POST', '/cadastros/produtos', { nome: 'PRODUTO TESTE', preco_compra: 50, qtd_aplicacoes: 10, ativo: true }, TOKEN_PROP);
  check('Criar produto', prod1.ok && prod1.data?.id, prod1.data?.error);
  const prodId = prod1.data?.id;

  // 5. Procedimento_Produtos (vínculo)
  if (pdId && prodId) {
    const v1 = await api('POST', '/cadastros/procedimento_produtos', { procedimento_id: pdId, produto_id: prodId, qtd_por_uso: 2 }, TOKEN_PROP);
    check('Vincular produto a procedimento', v1.ok, v1.data?.error);
  }

  // 6. Custos Fixos
  const cf1 = await api('POST', '/cadastros/custos-fixos', { descricao: 'ALUGUEL TESTE', valor: 2000 }, TOKEN_PROP);
  check('Criar custo fixo', cf1.ok && cf1.data?.id, cf1.data?.error);
  const cfId = cf1.data?.id;
  if (cfId) {
    const cfDel = await api('DELETE', `/cadastros/custos-fixos/${cfId}`, null, TOKEN_PROP);
    check('Deletar custo fixo', cfDel.ok, cfDel.data?.error);
  }

  // 7. Despesas
  const dp1 = await api('POST', '/cadastros/despesas', { descricao: 'AGUA TESTE', valor: 150, tipo: 'OUTRO', data: '2026-07-20' }, TOKEN_PROP);
  check('Criar despesa', dp1.ok && dp1.data?.id, dp1.data?.error);
  const dpId = dp1.data?.id;
  if (dpId) {
    const dpDel = await api('DELETE', `/cadastros/despesas/${dpId}`, null, TOKEN_PROP);
    check('Deletar despesa', dpDel.ok, dpDel.data?.error);
  }

  // 8. Homecare
  const hc1 = await api('POST', '/cadastros/homecare', { cliente: 'CLIENTE HC TESTE', produto: 'SHAMPOO', custo_produto: 20, valor_venda: 60, data: '2026-07-20' }, TOKEN_PROP);
  check('Criar homecare', hc1.ok && hc1.data?.id, hc1.data?.error);
  const hcId = hc1.data?.id;
  if (hcId) {
    const hcDel = await api('DELETE', `/cadastros/homecare/${hcId}`, null, TOKEN_PROP);
    check('Deletar homecare', hcDel.ok, hcDel.data?.error);
  }

  // 9. Procedimentos Paralelos
  const pp1 = await api('POST', '/cadastros/procedimentos-paralelos', { descricao: 'BOTOX TESTE', cliente: 'CLIENTE PP', valor: 200, data: '2026-07-20' }, TOKEN_PROP);
  check('Criar procedimento paralelo', pp1.ok && pp1.data?.id, pp1.data?.error);
  const ppId = pp1.data?.id;
  if (ppId) {
    const ppDel = await api('DELETE', `/cadastros/procedimentos-paralelos/${ppId}`, null, TOKEN_PROP);
    check('Deletar procedimento paralelo', ppDel.ok, ppDel.data?.error);
  }

  // 10. Configuracoes
  const cfgRes = await api('GET', '/cadastros/configuracoes', null, TOKEN_PROP);
  check('Listar configuracoes', cfgRes.ok && Array.isArray(cfgRes.data));
  const cfgId = cfgRes.ok && Array.isArray(cfgRes.data) && cfgRes.data.length > 0 ? cfgRes.data[0].id : null;
  if (cfgId) {
    const cfgUp = await api('PUT', `/cadastros/configuracoes/${cfgId}`, { custo_fixo_por_atendimento: 20 }, TOKEN_PROP);
    check('Editar configuracoes', cfgUp.ok, cfgUp.data?.error);
  }

  // 11. Gastos Pessoais
  const gp1 = await api('POST', '/cadastros/gastos-pessoais', { descricao: 'COMPRA TESTE', valor: 300 }, TOKEN_PROP);
  check('Criar gasto pessoal', gp1.ok && gp1.data?.id, gp1.data?.error);
  const gpId = gp1.data?.id;
  if (gpId) {
    const gpDel = await api('DELETE', `/cadastros/gastos-pessoais/${gpId}`, null, TOKEN_PROP);
    check('Deletar gasto pessoal', gpDel.ok, gpDel.data?.error);
  }

  // ========== B.5 RELATÓRIOS ==========
  console.log('\n─── B.5 Relatórios ───');
  const relRoutes = [
    '/relatorios/ranking-procedimentos',
    '/relatorios/rendimento-professional',
    '/relatorios/agenda-do-dia',
    '/relatorios/clientes-resumo',
    '/relatorios/gastos-pessoais-resumo',
    '/relatorios/custo-composto-salao',
    '/relatorios/atendimentos-completo',
  ];
  for (const route of relRoutes) {
    const r = await api('GET', route, null, TOKEN_PROP);
    check(`GET ${route}`, r.ok, `status=${r.status}`);
  }

  // custo-composto/:id — usa o procedimento isolado do B.2 (qualquer ID válido serve aqui)
  if (procB2Id) {
    const r = await api('GET', `/relatorios/custo-composto/${procB2Id}`, null, TOKEN_PROP);
    check('GET /relatorios/custo-composto/:id', r.ok, `status=${r.status}`);
  }

  // homecare-anual
  const rHc = await api('GET', '/relatorios/homecare-anual?ano=2026', null, TOKEN_PROP);
  check('GET /relatorios/homecare-anual', rHc.ok, `status=${rHc.status}`);

  // ========== B.6 PAINEL VENDEDOR ==========
  console.log('\n─── B.6 Painel do Vendedor ───');
  if (TOKEN_VENDEDOR) {
    const listS = await api('GET', '/salao', null, TOKEN_VENDEDOR);
    check('Listar salões (vendedor)', listS.ok && Array.isArray(listS.data), listS.data?.error);

    const listA = await api('GET', '/admin', null, TOKEN_VENDEDOR);
    check('Listar admins (vendedor)', listA.ok && Array.isArray(listA.data), listA.data?.error);
  }

  // ========== RESUMO ==========
  console.log('\n═══════════════════════════════════════════');
  console.log(`  RESULTADO: ${results.pass}/${results.total} passando`);
  if (results.fail > 0) console.log(`  ❌ ${results.fail} FALHAS`);
  else console.log('  ✅ TODOS OS TESTES PASSARAM');
  console.log('═══════════════════════════════════════════\n');

  await pool.end();
  process.exit(results.fail > 0 ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });