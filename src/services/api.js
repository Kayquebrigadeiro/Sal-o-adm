const VITE_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333';

async function fetchWithAuth(url, options = {}) {
  const token = localStorage.getItem('authToken');
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const idRequisicao = registrarRequisicao();
  try {
    let response;
    try {
      response = await fetch(`${VITE_API_URL}${url}`, {
        ...options,
        headers,
      });
    } catch (err) {
      // Falha ANTES da resposta (rede, DNS, abort). O fetch já lançava TypeError aqui
      // antes (Chrome "Failed to fetch", Safari "Load failed", Firefox "NetworkError…"),
      // então o fluxo de exceção não muda — só a mensagem que chega ao catch do
      // componente, que agora é amigável e é retornada por parseApiError direto.
      const ehAbort = err?.name === 'AbortError' || err?.name === 'TimeoutError';
      throw ehAbort
        ? new ApiError('Requisição abortada', { code: 'timeout', userMessage: 'O servidor demorou para responder. Tente novamente.' })
        : new ApiError('Sem conexão com o servidor', { code: 'network_error', userMessage: 'Sem conexão com o servidor. Verifique sua internet.' });
    }

    if (response.status === 401 && !url.includes('/auth/login')) {
      // Sessão inválida/expirada: limpa o storage e volta ao login.
      // (Sem isso o app ficava em estado "zumbi": token apagado, mas usuário
      // ainda navegando — e toda requisição seguinte virava 401 "Token not provided".)
      try {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userRole');
        localStorage.removeItem('salaoId');
        localStorage.removeItem('userId');
      } catch (e) { /* ignore */ }
      window.location.replace('/');
    }

    return response;
  } finally {
    concluirRequisicao(idRequisicao);
  }
}

export const api = {
  get: (url, config = {}) => {
    let endpoint = url;
    if (config.params) {
      const query = new URLSearchParams(config.params).toString();
      endpoint += (endpoint.includes('?') ? '&' : '?') + query;
    }
    const { params, ...rest } = config;
    return fetchWithAuth(endpoint, { ...rest, method: 'GET' });
  },
  post: (url, data, options) => fetchWithAuth(url, { ...options, method: 'POST', body: JSON.stringify(data) }),
  put: (url, data, options) => fetchWithAuth(url, { ...options, method: 'PUT', body: JSON.stringify(data) }),
  delete: (url, config = {}) => {
    let endpoint = url;
    if (config.params) {
      const query = new URLSearchParams(config.params).toString();
      endpoint += (endpoint.includes('?') ? '&' : '?') + query;
    }
    const { params, ...rest } = config;
    return fetchWithAuth(endpoint, { ...rest, method: 'DELETE' });
  },
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Status transitórios (Render free: cold start / rate limit / restart) que valem retry
const STATUS_RETRIABLE = new Set([429, 502, 503, 504]);

/**
 * GET com retry exponencial em falhas de rede e status 429/5xx.
 * Mitiga o "cold start" do Render free: as requisições seguintes ao
 * primeiro request que acorda o servidor falhavam em cascata.
 */
export async function getComRetry(url, config = {}, { retries = 3, baseDelay = 1000 } = {}) {
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await api.get(url, config);
      if (STATUS_RETRIABLE.has(res.status) && attempt < retries) {
        await sleep(baseDelay * 2 ** attempt + Math.random() * 500);
        continue;
      }
      return res;
    } catch (err) {
      if (attempt >= retries) throw err;
      await sleep(baseDelay * 2 ** attempt + Math.random() * 500);
    }
  }
}

/**
 * Executa um array de tarefas assíncronas com concorrência limitada
 * (em vez de Promise.all em rajada), evitando estourar o rate limit.
 * Ex.: const [a, b] = await criarPool(3)([() => f1(), () => f2()]);
 */
export function criarPool(concurrency = 3) {
  return function pool(tasks) {
    const results = new Array(tasks.length);
    let next = 0;
    async function worker() {
      while (next < tasks.length) {
        const idx = next++;
        results[idx] = await tasks[idx]();
      }
    }
    return Promise.all(
      Array.from({ length: Math.max(1, Math.min(concurrency, tasks.length)) }, worker)
    );
  };
}

/**
 * Aquecimento/keep-alive do backend.
 *
 * O Render free adormece a instância após ~15 min sem uso: na primeira
 * requisição real o servidor leva 20-60s para acordar e a requisição fica
 * pendente no devtools (sintoma: "requisições feitas mas nada chega").
 *
 * Este ping é fire-and-forget (falha é ignorada, `no-cors` evita erro de CORS
 * na resposta opaca): acorda o servidor na abertura do app e o mantém acordado
 * enquanto a aba estiver visível, para que o login/uso imediato não trave.
 * Retorna a função de limpeza (para usar em useEffect).
 */
export function iniciarAquecimentoBackend({ intervaloMin = 4 } = {}) {
  const ping = () => {
    try {
      fetch(VITE_API_URL, { method: 'GET', mode: 'no-cors', cache: 'no-store' }).catch(() => {});
    } catch { /* ignora — o ping é best-effort */ }
  };
  ping();
  const id = setInterval(() => {
    if (typeof document === 'undefined' || document.visibilityState === 'visible') ping();
  }, Math.max(1, intervaloMin) * 60 * 1000);
  // Acorda o servidor IMEDIATAMENTE quando o usuário volta para a aba: se a aba
  // ficou em segundo plano (aba visible=false não pinga) por mais de ~15 min,
  // o backend adormeceu — sem isto, a primeira interação após o retorno traria
  // exatamente o sintoma "site aberto há muito tempo e nada funciona".
  const aoVoltar = () => {
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') ping();
  };
  document.addEventListener('visibilitychange', aoVoltar);
  return () => {
    clearInterval(id);
    document.removeEventListener('visibilitychange', aoVoltar);
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Indicador de "conectando ao servidor": detecta requisições pendentes há mais
// de LIMITE_LENTO_MS e notifica assinantes (componente visual). Presentação
// apenas — não altera o resultado nem o fluxo de nenhuma requisição.
// ─────────────────────────────────────────────────────────────────────────────
const LIMITE_LENTO_MS = 4000;
const requisicoesAbertas = new Map(); // id -> timestamp de início
let lentoAtual = false;
let monitorTimer = null;
const ouvidoresLentidao = new Set();

function notificarLentidao() {
  for (const cb of ouvidoresLentidao) {
    try { cb(lentoAtual); } catch { /* ignore */ }
  }
}

function monitorarLentidao() {
  if (monitorTimer) return;
  monitorTimer = setInterval(() => {
    const agora = Date.now();
    const algumLento = [...requisicoesAbertas.values()].some((t) => agora - t >= LIMITE_LENTO_MS);
    if (algumLento !== lentoAtual) {
      lentoAtual = algumLento;
      notificarLentidao();
    }
    if (requisicoesAbertas.size === 0) {
      clearInterval(monitorTimer);
      monitorTimer = null;
    }
  }, 1000);
}

let seqRequisicao = 0;
function registrarRequisicao() {
  const id = ++seqRequisicao;
  requisicoesAbertas.set(id, Date.now());
  monitorarLentidao();
  return id;
}
function concluirRequisicao(id) {
  requisicoesAbertas.delete(id);
  // Esconde o indicador imediatamente quando a última requisição termina
  // (em vez de esperar o próximo tick do monitor, até 1s depois).
  if (requisicoesAbertas.size === 0 && lentoAtual) {
    lentoAtual = false;
    notificarLentidao();
    clearInterval(monitorTimer);
    monitorTimer = null;
  }
}

/**
 * Assina mudanças do estado "há requisição pendente há mais de 4s".
 * O callback recebe `true`/`false`; é chamado imediatamente com o estado atual.
 * Retorna a função de desinscrição (uso em useEffect).
 */
export function onMudancaLentidao(callback) {
  ouvidoresLentidao.add(callback);
  callback(lentoAtual);
  return () => ouvidoresLentidao.delete(callback);
}

// ─────────────────────────────────────────────────────────────────────────────
// Tradução de erros técnicos → mensagens legíveis para o usuário.
//
// Ordem de resolução (dentro de resolverMensagemErro):
//   1. ApiError já resolvido pela camada de serviço (err.userMessage)
//   2. Erro de rede / abort (mensagens variam por engine/browser)
//   3. Dicionário de códigos do backend — match por FRONTEIRA DE PALAVRA
//      (evita o falso positivo de um includes solto dentro de frases legíveis)
//   4. Mensagem do backend que já é legível para humano (heurística)
//   5. Status HTTP, quando o erro o carrega (ex.: ApiError.fromResponse)
//   6. Fallback contextual passado pelo componente
// ─────────────────────────────────────────────────────────────────────────────

const MENSAGENS_AMIGAVEIS = {
  // auth — chaves específicas ANTES das genéricas (ex.: 'not_found' bate dentro
  // de 'user_not_found', então a genérica tem que vir por último)
  cod_login: 'E-mail ou senha incorretos.',
  invalid_credentials: 'E-mail ou senha incorretos.',
  'invalid credentials': 'E-mail ou senha incorretos.',
  user_not_found: 'Usuário não encontrado.',
  token_expired: 'Sua sessão expirou. Faça login novamente.',
  'token expired': 'Sua sessão expirou. Faça login novamente.',
  token_invalid: 'Sessão inválida. Faça login novamente.',
  jwt_expired: 'Sua sessão expirou. Faça login novamente.',
  'jwt expired': 'Sua sessão expirou. Faça login novamente.',
  unauthorized: 'Acesso não autorizado.',
  forbidden: 'Você não tem permissão para esta ação.',
  // mês fechado (mensagem do backend, mais específica que as genéricas)
  mes_fechado: 'Este mês já foi fechado e não pode ser editado.',
  // recursos
  already_exists: 'Este registro já existe.',
  // 'duplicate' cobre 'duplicate_entry' e 'Duplicate entry ...' (MySQL) por fronteira
  duplicate: 'Este registro já existe.',
  dup_entry: 'Este registro já existe.',
  // rede / servidor
  network_error: 'Sem conexão com o servidor. Verifique sua internet.',
  timeout: 'O servidor demorou para responder. Tente novamente.',
  internal_server_error: 'Erro interno do servidor. Tente novamente.',
  'internal error': 'Erro interno do servidor. Tente novamente.',
  'too many requests': 'Muitas tentativas. Aguarde alguns instantes e tente novamente.',
  rate_limit: 'Muitas tentativas. Aguarde alguns instantes e tente novamente.',
  // genéricas por último
  not_found: 'Registro não encontrado.',
  'not found': 'Registro não encontrado.',
};

// Compila os padrões uma única vez, com fronteira de palavra:
// ex.: 'duplicate' casa com "Duplicate entry 'x' for key..." mas NÃO casa
// dentro de "conduplicatedwhatever".
const escapeReg = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const PADROES_MENSAGENS = Object.entries(MENSAGENS_AMIGAVEIS).map(([chave, mensagem]) => ({
  teste: new RegExp(`(^|[^a-z0-9])${escapeReg(chave)}([^a-z0-9]|$)`, 'i'),
  mensagem,
}));

// Mensagens padrão por status HTTP (usadas quando não há texto legível no corpo)
const MENSAGENS_POR_STATUS = new Map([
  [400, 'Dados inválidos. Verifique os campos informados.'],
  [401, 'Sua sessão expirou. Faça login novamente.'],
  [403, 'Você não tem permissão para esta ação.'],
  [404, 'Registro não encontrado.'],
  [409, 'Este registro já existe.'],
  [422, 'Dados inválidos. Verifique os campos informados.'],
  [429, 'Muitas tentativas. Aguarde alguns instantes e tente novamente.'],
  [502, 'O servidor está temporariamente indisponível. Tente novamente.'],
  [503, 'O servidor está temporariamente indisponível. Tente novamente.'],
  [504, 'O servidor demorou para responder. Tente novamente.'],
]);

/** Extrai o texto bruto relevante de qualquer forma de erro. */
function extrairTextoBruto(err) {
  if (typeof err === 'string') return err;
  if (err instanceof Error) return err.message || '';
  if (err && typeof err === 'object') return err.error || err.erro || err.message || '';
  return String(err ?? '');
}

/**
 * Heurística: a mensagem parece ser texto legível para o usuário?
 * - snake_case ("cod_login") e strings quase inteiras em maiúsculas ("ER_DUP_ENTRY")
 *   são tratadas como código técnico → não legível.
 * - Siglas isoladas ("Informe o CPF") continuam legíveis (ratio de maiúsculas baixo),
 *   corrigindo o falso positivo da antiga regex /[_A-Z]{3,}/.
 */
function mensagemLegivel(texto) {
  if (!texto || typeof texto !== 'string') return false;
  const t = texto.trim();
  if (t.length === 0 || t.length > 120) return false;
  if (/\w_\w/.test(t)) return false; // snake_case → provável código técnico
  const letras = t.replace(/[^A-Za-zÀ-ÿ]/g, '');
  if (!letras) return false;
  const maiusculas = (letras.match(/[A-Z]/g) || []).length;
  if (maiusculas / letras.length > 0.7) return false; // quase tudo maiúsculo → código
  return true;
}

/**
 * Resolve qualquer erro em uma mensagem legível para o usuário.
 * @param {unknown} err - erro capturado no catch (Error, ApiError, corpo JSON, string)
 * @param {string} fallback - mensagem padrão contextual se nada for resolvido
 */
export function resolverMensagemErro(err, fallback = 'Ocorreu um erro. Tente novamente.') {
  // 1. Erro já traduzido pela camada de serviço (ApiError)
  if (err && typeof err === 'object' && typeof err.userMessage === 'string' && err.userMessage) {
    return err.userMessage;
  }

  const textoBruto = extrairTextoBruto(err);
  const bruto = textoBruto.toLowerCase();

  // 2. Rede / abort ("Failed to fetch", "Load failed", "NetworkError…", "fetch failed")
  if (/failed to fetch|load failed|fetch failed|networkerror|network request failed|net::/.test(bruto)) {
    return MENSAGENS_AMIGAVEIS.network_error;
  }
  if (err?.name === 'AbortError' || err?.name === 'TimeoutError' || /\baborted\b|\btimeout\b/.test(bruto)) {
    return MENSAGENS_AMIGAVEIS.timeout;
  }

  // TypeError que não é de rede é bug de programação — não mostrar "sem conexão"
  if (err instanceof TypeError) return fallback;

  // 3. Dicionário de códigos conhecidos (fronteira de palavra, sem falso positivo)
  for (const { teste, mensagem } of PADROES_MENSAGENS) {
    if (teste.test(bruto)) return mensagem;
  }

  // 4. Mensagem do backend que já é legível (ex.: "Este mês já foi fechado…")
  if (mensagemLegivel(textoBruto)) return textoBruto.trim();

  // 5. Status HTTP, quando o erro o carrega
  const status = err?.status ?? err?.statusCode;
  if (typeof status === 'number') {
    if (MENSAGENS_POR_STATUS.has(status)) return MENSAGENS_POR_STATUS.get(status);
    if (status >= 500) return 'Erro interno do servidor. Tente novamente.';
  }

  return fallback;
}

/**
 * Compat: mesma assinatura usada por todos os componentes do projeto.
 * Agora delega ao resolvedor completo (userMessage → rede → dicionário →
 * legível → status → fallback).
 * @param {unknown} err - objeto de erro capturado no catch
 * @param {string} fallback - mensagem padrão se nenhum mapeamento for encontrado
 */
export function parseApiError(err, fallback = 'Ocorreu um erro. Tente novamente.') {
  return resolverMensagemErro(err, fallback);
}

/**
 * Erro tipado da camada de serviço. Carrega o status HTTP, o código retornado
 * pelo backend e a userMessage já resolvida — o catch do componente só precisa
 * exibir parseApiError(err).
 */
export class ApiError extends Error {
  constructor(mensagem, { status = null, code = null, raw = null, userMessage = null } = {}) {
    super(mensagem);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.raw = raw;
    this.userMessage = userMessage;
  }

  /**
   * Constrói um ApiError a partir de uma Response não-ok, consumindo o corpo
   * JSON uma única vez. Uso: `if (!res.ok) throw await ApiError.fromResponse(res, 'Erro ao salvar');`
   */
  static async fromResponse(response, fallback = 'Ocorreu um erro. Tente novamente.') {
    let body = null;
    try { body = await response.json(); } catch { /* corpo não é JSON */ }
    const apiError = new ApiError(
      body?.error || body?.erro || body?.message || `HTTP ${response.status}`,
      { status: response.status, code: body?.code || body?.errorCode || null, raw: body },
    );
    apiError.userMessage = resolverMensagemErro(apiError, fallback);
    return apiError;
  }
}

export default api;
