const state = {
  activeView: 'home',
  activeChallengeTab: 'tryhackme',
  challenges: null,
};

function $(id) {
  return document.getElementById(id);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function isSafeExternalUrl(raw) {
  if (!raw || typeof raw !== 'string') return false;
  try {
    const url = new URL(raw, window.location.origin);
    const protocolOk = ['http:', 'https:', 'mailto:'].includes(url.protocol);
    if (!protocolOk) return false;
    const lower = raw.toLowerCase();
    const placeholderTokens = ['your-username', 'your-profile', 'example.com'];
    return !placeholderTokens.some((token) => lower.includes(token));
  } catch {
    return false;
  }
}

function linkButton(label, href) {
  if (!isSafeExternalUrl(href)) {
    return `<span class="btn" aria-disabled="true">${escapeHtml(label)} (pending)</span>`;
  }
  return `<a class="btn" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`;
}

async function loadJSON(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Failed to load ${path}`);
  return response.json();
}

function safeImage(url, fallback = 'https://placehold.co/900x600/1b2b4b/e8eefb?text=Add+Image') {
  return url && String(url).trim() ? String(url) : fallback;
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

function renderSiteMeta(site) {
  $('heroTitle').textContent = site.heroTitle || '';
  $('heroSummary').textContent = site.heroSummary || '';
  $('aboutText').textContent = site.about || '';

  $('contactLinks').innerHTML = (site.contact || [])
    .map((item) => linkButton(item.label || 'Link', item.href || ''))
    .join('');
}

function renderCertificates(certificates) {
  const grid = $('certificatesGrid');
  grid.innerHTML = (certificates || [])
    .map(
      (cert, index) => `
        <article class="card">
          <img src="${escapeHtml(safeImage(cert.image))}" alt="${escapeHtml(cert.name || 'Certificate')}" loading="lazy" />
          <h3>${escapeHtml(cert.name || 'Certificate')}</h3>
          <p class="meta">${escapeHtml(cert.issuer || 'Issuer')} • ${escapeHtml(cert.date || 'Date')}</p>
          <button class="btn" data-cert-index="${index}">View Full Certificate</button>
        </article>
      `,
    )
    .join('');

  grid.querySelectorAll('[data-cert-index]').forEach((button) => {
    button.addEventListener('click', () => {
      const cert = certificates[Number(button.dataset.certIndex)] || {};
      $('dialogImage').src = safeImage(cert.image);
      $('dialogMeta').textContent = `${cert.name || 'Certificate'} | ${cert.issuer || 'Issuer'} | ${cert.date || 'Date'}`;
      $('certificateDialog').showModal();
    });
  });
}

function renderProjects(projects) {
  $('projectsGrid').innerHTML = (projects || [])
    .map(
      (project) => `
        <article class="card">
          <img src="${escapeHtml(safeImage(project.image))}" alt="${escapeHtml(project.title || 'Project')}" loading="lazy" />
          <h3>${escapeHtml(project.title || 'Project')}</h3>
          <p>${escapeHtml(project.description || '')}</p>
          <p class="meta">Tech: ${escapeHtml((project.technologies || []).join(', '))}</p>
          <p>
            ${linkButton('GitHub', project.github || '')}
            ${linkButton('Live Demo', project.demo || '')}
          </p>
        </article>
      `,
    )
    .join('');
}

function renderResearch(research) {
  $('researchList').innerHTML = (research || [])
    .map(
      (item) => `
        <article class="research-item">
          <h3>${escapeHtml(item.title || 'Research')}</h3>
          <p>${escapeHtml(item.description || '')}</p>
          <p class="meta">Published: ${escapeHtml(item.date || 'Date')}</p>
          ${linkButton('View / Download', item.link || '')}
        </article>
      `,
    )
    .join('');
}

function renderGallery(gallery) {
  $('galleryGrid').innerHTML = (gallery || [])
    .map(
      (image) => `
        <article class="card">
          <img src="${escapeHtml(safeImage(image.url))}" alt="${escapeHtml(image.caption || 'Gallery image')}" loading="lazy" />
          <p class="meta">${escapeHtml(image.caption || '')}</p>
        </article>
      `,
    )
    .join('');
}

function challengeCard(entry, category) {
  const tags = (entry.tags || []).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join('');
  const sourceRow =
    category === 'others' && (entry.sourceSite || entry.ctfName)
      ? `<p class="meta">${escapeHtml(entry.sourceSite || 'Source')}${entry.ctfName ? ` • ${escapeHtml(entry.ctfName)}` : ''}</p>`
      : '';

  return `
    <article class="card">
      <img src="${escapeHtml(safeImage(entry.image))}" alt="${escapeHtml(entry.title || 'Challenge')}" loading="lazy" />
      <h3>${escapeHtml(entry.title || 'Challenge')}</h3>
      <p>${escapeHtml(entry.description || '')}</p>
      <p class="meta">Completed: ${escapeHtml(entry.dateCompleted || 'Date')} • Difficulty: ${escapeHtml(entry.difficulty || 'N/A')}</p>
      ${sourceRow}
      <div class="tags">${tags}</div>
      ${entry.mediumLink && isSafeExternalUrl(entry.mediumLink) ? `<a class="btn" href="${escapeHtml(entry.mediumLink)}" target="_blank" rel="noopener noreferrer">Read Writeup</a>` : '<span class="btn" aria-disabled="true">Writeup (pending)</span>'}
    </article>
  `;
}

function renderChallenges() {
  const category = state.challenges.categories[state.activeChallengeTab];

  $('challengeTabs').innerHTML = Object.keys(state.challenges.categories)
    .map((key) => {
      const active = key === state.activeChallengeTab ? 'active' : '';
      return `<button class="tab-btn ${active}" data-tab="${escapeHtml(key)}">${escapeHtml(state.challenges.categories[key].label)}</button>`;
    })
    .join('');

  $('challengeTabs').querySelectorAll('[data-tab]').forEach((button) => {
    button.addEventListener('click', () => {
      state.activeChallengeTab = button.dataset.tab;
      renderChallenges();
      syncChallengeSubmenuActive();
    });
  });

  const badgeHtml =
    state.activeChallengeTab === 'tryhackme'
      ? `
      <div class="badge-block">
        <p><strong>TryHackMe Profile Badge</strong></p>
        <iframe
          class="thm-badge-iframe"
          src="https://tryhackme.com/api/v2/badges/public-profile?userPublicId=2981082"
          title="TryHackMe public profile badge"
          loading="lazy"
          referrerpolicy="strict-origin-when-cross-origin"
        ></iframe>
      </div>`
      : '';

  $('challengeIntro').innerHTML = `${badgeHtml}<p class="muted">${escapeHtml(category.description || '')}</p>`;
  $('challengeList').innerHTML = category.entries.length
    ? category.entries.map((entry) => challengeCard(entry, state.activeChallengeTab)).join('')
    : '<article class="card"><p class="meta">No challenges added yet in this category.</p></article>';
}

function setActiveView(view) {
  state.activeView = view;

  document.querySelectorAll('.view-section').forEach((section) => {
    section.classList.toggle('active', section.dataset.view === view);
  });

  document.querySelectorAll('.nav-link').forEach((button) => {
    button.classList.toggle('active', button.dataset.view === view);
  });

  if (view !== 'challenges') {
    document.querySelectorAll('.nav-sublink').forEach((button) => button.classList.remove('active'));
  } else {
    syncChallengeSubmenuActive();
  }
}

function syncChallengeSubmenuActive() {
  document.querySelectorAll('.nav-sublink').forEach((button) => {
    button.classList.toggle('active', button.dataset.challengeTab === state.activeChallengeTab);
  });
}

function setupNav() {
  document.querySelectorAll('.nav-link').forEach((button) => {
    button.addEventListener('click', () => {
      const view = button.dataset.view;
      setActiveView(view);
      if (view === 'challenges') renderChallenges();
      window.location.hash = view;
    });
  });

  document.querySelectorAll('.nav-sublink').forEach((button) => {
    button.addEventListener('click', () => {
      state.activeChallengeTab = button.dataset.challengeTab;
      setActiveView('challenges');
      renderChallenges();
      window.location.hash = state.activeChallengeTab;
    });
  });

  $('challengeGroupToggle').addEventListener('click', () => {
    setActiveView('challenges');
    renderChallenges();
    window.location.hash = 'challenges';
  });

  $('mobileNavToggle').addEventListener('click', () => {
    $('sidebarNav').classList.toggle('open');
  });
}

function applyInitialRoute() {
  const hash = (location.hash || '#home').replace('#', '');
  const supportedViews = new Set(['home', 'about', 'resume', 'certificates', 'projects', 'challenges', 'contact', 'gallery', 'research']);

  if (supportedViews.has(hash)) {
    setActiveView(hash);
    if (hash === 'challenges') renderChallenges();
  } else if (state.challenges.categories[hash]) {
    state.activeChallengeTab = hash;
    setActiveView('challenges');
    renderChallenges();
  } else {
    setActiveView('home');
  }
}

window.addEventListener('hashchange', applyInitialRoute);

async function boot() {
  const [site, certificates, projects, challenges, research, gallery] = await Promise.all([
    loadJSON('data/site.json'),
    loadJSON('data/certificates.json'),
    loadJSON('data/projects.json'),
    loadJSON('data/challenges.json'),
    loadJSON('data/research.json'),
    loadJSON('data/gallery.json'),
  ]);

  state.challenges = challenges;

  renderSiteMeta(site);
  renderCertificates(certificates);
  renderProjects(projects);
  renderResearch(research);
  renderGallery(gallery);
  renderChallenges();

  setupThemeToggle();
  setupNav();
  applyInitialRoute();

  const profilePhoto = $('profilePhoto');
  profilePhoto.addEventListener('error', () => {
    profilePhoto.style.display = 'none';
  });

  $('closeDialog').addEventListener('click', () => $('certificateDialog').close());
}

boot().catch((error) => {
  console.error(error);
});
