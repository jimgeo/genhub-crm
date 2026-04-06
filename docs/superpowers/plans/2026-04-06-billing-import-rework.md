# Billing Import Rework — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework the billing import to support a new Category column, a Billing_Agreement table that abstracts row-level metadata, a slimmed Billing table, column-name-based parsing, and updated import logic (zero amounts create records, text cells become notes, duplicates reported but not blocked, Additional category imported first).

**Architecture:** The import now creates two types of records: one Billing_Agreement per spreadsheet row (holding account, zone, area, category, type, notes, payment_notes) and one Billing record per non-blank monthly cell (holding agreement_id, month, year, amount, notes). Column matching is by header name, not position. The billing report page (billing.html) must join Billing_Agreement + Billing to display data.

**Tech Stack:** Vanilla JS, XLSX.js, Google Sheets API v4, Apps Script proxy

---

### Task 1: Add BILLING_AGREEMENTS to CONFIG.SHEETS

**Files:**
- Modify: `js/config.js:6-14`

- [ ] **Step 1: Add the new sheet name**

In `js/config.js`, add `BILLING_AGREEMENTS: 'Billing_Agreement'` to the SHEETS object:

```javascript
SHEETS: {
    ACCOUNTS: 'Accounts',
    CONTACTS: 'Contacts',
    USERS: 'Users',
    LOOKUPS: 'Lookup',
    AREAS: 'Area',
    ACCOUNT_AREAS: 'Account_Areas',
    BILLING: 'Billing',
    BILLING_AGREEMENTS: 'Billing_Agreement'
},
```

- [ ] **Step 2: Commit**

```bash
git add js/config.js
git commit -m "Add Billing_Agreement sheet to CONFIG.SHEETS"
```

---

### Task 2: Update import-billing.html UI text

**Files:**
- Modify: `import-billing.html:108-147` (Expected Format and Import Logic tables)

- [ ] **Step 1: Replace the Expected Format table**

Replace the existing Expected Format table (lines 118-131) with:

```html
<h4 class="card-title" style="margin-bottom:12px;">Expected Format</h4>
<p style="font-size:12px;color:var(--color-gray-500);margin-bottom:8px;">Columns are matched by header name, not position. The following headers are expected:</p>
<table class="mapping-table">
  <thead><tr><th>Column Header</th><th>Maps To</th><th>Notes</th></tr></thead>
  <tbody>
    <tr><td>Account</td><td><span class="tag tag-billing">Agreement</span> account_id</td><td>Matched to Accounts by name before first bracket. Skipped for Additional category.</td></tr>
    <tr><td>Type</td><td><span class="tag tag-billing">Agreement</span> type</td><td><code>old</code> = cancelled, <code>Upcoming</code>, <code>Notice given</code>, blank = active</td></tr>
    <tr><td>Legacy desk names</td><td><span class="tag tag-ignore">Ignore</span></td><td>Ignored during import</td></tr>
    <tr><td>Category</td><td><span class="tag tag-billing">Agreement</span> category</td><td><code>Additional</code> = skip account matching. <code>Agreement</code> = normal. <code>Title</code> / <code>Totals</code> / blank = skip row.</td></tr>
    <tr><td>Zone</td><td><span class="tag tag-billing">Agreement</span> zone</td><td rowspan="2">Zone + Area matched to Area sheet for area_id lookup. Rows import even if no match found.</td></tr>
    <tr><td>Area</td><td><span class="tag tag-billing">Agreement</span> area</td></tr>
    <tr><td>Notes</td><td><span class="tag tag-billing">Agreement</span> notes</td><td>Row-level notes stored on the agreement</td></tr>
    <tr><td>Payment Notes</td><td><span class="tag tag-billing">Agreement</span> payment_notes</td><td>Row-level payment notes stored on the agreement</td></tr>
    <tr><td><em>Month columns</em> (JAN–DEC)</td><td><span class="tag tag-billing">Billing</span> amount</td><td>Row below header = year. One billing record per non-blank cell. Zero amounts create a record. Text cells create a record with the text stored in billing notes.</td></tr>
  </tbody>
</table>
```

- [ ] **Step 2: Replace the Import Logic table**

Replace the existing Import Logic table (lines 133-147) with:

```html
<h4 class="card-title" style="margin-bottom:12px;">Import Logic</h4>
<table class="mapping-table">
  <thead><tr><th>Rule</th><th>Logic</th></tr></thead>
  <tbody>
    <tr><td>Column matching</td><td>Columns are matched by header name (row 1 of the spreadsheet), not by position. Month columns are identified by matching JAN–DEC.</td></tr>
    <tr><td>Category handling</td><td><strong>Additional</strong> — imports without account matching (account_id left blank). <strong>Agreement</strong> — normal account matching. <strong>Title / Totals / blank</strong> — row skipped entirely.</td></tr>
    <tr><td>Account matching</td><td>Account name matched on text <strong>before the first bracket</strong>. E.g. "Geo.me Solutions (Jim Strong)" matches "Geo.me Solutions". Case-insensitive. Only for Agreement category rows.</td></tr>
    <tr><td>Area matching</td><td>Zone + Area matched against Area sheet. If no match found, row still imports but area_id is left blank (can be reconciled later).</td></tr>
    <tr><td>Zero amounts</td><td>Cells containing 0 <strong>do</strong> create a billing record with amount = 0.</td></tr>
    <tr><td>Blank cells</td><td>Completely blank/empty cells do <strong>not</strong> create a billing record.</td></tr>
    <tr><td>Text cells</td><td>If a monthly cell contains text instead of a number, a billing record is created with amount = 0 and the text stored in the billing notes field.</td></tr>
    <tr><td>Billing Agreement</td><td>One agreement record is created per spreadsheet row, holding account, zone, area, category, type, notes, and payment notes. Billing records link to the agreement via agreement_id.</td></tr>
    <tr><td>Import order</td><td>Additional category rows are imported first, then Agreement category rows.</td></tr>
    <tr><td>Duplicates</td><td>Duplicates are <strong>allowed</strong> (not blocked). The preflight report highlights potential duplicates as a warning for review before importing.</td></tr>
    <tr><td>No deletes</td><td>Billing records are never deleted during import. Type field tracks lifecycle.</td></tr>
  </tbody>
</table>
```

- [ ] **Step 3: Also update the intro paragraph**

Replace line 108-110:

```html
<p style="font-size:13px;color:var(--color-gray-500);margin-bottom:16px;">
  Upload the Monthly Expected Forecast .xlsx file. Each row creates a Billing Agreement record, and each non-blank monthly cell creates a linked Billing record. Columns are matched by header name. Additional category rows are imported first.
</p>
```

- [ ] **Step 4: Commit**

```bash
git add import-billing.html
git commit -m "Update import-billing UI text for new Category/Agreement structure"
```

---

### Task 3: Rewrite parseExcel to use column header names

**Files:**
- Modify: `import-billing.html` (the `<script>` section, lines 194-270)

- [ ] **Step 1: Update state variables**

Replace the state section (lines 196-206) with:

```javascript
// ─── State ───
var parsedRows = [];          // { account, accountClean, type, category, zone, area, notes, paymentNotes, months: [{ month, year, amount, cellNotes }] }
var accountIdMap = {};        // lowercase name -> account_id
var areaIdMap = {};           // "zone||area" lowercase -> area_id
var unmatchedAccounts = new Set();
var unmatchedAreas = new Set();
var existingAgreementKeys = new Set(); // for duplicate detection reporting
var BATCH_SIZE = 100;
var MAX_RETRIES = 3;
var BATCH_DELAY_MS = 500;
var VALID_MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
var SKIP_CATEGORIES = ['title', 'totals', ''];
```

- [ ] **Step 2: Rewrite parseExcel with column-name matching**

Replace the `parseExcel` function with:

```javascript
function parseExcel(data) {
  var wb = XLSX.read(data, { type: 'array' });
  var ws = wb.Sheets[wb.SheetNames[0]];
  var range = XLSX.utils.decode_range(ws['!ref']);

  // Row 0 = headers (column names + month names)
  // Build header map: header name (lowercase) -> column index
  var headerMap = {};
  for (var c = 0; c <= range.e.c; c++) {
    var cell = ws[XLSX.utils.encode_cell({ r: 0, c: c })];
    if (cell) {
      headerMap[String(cell.v).trim().toLowerCase()] = c;
    }
  }

  // Find fixed columns by name
  var colAccount = headerMap['account'];
  var colType = headerMap['type'];
  var colCategory = headerMap['category'];
  var colZone = headerMap['zone'];
  var colArea = headerMap['area'];
  var colNotes = headerMap['notes'];
  var colPaymentNotes = headerMap['payment notes'];

  // Find month columns: header matches JAN-DEC, row 1 has the year
  var monthCols = [];
  for (var c = 0; c <= range.e.c; c++) {
    var hCell = ws[XLSX.utils.encode_cell({ r: 0, c: c })];
    if (!hCell) continue;
    var hVal = String(hCell.v).trim().toUpperCase();
    if (VALID_MONTHS.indexOf(hVal) === -1) continue;
    var yCell = ws[XLSX.utils.encode_cell({ r: 1, c: c })];
    var year = yCell ? String(Math.floor(Number(yCell.v))) : '';
    if (!year || year === 'NaN') continue;
    monthCols.push({ c: c, month: hVal, year: year });
  }

  function getCellStr(r, colIdx) {
    if (colIdx == null) return '';
    var cell = ws[XLSX.utils.encode_cell({ r: r, c: colIdx })];
    return cell ? String(cell.v).trim() : '';
  }

  parsedRows = [];
  for (var r = 2; r <= range.e.r; r++) {
    var category = getCellStr(r, colCategory).toLowerCase();
    // Skip Title, Totals, and blank category rows
    if (SKIP_CATEGORIES.indexOf(category) !== -1) continue;

    var account = getCellStr(r, colAccount);
    if (!account && category !== 'additional') continue;

    var accountClean = cleanAccountName(account);
    var type = getCellStr(r, colType);
    var zone = getCellStr(r, colZone);
    var area = getCellStr(r, colArea);
    var notes = getCellStr(r, colNotes);
    var paymentNotes = getCellStr(r, colPaymentNotes);

    // Build monthly data for this row
    var months = [];
    for (var mi = 0; mi < monthCols.length; mi++) {
      var mc = monthCols[mi];
      var cell = ws[XLSX.utils.encode_cell({ r: r, c: mc.c })];
      if (!cell) continue; // blank cell — no record

      var rawVal = cell.v;
      var amount = 0;
      var cellNotes = '';

      if (typeof rawVal === 'number') {
        amount = Math.round(rawVal * 100) / 100;
      } else if (typeof rawVal === 'string' && rawVal.trim() !== '') {
        // Text cell — create record with amount 0, text as notes
        amount = 0;
        cellNotes = rawVal.trim();
      } else {
        continue; // other non-value cell types — skip
      }

      months.push({ month: mc.month, year: mc.year, amount: amount, cellNotes: cellNotes });
    }

    if (months.length === 0) continue; // no monthly data at all

    parsedRows.push({
      account: account,
      accountClean: accountClean,
      type: type,
      category: category,
      zone: zone,
      area: area,
      notes: notes,
      paymentNotes: paymentNotes,
      months: months
    });
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add import-billing.html
git commit -m "Rewrite parseExcel for column-name matching and new Category/Agreement structure"
```

---

### Task 4: Rewrite preflight for new logic

**Files:**
- Modify: `import-billing.html` (the `runPreflight` and `showPreflight` functions)

- [ ] **Step 1: Rewrite runPreflight**

Replace `runPreflight` with:

```javascript
async function runPreflight() {
  var data = await SheetsAPI.batchGet([
    CONFIG.SHEETS.ACCOUNTS, CONFIG.SHEETS.AREAS, CONFIG.SHEETS.BILLING_AGREEMENTS
  ]);

  var accounts = (data.Accounts || []).filter(function(a) { return a.is_deleted !== 'TRUE'; });
  var areas = (data.Area || []).filter(function(a) { return a.is_deleted !== 'TRUE'; });
  var existingAgreements = data.Billing_Agreement || [];

  // Build account lookup
  accountIdMap = {};
  accounts.forEach(function(a) {
    accountIdMap[a.name.toLowerCase().trim()] = a.account_id;
  });

  // Build area lookup
  areaIdMap = {};
  var areasWithoutId = 0;
  areas.forEach(function(a) {
    var key = (a.zone || '').toLowerCase().trim() + '||' + (a.area || '').toLowerCase().trim();
    if (a.area_id) {
      areaIdMap[key] = a.area_id;
    } else {
      areasWithoutId++;
    }
  });
  if (areasWithoutId > 0) {
    console.warn('[preflight] ' + areasWithoutId + ' areas have no area_id — run Backfill Area IDs in Settings first');
  }

  // Build existing agreement keys for duplicate detection (reporting only)
  existingAgreementKeys = new Set();
  existingAgreements.forEach(function(a) {
    if (a.is_deleted === 'TRUE') return;
    var key = (a.account_name || '').toLowerCase().trim() + '|' + (a.zone || '').toLowerCase().trim() + '|' + (a.area || '').toLowerCase().trim() + '|' + (a.category || '').toLowerCase().trim();
    existingAgreementKeys.add(key);
  });

  // Match and flag issues
  unmatchedAccounts = new Set();
  unmatchedAreas = new Set();
  var matchedAccounts = new Set();
  var matchedAreas = new Set();
  var dupeCount = 0;
  var totalBillingRecords = 0;

  parsedRows.forEach(function(row) {
    var isAdditional = row.category === 'additional';
    var acctKey = row.accountClean.toLowerCase().trim();
    var areaKey = row.zone.toLowerCase().trim() + '||' + row.area.toLowerCase().trim();
    var acctId = isAdditional ? '' : (accountIdMap[acctKey] || '');
    var areaId = areaIdMap[areaKey] || '';

    if (!isAdditional) {
      if (acctId) matchedAccounts.add(acctKey);
      else if (row.accountClean) unmatchedAccounts.add(row.accountClean);
    }

    if (areaId) matchedAreas.add(areaKey);
    else if (row.zone || row.area) unmatchedAreas.add(row.zone + ' / ' + row.area);

    // Duplicate detection (report only)
    var dupeKey = (row.accountClean || '').toLowerCase().trim() + '|' + row.zone.toLowerCase().trim() + '|' + row.area.toLowerCase().trim() + '|' + row.category;
    if (existingAgreementKeys.has(dupeKey)) {
      dupeCount++;
    }

    totalBillingRecords += row.months.length;
  });

  showPreflight(matchedAccounts.size, unmatchedAccounts, matchedAreas.size, unmatchedAreas, parsedRows.length, totalBillingRecords, dupeCount);
}
```

- [ ] **Step 2: Update showPreflight for new stats and duplicate warning**

Replace `showPreflight` with:

```javascript
function showPreflight(matchedAccts, unmatchedAccts, matchedAreas, unmatchedAreaSet, agreementCount, billingCount, dupeCount) {
  showStep('step-preflight');
  var container = document.getElementById('preflight-results');
  container.textContent = '';

  // Accounts section
  addPreflightSection(container, 'Accounts',
    matchedAccts + ' matched',
    unmatchedAccts.size > 0 ? unmatchedAccts.size + ' unmatched (rows will import without account_id)' : 'All matched',
    unmatchedAccts.size > 0 ? 'warn' : 'ok',
    unmatchedAccts.size > 0 ? Array.from(unmatchedAccts).sort() : null
  );

  // Areas section
  addPreflightSection(container, 'Areas',
    matchedAreas + ' matched',
    unmatchedAreaSet.size > 0 ? unmatchedAreaSet.size + ' unmatched (rows will import without area_id — reconcile later)' : 'All matched',
    unmatchedAreaSet.size > 0 ? 'warn' : 'ok',
    unmatchedAreaSet.size > 0 ? Array.from(unmatchedAreaSet).sort() : null
  );

  // Duplicates section
  if (dupeCount > 0) {
    addPreflightSection(container, 'Potential Duplicates',
      dupeCount + ' agreement(s) match existing records (same account + zone + area + category)',
      'These will still be imported — review if unexpected',
      'warn',
      null
    );
  }

  // Stats
  var statsEl = document.getElementById('import-stats');
  statsEl.textContent = '';
  var stats = [
    { val: agreementCount, lbl: 'Agreements' },
    { val: billingCount, lbl: 'Billing Records' },
    { val: dupeCount, lbl: 'Potential Dupes' }
  ];
  stats.forEach(function(s) {
    var div = document.createElement('div');
    div.className = 'import-stat';
    var valDiv = document.createElement('div');
    valDiv.className = 'val';
    valDiv.textContent = s.val;
    var lblDiv = document.createElement('div');
    lblDiv.className = 'lbl';
    lblDiv.textContent = s.lbl;
    div.appendChild(valDiv);
    div.appendChild(lblDiv);
    statsEl.appendChild(div);
  });

  document.getElementById('btn-import').disabled = (agreementCount === 0);
}
```

- [ ] **Step 3: Commit**

```bash
git add import-billing.html
git commit -m "Rewrite preflight for Agreement structure and duplicate reporting"
```

---

### Task 5: Rewrite runImport for Agreement + Billing two-table writes

**Files:**
- Modify: `import-billing.html` (the `runImport` and `showSummary` functions)

- [ ] **Step 1: Rewrite runImport**

Replace `runImport` with:

```javascript
async function runImport() {
  showStep('step-progress');

  var logEl = document.getElementById('progress-log');
  var barEl = document.getElementById('progress-bar');
  var textEl = document.getElementById('progress-text');
  logEl.textContent = '';

  var importedAgreements = 0;
  var importedBilling = 0;
  var errors = 0;

  function log(msg, type) {
    var ts = new Date().toLocaleTimeString('en-GB');
    var span = document.createElement('span');
    span.className = 'log-' + (type || 'success');
    span.textContent = '[' + ts + '] ' + msg;
    logEl.appendChild(span);
    logEl.appendChild(document.createElement('br'));
    logEl.scrollTop = logEl.scrollHeight;
  }

  function delay(ms) { return new Promise(function(resolve) { setTimeout(resolve, ms); }); }

  // Sort: Additional first, then Agreement
  var sorted = parsedRows.slice().sort(function(a, b) {
    if (a.category === 'additional' && b.category !== 'additional') return -1;
    if (a.category !== 'additional' && b.category === 'additional') return 1;
    return 0;
  });

  // Build all agreement and billing records
  var agreementRecords = [];
  var billingRecords = [];

  sorted.forEach(function(row) {
    var isAdditional = row.category === 'additional';
    var acctKey = row.accountClean.toLowerCase().trim();
    var areaKey = row.zone.toLowerCase().trim() + '||' + row.area.toLowerCase().trim();
    var acctId = isAdditional ? '' : (accountIdMap[acctKey] || '');
    var areaId = areaIdMap[areaKey] || '';

    var agreementId = generateId('agr');

    agreementRecords.push({
      agreement_id: agreementId,
      account_id: acctId,
      account_name: row.accountClean,
      category: row.category,
      type: row.type,
      zone: row.zone,
      area: row.area,
      area_id: areaId,
      notes: row.notes,
      payment_notes: row.paymentNotes,
      is_deleted: 'FALSE',
      created_by: CONFIG.CURRENT_USER,
      created_at: nowISO()
    });

    row.months.forEach(function(m) {
      billingRecords.push({
        billing_id: generateId('bill'),
        agreement_id: agreementId,
        month: m.month,
        year: m.year,
        amount: String(m.amount),
        notes: m.cellNotes,
        is_deleted: 'FALSE',
        created_by: CONFIG.CURRENT_USER,
        created_at: nowISO()
      });
    });
  });

  var totalOps = agreementRecords.length + billingRecords.length;
  var completedOps = 0;

  function updateProgress() {
    var pct = totalOps > 0 ? Math.round((completedOps / totalOps) * 100) : 0;
    barEl.style.width = pct + '%';
    textEl.textContent = 'Importing: ' + completedOps + ' of ' + totalOps + ' records (' + pct + '%)';
  }

  // Helper: batch-write records to a sheet
  async function batchWrite(sheetName, records, label) {
    var totalBatches = Math.ceil(records.length / BATCH_SIZE);
    for (var i = 0; i < records.length; i += BATCH_SIZE) {
      var batch = records.slice(i, i + BATCH_SIZE);
      var batchNum = Math.floor(i / BATCH_SIZE) + 1;
      var success = false;

      for (var attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          await SheetsAPI.batchAppend(sheetName, batch);
          completedOps += batch.length;
          if (label === 'Agreements') importedAgreements += batch.length;
          else importedBilling += batch.length;
          log(label + ' batch ' + batchNum + '/' + totalBatches + ': ' + batch.length + ' records', 'success');
          success = true;
          break;
        } catch (e) {
          if (attempt < MAX_RETRIES) {
            log(label + ' batch ' + batchNum + ' attempt ' + attempt + ' failed, retrying in 2s... (' + e.message + ')', 'info');
            await delay(2000);
          } else {
            errors += batch.length;
            completedOps += batch.length;
            log('FAILED ' + label + ' batch ' + batchNum + ' after ' + MAX_RETRIES + ' attempts: ' + e.message, 'error');
          }
        }
      }

      updateProgress();
      if (i + BATCH_SIZE < records.length) await delay(BATCH_DELAY_MS);
    }
  }

  // Phase 1: Write agreements
  log('Importing ' + agreementRecords.length + ' agreements...', 'info');
  await batchWrite(CONFIG.SHEETS.BILLING_AGREEMENTS, agreementRecords, 'Agreements');

  // Phase 2: Write billing records
  log('Importing ' + billingRecords.length + ' billing records...', 'info');
  await batchWrite(CONFIG.SHEETS.BILLING, billingRecords, 'Billing');

  log('Import complete!', 'info');
  showSummary(importedAgreements, importedBilling, errors);
}
```

- [ ] **Step 2: Update showSummary**

Replace `showSummary` with:

```javascript
function showSummary(agreements, billing, errors) {
  showStep('step-summary');
  var el = document.getElementById('summary-cards');
  el.textContent = '';
  var cards = [
    { val: agreements, lbl: 'Agreements Created' },
    { val: billing, lbl: 'Billing Records Created' }
  ];
  if (errors > 0) cards.push({ val: errors, lbl: 'Errors', cls: 'err' });

  cards.forEach(function(c) {
    var div = document.createElement('div');
    div.className = 'summary-card' + (c.cls ? ' ' + c.cls : '');
    var valDiv = document.createElement('div');
    valDiv.className = 'val';
    valDiv.textContent = c.val;
    var lblDiv = document.createElement('div');
    lblDiv.className = 'lbl';
    lblDiv.textContent = c.lbl;
    div.appendChild(valDiv);
    div.appendChild(lblDiv);
    el.appendChild(div);
  });
}
```

- [ ] **Step 3: Update resetImport**

Replace `resetImport` with:

```javascript
function resetImport() {
  parsedRows = [];
  unmatchedAccounts = new Set();
  unmatchedAreas = new Set();
  existingAgreementKeys = new Set();
  document.getElementById('dropArea').classList.remove('has-file');
  var label = document.getElementById('dropLabel');
  label.textContent = '';
  var strong = document.createElement('strong');
  strong.textContent = 'Click to select';
  label.appendChild(strong);
  label.appendChild(document.createTextNode(' or drag & drop your .xlsx file'));
  document.getElementById('fileInput').value = '';
  showStep('step-upload');
}
```

- [ ] **Step 4: Update handleFile to use parsedRows**

In `handleFile`, change `parsedBillingRows` reference to `parsedRows`:

```javascript
function handleFile(file) {
  if (!file) return;
  var reader = new FileReader();
  reader.onload = async function(e) {
    parseExcel(new Uint8Array(e.target.result));
    if (parsedRows.length === 0) {
      showToast('No billing data found', 'error');
      return;
    }
    await runPreflight();
  };
  reader.readAsArrayBuffer(file);
  document.getElementById('dropArea').classList.add('has-file');
  document.getElementById('dropLabel').textContent = file.name;
}
```

- [ ] **Step 5: Commit**

```bash
git add import-billing.html
git commit -m "Rewrite import to create Agreement + Billing records with new logic"
```

---

### Task 6: Update billing.html to join Billing_Agreement + Billing

**Files:**
- Modify: `billing.html:90-177` (the `loadBilling` function)

The Billing table no longer has account_name, zone, area, or type. These now live on Billing_Agreement. The report must join the two tables.

- [ ] **Step 1: Update loadBilling to fetch and join agreements**

Replace `loadBilling` with:

```javascript
async function loadBilling() {
  var data = await SheetsAPI.batchGet([
    CONFIG.SHEETS.BILLING, CONFIG.SHEETS.BILLING_AGREEMENTS,
    CONFIG.SHEETS.ACCOUNTS, CONFIG.SHEETS.AREAS
  ]);
  var billing = (data.Billing || []).filter(function(b) { return b.is_deleted !== 'TRUE'; });
  var agreements = (data.Billing_Agreement || []).filter(function(a) { return a.is_deleted !== 'TRUE'; });
  var accounts = (data.Accounts || []).filter(function(a) { return a.is_deleted !== 'TRUE'; });
  var areas = (data.Area || []).filter(function(a) { return a.is_deleted !== 'TRUE'; });

  // Build agreement lookup
  var agreementMap = {};
  agreements.forEach(function(a) { agreementMap[a.agreement_id] = a; });

  var acctNames = {};
  accounts.forEach(function(a) { acctNames[a.account_id] = a.name; });

  // Build area category lookup
  var areaCategoryMap = {};
  areas.forEach(function(a) {
    var key = (a.zone || '').toLowerCase() + '|' + (a.area || '').toLowerCase();
    areaCategoryMap[key] = (a.category || '').toLowerCase().trim();
  });

  var colSet = {};
  var rowMap = {};

  billing.forEach(function(b) {
    var agr = agreementMap[b.agreement_id] || {};
    var acctName = agr.account_name || acctNames[agr.account_id] || '';
    var zone = agr.zone || '';
    var area = agr.area || '';
    var type = (agr.type || '').toLowerCase().trim();
    var category = (agr.category || '').toLowerCase().trim();
    var month = (b.month || '').toUpperCase();
    var year = b.year || '';
    var amount = parseFloat(b.amount) || 0;
    if (!month || !year) return;

    var colKey = month + ' ' + year;
    colSet[colKey] = { month: month, year: year };

    var rowKey = acctName.toLowerCase() + '|' + zone.toLowerCase() + '|' + area.toLowerCase();
    var areaKey = zone.toLowerCase() + '|' + area.toLowerCase();
    if (!rowMap[rowKey]) {
      rowMap[rowKey] = { account_name: acctName, zone: zone, area: area, type: type, category: category || areaCategoryMap[areaKey] || '', amounts: {} };
    }
    if (type === 'old') rowMap[rowKey].type = 'old';
    rowMap[rowKey].amounts[colKey] = (rowMap[rowKey].amounts[colKey] || 0) + amount;
  });

  var monthOrder = { JAN:1, FEB:2, MAR:3, APR:4, MAY:5, JUN:6, JUL:7, AUG:8, SEP:9, OCT:10, NOV:11, DEC:12 };
  allCols = Object.keys(colSet).sort(function(a, b) {
    var ca = colSet[a], cb = colSet[b];
    var d = parseInt(cb.year) - parseInt(ca.year);
    if (d !== 0) return d;
    return (monthOrder[cb.month] || 0) - (monthOrder[ca.month] || 0);
  });

  // Inject vacant rows for current areas with no active billing
  var activeAreaKeys = {};
  Object.values(rowMap).forEach(function(r) {
    if (r.type !== 'old') {
      activeAreaKeys[(r.zone || '').toLowerCase() + '|' + (r.area || '').toLowerCase()] = true;
    }
  });
  areas.forEach(function(a) {
    var cur = (a.current || '').toString().toLowerCase().trim();
    if (cur !== 'true' && cur !== 'yes' && cur !== 'y' && cur !== '1' && cur !== 'x') return;
    var key = (a.zone || '').toLowerCase() + '|' + (a.area || '').toLowerCase();
    if (!activeAreaKeys[key]) {
      var rowKey = '(vacant)|' + key;
      if (!rowMap[rowKey]) {
        rowMap[rowKey] = { account_name: '(vacant)', zone: a.zone || '', area: a.area || '', type: 'vacant', category: (a.category || '').toLowerCase().trim(), amounts: {} };
      }
    }
  });

  var zoneOrder = Lookups.get('zone');
  allRows = Object.values(rowMap).sort(function(a, b) {
    var ai = zoneOrder.indexOf(a.zone);
    var bi = zoneOrder.indexOf(b.zone);
    if (ai === -1 && bi === -1) {
      var zc = a.zone.localeCompare(b.zone);
      if (zc !== 0) return zc;
    } else {
      if (ai === -1) ai = 9999;
      if (bi === -1) bi = 9999;
      if (ai !== bi) return ai - bi;
    }
    return a.area.localeCompare(b.area)
      || a.account_name.localeCompare(b.account_name);
  });

  renderTable();
}
```

- [ ] **Step 2: Commit**

```bash
git add billing.html
git commit -m "Update billing report to join Billing_Agreement + Billing tables"
```

---

### Task 7: Verify and test end-to-end

- [ ] **Step 1: Run local dev server**

```bash
npm run dev
```

- [ ] **Step 2: Verify import-billing.html loads**

Open the import billing page. Confirm:
- Updated Expected Format table shows new columns (Category, Payment Notes)
- Updated Import Logic table reflects all new rules
- Intro paragraph updated

- [ ] **Step 3: Test with a sample .xlsx file from INBOX/**

Upload one of the test files from `INBOX/`. Confirm:
- Column headers are detected by name
- Preflight shows matched/unmatched accounts and areas
- Duplicate warning appears if applicable
- Stats show agreement count and billing record count
- Import button works

- [ ] **Step 4: Verify billing.html still renders**

Open the billing report page. Confirm it loads data by joining Billing_Agreement with Billing records.

- [ ] **Step 5: Final commit if any fixes needed**

```bash
git add -A
git commit -m "Fix any issues found during testing"
```
