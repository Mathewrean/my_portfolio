const STATIC_DRAFT_KEY = 'portfolio_static_draft_v1';
const ADMIN_PASS_HASH = 'd9493bb755938219730159f498106289738e5bb6ee443a8466df328ad3a630ea';

const CATEGORY_META = {
  tryhackme: { label: 'TryHackMe', description: 'Hands-on room walkthroughs and blue/red team challenge writeups.' },
  hackthebox: { label: 'HackTheBox', description: 'Machine and challenge writeups from HackTheBox labs.' },
  picoctf: { label: 'PicoCTF', description: 'Beginner to intermediate CTF challenge solutions.' },
  ctfroom: { label: 'CTFROOM', description: 'Room-based challenge notes from CTFROOM platform.' },
  ctfzone: { label: 'CTFZone', description: 'Challenge walkthroughs and labs from CTFZone events and practice sets.' },
  cyberdefenders: { label: 'CyberDefenders', description: 'Blue-team and DFIR scenario challenges.' },
  rootme: { label: 'Root-Me', description: 'Web, crypto, stego, and exploitation challenges.' },
  overthewire: { label: 'OverTheWire', description: 'Wargames and Linux fundamentals challenge tracks.' },
  vulnhub: { label: 'VulnHub', description: 'Boot2root and vulnerable machine walkthroughs.' },
  portswigger: { label: 'PortSwigger Labs', description: 'Web security academy lab writeups.' },
  ringzer0: { label: 'RingZer0', description: 'Progressive CTF puzzle and exploit challenges.' },
  hackthissite: { label: 'HackThisSite', description: 'Classic web hacking challenge missions.' },
  ctftime: { label: 'CTFtime Events', description: 'Event-based CTF writeups and summaries.' },
  others: { label: 'Others', description: 'Custom entries from any CTF or challenge source.' },
};

const state = {
  mode: 'api',
  token: sessionStorage.getItem('portfolio_admin_token') || '',
  panel: 'challenges',
  challengePage: 1,
  challengePageSize: 8,
  challengeTotal: 0,
  allChallenges: [],
  site: {
    heroTitle: '',
    heroSummary: '',
    about: '',
    contact: [],
    tryhackme: { profileUrl: '', badgeImage: '' },
  },
  cache: {
    challenges: [],
    certificates: [],
    projects: [],
    research: [],
    gallery: [],
  },
};

function $(id) { return document.getElementById(id); }

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value.trim()) return value.split(',').map((x) => x.trim()).filter(Boolean);
  return [];
}

function safe(v) {
  return String(v ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function uid() {
  return Date.now() + Math.floor(Math.random() * 1000);
}

function safeJsonParse(raw, fallback) {
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

async function sha256(value) {
  const bytes = new TextEncoder().encode(value);
  const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, '0')).join('');
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
  setTimeout(() => { el.hidden = true; }, 3000);
}

function setPanel(panel) {
  state.panel = panel;
  document.querySelectorAll('.admin-nav-btn').forEach((btn) => btn.classList.toggle('active', btn.dataset.panel === panel));
  document.querySelectorAll('.admin-panel').forEach((section) => section.classList.toggle('active', section.dataset.panel === panel));
  $('panelTitle').textContent = panel[0].toUpperCase() + panel.slice(1);
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

async function detectMode() {
  try {
    const res = await fetch('/api/health', { cache: 'no-store' });
    state.mode = res.ok ? 'api' : 'static';
  } catch {
    state.mode = 'static';
  }
  const modeTag = $('modeTag');
  if (modeTag) {
    modeTag.textContent = state.mode === 'api' ? 'API Mode' : 'Static JSON Mode';
  }
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

  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const raw = await response.text();
  const data = isJson && raw ? JSON.parse(raw) : null;

  if (!response.ok) {
    const apiError = data && typeof data === 'object' ? data.error : '';
    throw new Error(apiError || 'API request failed. Ensure Flask backend is running.');
  }
  if (!isJson) throw new Error('API returned non-JSON response.');
  return data;
}

function normalizeChallenge(item) {
  return {
    ...item,
    id: Number(item.id ?? uid()),
    title: item.title || '',
    description: item.description || '',
    category: item.category || 'others',
    platform: item.platform || '',
    difficulty: item.difficulty || '',
    status: item.status || 'Completed',
    date_completed: item.date_completed || item.dateCompleted || '',
    medium_link: item.medium_link || item.mediumLink || '',
    github_link: item.github_link || item.githubLink || '',
    live_link: item.live_link || item.liveLink || '',
    source_site: item.source_site || item.sourceSite || '',
    ctf_name: item.ctf_name || item.ctfName || '',
    badge_thumbnail: item.badge_thumbnail || item.badgeThumbnail || '',
    hero_image: item.hero_image || item.image || '',
    tags: asArray(item.tags),
    screenshots: asArray(item.screenshots),
    attachments: asArray(item.attachments),
    published: item.published !== false && item.published !== 0,
  };
}

function normalizeCertificate(item) {
  return {
    ...item,
    id: Number(item.id ?? uid()),
    title: item.title || item.name || '',
    issuer: item.issuer || '',
    issue_date: item.issue_date || item.date || '',
    image_path: item.image_path || item.image || '',
    verification_link: item.verification_link || item.verificationLink || '',
    credential_id: item.credential_id || item.credentialId || '',
    published: item.published !== false && item.published !== 0,
  };
}

function normalizeProject(item) {
  return {
    ...item,
    id: Number(item.id ?? uid()),
    title: item.title || '',
    description: item.description || '',
    technologies: asArray(item.technologies),
    github_link: item.github_link || item.github || '',
    live_link: item.live_link || item.demo || '',
    image_path: item.image_path || item.image || '',
    published: item.published !== false && item.published !== 0,
  };
}

function normalizeResearch(item) {
  return {
    ...item,
    id: Number(item.id ?? uid()),
    title: item.title || '',
    description: item.description || '',
    publication_date: item.publication_date || item.date || '',
    link: item.link || '',
    published: item.published !== false && item.published !== 0,
  };
}

function normalizeGallery(item) {
  return {
    ...item,
    id: Number(item.id ?? uid()),
    caption: item.caption || '',
    image_path: item.image_path || item.url || '',
    event_date: item.event_date || item.date || '',
    published: item.published !== false && item.published !== 0,
  };
}

async function loadStaticSeed() {
  const draft = localStorage.getItem(STATIC_DRAFT_KEY);
  if (draft) {
    const parsed = safeJsonParse(draft, {});
    state.site = parsed.site || state.site;
    state.allChallenges = (parsed.challenges || []).map(normalizeChallenge);
    state.cache.challenges = [...state.allChallenges];
    state.cache.certificates = (parsed.certificates || []).map(normalizeCertificate);
    state.cache.projects = (parsed.projects || []).map(normalizeProject);
    state.cache.research = (parsed.research || []).map(normalizeResearch);
    state.cache.gallery = (parsed.gallery || []).map(normalizeGallery);
    state.challengeTotal = state.allChallenges.length;
    return;
  }

  const loadJSON = async (path) => {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`Failed to load ${path}`);
    return res.json();
  };

  const [site, challengesRaw, certificates, projects, research, gallery] = await Promise.all([
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
    tryhackme: challengesRaw.tryhackme || { profileUrl: '', badgeImage: '' },
  };

  const flat = [];
  const categories = challengesRaw.categories || {};
  Object.keys(categories).forEach((key) => {
    (categories[key].entries || []).forEach((entry) => {
      flat.push(normalizeChallenge({ ...entry, category: key, platform: entry.platform || categories[key].label || key }));
    });
  });

  state.allChallenges = flat;
  state.cache.challenges = [...state.allChallenges];
  state.cache.certificates = certificates.map(normalizeCertificate);
  state.cache.projects = projects.map(normalizeProject);
  state.cache.research = research.map(normalizeResearch);
  state.cache.gallery = gallery.map(normalizeGallery);
  state.challengeTotal = state.allChallenges.length;

  persistStaticDraft();
}

function persistStaticDraft() {
  const payload = {
    site: state.site,
    challenges: state.allChallenges,
    certificates: state.cache.certificates,
    projects: state.cache.projects,
    research: state.cache.research,
    gallery: state.cache.gallery,
  };
  localStorage.setItem(STATIC_DRAFT_KEY, JSON.stringify(payload));
}

function staticFilePath(input, folder) {
  const f = input.files?.[0];
  if (!f) return '';
  return `uploads/${folder}/${f.name}`;
}

function renderSimpleTable(tableId, kind, rows, rowBuilder) {
  $(tableId).innerHTML = rows.map((row) => rowBuilder(row)).join('');
}

function applyCurrentChallengeFilter() {
  if (state.mode === 'api') return;
  const search = ($('challengeSearch')?.value || '').trim().toLowerCase();
  const category = ($('challengeCategoryFilter')?.value || '').trim();
  const status = ($('challengeStatusFilter')?.value || '').trim();

  const filtered = (state.allChallenges || []).filter((x) => {
    const okSearch =
      !search ||
      (x.title || '').toLowerCase().includes(search) ||
      (x.description || '').toLowerCase().includes(search) ||
      (x.platform || '').toLowerCase().includes(search);
    const okCategory = !category || x.category === category;
    const okStatus = !status || x.status === status;
    return okSearch && okCategory && okStatus;
  });
  state.cache.challenges = filtered;
  state.challengeTotal = filtered.length;
  const maxPage = Math.max(1, Math.ceil(state.challengeTotal / state.challengePageSize));
  if (state.challengePage > maxPage) state.challengePage = maxPage;
}

function refreshCategoryOptions() {
  const filterSelect = $('challengeCategoryFilter');
  const formSelect = $('challengeCategory');
  if (!filterSelect || !formSelect) return;

  const currentFilter = filterSelect.value;
  const currentForm = formSelect.value;
  const keys = new Set(Object.keys(CATEGORY_META));
  (state.allChallenges || []).forEach((c) => keys.add(c.category));

  const sorted = Array.from(keys).sort((a, b) => {
    const la = (CATEGORY_META[a]?.label || a).toLowerCase();
    const lb = (CATEGORY_META[b]?.label || b).toLowerCase();
    return la.localeCompare(lb);
  });

  filterSelect.innerHTML = `<option value=\"\">All categories</option>` + sorted.map((k) => `<option value=\"${safe(k)}\">${safe(CATEGORY_META[k]?.label || k)}</option>`).join('');
  formSelect.innerHTML = sorted.map((k) => `<option value=\"${safe(k)}\">${safe(CATEGORY_META[k]?.label || k)}</option>`).join('');

  if (Array.from(filterSelect.options).some((o) => o.value === currentFilter)) filterSelect.value = currentFilter;
  if (Array.from(formSelect.options).some((o) => o.value === currentForm)) formSelect.value = currentForm;
}

function rowActionButtons(kind, id, published) {
  return `<button type="button" class="btn" data-edit="${kind}" data-id="${id}">Edit</button>
  <button type="button" class="btn" data-toggle="${kind}" data-id="${id}">${published ? 'Unpublish' : 'Publish'}</button>
  <button type="button" class="btn" data-delete="${kind}" data-id="${id}">Delete</button>`;
}

function renderChallenges() {
  const start = (state.challengePage - 1) * state.challengePageSize;
  const pageRows = state.cache.challenges.slice(start, start + state.challengePageSize);
  $('challengesTable').innerHTML = pageRows.map((item) => `
    <tr>
      <td>${safe(item.title)}</td>
      <td>${safe(item.category)}</td>
      <td>${safe(item.status)}</td>
      <td>${safe(item.difficulty || '-')}</td>
      <td>${item.published ? 'Yes' : 'No'}</td>
      <td>${rowActionButtons('challenge', item.id, item.published)}</td>
    </tr>`).join('');

  const pages = Math.max(1, Math.ceil(state.challengeTotal / state.challengePageSize));
  $('challengePageInfo').textContent = `Page ${state.challengePage} / ${pages} (${state.challengeTotal} items)`;
  $('challengePrev').disabled = state.challengePage <= 1;
  $('challengeNext').disabled = state.challengePage >= pages;
}

function renderAllTables() {
  renderChallenges();
  renderSimpleTable('certTable', 'certificate', state.cache.certificates, (item) => `<tr><td>${safe(item.title)}</td><td>${safe(item.issuer)}</td><td>${safe(item.issue_date || '')}</td><td>${item.published ? 'Yes' : 'No'}</td><td>${rowActionButtons('certificate', item.id, item.published)}</td></tr>`);
  renderSimpleTable('projectsTable', 'project', state.cache.projects, (item) => `<tr><td>${safe(item.title)}</td><td>${safe((item.technologies || []).join(', '))}</td><td>${item.published ? 'Yes' : 'No'}</td><td>${rowActionButtons('project', item.id, item.published)}</td></tr>`);
  renderSimpleTable('researchTable', 'research', state.cache.research, (item) => `<tr><td>${safe(item.title)}</td><td>${safe(item.publication_date || '')}</td><td>${item.published ? 'Yes' : 'No'}</td><td>${rowActionButtons('research', item.id, item.published)}</td></tr>`);
  renderSimpleTable('galleryTable', 'gallery', state.cache.gallery, (item) => `<tr><td>${safe(item.caption || '')}</td><td>${safe(item.event_date || '')}</td><td>${item.published ? 'Yes' : 'No'}</td><td>${rowActionButtons('gallery', item.id, item.published)}</td></tr>`);
  bindTableActions();
}

async function refreshAll() {
  if (state.mode === 'api') {
    const c = await api(`/api/admin/challenges?page=${state.challengePage}&pageSize=${state.challengePageSize}`);
    state.cache.challenges = (c.items || []).map(normalizeChallenge);
    state.challengeTotal = c.total || 0;

    const [certs, projects, research, gallery, settings] = await Promise.all([
      api('/api/admin/certificates'), api('/api/admin/projects'), api('/api/admin/research'), api('/api/admin/gallery'), api('/api/admin/settings'),
    ]);
    state.cache.certificates = (certs || []).map(normalizeCertificate);
    state.cache.projects = (projects || []).map(normalizeProject);
    state.cache.research = (research || []).map(normalizeResearch);
    state.cache.gallery = (gallery || []).map(normalizeGallery);
    state.site = {
      heroTitle: settings.site?.heroTitle || '',
      heroSummary: settings.site?.heroSummary || '',
      about: settings.site?.about || '',
      contact: settings.site?.contact || [],
      tryhackme: settings.site?.tryhackme || { profileUrl: '', badgeImage: '' },
    };
  } else {
    await loadStaticSeed();
    refreshCategoryOptions();
    applyCurrentChallengeFilter();
  }

  $('siteHeroTitle').value = state.site.heroTitle || '';
  $('siteHeroSummary').value = state.site.heroSummary || '';
  $('siteAbout').value = state.site.about || '';
  $('siteContact').value = JSON.stringify(state.site.contact || [], null, 2);
  $('thmProfileUrl').value = state.site.tryhackme?.profileUrl || '';
  $('thmBadgeImage').value = state.site.tryhackme?.badgeImage || '';

  refreshCategoryOptions();
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
  $('challengeTags').value = asArray(item.tags).join(', ');
  $('challengeMedium').value = item.medium_link || '';
  $('challengeGithub').value = item.github_link || '';
  $('challengeLive').value = item.live_link || '';
  $('challengeSource').value = item.source_site || '';
  $('challengeCtfName').value = item.ctf_name || '';
  $('challengePublished').value = item.published ? '1' : '0';
  $('challengeDescriptionEditor').innerHTML = item.description || '';
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
  $('projectTech').value = asArray(item.technologies).join(', ');
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

function bindTableActions() {
  // Delegated click handler is bound once in bindEvents().
}

function editItem(kind, id) {
  if (kind === 'challenge') {
    const source = state.mode === 'static' ? state.allChallenges : state.cache.challenges;
    const item = source.find((x) => x.id === id);
    if (item) { challengeToForm(item); setPanel('challenges'); }
    return;
  }
  const maps = {
    certificate: ['certificates', certificateToForm, 'certificates'],
    project: ['projects', projectToForm, 'projects'],
    research: ['research', researchToForm, 'research'],
    gallery: ['gallery', galleryToForm, 'gallery'],
  };
  const map = maps[kind];
  if (!map) return;
  const [cacheKey, applyForm, panel] = map;
  const item = state.cache[cacheKey].find((x) => x.id === id);
  if (item) { applyForm(item); setPanel(panel); }
}

async function deleteItem(kind, id) {
  if (!confirm('Delete this item?')) return;
  if (state.mode === 'api') {
    const map = { challenge: 'challenges', certificate: 'certificates', project: 'projects', research: 'research', gallery: 'gallery' };
    await api(`/api/admin/${map[kind]}/${id}`, { method: 'DELETE' });
  } else {
    const map = { challenge: 'challenges', certificate: 'certificates', project: 'projects', research: 'research', gallery: 'gallery' };
    if (kind === 'challenge') {
      state.allChallenges = state.allChallenges.filter((x) => x.id !== id);
      applyCurrentChallengeFilter();
    } else {
      state.cache[map[kind]] = state.cache[map[kind]].filter((x) => x.id !== id);
    }
    persistStaticDraft();
  }
  toast('Deleted successfully');
  await refreshAll();
}

async function toggleItem(kind, id) {
  if (state.mode === 'api') {
    const map = { challenge: 'challenges', certificate: 'certificates', project: 'projects', research: 'research', gallery: 'gallery' };
    await api(`/api/admin/${map[kind]}/${id}/toggle`, { method: 'POST' });
  } else {
    const map = { challenge: 'challenges', certificate: 'certificates', project: 'projects', research: 'research', gallery: 'gallery' };
    const source = kind === 'challenge' ? state.allChallenges : state.cache[map[kind]];
    const item = source.find((x) => x.id === id);
    if (item) item.published = !item.published;
    if (kind === 'challenge') applyCurrentChallengeFilter();
    persistStaticDraft();
  }
  toast('Visibility updated');
  await refreshAll();
}

function resetForms() {
  $('challengeForm').reset(); $('challengeId').value = ''; $('challengeDescriptionEditor').innerHTML = '';
  $('certForm').reset(); $('certId').value = '';
  $('projectForm').reset(); $('projectId').value = '';
  $('researchForm').reset(); $('researchId').value = '';
  $('galleryForm').reset(); $('galleryId').value = '';
}

function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function buildSiteJson() {
  return {
    heroTitle: state.site.heroTitle,
    heroSummary: state.site.heroSummary,
    about: state.site.about,
    contact: state.site.contact,
  };
}

function buildChallengesJson() {
  const categories = {};
  Object.keys(CATEGORY_META).forEach((key) => {
    categories[key] = {
      label: CATEGORY_META[key].label,
      description: CATEGORY_META[key].description,
      entries: [],
    };
  });

  const source = state.mode === 'static' ? state.allChallenges : state.cache.challenges;
  source.forEach((c) => {
    const cat = categories[c.category] || (categories[c.category] = { label: c.category, description: '', entries: [] });
    cat.entries.push({
      title: c.title,
      description: c.description,
      image: c.hero_image,
      badgeThumbnail: c.badge_thumbnail,
      mediumLink: c.medium_link,
      githubLink: c.github_link,
      liveLink: c.live_link,
      dateCompleted: c.date_completed,
      tags: c.tags,
      difficulty: c.difficulty,
      status: c.status,
      platform: c.platform,
      sourceSite: c.source_site,
      ctfName: c.ctf_name,
      screenshots: c.screenshots,
      attachments: c.attachments,
    });
  });

  return {
    tryhackme: state.site.tryhackme || { profileUrl: '', badgeImage: '' },
    categories,
  };
}

function buildCertificatesJson() {
  return state.cache.certificates.map((c) => ({
    name: c.title,
    issuer: c.issuer,
    date: c.issue_date,
    image: c.image_path,
    credentialId: c.credential_id,
    verificationLink: c.verification_link,
  }));
}

function buildProjectsJson() {
  return state.cache.projects.map((p) => ({
    title: p.title,
    description: p.description,
    technologies: p.technologies,
    github: p.github_link,
    demo: p.live_link,
    image: p.image_path,
  }));
}

function buildResearchJson() {
  return state.cache.research.map((r) => ({
    title: r.title,
    description: r.description,
    link: r.link,
    date: r.publication_date,
  }));
}

function buildGalleryJson() {
  return state.cache.gallery.map((g) => ({
    url: g.image_path,
    caption: g.caption,
    date: g.event_date,
  }));
}

function bindExportButtons() {
  $('downloadSiteJson')?.addEventListener('click', () => downloadJson('site.json', buildSiteJson()));
  $('downloadChallengesJson')?.addEventListener('click', () => downloadJson('challenges.json', buildChallengesJson()));
  $('downloadCertificatesJson')?.addEventListener('click', () => downloadJson('certificates.json', buildCertificatesJson()));
  $('downloadProjectsJson')?.addEventListener('click', () => downloadJson('projects.json', buildProjectsJson()));
  $('downloadResearchJson')?.addEventListener('click', () => downloadJson('research.json', buildResearchJson()));
  $('downloadGalleryJson')?.addEventListener('click', () => downloadJson('gallery.json', buildGalleryJson()));
}

function bindEvents() {
  $('authForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    $('authMessage').textContent = '';
    const pass = $('adminPassphrase').value;
    try {
      if (state.mode === 'api') {
        const data = await api('/api/admin/login', { method: 'POST', body: JSON.stringify({ password: pass }) });
        state.token = data.token;
        sessionStorage.setItem('portfolio_admin_token', data.token);
      } else {
        const hash = await sha256(pass);
        if (hash !== ADMIN_PASS_HASH) throw new Error('Invalid password for static mode.');
      }
      showAdmin();
      await refreshAll();
      toast(`Signed in (${state.mode.toUpperCase()} mode)`);
    } catch (error) {
      $('authMessage').textContent = error.message;
    }
  });

  $('logoutBtn').addEventListener('click', showAuth);
  document.querySelectorAll('.admin-nav-btn').forEach((btn) => btn.addEventListener('click', () => setPanel(btn.dataset.panel)));

  $('adminApp').addEventListener('click', async (event) => {
    const btn = event.target.closest('button[data-edit],button[data-delete],button[data-toggle]');
    if (!btn) return;
    const id = Number(btn.dataset.id);
    if (btn.dataset.edit) {
      editItem(btn.dataset.edit, id);
      return;
    }
    if (btn.dataset.delete) {
      await deleteItem(btn.dataset.delete, id);
      return;
    }
    if (btn.dataset.toggle) {
      await toggleItem(btn.dataset.toggle, id);
    }
  });

  $('challengeFilterBtn').addEventListener('click', async () => {
    state.challengePage = 1;
    if (state.mode === 'api') {
      const search = $('challengeSearch').value.trim();
      const category = $('challengeCategoryFilter').value;
      const status = $('challengeStatusFilter').value;
      const p = new URLSearchParams({ page: String(state.challengePage), pageSize: String(state.challengePageSize) });
      if (search) p.set('search', search);
      if (category) p.set('category', category);
      if (status) p.set('status', status);
      const data = await api(`/api/admin/challenges?${p.toString()}`);
      state.cache.challenges = (data.items || []).map(normalizeChallenge);
      state.challengeTotal = data.total || 0;
    } else {
      applyCurrentChallengeFilter();
    }
    renderAllTables();
  });

  $('challengePrev').addEventListener('click', () => { if (state.challengePage > 1) { state.challengePage -= 1; renderChallenges(); bindTableActions(); } });
  $('challengeNext').addEventListener('click', () => { state.challengePage += 1; renderChallenges(); bindTableActions(); });

  $('challengeForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const id = Number($('challengeId').value || 0);

    if (state.mode === 'api') {
      const fd = new FormData();
      fd.append('title', $('challengeTitle').value.trim());
      fd.append('description', $('challengeDescriptionEditor').innerHTML.trim());
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
      fd.append('published', $('challengePublished').value);
      if ($('challengeBadge').files[0]) fd.append('badge_thumbnail', $('challengeBadge').files[0]);
      if ($('challengeImage').files[0]) fd.append('hero_image', $('challengeImage').files[0]);
      Array.from($('challengeScreens').files).forEach((f) => fd.append('screenshots', f));
      Array.from($('challengeAttachments').files).forEach((f) => fd.append('attachments', f));
      await api(id ? `/api/admin/challenges/${id}` : '/api/admin/challenges', { method: id ? 'PUT' : 'POST', body: fd });
    } else {
      const next = normalizeChallenge({
        id: id || uid(),
        title: $('challengeTitle').value.trim(),
        description: $('challengeDescriptionEditor').innerHTML.trim(),
        category: $('challengeCategory').value,
        platform: $('challengePlatform').value.trim(),
        difficulty: $('challengeDifficulty').value.trim(),
        status: $('challengeStatus').value,
        date_completed: $('challengeDate').value,
        tags: $('challengeTags').value.trim(),
        medium_link: $('challengeMedium').value.trim(),
        github_link: $('challengeGithub').value.trim(),
        live_link: $('challengeLive').value.trim(),
        source_site: $('challengeSource').value.trim(),
        ctf_name: $('challengeCtfName').value.trim(),
        published: $('challengePublished').value === '1',
        badge_thumbnail: staticFilePath($('challengeBadge'), 'challenges'),
        hero_image: staticFilePath($('challengeImage'), 'challenges'),
        screenshots: Array.from($('challengeScreens').files || []).map((f) => `uploads/challenges/${f.name}`),
        attachments: Array.from($('challengeAttachments').files || []).map((f) => `uploads/attachments/${f.name}`),
      });
      const idx = state.allChallenges.findIndex((x) => x.id === next.id);
      if (idx >= 0) state.allChallenges[idx] = next;
      else state.allChallenges.push(next);
      refreshCategoryOptions();
      applyCurrentChallengeFilter();
      persistStaticDraft();
      if ($('challengeBadge').files[0] || $('challengeImage').files[0] || $('challengeScreens').files.length || $('challengeAttachments').files.length) {
        toast('Static mode: JSON paths set. Add selected files manually into docs/uploads before push.', 'ok');
      }
    }

    $('challengeForm').reset();
    $('challengeId').value = '';
    $('challengeDescriptionEditor').innerHTML = '';
    toast('Challenge saved');
    await refreshAll();
  });

  $('challengeReset').addEventListener('click', () => { $('challengeForm').reset(); $('challengeId').value = ''; $('challengeDescriptionEditor').innerHTML = ''; });

  $('certForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const id = Number($('certId').value || 0);
    if (state.mode === 'api') {
      const fd = new FormData();
      fd.append('title', $('certTitle').value.trim());
      fd.append('issuer', $('certIssuer').value.trim());
      fd.append('issue_date', $('certDate').value);
      fd.append('credential_id', $('certCredential').value.trim());
      fd.append('verification_link', $('certVerify').value.trim());
      fd.append('published', $('certPublished').value);
      if ($('certImage').files[0]) fd.append('image', $('certImage').files[0]);
      await api(id ? `/api/admin/certificates/${id}` : '/api/admin/certificates', { method: id ? 'PUT' : 'POST', body: fd });
    } else {
      const item = normalizeCertificate({
        id: id || uid(), title: $('certTitle').value.trim(), issuer: $('certIssuer').value.trim(), issue_date: $('certDate').value,
        credential_id: $('certCredential').value.trim(), verification_link: $('certVerify').value.trim(), published: $('certPublished').value === '1',
        image_path: staticFilePath($('certImage'), 'certificates'),
      });
      const idx = state.cache.certificates.findIndex((x) => x.id === item.id);
      if (idx >= 0) state.cache.certificates[idx] = item; else state.cache.certificates.push(item);
      persistStaticDraft();
    }
    $('certForm').reset(); $('certId').value = ''; toast('Certificate saved'); await refreshAll();
  });
  $('certReset').addEventListener('click', () => { $('certForm').reset(); $('certId').value = ''; });

  $('projectForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const id = Number($('projectId').value || 0);
    if (state.mode === 'api') {
      const fd = new FormData();
      fd.append('title', $('projectTitle').value.trim());
      fd.append('description', $('projectDescription').value.trim());
      fd.append('technologies', $('projectTech').value.trim());
      fd.append('github_link', $('projectGithub').value.trim());
      fd.append('live_link', $('projectLive').value.trim());
      fd.append('published', $('projectPublished').value);
      if ($('projectImage').files[0]) fd.append('image', $('projectImage').files[0]);
      await api(id ? `/api/admin/projects/${id}` : '/api/admin/projects', { method: id ? 'PUT' : 'POST', body: fd });
    } else {
      const item = normalizeProject({
        id: id || uid(), title: $('projectTitle').value.trim(), description: $('projectDescription').value.trim(),
        technologies: $('projectTech').value.trim(), github_link: $('projectGithub').value.trim(), live_link: $('projectLive').value.trim(),
        published: $('projectPublished').value === '1', image_path: staticFilePath($('projectImage'), 'projects'),
      });
      const idx = state.cache.projects.findIndex((x) => x.id === item.id);
      if (idx >= 0) state.cache.projects[idx] = item; else state.cache.projects.push(item);
      persistStaticDraft();
    }
    $('projectForm').reset(); $('projectId').value = ''; toast('Project saved'); await refreshAll();
  });
  $('projectReset').addEventListener('click', () => { $('projectForm').reset(); $('projectId').value = ''; });

  $('researchForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const id = Number($('researchId').value || 0);
    if (state.mode === 'api') {
      const fd = new FormData();
      fd.append('title', $('researchTitle').value.trim());
      fd.append('description', $('researchDescription').value.trim());
      fd.append('publication_date', $('researchDate').value);
      fd.append('link', $('researchLink').value.trim());
      fd.append('published', $('researchPublished').value);
      if ($('researchAttachment').files[0]) fd.append('attachment', $('researchAttachment').files[0]);
      await api(id ? `/api/admin/research/${id}` : '/api/admin/research', { method: id ? 'PUT' : 'POST', body: fd });
    } else {
      const item = normalizeResearch({
        id: id || uid(), title: $('researchTitle').value.trim(), description: $('researchDescription').value.trim(),
        publication_date: $('researchDate').value, link: $('researchLink').value.trim() || staticFilePath($('researchAttachment'), 'research'),
        published: $('researchPublished').value === '1',
      });
      const idx = state.cache.research.findIndex((x) => x.id === item.id);
      if (idx >= 0) state.cache.research[idx] = item; else state.cache.research.push(item);
      persistStaticDraft();
    }
    $('researchForm').reset(); $('researchId').value = ''; toast('Research item saved'); await refreshAll();
  });
  $('researchReset').addEventListener('click', () => { $('researchForm').reset(); $('researchId').value = ''; });

  $('galleryForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const id = Number($('galleryId').value || 0);
    if (state.mode === 'api') {
      const fd = new FormData();
      fd.append('caption', $('galleryCaption').value.trim());
      fd.append('event_date', $('galleryDate').value);
      fd.append('published', $('galleryPublished').value);
      if ($('galleryImage').files[0]) fd.append('image', $('galleryImage').files[0]);
      await api(id ? `/api/admin/gallery/${id}` : '/api/admin/gallery', { method: id ? 'PUT' : 'POST', body: fd });
    } else {
      const item = normalizeGallery({
        id: id || uid(), caption: $('galleryCaption').value.trim(), event_date: $('galleryDate').value,
        image_path: staticFilePath($('galleryImage'), 'gallery'), published: $('galleryPublished').value === '1',
      });
      const idx = state.cache.gallery.findIndex((x) => x.id === item.id);
      if (idx >= 0) state.cache.gallery[idx] = item; else state.cache.gallery.push(item);
      persistStaticDraft();
    }
    $('galleryForm').reset(); $('galleryId').value = ''; toast('Gallery item saved'); await refreshAll();
  });
  $('galleryReset').addEventListener('click', () => { $('galleryForm').reset(); $('galleryId').value = ''; });

  $('siteSettingsForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const nextSite = {
      heroTitle: $('siteHeroTitle').value.trim(),
      heroSummary: $('siteHeroSummary').value.trim(),
      about: $('siteAbout').value.trim(),
      contact: JSON.parse($('siteContact').value || '[]'),
      tryhackme: {
        profileUrl: $('thmProfileUrl').value.trim(),
        badgeImage: $('thmBadgeImage').value.trim(),
      },
    };

    if (state.mode === 'api') {
      await api('/api/admin/settings/site', {
        method: 'PUT',
        body: JSON.stringify({
          heroTitle: nextSite.heroTitle,
          heroSummary: nextSite.heroSummary,
          about: nextSite.about,
          contact: nextSite.contact,
          tryhackme_profile: nextSite.tryhackme,
        }),
      });
    } else {
      state.site = nextSite;
      persistStaticDraft();
    }

    toast('Settings saved');
    await refreshAll();
  });
}

(async function init() {
  setupThemeToggle();
  await detectMode();
  bindEvents();
  bindExportButtons();

  if (!state.token && state.mode === 'api') {
    showAuth();
    return;
  }

  if (state.mode === 'static') {
    showAuth();
    $('authMessage').textContent = 'Static JSON mode active. Login works locally in browser and edits are stored as draft + downloadable JSON files.';
    return;
  }

  try {
    showAdmin();
    await refreshAll();
  } catch {
    showAuth();
  }
})();
