// ===== Aurora Background — Snow Particles =====
(function() {
  function init() {
    var container = document.getElementById('snow-particles');
    if (!container) return;

    var count = 50;

    for (var i = 0; i < count; i++) {
      var flake = document.createElement('div');
      flake.className = 'snowflake';
      flake.style.left = Math.random() * 100 + '%';
      flake.style.animationDelay = Math.random() * 15 + 's';
      flake.style.animationDuration = (Math.random() * 10 + 12) + 's';
      flake.style.opacity = Math.random() * 0.6 + 0.3;
      flake.style.transform = 'scale(' + (Math.random() * 0.8 + 0.4) + ')';
      container.appendChild(flake);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
