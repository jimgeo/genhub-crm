/**
 * Lookups management page logic.
 * All rendered HTML uses escapeHtml() on user-supplied values.
 */

// --- State ---
var lookupsData = {};
var lookupsRaw = [];

// --- Load ---
async function loadLookups() {
  await CONFIG.initSecrets();
  try {
    var url = CONFIG.BASE_URL + '/' + CONFIG.SPREADSHEET_ID + '/values/' + CONFIG.SHEETS.LOOKUPS + '?key=' + CONFIG.API_KEY;
    var resp = await fetch(url);
    var json = await resp.json();
    lookupsRaw = json.values || [];

    if (lookupsRaw.length === 0) {
      document.getElementById('lookups-container').textContent = 'No lookups defined yet. Click "+ New Lookup" to create one.';
      return;
    }

    var headers = lookupsRaw[0];
    lookupsData = {};
    headers.forEach(function(header, colIndex) {
      var key = header.trim();
      if (!key) return;
      var values = [];
      for (var r = 1; r < lookupsRaw.length; r++) {
        var val = (lookupsRaw[r][colIndex] || '').trim();
        if (val) values.push(val);
      }
      lookupsData[key] = values;
    });

    renderLookups();
  } catch (err) {
    console.error('Failed to load lookups:', err);
    document.getElementById('lookups-container').textContent = 'Failed to load lookups. Check your connection.';
  }
}

// --- Render ---
function renderLookups() {
  var container = document.getElementById('lookups-container');
  var keys = Object.keys(lookupsData);

  if (keys.length === 0) {
    container.textContent = 'No lookups defined yet.';
    return;
  }

  container.textContent = '';
  keys.forEach(function(key) {
    var values = lookupsData[key];
    var card = document.createElement('div');
    card.className = 'lookup-card';

    // Header
    var header = document.createElement('div');
    header.className = 'lookup-card-header';
    var nameSpan = document.createElement('span');
    nameSpan.textContent = key;
    header.appendChild(nameSpan);
    var countSpan = document.createElement('span');
    countSpan.style.cssText = 'font-size:0.75rem;color:#888;font-weight:400;';
    countSpan.textContent = values.length + ' values';
    header.appendChild(countSpan);
    card.appendChild(header);

    // Body
    var body = document.createElement('div');
    body.className = 'lookup-card-body';

    values.forEach(function(v, i) {
      var item = document.createElement('div');
      item.className = 'lookup-item';
      item.draggable = true;
      item.dataset.key = key;
      item.dataset.index = i;
      item.addEventListener('dragstart', onDragStart);
      item.addEventListener('dragover', onDragOver);
      item.addEventListener('dragenter', onDragEnter);
      item.addEventListener('dragleave', onDragLeave);
      item.addEventListener('drop', onDrop);
      item.addEventListener('dragend', onDragEnd);

      var text = document.createElement('span');
      text.className = 'lookup-item-text';
      text.textContent = v;
      item.appendChild(text);

      var actions = document.createElement('span');
      actions.className = 'lookup-item-actions';

      var upBtn = document.createElement('button');
      upBtn.className = 'lookup-item-btn' + (i === 0 ? ' disabled' : '');
      upBtn.textContent = '\u25B2';
      upBtn.title = 'Move up';
      upBtn.addEventListener('click', (function(k, idx) { return function() { moveValue(k, idx, -1); }; })(key, i));
      actions.appendChild(upBtn);

      var downBtn = document.createElement('button');
      downBtn.className = 'lookup-item-btn' + (i === values.length - 1 ? ' disabled' : '');
      downBtn.textContent = '\u25BC';
      downBtn.title = 'Move down';
      downBtn.addEventListener('click', (function(k, idx) { return function() { moveValue(k, idx, 1); }; })(key, i));
      actions.appendChild(downBtn);

      var removeBtn = document.createElement('button');
      removeBtn.className = 'lookup-item-btn remove';
      removeBtn.textContent = '\u00D7';
      removeBtn.title = 'Remove';
      removeBtn.addEventListener('click', (function(k, idx) { return function() { removeValue(k, idx); }; })(key, i));
      actions.appendChild(removeBtn);

      item.appendChild(actions);
      body.appendChild(item);
    });

    // Add row
    var addRow = document.createElement('div');
    addRow.className = 'lookup-add-row';
    var addInput = document.createElement('input');
    addInput.type = 'text';
    addInput.id = 'add-' + key;
    addInput.placeholder = 'Add value...';
    addInput.addEventListener('keydown', (function(k) {
      return function(e) { if (e.key === 'Enter') addValue(k); };
    })(key));
    addRow.appendChild(addInput);

    var addBtn = document.createElement('button');
    addBtn.textContent = 'Add';
    addBtn.addEventListener('click', (function(k) { return function() { addValue(k); }; })(key));
    addRow.appendChild(addBtn);

    body.appendChild(addRow);
    card.appendChild(body);
    container.appendChild(card);
  });
}

// --- Save ---
async function saveAllLookups() {
  var keys = Object.keys(lookupsData);
  var maxRows = Math.max.apply(null, keys.map(function(k) { return lookupsData[k].length; }).concat([0]));

  var rows = [keys];
  for (var r = 0; r < maxRows; r++) {
    var row = keys.map(function(k) { return lookupsData[k][r] || ''; });
    rows.push(row);
  }

  try {
    var resp = await fetch(CONFIG.WRITE_PROXY_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'clear_and_write',
        sheetName: CONFIG.SHEETS.LOOKUPS,
        values: rows
      })
    });
    var result = await resp.json();
    if (result.error) throw new Error(result.error);
  } catch (err) {
    console.error('Failed to save lookups:', err);
    showToast('Failed to save lookups', 'error');
  }
}

// --- CRUD ---
async function addValue(key) {
  var input = document.getElementById('add-' + key);
  var value = input.value.trim();
  if (!value) return;

  lookupsData[key].push(value);
  input.value = '';
  renderLookups();
  await saveAllLookups();
  showToast('Added "' + value + '" to ' + key);
}

async function removeValue(key, index) {
  var removed = lookupsData[key].splice(index, 1);
  renderLookups();
  await saveAllLookups();
  showToast('Removed "' + removed[0] + '" from ' + key);
}

async function moveValue(key, index, direction) {
  var arr = lookupsData[key];
  var newIndex = index + direction;
  if (newIndex < 0 || newIndex >= arr.length) return;
  var tmp = arr[index];
  arr[index] = arr[newIndex];
  arr[newIndex] = tmp;
  renderLookups();
  await saveAllLookups();
}

// --- Drag and Drop ---
var dragKey = null, dragIndex = null;

function onDragStart(e) {
  dragKey = e.currentTarget.dataset.key;
  dragIndex = parseInt(e.currentTarget.dataset.index);
  e.currentTarget.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
}

function onDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
}

function onDragEnter(e) {
  e.preventDefault();
  var item = e.currentTarget;
  if (item.dataset.key === dragKey) item.classList.add('drag-over');
}

function onDragLeave(e) {
  e.currentTarget.classList.remove('drag-over');
}

function onDragEnd() {
  document.querySelectorAll('.lookup-item').forEach(function(el) {
    el.classList.remove('dragging', 'drag-over');
  });
  dragKey = null;
  dragIndex = null;
}

async function onDrop(e) {
  e.preventDefault();
  var targetKey = e.currentTarget.dataset.key;
  var targetIndex = parseInt(e.currentTarget.dataset.index);
  if (targetKey !== dragKey || targetIndex === dragIndex) {
    onDragEnd();
    return;
  }
  var arr = lookupsData[dragKey];
  var moved = arr.splice(dragIndex, 1)[0];
  arr.splice(targetIndex, 0, moved);
  renderLookups();
  await saveAllLookups();
}

// --- New Lookup ---
function addNewLookup() {
  document.getElementById('new-lookup-section').style.display = '';
  document.getElementById('new-lookup-name').focus();
}

function cancelNewLookup() {
  document.getElementById('new-lookup-section').style.display = 'none';
  document.getElementById('new-lookup-name').value = '';
}

async function createLookup() {
  var name = document.getElementById('new-lookup-name').value.trim().toLowerCase().replace(/\s+/g, '_');
  if (!name) {
    showToast('Please enter a lookup name', 'warning');
    return;
  }
  if (lookupsData[name]) {
    showToast('Lookup already exists', 'warning');
    return;
  }

  lookupsData[name] = [];
  cancelNewLookup();
  renderLookups();
  await saveAllLookups();
  showToast('Created lookup "' + name + '"');
}
