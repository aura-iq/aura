// ===== Hero Full-Background Slideshow tied to Scroll =====
(function() {
  function init() {
    var slides = document.querySelectorAll('.hero-slide');
    if (slides.length === 0) return;

    // خريطة: اسم القسم → رقم الصورة
    var sections = {
      home: slides[0],
      features: slides[1],
      stats: slides[2],
      'social-section': slides[3]
    };

    function activate(name) {
      var target = sections[name];
      if (!target) return;
      slides.forEach(function(s) { s.classList.remove('active'); });
      target.classList.add('active');
    }

    activate('home');

    var sectionEls = document.querySelectorAll('section[id]');
    if (!sectionEls.length) return;

    function isRelevant(id) {
      if (id === 'home') return 'home';
      if (id === 'features') return 'features';
      if (id === 'stats') return 'stats';
      if (id === 'social-section') return 'social-section';
      return null;
    }

    var observer = new IntersectionObserver(function(entries) {
      var visible = entries
        .filter(function(e) { return e.isIntersecting; })
        .sort(function(a, b) { return b.intersectionRatio - a.intersectionRatio; });

      if (visible.length > 0) {
        var id = visible[0].target.id;
        var target = isRelevant(id);
        if (target) activate(target);
      }
    }, {
      threshold: [0.3, 0.5, 0.7],
      rootMargin: '-20% 0px -20% 0px'
    });

    sectionEls.forEach(function(el) { observer.observe(el); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
