const WORKER_KEY = 'apkwatch_worker';
const ARCH_KEY   = 'apkwatch_arch';
const INST_KEY   = 'apkwatch_installed';
const THEME_KEY  = 'apkwatch_theme';

let workerUrl = localStorage.getItem(WORKER_KEY) || 'https://apk-watch.shariqahmad129.workers.dev';
let arch      = localStorage.getItem(ARCH_KEY)   || 'arm64-v8a';
let installed = JSON.parse(localStorage.getItem(INST_KEY) || '{}');
let theme     = localStorage.getItem(THEME_KEY)  || 'dark';
let allApps   = [];

document.documentElement.setAttribute('data-theme', theme);
document.getElementById('themeBtn').textContent = theme === 'dark' ? '🌙' : '☀️';

// ─── API ──────────────────────────────────────────────────────────────────────
async function api(path, opts = {}) {
  const res  = await fetch(workerUrl + path, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// ─── Version compare (strips leading 'v' before comparing) ───────────────────
function stripV(v) {
  return String(v || '').trim().replace(/^v/i, '');
}

function versionsMatch(a, b) {
  return stripV(a) === stripV(b);
}

function hasUpdate(app) {
  const inst = installed[app.id];
  return inst && app.latest && !versionsMatch(inst, app.latest.version);
}

// ─── APK picker ───────────────────────────────────────────────────────────────
const ARCH_KW = {
  'arm64-v8a':   ['arm64', 'aarch64'],
  'armeabi-v7a': ['armeabi', 'arm-v7', 'armv7'],
  'x86_64':      ['x86_64', 'x64'],
  'x86':         ['x86'],
  'universal':   ['universal', '-all'],
};

function pickApk(apks) {
  if (!apks || !apks.length) return null;
  if (apks.length === 1) return apks[0];
  const kws = ARCH_KW[arch] || [];
  const hit = apks.find(a => kws.some(k => a.name.toLowerCase().includes(k)));
  if (hit) return hit;
  return apks.find(a => ['universal','all'].some(k => a.name.toLowerCase().includes(k))) || apks[0];
}

function fmtBytes(b) {
  if (!b) return '';
  return b > 1e6 ? (b / 1e6).toFixed(1) + ' MB' : (b / 1e3).toFixed(0) + ' KB';
}

function timeAgo(s) {
  if (!s) return '';
  const d = (Date.now() - new Date(s)) / 1000;
  if (d < 60)      return 'just now';
  if (d < 3600)    return Math.floor(d / 60) + 'm ago';
  if (d < 86400)   return Math.floor(d / 3600) + 'h ago';
  if (d < 2592000) return Math.floor(d / 86400) + 'd ago';
  return new Date(s).toLocaleDateString('en', { month: 'short', day: 'numeric' });
}

function esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─── Render card ──────────────────────────────────────────────────────────────
function renderCard(app) {
  if (app.error) return `
    <div class="app-card">
      <div class="card-top">
        <div class="app-icon">❌</div>
        <div class="app-info">
          <div class="app-name">${esc(app.name)}</div>
          <div class="app-repo">${esc(app.owner)}/${esc(app.repo)}</div>
        </div>
      </div>
      <div style="font-size:12px;color:var(--red)">${esc(app.error)}</div>
    </div>`;

  const lat   = app.latest;
  const apks  = lat?.apks || [];
  const best  = pickApk(apks);
  const instV = installed[app.id] || '';
  const upd   = hasUpdate(app);
  const icon  = app.meta?.iconUrl
    ? `<img src="${esc(app.meta.iconUrl)}" alt="" onerror="this.style.display='none';this.parentNode.textContent='📦'"/>`
    : '📦';

  const opts = apks.map(a =>
    `<option value="${esc(a.downloadUrl)}" ${best?.name === a.name ? 'selected' : ''}>${esc(a.name)}${a.size ? ' (' + fmtBytes(a.size) + ')' : ''}</option>`
  ).join('');

  const dlSection = apks.length
    ? `<div class="apk-row">
        <select class="apk-select" id="sel-${esc(app.id)}">${opts}</select>
        <a class="dl-btn" id="dl-${esc(app.id)}" href="${esc(best?.downloadUrl || '#')}" target="_blank" download>↓ APK</a>
       </div>`
    : `<div class="no-apk">No APK attached — <a href="${esc(lat?.releaseUrl || app.url)}" target="_blank">view release ↗</a></div>`;

  return `
  <div class="app-card${upd ? ' has-update' : ''}" data-id="${esc(app.id)}">
    <div class="card-top">
      <div class="app-icon">${icon}</div>
      <div class="app-info">
        <div class="app-name">${esc(app.name)}</div>
        <div class="app-repo">${esc(app.owner)}/${esc(app.repo)}</div>
      </div>
      <div class="card-actions">
        <button class="card-icon-btn" onclick="openChangelog('${esc(app.id)}')" title="Changelog">📋</button>
        <button class="card-icon-btn" id="rbtn-${esc(app.id)}" onclick="refreshOne('${esc(app.id)}')" title="Refresh">↻</button>
        <button class="card-icon-btn danger" onclick="deleteApp('${esc(app.id)}')" title="Remove">🗑</button>
      </div>
    </div>

    <div class="version-row">
      <div class="version-badges">
        <span class="badge badge-latest">${esc(lat?.version || 'unknown')}</span>
        ${upd ? '<span class="badge badge-update">update!</span>' : ''}
        ${instV && !upd ? '<span class="badge badge-installed">✓ installed</span>' : ''}
        ${lat?.prerelease ? '<span class="badge badge-prerelease">pre</span>' : ''}
        <span class="badge badge-source">${esc(app.source)}</span>
      </div>
      <span class="version-date">${timeAgo(lat?.publishedAt)}</span>
    </div>

    <div class="changelog-preview">${esc((lat?.changelog || 'No changelog.').slice(0, 130).replace(/[#*`]/g, ''))}${(lat?.changelog || '').length > 130 ? '…' : ''}</div>

    <div class="installed-row">
      <span class="installed-label">Installed version</span>
      <input class="installed-input" id="inst-${esc(app.id)}" value="${esc(instV)}" placeholder="none"/>
      <button class="mark-btn" onclick="markInstalled('${esc(app.id)}')">Save</button>
    </div>

    <div class="download-section">${dlSection}</div>
  </div>`;
}

// sync select → download link
document.addEventListener('change', e => {
  if (!e.target.classList.contains('apk-select')) return;
  const id = e.target.id.replace('sel-', '');
  const dl = document.getElementById('dl-' + id);
  if (dl) dl.href = e.target.value;
});

// ─── Mark installed ───────────────────────────────────────────────────────────
function markInstalled(id) {
  const v = document.getElementById('inst-' + id)?.value?.trim();
  if (v) installed[id] = v; else delete installed[id];
  localStorage.setItem(INST_KEY, JSON.stringify(installed));
  renderApps(allApps);
  toast('Saved!', 'success');
}

// ─── Load & render ────────────────────────────────────────────────────────────
async function loadApps() {
  try {
    allApps = await api('/apps');
    renderApps(allApps);
  } catch (e) {
    document.getElementById('appGrid').innerHTML =
      `<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-title">Can't reach worker</div><div class="empty-sub">${esc(e.message)}<br/>Check API URL in settings.</div></div>`;
  }
}

function renderApps(apps) {
  const q        = document.getElementById('searchInput').value.toLowerCase();
  const filtered = q ? apps.filter(a =>
    a.name.toLowerCase().includes(q) ||
    (a.owner + '/' + a.repo).toLowerCase().includes(q)
  ) : apps;

  document.getElementById('cTotal').textContent    = apps.length;
  document.getElementById('cUpdates').textContent  = apps.filter(hasUpdate).length;
  document.getElementById('cUpToDate').textContent = apps.filter(a => installed[a.id] && !hasUpdate(a)).length;
  document.getElementById('sectionTitle').textContent = q
    ? `${filtered.length} result${filtered.length !== 1 ? 's' : ''}`
    : 'All apps';

  const grid = document.getElementById('appGrid');
  if (!filtered.length) {
    grid.innerHTML = !apps.length
      ? `<div class="empty-state"><div class="empty-icon">📭</div><div class="empty-title">No apps tracked yet</div><div class="empty-sub">Hit "Add app" to start tracking.</div></div>`
      : `<div class="empty-state"><div class="empty-icon">🔍</div><div class="empty-title">No results for "${esc(q)}"</div></div>`;
    return;
  }
  grid.innerHTML = filtered.map(renderCard).join('');
}

// ─── Search ───────────────────────────────────────────────────────────────────
document.getElementById('searchInput').addEventListener('input', () => renderApps(allApps));

// ─── Add app ──────────────────────────────────────────────────────────────────
document.getElementById('addBtn').onclick   = () => openModal('addModal');
document.getElementById('closeAdd').onclick = () => closeModal('addModal');

document.getElementById('addSubmit').onclick = async () => {
  const url   = document.getElementById('addUrl').value.trim();
  const name  = document.getElementById('addName').value.trim();
  const errEl = document.getElementById('addError');
  const btn   = document.getElementById('addSubmit');
  errEl.style.display = 'none';
  if (!url) { errEl.textContent = 'URL is required'; errEl.style.display = 'block'; return; }
  btn.disabled = true; btn.textContent = 'Adding…';
  try {
    const app = await api('/apps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, name }),
    });
    allApps.push(app);
    renderApps(allApps);
    closeModal('addModal');
    document.getElementById('addUrl').value  = '';
    document.getElementById('addName').value = '';
    toast('App added!', 'success');
  } catch (e) {
    errEl.textContent = e.message; errEl.style.display = 'block';
  } finally {
    btn.disabled = false; btn.textContent = 'Add app';
  }
};

// ─── Delete ───────────────────────────────────────────────────────────────────
async function deleteApp(id) {
  if (!confirm('Remove this app from tracking?')) return;
  try {
    await api('/apps/' + encodeURIComponent(id), { method: 'DELETE' });
    allApps = allApps.filter(a => a.id !== id);
    renderApps(allApps);
    toast('Removed', 'info');
  } catch (e) { toast(e.message, 'error'); }
}

// ─── Refresh one ──────────────────────────────────────────────────────────────
async function refreshOne(id) {
  const btn = document.getElementById('rbtn-' + id);
  if (btn) btn.classList.add('spinning');
  try {
    const fresh = await api('/apps/' + encodeURIComponent(id) + '/refresh', { method: 'POST' });
    allApps = allApps.map(a => a.id === id ? fresh : a);
    renderApps(allApps);
    toast('Refreshed!', 'success');
  } catch (e) { toast(e.message, 'error'); }
  finally { if (btn) btn.classList.remove('spinning'); }
}

// ─── Refresh all ──────────────────────────────────────────────────────────────
document.getElementById('refreshAllBtn').onclick = async () => {
  const icon = document.getElementById('refreshIcon');
  icon.classList.add('spinning');
  try {
    await Promise.all(allApps.map(a =>
      api('/apps/' + encodeURIComponent(a.id) + '/refresh', { method: 'POST' })
    ));
    await loadApps();
    toast('All refreshed!', 'success');
  } catch (e) { toast(e.message, 'error'); }
  finally { icon.classList.remove('spinning'); }
};

// ─── Changelog ────────────────────────────────────────────────────────────────
async function openChangelog(id) {
  const app = allApps.find(a => a.id === id);
  document.getElementById('changelogTitle').textContent = (app?.name || id) + ' — releases';
  document.getElementById('changelogBody').innerHTML = '<div style="color:var(--text3);font-size:13px">Loading…</div>';
  openModal('changelogModal');
  try {
    const releases = await api('/apps/' + encodeURIComponent(id));
    document.getElementById('changelogBody').innerHTML = releases.map((r, i) => `
      <div class="release-item">
        <div class="release-ver">
          ${esc(r.version)}
          ${r.prerelease ? '<span class="badge badge-prerelease">pre</span>' : ''}
          <span class="release-date">${timeAgo(r.publishedAt)}</span>
          ${r.releaseUrl ? `<a class="release-link" href="${esc(r.releaseUrl)}" target="_blank">↗ view</a>` : ''}
        </div>
        <div class="release-body">${esc((r.changelog || 'No notes.').slice(0, 800))}</div>
      </div>
      ${i < releases.length - 1 ? '<hr class="release-hr"/>' : ''}
    `).join('');
  } catch (e) {
    document.getElementById('changelogBody').innerHTML =
      `<div style="color:var(--red);font-size:13px">${esc(e.message)}</div>`;
  }
}
document.getElementById('closeChangelog').onclick = () => closeModal('changelogModal');

// ─── Settings ─────────────────────────────────────────────────────────────────
document.getElementById('settingsBtn').onclick = () => {
  document.getElementById('archSelect').value  = arch;
  document.getElementById('apiUrlInput').value = workerUrl;
  openModal('settingsModal');
};
document.getElementById('closeSettings').onclick = () => closeModal('settingsModal');
document.getElementById('saveSettings').onclick  = () => {
  arch      = document.getElementById('archSelect').value;
  workerUrl = document.getElementById('apiUrlInput').value.trim() || workerUrl;
  localStorage.setItem(ARCH_KEY,   arch);
  localStorage.setItem(WORKER_KEY, workerUrl);
  closeModal('settingsModal');
  renderApps(allApps);
  toast('Settings saved', 'success');
};

// ─── Theme ────────────────────────────────────────────────────────────────────
document.getElementById('themeBtn').onclick = () => {
  theme = theme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', theme);
  document.getElementById('themeBtn').textContent = theme === 'dark' ? '🌙' : '☀️';
  localStorage.setItem(THEME_KEY, theme);
};

// ─── Modal helpers ────────────────────────────────────────────────────────────
function openModal(id)  { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
document.querySelectorAll('.modal-overlay').forEach(el =>
  el.addEventListener('click', e => { if (e.target === el) closeModal(el.id); })
);
document.addEventListener('keydown', e => {
  if (e.key === 'Escape')
    document.querySelectorAll('.modal-overlay.open').forEach(el => closeModal(el.id));
});

// ─── Toast ────────────────────────────────────────────────────────────────────
function toast(msg, type = 'info') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  document.getElementById('toastWrap').appendChild(el);
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('show')));
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, 2500);
}

// ─── Boot ─────────────────────────────────────────────────────────────────────
loadApps();
