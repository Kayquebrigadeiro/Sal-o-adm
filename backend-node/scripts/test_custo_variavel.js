/**
 * Teste manual: POST /cadastros/procedimentos com custo_variavel: 10
 * Confirma se o campo persiste ou é descartado.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3334';
const seedPath = path.join(__dirname, 'salons_seed.json');
const salons = JSON.parse(fs.readFileSync(seedPath, 'utf8'));

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
  const salao = salons[0];
  console.log('Salao:', salao.email);

  // Login
  const login = await api('POST', '/auth/login', { email: salao.email, senha: salao.senha });
  if (!login.ok || !login.data.token) {
    console.error('Login falhou:', login.data);
    process.exit(1);
  }
  const token = login.data.token;
  console.log('Login OK\n');

  // 1. Criar procedimento com custo_variavel: 10
  console.log('=== TESTE 1: POST /cadastros/procedimentos com custo_variavel: 10 ===');
  const createRes = await api('POST', '/cadastros/procedimentos', {
    nome: 'Proc Teste CustoVar',
    categoria: 'SERVICO_CABELO',
    preco_p: 100,
    custo_variavel: 10,
    requer_comprimento: 1,
    ativo: 1
  }, token);
  console.log('Status:', createRes.status);
  console.log('Resposta:', JSON.stringify(createRes.data, null, 2));

  const procId = createRes.data?.id;
  if (!procId) {
    console.error('Falha ao criar procedimento');
    process.exit(1);
  }

  // 2. GET para verificar se custo_variavel persiste
  console.log('\n=== TESTE 2: GET /cadastros/procedimentos/:id ===');
  const getRes = await api('GET', `/cadastros/procedimentos/${procId}`, null, token);
  console.log('Status:', getRes.status);
  console.log('custo_variavel retornado:', getRes.data?.custo_variavel);
  console.log('Esperado: 10');

  if (Number(getRes.data?.custo_variavel) === 10) {
    console.log('\n✅ custo_variavel PERSISTE corretamente');
  } else {
    console.log('\n❌ custo_variavel NÃO persiste — recebido:', getRes.data?.custo_variavel);
  }

  // 3. Verificar o que está no banco diretamente
  console.log('\n=== TESTE 3: Verificação direta no banco ===');
  const pool = require('../src/config/db');
  const [rows] = await pool.query('SELECT id, nome, custo_variavel FROM procedimentos WHERE id = ?', [procId]);
  console.log('Banco:', JSON.stringify(rows[0], null, 2));
  await pool.end();

  process.exit(0);
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});