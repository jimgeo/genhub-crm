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
