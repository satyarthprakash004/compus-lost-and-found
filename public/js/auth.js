// auth.js — runs on every page to manage login state UI
(async () => {
  const data = await api.get('/api/auth/me').catch(() => null);

  const authButtons = document.getElementById('authButtons');
  const userMenu    = document.getElementById('userMenu');
  const avatarInitial = document.getElementById('avatarInitial');

  if (data?.success) {
    // Logged in
    window.__user = data.user;
    if (authButtons) authButtons.classList.add('hidden');
    if (userMenu) {
      userMenu.classList.remove('hidden');
      if (avatarInitial) avatarInitial.textContent = data.user.name[0].toUpperCase();
    }
  } else {
    window.__user = null;
    if (authButtons) authButtons.classList.remove('hidden');
    if (userMenu)    userMenu.classList.add('hidden');
  }

  // Avatar dropdown toggle
  document.getElementById('avatarBtn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('dropdown')?.classList.toggle('open');
  });
  document.addEventListener('click', () => {
    document.getElementById('dropdown')?.classList.remove('open');
  });

  // Logout
  document.getElementById('logoutBtn')?.addEventListener('click', async (e) => {
    e.preventDefault();
    await api.post('/api/auth/logout', {});
    window.location.href = '/';
  });
})();

// Guard: redirect to login if not authenticated
function requireAuth() {
  if (!window.__user) {
    window.location.href = '/login.html?next=' + encodeURIComponent(window.location.pathname);
    return false;
  }
  return true;
}
