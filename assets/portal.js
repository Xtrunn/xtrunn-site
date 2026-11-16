(() => {
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const menu = document.querySelector('.nav-projects');
  if (menu) {
    document.addEventListener('click', event => {
      if (!menu.contains(event.target) || event.target.closest('a')) menu.open = false;
    });
    menu.addEventListener('keydown', event => {
      if (event.key === 'Escape' && menu.open) {
        menu.open = false;
        menu.querySelector('summary').focus();
      }
    });
  }

  const screen = document.querySelector('.approach-screen');
  const scene = document.querySelector('.portal-scene');
  if (!screen || !scene) return;

  let traveling = false;
  let animations = [];
  const reset = () => {
    animations.forEach(animation => animation.cancel());
    animations = [];
    screen.inert = false;
    traveling = false;
  };

  window.addEventListener('pageshow', event => {
    if (event.persisted) reset();
  });

  document.querySelector('.catalog').addEventListener('click', event => {
    const card = event.target.closest('.catalog-card');
    if (!card || event.defaultPrevented || event.button !== 0 ||
        event.metaKey || event.ctrlKey || event.shiftKey || event.altKey ||
        motion.matches || !screen.animate) return;
    event.preventDefault();
    if (traveling) return;

    traveling = true;
    screen.inert = true;

    const content = screen.getBoundingClientRect();
    const disk = scene.querySelector('.black-hole');
    const centerX = innerWidth / 2 - content.left;
    const centerY = innerHeight / 2 - content.top;
    const coverScale = Math.hypot(innerWidth, innerHeight) / (disk.offsetWidth * .64) + .15;
    const timing = { duration: 1350, easing: 'cubic-bezier(.6,0,.85,.35)', fill: 'forwards' };

    animations = [
      screen.animate([
        { transform: 'scale(1) rotate(0deg)', opacity: 1, filter: 'blur(0)' },
        { opacity: .65, filter: 'blur(1px)', offset: .55 },
        { transform: 'scale(.08) rotate(-12deg)', opacity: 0, filter: 'blur(5px)' },
      ].map(frame => ({ ...frame, transformOrigin: `${centerX}px ${centerY}px` })), timing),
      disk.animate([
        { transform: 'scale(1)' },
        { transform: `scale(${coverScale})` },
      ], timing),
    ];

    Promise.all(animations.map(animation => animation.finished))
      .then(() => location.assign(card.href))
      .catch(reset);
  });
})();
