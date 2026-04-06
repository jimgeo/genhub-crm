const CONFIG = {
  API_KEY: '',
  SPREADSHEET_ID: '',
  WRITE_PROXY_URL: '',

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

  BASE_URL: 'https://sheets.googleapis.com/v4/spreadsheets',
  CURRENT_USER: 'Test',
  USER_EMAIL: '',
  USER_PHOTO: '',

  _secretsReady: null,

  async initSecrets() {
    if (this._secretsReady) return this._secretsReady;
    this._secretsReady = (async () => {
      try {
        const res = await fetch('/api/config');
        if (res.ok) {
          const secrets = await res.json();
          CONFIG.API_KEY = secrets.API_KEY || CONFIG.API_KEY;
          CONFIG.SPREADSHEET_ID = secrets.SPREADSHEET_ID || CONFIG.SPREADSHEET_ID;
          CONFIG.WRITE_PROXY_URL = secrets.WRITE_PROXY_URL || CONFIG.WRITE_PROXY_URL;
        }
      } catch (e) {
        console.warn('[config] Could not fetch secrets from /api/config — using fallbacks');
      }
    })();
    return this._secretsReady;
  },

  async initUser() {
    try {
      const res = await fetch('/cdn-cgi/access/get-identity');
      if (res.ok) {
        const identity = await res.json();
        CONFIG.CURRENT_USER = identity.name || identity.email.split('@')[0];
        CONFIG.USER_EMAIL = identity.email;
        CONFIG.USER_PHOTO = (identity.oidc_fields && identity.oidc_fields.picture) || identity.picture || '';
        CONFIG._updateUserOnLogin();
      }
    } catch (e) {
      // Local dev — keep fallback
    }
  },

  async _updateUserOnLogin() {
    try {
      const users = await SheetsAPI.getAll(CONFIG.SHEETS.USERS);
      const idx = users.findIndex(u => u.user_id && (u.email === CONFIG.USER_EMAIL || u.name === CONFIG.CURRENT_USER));
      if (idx < 0) return;
      const updated = {
        ...users[idx],
        last_login: new Date().toISOString(),
        photo_url: CONFIG.USER_PHOTO || users[idx].photo_url
      };
      await SheetsAPI.update(CONFIG.SHEETS.USERS, idx, updated);
    } catch (e) {
      console.error('[login] Update failed:', e);
    }
  }
};
