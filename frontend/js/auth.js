import { api, setAccessToken } from './api.js';
import { showToast } from './notifications.js';

export async function register(data) {
  const res = await api.post('/auth/register', data);
  setAccessToken(res.accessToken);
  return res.user;
}

export async function login(data) {
  const res = await api.post('/auth/login', data);
  setAccessToken(res.accessToken);
  return res.user;
}

export async function logout() {
  try {
    await api.post('/auth/logout');
  } catch (e) {
    // noop
  }
  setAccessToken(null);
}

export async function fetchMe() {
  try {
    const res = await api.get('/auth/me', { auth: true });
    return res.user;
  } catch (e) {
    return null;
  }
}

export async function bootstrapAuth() {
  try {
    await api.refresh();
    return await fetchMe();
  } catch (e) {
    return null;
  }
}

export function requireAuthOrRedirect() {
  return bootstrapAuth().then(function (user) {
    if (!user) {
      showToast('يرجى تسجيل الدخول', 'warning');
      setTimeout(function () { window.location.href = 'auth.html'; }, 800);
      return null;
    }
    return user;
  });
}

export function requireAdminOrRedirect() {
  return requireAuthOrRedirect().then(function (user) {
    if (user && user.role !== 'ADMIN') {
      showToast('ممنوع الوصول', 'error');
      setTimeout(function () { window.location.href = 'dashboard.html'; }, 800);
      return null;
    }
    return user;
  });
}