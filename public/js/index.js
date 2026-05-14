// index.js — homepage logic
let lostPage = 1, foundPage = 1;

// ── Stats ──────────────────────────────────────────────────────────
async function loadStats() {
  const d = await api.get('/api/stats');
  if (d.success) {
    document.getElementById('statLost').textContent    = d.lost;
    document.getElementById('statFound').textContent   = d.found;
    document.getElementById('statMatched').textContent = d.matched;
  }
}

// ── Build item card HTML ───────────────────────────────────────────
function buildCard(item, type) {
  const isLost   = type === 'lost';
  const loc      = isLost ? item.locationLost : item.locationFound;
  const dateVal  = isLost ? item.dateLost     : item.dateFound;
  const badgeCls = isLost ? 'badge-lost'      : 'badge-found';
  const badgeTxt = isLost ? 'Lost'            : 'Found';
  const apiRoute = isLost ? 'lost'            : 'found';

  return `
    <div class="item-card" onclick="openModal('${apiRoute}','${item._id}')">
      <div class="item-card-img">
        ${item.imageUrl
          ? `<img src="${item.imageUrl}" alt="${item.title}" loading="lazy"/>`
          : `<span>${catEmoji[item.category] || '📦'}</span>`}
      </div>
      <div class="item-card-body">
        <div class="item-card-top">
          <span class="item-card-title">${item.title}</span>
          <span class="badge ${badgeCls}">${badgeTxt}</span>
        </div>
        <div class="item-card-meta">
          <span>📍 ${loc}</span>
          <span>📅 ${fmtDate(dateVal)}</span>
          <span>🧑 ${item.postedBy?.name || 'Anonymous'}</span>
        </div>
      </div>
    </div>`;
}

// ── Load lost items ────────────────────────────────────────────────
async function loadLost(reset = false) {
  if (reset) { lostPage = 1; document.getElementById('lostGrid').innerHTML = ''; }
  const search   = document.getElementById('globalSearch')?.value || '';
  const category = document.getElementById('searchCategory')?.value || '';
  const d = await api.get(`/api/lost?page=${lostPage}&limit=8${category ? '&category='+category : ''}${search ? '&search='+encodeURIComponent(search) : ''}`);
  const grid = document.getElementById('lostGrid');

  if (!d.success) return;
  if (d.items.length === 0 && lostPage === 1) {
    grid.innerHTML = `<div class="empty-state"><div class="empty-icon">🔍</div><p>No lost items found.</p></div>`;
    return;
  }
  d.items.forEach(item => { grid.insertAdjacentHTML('beforeend', buildCard(item, 'lost')); });
  document.getElementById('loadMoreLost').style.display =
    d.items.length < 8 ? 'none' : 'inline-flex';
}

// ── Load found items ───────────────────────────────────────────────
async function loadFound(reset = false) {
  if (reset) { foundPage = 1; document.getElementById('foundGrid').innerHTML = ''; }
  const search   = document.getElementById('globalSearch')?.value || '';
  const category = document.getElementById('searchCategory')?.value || '';
  const d = await api.get(`/api/found?page=${foundPage}&limit=8${category ? '&category='+category : ''}${search ? '&search='+encodeURIComponent(search) : ''}`);
  const grid = document.getElementById('foundGrid');

  if (!d.success) return;
  if (d.items.length === 0 && foundPage === 1) {
    grid.innerHTML = `<div class="empty-state"><div class="empty-icon">🔍</div><p>No found items posted yet.</p></div>`;
    return;
  }
  d.items.forEach(item => { grid.insertAdjacentHTML('beforeend', buildCard(item, 'found')); });
  document.getElementById('loadMoreFound').style.display =
    d.items.length < 8 ? 'none' : 'inline-flex';
}

function loadMoreLost()  { lostPage++;  loadLost(); }
function loadMoreFound() { foundPage++; loadFound(); }

function handleSearch() { loadLost(true); loadFound(true); }

// ── Modal ──────────────────────────────────────────────────────────
async function openModal(type, id) {
  const overlay = document.getElementById('itemModal');
  const content = document.getElementById('modalContent');
  content.innerHTML = '<div class="loading-state" style="padding:40px">Loading...</div>';
  overlay.classList.add('open');

  const d = await api.get(`/api/${type}/${id}`);
  if (!d.success) { content.innerHTML = '<div class="modal-body">Error loading item.</div>'; return; }
  const item = d.item;
  const isLost = type === 'lost';
  const loc    = isLost ? item.locationLost : item.locationFound;
  const date   = isLost ? item.dateLost     : item.dateFound;
  const poster = item.postedBy;

  content.innerHTML = `
    <div class="modal-header">
      <h3>${item.title}</h3>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-body">
      ${item.imageUrl ? `<img src="${item.imageUrl}" class="modal-img" alt="${item.title}"/>` : ''}
      <div class="modal-meta">
        <div class="modal-meta-row"><strong>Type</strong><span class="badge ${isLost ? 'badge-lost' : 'badge-found'}">${isLost ? 'Lost' : 'Found'}</span></div>
        <div class="modal-meta-row"><strong>Category</strong><span>${catEmoji[item.category]} ${item.category}</span></div>
        <div class="modal-meta-row"><strong>Location</strong><span>📍 ${loc}</span></div>
        <div class="modal-meta-row"><strong>Date</strong><span>${fmtDate(date)}</span></div>
        ${isLost && item.reward ? `<div class="modal-meta-row"><strong>Reward</strong><span>🏆 ${item.reward}</span></div>` : ''}
        ${!isLost && item.currentlyAt ? `<div class="modal-meta-row"><strong>Currently At</strong><span>${item.currentlyAt}</span></div>` : ''}
        <div class="modal-meta-row"><strong>Posted by</strong><span>${poster?.name} ${poster?.rollNumber ? '('+poster.rollNumber+')' : ''}</span></div>
        ${poster?.phone ? `<div class="modal-meta-row"><strong>Contact</strong><span>📞 ${poster.phone}</span></div>` : ''}
      </div>
      ${item.description ? `<p class="modal-desc">${item.description}</p>` : ''}
      <div class="modal-actions">
        ${window.__user
          ? `<button class="btn-primary" onclick="claimMatch('${type}','${id}')">
               ${isLost ? '✅ I Found This!' : '🔗 This Matches My Lost Item'}
             </button>`
          : `<a href="/login.html" class="btn-primary">Login to Contact</a>`}
        <button class="btn-outline" onclick="closeModal()">Close</button>
      </div>
    </div>`;
}

function closeModal() {
  document.getElementById('itemModal').classList.remove('open');
}
document.getElementById('itemModal')?.addEventListener('click', (e) => {
  if (e.target === document.getElementById('itemModal')) closeModal();
});

async function claimMatch(type, id) {
  if (!requireAuth()) return;

  if (type === 'found') {
    // They found a found-item card and want to say their lost item matches
    const lostId = prompt('Enter the Lost Item ID (from its post URL or dashboard):');
    if (!lostId) return;
    const msg = prompt('Add a message to help verify (optional):') || '';
    const res = await api.post('/api/matches', { lostItemId: lostId, foundItemId: id, message: msg });
    alert(res.message);
  } else {
    // They're on a lost-item and want to say they found it
    const foundId = prompt('Enter the Found Item ID (from its post URL or dashboard):');
    if (!foundId) return;
    const msg = prompt('Add a message to help verify (optional):') || '';
    const res = await api.post('/api/matches', { lostItemId: id, foundItemId: foundId, message: msg });
    alert(res.message);
  }
}

// ── Init ───────────────────────────────────────────────────────────
loadStats();
loadLost();
loadFound();
