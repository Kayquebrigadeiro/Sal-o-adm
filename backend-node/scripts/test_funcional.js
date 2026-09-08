/**
 * FASE 2 — TESTES FUNCIONAIS
 * Valida todas as funcionalidades do sistema antes do teste de carga.
 * Usa os salões criados em FASE 1 (scripts/salons_seed.json).
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3334';
const seedPath = path.join(__dirname, 'salons_seed.json');
const salons = JSON.parse(fs.readFileSync(seedPath, 'utf8'));

let results = { pass: 0, fail: 0, total: 0 };
let bugs = [];

function check(label, cond, detail = '') {
  results.total++;
  if (cond) {
    results.pass++;
    console.log(`  ✅ ${label}`);
  } else {
    results.fail++;
    console.log(`  ❌ ${label}${detail ? ' — ' + detail : ''}`);
    bugs.push({ test: label, detail });
  }
}

async function api(method, route, body = null, token = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(15000),
  };
  if (token) opts.headers['Authorization'] = `Bearer ${token}`;
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE_URL}${route}`, opts);
  let data;
  try { data = await res.json(); } catch { data = null; }
  return { status: res.status, ok: res.ok, data };
}

async function login(email, senha) {
  const r = await api('POST', '/auth/login', { email, senha });
  return r;
}

async function main() {
  console.log('═══════════════════════════════════════════');
  console.log('  FASE 2 — TESTES FUNCIONAIS');
  console.log('═══════════════════════════════════════════\n');

  // Usar salão 1 para testes principais, salão 2 para multi-tenant
  const salao1 = salons[0];
  const salao2 = salons[1];

  // Login como proprietárias
  const login1 = await login(salao1.email, salao1.senha);
  const token1 = login1.data?.token;
  const login2 = await login(salao2.email, salao2.senha);
  const token2 = login2.data?.token;

  // ===== 2.1 AUTENTICAÇÃO =====
  console.log('─── 2.1 Autenticação ───');

  check('Login com credenciais corretas retorna token', login1.ok && token1, `status=${login1.status}`);
  check('Token JWT contém salao_id', login1.data?.salao_id === salao1.salao_id);
  check('Token JWT contém cargo PROPRIETARIO', login1.data?.cargo === 'PROPRIETARIO');

  const loginWrong = await login(salao1.email, 'senha_errada');
  check('Login com senha errada retorna 401', loginWrong.status === 401, `status=${loginWrong.status}`);

  const noToken = await api('GET', '/atendimentos');
  check('Requisição sem token retorna 401', noToken.status === 401, `status=${noToken.status}`);

  const badToken = await api('GET', '/atendimentos', null, 'token_invalido_xyz');
  check('Token inválido retorna 401', badToken.status === 401, `status=${badToken.status}`);

  // ===== 2.2 ISOLAMENTO MULTI-TENANT =====
  console.log('\n─── 2.2 Isolamento Multi-tenant ───');

  // Criar um atendimento no salão 1
  const prof1 = salao1.profissionais.find(p => p.cargo === 'FUNCIONARIO');
  const proc1 = salao1.procedimentos[0]; // Coloração R$80

  const atdRes = await api('POST', '/atendimentos', {
    cliente: 'Cliente Teste MT',
    profissional_id: prof1.id,
    data: '2025-01-15',
    horario: '10:00:00',
    procedimento_id: proc1.id,
    comprimento: 'P',
    valor_cobrado: 80,
    valor_pago: 0,
    status: 'AGENDADO'
  }, token1);

  check('Criar atendimento salão 1', atdRes.ok && atdRes.data?.id, atdRes.data?.error);
  const atdId = atdRes.data?.id;

  if (atdId) {
    // Salão 2 tenta acessar atendimento do salão 1
    const crossAccess = await api('GET', `/atendimentos/${atdId}`, null, token2);
    check('Salão 2 não acessa atendimento do salão 1 (404)', crossAccess.status === 404, `status=${crossAccess.status}`);

    // Salão 2 tenta criar atendimento com profissional do salão 1
    const crossCreate = await api('POST', '/atendimentos', {
      cliente: 'Cross Tenant',
      profissional_id: prof1.id,
      data: '2025-01-15',
      horario: '11:00:00',
      procedimento_id: proc1.id,
      valor_cobrado: 80,
      valor_pago: 0,
      status: 'AGENDADO'
    }, token2);
    check('Salão 2 não cria atendimento com profissional do salão 1 (400)', crossCreate.status === 400, `status=${crossCreate.status}`);

    // Salão 2 tenta criar atendimento com procedimento do salão 1
    const crossCreate2 = await api('POST', '/atendimentos', {
      cliente: 'Cross Tenant 2',
      profissional_id: salao2.profissionais[0].id,
      data: '2025-01-15',
      horario: '12:00:00',
      procedimento_id: proc1.id,
      valor_cobrado: 80,
      valor_pago: 0,
      status: 'AGENDADO'
    }, token2);
    check('Salão 2 não cria atendimento com procedimento do salão 1 (400)', crossCreate2.status === 400, `status=${crossCreate2.status}`);
  }

  // ===== 2.3 MOTOR FINANCEIRO =====
  console.log('\n─── 2.3 Motor Financeiro ───');

  // Criar atendimento com valores conhecidos
  // valor_cobrado=100, taxa=5%, custo_fixo=29, custo_variavel=10, comissão=40%
  // valor_maquininha = 5.00
  // valor_profissional = 40.00
  // lucro_liquido = 100 - 5 - 29 - 10 - 40 = 16.00
  // lucro_possivel = 100 - 29 - 10 - 40 = 21.00
  // valor_pendente = 100.00

  // Usar procedimento com custo_variavel=10 (criar um procedimento específico)
  const procFin = await api('POST', '/cadastros/procedimentos', {
    nome: 'Procedimento Financeiro Test',
    categoria: 'SERVICO_CABELO',
    preco_p: 100,
    custo_variavel: 10,
    requer_comprimento: 1,
    ativo: 1
  }, token1);

  const procFinId = procFin.data?.id;
  check('Procedimento financeiro criado', !!procFinId, procFin.data?.error);

  if (procFinId) {
    const atdFin = await api('POST', '/atendimentos', {
      cliente: 'Teste Motor Financeiro',
      profissional_id: prof1.id,
      data: '2025-01-15',
      horario: '14:00:00',
      procedimento_id: procFinId,
      comprimento: 'P',
      valor_cobrado: 100,
      valor_pago: 0,
      status: 'AGENDADO'
    }, token1);

    check('Atendimento financeiro criado', atdFin.ok && atdFin.data?.id, atdFin.data?.error);

    if (atdFin.ok && atdFin.data) {
      const d = atdFin.data;
      check('valor_maquininha = 5.00', Number(d.valor_maquininha) === 5.00, `recebido: ${d.valor_maquininha}`);
      check('valor_profissional = 40.00', Number(d.valor_profissional) === 40.00, `recebido: ${d.valor_profissional}`);
      check('lucro_liquido = 16.00', Number(d.lucro_liquido) === 16.00, `recebido: ${d.lucro_liquido}`);
      check('lucro_possivel = 21.00', Number(d.lucro_possivel) === 21.00, `recebido: ${d.lucro_possivel}`);
      check('valor_pendente = 100.00', Number(d.valor_pendente) === 100.00, `recebido: ${d.valor_pendente}`);
      check('custo_fixo = 29.00', Number(d.custo_fixo) === 29.00, `recebido: ${d.custo_fixo}`);
      check('custo_variavel = 10.00', Number(d.custo_variavel) === 10.00, `recebido: ${d.custo_variavel}`);
    }
  }

  // ===== 2.4 FLUXO COMPLETO DE ATENDIMENTO =====
  console.log('\n─── 2.4 Fluxo completo de atendimento ───');

  // 1. Criar atendimento AGENDADO
  const atdFlow = await api('POST', '/atendimentos', {
    cliente: 'Cliente Flow',
    profissional_id: prof1.id,
    data: '2025-01-15',
    horario: '15:00:00',
    procedimento_id: procFinId || proc1.id,
    comprimento: 'P',
    valor_cobrado: 100,
    valor_pago: 0,
    status: 'AGENDADO'
  }, token1);

  check('1. Criar atendimento AGENDADO', atdFlow.ok && atdFlow.data?.id, atdFlow.data?.error);
  const atdFlowId = atdFlow.data?.id;

  if (atdFlowId) {
    // 2. Atualizar para EXECUTADO
    const upd1 = await api('PUT', `/atendimentos/${atdFlowId}`, { status: 'EXECUTADO' }, token1);
    check('2. Atualizar para EXECUTADO', upd1.ok, upd1.data?.error);

    const atdAfter = await api('GET', `/atendimentos/${atdFlowId}`, null, token1);
    if (atdAfter.ok && atdAfter.data) {
      check('Status = EXECUTADO', atdAfter.data.status === 'EXECUTADO');
      check('valor_cobrado preservado', Number(atdAfter.data.valor_cobrado) === 100);
      check('valor_maquininha preservado', Number(atdAfter.data.valor_maquininha) === 5.00);
    }

    // 3. Atualizar valor_pago = 100
    const upd2 = await api('PUT', `/atendimentos/${atdFlowId}`, { valor_pago: 100 }, token1);
    check('3. Atualizar valor_pago = 100', upd2.ok, upd2.data?.error);

    const atdAfter2 = await api('GET', `/atendimentos/${atdFlowId}`, null, token1);
    if (atdAfter2.ok && atdAfter2.data) {
      check('valor_pendente = 0 após pagamento total', Number(atdAfter2.data.valor_pendente) === 0, `recebido: ${atdAfter2.data.valor_pendente}`);
    }

    // 4. Atualizar profissional_id para outro com comissão diferente
    const prof30 = salao1.profissionais.find(p => p.cargo === 'FUNCIONARIO' && p.comissao === 30);
    if (prof30) {
      const upd3 = await api('PUT', `/atendimentos/${atdFlowId}`, { profissional_id: prof30.id }, token1);
      check('4. Atualizar profissional_id', upd3.ok, upd3.data?.error);

      const atdAfter3 = await api('GET', `/atendimentos/${atdFlowId}`, null, token1);
      if (atdAfter3.ok && atdAfter3.data) {
        // Com 30% de comissão: valor_profissional = 30, lucro_liquido = 100 - 5 - 29 - 10 - 30 = 26
        check('valor_profissional recalculado = 30.00', Number(atdAfter3.data.valor_profissional) === 30.00, `recebido: ${atdAfter3.data.valor_profissional}`);
        check('lucro_liquido recalculado = 26.00', Number(atdAfter3.data.lucro_liquido) === 26.00, `recebido: ${atdAfter3.data.lucro_liquido}`);
      }
    }

    // 5. Atualizar data e horario
    const upd4 = await api('PUT', `/atendimentos/${atdFlowId}`, { data: '2025-01-20', horario: '16:00:00' }, token1);
    check('5. Atualizar data e horario', upd4.ok, upd4.data?.error);

    const atdAfter4 = await api('GET', `/atendimentos/${atdFlowId}`, null, token1);
    if (atdAfter4.ok && atdAfter4.data) {
      check('Data atualizada para 2025-01-20', atdAfter4.data.data === '2025-01-20' || atdAfter4.data.data?.split('T')[0] === '2025-01-20');
    }
  }

  // ===== 2.5 PROCEDIMENTOS ADICIONAIS =====
  console.log('\n─── 2.5 Procedimentos adicionais ───');

  const procAd = salao1.procedimentos[1]; // Progressiva R$250
  const atdAd = await api('POST', '/atendimentos', {
    cliente: 'Cliente Proc Adicional',
    profissional_id: prof1.id,
    data: '2025-01-15',
    horario: '17:00:00',
    procedimento_id: proc1.id,
    comprimento: 'P',
    valor_cobrado: 80,
    valor_pago: 0,
    status: 'AGENDADO',
    procedimentos_adicionais: [{
      procedimento_id: procAd.id,
      comprimento: 'G',
      valor_cobrado: 250
    }]
  }, token1);

  check('Criar atendimento com procedimento adicional', atdAd.ok && atdAd.data?.id, atdAd.data?.error);
  const atdAdId = atdAd.data?.id;

  if (atdAdId) {
    const atdAdGet = await api('GET', `/atendimentos/${atdAdId}`, null, token1);
    if (atdAdGet.ok && atdAdGet.data) {
      check('GET retorna procedimentos_adicionais', Array.isArray(atdAdGet.data.procedimentos_adicionais) && atdAdGet.data.procedimentos_adicionais.length > 0);
    }

    // PUT procedimentos - substituir
    const putProc = await api('PUT', `/atendimentos/${atdAdId}/procedimentos`, {
      procedimentos: [{
        procedimento_id: procAd.id,
        comprimento: 'G',
        valor_cobrado: 250,
        valor_pago: 0,
        valor_indicado: 250,
        sequencia: 1
      }]
    }, token1);
    check('PUT procedimentos substitui com sucesso', putProc.ok, putProc.data?.error);

    const atdAfterProc = await api('GET', `/atendimentos/${atdAdId}`, null, token1);
    if (atdAfterProc.ok && atdAfterProc.data) {
      check('valor_cobrado recalculado = 250', Number(atdAfterProc.data.valor_cobrado) === 250, `recebido: ${atdAfterProc.data.valor_cobrado}`);
    }
  }

  // ===== 2.6 AGENDA (LISTAGEM POR DATA) =====
  console.log('\n─── 2.6 Agenda ───');

  const agendaRes = await api('GET', '/atendimentos?data=2025-01-15', null, token1);
  check('GET agenda por data retorna 200', agendaRes.ok, `status=${agendaRes.status}`);
  if (agendaRes.ok && agendaRes.data) {
    check('Agenda retorna apenas atendimentos do dia', agendaRes.data.data?.every(a => a.data === '2025-01-15' || a.data?.split('T')[0] === '2025-01-15'));
  }

  const agendaAll = await api('GET', '/atendimentos', null, token1);
  check('GET agenda sem filtro retorna 200', agendaAll.ok);
  if (agendaAll.ok && agendaAll.data) {
    check('Agenda sem filtro não vaza dados de outros salões', agendaAll.data.data?.every(a => a.salao_id === salao1.salao_id));
  }

  // Criar 5 atendimentos no mesmo horário para profissionais diferentes
  const profs = salao1.profissionais;
  let parallelCount = 0;
  for (let i = 0; i < Math.min(3, profs.length); i++) {
    const res = await api('POST', '/atendimentos', {
      cliente: `Cliente Paralelo ${i}`,
      profissional_id: profs[i].id,
      data: '2025-01-15',
      horario: '18:00:00',
      procedimento_id: proc1.id,
      comprimento: 'P',
      valor_cobrado: 80,
      valor_pago: 0,
      status: 'AGENDADO'
    }, token1);
    if (res.ok) parallelCount++;
  }
  check('Criar atendimentos paralelos (mesmo horário, profissionais diferentes)', parallelCount === Math.min(3, profs.length), `criados: ${parallelCount}`);

  // ===== 2.7 FECHAMENTO MENSAL =====
  console.log('\n─── 2.7 Fechamento mensal ───');

  const fechRes = await api('GET', '/fechamento/2025-01', null, token1);
  check('GET fechamento/2025-01 retorna 200', fechRes.ok, `status=${fechRes.status}`);

  if (fechRes.ok && fechRes.data) {
    // Verificar que receita_bruta bate com soma dos atendimentos EXECUTADO
    const atdsExec = await api('GET', '/atendimentos?data=2025-01-15', null, token1);
    // Nota: fechamento soma todos do mês, não apenas um dia
    check('Fechamento retorna receita_bruta', typeof fechRes.data.faturamentoBruto !== 'undefined');
    check('Fechamento retorna lucro_liquido', typeof fechRes.data.lucroAtendimentosReal !== 'undefined');
    check('Fechamento retorna total_despesas', typeof fechRes.data.totalDespesas !== 'undefined');
  }

  // Fechar o mês
  const fechPost = await api('POST', '/fechamento/2025-01', null, token1);
  check('POST fechamento/2025-01 fecha o mês', fechPost.ok, `status=${fechPost.status}, data=${JSON.stringify(fechPost.data)}`);

  // Tentar criar atendimento em mês fechado
  const atdClosed = await api('POST', '/atendimentos', {
    cliente: 'Mês Fechado',
    profissional_id: prof1.id,
    data: '2025-01-25',
    horario: '10:00:00',
    procedimento_id: proc1.id,
    valor_cobrado: 80,
    valor_pago: 0,
    status: 'AGENDADO'
  }, token1);
  check('Criar atendimento em mês fechado retorna 403', atdClosed.status === 403, `status=${atdClosed.status}`);

  // ===== 2.8 CRUD COMPLETO =====
  console.log('\n─── 2.8 CRUD completo ───');

  const crudEntities = [
    { name: 'clientes', route: '/cadastros/clientes', create: { nome: 'Cliente CRUD Test' } },
    { name: 'profissionais', route: '/cadastros/profissionais', create: { nome: 'Prof CRUD Test', cargo: 'FUNCIONARIO', porcentagem_comissao: 25, salario_fixo: 0, ativo: 1 } },
    { name: 'procedimentos', route: '/cadastros/procedimentos', create: { nome: 'Proc CRUD Test', categoria: 'SERVICO_CABELO', preco_p: 100, custo_variavel: 10, requer_comprimento: 1, ativo: 1 } },
    { name: 'produtos', route: '/cadastros/produtos', create: { nome: 'Produto CRUD Test', preco_compra: 50, qtd_aplicacoes: 10, ativo: 1 } },
    { name: 'custos-fixos', route: '/cadastros/custos-fixos', create: { descricao: 'Custo Fixo Test', valor: 100, valor_mensal: 100, ativo: 1 } },
    { name: 'despesas', route: '/cadastros/despesas', create: { descricao: 'Despesa CRUD Test', valor: 200, tipo: 'OUTRO', data: '2025-02-15', valor_pago: 200 } },
    { name: 'homecare', route: '/cadastros/homecare', create: { cliente: 'HC CRUD Test', produto: 'Produto HC', custo_produto: 40, valor_venda: 120, valor_pago: 0, data: '2025-02-15' } },
    { name: 'procedimentos-paralelos', route: '/cadastros/procedimentos-paralelos', create: { descricao: 'PP CRUD Test', cliente: 'Cliente PP', valor: 200, valor_pago: 0, data: '2025-02-15' } },
    { name: 'gastos-pessoais', route: '/cadastros/gastos-pessoais', create: { descricao: 'Gasto CRUD Test', valor: 300 } },
  ];

  for (const entity of crudEntities) {
    console.log(`\n  ${entity.name}:`);
    // POST
    const created = await api('POST', entity.route, entity.create, token1);
    check(`  POST ${entity.name} → 201`, created.status === 201, `status=${created.status}`);
    const id = created.data?.id;

    if (id) {
      // GET lista
      const listed = await api('GET', entity.route, null, token1);
      check(`  GET lista ${entity.name}`, listed.ok && Array.isArray(listed.data));

      // GET por id
      const got = await api('GET', `${entity.route}/${id}`, null, token1);
      check(`  GET /:${id} ${entity.name}`, got.ok && got.data?.id === id, `status=${got.status}`);

      // PUT
      const updateData = entity.name === 'clientes' ? { nome: 'Cliente Editado' } :
                         entity.name === 'profissionais' ? { porcentagem_comissao: 35 } :
                         entity.name === 'procedimentos' ? { preco_p: 110 } :
                         entity.name === 'produtos' ? { preco_compra: 55 } :
                         entity.name === 'custos-fixos' ? { valor: 150 } :
                         entity.name === 'despesas' ? { valor: 250 } :
                         entity.name === 'homecare' ? { valor_venda: 130 } :
                         entity.name === 'procedimentos-paralelos' ? { valor: 250 } :
                         entity.name === 'gastos-pessoais' ? { valor: 350 } :
                         { nome: 'Editado' };
      const updated = await api('PUT', `${entity.route}/${id}`, updateData, token1);
      check(`  PUT ${entity.name}`, updated.ok, `status=${updated.status}`);

      // DELETE
      const deleted = await api('DELETE', `${entity.route}/${id}`, null, token1);
      check(`  DELETE ${entity.name}`, deleted.ok, `status=${deleted.status}`);

      // GET por id após delete → 404
      const afterDelete = await api('GET', `${entity.route}/${id}`, null, token1);
      check(`  GET após DELETE → 404`, afterDelete.status === 404, `status=${afterDelete.status}`);
    }
  }

  // ===== 2.9 HOMECARE =====
  console.log('\n─── 2.9 HomeCare ───');

  const hcRes = await api('POST', '/cadastros/homecare', {
    cliente: 'Cliente HC Teste',
    produto: 'Kit Hidratação',
    custo_produto: 40,
    valor_venda: 150,
    valor_pago: 100,
    data: '2025-02-15'
  }, token1);

  check('Criar homecare valor_venda=150, custo=40, pago=100', hcRes.ok && hcRes.data?.id, hcRes.data?.error);
  const hcId = hcRes.data?.id;

  if (hcId) {
    const hcGet = await api('GET', `/cadastros/homecare/${hcId}`, null, token1);
    if (hcGet.ok && hcGet.data) {
      check('valor_pendente = 50', Number(hcGet.data.valor_pendente) === 50, `recebido: ${hcGet.data.valor_pendente}`);
      check('lucro = 110 (150 - 40)', Number(hcGet.data.lucro) === 110, `recebido: ${hcGet.data.lucro}`);
    }

    // Marcar como pago total
    const hcUpd = await api('PUT', `/cadastros/homecare/${hcId}`, { valor_pago: 150, valor_pendente: 0 }, token1);
    check('Marcar homecare como pago total', hcUpd.ok, hcUpd.data?.error);

    const hcGet2 = await api('GET', `/cadastros/homecare/${hcId}`, null, token1);
    if (hcGet2.ok && hcGet2.data) {
      check('valor_pendente = 0 após pagamento total', Number(hcGet2.data.valor_pendente) === 0, `recebido: ${hcGet2.data.valor_pendente}`);
    }
  }

  // ===== 2.10 CONFIGURAÇÕES DO SALÃO =====
  console.log('\n─── 2.10 Configurações do salão ───');

  // Atualizar taxa de 5% para 3%
  const cfgRes = await api('GET', '/cadastros/configuracoes', null, token1);
  const cfgId = cfgRes.data?.[0]?.id;
  if (cfgId) {
    const cfgUpd = await api('PUT', `/cadastros/configuracoes/${cfgId}`, { taxa_maquininha_pct: 3 }, token1);
    check('Atualizar taxa_maquininha_pct de 5% para 3%', cfgUpd.ok, cfgUpd.data?.error);

    // Criar novo atendimento e verificar que usa 3%
    const atdNew = await api('POST', '/atendimentos', {
      cliente: 'Teste Taxa 3%',
      profissional_id: prof1.id,
      data: '2025-02-15',
      horario: '10:00:00',
      procedimento_id: procFinId || proc1.id,
      comprimento: 'P',
      valor_cobrado: 100,
      valor_pago: 0,
      status: 'AGENDADO'
    }, token1);

    if (atdNew.ok && atdNew.data) {
      // valor_maquininha = 100 * 3% = 3.00
      check('Novo atendimento usa taxa 3% (valor_maquininha=3.00)', Number(atdNew.data.valor_maquininha) === 3.00, `recebido: ${atdNew.data.valor_maquininha}`);
    }

    // Verificar que atendimentos antigos NÃO são afetados
    // O atendimento "antigo" (atdId, criado em 2.2) tem valor_cobrado=80 e foi
    // criado com taxa de 5% → valor_maquininha original = 80 * 5% = 4.00
    if (atdId) {
      const atdOld = await api('GET', `/atendimentos/${atdId}`, null, token1);
      if (atdOld.ok && atdOld.data) {
        const maqEsperado = Number(atdOld.data.valor_cobrado) * 0.05;
        check(`Atendimento antigo preserva valor_maquininha original (${maqEsperado.toFixed(2)})`,
          Number(atdOld.data.valor_maquininha) === Number(maqEsperado.toFixed(2)),
          `recebido: ${atdOld.data.valor_maquininha}, esperado: ${maqEsperado.toFixed(2)}`);
      }
    }
  }

  // ===== RESUMO =====
  console.log('\n═══════════════════════════════════════════');
  console.log(`  RESULTADO FASE 2: ${results.pass}/${results.total} passando`);
  if (results.fail > 0) console.log(`  ❌ ${results.fail} FALHAS`);
  else console.log('  ✅ TODOS OS TESTES PASSARAM');
  console.log('═══════════════════════════════════════════\n');

  if (bugs.length > 0) {
    console.log('BUGS ENCONTRADOS:');
    bugs.forEach(b => console.log(`  - ${b.test}: ${b.detail}`));
  }

  process.exit(results.fail > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('❌ Erro fatal:', err.message);
  process.exit(1);
});
