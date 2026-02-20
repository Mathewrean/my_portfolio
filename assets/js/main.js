const state = {
  activeView: 'home',
  content: null,
  challenges: [],
  challengeCategory: 'All',
  challengePlatform: '',
  collapsedPlatforms: new Set(),
};
const STATIC_DRAFT_KEY = 'portfolio_static_admin_v2';

const CATEGORY_OPTIONS = ['Web', 'Pwn', 'Crypto', 'Reverse Engineering', 'Forensics', 'OSINT', 'Misc'];
const PLATFORM_ORDER = ['TryHackMe', 'HackTheBox', 'PicoCTF', 'CTFROOM', 'CTFZone', 'Others'];

function $(id) { return document.getElementById(id); }

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function safeImage(url, fallback = 'https://placehold.co/900x600/1b2b4b/e8eefb?text=Add+Image') {
  return url && String(url).trim() ? String(url) : fallback;
}

function canonicalPlatform(value) {
  const v = String(value || '').trim().toLowerCase();
  const map = {
    tryhackme: 'TryHackMe',
    'try hack me': 'TryHackMe',
    hackthebox: 'HackTheBox',
    htb: 'HackTheBox',
    picoctf: 'PicoCTF',
    ctfroom: 'CTFROOM',
    ctfzone: 'CTFZone',
    others: 'Others',
    other: 'Others',
  };
  return map[v] || (value ? String(value).trim() : 'Others');
}

function isSafeExternalUrl(raw) {
  if (!raw || typeof raw !== 'string') return false;
  try {
    const url = new URL(raw, window.location.origin);
    return ['http:', 'https:', 'mailto:'].includes(url.protocol);
  } catch {
    return false;
  }
}

function linkButton(label, href) {
  if (!isSafeExternalUrl(href)) return '';
  return `<a class="btn" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`;
}

function setTheme(theme) {
  document.body.setAttribute('data-theme', theme);
  localStorage.setItem('portfolioTheme', theme);
}

function setupThemeToggle() {
  const saved = localStorage.getItem('portfolioTheme') || 'dark';
  setTheme(saved);
  $('themeToggle').addEventListener('click', () => setTheme(document.body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'));
}

async function loadContent() {
  const draftRaw = localStorage.getItem(STATIC_DRAFT_KEY);
  if (draftRaw) {
    try {
      const draft = JSON.parse(draftRaw);
      if (draft && Array.isArray(draft.challenges)) {
        let resume = draft.resume || {};
        if (!resume || !Object.keys(resume).length) {
          try {
            const resumeResponse = await fetch('data/resume.json');
            if (resumeResponse.ok) resume = await resumeResponse.json();
          } catch {
            resume = {};
          }
        }
        return {
          site: draft.site || {},
          resume,
          challenges: { tryhackme: draft.site?.tryhackme || {}, challenges: draft.challenges || [] },
          certificates: draft.certificates || [],
          projects: draft.projects || [],
          gallery: draft.gallery || [],
          research: draft.research || [],
        };
      }
    } catch (error) {
      console.warn('Ignoring invalid static admin draft payload', error);
    }
  }

  try {
    const response = await fetch('/api/public/content');
    if (!response.ok) throw new Error('API unavailable');
    const data = await response.json();
    if (!data.challenges?.challenges) {
      const old = data.challenges || {};
      const flat = [];
      Object.entries(old.categories || {}).forEach(([key, cat]) => {
        (cat.entries || []).forEach((entry, i) => {
          flat.push({
            id: entry.id || `${key}-${i + 1}`,
            title: entry.title || '',
            platform: canonicalPlatform(entry.platform || cat.label || key),
            description: entry.description || '',
            thumbnail: entry.thumbnail || entry.image || '',
            medium_link: entry.medium_link || entry.mediumLink || '',
            date_completed: entry.date_completed || entry.dateCompleted || '',
            categories: Array.isArray(entry.categories) ? entry.categories : (entry.tags || []),
            difficulty: entry.difficulty || '',
            status: entry.status || 'Completed',
            source_site: entry.source_site || entry.sourceSite || '',
            ctf_name: entry.ctf_name || entry.ctfName || '',
            published: entry.published !== false,
          });
        });
      });
      data.challenges = { tryhackme: old.tryhackme || {}, challenges: flat };
    }
    return data;
  } catch {
    const loadJSON = async (path) => {
      const res = await fetch(path);
      if (!res.ok) throw new Error(`Failed to load ${path}`);
      return res.json();
    };
    const [site, resume, challenges, certificates, projects, gallery, research] = await Promise.all([
      loadJSON('data/site.json'),
      loadJSON('data/resume.json'),
      loadJSON('data/challenges.json'),
      loadJSON('data/certificates.json'),
      loadJSON('data/projects.json'),
      loadJSON('data/gallery.json'),
      loadJSON('data/research.json'),
    ]);
    return { site, resume, challenges, certificates, projects, gallery, research };
  }
}

function normalizeChallenges(challengesData) {
  const flat = (challengesData?.challenges || []).map((c, idx) => ({
    id: c.id || idx + 1,
    title: c.title || '',
    platform: canonicalPlatform(c.platform),
    description: c.description || '',
    thumbnail: c.thumbnail || c.image || '',
    medium_link: c.medium_link || c.mediumLink || '',
    date_completed: c.date_completed || c.dateCompleted || '',
    categories: (Array.isArray(c.categories) ? c.categories : (c.tags || [])).map((x) => String(x).trim()).filter(Boolean),
    difficulty: c.difficulty || '',
    status: c.status || 'Completed',
    source_site: c.source_site || c.sourceSite || '',
    ctf_name: c.ctf_name || c.ctfName || '',
    published: c.published !== false,
  }));
  return flat;
}

function sortPlatforms(values) {
  return [...values].sort((a, b) => {
    const ia = PLATFORM_ORDER.indexOf(a);
    const ib = PLATFORM_ORDER.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
}

function renderSiteMeta(site) {
  $('heroTitle').textContent = site.heroTitle || '';
  $('heroSummary').textContent = site.heroSummary || '';
  $('aboutText').textContent = site.about || '';
  $('contactLinks').innerHTML = (site.contact || []).map((item) => linkButton(item.label, item.href)).join('');
}

function renderCertificates(certificates) {
  $('certificatesGrid').innerHTML = (certificates || []).map((cert, i) => `
    <article class="card">
      <img src="${escapeHtml(safeImage(cert.image || cert.image_path))}" alt="${escapeHtml(cert.title || cert.name || 'Certificate')}" loading="lazy" />
      <h3>${escapeHtml(cert.title || cert.name || 'Certificate')}</h3>
      <p class="meta">${escapeHtml(cert.issuer || 'Issuer')} • ${escapeHtml(cert.date || cert.issue_date || '')}</p>
      <button class="btn" data-cert-index="${i}" type="button">View Full Certificate</button>
    </article>
  `).join('');

  $('certificatesGrid').querySelectorAll('[data-cert-index]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const cert = certificates[Number(btn.dataset.certIndex)] || {};
      $('dialogImage').src = safeImage(cert.image || cert.image_path);
      $('dialogMeta').textContent = `${cert.title || cert.name || 'Certificate'} | ${cert.issuer || 'Issuer'} | ${cert.date || cert.issue_date || ''}`;
      $('certificateDialog').showModal();
    });
  });
}

function renderProjects(projects) {
  $('projectsGrid').innerHTML = (projects || []).map((p) => `
    <article class="card">
      <img src="${escapeHtml(safeImage(p.image || p.image_path))}" alt="${escapeHtml(p.title || 'Project')}" loading="lazy" />
      <h3>${escapeHtml(p.title || 'Project')}</h3>
      <p>${escapeHtml(p.description || '')}</p>
      <p class="meta">Tech: ${escapeHtml((p.technologies || []).join(', '))}</p>
      <p>${linkButton('GitHub', p.github || p.github_link)} ${linkButton('Live Demo', p.demo || p.live_link)}</p>
    </article>
  `).join('');
}

function renderResearch(research) {
  $('researchList').innerHTML = (research || []).map((r) => `
    <article class="research-item">
      <h3>${escapeHtml(r.title || 'Research')}</h3>
      <p>${escapeHtml(r.description || '')}</p>
      <p class="meta">Published: ${escapeHtml(r.date || r.publication_date || '')}</p>
      ${linkButton('View / Download', r.link || '')}
    </article>
  `).join('');
}

function renderGallery(gallery) {
  $('galleryGrid').innerHTML = (gallery || []).map((g) => `
    <article class="card">
      <img src="${escapeHtml(safeImage(g.url || g.image_path))}" alt="${escapeHtml(g.caption || 'Gallery image')}" loading="lazy" />
      <p class="meta">${escapeHtml(g.caption || '')}</p>
    </article>
  `).join('');
}

function renderResume(resume) {
  if (!resume || !$('resumeContent')) return;
  const list = (items) => (items || []).map((x) => `<li>${escapeHtml(x)}</li>`).join('');
  const tags = (items) => (items || []).map((x) => `<span class="tag">${escapeHtml(x)}</span>`).join('');
  $('resumeContent').innerHTML = `<article class="research-item">
    <h3>${escapeHtml(resume.name || '')}</h3>
    <p class="meta">${escapeHtml(resume.title || '')}</p>
    <p>${escapeHtml(resume.summary || '')}</p>
    <p><strong>Career Objective:</strong> ${escapeHtml(resume.objective || '')}</p>
    ${resume.availability ? `<p><strong>Availability:</strong> ${escapeHtml(resume.availability)}</p>` : ''}
    <h3>Highlights</h3><ul>${list(resume.highlights)}</ul>
    <h3>Technical Skills</h3>
    <p class="meta">Cybersecurity & Networking</p><div class="tags">${tags(resume.skills?.cybersecurity_networking)}</div>
    <p class="meta">Programming & Development</p><div class="tags">${tags(resume.skills?.programming_development)}</div>
    <p class="meta">Systems & Tools</p><div class="tags">${tags(resume.skills?.systems_tools)}</div>
    <h3>Education</h3><ul>${(resume.education || []).map((row) => `<li><strong>${escapeHtml(row.institution || '')}</strong> - ${escapeHtml(row.program || '')} <span class="meta">(${escapeHtml(row.period || '')})</span></li>`).join('')}</ul>
    <h3>Experience</h3><ul>${(resume.experience || []).map((row) => `<li><strong>${escapeHtml(row.role || '')}</strong> - ${escapeHtml(row.organization || '')}<ul>${list(row.details || [])}</ul></li>`).join('')}</ul>
    <h3>Certifications</h3><ul>${list(resume.certifications)}</ul>
    <h3>Activities & Community</h3><ul>${list(resume.activities)}</ul>
    <h3>Interests</h3><div class="tags">${tags(resume.interests)}</div>
  </article>`;
}

function getGroupedChallenges() {
  const visible = (state.challenges || []).filter((c) => c.published !== false);
  const byCategory = state.challengeCategory === 'All'
    ? visible
    : visible.filter((c) => (c.categories || []).includes(state.challengeCategory));
  const byPlatform = state.challengePlatform
    ? byCategory.filter((c) => c.platform === state.challengePlatform)
    : byCategory;

  const groups = {};
  byPlatform.forEach((c) => {
    if (!groups[c.platform]) groups[c.platform] = [];
    groups[c.platform].push(c);
  });

  const orderedKeys = sortPlatforms(Object.keys(groups));
  return { groups, orderedKeys };
}

function renderChallengePlatformMenu() {
  const submenu = $('challengeSubmenu');
  if (!submenu) return;
  const platforms = sortPlatforms(new Set(state.challenges.map((c) => c.platform)));
  submenu.innerHTML = platforms.map((p) => `<button class="nav-sublink ${state.challengePlatform === p ? 'active' : ''}" data-platform="${escapeHtml(p)}">${escapeHtml(p)}</button>`).join('');
  submenu.querySelectorAll('[data-platform]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.challengePlatform = btn.dataset.platform;
      state.collapsedPlatforms.clear();
      setActiveView('challenges');
    });
  });
}

function renderChallengeFilters() {
  const platformSelect = $('challengePlatformFilter');
  const categorySelect = $('challengeCategoryFilter');
  if (!platformSelect || !categorySelect) return;

  const platformOptions = sortPlatforms(new Set(state.challenges.map((c) => c.platform)));
  const categorySet = new Set();
  state.challenges.forEach((challenge) => {
    (challenge.categories || []).forEach((category) => categorySet.add(category));
  });
  const categories = CATEGORY_OPTIONS.filter((x) => categorySet.has(x)).concat(
    [...categorySet].filter((x) => !CATEGORY_OPTIONS.includes(x)).sort((a, b) => a.localeCompare(b)),
  );

  platformSelect.innerHTML = `<option value="">All Platforms</option>${platformOptions
    .map((p) => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`)
    .join('')}`;
  categorySelect.innerHTML = `<option value="All">All Categories</option>${categories
    .map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`)
    .join('')}`;

  platformSelect.value = state.challengePlatform || '';
  categorySelect.value = state.challengeCategory || 'All';
}

function challengeCard(entry) {
  const badges = (entry.categories || []).map((c) => `<span class="tag">${escapeHtml(c)}</span>`).join('');
  const writeup = entry.medium_link ? linkButton('Write-up', entry.medium_link) : '';
  return `
    <article class="card challenge-card">
      <img src="${escapeHtml(safeImage(entry.thumbnail))}" alt="${escapeHtml(entry.title)}" loading="lazy" />
      <h3>${escapeHtml(entry.title)}</h3>
      <p class="meta">Platform: ${escapeHtml(entry.platform)} • Difficulty: ${escapeHtml(entry.difficulty || 'N/A')} • Status: ${escapeHtml(entry.status || 'N/A')}</p>
      <p>${escapeHtml(entry.description || '')}</p>
      <div class="tags">${badges}</div>
      <p>${writeup}</p>
    </article>
  `;
}

function renderChallenges() {
  renderChallengeFilters();
  const quickPlatforms = ['All Platforms', ...sortPlatforms(new Set(state.challenges.map((c) => c.platform)))];
  $('challengeTabs').innerHTML = quickPlatforms
    .map((platformLabel) => {
      const isActive = platformLabel === 'All Platforms'
        ? !state.challengePlatform
        : state.challengePlatform === platformLabel;
      return `<button class="tab-btn ${isActive ? 'active' : ''}" data-platform-tab="${escapeHtml(platformLabel)}" type="button">${escapeHtml(platformLabel)}</button>`;
    })
    .join('');
  $('challengeTabs').querySelectorAll('[data-platform-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const selected = btn.dataset.platformTab;
      state.challengePlatform = selected === 'All Platforms' ? '' : selected;
      renderChallengePlatformMenu();
      renderChallengeFilters();
      renderChallenges();
    });
  });

  const { groups, orderedKeys } = getGroupedChallenges();
  if (!orderedKeys.length) {
    $('challengeIntro').innerHTML = '<p class="muted">No challenges match the selected filters.</p>';
    $('challengeList').innerHTML = '';
    return;
  }

  const thmProfile = state.content?.challenges?.tryhackme?.profileUrl || 'https://tryhackme.com/p/M47h3wR34n';
  const thmEmbed = state.content?.challenges?.tryhackme?.badgeEmbed || 'https://tryhackme.com/api/v2/badges/public-profile?userPublicId=2981082';

  $('challengeIntro').innerHTML = state.challengePlatform
    ? `<p class="muted">Showing platform: <strong>${escapeHtml(state.challengePlatform)}</strong> | Category: <strong>${escapeHtml(state.challengeCategory)}</strong></p>`
    : `<p class="muted">Grouped by platform | Category: <strong>${escapeHtml(state.challengeCategory)}</strong></p>`;

  $('challengeList').innerHTML = orderedKeys.map((platform) => {
    const badgeBlock = platform === 'TryHackMe'
      ? `<div class="badge-block"><p><strong>TryHackMe Profile Badge</strong></p><div id="thmBadgeMount"><iframe id="thmBadgeIframe" class="thm-badge-iframe" src="${escapeHtml(thmEmbed)}" title="TryHackMe public profile badge" loading="lazy"></iframe></div><p>${linkButton('Open TryHackMe Profile', thmProfile)}</p></div>`
      : '';
    const collapsed = state.collapsedPlatforms.has(platform);
    return `
      <section class="challenge-section ${collapsed ? 'collapsed' : ''}" data-platform-section="${escapeHtml(platform)}">
        <button class="challenge-section-toggle" data-toggle-platform="${escapeHtml(platform)}" type="button" aria-expanded="${collapsed ? 'false' : 'true'}">
          <span>${escapeHtml(platform)}</span>
          <span class="chevron" aria-hidden="true">▾</span>
        </button>
        <div class="challenge-section-body">
          ${badgeBlock}
          <div class="challenge-grid">${groups[platform].map((entry) => challengeCard(entry)).join('')}</div>
        </div>
      </section>
    `;
  }).join('');

  $('challengeList').querySelectorAll('[data-toggle-platform]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const platform = btn.dataset.togglePlatform;
      if (state.collapsedPlatforms.has(platform)) {
        state.collapsedPlatforms.delete(platform);
      } else {
        state.collapsedPlatforms.add(platform);
      }
      renderChallenges();
    });
  });

  $('challengeList').querySelectorAll('.challenge-card img').forEach((img) => {
    img.addEventListener('error', () => {
      img.src = 'https://placehold.co/900x600/1b2b4b/e8eefb?text=Thumbnail+Missing';
    }, { once: true });
  });

  const iframe = $('thmBadgeIframe');
  const mount = $('thmBadgeMount');
  if (iframe && mount) {
    iframe.addEventListener('error', () => {
      mount.innerHTML = `<div class="thm-badge-fallback"><p class="meta">TryHackMe badge API is temporarily unavailable.</p>${linkButton('Open TryHackMe Profile', thmProfile)}</div>`;
    });
  }
}

function setActiveView(view) {
  state.activeView = view;
  document.querySelectorAll('.view-section').forEach((section) => section.classList.toggle('active', section.dataset.view === view));
  document.querySelectorAll('.nav-link').forEach((button) => button.classList.toggle('active', button.dataset.view === view));
  document.querySelectorAll('.nav-sublink').forEach((button) => button.classList.toggle('active', button.dataset.platform === state.challengePlatform));
  if (view === 'challenges') renderChallenges();
}

function setupNavigation() {
  document.querySelectorAll('.nav-link[data-view]').forEach((btn) => btn.addEventListener('click', () => setActiveView(btn.dataset.view)));
  $('challengeGroupToggle').addEventListener('click', () => {
    state.challengePlatform = '';
    state.collapsedPlatforms.clear();
    setActiveView('challenges');
  });

  const mobileToggle = $('mobileNavToggle');
  const sidebarNav = $('sidebarNav');
  if (mobileToggle && sidebarNav) {
    mobileToggle.addEventListener('click', () => sidebarNav.classList.toggle('open'));
  }
}

function setupChallengeFilters() {
  const platformSelect = $('challengePlatformFilter');
  const categorySelect = $('challengeCategoryFilter');
  const clearBtn = $('clearChallengeFilters');
  if (!platformSelect || !categorySelect || !clearBtn) return;

  platformSelect.addEventListener('change', () => {
    state.challengePlatform = platformSelect.value;
    state.collapsedPlatforms.clear();
    renderChallengePlatformMenu();
    renderChallenges();
  });

  categorySelect.addEventListener('change', () => {
    state.challengeCategory = categorySelect.value || 'All';
    renderChallenges();
  });

  clearBtn.addEventListener('click', () => {
    state.challengePlatform = '';
    state.challengeCategory = 'All';
    state.collapsedPlatforms.clear();
    renderChallengePlatformMenu();
    renderChallengeFilters();
    renderChallenges();
  });
}

function setupDialog() {
  $('closeDialog').addEventListener('click', () => $('certificateDialog').close());
}

(async function init() {
  setupThemeToggle();
  setupNavigation();
  setupDialog();

  try {
    state.content = await loadContent();
    state.challenges = normalizeChallenges(state.content.challenges || {});
    renderChallengeFilters();
    renderChallengePlatformMenu();
    setupChallengeFilters();

    renderSiteMeta(state.content.site || {});
    renderResume(state.content.resume || {});
    renderCertificates(state.content.certificates || []);
    renderProjects(state.content.projects || []);
    renderResearch(state.content.research || []);
    renderGallery(state.content.gallery || []);
    renderChallenges();
    setActiveView(state.activeView);
  } catch (error) {
    console.error(error);
    $('heroTitle').textContent = 'Unable to load content.';
    $('heroSummary').textContent = 'Check data JSON files and refresh.';
  }
})();
