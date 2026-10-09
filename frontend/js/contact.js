import { api } from './api.js';
import { bootstrapAuth } from './auth.js';
import { showToast, escapeHtml } from './notifications.js';

const els = {
  loading: document.getElementById('chat-loading'),
  needAuth: document.getElementById('chat-need-auth'),
  container: document.getElementById('chat-container'),
  messages: document.getElementById('chat-messages'),
  form: document.getElementById('chat-form'),
  input: document.getElementById('chat-input'),
  sendBtn: document.getElementById('chat-send-btn'),
};

let currentUser = null;
let pollTimer = null;

async function init() {
  currentUser = await bootstrapAuth();

  els.loading.style.display = 'none';

  if (!currentUser) {
    els.needAuth.style.display = 'block';
    var loginBtn = els.needAuth.querySelector('a[href*="auth.html"]');
    if (loginBtn) {
      loginBtn.href = 'auth.html?redirect=contact.html';
    }
    return;
  }

  els.container.style.display = 'flex';
  loadMessages();
  startPolling();
  setupForm();
  setupAutoResize();
}

function startPolling() {
  pollTimer = setInterval(loadMessages, 10000);
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

async function loadMessages() {
  try {
    const res = await api.get('/chat/my', { auth: true });
    renderMessages(res.thread.messages, false);
  } catch (err) {
    // noop
  }
}

async function loadMessagesAnimated() {
  try {
    const res = await api.get('/chat/my', { auth: true });
    renderMessages(res.thread.messages, true);
  } catch (err) {
    // noop
  }
}

function renderMessages(messages, animate) {
  if (!messages || messages.length === 0) {
    els.messages.innerHTML = '<div class="chat-empty"><i class="fas fa-comments"></i><br>لم تبدأ المحادثة بعد. أرسل رسالتك الأولى.</div>';
    return;
  }

  const wasAtBottom = els.messages.scrollHeight - els.messages.scrollTop <= els.messages.clientHeight + 50;

  els.messages.innerHTML = messages.map(function(m, i) {
    const cls = m.isFromAdmin ? 'chat-bubble-admin' : 'chat-bubble-me';
    const time = new Date(m.createdAt).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' });
    const animClass = (animate && i === messages.length - 1) ? ' chat-bubble-new' : '';
    return '<div class="chat-bubble ' + cls + animClass + '">' +
      escapeHtml(m.text) +
      '<small>' + time + '</small>' +
    '</div>';
  }).join('');

  if (wasAtBottom) {
    els.messages.scrollTop = els.messages.scrollHeight;
  }
}


function setupForm() {
  els.form.addEventListener('submit', async function(e) {
    e.preventDefault();
    const text = els.input.value.trim();
    if (!text) return;

    els.sendBtn.disabled = true;
    els.input.value = '';
    els.input.style.height = 'auto';

    try {
      await api.post('/chat/send', { text: text }, { auth: true });
      await loadMessagesAnimated();
      els.messages.scrollTop = els.messages.scrollHeight;
    } catch (err) {
      showToast(err.message || 'فشل الإرسال', 'error');
      els.input.value = text;
    } finally {
      els.sendBtn.disabled = false;
      els.input.focus();
    }
  });
}

function setupAutoResize() {
  els.input.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 120) + 'px';
  });

  els.input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      els.form.requestSubmit();
    }
  });
}


init();
