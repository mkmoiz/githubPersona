const $ = (selector) => document.querySelector(selector);
const icons = {
  accounts: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  key: '<circle cx="8" cy="9" r="5"/><path d="m12 13 8 8m-3-3 3-3m-6 0 3-3"/>',
  git: '<circle cx="6" cy="5" r="2.5"/><circle cx="6" cy="19" r="2.5"/><circle cx="18" cy="5" r="2.5"/><path d="M6 7.5v9M18 7.5V9a7 7 0 0 1-7 7H6"/>',
  book: '<path d="M12 5v15M3 4h4a5 5 0 0 1 5 2 5 5 0 0 1 5-2h4v15h-4a7 7 0 0 0-5 2 7 7 0 0 0-5-2H3Z"/>',
  'arrow-up-right': '<path d="M6 18 18 6M6 6h12v12"/>',
  'arrow-right': '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  shield: '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Z"/><path d="m8 12 3 3 5-6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  globe: '<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>',
  terminal: '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="m7 9 3 3-3 3m6 0h4"/>',
  refresh: '<path d="M20 10a8 8 0 0 0-14-5L3 8m0-5v5h5M4 14a8 8 0 0 0 14 5l3-3m0 5v-5h-5"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v.1"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/>',
  x: '<path d="m6 6 12 12M6 18 18 6"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/>',
  edit: '<path d="m15 4 5 5M4 20l5-1L21 7a2 2 0 0 0-4-4L5 15Z"/>',
  trash: '<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>',
  copy: '<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.1.1l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1M14 11a5 5 0 0 0-7.1-.1l-2 2A5 5 0 0 0 12 20l1.1-1.1"/>',
  folder: '<path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/>',
  history: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>',
};
const icon = (name) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.info}</svg>`;
document.querySelectorAll('[data-icon]').forEach(el => { el.innerHTML = icon(el.dataset.icon); });
const esc = (text) => String(text ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const initials = name => name.trim().split(/\s+/).map(x => x[0]).slice(0, 2).join('').toUpperCase();
const filename = path => path.split('/').pop();
let state = null;
let view = 'accounts';
let pending = false;
let loading = false;
let toastTimer;
let deleteId = null;
let displayedKey = null;
let generationEmail = "";
let originProfileId = null;
let verifyingId = null;
const verifiedAccounts = new Map();
let repos = [];
let backups = [];
let restoreBackupId = null;
let pinRepoPath = null;

function toast(message, error = false) {
  clearTimeout(toastTimer);
  $('#toast').textContent = message;
  $('#toast').classList.toggle('error', error);
  $('#toast').hidden = false;
  toastTimer = setTimeout(() => { $('#toast').hidden = true; }, error ? 8500 : 4500);
}

async function api(path, body) {
  const response = await fetch(path, body === undefined ? {} : {
    method: 'POST', headers: {'Content-Type': 'application/json', 'X-Operator-Token': state?.token || ''},
    body: JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'The request could not be completed.');
  return result;
}

async function refresh(manual = false) {
  if (loading) return;
  loading = true;
  try {
    state = await api('/api/status');
    $('#connection-error').hidden = true;
    render();
    if (manual) toast('Accounts and SSH keys are up to date.');
  } catch (error) {
    $('#connection-error').textContent = `Could not read current status. ${error.message} Make sure the local app is running.`;
    $('#connection-error').hidden = false;
    $('#last-checked').textContent = 'Connection lost · status may be outdated';
    $('#identity-status').textContent = 'Unavailable';
    $('#identity-status').classList.add('unmatched');
  } finally { loading = false; }
}

function render() {
  const active = state.profiles.find(p => p.active);
  const key = active && state.keys.find(k => k.path === active.key);
  $('#account-count').textContent = state.profiles.length;
  $('#accounts-total').textContent = state.profiles.length;
  $('#key-count').textContent = state.keys.length;
  $('#identity-heading').textContent = state.git['user.name'] || 'No global identity yet';
  $('#identity-email').textContent = state.git['user.email'] || 'Save an account to get started.';
  $('#identity-avatar').textContent = state.git['user.name'] ? initials(state.git['user.name']) : '—';
  $('#identity-status').textContent = active ? (key?.available ? `${active.label} · Active` : 'Key unavailable') : 'Not linked to an account';
  $('#identity-status').classList.toggle('unmatched', !active || !key?.available);
  $('#identity-caption').textContent = active ? `Global settings match ${active.label}` : 'Link your identity to a saved account to switch in one click';
  $('#config-name').textContent = state.git['user.name'] || 'Not configured';
  $('#config-email').textContent = state.git['user.email'] || 'Not configured';
  $('#config-key').textContent = active ? filename(active.key) : state.git['core.sshCommand'] || 'SSH default / agent';
  $('#config-key').title = state.git['core.sshCommand'] || 'Git uses your existing SSH configuration or agent.';
  $('#last-checked').textContent = `Synced at ${new Date(state.checked_at * 1000).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', second:'2-digit'})}`;
  $('#warnings').hidden = !state.warnings.length;
  $('#warnings').textContent = state.warnings.join(' ');
  renderAccounts();
  renderKeys($('#key-preview'), state.keys.slice(0, 3));
  renderKeys($('#key-list'), state.keys);
}

function renderAccounts() {
  const query = $('#search').value.toLowerCase().trim();
  const profiles = state.profiles.filter(p => [p.label, p.name, p.email, p.key, p.host || ''].some(value => value.toLowerCase().includes(query)));
  const cards = profiles.map(p => {
    const key = state.keys.find(k => k.path === p.key);
    const verification = verifiedAccounts.get(p.id);
    const subtitle = verification ? `VERIFIED AS @${verification.username}` : (p.active ? 'CURRENT GLOBAL ACCOUNT' : 'SAVED IDENTITY');
    const signingBadge = p.signing ? `<span class="signing-tag" title="SSH Commit Signing Enabled">${icon('shield')}<span>SSH Signed</span></span>` : '';
    return `<article class="account-card ${p.active ? 'active' : ''}">
      <div class="card-head"><div class="account-avatar">${esc(initials(p.label))}</div><div><div class="card-label" title="${esc(p.label)}">${esc(p.label)}</div><div class="card-subtitle ${verification ? 'verified' : ''}">${esc(subtitle)}</div></div><div class="card-tools"><button class="icon-button" data-action="edit" data-id="${esc(p.id)}" aria-label="Edit ${esc(p.label)}" title="Edit account">${icon('edit')}</button><button class="icon-button" data-action="delete" data-id="${esc(p.id)}" aria-label="Remove ${esc(p.label)}" title="Remove account">${icon('trash')}</button></div></div>
      <div class="card-details"><div class="card-detail">${icon('user')}<span title="${esc(p.name)}">${esc(p.name)}</span></div><div class="card-detail">${icon('mail')}<span title="${esc(p.email)}">${esc(p.email)}</span></div></div>
      <div class="account-identifiers"><div class="key-tag" title="${esc(p.key)}">${icon('key')}<span>${esc(filename(p.key))}</span></div><div class="origin-host-tag" title="Account-specific SSH host">${icon('link')}<span>git@${esc(p.host || 'github-account')}:…</span></div>${signingBadge}</div>
      ${key?.available ? '' : '<div class="key-warning card-subtitle">Key unavailable · check file and permissions</div>'}
      <div class="account-card-actions"><button class="origin-button" data-action="origin" data-id="${esc(p.id)}">${icon('link')}Get SSH origin</button><button class="verify-button" data-action="verify" data-id="${esc(p.id)}" ${verifyingId === p.id || !key?.available ? 'disabled' : ''}>${icon(verification ? 'check' : 'shield')}${verifyingId === p.id ? 'Checking GitHub…' : (verification ? `Verified @${esc(verification.username)}` : 'Test GitHub connection')}</button><button class="activate-button" data-action="activate" data-id="${esc(p.id)}" ${pending || p.active || !key?.available ? 'disabled' : ''}>${icon(p.active ? 'check' : 'git')}${p.active ? 'Active account' : 'Activate account'}</button></div>
    </article>`;
  }).join('');
  const intro = !state.profiles.length ? `<div class="empty-intro"><div class="empty-illustration">${icon('git')}</div><div><span class="empty-label">ONE MACHINE. EVERY VERSION OF YOU.</span><h3>Work you. Weekend you.<br>Keep them both in sync.</h3><p>Save your first account with an SSH key, name, and email. Your next switch is just a click away.</p></div></div>` : '';
  const noResults = query && !profiles.length ? '<div class="no-results">No accounts match your search.</div>' : '';
  $('#accounts-grid').innerHTML = intro + cards + noResults + (!query ? `<button class="add-card" data-action="add"><span class="add-circle">${icon('plus')}</span><strong>Add an account</strong><small>Another identity.<br>The same smooth workflow.</small></button>` : '');
}

function renderKeys(container, keys) {
  if (!keys.length) {
    container.innerHTML = '<div class="no-results">No SSH keys found yet. Click Generate SSH key to create one, or add an account with an existing key path.</div>';
    return;
  }
  container.innerHTML = keys.map((key, index) => {
    const profiles = state.profiles.filter(p => p.key === key.path);
    const active = profiles.find(p => p.active);
    const shortPath = key.path.startsWith(state.home + '/') ? '~/' + key.path.slice(state.home.length + 1) : key.path;
    const select = profiles.length > 1 ? `<select class="key-account-select" aria-label="Account for ${esc(key.filename)}">${profiles.map(p => `<option value="${esc(p.id)}" ${p.active ? 'selected' : ''}>${esc(p.label)}</option>`).join('')}</select>` : '';
    return `<div class="key-row" data-key-index="${index}"><div class="key-row-icon">${icon('key')}</div><div class="key-row-body"><div class="key-row-title">${esc(key.filename)}${key.algorithm ? `<span class="key-algo">${esc(key.algorithm)}</span>` : ''}</div><small>${esc(shortPath)}</small>${view === 'keys' && key.fingerprint ? `<small>${esc(key.fingerprint)}</small>` : ''}${key.error ? `<small class="key-warning">${esc(key.error)}</small>` : ''}</div><div class="key-actions">${key.public_key ? `<button class="text-button" data-action="show-key" data-key="${esc(key.path)}">View public key</button><button class="icon-button" data-action="copy-key" data-key="${esc(key.path)}" title="Copy public key" aria-label="Copy public key for ${esc(key.filename)}">${icon('copy')}</button>` : ''}${select}${profiles.length ? `<button class="button secondary" data-action="activate-key" data-id="${esc((active || profiles[0]).id)}" ${pending || !key.available ? 'disabled' : ''}>${icon(active ? 'check' : 'git')}${active ? 'Active' : 'Activate'}${profiles.length === 1 ? ` · ${esc(profiles[0].label)}` : ''}</button>` : `<button class="button secondary" data-action="add-key" data-key="${esc(key.path)}" ${!key.available ? 'disabled' : ''}>${icon('plus')}Link account</button>`}</div></div>`;
  }).join('');
}

function changeView(next) {
  view = next;
  document.querySelectorAll('[data-view]').forEach(button => {
    button.classList.toggle('selected', button.dataset.view === next);
    if (button.dataset.view === next) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  for (const name of ['accounts', 'repos', 'keys', 'backups', 'guide']) $(`#${name}-view`).hidden = next !== name;
  const copy = {
    accounts: ['Accounts', 'The right identity.<br>Every time.', 'All your GitHub accounts, one place. Switch and get back to building.'],
    repos: ['Repositories', 'Lock your identities.<br>Repository by repository.', 'Pin accounts directly to local repositories so global switches never affect them.'],
    keys: ['SSH keys', 'Your keys.<br>Your machine.', 'See your local SSH keys and the accounts they belong to.'],
    backups: ['Switch history', 'Snapshots.<br>One-click rollback.', 'Inspect past configuration states and restore them safely in one click.'],
    guide: ['How it works', 'A smoother way<br>to switch.', 'A few things to know about your keys, accounts, and Git identity.'],
  }[next];
  $('#breadcrumb').textContent = copy[0];
  $('#page-title').innerHTML = copy[1];
  $('#page-description').textContent = copy[2];
  if (state && next === 'keys') renderKeys($('#key-list'), state.keys);
  if (next === 'repos') fetchRepos();
  if (next === 'backups') fetchBackups();
}

function openAccount(profile = null, keyPath = null) {
  if (!state) return toast('Waiting for the local app. Try refreshing.', true);
  $('#account-form').reset();
  $('#profile-id').value = profile?.id || '';
  $('#dialog-title').textContent = profile ? 'Edit account' : 'Add an account';
  $('#profile-label').value = profile?.label || '';
  $('#profile-name').value = profile?.name || (!state.profiles.length ? state.git['user.name'] || '' : '');
  $('#profile-email').value = profile?.email || (!state.profiles.length ? state.git['user.email'] || '' : '');
  $('#profile-signing').checked = profile?.signing ?? true;
  $('#form-error').hidden = true;
  $('#profile-key').innerHTML = state.keys.map(k => `<option value="${esc(k.path)}">${esc(k.filename)}${!k.available ? ' (unavailable)' : ''}</option>`).join('') + '<option value="custom">Use a different key path…</option>';
  if (profile || keyPath) $('#profile-key').value = profile?.key || keyPath;
  $('#custom-key-label').hidden = $('#profile-key').value !== 'custom';
  $('#custom-key').required = !$('#custom-key-label').hidden;
  $('#account-dialog').showModal();
  $('#profile-label').focus();
}

function openGenerate(forAccount = false) {
  if (pending) return;
  if (!state) return toast('Waiting for the local app. Try refreshing.', true);
  $('#generate-form').reset();
  $('#generate-error').hidden = true;
  const label = forAccount ? $('#profile-label').value : '';
  const suffix = label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 50) || 'account';
  let name = `id_github_${suffix}`;
  let n = 2;
  while (state.keys.some(k => k.filename === name)) name = `id_github_${suffix}_${n++}`;
  $('#generate-filename').value = name;
  $('#generate-email').value = forAccount ? $('#profile-email').value : '';
  $('#generate-dialog').showModal();
  $('#generate-filename').focus();
}

function showPublicKey(key, generated = false) {
  if (!key?.public_key) return toast('No public key is available for this key file.', true);
  displayedKey = key;
  $('#public-key-title').textContent = generated ? 'Your new key is ready' : 'Add your public key';
  $('#public-key-description').textContent = generated
    ? `${key.filename} was created${key.encrypted ? ' with passphrase protection' : ''}. Add the public key below to your GitHub account.`
    : `Copy the public key for ${key.filename} to add it to GitHub.`;
  $('#public-key-text').value = key.public_key;
  $('#public-key-path').textContent = `${key.path}.pub`;
  $('#public-key-fingerprint').textContent = key.fingerprint || '';
  $('#public-key-copy-status').textContent = '';
  $('#link-public-key').textContent = $('#account-dialog').open ? 'Use for this account' : 'Link an account';
  $('#public-key-dialog').showModal();
}

function shellQuote(value) {
  return `'${String(value).replaceAll("'", "'\\''")}'`;
}

function keyDisplayPath(profile) {
  if (!profile || !state) return '~/.ssh/your_key';
  const prefix = `${state.home}/`;
  const relative = profile.key.startsWith(prefix) ? profile.key.slice(prefix.length) : '';
  // Keep tilde expansion usable when Git later executes the stored command.
  // Paths with shell punctuation stay absolute so quoting cannot hide the ~.
  return relative && /^[A-Za-z0-9._/-]+$/.test(relative) ? `~/${relative}` : profile.key;
}

function validOriginPart(value) {
  return /^[A-Za-z0-9][A-Za-z0-9_.-]*$/.test(value);
}

function updateOriginPreview() {
  if (!state) return;
  const profile = state.profiles.find(p => p.id === $('#origin-account').value) || state.profiles.find(p => p.id === originProfileId) || state.profiles[0];
  if (!profile) return;
  originProfileId = profile.id;
  const owner = $('#origin-owner').value.trim();
  const repository = $('#origin-repository').value.trim().replace(/\.git$/i, '');
  const workflow = $('#origin-workflow').value;
  const ownerPart = owner || 'OWNER';
  const repositoryPart = repository || 'REPOSITORY';
  const origin = `git@${profile.host || 'github-account'}:${ownerPart}/${repositoryPart}.git`;
  const ssh = `ssh -i ${shellQuote(keyDisplayPath(profile))} -o IdentitiesOnly=yes`;
  let localConfig = `git config --local user.name ${shellQuote(profile.name)}\ngit config --local user.email ${shellQuote(profile.email)}\ngit config --local core.sshCommand ${shellQuote(ssh)}`;
  if (profile.signing) {
    localConfig += `\ngit config --local gpg.format ssh\ngit config --local user.signingkey ${shellQuote(keyDisplayPath(profile) + '.pub')}\ngit config --local commit.gpgsign true`;
  }
  const setup = workflow === 'clone'
    ? `git clone ${origin}\ncd ${shellQuote(repositoryPart)}\n${localConfig}`
    : `git init\n${localConfig}\ngit remote add origin ${origin}`;
  const valid = validOriginPart(owner) && validOriginPart(repository);
  $('#origin-account-chip').textContent = profile.host || profile.label;
  $('#origin-url').textContent = origin;
  $('#origin-setup').textContent = setup;
  $('#origin-setup-label').textContent = workflow === 'clone' ? 'PASTE TO CLONE WITH THIS ACCOUNT' : 'PASTE DURING INIT / SETUP';
  $('#copy-origin-setup-label').textContent = workflow === 'clone' ? 'Copy clone setup' : 'Copy full setup';
  $('#origin-copy-status').textContent = '';
  $('#origin-setup-status').textContent = '';
  $('#copy-origin').disabled = !valid;
  $('#copy-origin-setup').disabled = !valid;
  $('#origin-account').title = profile.key;
}

function openOrigin(profileId = null) {
  if (!state?.profiles.length) return toast('Save an account first, then its SSH origin will appear here.', true);
  originProfileId = profileId || state.profiles[0].id;
  $('#origin-account').innerHTML = state.profiles.map(profile => `<option value="${esc(profile.id)}">${esc(profile.label)} · ${esc(filename(profile.key))}</option>`).join('');
  $('#origin-account').value = originProfileId;
  $('#origin-owner').value = '';
  $('#origin-repository').value = '';
  $('#origin-workflow').value = 'init';
  updateOriginPreview();
  $('#origin-dialog').showModal();
  $('#origin-owner').focus();
}

async function copyText(value, statusElement, success = 'Copied!') {
  try {
    await navigator.clipboard.writeText(value);
    $(statusElement).textContent = success;
  } catch {
    toast('Clipboard access was unavailable. Select the text and copy it manually.', true);
  }
}

$('#generate-key').addEventListener('click', () => openGenerate());
$('#generate-for-account').addEventListener('click', () => openGenerate(true));
for (const id of ['close-generate', 'cancel-generate']) {
  $(`#${id}`).addEventListener('click', () => { if (!pending) $('#generate-dialog').close(); });
}
$('#generate-dialog').addEventListener('cancel', event => { if (pending) event.preventDefault(); });
$('#generate-dialog').addEventListener('close', () => {
  $('#generate-passphrase').value = '';
  $('#generate-confirm').value = '';
});
$('#generate-form').addEventListener('submit', async event => {
  event.preventDefault();
  if (pending) return;
  $('#generate-error').hidden = true;
  if ($('#generate-passphrase').value !== $('#generate-confirm').value) {
    $('#generate-error').textContent = 'The passphrases do not match.';
    $('#generate-error').hidden = false;
    return;
  }
  pending = true;
  for (const id of ['submit-generate', 'cancel-generate', 'close-generate']) $(`#${id}`).disabled = true;
  $('#submit-generate').textContent = 'Generating…';
  try {
    generationEmail = $('#generate-email').value.trim();
    const request = api('/api/keys/generate', {
      filename: $('#generate-filename').value.trim(), email: generationEmail,
      passphrase: $('#generate-passphrase').value,
    });
    $('#generate-passphrase').value = '';
    $('#generate-confirm').value = '';
    const key = await request;
    // Keep the created key usable even if the subsequent status refresh fails.
    state.keys = [...state.keys.filter(k => k.path !== key.path), key];
    await refresh();
    if ($('#account-dialog').open) {
      const option = new Option(key.filename, key.path);
      $('#profile-key').add(option, $('#profile-key').options.length - 1);
      $('#profile-key').value = key.path;
      $('#custom-key-label').hidden = true;
      $('#custom-key').required = false;
    }
    $('#generate-dialog').close();
    showPublicKey(key, true);
  } catch (error) {
    $('#generate-error').textContent = error.message;
    $('#generate-error').hidden = false;
  } finally {
    pending = false;
    for (const id of ['submit-generate', 'cancel-generate', 'close-generate']) $(`#${id}`).disabled = false;
    $('#submit-generate').innerHTML = `${icon('key')}Generate key`;
    if (state) render();
  }
});
for (const id of ['close-public-key', 'done-public-key']) {
  $(`#${id}`).addEventListener('click', () => $('#public-key-dialog').close());
}
$('#copy-public-key').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText($('#public-key-text').value);
    $('#public-key-copy-status').textContent = 'Copied!';
  } catch {
    $('#public-key-text').focus();
    $('#public-key-text').select();
    $('#public-key-copy-status').textContent = 'Press Ctrl+C (⌘C on Mac) to copy the selected key.';
  }
});
$('#link-public-key').addEventListener('click', () => {
  const key = displayedKey;
  $('#public-key-dialog').close();
  if ($('#account-dialog').open) {
    $('#profile-key').value = key.path;
    $('#custom-key-label').hidden = true;
    $('#custom-key').required = false;
  } else {
    openAccount(null, key.path);
    if (key.encrypted !== undefined) $('#profile-email').value = generationEmail;
  }
});

async function activate(id) {
  if (pending) return;
  const profile = state.profiles.find(p => p.id === id);
  if (profile?.active) return toast(`${profile.label} already matches your global Git settings.`);
  pending = true;
  render();
  try {
    const result = await api('/api/profiles/activate', {id});
    await refresh();
    toast(`${result.label} is active. Git name, email, and SSH key updated.`);
  } catch (error) { toast(error.message, true); }
  finally { pending = false; if (state) render(); }
}

async function verifyAccount(id) {
  if (verifyingId) return;
  const profile = state.profiles.find(p => p.id === id);
  if (!profile) return;
  verifyingId = id;
  renderAccounts();
  try {
    const result = await api('/api/profiles/verify', {id});
    verifiedAccounts.set(id, result);
    toast(`${profile.label} authenticated to GitHub as @${result.username}.`);
  } catch (error) {
    verifiedAccounts.delete(id);
    toast(error.message, true);
  } finally {
    verifyingId = null;
    if (state) renderAccounts();
  }
}

function renderRepos() {
  const query = $('#search-repos')?.value?.toLowerCase().trim() || '';
  const filtered = repos.filter(r => [r.name, r.short_path, r.branch, r.origin || '', r.local_name || '', r.local_email || ''].some(v => v.toLowerCase().includes(query)));
  $('#repo-count').textContent = repos.length;
  $('#repos-total').textContent = repos.length;
  const container = $('#repos-grid');
  if (!container) return;
  if (!filtered.length) {
    container.innerHTML = `<div class="no-results">${query ? 'No repositories match your search.' : 'No local Git repositories found in common project folders. Use the scan bar above to scan a custom path.'}</div>`;
    return;
  }
  container.innerHTML = filtered.map(r => {
    const isPinned = r.is_pinned;
    const active = state?.profiles?.find(p => p.active);
    const matchedProfile = state?.profiles?.find(p => p.id === r.matched_profile_id);
    const idTitle = isPinned
      ? `Pinned to ${esc(matchedProfile?.label || r.local_name)}`
      : (active ? `Inherits global (${esc(active.label)})` : 'Inherits global (unlinked)');
    const idDetail = isPinned
      ? `${esc(r.local_name)} &lt;${esc(r.local_email)}&gt;`
      : `${esc(state?.git['user.name'] || 'Not set')} &lt;${esc(state?.git['user.email'] || 'Not set')}&gt;`;
    return `<article class="repo-card">
      <div>
        <div class="repo-head">
          <div class="repo-name">${esc(r.name)}</div>
          <span class="repo-branch">${esc(r.branch)}</span>
        </div>
        <div class="repo-path" title="${esc(r.path)}">${esc(r.short_path)}</div>
        ${r.origin ? `<div class="repo-origin" title="${esc(r.origin)}">${icon('link')} ${esc(r.origin)}</div>` : ''}
        <div class="repo-identity">
          <strong>${icon('user')} ${idTitle}</strong>
          <span>${idDetail}</span>
        </div>
        <div style="display:flex;gap:6px;align-items:center;margin-bottom:14px;">
          <span class="repo-status-chip ${isPinned ? 'pinned' : 'global'}">${isPinned ? 'PINNED' : 'INHERITS GLOBAL'}</span>
          ${r.signing ? `<span class="signing-tag">${icon('shield')}SSH Signed</span>` : ''}
        </div>
      </div>
      <div class="repo-actions">
        <button class="button secondary" data-action="open-pin" data-path="${esc(r.path)}">${icon('link')}Pin account</button>
        ${isPinned ? `<button class="button secondary" data-action="unpin" data-path="${esc(r.path)}">Unpin</button>` : ''}
      </div>
    </article>`;
  }).join('');
}

function renderBackups() {
  $('#backup-count').textContent = backups.length;
  $('#backups-total').textContent = backups.length;
  const container = $('#backups-list');
  if (!container) return;
  if (!backups.length) {
    container.innerHTML = '<div class="no-results">No configuration snapshots found yet. Snapshots are created automatically before every switch.</div>';
    return;
  }
  container.innerHTML = backups.map(b => {
    const isGit = b.type === 'git';
    const dateStr = new Date(b.timestamp * 1000).toLocaleString();
    return `<div class="backup-row">
      <div class="backup-meta">
        <div class="backup-title">
          <span>${esc(b.id)}</span>
          <span class="backup-type-badge ${isGit ? 'git' : 'ssh'}">${isGit ? 'GIT CONFIG' : 'SSH CONFIG'}</span>
        </div>
        <span class="backup-date">${dateStr} · ${(b.size / 1024).toFixed(1)} KB</span>
        ${b.preview ? `<div class="backup-preview">${esc(b.preview.replace(/\n+/g, ' '))}</div>` : ''}
      </div>
      <button class="button secondary" data-action="open-restore" data-id="${esc(b.id)}">${icon('refresh')}Restore</button>
    </div>`;
  }).join('');
}

async function fetchRepos(customPath = null) {
  try {
    if (customPath) {
      repos = await api('/api/repos/scan', {path: customPath});
      toast(`Found ${repos.length} repositories.`);
    } else {
      const response = await fetch('/api/repos');
      if (response.ok) repos = await response.json();
    }
    renderRepos();
  } catch (error) {
    toast(error.message, true);
  }
}

async function fetchBackups() {
  try {
    const response = await fetch('/api/backups');
    if (response.ok) backups = await response.json();
    renderBackups();
  } catch (error) {
    toast(error.message, true);
  }
}

function openPinDialog(path) {
  if (!state?.profiles.length) return toast('Save an account first before pinning it to a repository.', true);
  pinRepoPath = path;
  $('#pin-repo-path').value = path;
  $('#pin-description').textContent = `Lock a Git identity into ${filename(path)}'s local .git/config.`;
  $('#pin-account-select').innerHTML = state.profiles.map(p => `<option value="${esc(p.id)}">${esc(p.label)} (${esc(p.name)} &lt;${esc(p.email)}&gt;)</option>`).join('');
  $('#pin-signing').checked = true;
  $('#pin-dialog').showModal();
}

function openRestoreDialog(id) {
  restoreBackupId = id;
  $('#restore-description').textContent = `Restore configuration from ${id}?`;
  $('#restore-dialog').showModal();
}

document.addEventListener('click', async event => {
  const button = event.target.closest('[data-action]');
  if (!button || button.disabled) return;
  const {action, id, key, path} = button.dataset;
  if (action === 'add') openAccount();
  if (action === 'add-key') openAccount(null, key);
  if (action === 'edit') openAccount(state.profiles.find(p => p.id === id));
  if (action === 'origin') openOrigin(id);
  if (action === 'verify') await verifyAccount(id);
  if (action === 'activate') await activate(id);
  if (action === 'activate-key') await activate(button.closest('.key-row').querySelector('select')?.value || id);
  if (action === 'delete') {
    deleteId = id;
    $('#delete-description').textContent = `Remove “${state.profiles.find(p => p.id === id).label}” from your saved accounts?`;
    $('#delete-dialog').showModal();
  }
  if (action === 'show-key') showPublicKey(state.keys.find(k => k.path === key));
  if (action === 'copy-key') {
    try { await navigator.clipboard.writeText(state.keys.find(k => k.path === key).public_key); toast('Public key copied. Add it to the matching GitHub account.'); }
    catch { toast('The browser could not copy the public key. Check clipboard permission.', true); }
  }
  if (action === 'open-pin') openPinDialog(path);
  if (action === 'unpin') {
    try {
      await api('/api/repos/unpin', {path});
      await fetchRepos();
      toast('Unpinned repository. It now inherits your global Git identity.');
    } catch (error) { toast(error.message, true); }
  }
  if (action === 'open-restore') openRestoreDialog(id);
});
document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => changeView(button.dataset.view)));
$('#learn-more').addEventListener('click', () => changeView('guide'));
$('#view-keys').addEventListener('click', () => changeView('keys'));
$('#add-account').addEventListener('click', () => openAccount());
$('#search').addEventListener('input', () => { if (state) renderAccounts(); });
$('#refresh').addEventListener('click', () => refresh(true));
$('#scan-keys').addEventListener('click', () => refresh(true));
$('#scan-repos')?.addEventListener('click', () => fetchRepos());
$('#scan-custom-path')?.addEventListener('click', () => {
  const p = $('#custom-repo-path').value.trim();
  if (p) fetchRepos(p);
});
$('#search-repos')?.addEventListener('input', () => renderRepos());
$('#refresh-backups')?.addEventListener('click', () => fetchBackups());
for (const id of ['close-pin', 'cancel-pin']) $(`#${id}`)?.addEventListener('click', () => $('#pin-dialog').close());
$('#cancel-restore')?.addEventListener('click', () => $('#restore-dialog').close());
$('#confirm-restore')?.addEventListener('click', async () => {
  if (!restoreBackupId) return;
  try {
    await api('/api/backups/restore', {id: restoreBackupId});
    $('#restore-dialog').close();
    await refresh();
    await fetchBackups();
    toast(`Restored configuration snapshot ${restoreBackupId}.`);
  } catch (error) { toast(error.message, true); }
});
$('#pin-form')?.addEventListener('submit', async event => {
  event.preventDefault();
  const repoPath = $('#pin-repo-path').value;
  const profileId = $('#pin-account-select').value;
  const signing = $('#pin-signing').checked;
  try {
    await api('/api/repos/pin', {path: repoPath, profile_id: profileId, signing});
    $('#pin-dialog').close();
    await fetchRepos();
    toast('Pinned account to repository successfully.');
  } catch (error) { toast(error.message, true); }
});
$('#origin-account').addEventListener('change', updateOriginPreview);
$('#origin-workflow').addEventListener('change', updateOriginPreview);
$('#origin-owner').addEventListener('input', updateOriginPreview);
$('#origin-repository').addEventListener('input', updateOriginPreview);
$('#origin-form').addEventListener('submit', event => event.preventDefault());
for (const id of ['close-origin', 'done-origin']) $(`#${id}`).addEventListener('click', () => $('#origin-dialog').close());
$('#copy-origin').addEventListener('click', () => copyText($('#origin-url').textContent, '#origin-copy-status', 'Origin copied!'));
$('#copy-origin-setup').addEventListener('click', () => copyText($('#origin-setup').textContent, '#origin-setup-status', 'Full setup copied!'));
for (const id of ['close-dialog', 'cancel-dialog']) $(`#${id}`).addEventListener('click', () => $('#account-dialog').close());
$('#cancel-delete').addEventListener('click', () => $('#delete-dialog').close());
$('#profile-key').addEventListener('change', () => {
  $('#custom-key-label').hidden = $('#profile-key').value !== 'custom';
  $('#custom-key').required = !$('#custom-key-label').hidden;
});
$('#account-form').addEventListener('submit', async event => {
  event.preventDefault();
  if (pending) return;
  pending = true;
  $('#save-profile').disabled = true;
  $('#form-error').hidden = true;
  const editing = !!$('#profile-id').value;
  try {
    await api('/api/profiles/save', {
      id: $('#profile-id').value || undefined,
      label: $('#profile-label').value, name: $('#profile-name').value,
      email: $('#profile-email').value,
      key: $('#profile-key').value === 'custom' ? $('#custom-key').value : $('#profile-key').value,
      signing: $('#profile-signing').checked,
    });
    if ($('#profile-id').value) verifiedAccounts.delete($('#profile-id').value);
    $('#account-dialog').close();
    await refresh();
    toast(editing ? 'Account updated. Activate it to apply the saved changes.' : 'Account saved. Activate it whenever you’re ready.');
  } catch (error) { $('#form-error').textContent = error.message; $('#form-error').hidden = false; }
  finally { pending = false; $('#save-profile').disabled = false; if (state) render(); }
});
$('#confirm-delete').addEventListener('click', async () => {
  if (pending) return;
  pending = true;
  $('#confirm-delete').disabled = true;
  try {
    await api('/api/profiles/delete', {id: deleteId});
    verifiedAccounts.delete(deleteId);
    $('#delete-dialog').close();
    await refresh();
    toast('Account removed. Your key and Git configuration are unchanged.');
  } catch (error) { toast(error.message, true); }
  finally { pending = false; $('#confirm-delete').disabled = false; if (state) render(); }
});
document.addEventListener('keydown', event => {
  if (event.key === '/' && view === 'accounts' && !document.querySelector('dialog[open]') && !/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) {
    event.preventDefault(); $('#search').focus();
  }
});
refresh();
setInterval(() => { if (!pending && !document.hidden && !document.querySelector('dialog[open]')) refresh(); }, 15000);
document.addEventListener('visibilitychange', () => { if (!document.hidden && !pending) refresh(); });
