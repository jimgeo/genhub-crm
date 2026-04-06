/**
 * Areas: list + detail logic.
 */

let _allAreas = [];
let _filteredAreas = [];
let _showInactiveAreas = false;

const AREA_COLUMNS = [
  { key: 'zone', label: 'Zone' },
  { key: 'area', label: 'Area' },
  { key: 'member_single_multi', label: 'Type' },
  { key: 'category', label: 'Category' },
  { key: 'description', label: 'Description' },
  { key: 'current', label: 'Current' }
];

function isAreaCurrent(area) {
  var v = (area.current || '').toString().toLowerCase().trim();
  return v === 'true' || v === 'yes' || v === 'y' || v === '1' || v === 'x';
}

// ─── List ───

function applyAreaFilters() {
  var search = document.getElementById('search');
  var q = (search ? search.value : '').toLowerCase().trim();

  _filteredAreas = _allAreas.filter(function(a) {
    if (!_showInactiveAreas && !isAreaCurrent(a)) return false;
    if (q) {
      return (a.zone || '').toLowerCase().includes(q) ||
        (a.area || '').toLowerCase().includes(q) ||
        (a.member_single_multi || '').toLowerCase().includes(q) ||
        (a.category || '').toLowerCase().includes(q) ||
        (a.description || '').toLowerCase().includes(q);
    }
    return true;
  });

  renderAreasTable(_filteredAreas);
}

async function loadAreasList() {
  var raw = await SheetsAPI.getAll(CONFIG.SHEETS.AREAS);
  _allAreas = raw.filter(function(a) { return a.is_deleted !== 'TRUE'; });
  applyAreaFilters();

  makeSortable('.table-wrapper table', AREA_COLUMNS,
    function() { return _filteredAreas; },
    renderAreasTable
  );

  var search = document.getElementById('search');
  if (search) {
    search.addEventListener('input', applyAreaFilters);
  }

  var toggle = document.getElementById('show-inactive');
  if (toggle) {
    toggle.addEventListener('change', function() {
      _showInactiveAreas = toggle.checked;
      applyAreaFilters();
    });
  }
}

function renderAreasTable(areas) {
  var tbody = document.getElementById('areas-tbody');
  var countEl = document.getElementById('record-count');
  if (!tbody) return;

  if (countEl) countEl.textContent = areas.length + ' record' + (areas.length !== 1 ? 's' : '');

  if (areas.length === 0) {
    tbody.textContent = '';
    var tr = document.createElement('tr');
    var td = document.createElement('td');
    td.colSpan = 6;
    td.className = 'table-empty';
    td.textContent = 'No areas found';
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  // Sort by category (blanks first, then alphabetical), then zone, then area
  var sorted = areas.slice().sort(function(a, b) {
    var ca = (a.category || '').toLowerCase();
    var cb = (b.category || '').toLowerCase();
    if (!ca && cb) return -1;
    if (ca && !cb) return 1;
    if (ca !== cb) return ca.localeCompare(cb);
    return (a.zone || '').localeCompare(b.zone || '')
      || (a.area || '').localeCompare(b.area || '');
  });

  tbody.textContent = '';
  var currentCategory = null;
  sorted.forEach(function(a) {
    var cat = a.category || '';
    if (cat !== currentCategory) {
      currentCategory = cat;
      var gtr = document.createElement('tr');
      gtr.className = 'category-group-row';
      var gtd = document.createElement('td');
      gtd.colSpan = 6;
      gtd.textContent = cat || 'Standard';
      gtr.appendChild(gtd);
      tbody.appendChild(gtr);
    }

    var tr = document.createElement('tr');
    var cur = isAreaCurrent(a);
    if (!cur) {
      tr.style.opacity = '0.5';
      tr.style.background = 'var(--color-gray-100)';
    }
    tr.onclick = function() { window.location.href = 'area-detail.html?id=' + encodeURIComponent(a.area_id); };

    var fields = [a.zone, a.area, a.member_single_multi, a.category, a.description, cur ? 'Yes' : 'No'];
    fields.forEach(function(val) {
      var td = document.createElement('td');
      td.textContent = val || '';
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });
}

// ─── Detail ───

var _editingArea = null;
var _editingAreaIndex = -1;

var AREA_FORM_FIELDS = ['zone', 'area', 'member_single_multi', 'category', 'description', 'current'];

async function loadAreaDetail() {
  var id = getParam('id');
  var isNew = getParam('new');

  if (isNew) return;

  if (!id) { window.location.href = 'areas.html'; return; }

  var allRaw = await SheetsAPI.getAll(CONFIG.SHEETS.AREAS);
  _editingAreaIndex = findRowIndex(allRaw, 'area_id', id);
  if (_editingAreaIndex < 0) { showToast('Area not found', 'error'); return; }

  _editingArea = allRaw[_editingAreaIndex];
  var title = (_editingArea.zone || '') + ' — ' + (_editingArea.area || '');

  document.getElementById('page-title').textContent = title;
  document.getElementById('breadcrumb-name').textContent = title;
  document.title = title + ' — GenHub CRM';

  AREA_FORM_FIELDS.forEach(function(f) {
    var el = document.getElementById('f-' + f);
    if (!el) return;
    if (el.type === 'checkbox') {
      var v = (_editingArea[f] || '').toString().toLowerCase().trim();
      el.checked = v === 'true' || v === 'yes' || v === 'y' || v === '1' || v === 'x';
    } else {
      el.value = _editingArea[f] || '';
    }
  });

  document.getElementById('btn-delete').style.display = '';

  // Load linked accounts
  await loadLinkedAccountAreas(id);
}

async function loadLinkedAccountAreas(areaId) {
  var section = document.getElementById('accounts-section');
  if (!section) return;

  var data = await SheetsAPI.batchGet([CONFIG.SHEETS.ACCOUNT_AREAS, CONFIG.SHEETS.ACCOUNTS]);
  var links = (data.Account_Areas || []).filter(function(l) {
    return l.area_id === areaId && l.is_deleted !== 'TRUE';
  });
  var accounts = (data.Accounts || []).filter(function(a) { return a.is_deleted !== 'TRUE'; });
  var accountMap = {};
  accounts.forEach(function(a) { accountMap[a.account_id] = a; });

  section.style.display = '';

  var tbody = document.getElementById('accounts-tbody');
  if (!tbody) return;

  tbody.textContent = '';
  if (links.length === 0) {
    var tr = document.createElement('tr');
    var td = document.createElement('td');
    td.colSpan = 6;
    td.className = 'table-empty';
    td.textContent = 'No accounts linked to this area';
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  links.forEach(function(link) {
    var acct = accountMap[link.account_id] || {};
    var linkCurrent = (link.current || '').toString().toLowerCase().trim();
    var isCur = linkCurrent === 'true' || linkCurrent === 'yes' || linkCurrent === 'y' || linkCurrent === '1' || linkCurrent === 'x';

    var tr = document.createElement('tr');
    if (!isCur) {
      tr.style.opacity = '0.5';
      tr.style.background = 'var(--color-gray-100)';
    }
    tr.onclick = function() { window.location.href = 'account-detail.html?id=' + encodeURIComponent(link.account_id); };

    [acct.name || '', link.date_from || '', link.date_to || '', isCur ? 'Yes' : 'No'].forEach(function(val) {
      var td = document.createElement('td');
      td.textContent = val;
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });
}

function getAreaFormData() {
  var data = {};
  AREA_FORM_FIELDS.forEach(function(f) {
    var el = document.getElementById('f-' + f);
    if (!el) return;
    if (el.type === 'checkbox') {
      data[f] = el.checked ? 'TRUE' : 'FALSE';
    } else {
      data[f] = el.value.trim();
    }
  });
  return data;
}

async function saveArea() {
  var data = getAreaFormData();
  if (!data.area) { showToast('Area name is required', 'error'); return; }

  try {
    if (_editingArea) {
      var updated = Object.assign({}, _editingArea, data, { modified_by: CONFIG.CURRENT_USER, modified_at: nowISO() });
      await SheetsAPI.update(CONFIG.SHEETS.AREAS, _editingAreaIndex, updated);
      showToast('Area updated');
    } else {
      data.area_id = generateId('area');
      data.is_deleted = 'FALSE';
      data.created_by = CONFIG.CURRENT_USER;
      data.created_at = nowISO();
      data.modified_by = CONFIG.CURRENT_USER;
      data.modified_at = nowISO();
      await SheetsAPI.append(CONFIG.SHEETS.AREAS, data);
      showToast('Area created');
      setTimeout(function() { window.location.href = 'area-detail.html?id=' + encodeURIComponent(data.area_id); }, 500);
    }
  } catch (e) {
    showToast('Save failed: ' + e.message, 'error');
  }
}

async function deleteArea() {
  if (!_editingArea || _editingAreaIndex < 0) return;
  if (!confirm('Delete this area? It will be marked as deleted.')) return;

  try {
    var updated = Object.assign({}, _editingArea, { is_deleted: 'TRUE', modified_by: CONFIG.CURRENT_USER, modified_at: nowISO() });
    await SheetsAPI.update(CONFIG.SHEETS.AREAS, _editingAreaIndex, updated);
    showToast('Area deleted');
    setTimeout(function() { window.location.href = 'areas.html'; }, 500);
  } catch (e) {
    showToast('Delete failed: ' + e.message, 'error');
  }
}

// ─── Backfill area_id utility ───

async function backfillAreaIds() {
  var allRaw = await SheetsAPI.getAll(CONFIG.SHEETS.AREAS);
  var updates = [];
  allRaw.forEach(function(a, idx) {
    if (!a.area_id) {
      a.area_id = generateId('area');
      updates.push({ rowIndex: idx, data: a });
    }
  });

  if (updates.length === 0) {
    showToast('All areas already have IDs', 'info');
    return;
  }

  try {
    await SheetsAPI.batchUpdate(CONFIG.SHEETS.AREAS, updates);
    showToast(updates.length + ' area ID(s) generated');
  } catch (e) {
    showToast('Backfill failed: ' + e.message, 'error');
  }
}
