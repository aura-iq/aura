// ===== عرض اسم المستخدم من localStorage =====

function updateNavbar() {
  var slot = document.getElementById('nav-auth-slot');
  if (!slot) return;

  // 1. اقرأ التوكن
  var token = localStorage.getItem('aura_token');
  if (!token) {
    // غير مسجّل — اترك الزر الافتراضي
    return;
  }

  // 2. اقرأ بيانات المستخدم المخزّنة
  var userStr = localStorage.getItem('aura_user');
  if (!userStr) {
    // ما في بيانات مخزّنة — اترك الزر الافتراضي
    return;
  }

  var user;
  try {
    user = JSON.parse(userStr);
  } catch (e) {
    return;
  }
  if (!user) return;

  // 3. استخرج الاسم — جرّب كل الاحتمالات
  var isAdmin = user.role === 'ADMIN';
  var target = isAdmin ? 'admin.html' : 'dashboard.html';
  var name = user.name;
  if (!name) name = user.fullName;
  if (!name) name = user.displayName;
  if (!name) name = user.profile && user.profile.name;
  if (!name) name = user.profile && user.profile.fullName;
  if (!name) name = user.email;
  if (!name) name = 'حسابي';

  // 4. إذا إيميل — خذ الجزء قبل @
  if (name && name.indexOf('@') !== -1) {
    name = name.split('@')[0];
  }

  // 5. حد أقصى 14 حرف
  if (name.length > 14) {
    name = name.substring(0, 14) + '...';
  }

  var initial = name.charAt(0).toUpperCase();

  var html = '';
  html = html + '<a href="' + target + '" class="nav-user" style="';
  html = html + 'display:inline-flex;align-items:center;gap:0.5rem;';
  html = html + 'padding:0.4rem 0.8rem;border-radius:12px;';
  html = html + 'background:rgba(120,200,255,0.1);';
  html = html + 'border:1px solid rgba(120,200,255,0.25);';
  html = html + 'color:#fff;text-decoration:none;font-weight:600;';
  html = html + 'font-size:0.9rem;max-width:150px;';
  html = html + '">';
  html = html + '<span style="';
  html = html + 'width:26px;height:26px;border-radius:50%;flex-shrink:0;';
  html = html + 'background:linear-gradient(135deg,#7cc4ff,#a855f7);';
  html = html + 'display:flex;align-items:center;justify-content:center;';
  html = html + 'font-weight:800;font-size:0.8rem;color:#fff;';
  html = html + '">' + initial + '</span>';
  html = html + '<span style="';
  html = html + 'white-space:nowrap;overflow:hidden;';
  html = html + 'text-overflow:ellipsis;';
  html = html + '">' + name + '</span>';
  html = html + '</a>';

  slot.innerHTML = html;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', updateNavbar);
} else {
  updateNavbar();
}
