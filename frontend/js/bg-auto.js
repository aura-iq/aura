// ===== Auto Slideshow for Backgrounds (3s) =====
(function() {
  function init() {
    var layers = document.querySelectorAll('.bg-layer');
    if (layers.length < 2) return;

    var current = 0;
    var interval = 3000; // 3 ثواني

    // تأكد أن الأول نشط
    layers.forEach(function(l, i) {
      if (i === 0) l.classList.add('active');
      else l.classList.remove('active');
    });

    setInterval(function() {
      layers[current].classList.remove('active');
      current = (current + 1) % layers.length;
      layers[current].classList.add('active');
    }, interval);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
