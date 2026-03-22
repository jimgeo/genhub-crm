/**
 * Shared layout: header + sidebar, injected into all pages.
 * All HTML is from trusted template constants, not user input.
 */

const LAYOUT_HEADER = `
  <div class="header-logo-mark">G</div>
  <a href="index.html" class="header-logo">GenHub CRM</a>
  <div class="header-right">
    <span class="header-user-name" id="header-user-name"></span>
    <div class="header-avatar" id="header-avatar"></div>
    <a href="/cdn-cgi/access/logout" class="header-logout">Logout</a>
  </div>
`;

const LAYOUT_SIDEBAR = `
  <div class="nav-section-label">Menu</div>
  <a href="index.html" class="nav-link">
    <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
    Dashboard
  </a>
  <hr class="nav-divider">
  <a href="accounts.html" class="nav-link">
    <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M3 7v14M21 7v14M6 7V4a1 1 0 011-1h10a1 1 0 011 1v3M9 21v-4h6v4M9 10h1M14 10h1M9 14h1M14 14h1"/></svg>
    Accounts
  </a>
  <a href="contacts.html" class="nav-link">
    <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
    Contacts
  </a>
  <hr class="nav-divider">
  <div class="nav-section-label" style="margin-top:auto;">System</div>
  <a href="#" class="nav-link" id="nav-settings">
    <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
    Settings
  </a>
`;

function initLayout() {
  const header = document.getElementById('app-header');
  const sidebar = document.getElementById('app-sidebar');
  // Safe: LAYOUT_HEADER and LAYOUT_SIDEBAR are trusted static templates
  if (header) header.innerHTML = LAYOUT_HEADER;  // eslint-disable-line no-unsanitized/property
  if (sidebar) sidebar.innerHTML = LAYOUT_SIDEBAR;  // eslint-disable-line no-unsanitized/property

  setActiveNav();

  // Populate user info with safe text content
  const nameEl = document.getElementById('header-user-name');
  const avatarEl = document.getElementById('header-avatar');
  if (nameEl) nameEl.textContent = CONFIG.CURRENT_USER;
  if (avatarEl) {
    if (CONFIG.USER_PHOTO) {
      const img = document.createElement('img');
      img.src = CONFIG.USER_PHOTO;
      img.alt = CONFIG.CURRENT_USER;
      avatarEl.appendChild(img);
    } else {
      avatarEl.textContent = CONFIG.CURRENT_USER.charAt(0).toUpperCase();
    }
  }
}

async function initApp() {
  await CONFIG.initSecrets();
  await CONFIG.initUser();
  initLayout();
}
