import { requireAdminOrRedirect, logout } from './auth.js';
import { api } from './api.js';
import { showToast, escapeHtml, confirmDialog } from './notifications.js';

const user = await requireAdminOrRedirect();

if (user) {
  init();
}

function init() {
  loadStats();
  loadUsers();

  var tabButtons = document.querySelectorAll('.tabs button');
  for (var i = 0; i < tabButtons.length; i++) {
    tabButtons[i].addEventListener('click', function () {
      for (var j = 0; j < tabButtons.length; j++) tabButtons[j].classList.remove('active');
      this.classList.add('active');
      var tab = this.dataset.tab;
      ['users', 'messages', 'broadcast'].forEach(function (t) {
        document.getElementById('tab-' + t).style.display = t === tab ? '' : 'none';
      });
      if (tab === 'messages') loadMessages();
    });
  }

  document.getElementById('user-search-btn').addEventListener('click', function () {
    loadUsers(document.getElementById('user-search').value);
  });
  document.getElementById('user-search').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      loadUsers(e.target.value);
    }
  });

  document.getElementById('broadcast-form').addEventListener('submit', async function (e) {
    e.preventDefault();
    var fd = new FormData(e.target);
    var btn = e.target.querySelector('button[type=submit]');
    var orig = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> جارٍ الإرسال...';
    try {
      var role = fd.get('role');
      var payload = { title: fd.get('title'), body: fd.get('body') };
      if (role) payload.role = role;
      var res = await api.post('/admin/notifications/broadcast', payload, { auth: true });
      showToast('تم إرسال الإشعار إلى ' + res.created + ' مستخدم', 'success');
      e.target.reset();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = orig;
    }
  });

  document.getElementById('logout-btn').addEventListener('click', async function () {
    await logout();
    showToast('تم تسجيل الخروج', 'info');
    setTimeout(function () { window.location.href = 'index.html'; }, 400);
  });
}

async function loadStats() {
  try {
    var s = await api.get('/admin/stats', { auth: true });
    document.getElementById('stats-grid').innerHTML =
      '<div class="stat-mini"><div class="n">' + s.users + '</div><div class="l">إجمالي المستخدمين</div></div>' +
      '<div class="stat-mini"><div class="n">' + s.newUsers7d + '</div><div class="l">جديد آخر 7 أيام</div></div>' +
      '<div class="stat-mini"><div class="n">' + s.suspended + '</div><div class="l">حسابات موقوفة</div></div>' +
      '<div class="stat-mini"><div class="n">' + s.messages + '</div><div class="l">رسائل التواصل</div></div>' +
      '<div class="stat-mini"><div class="n">' + s.unreadMessages + '</div><div class="l">رسائل غير مقروءة</div></div>' +
      '<div class="stat-mini"><div class="n">' + s.notifications + '</div><div class="l">إشعارات غير مقروءة</div></div>';
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function loadUsers(q) {
  q = q || '';
  var tbody = document.querySelector('#users-table tbody');
  tbody.innerHTML = '<tr><td colspan="6" style="text-align:center"><span class="spinner"></span></td></tr>';
  try {
    var res = await api.get('/admin/users?q=' + encodeURIComponent(q), { auth: true });
    if (!res.items || res.items.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state"><i class="fas fa-users-slash"></i>لا يوجد مستخدمون</div></td></tr>';
      return;
    }
    var html = '';
    for (var i = 0; i < res.items.length; i++) {
      var u = res.items[i];
      var fullName = (u.profile && u.profile.fullName) || '—';
      var roleLabel = u.role === 'ADMIN' ? 'مدير' : 'مستخدم';
      var roleClass = u.role === 'ADMIN' ? 'admin' : 'user';
      var statusLabel = u.status === 'ACTIVE' ? 'نشط' : 'موقوف';
      var statusClass = u.status === 'ACTIVE' ? 'active' : 'suspended';
      var date = new Date(u.createdAt).toLocaleDateString('ar');
      var toggleLabel = u.status === 'ACTIVE' ? 'إيقاف' : 'تفعيل';
      var roleLabelBtn = u.role === 'ADMIN' ? 'إزالة الإدارة' : 'ترقية لمدير';

      html += '<tr>';
      html += '<td>' + escapeHtml(fullName) + '</td>';
      html += '<td>' + escapeHtml(u.email) + '</td>';
      html += '<td><span class="badge badge-' + roleClass + '">' + roleLabel + '</span></td>';
      html += '<td><span class="badge badge-' + statusClass + '">' + statusLabel + '</span></td>';
      html += '<td>' + date + '</td>';
      html += '<td>';
      html += '<button class="nav-btn" style="padding:0.35rem 0.8rem;font-size:0.8rem" data-act="toggle" data-id="' + u.id + '" data-status="' + u.status + '">' + toggleLabel + '</button> ';
      html += '<button class="nav-btn" style="padding:0.35rem 0.8rem;font-size:0.8rem" data-act="role" data-id="' + u.id + '" data-role="' + u.role + '">' + roleLabelBtn + '</button> ';
      html += '<button class="nav-btn" style="padding:0.35rem 0.8rem;font-size:0.8rem;border-color:rgba(255,100,100,0.5);color:#ff6464" data-act="delete" data-id="' + u.id + '">حذف</button>';
      html += '</td>';
      html += '</tr>';
    }
    tbody.innerHTML = html;

    var actionButtons = tbody.querySelectorAll('button[data-act]');
    for (var k = 0; k < actionButtons.length; k++) {
      actionButtons[k].addEventListener('click', handleUserAction);
    }
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#ff6464">' + escapeHtml(err.message) + '</td></tr>';
  }
}

async function handleUserAction(e) {
  var btn = e.currentTarget;
  var act = btn.dataset.act;
  var id = btn.dataset.id;

  if (act === 'toggle') {
    var newStatus = btn.dataset.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    var ok1 = await confirmDialog('تأكيد ' + (newStatus === 'SUSPENDED' ? 'إيقاف' : 'تفعيل') + ' المستخدم؟');
    if (!ok1) return;
    try {
      await api.patch('/admin/users/' + id + '/status', { status: newStatus }, { auth: true });
      showToast('تم التحديث', 'success');
      loadUsers();
      loadStats();
    } catch (err) {
      showToast(err.message, 'error');
    }
  } else if (act === 'role') {
    var newRole = btn.dataset.role === 'ADMIN' ? 'USER' : 'ADMIN';
    var ok2 = await confirmDialog('تغيير الدور إلى ' + (newRole === 'ADMIN' ? 'مدير' : 'مستخدم') + '؟');
    if (!ok2) return;
    try {
      await api.patch('/admin/users/' + id + '/role', { role: newRole }, { auth: true });
      showToast('تم التحديث', 'success');
      loadUsers();
      loadStats();
    } catch (err) {
      showToast(err.message, 'error');
    }
  } else if (act === 'delete') {
    var ok3 = await confirmDialog('حذف المستخدم نهائياً؟');
    if (!ok3) return;
    try {
      await api.del('/admin/users/' + id, { auth: true });
      showToast('تم الحذف', 'success');
      loadUsers();
      loadStats();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }
}

async function loadMessages() {
  var tbody = document.querySelector('#messages-table tbody');
  tbody.innerHTML = '<tr><td colspan="5" style="text-align:center"><span class="spinner"></span></td></tr>';
  try {
    var res = await api.get('/admin/messages', { auth: true });
    if (!res.items || res.items.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5"><div class="empty-state"><i class="fas fa-inbox"></i>لا توجد رسائل</div></td></tr>';
      return;
    }
    var html = '';
    for (var i = 0; i < res.items.length; i++) {
      var m = res.items[i];
      var readBtn = !m.isRead ? '<button class="nav-btn" style="padding:0.35rem 0.8rem;font-size:0.8rem" data-read="' + m.id + '">تعليم مقروء</button> ' : '';
      html += '<tr>';
      html += '<td>' + escapeHtml(m.name) + '</td>';
      html += '<td>' + escapeHtml(m.email) + '</td>';
      html += '<td style="max-width:400px">' + escapeHtml(m.message) + '</td>';
      html += '<td>' + new Date(m.createdAt).toLocaleString('ar') + '</td>';
      html += '<td>' + readBtn + '<button class="nav-btn" style="padding:0.35rem 0.8rem;font-size:0.8rem;border-color:rgba(255,100,100,0.5);color:#ff6464" data-del="' + m.id + '">حذف</button></td>';
      html += '</tr>';
    }
    tbody.innerHTML = html;

    tbody.querySelectorAll('button[data-read]').forEach(function (b) {
      b.addEventListener('click', async function () {
        await api.patch('/admin/messages/' + b.dataset.read + '/read', {}, { auth: true });
        showToast('تم', 'success');
        loadMessages();
        loadStats();
      });
    });
    tbody.querySelectorAll('button[data-del]').forEach(function (b) {
      b.addEventListener('click', async function () {
        var ok = await confirmDialog('حذف الرسالة؟');
        if (!ok) return;
        await api.del('/admin/messages/' + b.dataset.del, { auth: true });
        showToast('تم الحذف', 'success');
        loadMessages();
        loadStats();
      });
    });
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#ff6464">' + escapeHtml(err.message) + '</td></tr>';
  }
}