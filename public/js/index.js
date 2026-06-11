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

  const hasCoords = item.latitude && item.longitude;

  content.innerHTML = `
    <div class="modal-header">
      <h3>${item.title}</h3>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-body">
      ${item.imageUrl ? `<img src="${item.imageUrl}" class="modal-img" alt="${item.title}"/>` : ''}
      <div class="modal-meta">
        <div class="modal-meta-row"><strong>Type</strong><span class="badge ${isLost ? 'badge-lost' : 'badge-found'}">${isLost ? 'Lost' : 'Found'}</span></div>
        <div class="modal-meta-row"><strong>Category</strong><span>${catEmoji[item.category] || '📦'} ${item.category}</span></div>
        <div class="modal-meta-row"><strong>Location</strong><span>📍 ${loc}</span></div>
        <div class="modal-meta-row"><strong>Date</strong><span>${fmtDate(date)}</span></div>
        ${isLost && item.reward ? `<div class="modal-meta-row"><strong>Reward</strong><span>🏆 ${item.reward}</span></div>` : ''}
        ${!isLost && item.currentlyAt ? `<div class="modal-meta-row"><strong>Currently At</strong><span>${item.currentlyAt}</span></div>` : ''}
        ${item.handoverSpot ? `<div class="modal-meta-row"><strong>Safe Handover</strong><span style="color:var(--accent2);font-weight:600;">🔒 ${item.handoverSpot}</span></div>` : ''}
        <div class="modal-meta-row"><strong>Posted by</strong><span>${poster?.name || 'Anonymous'} ${poster?.rollNumber ? '('+poster.rollNumber+')' : ''}</span></div>
        ${poster?.phone ? `<div class="modal-meta-row"><strong>Contact</strong><span>📞 ${poster.phone}</span></div>` : ''}
      </div>
      ${item.description ? `<p class="modal-desc">${item.description}</p>` : ''}
      ${hasCoords ? `
        <div style="font-size: 13px; font-weight: 600; margin-bottom: 8px;">📍 Map Location:</div>
        <div id="modalMap" style="height: 220px; border-radius: var(--radius-sm); border: 1px solid var(--border); margin-bottom: 24px; z-index: 1;"></div>
      ` : ''}
      <div class="modal-actions">
        ${window.__user
          ? `<button class="btn-primary" onclick="claimMatch('${type}','${id}')">
               ${isLost ? '✅ I Found This!' : '🔗 This Matches My Lost Item'}
             </button>`
          : `<a href="/login.html" class="btn-primary">Login to Contact</a>`}
        <button class="btn-outline" onclick="closeModal()">Close</button>
      </div>
    </div>`;

  if (hasCoords) {
    setTimeout(() => {
      const modalMap = L.map('modalMap').setView([item.latitude, item.longitude], 18);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors'
      }).addTo(modalMap);
      L.marker([item.latitude, item.longitude]).addTo(modalMap);
      setTimeout(() => { modalMap.invalidateSize(); }, 200);
    }, 100);
  }
}

function closeModal() {
  document.getElementById('itemModal').classList.remove('open');
}
document.getElementById('itemModal')?.addEventListener('click', (e) => {
  if (e.target === document.getElementById('itemModal')) closeModal();
});

function closeClaimModal() {
  const modal = document.getElementById('claimModal');
  if (modal) modal.classList.remove('open');
  const alertBox = document.getElementById('claimAlertBox');
  if (alertBox) { alertBox.className = 'alert hidden'; alertBox.textContent = ''; }
  const messageInput = document.getElementById('claimMessage');
  if (messageInput) messageInput.value = '';
}

async function claimMatch(type, id) {
  if (!requireAuth()) return;

  const modal = document.getElementById('claimModal');
  const select = document.getElementById('claimItemSelect');
  const label = document.getElementById('claimDropdownLabel');
  const title = document.getElementById('claimModalTitle');
  const submitBtn = document.getElementById('claimSubmitBtn');
  const alertBox = document.getElementById('claimAlertBox');

  // Clear dropdown options and reset state
  select.innerHTML = '';
  alertBox.className = 'alert hidden';
  alertBox.textContent = '';

  const isClaimingFound = type === 'found'; // true if matching a found item with a lost post

  if (isClaimingFound) {
    title.textContent = 'Claim Found Item';
    label.textContent = 'Select your matching Lost Post *';
  } else {
    title.textContent = 'Report Item Found';
    label.textContent = 'Select your matching Found Post *';
  }

  // Show modal loading state
  select.innerHTML = '<option value="">Loading your posts...</option>';
  submitBtn.disabled = true;
  modal.classList.add('open');

  try {
    // Fetch user items depending on the type
    const route = isClaimingFound ? '/api/lost/my' : '/api/found/my';
    const res = await api.get(route);
    
    if (!res.success || !res.items || res.items.length === 0) {
      select.innerHTML = '<option value="">No items found</option>';
      const helpMsg = isClaimingFound 
        ? 'You have not reported any lost items yet. Please post a lost item first to request a match.'
        : 'You have not reported any found items yet. Please post a found item first to connect it.';
      
      alertBox.className = 'alert error';
      alertBox.textContent = helpMsg;
      submitBtn.disabled = true;
      return;
    }

    // Filter items (only show active lost or available found items)
    const activeItems = res.items.filter(item => {
      const activeStatus = isClaimingFound ? 'active' : 'available';
      return item.status === activeStatus;
    });

    if (activeItems.length === 0) {
      select.innerHTML = '<option value="">No active items available</option>';
      const helpMsg = isClaimingFound
        ? 'You have no active lost posts. (They might be already marked as found).'
        : 'You have no active found posts. (They might be already marked as claimed).';
      alertBox.className = 'alert error';
      alertBox.textContent = helpMsg;
      submitBtn.disabled = true;
      return;
    }

    // Populate select dropdown
    select.innerHTML = activeItems.map(item => `
      <option value="${item._id}">${item.title} (📍 ${isClaimingFound ? item.locationLost : item.locationFound})</option>
    `).join('');
    submitBtn.disabled = false;

    // Set submit button action
    submitBtn.onclick = async () => {
      const selectedId = select.value;
      const message = document.getElementById('claimMessage').value.trim();

      if (!selectedId) {
        alertBox.className = 'alert error';
        alertBox.textContent = 'Please select an item from the dropdown.';
        return;
      }

      submitBtn.textContent = 'Submitting...';
      submitBtn.disabled = true;

      const lostItemId = isClaimingFound ? selectedId : id;
      const foundItemId = isClaimingFound ? id : selectedId;

      const response = await api.post('/api/matches', {
        lostItemId,
        foundItemId,
        message
      });

      submitBtn.textContent = 'Submit Claim';
      submitBtn.disabled = false;

      if (response.success) {
        alertBox.className = 'alert success';
        alertBox.textContent = 'Match request sent successfully! Redirecting...';
        setTimeout(() => {
          closeClaimModal();
          closeModal(); // close item details modal too
        }, 1200);
      } else {
        alertBox.className = 'alert error';
        alertBox.textContent = response.message || 'Failed to submit match request.';
      }
    };

  } catch (err) {
    console.error(err);
    select.innerHTML = '<option value="">Error loading posts</option>';
    alertBox.className = 'alert error';
    alertBox.textContent = 'Server error loading your posts. Please try again.';
    submitBtn.disabled = true;
  }
}

// ── Init ───────────────────────────────────────────────────────────
loadStats();
loadLost();
loadFound();
