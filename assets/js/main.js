const state = {
  challenges: null,
  activeChallengeTab: 'tryhackme',
};

const customChallengeKey = 'portfolioCustomChallenges';

function $(id) {
  return document.getElementById(id);
}

async function loadJSON(path) {
  const res = await fetch(path);
  if (!res.ok) {
    throw new Error(`Failed loading ${path}`);
  }
  return res.json();
}

function safeImage(url, fallback = 'https://placehold.co/800x450/18233b/9db0cf?text=Add+Image') {
  return url && url.trim() ? url : fallback;
}

function renderSiteMeta(site) {
  $('heroTitle').textContent = site.heroTitle;
  $('heroSummary').textContent = site.heroSummary;
  $('aboutText').textContent = site.about;

  $('contactLinks').innerHTML = site.contact
    .map((item) => `<a class="btn" href="${item.href}" target="_blank" rel="noreferrer">${item.label}</a>`)
    .join('');
}

function renderCertificates(certificates) {
  const grid = $('certificatesGrid');
  grid.innerHTML = certificates
    .map(
      (cert, index) => `
      <article class="card">
        <img src="${safeImage(cert.image)}" alt="${cert.name}" />
        <h3>${cert.name}</h3>
        <p class="meta">${cert.issuer} • ${cert.date}</p>
        <button class="btn" data-cert-index="${index}">View Full Certificate</button>
      </article>
    `,
    )
    .join('');

  grid.querySelectorAll('[data-cert-index]').forEach((button) => {
    button.addEventListener('click', () => {
      const cert = certificates[Number(button.dataset.certIndex)];
      $('dialogImage').src = safeImage(cert.image);
      $('dialogMeta').textContent = `${cert.name} | ${cert.issuer} | ${cert.date}`;
      $('certificateDialog').showModal();
    });
  });
}

function renderProjects(projects) {
  $('projectsGrid').innerHTML = projects
    .map(
      (project) => `
      <article class="card">
        <img src="${safeImage(project.image)}" alt="${project.title}" />
        <h3>${project.title}</h3>
        <p>${project.description}</p>
        <p class="meta">Tech: ${project.technologies.join(', ')}</p>
        <div class="hero-actions">
          <a class="btn" href="${project.github}" target="_blank" rel="noreferrer">GitHub</a>
          <a class="btn" href="${project.demo}" target="_blank" rel="noreferrer">Live Demo</a>
        </div>
      </article>
    `,
    )
    .join('');
}

function renderResearch(research) {
  $('researchList').innerHTML = research
    .map(
      (item) => `
      <article class="research-item">
        <h3>${item.title}</h3>
        <p>${item.description}</p>
        <p class="meta">Published: ${item.date}</p>
        <a class="btn" href="${item.link}" target="_blank" rel="noreferrer">View / Download</a>
      </article>
    `,
    )
    .join('');
}

function renderGallery(gallery) {
  $('galleryGrid').innerHTML = gallery
    .map(
      (image) => `
      <figure class="card">
        <img src="${safeImage(image.url, 'https://placehold.co/600x450/18233b/9db0cf?text=Gallery+Image')}" alt="${image.caption}" />
        <figcaption class="meta">${image.caption}</figcaption>
      </figure>
    `,
    )
    .join('');
}

function getAllChallenges() {
  const custom = JSON.parse(localStorage.getItem(customChallengeKey) || '{}');
  const merged = JSON.parse(JSON.stringify(state.challenges));

  Object.keys(custom).forEach((category) => {
    merged.categories[category] = merged.categories[category] || { entries: [] };
    merged.categories[category].entries = [...merged.categories[category].entries, ...custom[category]];
  });

  return merged;
}

function challengeCard(entry, category) {
  const tags = (entry.tags || []).map((tag) => `<span class="tag">${tag}</span>`).join('');
  const sourceRow =
    category === 'others' && (entry.sourceSite || entry.ctfName)
      ? `<p class="meta">${entry.sourceSite || 'Source'}${entry.ctfName ? ` • ${entry.ctfName}` : ''}</p>`
      : '';

  return `
    <article class="card">
      <img src="${safeImage(entry.image)}" alt="${entry.title}" />
      <h3>${entry.title}</h3>
      <p>${entry.description}</p>
      <p class="meta">Completed: ${entry.dateCompleted} • Difficulty: ${entry.difficulty || 'N/A'}</p>
      ${sourceRow}
      <div class="tags">${tags}</div>
      ${entry.mediumLink ? `<a class="btn" target="_blank" rel="noreferrer" href="${entry.mediumLink}">Read Medium Writeup</a>` : ''}
    </article>
  `;
}

function renderChallengeTabs() {
  const allChallenges = getAllChallenges();
  const categories = Object.keys(allChallenges.categories);
  $('challengeTabs').innerHTML = categories
    .map(
      (key) =>
        `<button class="tab-btn ${state.activeChallengeTab === key ? 'active' : ''}" data-tab="${key}">${allChallenges.categories[key].label}</button>`,
    )
    .join('');

  $('challengeTabs').querySelectorAll('[data-tab]').forEach((button) => {
    button.addEventListener('click', () => {
      state.activeChallengeTab = button.dataset.tab;
      renderChallenges();
    });
  });
}

function renderChallenges() {
  const allChallenges = getAllChallenges();
  const category = allChallenges.categories[state.activeChallengeTab];

  renderChallengeTabs();

  const badgeHtml =
    state.activeChallengeTab === 'tryhackme'
      ? `
      <div class="badge-block">
        <p><strong>TryHackMe Profile Badge</strong></p>
        <a href="${allChallenges.tryhackme.profileUrl}" target="_blank" rel="noreferrer">
          <img src="${allChallenges.tryhackme.badgeImage}" alt="TryHackMe badge" />
        </a>
      </div>
      `
      : '';

  $('challengeIntro').innerHTML = `${badgeHtml}<p class="meta">${category.description}</p>`;
  $('challengeList').innerHTML = category.entries.length
    ? category.entries.map((entry) => challengeCard(entry, state.activeChallengeTab)).join('')
    : '<article class="card"><p class="meta">No challenges added yet in this section.</p></article>';
}

function setupChallengeDropdown() {
  const button = $('challengeMenuButton');
  const menu = $('challengeMenu');

  button.addEventListener('click', () => {
    const expanded = button.getAttribute('aria-expanded') === 'true';
    button.setAttribute('aria-expanded', String(!expanded));
    menu.classList.toggle('open');
  });

  menu.querySelectorAll('[data-challenge-tab]').forEach((link) => {
    link.addEventListener('click', () => {
      state.activeChallengeTab = link.dataset.challengeTab;
      renderChallenges();
      menu.classList.remove('open');
      button.setAttribute('aria-expanded', 'false');
    });
  });
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

function setupMobileNav() {
  $('menuToggle').addEventListener('click', () => {
    $('siteNav').classList.toggle('open');
  });
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve('');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function setupChallengeForm() {
  $('challengeForm').addEventListener('submit', async (event) => {
    event.preventDefault();

    const category = $('challengeCategory').value;
    const entry = {
      title: $('challengeTitle').value.trim(),
      description: $('challengeDescription').value.trim(),
      mediumLink: $('challengeMedium').value.trim(),
      dateCompleted: $('challengeDate').value,
      difficulty: $('challengeDifficulty').value.trim(),
      tags: $('challengeTags').value.split(',').map((tag) => tag.trim()).filter(Boolean),
      sourceSite: $('challengeSource').value.trim(),
      ctfName: $('challengeCtfName').value.trim(),
      image: await readFileAsDataUrl($('challengeImage').files[0]),
    };

    const custom = JSON.parse(localStorage.getItem(customChallengeKey) || '{}');
    custom[category] = custom[category] || [];
    custom[category].push(entry);
    localStorage.setItem(customChallengeKey, JSON.stringify(custom));

    $('challengeForm').reset();
    state.activeChallengeTab = category;
    renderChallenges();
  });
}

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

  setupChallengeDropdown();
  setupThemeToggle();
  setupMobileNav();
  setupChallengeForm();

  $('closeDialog').addEventListener('click', () => $('certificateDialog').close());
}

boot().catch((error) => {
  console.error(error);
});
