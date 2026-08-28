(function () {
  'use strict';
  var carousels = document.querySelectorAll('[data-carousel]');
  carousels.forEach(function (root) {
    var track = root.querySelector('.carousel-track');
    var slides = root.querySelectorAll('.carousel-slide');
    if (!track || !slides.length) return;
    var index = 0;
    var timer = null;
    var autoplay = Number(root.getAttribute('data-autoplay') || 0);
    var prev = root.querySelector('[data-carousel-prev]');
    var next = root.querySelector('[data-carousel-next]');
    var dotsWrap = root.querySelector('[data-carousel-dots]');
    var dots = [];

    function goto(n) {
      index = (n + slides.length) % slides.length;
      track.style.transform = 'translateX(-' + (index * 100) + '%)';
      dots.forEach(function (dot, i) {
        dot.classList.toggle('is-active', i === index);
      });
    }
    function restart() {
      if (timer) window.clearInterval(timer);
      if (autoplay) timer = window.setInterval(function () { goto(index + 1); }, autoplay);
    }
    if (dotsWrap) {
      for (var i = 0; i < slides.length; i += 1) {
        (function (i) {
          var button = document.createElement('button');
          button.type = 'button';
          button.setAttribute('aria-label', '切换到第 ' + (i + 1) + ' 张');
          button.addEventListener('click', function () { goto(i); restart(); });
          dotsWrap.appendChild(button);
          dots.push(button);
        })(i);
      }
    }
    if (prev) prev.addEventListener('click', function () { goto(index - 1); restart(); });
    if (next) next.addEventListener('click', function () { goto(index + 1); restart(); });
    goto(0);
    restart();
  });
})();
