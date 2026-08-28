(() => {
  const root = document.documentElement;
  root.classList.add('js-enabled');

  const header = document.querySelector('.dt-header');
  const hero = document.querySelector('[data-hero-slider]');
  if (header && hero && 'IntersectionObserver' in window) {
    const headerObserver = new IntersectionObserver(([entry]) => header.classList.toggle('is-scrolled', !entry.isIntersecting), { threshold: 0.02 });
    headerObserver.observe(hero);
  }
  if (!hero) return;
  const slides = [...hero.querySelectorAll('[data-hero-slide]')];
  const dots = [...hero.querySelectorAll('[data-hero-dot]')];
  if (slides.length < 2) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let activeIndex = 0;
  let timer;

  const setSlide = (index) => {
    activeIndex = (index + slides.length) % slides.length;
    slides.forEach((slide, itemIndex) => {
      const active = itemIndex === activeIndex;
      slide.classList.toggle('is-active', active);
      slide.setAttribute('aria-hidden', String(!active));
    });
    dots.forEach((dot, itemIndex) => {
      const active = itemIndex === activeIndex;
      dot.classList.toggle('is-active', active);
      dot.setAttribute('aria-current', active ? 'true' : 'false');
    });
  };

  const stop = () => window.clearInterval(timer);
  const start = () => {
    stop();
    if (!reduceMotion) timer = window.setInterval(() => setSlide(activeIndex + 1), 6800);
  };

  dots.forEach((dot, index) => dot.addEventListener('click', () => { setSlide(index); start(); }));
  hero.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowRight') { setSlide(activeIndex + 1); start(); }
    if (event.key === 'ArrowLeft') { setSlide(activeIndex - 1); start(); }
  });
  hero.addEventListener('pointerenter', stop);
  hero.addEventListener('pointerleave', start);
  hero.addEventListener('focusin', stop);
  hero.addEventListener('focusout', start);
  setSlide(0);
  start();
})();
