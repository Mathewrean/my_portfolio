const ADMIN_PASS_HASH = 'd9493bb755938219730159f498106289738e5bb6ee443a8466df328ad3a630ea';
const DRAFT_KEY = 'portfolio_static_admin_v2';
const IMG_BASE = 'assets/images/challenges/';

const PLATFORM_OPTIONS = [
  'TryHackMe', 'HackTheBox', 'PicoCTF', 'CTFROOM', 'CTFZone', 'Others',
  'CyberDefenders', 'Root-Me', 'OverTheWire', 'VulnHub', 'PortSwigger Labs', 'RingZer0', 'HackThisSite', 'CTFtime Events',
];
const CATEGORY_OPTIONS = ['Web', 'Pwn', 'Crypto', 'Reverse Engineering', 'Forensics', 'OSINT', 'Misc'];

const state = {
  challenges: [],
  certificates: [],
  projects: [],
  research: [],
  gallery: [],
  site: { heroTitle: '', heroSummary: '', about: '', contact: [], tryhackme: { profileUrl: '', badgeEmbed: '' } },
  page: 1,
  pageSize: 8,
  filteredChallenges: [],
};

function $(id) { return document.getElementById(id); }

function safe(v) {
  return String(v ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
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

function normalizeChallenge(c) {
  return {
    id: Number(c.id ?? uid()),
    title: c.title || '',
    platform: c.platform || 'Others',
    description: c.description || '',
    thumbnail: c.thumbnail || c.image || '',
    medium_link: c.medium_link || c.mediumLink || '',
    date_completed: c.date_completed || c.dateCompleted || '',
    categories: asArray(c.categories || c.tags),
    difficulty: c.difficulty || '',
    status: c.status || 'Completed',
    source_site: c.source_site || c.sourceSite || '',
    ctf_name: c.ctf_name || c.ctfName || '',
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
  $('panelTitle').textContent = panel[0].toUpperCase() + panel.slice(1);
}

function showAuth() { $('authGate').style.display = 'grid'; $('adminApp').hidden = true; }
function showAdmin() { $('authGate').style.display = 'none'; $('adminApp').hidden = false; }

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
    $('authMessage').textContent = '';
    showAdmin();
    renderAllTables();
  });

  $('logoutBtn').addEventListener('click', showAuth);
  document.querySelectorAll('.admin-nav-btn').forEach((b) => b.addEventListener('click', () => setPanel(b.dataset.panel)));

  $('challengeFilterBtn').addEventListener('click', () => { state.page = 1; renderChallengesTable(); });
  $('challengePrev').addEventListener('click', () => { if (state.page > 1) { state.page -= 1; renderChallengesTable(); } });
  $('challengeNext').addEventListener('click', () => { state.page += 1; renderChallengesTable(); });

  $('challengeThumbnail').addEventListener('change', () => {
    const f = $('challengeThumbnail').files[0];
    $('challengeThumbnailPath').value = f ? `${IMG_BASE}${f.name}` : $('challengeThumbnailPath').value;
    renderChallengePreview();
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

    const id = Number($('challengeId').value || 0) || uid();
    const item = normalizeChallenge({
      id,
      title,
      platform: $('challengePlatform').value,
      description: $('challengeDescriptionEditor').innerText.trim(),
      thumbnail: $('challengeThumbnailPath').value.trim(),
      medium_link: $('challengeMedium').value.trim(),
      date_completed: $('challengeDate').value,
      categories,
      difficulty: $('challengeDifficulty').value.trim(),
      status: $('challengeStatus').value,
      published: $('challengePublished').value === '1',
    });

    const idx = state.challenges.findIndex((x) => x.id === id);
    if (idx >= 0) state.challenges[idx] = item; else state.challenges.push(item);
    persistDraft();
    populateChallengeSelects();
    resetChallengeForm();
    renderAllTables();
    toast('Challenge saved');
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
