const grid = document.getElementById('challenge-grid');
const searchInput = document.getElementById('challenge-search');
const platformFilter = document.getElementById('platform-filter');
const difficultyFilter = document.getElementById('difficulty-filter');
const quickFilterButtons = document.querySelectorAll('[data-quick-filter]');

const modal = document.getElementById('gallery-modal');
const modalImage = document.getElementById('gallery-image');
const modalTitle = document.getElementById('gallery-title');
const modalCounter = document.getElementById('gallery-counter');
const modalPrev = document.getElementById('gallery-prev');
const modalNext = document.getElementById('gallery-next');
const modalClose = document.getElementById('gallery-close');

const state = {
  challenges: [],
  filtered: [],
  activePlatform: 'All Platforms',
  activeDifficulty: 'All Difficulties',
  search: '',
  activeGallery: null,
  activeImageIndex: 0,
};

const difficultyOrder = ['Easy', 'Medium', 'Hard', 'Insane'];

// Paths in challenges.json should be relative to /docs (ex: assets/challenges/my-shot.png)
function resolveAssetPath(path) {
  if (!path) return '';
  if (path.startsWith('http') || path.startsWith('../') || path.startsWith('/')) {
    return path;
  }
  return `../${path}`;
}

function setOptions(select, items, defaultLabel) {
  select.innerHTML = '';
  const defaultOption = document.createElement('option');
  defaultOption.textContent = defaultLabel;
  defaultOption.value = defaultLabel;
  select.appendChild(defaultOption);

  items.forEach((item) => {
    const option = document.createElement('option');
    option.textContent = item;
    option.value = item;
    select.appendChild(option);
  });
}

function normalize(value) {
  return value.toLowerCase();
}

function matchesSearch(challenge, query) {
  if (!query) return true;
  const haystack = [
    challenge.title,
    challenge.platform,
    challenge.difficulty,
    challenge.description,
    (challenge.tools || []).join(' '),
    (challenge.keyLessons || []).join(' '),
  ]
    .join(' ')
    .toLowerCase();

  return haystack.includes(query);
}

function filterChallenges() {
  const platform = state.activePlatform;
  const difficulty = state.activeDifficulty;
  const query = normalize(state.search);

  state.filtered = state.challenges.filter((challenge) => {
    const matchesPlatform = platform === 'All Platforms' || challenge.platform === platform;
    const matchesDifficulty = difficulty === 'All Difficulties' || challenge.difficulty === difficulty;
    const matchesQuery = matchesSearch(challenge, query);

    return matchesPlatform && matchesDifficulty && matchesQuery;
  });

  renderChallenges();
}

function openGallery(challenge, index = 0) {
  state.activeGallery = challenge;
  state.activeImageIndex = index;
  updateGallery();
  modal.classList.add('active');
  modal.setAttribute('aria-hidden', 'false');
}

function closeGallery() {
  modal.classList.remove('active');
  modal.setAttribute('aria-hidden', 'true');
}

function updateGallery() {
  const challenge = state.activeGallery;
  if (!challenge) return;
  const images = challenge.images || [];
  const safeIndex = Math.max(0, Math.min(state.activeImageIndex, images.length - 1));
  state.activeImageIndex = safeIndex;

  const imagePath = resolveAssetPath(images[safeIndex]);
  modalImage.src = imagePath;
  modalImage.alt = `${challenge.title} evidence ${safeIndex + 1}`;
  modalTitle.textContent = challenge.title;
  modalCounter.textContent = `${safeIndex + 1} of ${images.length}`;

  modalPrev.disabled = safeIndex === 0;
  modalNext.disabled = safeIndex === images.length - 1;
}

function renderChallenges() {
  grid.innerHTML = '';

  if (!state.filtered.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'No challenges match your filters yet.';
    grid.appendChild(empty);
    return;
  }

  state.filtered.forEach((challenge) => {
    const card = document.createElement('article');
    card.className = 'challenge-card';

    const preview = document.createElement('div');
    preview.className = 'challenge-media';

    const previewImage = document.createElement('img');
    const thumbnail = challenge.thumbnail || (challenge.images || [])[0];
    previewImage.src = resolveAssetPath(thumbnail);
    previewImage.alt = `${challenge.title} preview`;
    previewImage.loading = 'lazy';

    preview.appendChild(previewImage);

    const content = document.createElement('div');
    content.className = 'challenge-content';

    const titleBlock = document.createElement('div');
    titleBlock.className = 'challenge-title';

    const title = document.createElement('h3');
    title.textContent = challenge.title;

    const badgeRow = document.createElement('div');
    badgeRow.className = 'badge-row';

    const platformBadge = document.createElement('span');
    platformBadge.className = 'badge';
    platformBadge.textContent = challenge.platform;

    const difficultyBadge = document.createElement('span');
    difficultyBadge.className = 'badge difficulty';
    difficultyBadge.textContent = challenge.difficulty;

    badgeRow.appendChild(platformBadge);
    badgeRow.appendChild(difficultyBadge);

    titleBlock.appendChild(title);
    titleBlock.appendChild(badgeRow);

    const description = document.createElement('p');
    description.textContent = challenge.description;

    const meta = document.createElement('div');
    meta.className = 'challenge-meta';
    meta.innerHTML = `<span><strong>Date:</strong> ${challenge.dateCompleted}</span>`;

    const toolsLabel = document.createElement('div');
    toolsLabel.className = 'challenge-meta';
    toolsLabel.innerHTML = '<strong>Tools used:</strong>';

    const toolsRow = document.createElement('div');
    toolsRow.className = 'challenge-tools';
    (challenge.tools || []).forEach((tool) => {
      const tag = document.createElement('span');
      tag.className = 'tag';
      tag.textContent = tool;
      toolsRow.appendChild(tag);
    });

    const lessonsLabel = document.createElement('div');
    lessonsLabel.className = 'challenge-meta';
    lessonsLabel.innerHTML = '<strong>Key lessons:</strong>';

    const lessonsRow = document.createElement('div');
    lessonsRow.className = 'challenge-lessons';
    (challenge.keyLessons || []).forEach((lesson) => {
      const tag = document.createElement('span');
      tag.className = 'tag';
      tag.textContent = lesson;
      lessonsRow.appendChild(tag);
    });

    const actions = document.createElement('div');
    actions.className = 'challenge-actions';

    const galleryButton = document.createElement('button');
    galleryButton.type = 'button';
    galleryButton.textContent = `View Gallery (${(challenge.images || []).length})`;
    galleryButton.addEventListener('click', () => openGallery(challenge, 0));

    actions.appendChild(galleryButton);

    content.appendChild(titleBlock);
    content.appendChild(description);
    content.appendChild(meta);
    content.appendChild(toolsLabel);
    content.appendChild(toolsRow);
    content.appendChild(lessonsLabel);
    content.appendChild(lessonsRow);
    content.appendChild(actions);

    card.appendChild(preview);
    card.appendChild(content);

    preview.addEventListener('click', () => openGallery(challenge, 0));

    grid.appendChild(card);
  });
}

function attachEvents() {
  searchInput.addEventListener('input', (event) => {
    state.search = event.target.value.trim();
    filterChallenges();
  });

  platformFilter.addEventListener('change', (event) => {
    state.activePlatform = event.target.value;
    filterChallenges();
  });

  difficultyFilter.addEventListener('change', (event) => {
    state.activeDifficulty = event.target.value;
    filterChallenges();
  });

  quickFilterButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const platform = button.getAttribute('data-quick-filter');
      platformFilter.value = platform;
      state.activePlatform = platform;
      filterChallenges();
      window.scrollTo({ top: grid.offsetTop - 80, behavior: 'smooth' });
    });
  });

  modalClose.addEventListener('click', closeGallery);
  modal.addEventListener('click', (event) => {
    if (event.target === modal) closeGallery();
  });

  modalPrev.addEventListener('click', () => {
    state.activeImageIndex -= 1;
    updateGallery();
  });

  modalNext.addEventListener('click', () => {
    state.activeImageIndex += 1;
    updateGallery();
  });

  document.addEventListener('keydown', (event) => {
    if (!modal.classList.contains('active')) return;
    if (event.key === 'Escape') closeGallery();
    if (event.key === 'ArrowLeft') {
      state.activeImageIndex -= 1;
      updateGallery();
    }
    if (event.key === 'ArrowRight') {
      state.activeImageIndex += 1;
      updateGallery();
    }
  });
}

function initChallenges() {
  fetch('../assets/challenges/challenges.json')
    .then((response) => response.json())
    .then((data) => {
      state.challenges = data;

      const platforms = Array.from(new Set(data.map((item) => item.platform))).sort();
      const difficulties = Array.from(new Set(data.map((item) => item.difficulty)))
        .sort((a, b) => difficultyOrder.indexOf(a) - difficultyOrder.indexOf(b));

      setOptions(platformFilter, platforms, 'All Platforms');
      setOptions(difficultyFilter, difficulties, 'All Difficulties');

      filterChallenges();
    })
    .catch(() => {
      grid.innerHTML = '<div class="empty-state">Unable to load challenges right now.</div>';
    });

  attachEvents();
}

initChallenges();
