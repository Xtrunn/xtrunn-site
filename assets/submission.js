(() => {
  const form = document.querySelector('#project-form');
  const fields = form.elements;
  const status = document.querySelector('#submission-status');
  const downloads = document.querySelector('#download-list');
  const downloadFields = document.querySelector('#download-fields');
  const features = document.querySelector('#feature-list');
  const preview = document.querySelector('.preview-card');
  const previewLogo = document.querySelector('#preview-logo');
  const placeholder = document.querySelector('#preview-placeholder');
  let logoUrl;
  let manualSlug = false;

  function addRow(list, definitions) {
    const row = document.createElement('div');
    row.className = 'submission-row';
    for (const [key, title, type, maxLength] of definitions) {
      const label = document.createElement('label');
      label.textContent = title;
      const input = document.createElement(type === 'textarea' ? 'textarea' : 'input');
      if (input instanceof HTMLInputElement) input.type = type;
      input.dataset.key = key;
      input.required = true;
      input.maxLength = maxLength;
      if (type === 'url') input.placeholder = 'https://…';
      label.append(input);
      row.append(label);
    }
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'form-secondary';
    remove.textContent = 'Supprimer';
    remove.addEventListener('click', () => {
      row.remove();
      if (list === downloads && !downloads.childElementCount) addDownload();
    });
    row.append(remove);
    list.append(row);
    return row.querySelector('input');
  }

  const addDownload = () => addRow(downloads, [
    ['label', 'Libellé du bouton', 'text', 70], ['url', 'Lien de téléchargement ou de boutique', 'url', 500],
  ]);
  const addFeature = () => addRow(features, [
    ['title', 'Titre', 'text', 80], ['text', 'Description', 'textarea', 600],
  ]);
  document.querySelector('#add-download').addEventListener('click', () => addDownload().focus());
  document.querySelector('#add-feature').addEventListener('click', () => addFeature().focus());

  function updatePreview() {
    const available = fields.status.value === 'available';
    downloadFields.hidden = !available;
    if (available && !downloads.childElementCount) addDownload();
    for (const input of downloads.querySelectorAll('input')) input.disabled = !available;

    document.querySelector('#preview-name').textContent = fields.name.value.trim() || 'Nom du projet';
    document.querySelector('#preview-category').textContent = fields.category.selectedOptions[0].textContent;
    document.querySelector('#preview-status').textContent = available ? fields.pricing.value.trim() : 'En préparation';
    document.querySelector('#preview-summary').textContent = fields.summary.value.trim();
    preview.style.setProperty('--project-color', fields.color.value);
  }

  fields.logo.addEventListener('change', () => {
    if (logoUrl) URL.revokeObjectURL(logoUrl);
    const file = fields.logo.files[0];
    const valid = file && /\.(png|webp|jpe?g)$/i.test(file.name);
    fields.logo.setCustomValidity(file && !valid ? 'Choisissez un logo PNG, WebP ou JPEG.' : '');
    previewLogo.hidden = !valid;
    placeholder.hidden = Boolean(valid);
    if (!valid) {
      previewLogo.removeAttribute('src');
      return;
    }
    logoUrl = URL.createObjectURL(file);
    previewLogo.src = logoUrl;
  });

  form.addEventListener('input', event => {
    if (event.target === fields.slug) manualSlug = Boolean(fields.slug.value);
    if (!manualSlug && event.target === fields.name) {
      fields.slug.value = fields.name.value.toLowerCase().normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    }
    event.target.setCustomValidity?.('');
    updatePreview();
  });

  function collect(list) {
    return Array.from(list.children, row => Object.fromEntries(
      Array.from(row.querySelectorAll('[data-key]'), input => [input.dataset.key, input.value.trim()])
    ));
  }

  function createProject() {
    const requiredText = Array.from(form.querySelectorAll('input[required], textarea[required]'))
      .filter(input => !input.disabled && input.type !== 'file');
    for (const input of requiredText) {
      if (input.value.trim()) continue;
      input.setCustomValidity('Renseignez ce champ.');
      input.reportValidity();
      return;
    }
    const available = fields.status.value === 'available';
    for (const input of downloads.querySelectorAll('input[type="url"]:enabled')) {
      const url = new URL(input.value.trim());
      if (url.protocol === 'https:' && !url.username && !url.password && !/[\s\\]/.test(input.value.trim())) continue;
      input.setCustomValidity('Utilisez une URL HTTPS sans identifiants.');
      input.reportValidity();
      return;
    }
    const extension = fields.logo.files[0].name.split('.').pop().toLowerCase();
    return {
      id: fields.slug.value,
      name: fields.name.value.trim(),
      category: fields.category.value,
      publisher: fields.publisher.value.trim(),
      summary: fields.summary.value.trim(),
      description: fields.description.value.trim(),
      icon: `assets/projects/${fields.slug.value}.${extension}`,
      color: fields.color.value,
      status: fields.status.value,
      pricing: fields.pricing.value.trim(),
      pricingDetails: fields.pricingDetails.value.trim(),
      features: collect(features),
      downloads: available ? collect(downloads) : [],
    };
  }

  function downloadManifest(id, json) {
    const link = document.createElement('a');
    const url = URL.createObjectURL(new Blob([json + '\n'], { type: 'application/json' }));
    link.href = url;
    link.download = id + '.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    const project = createProject();
    if (!project) return;
    const json = JSON.stringify(project, null, 2);
    if (event.submitter?.value === 'export') {
      downloadManifest(project.id, json);
      status.textContent = 'Fiche JSON téléchargée. Conservez aussi le logo choisi.';
      return;
    }
    const issue = new URL('https://github.com/Xtrunn/xtrunn-site/issues/new');
    issue.searchParams.set('title', `Proposition de projet · ${project.name}`);
    const intro = 'Ajoutez le logo à cette proposition avant de l’envoyer.\n\n';
    issue.searchParams.set('body', intro + '~~~~json\n' + json + '\n~~~~');
    if (issue.href.length > 7000) {
      status.textContent = 'La fiche est trop longue pour être préremplie en entier. Le fichier JSON a été téléchargé. Joignez-le avec le logo dans la proposition GitHub.';
      downloadManifest(project.id, json);
      issue.searchParams.set('body', intro + 'Joignez également le fichier JSON téléchargé (ou collez son contenu).');
    } else {
      status.textContent = 'Ajoutez le logo dans le formulaire GitHub, puis envoyez la proposition.';
    }
    window.open(issue.href, '_blank', 'noopener');
  });

  updatePreview();
})();
