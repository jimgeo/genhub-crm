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

// ─── Company Logo (logo.dev) ───

/**
 * Extract domain from a website URL string.
 * Returns null if no valid domain can be extracted.
 */
function extractDomain(website) {
  if (!website) return null;
  let w = website.trim();
  if (!w) return null;
  try {
    if (!w.startsWith('http')) w = 'https://' + w;
    return new URL(w).hostname.replace(/^www\./, '');
  } catch(e) {
    return null;
  }
}

/**
 * Build a logo.dev image URL for a given domain.
 */
function logoDevUrl(domain, size = 48, format = 'png') {
  if (!domain) return '';
  return `https://img.logo.dev/${encodeURIComponent(domain)}?token=${CONFIG.LOGO_DEV_TOKEN}&size=${size}&format=${format}`;
}

/**
 * Generate an HTML <img> element string for a company logo with fallback initials.
 * @param {string} website - the account website field
 * @param {string} name - the account name (used for fallback initials)
 * @param {object} opts - { size: 48, cssClass: 'company-logo', lazy: true }
 */
function companyLogoHtml(website, name, opts = {}) {
  const size = opts.size || 48;
  const cssClass = opts.cssClass || 'company-logo';
  const lazy = opts.lazy !== false;
  const domain = extractDomain(website);
  const initials = (name || '?').substring(0, 2).toUpperCase();

  if (!domain) {
    return `<span class="${cssClass} ${cssClass}--fallback" style="width:${size}px;height:${size}px;">${escapeHtml(initials)}</span>`;
  }

  const src = logoDevUrl(domain, size, 'png');
  return `<img src="${src}" alt="${escapeHtml(name)}" class="${cssClass}" width="${size}" height="${size}" ${lazy ? 'loading="lazy"' : ''} onerror="this.outerHTML='<span class=\\'${cssClass} ${cssClass}--fallback\\' style=\\'width:${size}px;height:${size}px;\\'>${escapeHtml(initials)}</span>'">`;
}

/**
 * Build a company logo as a DOM element (safer than HTML string).
 * @param {string} website
 * @param {string} name
 * @param {number} size
 * @returns {HTMLElement} an <img> or fallback <span>
 */
function buildCompanyLogoEl(website, name, size = 48) {
  const domain = extractDomain(website);
  const initials = (name || '?').substring(0, 2).toUpperCase();
  const cssClass = 'company-logo' + (size <= 32 ? ' company-logo--sm' : '');

  const makeFallback = () => {
    const span = document.createElement('span');
    span.className = cssClass + ' company-logo--fallback';
    span.style.width = size + 'px';
    span.style.height = size + 'px';
    span.textContent = initials;
    return span;
  };

  if (!domain) return makeFallback();

  const img = document.createElement('img');
  img.src = logoDevUrl(domain, size, 'png');
  img.alt = name || '';
  img.className = cssClass;
  img.width = size;
  img.height = size;
  img.loading = 'lazy';
  img.addEventListener('error', () => {
    const fallback = makeFallback();
    img.replaceWith(fallback);
  });
  return img;
}

// ─── Logo Cache Service Worker ───
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw-logo-cache.js').catch(() => {});
}

// ─── Sortable Table Headers ───
// Call once after the table is in the DOM.
// columns: array of { key, label } or just strings (key used as label).
// getData: function returning the current filtered array.
// renderFn: function(sortedData) to re-render the tbody.

function makeSortable(tableSelector, columns, getData, renderFn) {
  const thead = document.querySelector(tableSelector + ' thead tr');
  if (!thead) return;

  let sortCol = null;
  let sortAsc = true;

  // Replace existing <th> elements with sortable ones
  thead.textContent = '';
  columns.forEach(function(col) {
    const key = typeof col === 'string' ? col : col.key;
    const label = typeof col === 'string' ? col : col.label;
    const th = document.createElement('th');
    th.style.cursor = 'pointer';
    th.style.userSelect = 'none';
    th.dataset.sortKey = key;
    th.textContent = label;

    const arrow = document.createElement('span');
    arrow.className = 'sort-arrow';
    arrow.style.marginLeft = '4px';
    arrow.style.opacity = '0.3';
    arrow.textContent = '\u2195';
    th.appendChild(arrow);

    th.addEventListener('click', function() {
      if (sortCol === key) {
        sortAsc = !sortAsc;
      } else {
        sortCol = key;
        sortAsc = true;
      }

      // Update arrows
      thead.querySelectorAll('.sort-arrow').forEach(function(a) {
        a.textContent = '\u2195';
        a.style.opacity = '0.3';
      });
      arrow.textContent = sortAsc ? '\u2191' : '\u2193';
      arrow.style.opacity = '1';

      // Sort and re-render
      var data = getData().slice();
      data.sort(function(a, b) {
        var va = (a[key] || '').toString().toLowerCase();
        var vb = (b[key] || '').toString().toLowerCase();
        if (va < vb) return sortAsc ? -1 : 1;
        if (va > vb) return sortAsc ? 1 : -1;
        return 0;
      });
      renderFn(data);
    });

    thead.appendChild(th);
  });
}
