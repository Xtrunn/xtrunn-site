(() => {
  const filters = document.querySelector('.catalog-filters');
  if (!filters) return;

  const groups = document.querySelectorAll('.catalog-group');
  const buttons = filters.querySelectorAll('[data-filter]');
  filters.hidden = false;
  filters.addEventListener('click', event => {
    const selected = event.target.closest('[data-filter]');
    if (!selected) return;
    for (const button of buttons) {
      button.setAttribute('aria-pressed', String(button === selected));
    }
    for (const group of groups) {
      group.hidden = selected.dataset.filter !== 'all' && group.dataset.category !== selected.dataset.filter;
    }
  });
})();
