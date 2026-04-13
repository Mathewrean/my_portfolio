const VIEW_IDS = ['home', 'about', 'resume', 'certificates', 'projects', 'challenges', 'contact', 'gallery', 'research'];
const themeKey = 'portfolio_theme';
const repoMeta = document.querySelector('meta[name="repo-base-path"]');
const repoBase = repoMeta?.content?.trim() || '';
const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
const isGithubPages = window.location.hostname.endsWith('.github.io');
const normalizedBase = isLocalhost || isGithubPages ? '' : (repoBase ? repoBase.replace(/\/+$/g, '') : '');
const DATA_ROOT = `${normalizedBase ? `${normalizedBase}/` : ''}data`;
const CONTENT_ROOT = `${normalizedBase ? `${normalizedBase}/` : ''}content`;
const PLATFORM_TABS = [
  { slug: 'tryhackme', label: 'TryHackMe' },
  { slug: 'hackthebox', label: 'HackTheBox' },
  { slug: 'ctfzone', label: 'CTFZone' },
  { slug: 'ctfroom', label: 'CTFROOM' },
  { slug: 'picoctf', label: 'PicoCTF' },
  { slug: 'others', label: 'Others' },
];
const CATEGORY_OPTIONS = [
  'Web Exploitation',
  'Cryptography',
  'Reverse Engineering',
  'Binary Exploitation (Pwn)',
  'Forensics',
  'OSINT',
  'Steganography',
  'Networking',
  'Miscellaneous',
  'Hardware',
  'Cloud Security',
  'Mobile Security',
  'Active Directory',
  'Malware Analysis',
  'Threat Hunting',
];
const state = {
  activeView: 'home',
  challenges: [],
  activePlatformTab: null,
  challengeFilter: { platform: 'all', category: 'all' },
  data: null,
};

const selectors = {
  heroTitle: document.getElementById('heroTitle'),
  heroSummary: document.getElementById('heroSummary'),
  aboutText: document.getElementById('aboutText'),
  resumeContent: document.getElementById('resumeContent'),
  certificatesGrid: document.getElementById('certificatesGrid'),
  projectsGrid: document.getElementById('projectsGrid'),
  challengeList: document.getElementById('challengeList'),
  challengeTabs: document.getElementById('challengeTabs'),
  challengePlatform: document.getElementById('challengePlatformFilter'),
  challengeCategory: document.getElementById('challengeCategoryFilter'),
  galleryGrid: document.getElementById('galleryGrid'),
  researchList: document.getElementById('researchList'),
  contactLinks: document.getElementById('contactLinks'),
  toast: document.getElementById('toast'),
  modal: document.getElementById('contentModal'),
  modalContent: document.getElementById('modalContent'),
  closeModal: document.getElementById('closeContentModal'),
  certificateDialog: document.getElementById('certificateDialog'),
  dialogImage: document.getElementById('dialogImage'),
  dialogMeta: document.getElementById('dialogMeta'),
};

const CONTACT_ICON_SVGS = {
  email: `
    <svg viewBox="0 0 26 26" aria-hidden="true" focusable="false" role="img" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="6" width="20" height="14" rx="2" ry="2" fill="none" stroke="currentColor" stroke-width="1.4"/>
      <path d="M3 8l10 8 10-8" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `,
  linkedin: `
    <svg viewBox="0 0 26 26" aria-hidden="true" focusable="false" role="img" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 9h3v10H6z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>
      <circle cx="7.5" cy="6.5" r="1.4" fill="none" stroke="currentColor" stroke-width="1.4"/>
      <path d="M12.5 13h3v6h-3z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>
      <path d="M16.5 11.5a1.6 1.6 0 0 1 1.6-1.6h1.4v9.2h-1.6" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `,
  github: `
    <svg viewBox="0 0 26 26" aria-hidden="true" focusable="false" role="img" xmlns="http://www.w3.org/2000/svg">
      <path d="M7 9l-3 3 3 3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M19 9l3 3-3 3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M10 11h6M10 15h6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
    </svg>
  `,
  tryhackme: `
    <svg viewBox="0 0 26 26" aria-hidden="true" focusable="false" role="img" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 3l8 4v8.5c0 4-3 7-8 8-5-1-8-4-8-8V7z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>
      <path d="M7 12l5 4 5-4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `,
  default: `
    <svg viewBox="0 0 26 26" aria-hidden="true" focusable="false" role="img" xmlns="http://www.w3.org/2000/svg">
      <circle cx="13" cy="13" r="8" fill="none" stroke="currentColor" stroke-width="1.4"/>
      <path d="M8 13h10M13 8v10" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
    </svg>
  `,
};

function getContactIcon(name) {
  if (!name) return CONTACT_ICON_SVGS.default;
  const key = name.toLowerCase().trim();
  return CONTACT_ICON_SVGS[key] || CONTACT_ICON_SVGS.default;
}

function buildUrl(root, file) {
  const cleanRoot = root.replace(/\/+$/g, '');
  const cleanFile = file.replace(/^\/+/, '');
  if (!cleanRoot) return cleanFile;
  return `${cleanRoot}/${cleanFile}`;
}

async function fetchJson(file) {
  const url = buildUrl(DATA_ROOT, file);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to load ${file}`);
  return response.json();
}

function showToast(message) {
  if (!selectors.toast) return;
  selectors.toast.textContent = message;
  selectors.toast.classList.add('visible');
  setTimeout(() => selectors.toast?.classList.remove('visible'), 3200);
}

function applyTheme(theme) {
  document.body.setAttribute('data-theme', theme);
  localStorage.setItem(themeKey, theme);
}

function initThemeToggle() {
  const saved = localStorage.getItem(themeKey);
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(saved || (prefersDark ? 'dark' : 'light'));
  document.getElementById('themeToggle').addEventListener('click', () => {
    const current = document.body.getAttribute('data-theme');
    applyTheme(current === 'dark' ? 'light' : 'dark');
  });
}

function setActiveView(view) {
  const target = VIEW_IDS.includes(view) ? view : VIEW_IDS[0];
  state.activeView = target;
  document.querySelectorAll('.view-section').forEach((section) => {
    section.classList.toggle('active', section.dataset.view === target);
  });
  document.querySelectorAll('.nav-link[data-view]').forEach((button) => {
    button.classList.toggle('active', button.dataset.view === target);
  });
  if (target === 'challenges') {
    highlightPlatformTabs(state.activePlatformTab);
  }
}

function setupNavigation() {
  document.querySelectorAll('.nav-link[data-view]').forEach((button) => {
    button.addEventListener('click', () => setActiveView(button.dataset.view));
  });
  document.querySelectorAll('.nav-sublink[data-challenge-tab]').forEach((button) => {
    button.addEventListener('click', () => {
      setActiveView('challenges');
      setPlatformFilter(button.dataset.challengeTab);
    });
  });
  const mobileToggle = document.getElementById('mobileNavToggle');
  const sidebar = document.getElementById('sidebarNav');
  mobileToggle?.addEventListener('click', () => sidebar?.classList.toggle('open'));
}

function renderHero(profile) {
  selectors.heroTitle.textContent = profile.name || 'Mathewrean';
  selectors.heroSummary.textContent = profile.tagline || 'Cybersecurity Portfolio';
  document.querySelector('.eyebrow').textContent = profile.eyebrow || 'Cybersecurity • Digital Forensics • Research';
}

function renderAbout(profile) {
  selectors.aboutText.textContent = profile.about || profile.summary || '';
}

function renderResume(data) {
  if (!selectors.resumeContent) return;
  selectors.resumeContent.innerHTML = '';
  data.highlights?.forEach((section) => {
    const sectionEl = document.createElement('article');
    sectionEl.className = 'section-highlight';
    const header = document.createElement('h3');
    header.textContent = section.section;
    sectionEl.appendChild(header);
    section.items.forEach((item) => {
      const card = document.createElement('div');
      card.className = 'resume-card';
      card.innerHTML = `<h4>${item.title}</h4><p class="meta">${item.subtitle} • ${item.period}</p><p>${item.description}</p>`;
      sectionEl.appendChild(card);
    });
    selectors.resumeContent.appendChild(sectionEl);
  });
}

function renderCertificates(list) {
  selectors.certificatesGrid.innerHTML = list.map((cert) => `
    <article class="card" data-title="${cert.title}">
      <img src="${cert.image_path}" alt="${cert.title}" loading="lazy" />
      <h3>${cert.title}</h3>
      <p class="meta">${cert.issuer} • ${cert.date}</p>
      <p><a class="btn" href="${cert.credential_url || '#'}" target="_blank" rel="noopener">View credential</a></p>
    </article>
  `).join('');
  selectors.certificatesGrid.querySelectorAll('article').forEach((card) => {
    card.addEventListener('click', (event) => {
      event.stopPropagation();
      selectors.dialogImage?.setAttribute('src', card.querySelector('img')?.src || '');
      selectors.dialogMeta.textContent = card.querySelector('p.meta')?.textContent || '';
      selectors.certificateDialog?.showModal();
    });
  });
}

function renderProjects(list) {
  selectors.projectsGrid.innerHTML = list.map((project) => `
    <article class="card">
      <img src="${project.image_path}" alt="${project.title}" loading="lazy" />
      <h3>${project.title}</h3>
      <p>${project.description}</p>
      <p class="meta">${project.tags.join(', ')}</p>
      <p>
        ${project.repo_url ? `<a class="btn" href="${project.repo_url}" target="_blank" rel="noopener">Repository</a>` : ''}
        ${project.live_url ? `<a class="btn" href="${project.live_url}" target="_blank" rel="noopener">Live</a>` : ''}
      </p>
    </article>
  `).join('');
}

function createContactLinks(list) {
  selectors.contactLinks.innerHTML = list.map((item) => {
    const label = item.label || '';
    const url = item.url || '#';
    const isMail = url.toLowerCase().startsWith('mailto:');
    const targetRel = isMail ? '' : ' target="_blank" rel="noopener"';
    const icon = getContactIcon(item.icon);
    return `
      <a class="contact-link" href="${url}"${targetRel} aria-label="${label}">
        <span class="contact-icon">${icon}</span>
        <span class="contact-label">${label}</span>
      </a>
    `;
  }).join('');
}

function renderGallery(items) {
  selectors.galleryGrid.innerHTML = items.map((item) => `
    <article class="card">
      <img src="${item.image_path}" alt="${item.title}" loading="lazy" />
      <h3>${item.title}</h3>
      <p>${item.caption}</p>
      <p class="meta">${item.date}</p>
    </article>
  `).join('');
}

function renderResearch(entries) {
  selectors.researchList.innerHTML = entries.map((entry) => `
    <article class="card research-card" data-md="${entry.md_path}">
      <h3>${entry.title}</h3>
      <p>${entry.description}</p>
      <p class="meta">${entry.tags.join(', ')} • ${entry.date}</p>
      <button class="btn" data-md="${entry.md_path}">Read more</button>
    </article>
  `).join('');
  selectors.researchList.querySelectorAll('[data-md]').forEach((button) => {
    button.addEventListener('click', () => openMarkdown(button.dataset.md, 'Research details'));
  });
}

function normalizeChallenges(challengeData) {
  const entries = [];
  Object.entries(challengeData).forEach(([platform, list]) => {
    list.forEach((item) => {
      entries.push({ ...item, platform });
    });
  });
  return entries;
}

function renderChallengeTabs() {
  if (!selectors.challengeTabs) return;
  selectors.challengeTabs.innerHTML = PLATFORM_TABS.map((tab) => `
    <button type="button" class="tab" data-platform="${tab.slug}">${tab.label}</button>
  `).join('');
  selectors.challengeTabs.querySelectorAll('button').forEach((button) => {
    button.addEventListener('click', () => setPlatformFilter(button.dataset.platform));
  });
  highlightPlatformTabs(state.activePlatformTab);
}

function highlightPlatformTabs(target) {
  selectors.challengeTabs?.querySelectorAll('button').forEach((button) => {
    button.classList.toggle('active', target ? button.dataset.platform === target : false);
  });
  document.querySelectorAll('.nav-sublink[data-challenge-tab]').forEach((link) => {
    link.classList.toggle('active', target ? link.dataset.challengeTab === target : false);
  });
}

function setPlatformFilter(slug, options = {}) {
  const { resetCategory = true, syncDropdown = true } = options;
  const valid = PLATFORM_TABS.some((tab) => tab.slug === slug);
  const normalized = valid ? slug : 'all';
  state.challengeFilter.platform = normalized;
  state.activePlatformTab = normalized === 'all' ? null : normalized;
  if (selectors.challengePlatform && syncDropdown) {
    selectors.challengePlatform.value = normalized;
  }
  if (resetCategory) {
    state.challengeFilter.category = 'all';
    if (selectors.challengeCategory) selectors.challengeCategory.value = 'all';
  }
  highlightPlatformTabs(state.activePlatformTab);
  renderChallengesView();
}

function setCategoryFilter(category, options = {}) {
  const { syncDropdown = true } = options;
  state.challengeFilter.category = category === 'all' ? 'all' : category;
  if (selectors.challengeCategory && syncDropdown) {
    selectors.challengeCategory.value = state.challengeFilter.category;
  }
  renderChallengesView();
}

function hydrateFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const view = params.get('view');
  const tab = params.get('tab');
  if (view === 'challenges') {
    setActiveView('challenges');
    if (tab) setPlatformFilter(tab, { resetCategory: true });
  }
}

function renderChallengeFilters() {
  if (!selectors.challengePlatform) return;
  selectors.challengePlatform.innerHTML = `<option value="all">All platforms</option>${PLATFORM_TABS.map((tab) => `<option value="${tab.slug}">${tab.label}</option>`).join('')}`;
  selectors.challengePlatform.value = state.challengeFilter.platform;
}

function normalizeCategories(entry) {
  if (!entry) return [];
  const cats = entry.categories;
  if (Array.isArray(cats)) return cats;
  if (typeof cats === 'string' && cats.trim()) return [cats.trim()];
  return [];
}

function updateCategoryOptions(entries) {
  if (!selectors.challengeCategory) return;
  const categories = new Set();
  entries.forEach((entry) => {
    normalizeCategories(entry).forEach((cat) => categories.add(cat));
  });
  const opts = Array.from(categories).sort((a, b) => a.localeCompare(b));
  selectors.challengeCategory.innerHTML = `<option value="all">All categories</option>${opts.map((cat) => `<option value="${cat}">${cat}</option>`).join('')}`;
  if (state.challengeFilter.category !== 'all' && !categories.has(state.challengeFilter.category)) {
    state.challengeFilter.category = 'all';
  }
  selectors.challengeCategory.value = state.challengeFilter.category;
}

function renderChallengeList(entries) {
  if (!selectors.challengeList) return;
  if (!entries.length) {
    selectors.challengeList.innerHTML = '<p class="muted">No challenges match the current filters.</p>';
    return;
  }
  selectors.challengeList.innerHTML = entries.map((entry) => {
    const tags = normalizeCategories(entry).map((cat) => `<span class="tag">${cat}</span>`).join('');
    const badge = entry.badge_image ? `<img class="challenge-badge" data-badge-preview="${entry.badge_image}" data-title="${entry.title}" src="${entry.badge_image}" alt="${entry.title} badge" loading="lazy" />` : '';
    const writeup = entry.writeup_url
      ? `<a class="btn btn-primary" href="${entry.writeup_url}" target="_blank" rel="noopener">Read on Medium</a>`
      : '<span class="muted">Write-up coming soon</span>';
    const tools = (entry.tools || []).map((tool) => `<span class="challenge-tool">${tool}</span>`).join('');
    return `
      <article class="card challenge-card" data-platform="${entry.platform}" data-categories="${normalizeCategories(entry).join(',')}">
        <div class="challenge-card-header">
          ${badge}
          <div>
            <h3>${entry.title}</h3>
            <p class="meta">${entry.platform} • ${entry.difficulty}</p>
          </div>
        </div>
        <div class="tags">${tags}</div>
        <p>${entry.description}</p>
        ${tools ? `<div class="challenge-tools">${tools}</div>` : ''}
        <div class="challenge-card-actions">
          ${writeup}
          <span class="muted">${entry.date}</span>
        </div>
      </article>
    `;
  }).join('');
  selectors.challengeList.querySelectorAll('[data-md]').forEach((button) => {
    button.addEventListener('click', () => openMarkdown(button.dataset.md, 'Challenge write-up'));
  });
  selectors.challengeList.querySelectorAll('[data-badge-preview]').forEach((img) => {
    img.addEventListener('click', () => openBadgePreview(img.dataset.badgePreview, img.dataset.title || 'Badge preview'));
  });
}

function getPlatformFilteredEntries() {
  if (state.challengeFilter.platform === 'all') return state.challenges;
  return state.challenges.filter((entry) => entry.platform === state.challengeFilter.platform);
}

function filterEntriesByCategory(entries) {
  if (state.challengeFilter.category === 'all') return entries;
  return entries.filter((entry) => normalizeCategories(entry).includes(state.challengeFilter.category));
}

function renderChallengesView() {
  const platformEntries = getPlatformFilteredEntries();
  updateCategoryOptions(platformEntries);
  const filtered = filterEntriesByCategory(platformEntries);
  const sorted = [...filtered].sort((a, b) => a.title.localeCompare(b.title));
  renderChallengeList(sorted);
  filterChallenges();
}

function filterChallenges() {
  if (!selectors.challengeList) return;
  const cards = selectors.challengeList.querySelectorAll('.challenge-card');
  const platformFilter = state.challengeFilter.platform;
  const categoryFilter = state.challengeFilter.category;
  cards.forEach((card) => {
    const platform = card.dataset.platform;
    const categories = (card.dataset.categories || '').split(',').map((item) => item.trim()).filter(Boolean);
    const matchesPlatform = platformFilter === 'all' || platform === platformFilter;
    const matchesCategory = categoryFilter === 'all' || categories.includes(categoryFilter);
    card.style.display = matchesPlatform && matchesCategory ? '' : 'none';
  });
}

async function openMarkdown(path, title) {
  try {
    const url = path.startsWith('http') ? path : buildUrl(CONTENT_ROOT, path);
    const response = await fetch(url);
    if (!response.ok) throw new Error('Markdown not found');
    const text = await response.text();
    selectors.modalContent.innerHTML = `<h3>${title}</h3>${marked.parse(text)}`;
    selectors.modal?.showModal();
  } catch (err) {
    showToast(err.message || 'Unable to load content.');
  }
}

function openBadgePreview(url, title) {
  selectors.modalContent.innerHTML = `
    <h3>${title}</h3>
    <img src="${url}" alt="${title}" class="challenge-badge-preview" />
    <p class="muted">Click outside to close.</p>
  `;
  selectors.modal?.showModal();
}

function setupModal() {
  selectors.closeModal?.addEventListener('click', () => selectors.modal?.close());
  selectors.modal?.addEventListener('click', (event) => {
    if (event.target === selectors.modal) selectors.modal.close();
  });
  document.getElementById('closeDialog')?.addEventListener('click', () => selectors.certificateDialog?.close());
  selectors.certificateDialog?.addEventListener('click', (event) => {
    if (event.target === selectors.certificateDialog) selectors.certificateDialog.close();
  });
}

async function loadData() {
  const dataKeys = [
    { key: 'profile', file: 'profile.json' },
    { key: 'certificates', file: 'certificates.json' },
    { key: 'projects', file: 'projects.json' },
    { key: 'challenges', file: 'challenges.json' },
    { key: 'research', file: 'research.json' },
    { key: 'resume', file: 'resume.json' },
    { key: 'gallery', file: 'gallery.json' }
  ];
  const failed = [];
  state.data = {};
  for (const { key, file } of dataKeys) {
    try {
      console.log(`Fetching: ${buildUrl(DATA_ROOT, file)}`);
      state.data[key] = await fetchJson(file);
    } catch (err) {
      console.error(`Failed ${file}:`, err);
      failed.push(file);
      state.data[key] = key === 'profile' ? { name: 'Portfolio', tagline: 'Loading content...' } : [];
    }
  }
  if (failed.length) {
    showToast(`Loaded partial data. Failed: ${failed.join(', ')}`);
  }
  applyData();
}

function applyData() {
  const { profile = {}, certificates = [], projects = [], challenges = {}, research = [], resume = {}, gallery = [] } = state.data || {};
  renderHero(profile);
  renderAbout(profile);
  renderResume(resume);
  renderCertificates(certificates);
  renderProjects(projects);
  createContactLinks(profile.contact || []);
  renderGallery(gallery);
  renderResearch(research);
  const challengeEntries = normalizeChallenges(challenges);
  state.challenges = challengeEntries;
  renderChallengeTabs();
  renderChallengeFilters();
  renderChallengesView();
}

function setupChallengeControls() {
  selectors.challengePlatform?.addEventListener('change', (event) => {
    const value = event.target.value;
    setPlatformFilter(value, { resetCategory: true, syncDropdown: false });
  });
  selectors.challengeCategory?.addEventListener('change', (event) => {
    setCategoryFilter(event.target.value, { syncDropdown: false });
  });
  document.getElementById('clearChallengeFilters')?.addEventListener('click', () => {
    setPlatformFilter('all');
  });
}

(async function init() {
  initThemeToggle();
  setupNavigation();
  setupModal();
  setupChallengeControls();
  try {
    await loadData();
    hydrateFromUrl();
  } catch (err) {
    console.error(err);
  }
})();
