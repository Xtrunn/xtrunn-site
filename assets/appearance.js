const root = document.documentElement;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const blackHole = document.querySelector('.black-hole');
const storagePrefix = 'xtrunn-site-color-';
const palettes = {
  accent: { label: 'Accent de l’interface', defaultColor: '#c5b7fb' },
  hole: { label: 'Trou noir', defaultColor: '#a88afe' },
};
const shades = [
  ['Bleu Horizon', '#7db8e8'],
  ['Vert Comète', '#6ee7b7'],
  ['Or Ardent', '#d4af6a'],
  ['Violet Nébuleuse', '#b8a4e3'],
  ['Corail', '#e8a5a0'],
  ['Rose Pulsar', '#e88cb4'],
  ['Turquoise Stellaire', '#6ed2d6'],
  ['Indigo Profond', '#8b93e0'],
];

function pulse(onCollapse = () => {}) {
  if (!blackHole || reducedMotion.matches || !blackHole.animate) {
    onCollapse();
    return;
  }

  blackHole.getAnimations().forEach(animation => animation.cancel());
  blackHole.animate([
    { scale: 1, opacity: 0.92 },
    { scale: 0.24, opacity: 0.32 },
  ], { duration: 280, easing: 'cubic-bezier(.3,0,.2,1)' }).onfinish = () => {
    onCollapse();
    blackHole.animate([
      { scale: 0.24, opacity: 0.32, offset: 0 },
      { scale: 1.07, opacity: 0.92, offset: 0.54 },
      { scale: 1, opacity: 0.92, offset: 1 },
    ], { duration: 540, easing: 'cubic-bezier(.2,.7,.2,1)' });
  };
}

function readColor(key) {
  try {
    const color = localStorage.getItem(storagePrefix + key);
    return /^#[\da-f]{6}$/i.test(color) ? color : palettes[key].defaultColor;
  } catch {
    return palettes[key].defaultColor;
  }
}

const settings = document.createElement('details');
settings.className = 'appearance';
settings.innerHTML = `
  <summary><span class="appearance-icon" aria-hidden="true"></span><span>Couleurs</span></summary>
  <div class="appearance-panel"></div>
`;
const panel = settings.querySelector('.appearance-panel');

for (const [key, { label, defaultColor }] of Object.entries(palettes)) {
  const field = document.createElement('fieldset');
  const legend = document.createElement('legend');
  legend.textContent = label;
  const swatches = document.createElement('div');
  swatches.className = 'swatches';

  const pickerLabel = document.createElement('label');
  pickerLabel.className = 'custom-color';
  const picker = document.createElement('input');
  picker.type = 'color';
  picker.setAttribute('aria-label', `Couleur personnalisée · ${label}`);
  pickerLabel.append('Personnaliser', picker);

  const buttons = [['Par défaut', defaultColor], ...shades].map(([name, color]) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.title = name;
    button.setAttribute('aria-label', name);
    button.style.setProperty('--swatch', color);
    button.addEventListener('click', () => selectColor(color, true));
    swatches.append(button);
    return { button, color };
  });

  let displayedColor;
  function renderColor(color) {
    displayedColor = color;
    root.style.setProperty(`--${key}-color`, color);
  }

  function selectColor(color, animate) {
    try {
      localStorage.setItem(storagePrefix + key, color);
    } catch {
      // Color selection still works for this visit.
    }
    picker.value = color;
    markSelection(color);
    if (key === 'hole' && animate && color !== displayedColor) {
      pulse(() => renderColor(color));
    } else {
      if (key === 'hole') blackHole?.getAnimations?.().forEach(animation => animation.cancel());
      renderColor(color);
    }
  }

  function markSelection(color) {
    for (const swatch of buttons) {
      swatch.button.setAttribute('aria-pressed', String(swatch.color === color));
    }
  }

  picker.value = readColor(key);
  renderColor(picker.value);
  markSelection(picker.value);
  picker.addEventListener('change', () => selectColor(picker.value, true));
  field.append(legend, swatches, pickerLabel);
  panel.append(field);
}

document.querySelector('.topbar nav').append(settings);

document.addEventListener('click', event => {
  if (!settings.contains(event.target)) settings.open = false;
});
settings.addEventListener('keydown', event => {
  if (event.key !== 'Escape' || !settings.open) return;
  settings.open = false;
  settings.querySelector('summary').focus();
});

if (blackHole) {
  const ambient = document.createElement('div');
  ambient.className = 'space-background';
  ambient.setAttribute('aria-hidden', 'true');
  const canvas = document.createElement('canvas');
  ambient.append(canvas);
  document.body.prepend(ambient);
  startStarfield(canvas);
}

function startStarfield(canvas) {
  const context = canvas.getContext('2d');
  if (!context) return;

  let stars = [];
  let timer;
  const draw = () => {
    const time = performance.now() / 1600;
    context.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    context.fillStyle = '#ece9e4';
    for (const star of stars) {
      const twinkle = reducedMotion.matches ? 0 : Math.sin(time + star.phase) * 0.15;
      context.globalAlpha = star.opacity + twinkle;
      context.beginPath();
      context.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;
  };
  const resize = () => {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const density = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.ceil(width * density);
    canvas.height = Math.ceil(height * density);
    context.setTransform(density, 0, 0, density, 0, 0);
    const count = Math.min(300, Math.ceil(width * height / 6700));
    stars = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: 0.25 + Math.random() * 0.9,
      opacity: 0.18 + Math.random() * 0.55,
      phase: Math.random() * Math.PI * 2,
    }));
    draw();
  };
  const updateTimer = () => {
    clearInterval(timer);
    if (!document.hidden && !reducedMotion.matches) timer = setInterval(draw, 100);
    draw();
  };

  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', updateTimer);
  reducedMotion.addEventListener('change', updateTimer);
  resize();
  updateTimer();
}
