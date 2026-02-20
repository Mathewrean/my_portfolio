const state = {
  token: sessionStorage.getItem('portfolio_admin_token') || '',
  panel: 'challenges',
  challengePage: 1,
  challengePageSize: 8,
  challengeTotal: 0,
  cache: {
    challenges: [],
    certificates: [],
    projects: [],
    research: [],
    gallery: [],
    blog: [],
  },
};

function $(id) {
  return document.getElementById(id);
}

function setTheme(theme) {
  document.body.setAttribute('data-theme', theme);
  localStorage.setItem('portfolioTheme', theme);
}

function setupThemeToggle() {
  const saved = localStorage.getItem('portfolioTheme') || 'dark';
  setTheme(saved);
  $('themeToggle').addEventListener('click', () => {
    const next = document.body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    setTheme(next);
  });
}

function toast(message, type = 'ok') {
  const el = $('toast');
  if (!el) return;
  el.hidden = false;
  el.className = `toast ${type}`;
  el.textContent = message;
  window.setTimeout(() => {
    el.hidden = true;
  }, 2600);
}

function panelTitle(name) {
  return name[0].toUpperCase() + name.slice(1);
}

function setPanel(panel) {
  state.panel = panel;
  document.querySelectorAll('.admin-nav-btn').forEach((btn) => btn.classList.toggle('active', btn.dataset.panel === panel));
  document.querySelectorAll('.admin-panel').forEach((section) => section.classList.toggle('active', section.dataset.panel === panel));
  $('panelTitle').textContent = panelTitle(panel);
}

async function api(path, opts = {}) {
  const headers = opts.headers || {};
  if (!(opts.body instanceof FormData)) headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  if (state.token) headers['X-Admin-Token'] = state.token;

  const response = await fetch(path, { ...opts, headers });
  if (response.status === 401) {
    showAuth();
    throw new Error('Session expired. Please sign in again.');
  }

  if (response.status === 204) return null;

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }
  return data;
}

function showAuth() {
  $('adminApp').hidden = true;
  $('authGate').style.display = 'grid';
  sessionStorage.removeItem('portfolio_admin_token');
  state.token = '';
}

function showAdmin() {
  $('authGate').style.display = 'none';
  $('adminApp').hidden = false;
}

async function login(password) {
  const data = await api('/api/admin/login', {
    method: 'POST',
    body: JSON.stringify({ password }),
  });
  state.token = data.token;
  sessionStorage.setItem('portfolio_admin_token', data.token);
  showAdmin();
  await refreshAll();
}

function safe(v) {
  return String(v ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function rowActionButtons(kind, id, published) {
  return `
    <button class="btn" data-edit="${kind}" data-id="${id}">Edit</button>
    <button class="btn" data-toggle="${kind}" data-id="${id}">${published ? 'Unpublish' : 'Publish'}</button>
    <button class="btn" data-delete="${kind}" data-id="${id}">Delete</button>
  `;
}

function renderChallenges() {
  $('challengesTable').innerHTML = state.cache.challenges
    .map((item) => `
      <tr>
        <td>${safe(item.title)}</td>
        <td>${safe(item.category)}</td>
        <td>${safe(item.status)}</td>
        <td>${safe(item.difficulty || '-')}</td>
        <td>${item.published ? 'Yes' : 'No'}</td>
        <td>${rowActionButtons('challenge', item.id, item.published)}</td>
      </tr>
    `)
    .join('');

  const pages = Math.max(1, Math.ceil(state.challengeTotal / state.challengePageSize));
  $('challengePageInfo').textContent = `Page ${state.challengePage} / ${pages} (${state.challengeTotal} items)`;
  $('challengePrev').disabled = state.challengePage <= 1;
  $('challengeNext').disabled = state.challengePage >= pages;
}

function renderSimpleTable(tableId, kind, rows, rowBuilder) {
  $(tableId).innerHTML = rows.map((row) => rowBuilder(row)).join('');
}

function bindTableActions() {
  document.querySelectorAll('[data-edit]').forEach((btn) => {
    btn.onclick = () => editItem(btn.dataset.edit, Number(btn.dataset.id));
  });
  document.querySelectorAll('[data-delete]').forEach((btn) => {
    btn.onclick = () => deleteItem(btn.dataset.delete, Number(btn.dataset.id));
  });
  document.querySelectorAll('[data-toggle]').forEach((btn) => {
    btn.onclick = () => toggleItem(btn.dataset.toggle, Number(btn.dataset.id));
  });
}

async function loadChallenges() {
  const search = $('challengeSearch').value.trim();
  const category = $('challengeCategoryFilter').value;
  const status = $('challengeStatusFilter').value;
  const params = new URLSearchParams({
    page: String(state.challengePage),
    pageSize: String(state.challengePageSize),
  });
  if (search) params.set('search', search);
  if (category) params.set('category', category);
  if (status) params.set('status', status);

  const data = await api(`/api/admin/challenges?${params.toString()}`);
  state.cache.challenges = data.items;
  state.challengeTotal = data.total;
  renderChallenges();
}

async function loadSimple(resource, key) {
  state.cache[key] = await api(`/api/admin/${resource}`);
}

function renderAllTables() {
  renderChallenges();

  renderSimpleTable('certTable', 'certificate', state.cache.certificates, (item) => `
    <tr><td>${safe(item.title)}</td><td>${safe(item.issuer)}</td><td>${safe(item.issue_date || '')}</td><td>${item.published ? 'Yes' : 'No'}</td><td>${rowActionButtons('certificate', item.id, item.published)}</td></tr>
  `);

  renderSimpleTable('projectsTable', 'project', state.cache.projects, (item) => `
    <tr><td>${safe(item.title)}</td><td>${safe((item.technologies || []).join(', '))}</td><td>${item.published ? 'Yes' : 'No'}</td><td>${rowActionButtons('project', item.id, item.published)}</td></tr>
  `);

  renderSimpleTable('researchTable', 'research', state.cache.research, (item) => `
    <tr><td>${safe(item.title)}</td><td>${safe(item.publication_date || '')}</td><td>${item.published ? 'Yes' : 'No'}</td><td>${rowActionButtons('research', item.id, item.published)}</td></tr>
  `);

  renderSimpleTable('galleryTable', 'gallery', state.cache.gallery, (item) => `
    <tr><td>${safe(item.caption || '')}</td><td>${safe(item.event_date || '')}</td><td>${item.published ? 'Yes' : 'No'}</td><td>${rowActionButtons('gallery', item.id, item.published)}</td></tr>
  `);

  renderSimpleTable('blogTable', 'blog', state.cache.blog, (item) => `
    <tr><td>${safe(item.title)}</td><td>${safe(item.published_at || '')}</td><td>${item.published ? 'Yes' : 'No'}</td><td>${rowActionButtons('blog', item.id, item.published)}</td></tr>
  `);

  bindTableActions();
}

async function refreshAll() {
  await loadChallenges();
  await Promise.all([
    loadSimple('certificates', 'certificates'),
    loadSimple('projects', 'projects'),
    loadSimple('research', 'research'),
    loadSimple('gallery', 'gallery'),
    loadSimple('blog', 'blog'),
  ]);

  const settings = await api('/api/admin/settings');
  const site = settings.site || {};
  $('siteHeroTitle').value = site.heroTitle || '';
  $('siteHeroSummary').value = site.heroSummary || '';
  $('siteAbout').value = site.about || '';
  $('siteContact').value = JSON.stringify(site.contact || [], null, 2);
  $('thmProfileUrl').value = site.tryhackme?.profileUrl || '';
  $('thmBadgeImage').value = site.tryhackme?.badgeImage || '';

  renderAllTables();
}

function challengeToForm(item) {
  $('challengeId').value = item.id;
  $('challengeTitle').value = item.title || '';
  $('challengeCategory').value = item.category || 'others';
  $('challengePlatform').value = item.platform || '';
  $('challengeDifficulty').value = item.difficulty || '';
  $('challengeStatus').value = item.status || 'Completed';
  $('challengeDate').value = item.date_completed || '';
  $('challengeTags').value = (item.tags || []).join(', ');
  $('challengeMedium').value = item.medium_link || '';
  $('challengeGithub').value = item.github_link || '';
  $('challengeLive').value = item.live_link || '';
  $('challengeSource').value = item.source_site || '';
  $('challengeCtfName').value = item.ctf_name || '';
  $('challengePublished').value = item.published ? '1' : '0';
  $('challengeDescriptionEditor').innerHTML = item.description || '';
}

function resetChallengeForm() {
  $('challengeForm').reset();
  $('challengeId').value = '';
  $('challengeDescriptionEditor').innerHTML = '';
}

function certificateToForm(item) {
  $('certId').value = item.id;
  $('certTitle').value = item.title || '';
  $('certIssuer').value = item.issuer || '';
  $('certDate').value = item.issue_date || '';
  $('certCredential').value = item.credential_id || '';
  $('certVerify').value = item.verification_link || '';
  $('certPublished').value = item.published ? '1' : '0';
}

function projectToForm(item) {
  $('projectId').value = item.id;
  $('projectTitle').value = item.title || '';
  $('projectDescription').value = item.description || '';
  $('projectTech').value = (item.technologies || []).join(', ');
  $('projectGithub').value = item.github_link || '';
  $('projectLive').value = item.live_link || '';
  $('projectPublished').value = item.published ? '1' : '0';
}

function researchToForm(item) {
  $('researchId').value = item.id;
  $('researchTitle').value = item.title || '';
  $('researchDescription').value = item.description || '';
  $('researchDate').value = item.publication_date || '';
  $('researchLink').value = item.link || '';
  $('researchPublished').value = item.published ? '1' : '0';
}

function galleryToForm(item) {
  $('galleryId').value = item.id;
  $('galleryCaption').value = item.caption || '';
  $('galleryDate').value = item.event_date || '';
  $('galleryPublished').value = item.published ? '1' : '0';
}

function blogToForm(item) {
  $('blogId').value = item.id;
  $('blogTitle').value = item.title || '';
  $('blogDate').value = item.published_at || '';
  $('blogLink').value = item.link || '';
  $('blogExcerpt').value = item.excerpt || '';
  $('blogContent').value = item.content || '';
  $('blogPublished').value = item.published ? '1' : '0';
}

function editItem(kind, id) {
  if (kind === 'challenge') {
    const item = state.cache.challenges.find((x) => x.id === id);
    if (item) {
      challengeToForm(item);
      setPanel('challenges');
    }
    return;
  }

  const maps = {
    certificate: ['certificates', certificateToForm, 'certificates'],
    project: ['projects', projectToForm, 'projects'],
    research: ['research', researchToForm, 'research'],
    gallery: ['gallery', galleryToForm, 'gallery'],
    blog: ['blog', blogToForm, 'blog'],
  };
  const map = maps[kind];
  if (!map) return;
  const [cacheKey, applyForm, panel] = map;
  const item = state.cache[cacheKey].find((x) => x.id === id);
  if (item) {
    applyForm(item);
    setPanel(panel);
  }
}

async function deleteItem(kind, id) {
  if (!window.confirm('Delete this item?')) return;
  const map = {
    challenge: 'challenges',
    certificate: 'certificates',
    project: 'projects',
    research: 'research',
    gallery: 'gallery',
    blog: 'blog',
  };
  const resource = map[kind];
  await api(`/api/admin/${resource}/${id}`, { method: 'DELETE' });
  toast('Deleted successfully');
  await refreshAll();
}

async function toggleItem(kind, id) {
  const map = {
    challenge: 'challenges',
    certificate: 'certificates',
    project: 'projects',
    research: 'research',
    gallery: 'gallery',
    blog: 'blog',
  };
  const resource = map[kind];
  await api(`/api/admin/${resource}/${id}/toggle`, { method: 'POST' });
  toast('Visibility updated');
  await refreshAll();
}

function buildChallengeFormData() {
  const fd = new FormData();
  fd.append('title', $('challengeTitle').value.trim());
  fd.append('category', $('challengeCategory').value);
  fd.append('platform', $('challengePlatform').value.trim());
  fd.append('difficulty', $('challengeDifficulty').value.trim());
  fd.append('status', $('challengeStatus').value);
  fd.append('date_completed', $('challengeDate').value);
  fd.append('tags', $('challengeTags').value.trim());
  fd.append('medium_link', $('challengeMedium').value.trim());
  fd.append('github_link', $('challengeGithub').value.trim());
  fd.append('live_link', $('challengeLive').value.trim());
  fd.append('source_site', $('challengeSource').value.trim());
  fd.append('ctf_name', $('challengeCtfName').value.trim());
  fd.append('description', $('challengeDescriptionEditor').innerHTML.trim());
  fd.append('published', $('challengePublished').value);

  const badge = $('challengeBadge').files[0];
  if (badge) fd.append('badge_thumbnail', badge);
  const image = $('challengeImage').files[0];
  if (image) fd.append('hero_image', image);
  Array.from($('challengeScreens').files).forEach((file) => fd.append('screenshots', file));
  Array.from($('challengeAttachments').files).forEach((file) => fd.append('attachments', file));

  return fd;
}

function validateFile(file, allowed, maxMB = 8) {
  if (!file) return true;
  const ext = `.${file.name.split('.').pop().toLowerCase()}`;
  if (!allowed.includes(ext)) return false;
  return file.size <= maxMB * 1024 * 1024;
}

function bindEvents() {
  $('authForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    $('authMessage').textContent = '';
    try {
      await login($('adminPassphrase').value);
      $('adminPassphrase').value = '';
      toast('Signed in');
    } catch (error) {
      $('authMessage').textContent = error.message;
    }
  });

  $('logoutBtn').addEventListener('click', () => {
    showAuth();
  });

  document.querySelectorAll('.admin-nav-btn').forEach((btn) => {
    btn.addEventListener('click', () => setPanel(btn.dataset.panel));
  });

  $('challengeFilterBtn').addEventListener('click', async () => {
    state.challengePage = 1;
    await loadChallenges();
    bindTableActions();
  });
  $('challengePrev').addEventListener('click', async () => {
    if (state.challengePage > 1) state.challengePage -= 1;
    await loadChallenges();
    bindTableActions();
  });
  $('challengeNext').addEventListener('click', async () => {
    state.challengePage += 1;
    await loadChallenges();
    bindTableActions();
  });

  $('challengeForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      if (!Array.from($('challengeScreens').files).every((f) => validateFile(f, ['.jpg', '.jpeg', '.png', '.webp']))) {
        throw new Error('Invalid screenshot file type/size');
      }
      const id = $('challengeId').value;
      const fd = buildChallengeFormData();
      if (id) {
        await api(`/api/admin/challenges/${id}`, { method: 'PUT', body: fd });
        toast('Challenge updated');
      } else {
        await api('/api/admin/challenges', { method: 'POST', body: fd });
        toast('Challenge created');
      }
      resetChallengeForm();
      await refreshAll();
    } catch (error) {
      toast(error.message, 'error');
    }
  });
  $('challengeReset').addEventListener('click', resetChallengeForm);

  $('certForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      const fd = new FormData();
      fd.append('title', $('certTitle').value.trim());
      fd.append('issuer', $('certIssuer').value.trim());
      fd.append('issue_date', $('certDate').value);
      fd.append('credential_id', $('certCredential').value.trim());
      fd.append('verification_link', $('certVerify').value.trim());
      fd.append('published', $('certPublished').value);
      if ($('certImage').files[0]) fd.append('image', $('certImage').files[0]);
      const id = $('certId').value;
      await api(id ? `/api/admin/certificates/${id}` : '/api/admin/certificates', { method: id ? 'PUT' : 'POST', body: fd });
      $('certForm').reset();
      $('certId').value = '';
      toast('Certificate saved');
      await refreshAll();
    } catch (error) {
      toast(error.message, 'error');
    }
  });
  $('certReset').addEventListener('click', () => { $('certForm').reset(); $('certId').value = ''; });

  $('projectForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      const fd = new FormData();
      fd.append('title', $('projectTitle').value.trim());
      fd.append('description', $('projectDescription').value.trim());
      fd.append('technologies', $('projectTech').value.trim());
      fd.append('github_link', $('projectGithub').value.trim());
      fd.append('live_link', $('projectLive').value.trim());
      fd.append('published', $('projectPublished').value);
      if ($('projectImage').files[0]) fd.append('image', $('projectImage').files[0]);
      const id = $('projectId').value;
      await api(id ? `/api/admin/projects/${id}` : '/api/admin/projects', { method: id ? 'PUT' : 'POST', body: fd });
      $('projectForm').reset();
      $('projectId').value = '';
      toast('Project saved');
      await refreshAll();
    } catch (error) {
      toast(error.message, 'error');
    }
  });
  $('projectReset').addEventListener('click', () => { $('projectForm').reset(); $('projectId').value = ''; });

  $('researchForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      const fd = new FormData();
      fd.append('title', $('researchTitle').value.trim());
      fd.append('description', $('researchDescription').value.trim());
      fd.append('publication_date', $('researchDate').value);
      fd.append('link', $('researchLink').value.trim());
      fd.append('published', $('researchPublished').value);
      if ($('researchAttachment').files[0]) fd.append('attachment', $('researchAttachment').files[0]);
      const id = $('researchId').value;
      await api(id ? `/api/admin/research/${id}` : '/api/admin/research', { method: id ? 'PUT' : 'POST', body: fd });
      $('researchForm').reset();
      $('researchId').value = '';
      toast('Research item saved');
      await refreshAll();
    } catch (error) {
      toast(error.message, 'error');
    }
  });
  $('researchReset').addEventListener('click', () => { $('researchForm').reset(); $('researchId').value = ''; });

  $('galleryForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      const fd = new FormData();
      fd.append('caption', $('galleryCaption').value.trim());
      fd.append('event_date', $('galleryDate').value);
      fd.append('published', $('galleryPublished').value);
      if ($('galleryImage').files[0]) fd.append('image', $('galleryImage').files[0]);
      const id = $('galleryId').value;
      await api(id ? `/api/admin/gallery/${id}` : '/api/admin/gallery', { method: id ? 'PUT' : 'POST', body: fd });
      $('galleryForm').reset();
      $('galleryId').value = '';
      toast('Gallery item saved');
      await refreshAll();
    } catch (error) {
      toast(error.message, 'error');
    }
  });
  $('galleryReset').addEventListener('click', () => { $('galleryForm').reset(); $('galleryId').value = ''; });

  $('blogForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      const fd = new FormData();
      fd.append('title', $('blogTitle').value.trim());
      fd.append('excerpt', $('blogExcerpt').value.trim());
      fd.append('content', $('blogContent').value.trim());
      fd.append('published_at', $('blogDate').value);
      fd.append('link', $('blogLink').value.trim());
      fd.append('published', $('blogPublished').value);
      if ($('blogCover').files[0]) fd.append('cover', $('blogCover').files[0]);
      const id = $('blogId').value;
      await api(id ? `/api/admin/blog/${id}` : '/api/admin/blog', { method: id ? 'PUT' : 'POST', body: fd });
      $('blogForm').reset();
      $('blogId').value = '';
      toast('Blog entry saved');
      await refreshAll();
    } catch (error) {
      toast(error.message, 'error');
    }
  });
  $('blogReset').addEventListener('click', () => { $('blogForm').reset(); $('blogId').value = ''; });

  $('siteSettingsForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      const contact = JSON.parse($('siteContact').value || '[]');
      await api('/api/admin/settings/site', {
        method: 'PUT',
        body: JSON.stringify({
          heroTitle: $('siteHeroTitle').value.trim(),
          heroSummary: $('siteHeroSummary').value.trim(),
          about: $('siteAbout').value.trim(),
          contact,
          tryhackme_profile: {
            profileUrl: $('thmProfileUrl').value.trim(),
            badgeImage: $('thmBadgeImage').value.trim(),
          },
        }),
      });
      toast('Settings saved');
    } catch (error) {
      toast(error.message, 'error');
    }
  });
}

(async function init() {
  setupThemeToggle();
  bindEvents();

  if (!state.token) {
    showAuth();
    return;
  }

  try {
    showAdmin();
    await refreshAll();
  } catch {
    showAuth();
  }
})();
