const ADMIN_PASS_HASH = 'd9493bb755938219730159f498106289738e5bb6ee443a8466df328ad3a630ea';
const DRAFT_KEY = 'portfolio_static_admin_v2';
const IMG_BASE = 'assets/images/challenges/';

const PLATFORM_OPTIONS = [
  'TryHackMe', 'HackTheBox', 'PicoCTF', 'CTFROOM', 'CTFZone', 'Others',
  'CyberDefenders', 'Root-Me', 'OverTheWire', 'VulnHub', 'PortSwigger Labs', 'RingZer0', 'HackThisSite', 'CTFtime Events',
];
const CATEGORY_OPTIONS = ['Web', 'Pwn', 'Crypto', 'Reverse Engineering', 'Forensics', 'OSINT', 'Misc'];

const state = {
  challenges: {},
  certificates: [],
  projects: [],
  research: [],
  gallery: [],
  profile: null,
  resume: null,
  contact: [],
  adminToken: '',
  editing: {},
};

const ADMIN_SECTIONS = [
  { id: 'profile', path: 'data/profile.json', preview: 'profileCurrent', form: 'profileForm', render: renderProfilePreview, fill: fillProfileForm },
  { id: 'resume', path: 'data/resume.json', preview: 'resumePreview' },
  { id: 'certificates', path: 'data/certificates.json', preview: 'certPreview' },
  { id: 'projects', path: 'data/projects.json', preview: 'projectPreview' },
  { id: 'challenges', path: 'data/challenges.json', preview: 'challengePreview' },
  { id: 'research', path: 'data/research.json', preview: 'researchPreview' },
  { id: 'gallery', path: 'data/gallery.json', preview: 'galleryPreview' },
  { id: 'contact', path: 'data/profile.json', preview: 'contactPreview', render: renderContactPreview },
];

function $(id) { return document.getElementById(id); }

function safe(v) {
  return String(v ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function sanitizeText(value) {
  return String(value ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/[\u0000-\u001F\u007F\uFFFD]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function uid() { return Date.now() + Math.floor(Math.random() * 10000); }
function asArray(v) { return Array.isArray(v) ? v : (typeof v === 'string' && v.trim() ? v.split(',').map((x) => x.trim()).filter(Boolean) : []); }

function setTheme(theme) { document.body.setAttribute('data-theme', theme); localStorage.setItem('portfolioTheme', theme); }
function setupThemeToggle() {
  const saved = localStorage.getItem('portfolioTheme') || 'dark';
  setTheme(saved);
  $('themeToggle').addEventListener('click', () => setTheme(document.body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'));
}

function toast(message, type = 'ok') {
  const el = $('toast');
  el.hidden = false;
  el.className = `toast ${type}`;
  el.textContent = message;
  setTimeout(() => { el.hidden = true; }, 2600);
}

function gatherFormData(form) {
  const data = {};
  Array.from(form.elements).forEach((el) => {
    if (!el.name) return;
    data[el.name] = el.value;
  });
  return data;
}

function resetForm(formId) {
  const form = $(formId);
  if (!form) return;
  form.reset();
}

function handleProjectSubmit(e) {
  e.preventDefault();
  const form = $('projectForm');
  const data = gatherFormData(form);
  const entry = {
    title: data.title,
    description: data.description,
    tags: data.tags ? data.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
    repo_url: data.repo_url,
    live_url: data.live_url,
    date: data.date,
  };
  if (state.editing.project != null) {
    state.projects[state.editing.project] = entry;
    state.editing.project = null;
  } else {
    state.projects.push(entry);
  }
  renderDefaultPreview('projects', state.projects);
  resetForm('projectForm');
  toast('Project saved');
}

function handleResearchSubmit(e) {
  e.preventDefault();
  const form = $('researchForm');
  const data = gatherFormData(form);
  const entry = {
    title: data.title,
    description: data.description,
    tags: data.tags ? data.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
    date: data.date,
    markdown: data.markdown,
  };
  const idx = state.editing.research;
  if (idx != null) {
    state.research[idx] = entry;
    state.editing.research = null;
  } else {
    state.research.push(entry);
  }
  renderDefaultPreview('research', state.research);
  resetForm('researchForm');
  toast('Research entry saved');
}

function handleGallerySubmit(e) {
  e.preventDefault();
  const form = $('galleryForm');
  const data = gatherFormData(form);
  const entry = {
    title: data.title,
    caption: data.caption,
    date: data.date,
  };
  const idx = state.editing.gallery;
  if (idx != null) {
    state.gallery[idx] = entry;
    state.editing.gallery = null;
  } else {
    state.gallery.push(entry);
  }
  renderDefaultPreview('gallery', state.gallery);
  resetForm('galleryForm');
  toast('Gallery image saved');
}

function handleChallengeSubmit(e) {
  e.preventDefault();
  const form = $('challengeForm');
  const data = gatherFormData(form);
  const platform = data.platform || 'tryhackme';
  const categories = data.categories ? data.categories.split(',').map((v) => v.trim()).filter(Boolean) : [];
  const obj = {
    title: data.title,
    platform,
    difficulty: data.difficulty,
    description: data.description,
    date: data.date,
    categories,
    markdown: data.markdown,
  };
  const collection = state.challenges[platform] || [];
  if (state.editing.challenge?.platform === platform) {
    collection[state.editing.challenge.index] = obj;
  } else {
    collection.push(obj);
  }
  state.challenges[platform] = collection;
  state.editing.challenge = null;
  renderDefaultPreview('challenges', state.challenges);
  resetForm('challengeForm');
  toast('Challenge saved');
}

function renderProfilePreview(profile) {
  $('profileCurrent').innerHTML = profile ? `
    <p><strong>${safe(profile.name)}</strong></p>
    <p>${safe(profile.tagline)}</p>
    <p>${safe(profile.about)}</p>
    <div class="preview-stack">
      ${profile.contact?.map((c) => `<span class="tag">${safe(c.label)}</span>`).join('') || ''}
    </div>
  ` : '<p>No profile data loaded.</p>';
}

function renderContactPreview(profile) {
  $('contactPreview').innerHTML = profile ? 
    (profile.contact || []).map((c) => `<p><strong>${safe(c.label)}:</strong> ${safe(c.url)}</p>`).join('') : '<p>No contact links.</p>';
}

function renderResumePreview(resume) {
  const container = $('resumePreview');
  if (!resume) return container.innerHTML = '<p>No resume highlights.</p>';
  container.innerHTML = resume.highlights?.map((section) => `
    <div class="card">
      <h3>${safe(section.section)}</h3>
      ${section.items.map((item) => `<p>${safe(item.title)} — ${safe(item.subtitle)}</p>`).join('')}
    </div>
  `).join('') || '<p>No highlights.</p>';
}

function renderCertificatePreview(list) {
  const container = $('certPreview');
  if (!list) return container.innerHTML = '<p>No certificates yet.</p>';
  container.innerHTML = list.map((cert) => `
    <div class="card">
      <p><strong>${safe(cert.title)}</strong></p>
      <p>${safe(cert.issuer)} • ${safe(cert.date)}</p>
    </div>
  `).join('');
}

function fillProfileForm(profile) {
  if (!profile) return;
  const form = $('profileForm');
  form.name.value = profile.name;
  form.tagline.value = profile.tagline;
  form.eyebrow.value = profile.eyebrow;
  form.summary.value = profile.summary;
  form.about.value = profile.about;
  form.contact.value = JSON.stringify(profile.contact || [], null, 2);
}

function fillProjectForm(index) {
  const project = state.projects[index];
  if (!project) return;
  const form = $('projectForm');
  form.title.value = project.title;
  form.description.value = project.description;
  form.tags.value = (project.tags || project.technologies || []).join(', ');
  form.repo_url.value = project.repo_url || project.github_link || '';
  form.live_url.value = project.live_url || '';
  form.date.value = project.date || '';
  state.editing.project = index;
}

function fillChallengeFormEntry(index, platform = 'tryhackme') {
  const entry = state.challenges[platform]?.[index];
  if (!entry) return;
  const form = $('challengeForm');
  form.title.value = entry.title;
  form.platform.value = platform;
  form.difficulty.value = entry.difficulty;
  form.description.value = entry.description;
  form.date.value = entry.date || '';
  form.categories.value = (entry.categories || []).join(', ');
  form.markdown.value = entry.markdown || entry.description || '';
  state.editing.challenge = { platform, index };
}

function fillResearchForm(index) {
  const research = state.research[index];
  if (!research) return;
  const form = $('researchForm');
  form.title.value = research.title;
  form.description.value = research.description;
  form.tags.value = (research.tags || research.categories || []).join(', ');
  form.date.value = research.date || research.publication_date || '';
  form.markdown.value = research.markdown || '';
  state.editing.research = research.id ?? index;
}

function fillGalleryForm(index) {
  const entry = state.gallery[index];
  if (!entry) return;
  const form = $('galleryForm');
  form.title.value = entry.title;
  form.caption.value = entry.caption;
  form.date.value = entry.date || entry.event_date || '';
  state.editing.gallery = entry.id ?? index;
}

async function sha256(value) {
  const bytes = new TextEncoder().encode(value);
  const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function loadJSON(path) {
  const r = await fetch(path);
  if (!r.ok) throw new Error(`Failed to load ${path}`);
  return r.json();
}

async function loadAdminData() {
  for (const section of ADMIN_SECTIONS) {
    try {
      const data = await loadJSON(section.path);
      state[section.id] = data;
      if (section.render) section.render(data);
      else renderDefaultPreview(section.id, data);
      if (section.fill && section.form) section.fill(data);
    } catch (err) {
      console.warn(`Cannot load ${section.id}:`, err);
    }
  }
  setupPreviewHandlers();
}

function setupPreviewHandlers() {
  ['projectPreview', 'challengePreview', 'researchPreview', 'galleryPreview'].forEach((id) => {
    $(id)?.addEventListener('click', handlePreviewAction);
  });
}

function handlePreviewAction(event) {
  const action = event.target.dataset.action;
  const index = Number(event.target.dataset.index);
  switch (action) {
    case 'edit-project':
      fillProjectForm(index);
      break;
    case 'edit-challenge':
      fillChallengeFormEntry(index, event.target.dataset.platform);
      break;
    case 'edit-research':
      fillResearchForm(index);
      break;
    case 'edit-gallery':
      fillGalleryForm(index);
      break;
    default:
      return;
  }
}

async function tryBackendLogin(password) {
  try {
    const response = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (!response.ok) return '';
    const data = await response.json();
    return data.token || '';
  } catch {
    return '';
  }
}

async function uploadChallengeThumbnail(file) {
  if (!state.adminToken || !file) return '';
  const fd = new FormData();
  fd.append('image', file);
  const response = await fetch('/api/admin/static-upload/challenges', {
    method: 'POST',
    headers: { 'X-Admin-Token': state.adminToken },
    body: fd,
  });
  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await response.json() : {};
  if (!response.ok) {
    throw new Error(payload.error || 'Thumbnail upload failed');
  }
  return payload.path || '';
}

function normalizeChallenge(c) {
  return {
    id: Number(c.id ?? uid()),
    title: sanitizeText(c.title) || 'Untitled Challenge',
    platform: sanitizeText(c.platform) || 'Others',
    description: sanitizeText(c.description),
    thumbnail: sanitizeText(c.thumbnail || c.image || ''),
    medium_link: String(c.medium_link || c.mediumLink || '').trim(),
    date_completed: String(c.date_completed || c.dateCompleted || '').trim(),
    categories: asArray(c.categories || c.tags).map((x) => sanitizeText(x)).filter(Boolean),
    difficulty: sanitizeText(c.difficulty),
    status: sanitizeText(c.status) || 'Completed',
    source_site: sanitizeText(c.source_site || c.sourceSite || ''),
    ctf_name: sanitizeText(c.ctf_name || c.ctfName || ''),
    published: c.published !== false,
  };
}

function normalizeCertificate(x) {
  return {
    id: Number(x.id ?? uid()),
    title: x.title || x.name || '',
    issuer: x.issuer || '',
    issue_date: x.issue_date || x.date || '',
    image_path: x.image_path || x.image || '',
    credential_id: x.credential_id || x.credentialId || '',
    verification_link: x.verification_link || x.verificationLink || '',
    published: x.published !== false,
  };
}

function normalizeProject(x) {
  return {
    id: Number(x.id ?? uid()),
    title: x.title || '',
    description: x.description || '',
    technologies: asArray(x.technologies),
    github_link: x.github_link || x.github || '',
    live_link: x.live_link || x.demo || '',
    image_path: x.image_path || x.image || '',
    published: x.published !== false,
  };
}

function normalizeResearch(x) {
  return {
    id: Number(x.id ?? uid()),
    title: x.title || '',
    description: x.description || '',
    publication_date: x.publication_date || x.date || '',
    link: x.link || '',
    published: x.published !== false,
  };
}

function normalizeGallery(x) {
  return {
    id: Number(x.id ?? uid()),
    caption: x.caption || '',
    event_date: x.event_date || x.date || '',
    image_path: x.image_path || x.url || '',
    published: x.published !== false,
  };
}

function renderListPreview(containerId, items, mapper) {
  const container = $(containerId);
  if (!container) return;
  if (!items?.length) {
    container.innerHTML = '<p class="muted">No entries yet.</p>';
    return;
  }
  container.innerHTML = items.map(mapper).join('');
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function generateFileName(original) {
  const name = slugify(original.replace(/\.\w+$/, '')) || 'file';
  const ext = (original.match(/(\.[^.]+)$/) || [''])[0];
  const suffix = Date.now();
  return `${name}-${suffix}${ext}`;
}

function renderDefaultPreview(sectionId, data) {
  switch (sectionId) {
    case 'resume':
      return renderResumePreview(data);
    case 'certificates':
      return renderCertificatePreview(data);
    case 'projects':
      return renderListPreview('projectPreview', data, (item, index) => `
        <div class="card">
          <p><strong>${safe(item.title)}</strong></p>
          <p>${safe(item.description)}</p>
          <div class="toolbar">
            <button class="btn btn-sm" data-action="edit-project" data-index="${index}">Edit</button>
          </div>
        </div>`);
    case 'challenges':
      return renderListPreview('challengePreview', data.tryhackme || [], (item, index) => `
        <div class="card">
          <p><strong>${safe(item.title)}</strong></p>
          <p>${safe(item.description)}</p>
          <div class="toolbar">
            <button class="btn btn-sm" data-action="edit-challenge" data-index="${index}" data-platform="tryhackme">Edit</button>
          </div>
        </div>`);
    case 'research':
      return renderListPreview('researchPreview', data, (item, index) => `
        <div class="card">
          <p><strong>${safe(item.title)}</strong></p>
          <p>${safe(item.description)}</p>
          <div class="toolbar">
            <button class="btn btn-sm" data-action="edit-research" data-index="${index}">Edit</button>
          </div>
        </div>`);
    case 'gallery':
      return renderListPreview('galleryPreview', data, (item, index) => `
        <div class="card">
          <p><strong>${safe(item.title)}</strong></p>
          <p>${safe(item.caption)}</p>
          <div class="toolbar">
            <button class="btn btn-sm" data-action="edit-gallery" data-index="${index}">Edit</button>
          </div>
        </div>`);
    case 'contact':
      return renderContactPreview(data);
    default:
      return;
  }
}

function populateChallengeSelects() {
  const platformFilter = $('challengePlatformFilter');
  const platformForm = $('challengePlatform');
  const categoryFilter = $('challengeCategoryFilter');

  const dataPlatforms = Array.from(new Set(state.challenges.map((x) => x.platform).filter(Boolean)));
  const mergedPlatforms = Array.from(new Set([...PLATFORM_OPTIONS, ...dataPlatforms]));

  platformFilter.innerHTML = '<option value="">All platforms</option>' + mergedPlatforms.map((p) => `<option value="${safe(p)}">${safe(p)}</option>`).join('');
  platformForm.innerHTML = mergedPlatforms.map((p) => `<option value="${safe(p)}">${safe(p)}</option>`).join('');

  const cats = Array.from(new Set(state.challenges.flatMap((x) => x.categories || [])));
  const mergedCats = Array.from(new Set([...CATEGORY_OPTIONS, ...cats]));
  categoryFilter.innerHTML = '<option value="">All categories</option>' + mergedCats.map((c) => `<option value="${safe(c)}">${safe(c)}</option>`).join('');
}

function applyChallengeFilters() {
  const q = $('challengeSearch').value.trim().toLowerCase();
  const platform = $('challengePlatformFilter').value;
  const category = $('challengeCategoryFilter').value;

  state.filteredChallenges = state.challenges.filter((x) => {
    const okQ = !q || x.title.toLowerCase().includes(q) || x.description.toLowerCase().includes(q);
    const okPlatform = !platform || x.platform === platform;
    const okCategory = !category || (x.categories || []).includes(category);
    return okQ && okPlatform && okCategory;
  });

  const maxPage = Math.max(1, Math.ceil(state.filteredChallenges.length / state.pageSize));
  if (state.page > maxPage) state.page = maxPage;
}

function rowActionButtons(kind, id, published) {
  return `<button type="button" class="btn" data-edit="${kind}" data-id="${id}">Edit</button>
  <button type="button" class="btn" data-toggle="${kind}" data-id="${id}">${published ? 'Unpublish' : 'Publish'}</button>
  <button type="button" class="btn" data-delete="${kind}" data-id="${id}">Delete</button>`;
}

function renderChallengesTable() {
  applyChallengeFilters();
  const start = (state.page - 1) * state.pageSize;
  const rows = state.filteredChallenges.slice(start, start + state.pageSize);

  $('challengesTable').innerHTML = rows.map((x) => `
    <tr>
      <td>${safe(x.title)}</td>
      <td>${safe(x.platform)}</td>
      <td>${safe((x.categories || []).join(', '))}</td>
      <td>${safe(x.status)}</td>
      <td>${x.published ? 'Yes' : 'No'}</td>
      <td>${rowActionButtons('challenge', x.id, x.published)}</td>
    </tr>
  `).join('');

  const pages = Math.max(1, Math.ceil(state.filteredChallenges.length / state.pageSize));
  $('challengePageInfo').textContent = `Page ${state.page} / ${pages} (${state.filteredChallenges.length} items)`;
  $('challengePrev').disabled = state.page <= 1;
  $('challengeNext').disabled = state.page >= pages;
}

function renderSimpleTable(tableId, kind, items, columns) {
  $(tableId).innerHTML = items.map((x) => `
    <tr>
      ${columns(x).map((v) => `<td>${v}</td>`).join('')}
      <td>${rowActionButtons(kind, x.id, x.published)}</td>
    </tr>
  `).join('');
}

function renderAllTables() {
  renderChallengesTable();
  renderSimpleTable('certTable', 'certificate', state.certificates, (x) => [safe(x.title), safe(x.issuer), safe(x.issue_date), x.published ? 'Yes' : 'No']);
  renderSimpleTable('projectsTable', 'project', state.projects, (x) => [safe(x.title), safe((x.technologies || []).join(', ')), x.published ? 'Yes' : 'No']);
  renderSimpleTable('researchTable', 'research', state.research, (x) => [safe(x.title), safe(x.publication_date), x.published ? 'Yes' : 'No']);
  renderSimpleTable('galleryTable', 'gallery', state.gallery, (x) => [safe(x.caption), safe(x.event_date), x.published ? 'Yes' : 'No']);
}

function setPanel(panel) {
  document.querySelectorAll('.admin-nav-btn').forEach((b) => b.classList.toggle('active', b.dataset.panel === panel));
  document.querySelectorAll('.admin-panel').forEach((s) => s.classList.toggle('active', s.dataset.panel === panel));
}

function showAuth() { $('authGate').style.display = 'grid'; $('adminApp').hidden = true; }
function showAdmin() { $('authGate').style.display = 'none'; $('adminApp').hidden = false; setPanel('profile'); }

function collectChallengeCategories() {
  return Array.from(document.querySelectorAll('#challengeCategoryChecks input[type="checkbox"]:checked')).map((x) => x.value);
}

function setChallengeCategoryChecks(values) {
  const set = new Set(values || []);
  document.querySelectorAll('#challengeCategoryChecks input[type="checkbox"]').forEach((c) => { c.checked = set.has(c.value); });
}

function renderChallengePreview() {
  const file = $('challengeThumbnail').files[0];
  const img = file ? URL.createObjectURL(file) : $('challengeThumbnailPath').value;
  const title = $('challengeTitle').value.trim() || 'Challenge title';
  const platform = $('challengePlatform').value || 'Platform';
  const diff = $('challengeDifficulty').value.trim() || 'N/A';
  const status = $('challengeStatus').value || 'Status';
  const desc = $('challengeDescriptionEditor').innerText.trim() || 'Challenge description preview.';
  const cats = collectChallengeCategories();
  const medium = $('challengeMedium').value.trim();

  $('challengePreview').innerHTML = `
    <article class="card">
      <img src="${safe(img || 'https://placehold.co/900x600/1b2b4b/e8eefb?text=Thumbnail')}" alt="preview" />
      <h3>${safe(title)}</h3>
      <p class="meta">${safe(platform)} • ${safe(diff)} • ${safe(status)}</p>
      <p>${safe(desc)}</p>
      <div class="tags">${cats.map((c) => `<span class="tag">${safe(c)}</span>`).join('')}</div>
      ${medium ? `<a class="btn" href="${safe(medium)}" target="_blank" rel="noopener noreferrer">Write-up</a>` : ''}
    </article>
  `;
}

function fillChallengeForm(x) {
  $('challengeId').value = x.id;
  $('challengeTitle').value = x.title;
  $('challengePlatform').value = x.platform;
  $('challengeDifficulty').value = x.difficulty;
  $('challengeStatus').value = x.status;
  $('challengeDate').value = x.date_completed;
  $('challengeMedium').value = x.medium_link;
  $('challengeDescriptionEditor').innerText = x.description;
  $('challengePublished').value = x.published ? '1' : '0';
  $('challengeThumbnailPath').value = x.thumbnail || '';
  setChallengeCategoryChecks(x.categories);
  renderChallengePreview();
}

function resetChallengeForm() {
  $('challengeForm').reset();
  $('challengeId').value = '';
  $('challengeDescriptionEditor').innerText = '';
  $('challengeThumbnailPath').value = '';
  setChallengeCategoryChecks([]);
  renderChallengePreview();
}

function findByKind(kind) {
  if (kind === 'challenge') return state.challenges;
  if (kind === 'certificate') return state.certificates;
  if (kind === 'project') return state.projects;
  if (kind === 'research') return state.research;
  if (kind === 'gallery') return state.gallery;
  return [];
}

function persistDraft() {
  localStorage.setItem(DRAFT_KEY, JSON.stringify({
    site: state.site,
    challenges: state.challenges,
    certificates: state.certificates,
    projects: state.projects,
    research: state.research,
    gallery: state.gallery,
  }));
}

function toChallengesJson() {
  return {
    tryhackme: state.site.tryhackme || { profileUrl: '', badgeEmbed: '' },
    challenges: state.challenges.map((x) => ({
      id: x.id,
      title: x.title,
      platform: x.platform,
      description: x.description,
      thumbnail: x.thumbnail,
      medium_link: x.medium_link,
      date_completed: x.date_completed,
      categories: x.categories,
      difficulty: x.difficulty,
      status: x.status,
      source_site: x.source_site || '',
      ctf_name: x.ctf_name || '',
      published: x.published,
    })),
  };
}

function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function bindEvents() {
  $('authForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const pass = $('adminPassphrase').value;
    const hash = await sha256(pass);
    if (hash !== ADMIN_PASS_HASH) {
      $('authMessage').textContent = 'Invalid password.';
      return;
    }
    state.adminToken = await tryBackendLogin(pass);
    $('modeTag').textContent = state.adminToken ? 'Static JSON + Upload API' : 'Static JSON Mode';
    $('authMessage').textContent = '';
    showAdmin();
    await loadAdminData();
  });

  $('logoutBtn').addEventListener('click', showAuth);
  document.querySelectorAll('.admin-nav-btn').forEach((b) => b.addEventListener('click', () => setPanel(b.dataset.panel)));
  $('projectForm')?.addEventListener('submit', handleProjectSubmit);
  $('challengeForm')?.addEventListener('submit', handleChallengeSubmit);
  $('researchForm')?.addEventListener('submit', handleResearchSubmit);
  $('galleryForm')?.addEventListener('submit', handleGallerySubmit);

  $('challengeFilterBtn').addEventListener('click', () => { state.page = 1; renderChallengesTable(); });
  $('challengePrev').addEventListener('click', () => { if (state.page > 1) { state.page -= 1; renderChallengesTable(); } });
  $('challengeNext').addEventListener('click', () => { state.page += 1; renderChallengesTable(); });

  $('challengeThumbnail').addEventListener('change', async () => {
    const f = $('challengeThumbnail').files[0];
    if (!f) {
      renderChallengePreview();
      return;
    }
    $('challengeThumbnailPath').value = `${IMG_BASE}${f.name}`;
    renderChallengePreview();

    if (!state.adminToken) {
      toast('Backend upload unavailable. File path set only; add file manually to docs/assets/images/challenges/.', 'error');
      return;
    }

    try {
      const uploadedPath = await uploadChallengeThumbnail(f);
      if (uploadedPath) {
        $('challengeThumbnailPath').value = uploadedPath;
        renderChallengePreview();
        toast(`Thumbnail uploaded: ${uploadedPath}`);
      }
    } catch (error) {
      toast(error.message, 'error');
    }
  });

  ['challengeTitle', 'challengePlatform', 'challengeDifficulty', 'challengeStatus', 'challengeDate', 'challengeMedium', 'challengePublished'].forEach((id) => {
    $(id).addEventListener('input', renderChallengePreview);
    $(id).addEventListener('change', renderChallengePreview);
  });
  $('challengeDescriptionEditor').addEventListener('input', renderChallengePreview);
  document.querySelectorAll('#challengeCategoryChecks input').forEach((c) => c.addEventListener('change', renderChallengePreview));

  $('challengeForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const title = $('challengeTitle').value.trim();
    if (!title) { toast('Title is required', 'error'); return; }
    const categories = collectChallengeCategories();
    if (!categories.length) { toast('Select at least one CTF category', 'error'); return; }
    const thumbnailPath = $('challengeThumbnailPath').value.trim();
    if (!thumbnailPath) { toast('Thumbnail path is required for challenge cards', 'error'); return; }

    const id = Number($('challengeId').value || 0) || uid();
    const item = normalizeChallenge({
      id,
      title,
      platform: $('challengePlatform').value,
      description: sanitizeText($('challengeDescriptionEditor').innerText),
      thumbnail: sanitizeText(thumbnailPath),
      medium_link: $('challengeMedium').value.trim(),
      date_completed: $('challengeDate').value,
      categories,
      difficulty: sanitizeText($('challengeDifficulty').value),
      status: sanitizeText($('challengeStatus').value),
      published: $('challengePublished').value === '1',
    });

    const idx = state.challenges.findIndex((x) => x.id === id);
    if (idx >= 0) state.challenges[idx] = item; else state.challenges.push(item);
    persistDraft();
    populateChallengeSelects();
    resetChallengeForm();
    renderAllTables();
    toast('Challenge saved. For GitHub Pages, ensure the image exists in docs/assets/images/challenges/ and export challenges.json.');
  });
  $('challengeReset').addEventListener('click', resetChallengeForm);

  $('certForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const id = Number($('certId').value || 0) || uid();
    const item = normalizeCertificate({
      id, title: $('certTitle').value.trim(), issuer: $('certIssuer').value.trim(), issue_date: $('certDate').value,
      credential_id: $('certCredential').value.trim(), verification_link: $('certVerify').value.trim(), published: $('certPublished').value === '1',
      image_path: $('certImage').files[0] ? `assets/images/certificates/${$('certImage').files[0].name}` : '',
    });
    const i = state.certificates.findIndex((x) => x.id === id);
    if (i >= 0) state.certificates[i] = item; else state.certificates.push(item);
    persistDraft(); $('certForm').reset(); $('certId').value = ''; renderAllTables(); toast('Certificate saved');
  });
  $('certReset').addEventListener('click', () => { $('certForm').reset(); $('certId').value = ''; });

  $('projectForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const id = Number($('projectId').value || 0) || uid();
    const item = normalizeProject({
      id, title: $('projectTitle').value.trim(), description: $('projectDescription').value.trim(), technologies: $('projectTech').value.trim(),
      github_link: $('projectGithub').value.trim(), live_link: $('projectLive').value.trim(), published: $('projectPublished').value === '1',
      image_path: $('projectImage').files[0] ? `assets/images/projects/${$('projectImage').files[0].name}` : '',
    });
    const i = state.projects.findIndex((x) => x.id === id);
    if (i >= 0) state.projects[i] = item; else state.projects.push(item);
    persistDraft(); $('projectForm').reset(); $('projectId').value = ''; renderAllTables(); toast('Project saved');
  });
  $('projectReset').addEventListener('click', () => { $('projectForm').reset(); $('projectId').value = ''; });

  $('researchForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const id = Number($('researchId').value || 0) || uid();
    const item = normalizeResearch({
      id, title: $('researchTitle').value.trim(), description: $('researchDescription').value.trim(),
      publication_date: $('researchDate').value, link: $('researchLink').value.trim(), published: $('researchPublished').value === '1',
    });
    const i = state.research.findIndex((x) => x.id === id);
    if (i >= 0) state.research[i] = item; else state.research.push(item);
    persistDraft(); $('researchForm').reset(); $('researchId').value = ''; renderAllTables(); toast('Research saved');
  });
  $('researchReset').addEventListener('click', () => { $('researchForm').reset(); $('researchId').value = ''; });

  $('galleryForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const id = Number($('galleryId').value || 0) || uid();
    const item = normalizeGallery({
      id, caption: $('galleryCaption').value.trim(), event_date: $('galleryDate').value,
      image_path: $('galleryImage').files[0] ? `assets/images/gallery/${$('galleryImage').files[0].name}` : '', published: $('galleryPublished').value === '1',
    });
    const i = state.gallery.findIndex((x) => x.id === id);
    if (i >= 0) state.gallery[i] = item; else state.gallery.push(item);
    persistDraft(); $('galleryForm').reset(); $('galleryId').value = ''; renderAllTables(); toast('Gallery item saved');
  });
  $('galleryReset').addEventListener('click', () => { $('galleryForm').reset(); $('galleryId').value = ''; });

  $('siteSettingsForm').addEventListener('submit', (e) => {
    e.preventDefault();
    try {
      state.site.heroTitle = $('siteHeroTitle').value.trim();
      state.site.heroSummary = $('siteHeroSummary').value.trim();
      state.site.about = $('siteAbout').value.trim();
      state.site.contact = JSON.parse($('siteContact').value || '[]');
      state.site.tryhackme = {
        profileUrl: $('thmProfileUrl').value.trim(),
        badgeEmbed: $('thmBadgeImage').value.trim(),
      };
      persistDraft();
      toast('Site settings saved');
    } catch {
      toast('Invalid contact JSON', 'error');
    }
  });

  $('adminApp').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-edit],button[data-delete],button[data-toggle]');
    if (!btn) return;
    const id = Number(btn.dataset.id);

    if (btn.dataset.edit === 'challenge') {
      const x = state.challenges.find((v) => v.id === id); if (x) { fillChallengeForm(x); setPanel('challenges'); }
    } else if (btn.dataset.edit === 'certificate') {
      const x = state.certificates.find((v) => v.id === id); if (x) { $('certId').value = x.id; $('certTitle').value = x.title; $('certIssuer').value = x.issuer; $('certDate').value = x.issue_date; $('certCredential').value = x.credential_id; $('certVerify').value = x.verification_link; $('certPublished').value = x.published ? '1' : '0'; setPanel('certificates'); }
    } else if (btn.dataset.edit === 'project') {
      const x = state.projects.find((v) => v.id === id); if (x) { $('projectId').value = x.id; $('projectTitle').value = x.title; $('projectDescription').value = x.description; $('projectTech').value = (x.technologies || []).join(', '); $('projectGithub').value = x.github_link; $('projectLive').value = x.live_link; $('projectPublished').value = x.published ? '1' : '0'; setPanel('projects'); }
    } else if (btn.dataset.edit === 'research') {
      const x = state.research.find((v) => v.id === id); if (x) { $('researchId').value = x.id; $('researchTitle').value = x.title; $('researchDescription').value = x.description; $('researchDate').value = x.publication_date; $('researchLink').value = x.link; $('researchPublished').value = x.published ? '1' : '0'; setPanel('research'); }
    } else if (btn.dataset.edit === 'gallery') {
      const x = state.gallery.find((v) => v.id === id); if (x) { $('galleryId').value = x.id; $('galleryCaption').value = x.caption; $('galleryDate').value = x.event_date; $('galleryPublished').value = x.published ? '1' : '0'; setPanel('gallery'); }
    }

    if (btn.dataset.delete) {
      if (!confirm('Delete this item?')) return;
      const map = { challenge: state.challenges, certificate: state.certificates, project: state.projects, research: state.research, gallery: state.gallery };
      const arr = map[btn.dataset.delete];
      const idx = arr.findIndex((x) => x.id === id);
      if (idx >= 0) arr.splice(idx, 1);
      populateChallengeSelects();
      persistDraft();
      renderAllTables();
    }

    if (btn.dataset.toggle) {
      const map = { challenge: state.challenges, certificate: state.certificates, project: state.projects, research: state.research, gallery: state.gallery };
      const arr = map[btn.dataset.toggle];
      const item = arr.find((x) => x.id === id);
      if (item) item.published = !item.published;
      persistDraft();
      renderAllTables();
    }
  });

  $('downloadSiteJson').addEventListener('click', () => downloadJson('site.json', { heroTitle: state.site.heroTitle, heroSummary: state.site.heroSummary, about: state.site.about, contact: state.site.contact }));
  $('downloadChallengesJson').addEventListener('click', () => downloadJson('challenges.json', toChallengesJson()));
  $('downloadCertificatesJson').addEventListener('click', () => downloadJson('certificates.json', state.certificates.map((x) => ({ name: x.title, issuer: x.issuer, date: x.issue_date, image: x.image_path, credentialId: x.credential_id, verificationLink: x.verification_link }))));
  $('downloadProjectsJson').addEventListener('click', () => downloadJson('projects.json', state.projects.map((x) => ({ title: x.title, description: x.description, technologies: x.technologies, github: x.github_link, demo: x.live_link, image: x.image_path }))));
  $('downloadResearchJson').addEventListener('click', () => downloadJson('research.json', state.research.map((x) => ({ title: x.title, description: x.description, link: x.link, date: x.publication_date }))));
  $('downloadGalleryJson').addEventListener('click', () => downloadJson('gallery.json', state.gallery.map((x) => ({ url: x.image_path, caption: x.caption, date: x.event_date }))));
}

async function init() {
  setupThemeToggle();
  $('modeTag').textContent = 'Static JSON Mode';
  bindEvents();

  const draft = localStorage.getItem(DRAFT_KEY);
  if (draft) {
    const d = JSON.parse(draft);
    state.site = d.site || state.site;
    state.challenges = (d.challenges || []).map(normalizeChallenge);
    state.certificates = (d.certificates || []).map(normalizeCertificate);
    state.projects = (d.projects || []).map(normalizeProject);
    state.research = (d.research || []).map(normalizeResearch);
    state.gallery = (d.gallery || []).map(normalizeGallery);
  } else {
    const [site, challenges, certificates, projects, research, gallery] = await Promise.all([
      loadJSON('data/site.json'),
      loadJSON('data/challenges.json'),
      loadJSON('data/certificates.json'),
      loadJSON('data/projects.json'),
      loadJSON('data/research.json'),
      loadJSON('data/gallery.json'),
    ]);
    state.site = {
      heroTitle: site.heroTitle || '',
      heroSummary: site.heroSummary || '',
      about: site.about || '',
      contact: site.contact || [],
      tryhackme: challenges.tryhackme || { profileUrl: '', badgeEmbed: '' },
    };
    state.challenges = (challenges.challenges || []).map(normalizeChallenge);
    state.certificates = certificates.map(normalizeCertificate);
    state.projects = projects.map(normalizeProject);
    state.research = research.map(normalizeResearch);
    state.gallery = gallery.map(normalizeGallery);
    persistDraft();
  }

  $('siteHeroTitle').value = state.site.heroTitle || '';
  $('siteHeroSummary').value = state.site.heroSummary || '';
  $('siteAbout').value = state.site.about || '';
  $('siteContact').value = JSON.stringify(state.site.contact || [], null, 2);
  $('thmProfileUrl').value = state.site.tryhackme?.profileUrl || '';
  $('thmBadgeImage').value = state.site.tryhackme?.badgeEmbed || '';

  populateChallengeSelects();
  renderChallengePreview();
  showAuth();
  renderAllTables();
}

init().catch((err) => {
  console.error(err);
  $('authMessage').textContent = 'Failed to initialize static admin. Check JSON files.';
});
