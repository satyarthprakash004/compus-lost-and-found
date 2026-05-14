// api.js — thin wrapper around fetch for all API calls
const api = {
  async get(url) {
    const res = await fetch(url, { credentials: 'include' });
    return res.json();
  },
  async post(url, data) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async postForm(url, formData) {
    const res = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      body: formData,  // let browser set multipart headers
    });
    return res.json();
  },
  async patch(url, data) {
    const res = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async delete(url) {
    const res = await fetch(url, { method: 'DELETE', credentials: 'include' });
    return res.json();
  },
};

// ── Alert helper ───────────────────────────────────────────────────
function showAlert(msg, type = 'error', boxId = 'alertBox') {
  const box = document.getElementById(boxId);
  if (!box) return;
  box.textContent = msg;
  box.className = `alert ${type}`;
  box.classList.remove('hidden');
  setTimeout(() => box.classList.add('hidden'), 4000);
}

// ── Password toggle ────────────────────────────────────────────────
function togglePassword(inputId) {
  const el = document.getElementById(inputId);
  el.type = el.type === 'password' ? 'text' : 'password';
}

// ── Category emoji map ─────────────────────────────────────────────
const catEmoji = {
  gadget:   '📱',
  document: '📄',
  clothing: '👕',
  bag:      '🎒',
  keys:     '🔑',
  person:   '🧑',
  other:    '📦',
};

// ── Format date ────────────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Relative time ──────────────────────────────────────────────────
function timeAgo(d) {
  const diff = Date.now() - new Date(d);
  const mins = Math.floor(diff / 60000);
  if (mins < 1)   return 'just now';
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}
