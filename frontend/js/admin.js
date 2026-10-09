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
  setupChatReplyForm();

  var tabButtons = document.querySelectorAll('.tabs button');
  for (var i = 0; i < tabButtons.length; i++) {
    tabButtons[i].addEventListener('click', function () {
      for (var j = 0; j < tabButtons.length; j++) tabButtons[j].classList.remove('active');
      this.classList.add('active');
      var tab = this.dataset.tab;
      ['users', 'messages', 'broadcast', 'chats'].forEach(function (t) {
        document.getElementById('tab-' + t).style.display = t === tab ? '' : 'none';
      });
      if (tab === 'messages') loadNotifications();
      if (tab === 'chats') loadChats();
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
// ===== Admin Chats =====
let currentThreadId = null;
let chatPollTimer = null;

async function loadChats() {
  const list = document.getElementById('chats-list');
  if (!list) return;
  list.innerHTML = '<div class="empty-state"><i class="fas fa-spinner fa-spin"></i></div>';
  try {
    const res = await api.get('/admin/chats/threads', { auth: true });
    renderChatsList(res.threads);
  } catch (err) {
    list.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i>فشل التحميل</div>';
  }
}

function renderChatsList(threads) {
  const list = document.getElementById('chats-list');
  if (!threads || threads.length === 0) {
    list.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i>لا توجد محادثات</div>';
    return;
  }

  list.innerHTML = threads.map(function(t) {
    const name = (t.user && t.user.profile && t.user.profile.fullName) || (t.user && t.user.email) || 'مستخدم';
    const email = (t.user && t.user.email) || '';
    const time = new Date(t.lastMessage).toLocaleString('ar', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
    const preview = (t.lastText || '').slice(0, 40);
    const isActive = currentThreadId === t.id ? ' active' : '';
    return '<div class="chat-item' + isActive + '" data-thread-id="' + t.id + '" data-name="' + escapeHtml(name) + '" data-email="' + escapeHtml(email) + '">' +
      '<div class="chat-item-name">' + escapeHtml(name) + '</div>' +
      '<div class="chat-item-preview">' + escapeHtml(preview) + '</div>' +
      '<div class="chat-item-time">' + time + '</div>' +
    '</div>';
  }).join('');

  list.querySelectorAll('.chat-item').forEach(function(el) {
    el.addEventListener('click', function() {
      openChatThread(el.dataset.threadId, el.dataset.name, el.dataset.email);
    });
  });
}

async function openChatThread(threadId, name, email) {
  currentThreadId = threadId;

  document.querySelectorAll('.chat-item').forEach(function(el) {
    el.classList.toggle('active', el.dataset.threadId === threadId);
  });

  document.getElementById('chat-empty-state').style.display = 'none';
  const view = document.getElementById('chat-view');
  view.classList.add('active');
  document.getElementById('chat-view-name').textContent = name;
  document.getElementById('chat-view-email').textContent = email;

  await loadThreadMessages();

  if (chatPollTimer) clearInterval(chatPollTimer);
  chatPollTimer = setInterval(loadThreadMessages, 5000);

  const input = document.getElementById('chat-reply-input');
  if (input) {
    input.value = '';
    input.style.height = 'auto';
    input.focus();
  }
}

async function loadThreadMessages() {
  if (!currentThreadId) return;
  try {
    const res = await api.get('/admin/chats/threads/' + currentThreadId, { auth: true });
    renderThreadMessages(res.thread.messages);
  } catch (err) {
    // noop
  }
}

function renderThreadMessages(messages) {
  const container = document.getElementById('chat-view-messages');
  if (!messages || messages.length === 0) {
    container.innerHTML = '<div class="chat-empty">لا توجد رسائل بعد</div>';
    return;
  }

  const wasBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 50;

  container.innerHTML = messages.map(function(m) {
    const cls = m.isFromAdmin ? 'chat-bubble-admin' : 'chat-bubble-me';
    const time = new Date(m.createdAt).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' });
    return '<div class="chat-bubble ' + cls + '">' +
      escapeHtml(m.text) +
      '<small>' + time + '</small>' +
    '</div>';
  }).join('');

  if (wasBottom) container.scrollTop = container.scrollHeight;
}

function setupChatReplyForm() {
  const form = document.getElementById('chat-reply-form');
  const input = document.getElementById('chat-reply-input');
  const btn = document.getElementById('chat-reply-btn');
  const refreshBtn = document.getElementById('refresh-chats');

  if (!form) return;
input.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 120) + 'px';
  });

  input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      form.requestSubmit();
    }
  });

  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    if (!currentThreadId) return;
    const text = input.value.trim();
    if (!text) return;

    btn.disabled = true;
    input.value = '';
    input.style.height = 'auto';

    try {
      await api.post('/admin/chats/threads/' + currentThreadId + '/reply', { text: text }, { auth: true });
      await loadThreadMessages();
      const container = document.getElementById('chat-view-messages');
      container.scrollTop = container.scrollHeight;
      loadChats();
    } catch (err) {
      showToast(err.message || 'فشل الإرسال', 'error');
      input.value = text;
    } finally {
      btn.disabled = false;
      input.focus();
    }
  });

  if (refreshBtn) {
    refreshBtn.addEventListener('click', function() {
      loadChats();
      if (currentThreadId) loadThreadMessages();
    });
  }
}
// ===== Admin Notifications =====
async function loadNotifications() {
  const list = document.getElementById('notifications-list');
  if (!list) return;
  list.innerHTML = '<div class="empty-state"><i class="fas fa-spinner fa-spin"></i></div>';
  try {
    const res = await api.get('/notifications', { auth: true });
    renderNotificationsList(res.notifications || []);
  } catch (err) {
    list.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i>فشل التحميل</div>';
  }
}

function getNotifIcon(type) {
  if (type === 'login') return { icon: 'fa-right-to-bracket', cls: 'type-login' };
  if (type === 'signup' || type === 'welcome') return { icon: 'fa-user-plus', cls: 'type-signup' };
  if (type === 'chat') return { icon: 'fa-comments', cls: 'type-chat' };
  if (type === 'broadcast') return { icon: 'fa-bullhorn', cls: '' };
  if (type === 'contact') return { icon: 'fa-envelope', cls: '' };
  return { icon: 'fa-bell', cls: '' };
}

function renderNotificationsList(items) {
  const list = document.getElementById('notifications-list');
  if (!items.length) {
    list.innerHTML = '<div class="empty-state"><i class="fas fa-bell-slash"></i>لا توجد إشعارات</div>';
    return;
  }

  list.innerHTML = items.map(function(n) {
    const ic = getNotifIcon(n.type);
    const time = new Date(n.createdAt).toLocaleString('ar', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
    const unread = !n.isRead ? ' unread' : '';
    const esc = (typeof escapeHtml === 'function') ? escapeHtml : function(s){ return s; };
    return '<div class="notif-item' + unread + '" data-id="' + n.id + '" data-title="' + esc(n.title) + '" data-body="' + esc(n.body) + '" data-time="' + time + '" data-type="' + n.type + '">' +
      '<div class="notif-icon ' + ic.cls + '"><i class="fas ' + ic.icon + '"></i></div>' +
      '<div class="notif-content">' +
        '<div class="notif-title">' + esc(n.title) + '</div>' +
        '<div class="notif-body">' + esc(n.body) + '</div>' +
        '<div class="notif-time">' + time + '</div>' +
      '</div>' +
    '</div>';
  }).join('');

  list.querySelectorAll('.notif-item').forEach(function(el) {
    el.addEventListener('click', function() {
      openNotifModal(el.dataset.title, el.dataset.body, el.dataset.time, el.dataset.type);
      el.classList.remove('unread');
    });
  });
}

function openNotifModal(title, body, time, type) {
  const overlay = document.createElement('div');
  overlay.className = 'notif-modal-overlay';
  const esc = (typeof escapeHtml === 'function') ? escapeHtml : function(s){ return s; };
  const ic = getNotifIcon(type);
  overlay.innerHTML = '<div class="notif-modal">' +
    '<div class="notif-modal-header">' +
      '<h3><i class="fas ' + ic.icon + '"></i> ' + esc(title) + '</h3>' +
      '<button class="close-x" data-close><i class="fas fa-xmark"></i></button>' +
    '</div>' +
    '<div class="notif-modal-body">' + esc(body) + '</div>' +
    '<div class="notif-modal-time">' + time + '</div>' +
  '</div>';
  document.body.appendChild(overlay);
  requestAnimationFrame(function(){ overlay.classList.add('show'); });
  overlay.addEventListener('click', function(e) {
    if (e.target.closest('[data-close]') || e.target === overlay) {
      overlay.classList.remove('show');
      setTimeout(function(){ overlay.remove(); }, 300);
    }
  });
}

// ربط زر التحديث
(function() {
  const refreshBtn = document.getElementById('refresh-notifications');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', loadNotifications);
  }
})();
