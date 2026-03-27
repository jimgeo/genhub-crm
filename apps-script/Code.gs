/**
 * GenHub CRM — Apps Script Write Proxy
 *
 * SETUP:
 * 1. Open your GenHub CRM Google Spreadsheet
 * 2. Go to Extensions → Apps Script
 * 3. Delete the default code and paste this entire file
 * 4. Click Deploy → New deployment
 * 5. Type: Web app
 * 6. Execute as: Me
 * 7. Who has access: Anyone
 * 8. Click Deploy and copy the URL
 * 9. Set that URL as WRITE_PROXY_URL in Cloudflare Pages env vars
 */

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(payload.sheetName);

    if (!sheet) {
      return jsonResponse({ error: 'Sheet not found: ' + payload.sheetName });
    }

    var action = payload.action;

    if (action === 'append') {
      return appendRow(sheet, payload.data);
    } else if (action === 'update') {
      return updateRow(sheet, payload.rowIndex, payload.data);
    } else if (action === 'batch_update') {
      return batchUpdate(sheet, payload.updates);
    } else if (action === 'batch_append') {
      return batchAppend(sheet, payload.rows);
    } else if (action === 'delete') {
      return deleteRow(sheet, payload.rowIndex);
    } else if (action === 'clear_and_write') {
      return clearAndWrite(sheet, payload.values);
    } else {
      return jsonResponse({ error: 'Unknown action: ' + action });
    }
  } catch (err) {
    return jsonResponse({ error: err.toString() });
  }
}

function appendRow(sheet, data) {
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var row = headers.map(function(h) { return data[h] || ''; });
  sheet.appendRow(row);
  return jsonResponse({ success: true, action: 'append' });
}

function batchAppend(sheet, rows) {
  if (!rows || !rows.length) return jsonResponse({ success: true, action: 'batch_append', count: 0 });
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var grid = rows.map(function(data) {
    return headers.map(function(h) { return data[h] || ''; });
  });
  var startRow = sheet.getLastRow() + 1;
  sheet.getRange(startRow, 1, grid.length, headers.length).setValues(grid);
  return jsonResponse({ success: true, action: 'batch_append', count: rows.length });
}

function updateRow(sheet, rowIndex, data) {
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var row = headers.map(function(h) { return data[h] !== undefined ? data[h] : ''; });
  // rowIndex is 0-based data index; +2 for header row + 1-based
  sheet.getRange(rowIndex + 2, 1, 1, row.length).setValues([row]);
  return jsonResponse({ success: true, action: 'update' });
}

function batchUpdate(sheet, updates) {
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  updates.forEach(function(u) {
    var row = headers.map(function(h) { return u.data[h] !== undefined ? u.data[h] : ''; });
    sheet.getRange(u.rowIndex + 2, 1, 1, row.length).setValues([row]);
  });
  return jsonResponse({ success: true, action: 'batch_update', count: updates.length });
}

function deleteRow(sheet, rowIndex) {
  sheet.deleteRow(rowIndex + 2);
  return jsonResponse({ success: true, action: 'delete' });
}

function clearAndWrite(sheet, values) {
  if (!values || !values.length) return jsonResponse({ error: 'No values provided' });
  sheet.clear();
  sheet.getRange(1, 1, values.length, values[0].length).setValues(values);
  return jsonResponse({ success: true, action: 'clear_and_write', rows: values.length });
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// Required for CORS preflight
function doGet(e) {
  return jsonResponse({ status: 'GenHub CRM Write Proxy is running' });
}
