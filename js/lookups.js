/**
 * Lookups — loads configurable dropdown values from the Lookup sheet.
 *
 * Sheet structure: each column is a lookup name (e.g. "zone", "billing_type").
 * Rows below the header are the values for that lookup.
 *
 * Usage:
 *   await Lookups.load();
 *   Lookups.populate('zone', 'zone');
 *   Lookups.get('zone');  // returns ['Generator Hub', 'Quay', ...]
 */

const Lookups = (() => {
  let _data = {};
  let _loaded = false;

  async function load() {
    if (_loaded) return _data;
    try {
      const url = `${CONFIG.BASE_URL}/${CONFIG.SPREADSHEET_ID}/values/${CONFIG.SHEETS.LOOKUPS}?key=${CONFIG.API_KEY}`;
      const resp = await fetch(url);
      const json = await resp.json();
      const rows = json.values || [];
      if (rows.length === 0) return _data;

      const headers = rows[0];
      headers.forEach((header, colIndex) => {
        const key = header.trim();
        if (!key) return;
        const values = [];
        for (let r = 1; r < rows.length; r++) {
          const val = (rows[r][colIndex] || '').trim();
          if (val) values.push(val);
        }
        _data[key] = values;
      });

      _loaded = true;
    } catch (err) {
      console.error('Failed to load lookups:', err);
    }
    return _data;
  }

  function get(lookupName) {
    return _data[lookupName] || [];
  }

  function getAll() {
    return _data;
  }

  function populate(selectId, lookupName, opts) {
    opts = opts || {};
    const select = document.getElementById(selectId);
    if (!select) return;

    const currentValue = select.value;
    const values = get(lookupName);
    const placeholder = opts.placeholder !== undefined ? opts.placeholder : '';

    select.textContent = '';
    if (placeholder !== false) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = placeholder;
      select.appendChild(opt);
    }
    values.forEach(function(v) {
      const opt = document.createElement('option');
      opt.value = v;
      opt.textContent = v;
      select.appendChild(opt);
    });

    if (opts.preserveValue !== false && currentValue) {
      select.value = currentValue;
      if (select.value !== currentValue) {
        const opt = document.createElement('option');
        opt.value = currentValue;
        opt.textContent = currentValue;
        select.appendChild(opt);
        select.value = currentValue;
      }
    }
  }

  function populateFilter(selectId, lookupName, allLabel) {
    allLabel = allLabel || 'All';
    const select = document.getElementById(selectId);
    if (!select) return;

    const currentValue = select.value;
    const values = get(lookupName);

    select.textContent = '';
    const allOpt = document.createElement('option');
    allOpt.value = '';
    allOpt.textContent = allLabel;
    select.appendChild(allOpt);
    values.forEach(function(v) {
      const opt = document.createElement('option');
      opt.value = v;
      opt.textContent = v;
      select.appendChild(opt);
    });

    if (currentValue) select.value = currentValue;
  }

  return { load, get, getAll, populate, populateFilter };
})();
