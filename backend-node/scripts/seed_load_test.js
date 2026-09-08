/**
 * FASE 1 — SEED DE DADOS DE STAGING
 * Cria 20 salões de teste com profissionais, procedimentos, configurações,
 * despesas e gastos pessoais. Salva tudo em scripts/salons_seed.json.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3334';
const VENDEDOR_EMAIL = 'vendedor-staging@teste.com';
const VENDEDOR_SENHA = 'Staging123!';
const SALAO_SENHA = 'LoadTest123!';

const PROCEDIMENTOS = [
  { nome: 'Coloração', categoria: 'SERVICO_CABELO', preco_p: 80, custo_variavel: 28, requer_comprimento: 1, ativo: 1 },
  { nome: 'Progressiva', categoria: 'SERVICO_CABELO', preco_p: 250, custo_variavel: 135, requer_comprimento: 1, ativo: 1 },
  { nome: 'Corte', categoria: 'SERVICO_CABELO', preco_p: 60, custo_variavel: 5, requer_comprimento: 1, ativo: 1 },
  { nome: 'Hidratação', categoria: 'SERVICO_CABELO', preco_p: 120, custo_variavel: 30, requer_comprimento: 1, ativo: 1 },
];

const DESPESAS = [
  { descricao: 'Aluguel', tipo: 'ALUGUEL', valor: 1750, valor_pago: 1750, data: '2025-01-15' },
  { descricao: 'Energia', tipo: 'ENERGIA', valor: 190, valor_pago: 190, data: '2025-01-15' },
  { descricao: 'Internet', tipo: 'INTERNET', valor: 150, valor_pago: 150, data: '2025-01-15' },
];

const GASTOS_PESSOAIS = [
  { descricao: 'Alimentação', valor: 500 },
  { descricao: 'Aluguel pessoal', valor: 800 },
];

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

async function main() {
  console.log('═══════════════════════════════════════════');
  console.log('  FASE 1 — SEED DE DADOS DE STAGING');
  console.log('═══════════════════════════════════════════\n');

  // 1. Login como vendedor
  console.log('1. Login como vendedor...');
  const loginRes = await api('POST', '/auth/login', { email: VENDEDOR_EMAIL, senha: VENDEDOR_SENHA });
  if (!loginRes.ok || !loginRes.data.token) {
    console.error('❌ Falha no login do vendedor:', loginRes.data);
    process.exit(1);
  }
  const vendedorToken = loginRes.data.token;
  const vendedorId = loginRes.data.user_id;
  console.log('✅ Vendedor logado. user_id:', vendedorId);

  // 2. Criar 20 salões
  const salonsSeed = [];
  for (let i = 1; i <= 20; i++) {
    const email = `loadtest${i}@teste.com`;
    const nome = `Salão LoadTest ${i}`;
    const nomeProprietaria = `Proprietária ${i}`;

    console.log(`\n2.${i}. Criando salão ${i} (${email})...`);
    const createRes = await api('POST', '/salao/criar-proprietaria', {
      email, senha: SALAO_SENHA, nome: nomeProprietaria,
      nome_salao: nome, telefone: `1199999${String(i).padStart(4, '0')}`,
      vendedor_id: vendedorId
    }, vendedorToken);

    if (!createRes.ok || !createRes.data.salao_id) {
      console.error(`❌ Falha ao criar salão ${i}:`, createRes.data);
      continue;
    }

    const salaoId = createRes.data.salao_id;
    const authUserId = createRes.data.auth_user_id;
    console.log(`  ✅ Salão criado. salao_id: ${salaoId}`);

    // 3. Login como proprietária
    const propLogin = await api('POST', '/auth/login', { email, senha: SALAO_SENHA });
    if (!propLogin.ok || !propLogin.data.token) {
      console.error(`❌ Falha no login da proprietária do salão ${i}:`, propLogin.data);
      continue;
    }
    const propToken = propLogin.data.token;
    console.log(`  ✅ Proprietária logada.`);

    // 4. Criar 3 profissionais
    const profissionais = [];
    const profsToCreate = [
      { nome: `Profissional ${i}.1`, cargo: 'PROPRIETARIO', porcentagem_comissao: 0, salario_fixo: 0, ativo: 1 },
      { nome: `Profissional ${i}.2`, cargo: 'FUNCIONARIO', porcentagem_comissao: 40, salario_fixo: 0, ativo: 1 },
      { nome: `Profissional ${i}.3`, cargo: 'FUNCIONARIO', porcentagem_comissao: 30, salario_fixo: 0, ativo: 1 },
    ];

    for (const prof of profsToCreate) {
      const res = await api('POST', '/cadastros/profissionais', prof, propToken);
      if (res.ok && res.data.id) {
        profissionais.push({ id: res.data.id, cargo: prof.cargo, comissao: prof.porcentagem_comissao });
        console.log(`  ✅ Profissional criado: ${prof.nome} (${prof.cargo}, ${prof.porcentagem_comissao}%)`);
      } else {
        console.error(`  ❌ Falha ao criar profissional ${prof.nome}:`, res.data);
      }
    }

    // 5. Criar 4 procedimentos
    const procedimentos = [];
    for (const proc of PROCEDIMENTOS) {
      const res = await api('POST', '/cadastros/procedimentos', proc, propToken);
      if (res.ok && res.data.id) {
        procedimentos.push({ id: res.data.id, nome: proc.nome, preco_p: proc.preco_p });
        console.log(`  ✅ Procedimento criado: ${proc.nome} (R$${proc.preco_p})`);
      } else {
        console.error(`  ❌ Falha ao criar procedimento ${proc.nome}:`, res.data);
      }
    }

    // 6. Atualizar configurações: taxa_maquininha_pct=5, custo_fixo_por_atendimento=29
    const cfgRes = await api('GET', '/cadastros/configuracoes', null, propToken);
    if (cfgRes.ok && Array.isArray(cfgRes.data) && cfgRes.data.length > 0) {
      const cfgId = cfgRes.data[0].id;
      const updateRes = await api('PUT', `/cadastros/configuracoes/${cfgId}`, {
        taxa_maquininha_pct: 5,
        custo_fixo_por_atendimento: 29
      }, propToken);
      if (updateRes.ok) {
        console.log(`  ✅ Configurações atualizadas (taxa=5%, custo_fixo=29)`);
      } else {
        console.error(`  ❌ Falha ao atualizar configurações:`, updateRes.data);
      }
    }

    // 7. Criar 3 despesas fixas
    for (const desp of DESPESAS) {
      const res = await api('POST', '/cadastros/despesas', desp, propToken);
      if (res.ok) {
        console.log(`  ✅ Despesa criada: ${desp.descricao} (R$${desp.valor})`);
      } else {
        console.error(`  ❌ Falha ao criar despesa ${desp.descricao}:`, res.data);
      }
    }

    // 8. Criar 2 gastos pessoais
    for (const gasto of GASTOS_PESSOAIS) {
      const res = await api('POST', '/cadastros/gastos-pessoais', gasto, propToken);
      if (res.ok) {
        console.log(`  ✅ Gasto pessoal criado: ${gasto.descricao} (R$${gasto.valor})`);
      } else {
        console.error(`  ❌ Falha ao criar gasto pessoal ${gasto.descricao}:`, res.data);
      }
    }

    // Salvar no seed
    salonsSeed.push({
      email,
      senha: SALAO_SENHA,
      salao_id: salaoId,
      auth_user_id: authUserId,
      profissionais,
      procedimentos,
    });
  }

  // 9. Salvar salons_seed.json
  const seedPath = path.join(__dirname, 'salons_seed.json');
  fs.writeFileSync(seedPath, JSON.stringify(salonsSeed, null, 2));
  console.log(`\n═══════════════════════════════════════════`);
  console.log(`  SEED CONCLUÍDO: ${salonsSeed.length} salões criados`);
  console.log(`  Arquivo salvo: ${seedPath}`);
  console.log(`═══════════════════════════════════════════\n`);

  process.exit(0);
}

main().catch(err => {
  console.error('❌ Erro fatal:', err.message);
  process.exit(1);
});
