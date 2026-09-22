const API_BASE = window.AURA_API || 'http://localhost:4000/api';

let accessToken = null;

export function setAccessToken(t) {
  accessToken = t;
}

export function getAccessToken() {
  return accessToken;
}

let refreshPromise = null;

async function refreshAccessToken() {
  if (refreshPromise) return refreshPromise;
  refreshPromise = fetch(API_BASE + '/auth/refresh', {
    method: 'POST',
    credentials: 'include',
  })
    .then(function (r) {
      if (!r.ok) throw new Error('REFRESH_FAILED');
      return r.json();
    })
    .then(function (data) {
      accessToken = data.data.accessToken;
      return accessToken;
    })
    .finally(function () {
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
  if (auth && accessToken) headers['Authorization'] = 'Bearer ' + accessToken;

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
      // fallthrough
    }
  }

  let payload = null;
  try {
    payload = await res.json();
  } catch (e) {
    // noop
  }

  if (!res.ok) {
    const msg = payload && payload.error && payload.error.message
      ? payload.error.message
      : 'خطأ في الطلب';
    const err = new Error(msg);
    err.code = payload && payload.error ? payload.error.code : 'UNKNOWN';
    err.status = res.status;
    err.details = payload && payload.error ? payload.error.details : null;
    throw err;
  }

  if (payload && payload.data !== undefined) return payload.data;
  return payload;
}

export const api = {
  get: function (p, opts) { return request(p, Object.assign({}, opts, { method: 'GET' })); },
  post: function (p, body, opts) { return request(p, Object.assign({}, opts, { method: 'POST', body: body })); },
  put: function (p, body, opts) { return request(p, Object.assign({}, opts, { method: 'PUT', body: body })); },
  patch: function (p, body, opts) { return request(p, Object.assign({}, opts, { method: 'PATCH', body: body })); },
  del: function (p, opts) { return request(p, Object.assign({}, opts, { method: 'DELETE' })); },
  refresh: refreshAccessToken,
  API_BASE: API_BASE,
};