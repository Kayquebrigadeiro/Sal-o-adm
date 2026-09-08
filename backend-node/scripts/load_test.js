/**
 * FASE 4 — TESTE DE CARGA (k6)
 * Script k6 para teste de carga contra o backend de staging.
 * Usa os dados do seed (scripts/salons_seed.json).
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import { Trend, Rate, Counter } from 'k6/metrics';

const saloes = new SharedArray('saloes', function () {
  return JSON.parse(open('./salons_seed.json'));
});

const BASE_URL = 'http://localhost:3334';

// Métricas customizadas por operação
const tempoLogin        = new Trend('tempo_login');
const tempoAgenda       = new Trend('tempo_agenda');
const tempoCriarAtend   = new Trend('tempo_criar_atendimento');
const tempoAtualizarAtend = new Trend('tempo_atualizar_atendimento');
const tempoFechamento   = new Trend('tempo_fechamento');
const tempoHomecare     = new Trend('tempo_homecare');
const errosCriticos     = new Counter('erros_criticos');
const taxaErroPorRota   = new Rate('taxa_erro_geral');

export const options = {
  stages: [
    { duration: '30s', target: 5  },  // aquecimento
    { duration: '1m',  target: 5  },  // estável 5 usuários
    { duration: '30s', target: 20 },  // rampa para 20
    { duration: '1m',  target: 20 },  // estável 20 usuários (limite do pool de conexões)
    { duration: '30s', target: 50 },  // rampa para 50 (acima do pool)
    { duration: '1m',  target: 50 },  // estável 50 usuários
    { duration: '30s', target: 0  },  // resfriamento
  ],
  thresholds: {
    http_req_duration:        ['p(95)<2000'],
    http_req_failed:          ['rate<0.05'],
    tempo_criar_atendimento:  ['p(95)<3000'],
    tempo_fechamento:         ['p(95)<3000'],
  },
};

export default function () {
  const salao = saloes[Math.floor(Math.random() * saloes.length)];
  const prof  = salao.profissionais[Math.floor(Math.random() * salao.profissionais.length)];
  const proc  = salao.procedimentos[Math.floor(Math.random() * salao.procedimentos.length)];
  const headers = { 'Content-Type': 'application/json' };

  // 1. Login
  const t0 = Date.now();
  const loginRes = http.post(`${BASE_URL}/auth/login`,
    JSON.stringify({ email: salao.email, senha: salao.senha }), { headers });
  tempoLogin.add(Date.now() - t0);
  const loginOk = check(loginRes, { 'login 200': r => r.status === 200 });
  if (!loginOk) { errosCriticos.add(1); taxaErroPorRota.add(1); return; }
  taxaErroPorRota.add(0);

  const token = loginRes.json('token');
  const authHeaders = { headers: { ...headers, Authorization: `Bearer ${token}` } };

  sleep(Math.random() * 1.5 + 0.5);

  // 2. Ver agenda do dia
  const hoje = new Date().toISOString().split('T')[0];
  const t1 = Date.now();
  const agendaRes = http.get(`${BASE_URL}/atendimentos?data=${hoje}`, authHeaders);
  tempoAgenda.add(Date.now() - t1);
  check(agendaRes, { 'agenda 200': r => r.status === 200 });
  taxaErroPorRota.add(agendaRes.status !== 200 ? 1 : 0);

  sleep(Math.random() * 1.5 + 0.5);

  // 3. Criar atendimento
  const t2 = Date.now();
  const criarRes = http.post(`${BASE_URL}/atendimentos`, JSON.stringify({
    cliente: `Carga ${Math.random().toString(36).slice(2, 7)}`,
    data: hoje,
    horario: `${String(8 + Math.floor(Math.random() * 10)).padStart(2,'0')}:${Math.random() > 0.5 ? '00' : '30'}:00`,
    profissional_id: prof.id,
    procedimento_id: proc.id,
    comprimento: ['P','M','G'][Math.floor(Math.random()*3)],
    valor_cobrado: proc.preco_p,
    valor_pago: 0,
    status: 'AGENDADO',
  }), authHeaders);
  tempoCriarAtend.add(Date.now() - t2);
  const criarOk = check(criarRes, { 'criar atendimento 201': r => r.status === 201 || r.status === 200 });
  taxaErroPorRota.add(criarOk ? 0 : 1);
  const atendimentoId = criarRes.json('id');

  sleep(Math.random() * 1.5 + 0.5);

  // 4. Marcar como executado
  if (atendimentoId) {
    const t3 = Date.now();
    const execRes = http.put(`${BASE_URL}/atendimentos/${atendimentoId}`,
      JSON.stringify({ status: 'EXECUTADO' }), authHeaders);
    tempoAtualizarAtend.add(Date.now() - t3);
    check(execRes, { 'executado 200': r => r.status === 200 });
    taxaErroPorRota.add(execRes.status !== 200 ? 1 : 0);

    sleep(Math.random() * 1 + 0.5);

    // 5. Marcar como pago
    const t4 = Date.now();
    const pagoRes = http.put(`${BASE_URL}/atendimentos/${atendimentoId}`,
      JSON.stringify({ valor_pago: proc.preco_p, status: 'EXECUTADO' }), authHeaders);
    tempoAtualizarAtend.add(Date.now() - t4);
    check(pagoRes, { 'pago 200': r => r.status === 200 });
    taxaErroPorRota.add(pagoRes.status !== 200 ? 1 : 0);
  }

  sleep(Math.random() * 1.5 + 0.5);

  // 6. Criar venda de homecare
  const homecareRes = http.post(`${BASE_URL}/cadastros/homecare`, JSON.stringify({
    data: hoje,
    cliente: `Cliente HC ${Math.random().toString(36).slice(2,6)}`,
    produto: 'Kit Hidratação',
    custo_produto: 40,
    valor_venda: 120,
    valor_pago: Math.random() > 0.5 ? 120 : 0,
  }), authHeaders);
  tempoHomecare.add(homecareRes.timings.duration);
  check(homecareRes, { 'homecare 201': r => r.status === 201 || r.status === 200 });
  taxaErroPorRota.add(homecareRes.status > 201 ? 1 : 0);

  sleep(Math.random() * 1.5 + 0.5);

  // 7. Consultar fechamento
  const mes = hoje.slice(0, 7);
  const t5 = Date.now();
  const fechRes = http.get(`${BASE_URL}/fechamento/${mes}`, authHeaders);
  tempoFechamento.add(Date.now() - t5);
  check(fechRes, { 'fechamento 200': r => r.status === 200 });
  taxaErroPorRota.add(fechRes.status !== 200 ? 1 : 0);

  sleep(Math.random() * 2 + 1);
}
