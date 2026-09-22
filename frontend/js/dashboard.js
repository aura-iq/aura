import { requireAuthOrRedirect, logout } from './auth.js';
import { api } from './api.js';
import { showToast, escapeHtml, confirmDialog } from './notifications.js';

const user = await requireAuthOrRedirect();

if (user) {
  init(user);
}

function init(user) {
  document.getElementById('user-chip').querySelector('span').textContent =
    (user.profile && user.profile.fullName) || user.email;

  document.getElementById('p-fullName').value = (user.profile && user.profile.fullName) || '';
  document.getElementById('p-email').value = user.email;
  document.getElementById('p-phone').value = (user.profile && user.profile.phone) || '';
  document.getElementById('p-bio').value = (user.profile && user.profile.bio) || '';

  document.getElementById('profile-form').addEventListener('submit', async function (e) {
    e.preventDefault();
    var btn = document.getElementById('save-profile');
    var orig = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> جارٍ الحفظ...';
    try {
      await api.put('/users/profile', {
        fullName: document.getElementById('p-fullName').value,
        phone: document.getElementById('p-phone').value,
        bio: document.getElementById('p-bio').value,
      }, { auth: true });
      showToast('تم حفظ الملف الشخصي', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = orig;
    }
  });

  document.getElementById('password-form').addEventListener('submit', async function (e) {
    e.preventDefault();
    var fd = new FormData(e.target);
    var ok = await confirmDialog('سيتم تسجيل خروجك من جميع الأجهزة. متابعة؟');
    if (!ok) return;
    var btn = document.getElementById('save-password');
    var orig = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> جارٍ التحديث...';
    try {
      await api.post('/users/change-password', {
        currentPassword: fd.get('currentPassword'),
        newPassword: fd.get('newPassword'),
      }, { auth: true });
      showToast('تم تغيير كلمة المرور', 'success');
      setTimeout(async function () {
        await logout();
        window.location.href = 'auth.html';
      }, 1200);
    } catch (err) {
      showToast(err.message, 'error');
      btn.disabled = false;
      btn.innerHTML = orig;
    }
  });

  loadNotifications();

  document.getElementById('logout-btn').addEventListener('click', async function () {
    await logout();
    showToast('تم تسجيل الخروج', 'info');
    setTimeout(function () { window.location.href = 'index.html'; }, 400);
  });
}

async function loadNotifications() {
  try {
    var res = await api.get('/notifications', { auth: true });
    renderNotifications(res.notifications);
  } catch (e) {
    // noop
  }
}

function renderNotifications(items) {
  var list = document.getElementById('notifications-list');
  if (!items || items.length === 0) return;
  var html = '';
  for (var i = 0; i < items.length; i++) {
    var n = items[i];
    html += '<div style="padding:0.8rem;border-bottom:1px solid rgba(255,255,255,0.06)">';
    html += '<div style="display:flex;justify-content:space-between;align-items:center;gap:0.5rem">';
    html += '<strong style="color:#fff;font-size:0.95rem">' + escapeHtml(n.title) + '</strong>';
    if (!n.isRead) html += '<span class="badge badge-admin">جديد</span>';
    html += '</div>';
    html += '<p style="color:var(--text-secondary);font-size:0.85rem;margin-top:0.3rem">' + escapeHtml(n.body) + '</p>';
    html += '<small style="color:var(--text-secondary);opacity:0.6">' + new Date(n.createdAt).toLocaleString('ar') + '</small>';
    html += '</div>';
  }
  list.innerHTML = html;
}