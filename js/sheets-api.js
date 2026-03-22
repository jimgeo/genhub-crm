/**
 * Sheets API wrapper for CRUD operations.
 * Reads use Google Sheets API v4 with API Key.
 * Writes use an Apps Script web app proxy.
 */
const SheetsAPI = {

  get _writeProxy() { return CONFIG.WRITE_PROXY_URL; },

  async _postToProxy(payload) {
    const response = await fetch(this._writeProxy, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(`Write proxy error: ${response.statusText}`);
    const result = await response.json();
    if (result.error) throw new Error(result.error);
    return result;
  },

  async getAll(sheetName) {
    const url = `${CONFIG.BASE_URL}/${CONFIG.SPREADSHEET_ID}/values/${sheetName}?key=${CONFIG.API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch ${sheetName}: ${response.statusText}`);
    const data = await response.json();
    if (!data.values || data.values.length < 2) return [];
    const headers = data.values[0];
    return data.values.slice(1).map(row => {
      const obj = {};
      headers.forEach((header, i) => { obj[header] = row[i] || ''; });
      return obj;
    });
  },

  async batchGet(sheetNames) {
    const ranges = sheetNames.map(s => encodeURIComponent(s)).join('&ranges=');
    const url = `${CONFIG.BASE_URL}/${CONFIG.SPREADSHEET_ID}/values:batchGet?ranges=${ranges}&key=${CONFIG.API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Batch get failed: ${response.statusText}`);
    const data = await response.json();
    const result = {};
    data.valueRanges.forEach((range, index) => {
      const sheetName = sheetNames[index];
      if (!range.values || range.values.length < 2) { result[sheetName] = []; return; }
      const headers = range.values[0];
      result[sheetName] = range.values.slice(1).map(row => {
        const obj = {};
        headers.forEach((header, i) => { obj[header] = row[i] || ''; });
        return obj;
      });
    });
    return result;
  },

  async append(sheetName, rowObject) {
    return this._postToProxy({ action: 'append', sheetName, data: rowObject });
  },

  async update(sheetName, rowIndex, rowObject) {
    return this._postToProxy({ action: 'update', sheetName, rowIndex, data: rowObject });
  },

  async batchUpdate(sheetName, updates) {
    return this._postToProxy({ action: 'batch_update', sheetName, updates });
  },

  async deleteRow(sheetName, rowIndex) {
    return this._postToProxy({ action: 'delete', sheetName, rowIndex });
  },

  _headerCache: null
};
