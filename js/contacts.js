/**
 * Contacts: list + detail logic.
 */

let _allContacts = [];
let _filteredContacts = [];
let _accountMap = {};

const CONTACT_COLUMNS = [
  { key: '_fullName', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'job_title', label: 'Job Title' },
  { key: '_accountName', label: 'Account' }
];

// ─── List ───

async function loadContactsList() {
  const data = await SheetsAPI.batchGet([CONFIG.SHEETS.CONTACTS, CONFIG.SHEETS.ACCOUNTS]);
  _allContacts = (data.Contacts || []).filter(c => c.is_deleted !== 'TRUE');
  const accounts = (data.Accounts || []).filter(a => a.is_deleted !== 'TRUE');

  _accountMap = {};
  accounts.forEach(a => { _accountMap[a.account_id] = a.name; });

  // Add computed fields for sorting
  _allContacts.forEach(c => {
    c._fullName = ((c.first_name || '') + ' ' + (c.last_name || '')).trim();
    c._accountName = _accountMap[c.account_id] || '';
  });

  _filteredContacts = _allContacts;
  renderContactsTable(_filteredContacts);

  makeSortable('.table-wrapper table', CONTACT_COLUMNS,
    function() { return _filteredContacts; },
    renderContactsTable
  );

  const search = document.getElementById('search');
  if (search) {
    search.addEventListener('input', () => {
      const q = search.value.toLowerCase().trim();
      _filteredContacts = q
        ? _allContacts.filter(c => {
            return (c._fullName || '').toLowerCase().includes(q) ||
              (c.email || '').toLowerCase().includes(q) ||
              (c.job_title || '').toLowerCase().includes(q) ||
              (c._accountName || '').toLowerCase().includes(q);
          })
        : _allContacts;
      renderContactsTable(_filteredContacts);
    });
  }
}

function renderContactsTable(contacts) {
  const tbody = document.getElementById('contacts-tbody');
  const countEl = document.getElementById('record-count');
  if (!tbody) return;

  if (countEl) countEl.textContent = contacts.length + ' record' + (contacts.length !== 1 ? 's' : '');

  if (contacts.length === 0) {
    tbody.textContent = '';
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 5;
    td.className = 'table-empty';
    td.textContent = 'No contacts found';
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  tbody.textContent = '';
  contacts.forEach(c => {
    const tr = document.createElement('tr');
    tr.onclick = () => { window.location.href = 'contact-detail.html?id=' + encodeURIComponent(c.contact_id); };

    [c._fullName, c.email, c.phone, c.job_title, c._accountName].forEach(val => {
      const td = document.createElement('td');
      td.textContent = val || '';
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });
}

// ─── Detail ───

let _editingContact = null;
let _editingContactIndex = -1;

async function loadContactDetail() {
  const id = getParam('id');
  const isNew = getParam('new');
  const presetAccountId = getParam('account_id');

  // Load accounts for dropdown (only non-deleted)
  const accounts = (await SheetsAPI.getAll(CONFIG.SHEETS.ACCOUNTS)).filter(a => a.is_deleted !== 'TRUE');
  const select = document.getElementById('f-account_id');
  if (select) {
    accounts.forEach(a => {
      const opt = document.createElement('option');
      opt.value = a.account_id;
      opt.textContent = a.name;
      select.appendChild(opt);
    });
  }

  if (isNew) {
    if (presetAccountId && select) select.value = presetAccountId;
    return;
  }

  if (!id) { window.location.href = 'contacts.html'; return; }

  _allContacts = await SheetsAPI.getAll(CONFIG.SHEETS.CONTACTS);
  _editingContactIndex = findRowIndex(_allContacts, 'contact_id', id);
  if (_editingContactIndex < 0) { showToast('Contact not found', 'error'); return; }

  _editingContact = _allContacts[_editingContactIndex];
  const fullName = ((_editingContact.first_name || '') + ' ' + (_editingContact.last_name || '')).trim();

  document.getElementById('page-title').textContent = fullName;
  document.getElementById('breadcrumb-name').textContent = fullName;
  document.title = fullName + ' — GenHub CRM';

  const fields = ['first_name', 'last_name', 'email', 'phone', 'mobile', 'job_title', 'account_id'];
  fields.forEach(f => {
    const el = document.getElementById('f-' + f);
    if (el) el.value = _editingContact[f] || '';
  });

  document.getElementById('btn-delete').style.display = '';
}

function getContactFormData() {
  const fields = ['first_name', 'last_name', 'email', 'phone', 'mobile', 'job_title', 'account_id'];
  const data = {};
  fields.forEach(f => {
    const el = document.getElementById('f-' + f);
    data[f] = el ? el.value.trim() : '';
  });
  return data;
}

async function saveContact() {
  const data = getContactFormData();
  if (!data.first_name && !data.last_name) { showToast('Name is required', 'error'); return; }

  try {
    if (_editingContact) {
      const updated = { ..._editingContact, ...data, modified_by: CONFIG.CURRENT_USER, modified_at: nowISO() };
      await SheetsAPI.update(CONFIG.SHEETS.CONTACTS, _editingContactIndex, updated);
      showToast('Contact updated');
    } else {
      data.contact_id = generateId('con');
      data.created_by = CONFIG.CURRENT_USER;
      data.created_at = nowISO();
      data.modified_by = CONFIG.CURRENT_USER;
      data.modified_at = nowISO();
      await SheetsAPI.append(CONFIG.SHEETS.CONTACTS, data);
      showToast('Contact created');
      setTimeout(() => { window.location.href = 'contact-detail.html?id=' + encodeURIComponent(data.contact_id); }, 500);
    }
  } catch (e) {
    showToast('Save failed: ' + e.message, 'error');
  }
}

async function deleteContact() {
  if (!_editingContact || _editingContactIndex < 0) return;
  if (!confirm('Delete this contact? It will be marked as deleted.')) return;

  try {
    const updated = { ..._editingContact, is_deleted: 'TRUE', modified_by: CONFIG.CURRENT_USER, modified_at: nowISO() };
    await SheetsAPI.update(CONFIG.SHEETS.CONTACTS, _editingContactIndex, updated);
    showToast('Contact deleted');
    setTimeout(() => { window.location.href = 'contacts.html'; }, 500);
  } catch (e) {
    showToast('Delete failed: ' + e.message, 'error');
  }
}
