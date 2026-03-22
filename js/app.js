/**
 * Shared utilities: ID generation, dates, navigation, toasts.
 */

function generateId(prefix) {
  const hex = Array.from(crypto.getRandomValues(new Uint8Array(4)))
    .map(b => b.toString(16).padStart(2, '0')).join('');
  return `${prefix}-${hex}`;
}

function nowISO() {
  return new Date().toISOString();
}

function formatDate(isoStr) {
  if (!isoStr) return '';
  const ukMatch = isoStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const d = ukMatch ? new Date(ukMatch[3], ukMatch[2] - 1, ukMatch[1]) : new Date(isoStr);
  if (isNaN(d)) return isoStr;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function findById(records, idField, idValue) {
  return records.find(r => r[idField] === idValue);
}

function findRowIndex(records, idField, idValue) {
  return records.findIndex(r => r[idField] === idValue);
}

function setActiveNav() {
  const path = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-link').forEach(link => {
    const href = link.getAttribute('href');
    if (href === path) link.classList.add('active');
  });
}

function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
