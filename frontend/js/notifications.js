export function showToast(message, type = 'info', duration = 4000) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = 'toast toast-' + type;
  const icons = {
    success: 'fa-circle-check',
    error: 'fa-circle-exclamation',
    info: 'fa-circle-info',
    warning: 'fa-triangle-exclamation',
  };
  const iconClass = icons[type] || icons.info;
  const span = document.createElement('span');
  span.textContent = message;
  const i = document.createElement('i');
  i.className = 'fas ' + iconClass;
  toast.appendChild(i);
  toast.appendChild(span);
  container.appendChild(toast);
  requestAnimationFrame(function () { toast.classList.add('show'); });
  setTimeout(function () {
    toast.classList.remove('show');
    setTimeout(function () { toast.remove(); }, 400);
  }, duration);
}

export function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (m) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return map[m];
  });
}

export function confirmDialog(message, title) {
  return new Promise(function (resolve) {
    const t = title || 'تأكيد';
    const overlay = document.createElement('div');
    overlay.className = 'dialog-overlay';
    const box = document.createElement('div');
    box.className = 'dialog';
    const h = document.createElement('h3');
    h.textContent = t;
    const p = document.createElement('p');
    p.textContent = message;
    const actions = document.createElement('div');
    actions.className = 'dialog-actions';
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn-secondary';
    cancelBtn.dataset.act = 'cancel';
    cancelBtn.textContent = 'إلغاء';
    const okBtn = document.createElement('button');
    okBtn.className = 'btn-primary';
    okBtn.dataset.act = 'ok';
    okBtn.textContent = 'تأكيد';
    actions.appendChild(cancelBtn);
    actions.appendChild(okBtn);
    box.appendChild(h);
    box.appendChild(p);
    box.appendChild(actions);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    requestAnimationFrame(function () { overlay.classList.add('show'); });
    overlay.addEventListener('click', function (e) {
      const btn = e.target.closest('[data-act]');
      if (!btn) return;
      const act = btn.dataset.act;
      overlay.classList.remove('show');
      setTimeout(function () { overlay.remove(); }, 250);
      resolve(act === 'ok');
    });
  });
}