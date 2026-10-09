// ===== Background Crossfade with Scroll =====
(function() {
  function init() {
    var layers = document.querySelectorAll('.bg-layer');
    if (layers.length < 2) return;

    var sections = document.querySelectorAll('section[id]');
    if (sections.length === 0) return;

    var lastKey = null;

    function activate(key) {
      if (lastKey === key) return;
      lastKey = key;
      layers.forEach(function(layer) {
        if (layer.dataset.section === key) {
          layer.classList.add('active');
        } else {
          layer.classList.remove('active');
        }
      });
    }

    function getScrollY() {
      var scrollY = 0;
      if (typeof window.pageYOffset === 'number') {
        scrollY = window.pageYOffset;
      } else if (document.documentElement.scrollTop) {
        scrollY = document.documentElement.scrollTop;
      } else if (document.body.scrollTop) {
        scrollY = document.body.scrollTop;
      }
      return scrollY;
    }

    function getCurrent() {
      var scrollY = getScrollY();
      var trigger = scrollY + (window.innerHeight * 0.35);

      var current = null;
      for (var i = 0; i < sections.length; i++) {
        var sec = sections[i];
        var top = sec.offsetTop;
        var bottom = top + sec.offsetHeight;
        if (trigger >= top && trigger < bottom) {
          current = sec.id;
          break;
        }
      }
      return current;
    }

    var ticking = false;
    function update() {
      var key = getCurrent();
      if (key) {
        activate(key);
      }
    }

    function onScroll() {
      if (!ticking) {
        window.requestAnimationFrame(function() {
          update();
          ticking = false;
        });
        ticking = true;
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });

    setTimeout(update, 50);
    setTimeout(update, 300);

    if ('IntersectionObserver' in window) {
      var obs = new IntersectionObserver(function(entries) {
        var visible = entries
          .filter(function(e) { return e.isIntersecting; })
          .sort(function(a, b) {
            return b.intersectionRatio - a.intersectionRatio;
          });
        if (visible.length > 0) {
          activate(visible[0].target.id);
        }
      }, {
        threshold: [0.2, 0.5],
        rootMargin: '-25% 0px -25% 0px'
      });
      sections.forEach(function(el) { obs.observe(el); });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
