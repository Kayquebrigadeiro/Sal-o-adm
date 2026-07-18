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

  if (response.status === 401) {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userRole');
    localStorage.removeItem('salaoId');
    localStorage.removeItem('userId');
    // window.location.href = '/'; // Redireciona para o login
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

export default api;
