/**
 * Accounts: list + detail logic.
 */

let _allAccounts = [];
let _filteredAccounts = [];
let _showInactive = false;

const ACCOUNT_COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'type', label: 'Type' },
  { key: 'current', label: 'Active' },
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Email' },
  { key: 'city', label: 'City' }
];

// ─── List ───

function applyAccountFilters() {
  const search = document.getElementById('search');
  const q = (search ? search.value : '').toLowerCase().trim();

  _filteredAccounts = _allAccounts.filter(a => {
    // Active filter
    if (!_showInactive && !isActive(a)) return false;
    // Search filter
    if (q) {
      return (a.name || '').toLowerCase().includes(q) ||
        (a.type || '').toLowerCase().includes(q) ||
        (a.email || '').toLowerCase().includes(q) ||
        (a.city || '').toLowerCase().includes(q);
    }
    return true;
  });

  renderAccountsTable(_filteredAccounts);
}

function isActive(account) {
  var v = (account.current || '').toString().toLowerCase().trim();
  return v === 'true' || v === 'yes' || v === 'y' || v === '1' || v === 'x';
}

async function loadAccountsList() {
  var raw = await SheetsAPI.getAll(CONFIG.SHEETS.ACCOUNTS);
  _allAccounts = raw.filter(a => a.is_deleted !== 'TRUE');
  applyAccountFilters();

  makeSortable('.table-wrapper table', ACCOUNT_COLUMNS,
    function() { return _filteredAccounts; },
    renderAccountsTable
  );

  const search = document.getElementById('search');
  if (search) {
    search.addEventListener('input', applyAccountFilters);
  }

  const toggle = document.getElementById('show-inactive');
  if (toggle) {
    toggle.addEventListener('change', function() {
      _showInactive = toggle.checked;
      applyAccountFilters();
    });
  }
}

function renderAccountsTable(accounts) {
  const tbody = document.getElementById('accounts-tbody');
  const countEl = document.getElementById('record-count');
  if (!tbody) return;

  if (countEl) countEl.textContent = accounts.length + ' record' + (accounts.length !== 1 ? 's' : '');

  if (accounts.length === 0) {
    tbody.textContent = '';
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 6;
    td.className = 'table-empty';
    td.textContent = 'No accounts found';
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  tbody.textContent = '';
  accounts.forEach(a => {
    const tr = document.createElement('tr');
    if (!isActive(a)) {
      tr.style.opacity = '0.5';
      tr.style.background = 'var(--color-gray-100)';
    }
    tr.onclick = () => { window.location.href = 'account-detail.html?id=' + encodeURIComponent(a.account_id); };

    const active = isActive(a) ? 'Yes' : 'No';
    const fields = [a.name, a.type, active, a.phone, a.email, a.city];
    fields.forEach(val => {
      const td = document.createElement('td');
      td.textContent = val || '';
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });
}

// ─── Detail ───

let _editingAccount = null;
let _editingIndex = -1;

async function loadAccountDetail() {
  const id = getParam('id');
  const isNew = getParam('new');

  if (isNew) return; // Form is already empty for new record

  if (!id) { window.location.href = 'accounts.html'; return; }

  _allAccounts = await SheetsAPI.getAll(CONFIG.SHEETS.ACCOUNTS);
  _editingIndex = findRowIndex(_allAccounts, 'account_id', id);
  if (_editingIndex < 0) { showToast('Account not found', 'error'); return; }

  _editingAccount = _allAccounts[_editingIndex];
  const name = _editingAccount.name || 'Account';

  document.getElementById('page-title').textContent = name;
  document.getElementById('breadcrumb-name').textContent = name;
  document.title = name + ' — GenHub CRM';

  // Populate form
  const fields = ['name', 'type', 'phone', 'email', 'website', 'address_line1', 'address_line2', 'city', 'postcode'];
  fields.forEach(f => {
    const el = document.getElementById('f-' + f);
    if (el) el.value = _editingAccount[f] || '';
  });

  document.getElementById('btn-delete').style.display = '';

  // Load linked contacts, areas, agreements, and payments
  await loadLinkedContacts(id);
  try { await loadLinkedAreas(id); } catch (e) { console.warn('[areas] Failed to load:', e.message); }
  await loadLinkedAgreements(id);
}

async function loadLinkedContacts(accountId) {
  const section = document.getElementById('contacts-section');
  if (!section) return;

  const contacts = await SheetsAPI.getAll(CONFIG.SHEETS.CONTACTS);
  const linked = contacts.filter(c => c.account_id === accountId && c.is_deleted !== 'TRUE');

  section.style.display = '';
  const addLink = document.getElementById('add-contact-link');
  if (addLink) addLink.href = 'contact-detail.html?new=1&account_id=' + encodeURIComponent(accountId);

  const tbody = document.getElementById('contacts-tbody');
  if (!tbody) return;

  tbody.textContent = '';
  if (linked.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 6;
    td.className = 'table-empty';
    td.textContent = 'No contacts linked to this account';
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  linked.forEach(c => {
    const contactCurrent = (c.current || '').toString().toLowerCase().trim();
    const isCurrent = contactCurrent === 'true' || contactCurrent === 'yes' || contactCurrent === 'y' || contactCurrent === '1' || contactCurrent === 'x';
    const isPrimary = (c.primary || '').toString().toLowerCase().trim();
    const primaryDisplay = (isPrimary === 'true' || isPrimary === 'yes' || isPrimary === 'y' || isPrimary === '1' || isPrimary === 'x') ? 'Yes' : 'No';

    const tr = document.createElement('tr');
    if (!isCurrent) {
      tr.style.opacity = '0.5';
      tr.style.background = 'var(--color-gray-100)';
    }
    tr.onclick = () => { window.location.href = 'contact-detail.html?id=' + encodeURIComponent(c.contact_id); };

    const fullName = ((c.first_name || '') + ' ' + (c.last_name || '')).trim();
    [fullName, c.email, c.phone, c.job_title, primaryDisplay, isCurrent ? 'Yes' : 'No'].forEach(val => {
      const td = document.createElement('td');
      td.textContent = val || '';
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });
}

async function loadLinkedAreas(accountId) {
  var section = document.getElementById('areas-section');
  if (!section) return;

  var data = await SheetsAPI.batchGet([CONFIG.SHEETS.ACCOUNT_AREAS, CONFIG.SHEETS.AREAS]);
  var links = (data.Account_Areas || []).filter(function(l) {
    return l.account_id === accountId && l.is_deleted !== 'TRUE';
  });
  var areas = (data.Area || []).filter(function(a) { return a.is_deleted !== 'TRUE'; });
  var areaMap = {};
  areas.forEach(function(a) { areaMap[a.area_id] = a; });

  section.style.display = '';

  var tbody = document.getElementById('areas-tbody');
  if (!tbody) return;

  tbody.textContent = '';
  if (links.length === 0) {
    var tr = document.createElement('tr');
    var td = document.createElement('td');
    td.colSpan = 6;
    td.className = 'table-empty';
    td.textContent = 'No areas linked to this account';
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  links.forEach(function(link) {
    var area = areaMap[link.area_id] || {};
    var linkCurrent = (link.current || '').toString().toLowerCase().trim();
    var isCur = linkCurrent === 'true' || linkCurrent === 'yes' || linkCurrent === 'y' || linkCurrent === '1' || linkCurrent === 'x';

    var tr = document.createElement('tr');
    if (!isCur) {
      tr.style.opacity = '0.5';
      tr.style.background = 'var(--color-gray-100)';
    }
    tr.onclick = function() { window.location.href = 'area-detail.html?id=' + encodeURIComponent(link.area_id); };

    [area.zone || '', area.area || '', area.member_single_multi || '', link.date_from || '', link.date_to || '', isCur ? 'Yes' : 'No'].forEach(function(val) {
      var td = document.createElement('td');
      td.textContent = val;
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });
}

function getAccountFormData() {
  const fields = ['name', 'type', 'phone', 'email', 'website', 'address_line1', 'address_line2', 'city', 'postcode'];
  const data = {};
  fields.forEach(f => {
    const el = document.getElementById('f-' + f);
    data[f] = el ? el.value.trim() : '';
  });
  return data;
}

async function saveAccount() {
  const data = getAccountFormData();
  if (!data.name) { showToast('Account name is required', 'error'); return; }

  try {
    if (_editingAccount) {
      // Update
      const updated = { ..._editingAccount, ...data, modified_by: CONFIG.CURRENT_USER, modified_at: nowISO() };
      await SheetsAPI.update(CONFIG.SHEETS.ACCOUNTS, _editingIndex, updated);
      showToast('Account updated');
    } else {
      // Create
      data.account_id = generateId('acc');
      data.created_by = CONFIG.CURRENT_USER;
      data.created_at = nowISO();
      data.modified_by = CONFIG.CURRENT_USER;
      data.modified_at = nowISO();
      await SheetsAPI.append(CONFIG.SHEETS.ACCOUNTS, data);
      showToast('Account created');
      setTimeout(() => { window.location.href = 'account-detail.html?id=' + encodeURIComponent(data.account_id); }, 500);
    }
  } catch (e) {
    showToast('Save failed: ' + e.message, 'error');
  }
}

async function deleteAccount() {
  if (!_editingAccount || _editingIndex < 0) return;
  if (!confirm('Delete this account? It will be marked as deleted.')) return;

  try {
    const updated = { ..._editingAccount, is_deleted: 'TRUE', modified_by: CONFIG.CURRENT_USER, modified_at: nowISO() };
    await SheetsAPI.update(CONFIG.SHEETS.ACCOUNTS, _editingIndex, updated);
    showToast('Account deleted');
    setTimeout(() => { window.location.href = 'accounts.html'; }, 500);
  } catch (e) {
    showToast('Delete failed: ' + e.message, 'error');
  }
}

// ─── Agreements & Payments ───

async function loadLinkedAgreements(accountId) {
  var agrSection = document.getElementById('agreements-section');
  var paySection = document.getElementById('payments-section');
  if (!agrSection || !paySection) return;

  var acctName = (_editingAccount && _editingAccount.name) ? _editingAccount.name.toLowerCase().trim() : '';
  var data = await SheetsAPI.batchGet([CONFIG.SHEETS.BILLING_AGREEMENTS, CONFIG.SHEETS.BILLING]);
  var agreements = (data.Billing_Agreement || []).filter(function(a) {
    if (a.is_deleted === 'TRUE') return false;
    if (a.account_id === accountId) return true;
    // Fallback: match on account_name (cleaned name from import may differ slightly)
    if (acctName && (a.account_name || '').toLowerCase().trim() === acctName) return true;
    return false;
  });
  var allBilling = (data.Billing || []).filter(function(b) { return b.is_deleted !== 'TRUE'; });

  if (agreements.length === 0) return;

  // Show agreements table
  agrSection.style.display = '';
  var agrTbody = document.getElementById('agreements-tbody');
  agrTbody.textContent = '';

  // Build agreement map and billing lookup
  var agreementIds = new Set();
  agreements.forEach(function(a) { agreementIds.add(a.agreement_id); });

  var billingByAgreement = {};
  allBilling.forEach(function(b) {
    if (!agreementIds.has(b.agreement_id)) return;
    if (!billingByAgreement[b.agreement_id]) billingByAgreement[b.agreement_id] = [];
    billingByAgreement[b.agreement_id].push(b);
  });

  var monthOrder = { JAN:1, FEB:2, MAR:3, APR:4, MAY:5, JUN:6, JUL:7, AUG:8, SEP:9, OCT:10, NOV:11, DEC:12 };
  var MONTH_NAMES = ['', 'JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

  // Derive From/To for each agreement and sort newest first
  agreements.forEach(function(a) {
    var records = billingByAgreement[a.agreement_id] || [];
    var minVal = null, maxVal = null;
    var minLabel = '', maxLabel = '';
    records.forEach(function(b) {
      var yr = parseInt(b.year) || 0;
      var mo = monthOrder[b.month] || 0;
      var val = yr * 100 + mo;
      if (minVal === null || val < minVal) { minVal = val; minLabel = b.month + ' ' + b.year; }
      if (maxVal === null || val > maxVal) { maxVal = val; maxLabel = b.month + ' ' + b.year; }
    });
    a._from = minLabel;
    a._to = maxLabel;
    a._sortVal = maxVal || 0;
  });

  agreements.sort(function(a, b) { return b._sortVal - a._sortVal; });

  agreements.forEach(function(a) {
    var tr = document.createElement('tr');
    [a._to, a._from, a.type || '', a.zone || '', a.area || '', a.notes || '', a.payment_notes || ''].forEach(function(val) {
      var td = document.createElement('td');
      td.textContent = val;
      tr.appendChild(td);
    });
    agrTbody.appendChild(tr);
  });

  // Payment summary: all billing records sorted by year-month descending, grouped by agreement
  paySection.style.display = '';
  var payTbody = document.getElementById('payments-tbody');
  payTbody.textContent = '';

  // Collect all billing records with agreement info
  var allRecords = [];
  agreements.forEach(function(a) {
    var records = billingByAgreement[a.agreement_id] || [];
    records.forEach(function(b) {
      allRecords.push({
        agreement: a,
        month: b.month || '',
        year: b.year || '',
        amount: parseFloat(b.amount) || 0,
        notes: b.notes || ''
      });
    });
  });

  // Sort by year desc, month desc
  allRecords.sort(function(a, b) {
    var yd = parseInt(b.year) - parseInt(a.year);
    if (yd !== 0) return yd;
    return (monthOrder[b.month] || 0) - (monthOrder[a.month] || 0);
  });

  var grandTotal = 0;
  allRecords.forEach(function(r) {
    grandTotal += r.amount;
    var tr = document.createElement('tr');

    var tdMonth = document.createElement('td');
    tdMonth.textContent = r.month;
    tr.appendChild(tdMonth);

    var tdYear = document.createElement('td');
    tdYear.textContent = r.year;
    tr.appendChild(tdYear);

    var tdAmt = document.createElement('td');
    tdAmt.className = 'amount';
    tdAmt.textContent = r.amount.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    tr.appendChild(tdAmt);

    var tdArea = document.createElement('td');
    tdArea.textContent = (r.agreement.zone || '') + ' / ' + (r.agreement.area || '');
    tdArea.style.cssText = 'font-size:10px;color:var(--color-gray-500);';
    tr.appendChild(tdArea);

    var tdNotes = document.createElement('td');
    tdNotes.textContent = r.notes;
    tdNotes.style.cssText = 'font-size:10px;color:var(--color-gray-500);';
    tr.appendChild(tdNotes);

    payTbody.appendChild(tr);
  });

  // Grand total
  var totalTr = document.createElement('tr');
  totalTr.className = 'pay-total';
  var totalLabel = document.createElement('td');
  totalLabel.colSpan = 2;
  totalLabel.textContent = 'Total';
  totalLabel.style.cssText = 'font-family:var(--font-ui);font-size:10px;text-transform:uppercase;letter-spacing:0.5px;';
  totalTr.appendChild(totalLabel);
  var totalAmt = document.createElement('td');
  totalAmt.className = 'amount';
  totalAmt.textContent = grandTotal.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  totalTr.appendChild(totalAmt);
  totalTr.appendChild(document.createElement('td'));
  totalTr.appendChild(document.createElement('td'));
  payTbody.appendChild(totalTr);
}
