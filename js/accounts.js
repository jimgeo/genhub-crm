/**
 * Accounts: list + detail logic.
 */

let _allAccounts = [];

// ─── List ───

async function loadAccountsList() {
  _allAccounts = await SheetsAPI.getAll(CONFIG.SHEETS.ACCOUNTS);
  renderAccountsTable(_allAccounts);

  const search = document.getElementById('search');
  if (search) {
    search.addEventListener('input', () => {
      const q = search.value.toLowerCase().trim();
      const filtered = q
        ? _allAccounts.filter(a =>
            (a.name || '').toLowerCase().includes(q) ||
            (a.type || '').toLowerCase().includes(q) ||
            (a.email || '').toLowerCase().includes(q) ||
            (a.city || '').toLowerCase().includes(q))
        : _allAccounts;
      renderAccountsTable(filtered);
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
    td.colSpan = 5;
    td.className = 'table-empty';
    td.textContent = 'No accounts found';
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  tbody.textContent = '';
  accounts.forEach(a => {
    const tr = document.createElement('tr');
    tr.onclick = () => { window.location.href = 'account-detail.html?id=' + encodeURIComponent(a.account_id); };

    const fields = [a.name, a.type, a.phone, a.email, a.city];
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

  // Load linked contacts
  await loadLinkedContacts(id);
}

async function loadLinkedContacts(accountId) {
  const section = document.getElementById('contacts-section');
  if (!section) return;

  const contacts = await SheetsAPI.getAll(CONFIG.SHEETS.CONTACTS);
  const linked = contacts.filter(c => c.account_id === accountId);

  section.style.display = '';
  const addLink = document.getElementById('add-contact-link');
  if (addLink) addLink.href = 'contact-detail.html?new=1&account_id=' + encodeURIComponent(accountId);

  const tbody = document.getElementById('contacts-tbody');
  if (!tbody) return;

  tbody.textContent = '';
  if (linked.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 4;
    td.className = 'table-empty';
    td.textContent = 'No contacts linked to this account';
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  linked.forEach(c => {
    const tr = document.createElement('tr');
    tr.onclick = () => { window.location.href = 'contact-detail.html?id=' + encodeURIComponent(c.contact_id); };

    const fullName = ((c.first_name || '') + ' ' + (c.last_name || '')).trim();
    [fullName, c.email, c.phone, c.job_title].forEach(val => {
      const td = document.createElement('td');
      td.textContent = val || '';
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
  if (!confirm('Delete this account? This cannot be undone.')) return;

  try {
    await SheetsAPI.deleteRow(CONFIG.SHEETS.ACCOUNTS, _editingIndex);
    showToast('Account deleted');
    setTimeout(() => { window.location.href = 'accounts.html'; }, 500);
  } catch (e) {
    showToast('Delete failed: ' + e.message, 'error');
  }
}
