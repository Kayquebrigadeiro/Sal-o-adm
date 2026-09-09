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

  const response = await fetch(`${VITE_API_URL}${url}`, {
    ...options,
    headers,
  });

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

export default api;
