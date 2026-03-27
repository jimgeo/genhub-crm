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
  <a href="areas.html" class="nav-link">
    <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
    Areas
  </a>
  <a href="billing.html" class="nav-link">
    <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
    Billing
  </a>
  <hr class="nav-divider">
  <a href="import.html" class="nav-link">
    <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
    Import
  </a>
  <a href="import-billing.html" class="nav-link">
    <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
    Import Billing
  </a>
  <a href="duplicates.html" class="nav-link">
    <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="2" width="13" height="13" rx="2"/><path d="M4 9a2 2 0 00-2 2v9a2 2 0 002 2h9a2 2 0 002-2"/></svg>
    Duplicates
  </a>
  <hr class="nav-divider">
  <div class="nav-section-label" style="margin-top:auto;">System</div>
  <a href="lookups.html" class="nav-link">
    <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>
    Lookups
  </a>
  <a href="settings.html" class="nav-link" id="nav-settings">
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
