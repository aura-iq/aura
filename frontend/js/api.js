const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('aura_token') || null;
}

export function setAccessToken(t) {
  if (t) localStorage.setItem('aura_token', t);
  else localStorage.removeItem('aura_token');
}

export function getAccessToken() {
  return getToken();
}

let refreshPromise = null;

async function refreshAccessToken() {
  if (refreshPromise) return refreshPromise;
  refreshPromise = fetch(API_BASE + '/auth/refresh', {
    method: 'POST',
    credentials: 'include',
  })
    .then(function(r) {
      if (!r.ok) throw new Error('REFRESH_FAILED');
      return r.json();
    })
    .then(function(data) {
      setAccessToken(data.data.accessToken);
      return data.data.accessToken;
    })
    .finally(function() {
      refreshPromise = null;
    });
  return refreshPromise;
}

async function request(path, opts) {
  opts = opts || {};
  const method = opts.method || 'GET';
  const body = opts.body;
  const auth = opts.auth === true;
  const retry = opts.retry !== false;

  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  const token = getToken();
  if (auth && token) headers['Authorization'] = 'Bearer ' + token;

  const res = await fetch(API_BASE + path, {
    method: method,
    headers: headers,
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && auth && retry) {
    try {
      await refreshAccessToken();
      return request(path, { method: method, body: body, auth: auth, retry: false });
    } catch (e) {
      // failed refresh
    }
  }

  let payload = null;
  try { payload = await res.json(); } catch (e) {}

  if (!res.ok) {
    const msg = payload && payload.error && payload.error.message
      ? payload.error.message
      : 'خطأ في الطلب';
    const err = new Error(msg);
    err.code = payload && payload.error ? payload.error.code : 'UNKNOWN';
    err.status = res.status;
    throw err;
  }

  if (payload && payload.data !== undefined) return payload.data;
  return payload;
}

export const api = {
  get: function(p, opts) { return request(p, Object.assign({}, opts, { method: 'GET' })); },
  post: function(p, body, opts) { return request(p, Object.assign({}, opts, { method: 'POST', body: body })); },
  put: function(p, body, opts) { return request(p, Object.assign({}, opts, { method: 'PUT', body: body })); },
  patch: function(p, body, opts) { return request(p, Object.assign({}, opts, { method: 'PATCH', body: body })); },
  del: function(p, opts) { return request(p, Object.assign({}, opts, { method: 'DELETE' })); },
  refresh: refreshAccessToken,
};
