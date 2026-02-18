const entries = [];
const adminSessionKey = 'portfolio_admin_unlocked';
const adminPassHash = '46fcb51516fd216f3e01845e73f5127f4635eebf942ed4a3fd16b0ecf66f93d6';

function $(id) {
  return document.getElementById(id);
}

function renderOutput() {
  $('output').textContent = JSON.stringify(entries, null, 2);
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

async function sha256(value) {
  const bytes = new TextEncoder().encode(value);
  const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function showAdminPanel() {
  $('authGate').style.display = 'none';
  $('adminPanel').hidden = false;
}

$('authForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const passphrase = $('adminPassphrase').value;
  const hash = await sha256(passphrase);
  if (hash !== adminPassHash) {
    $('authMessage').textContent = 'Invalid passphrase.';
    return;
  }
  sessionStorage.setItem(adminSessionKey, '1');
  showAdminPanel();
});

$('challengeForm').addEventListener('submit', (event) => {
  event.preventDefault();

  const category = $('challengeCategory').value;
  const entry = {
    category,
    title: $('challengeTitle').value.trim(),
    description: $('challengeDescription').value.trim(),
    image: $('challengeImage').value.trim(),
    mediumLink: $('challengeMedium').value.trim(),
    dateCompleted: $('challengeDate').value,
    tags: $('challengeTags').value.split(',').map((tag) => tag.trim()).filter(Boolean),
    difficulty: $('challengeDifficulty').value.trim(),
    sourceSite: $('challengeSource').value.trim(),
    ctfName: $('challengeCtfName').value.trim(),
  };

  entries.push(entry);
  $('challengeForm').reset();
  renderOutput();
});

$('clearOutput').addEventListener('click', () => {
  entries.length = 0;
  renderOutput();
});

if (sessionStorage.getItem(adminSessionKey) === '1') {
  showAdminPanel();
}

setupThemeToggle();
renderOutput();
