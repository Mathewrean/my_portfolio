const state = {
  activeView: 'home',
  activeChallengeTab: 'tryhackme',
  content: null,
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
    return ['http:', 'https:', 'mailto:'].includes(url.protocol);
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

async function loadContent() {
  try {
    const response = await fetch('/api/public/content');
    if (!response.ok) throw new Error('API unavailable');
    return await response.json();
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
    return { site, resume, challenges, certificates, projects, gallery, research, blog: [] };
  }
}

function renderSiteMeta(site) {
  $('heroTitle').textContent = site.heroTitle || '';
  $('heroSummary').textContent = site.heroSummary || '';
  $('aboutText').textContent = site.about || '';
  $('contactLinks').innerHTML = (site.contact || []).map((item) => linkButton(item.label, item.href)).join('');
}

function renderCertificates(certificates) {
  $('certificatesGrid').innerHTML = (certificates || [])
    .map(
      (cert, index) => `
      <article class="card">
        <img src="${escapeHtml(safeImage(cert.image || cert.image_path))}" alt="${escapeHtml(cert.title || cert.name || 'Certificate')}" loading="lazy" />
        <h3>${escapeHtml(cert.title || cert.name || 'Certificate')}</h3>
        <p class="meta">${escapeHtml(cert.issuer || 'Issuer')} • ${escapeHtml(cert.date || cert.issue_date || 'Date')}</p>
        <button class="btn" data-cert-index="${index}">View Full Certificate</button>
      </article>
    `,
    )
    .join('');

  $('certificatesGrid').querySelectorAll('[data-cert-index]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const cert = certificates[Number(btn.dataset.certIndex)] || {};
      $('dialogImage').src = safeImage(cert.image || cert.image_path);
      $('dialogMeta').textContent = `${cert.title || cert.name || 'Certificate'} | ${cert.issuer || 'Issuer'} | ${cert.date || cert.issue_date || 'Date'}`;
      $('certificateDialog').showModal();
    });
  });
}

function renderProjects(projects) {
  $('projectsGrid').innerHTML = (projects || [])
    .map(
      (project) => `
      <article class="card">
        <img src="${escapeHtml(safeImage(project.image || project.image_path))}" alt="${escapeHtml(project.title || 'Project')}" loading="lazy" />
        <h3>${escapeHtml(project.title || 'Project')}</h3>
        <p>${escapeHtml(project.description || '')}</p>
        <p class="meta">Tech: ${escapeHtml((project.technologies || []).join(', '))}</p>
        <p>${linkButton('GitHub', project.github || project.github_link)} ${linkButton('Live Demo', project.demo || project.live_link)}</p>
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
        <p class="meta">Published: ${escapeHtml(item.date || item.publication_date || '')}</p>
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
        <img src="${escapeHtml(safeImage(image.url || image.image_path))}" alt="${escapeHtml(image.caption || 'Gallery image')}" loading="lazy" />
        <p class="meta">${escapeHtml(image.caption || '')}</p>
      </article>
    `,
    )
    .join('');
}

function renderResume(resume) {
  if (!resume || !$('resumeContent')) return;
  const list = (items) => (items || []).map((item) => `<li>${escapeHtml(item)}</li>`).join('');
  const tags = (items) => (items || []).map((item) => `<span class="tag">${escapeHtml(item)}</span>`).join('');

  $('resumeContent').innerHTML = `
    <article class="research-item">
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
    </article>
  `;
}

function challengeCard(entry, category) {
  const tags = (entry.tags || []).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join('');
  const sourceRow = category === 'others' && (entry.sourceSite || entry.ctfName)
    ? `<p class="meta">${escapeHtml(entry.sourceSite || 'Source')}${entry.ctfName ? ` • ${escapeHtml(entry.ctfName)}` : ''}</p>`
    : '';

  const badge = entry.badgeThumbnail
    ? `<img class="badge-thumb" src="${escapeHtml(safeImage(entry.badgeThumbnail))}" alt="Finished challenge badge" loading="lazy" />`
    : '<div class="badge-thumb fallback">No badge</div>';

  return `
    <article class="card challenge-card">
      <img src="${escapeHtml(safeImage(entry.image))}" alt="${escapeHtml(entry.title || 'Challenge')}" loading="lazy" />
      <h3>${escapeHtml(entry.title || 'Challenge')}</h3>
      <p>${escapeHtml(entry.description || '')}</p>
      <p class="meta">Platform: ${escapeHtml(entry.platform || category)} • Difficulty: ${escapeHtml(entry.difficulty || 'N/A')}</p>
      <p class="meta">Status: ${escapeHtml(entry.status || 'Completed')} • Completed: ${escapeHtml(entry.dateCompleted || 'N/A')}</p>
      ${sourceRow}
      <div class="badge-row"><span class="meta">Finished Badge:</span>${badge}</div>
      <div class="tags">${tags}</div>
      <p>
        ${entry.mediumLink ? linkButton('Read Writeup', entry.mediumLink) : '<span class="btn" aria-disabled="true">Writeup (pending)</span>'}
        ${entry.githubLink ? linkButton('GitHub', entry.githubLink) : ''}
        ${entry.liveLink ? linkButton('Live', entry.liveLink) : ''}
      </p>
    </article>
  `;
}

function setupTryHackMeBadgeSizing() {
  const mount = $('thmBadgeMount');
  const iframe = $('thmBadgeIframe');
  if (!mount || !iframe) return;

  const baseWidth = 350;
  const baseHeight = 86;
  const apply = () => {
    const targetWidth = Math.max(mount.clientWidth, 280);
    const scale = targetWidth / baseWidth;
    iframe.style.width = `${baseWidth}px`;
    iframe.style.height = `${baseHeight}px`;
    iframe.style.transform = `scale(${scale})`;
    mount.style.height = `${Math.ceil(baseHeight * scale * 0.5)}px`;
  };
  requestAnimationFrame(apply);
  window.addEventListener('resize', apply, { passive: true });
}

function setupTryHackMeBadgeFallback(profileUrl) {
  const mount = $('thmBadgeMount');
  const iframe = $('thmBadgeIframe');
  if (!mount || !iframe) return;

  let settled = false;
  const showFallback = () => {
    if (settled) return;
    settled = true;
    mount.innerHTML = `
      <div class="thm-badge-fallback">
        <p class="meta">TryHackMe badge API is temporarily unavailable.</p>
        <a class="btn" href="${escapeHtml(profileUrl || 'https://tryhackme.com/p/M47h3wR34n')}" target="_blank" rel="noopener noreferrer">Open TryHackMe Profile</a>
      </div>
    `;
  };

  iframe.addEventListener('load', () => {
    settled = true;
  });
  iframe.addEventListener('error', showFallback);
  window.setTimeout(() => {
    if (!settled) showFallback();
  }, 5000);
}

function renderChallenges() {
  const category = state.content.challenges.categories[state.activeChallengeTab];
  if (!category) return;

  $('challengeTabs').innerHTML = Object.keys(state.content.challenges.categories)
    .map((key) => `<button class="tab-btn ${key === state.activeChallengeTab ? 'active' : ''}" data-tab="${escapeHtml(key)}">${escapeHtml(state.content.challenges.categories[key].label)}</button>`)
    .join('');

  $('challengeTabs').querySelectorAll('[data-tab]').forEach((button) => {
    button.addEventListener('click', () => {
      state.activeChallengeTab = button.dataset.tab;
      renderChallenges();
      syncChallengeSubmenuActive();
    });
  });

  const profileUrl = state.content.challenges.tryhackme?.profileUrl || 'https://tryhackme.com/p/M47h3wR34n';
  const badgeHtml = state.activeChallengeTab === 'tryhackme'
    ? `
      <div class="badge-block">
        <p><strong>TryHackMe Profile Badge</strong></p>
        <div id="thmBadgeMount">
          <iframe
            id="thmBadgeIframe"
            class="thm-badge-iframe"
            src="https://tryhackme.com/api/v2/badges/public-profile?userPublicId=2981082"
            title="TryHackMe public profile badge"
            loading="lazy"
          ></iframe>
        </div>
      </div>`
    : '';

  $('challengeIntro').innerHTML = `${badgeHtml}<p class="muted">${escapeHtml(category.description || '')}</p>`;
  $('challengeList').innerHTML = (category.entries || []).length
    ? category.entries.map((entry) => challengeCard(entry, state.activeChallengeTab)).join('')
    : '<article class="card"><p class="meta">No challenges added yet in this category.</p></article>';

  if (state.activeChallengeTab === 'tryhackme') {
    setupTryHackMeBadgeSizing();
    setupTryHackMeBadgeFallback(profileUrl);
  }
}

function setActiveView(view) {
  state.activeView = view;
  document.querySelectorAll('.view-section').forEach((section) => section.classList.toggle('active', section.dataset.view === view));
  document.querySelectorAll('.nav-link').forEach((button) => button.classList.toggle('active', button.dataset.view === view));
  if (view === 'challenges') {
    renderChallenges();
    syncChallengeSubmenuActive();
  }
}

function syncChallengeSubmenuActive() {
  document.querySelectorAll('.nav-sublink').forEach((button) => button.classList.toggle('active', button.dataset.challengeTab === state.activeChallengeTab));
}

function setupNavigation() {
  document.querySelectorAll('.nav-link[data-view]').forEach((button) => {
    button.addEventListener('click', () => setActiveView(button.dataset.view));
  });

  document.querySelectorAll('.nav-sublink[data-challenge-tab]').forEach((button) => {
    button.addEventListener('click', () => {
      state.activeChallengeTab = button.dataset.challengeTab;
      setActiveView('challenges');
    });
  });

  $('challengeGroupToggle').addEventListener('click', () => setActiveView('challenges'));

  const mobileToggle = $('mobileNavToggle');
  const sidebarNav = $('sidebarNav');
  if (mobileToggle && sidebarNav) {
    mobileToggle.addEventListener('click', () => {
      sidebarNav.classList.toggle('open');
    });
  }
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
    $('heroSummary').textContent = 'Start the backend server and refresh this page.';
  }
})();
