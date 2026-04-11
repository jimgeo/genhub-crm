# Xero API Integration Guide

## Summary

This guide covers integrating Xero's accounting API into a Cloudflare Pages web app for read-only access to invoices and contacts. The integration uses:

- **Xero OAuth 2.0** for authentication (user authorises once, tokens auto-refresh)
- **Cloudflare Worker Functions** as server-side proxy (secrets never exposed to browser)
- **Cloudflare KV** for token storage (access tokens, refresh tokens, tenant ID)
- **Granular scopes** (required for Xero apps created after 2 March 2026)

### High-level flow

```
User clicks "Connect to Xero"
  → Worker redirects to Xero login (with scopes + CSRF state)
  → User authorises read-only access and selects organisation
  → Xero redirects back to /api/xero/callback with auth code
  → Worker exchanges code for tokens, stores in KV
  → Done (one-time)

Frontend requests invoice data
  → Calls /api/xero/invoices?contact=Acme
  → Worker reads tokens from KV, refreshes if expired
  → Worker calls Xero API, returns JSON to browser
  → Frontend renders invoice list
```

### What you need before starting

1. A **Xero account** with an organisation containing data
2. A **Cloudflare Pages** project (for Worker Functions and KV)
3. Credentials stored as **environment variables** (not hardcoded)

### Key gotcha: Granular Scopes

Apps created after 2 March 2026 **must use granular scopes**. The old broad scopes like `accounting.transactions.read` will return `unauthorized_client / Invalid scope for client`. Use the granular equivalents instead (see Section VI).

---

## I. Register a Xero Developer App

1. Go to [developer.xero.com](https://developer.xero.com)
2. Sign in with your Xero account
3. Go to **My Apps** > **New app**
4. Fill in:
   - **App name:** Your app name (e.g. GenHub CRM)
   - **Integration type:** Web app
   - **Company or application URL:** Your production URL (e.g. `https://genhub-crm.pages.dev`)
   - **Redirect URI:** `https://your-app.pages.dev/api/xero/callback`
5. Agree to terms and click **Create app**

## II. Get Your Credentials

1. On your app page, click **Configuration** in the left sidebar
2. Copy the **Client ID**
3. Click **Generate a secret** to create the **Client Secret** — copy it immediately, it's only shown once

**Note:** There is no scopes configuration page for post-March 2026 apps. Scopes are requested at authorisation time in the OAuth URL, not configured in the developer portal.

## III. Store Credentials

### Local development

Add to `.dev.vars` (must be gitignored):

```
XERO_CLIENT_ID=your-client-id
XERO_CLIENT_SECRET=your-client-secret
```

### Production (Cloudflare)

1. Go to **Cloudflare Dashboard** > **Pages** > **your-project** > **Settings**
2. Under **Variables and Secrets**, click **+ Add**
3. Add `XERO_CLIENT_ID` and `XERO_CLIENT_SECRET`
4. Consider using **Encrypted** type rather than Plaintext for extra security
5. Redeploy for the vars to take effect

### Template file

Keep a `.dev.vars.example` (committed to git) with placeholder values so other developers know what's needed:

```
XERO_CLIENT_ID=your-xero-client-id
XERO_CLIENT_SECRET=your-xero-client-secret
```

## IV. Token Storage (Cloudflare KV)

OAuth tokens are dynamic values that change over time (access tokens expire every 30 minutes). They're stored in Cloudflare KV, not environment variables.

### Create the KV namespace

1. Go to **Cloudflare Dashboard** > **Storage & Databases** > **Workers KV**
2. Click **+ Create Instance** (top right)
3. Name it **XERO_TOKENS**
4. Click **Add**

### Bind to Pages project (production)

1. Go to **Pages** > **your-project** > **Settings**
2. Scroll to **Bindings** section (same page as your environment variables)
3. Click **+ Add**
4. Choose **KV namespace**
5. Variable name: `XERO_TOKENS`
6. KV namespace: select the **XERO_TOKENS** namespace you just created
7. Save

### Local development

Add the KV binding to your dev command in `package.json`:

```json
"dev": "npx wrangler pages dev . --port 8787 --kv XERO_TOKENS"
```

Local KV data is stored in `.wrangler/state/` (automatically gitignored by Wrangler).

### What's stored in KV

| Key | Value | Notes |
|-----|-------|-------|
| `access_token` | Bearer token | Expires every 30 minutes, auto-refreshed |
| `refresh_token` | Refresh token | Expires every 60 days |
| `tenant_id` | Xero organisation ID | Set during first OAuth connection |
| `tenant_name` | Organisation display name | For status display |
| `token_expiry` | ISO timestamp | When the access token expires |
| `oauth_state` | Random UUID | CSRF protection, 10-minute TTL, deleted after use |

## V. Xero OAuth 2.0 Flow

### How it works

1. **User clicks "Connect to Xero"** — browser hits `/api/xero/auth`
2. **Auth endpoint redirects to Xero** — `https://login.xero.com/identity/connect/authorize` with:
   - `client_id` — your app's client ID
   - `redirect_uri` — must exactly match what's registered in Xero developer portal
   - `response_type=code`
   - `scope` — space-separated list of granular scopes (see Section VI)
   - `state` — random UUID stored in KV for CSRF validation
3. **User logs in to Xero** and selects which organisation to connect
4. **Xero redirects back** to your callback URL with an authorization `code` and `state`
5. **Callback endpoint validates state**, then exchanges code for tokens via POST to `https://identity.xero.com/connect/token`
6. **Callback fetches tenant ID** from `https://api.xero.com/connections` (uses first connected organisation)
7. **Tokens stored in KV**, user redirected to admin page with success message

### Token refresh

Access tokens expire after 30 minutes. The `_helpers.js` module automatically refreshes tokens before making API calls if they're expired or expiring within 2 minutes. Refresh tokens last 60 days — if a refresh token expires, the user will need to reconnect via the admin page.

### Token exchange request

```
POST https://identity.xero.com/connect/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code
code=<auth-code>
redirect_uri=<your-callback-url>
client_id=<client-id>
client_secret=<client-secret>
```

### Token refresh request

```
POST https://identity.xero.com/connect/token
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token
refresh_token=<refresh-token>
client_id=<client-id>
client_secret=<client-secret>
```

## VI. Scopes

### Granular scopes (post-March 2026 apps)

Apps created after 2 March 2026 must use granular scopes. The old broad scopes (`accounting.transactions.read`, etc.) will fail with `unauthorized_client / Invalid scope for client`.

**Scopes used in this integration:**

| Scope | Purpose |
|-------|---------|
| `openid` | Required for OAuth 2.0 |
| `profile` | User profile info |
| `email` | User email |
| `accounting.invoices.read` | Read invoices (granular replacement for `accounting.transactions.read`) |
| `accounting.contacts.read` | Read contacts |
| `offline_access` | Get refresh tokens for ongoing access without re-authorisation |

**What changed:** The old `accounting.transactions.read` (broad scope covering invoices, bills, credit notes, bank transactions) was replaced with specific granular scopes like `accounting.invoices.read`. If you need other transaction types, add the specific granular scope (e.g. `accounting.banktransactions.read`).

### Pre-March 2026 apps

Older apps can continue using broad scopes until September 2027, but Xero recommends migrating to granular scopes. You can mix broad and granular scopes during the transition period.

## VII. API Endpoints

Once authenticated, all Xero API requests require two headers:

```
Authorization: Bearer <access-token>
Xero-Tenant-Id: <tenant-id>
```

### Invoices

```
GET https://api.xero.com/api.xro/2.0/Invoices
```

Query parameters:
- `where` — filter expression, e.g. `Contact.Name=="Acme Ltd"`
- `order` — e.g. `Date DESC`
- `page` — pagination (100 per page)
- `Statuses` — e.g. `AUTHORISED,PAID`

### Contacts

```
GET https://api.xero.com/api.xro/2.0/Contacts
```

Query parameters:
- `where` — filter expression, e.g. `Name.Contains("Acme")`
- `order` — e.g. `Name ASC`
- `page` — pagination (100 per page)

### Connections (tenants)

```
GET https://api.xero.com/connections
Authorization: Bearer <access-token>
```

Returns list of connected organisations. Used during OAuth callback to get tenant ID.

## VIII. Architecture

### Worker Functions

All Xero communication goes through Cloudflare Worker Functions. The browser never sees Xero tokens or credentials.

| File | Purpose |
|------|---------|
| `/functions/api/xero/auth.js` | Initiates OAuth flow — generates state, redirects to Xero login |
| `/functions/api/xero/callback.js` | Handles OAuth callback — validates state, exchanges code for tokens, fetches tenant ID, stores in KV |
| `/functions/api/xero/_helpers.js` | Shared module — token refresh logic, authenticated API requests, error responses |
| `/functions/api/xero/invoices.js` | Proxies invoice requests — supports filtering by contact name, status, pagination |
| `/functions/api/xero/contacts.js` | Proxies contact requests — supports search by name, pagination |
| `/functions/api/xero/status.js` | Returns connection status — whether tokens exist, tenant name, token expiry |

### Data flow

```
Browser                     Cloudflare Workers              Xero API
───────                     ──────────────────              ────────

GET /api/xero/status ──→ Check KV for tokens ──→ Return { connected, tenantName }
                         (no Xero call needed)

GET /api/xero/auth ────→ Generate state, store   ──→ Redirect to login.xero.com
                         in KV

GET /api/xero/callback → Validate state,          ──→ POST identity.xero.com/token
                         exchange code             ──→ GET api.xero.com/connections
                         Store tokens in KV        ←── tokens + tenant ID
                         Redirect to admin

GET /api/xero/invoices → Read tokens from KV      ──→ GET api.xero.com/.../Invoices
                         Auto-refresh if expired   ←── Invoice JSON
                         Return simplified JSON
```

### Frontend pages

| File | Xero feature |
|------|-------------|
| `admin.html` | Xero connection status card, Connect/Reconnect button, link to contact matching |
| `account-detail.html` | Xero Invoices section — auto-loads invoices for the account (matched by name) |
| `xero-contacts.html` | Contact matching dashboard — all CRM accounts matched against Xero contacts |

### Contact matching logic

Accounts are matched to Xero contacts by name using a three-tier approach:

1. **Exact match** — CRM account name equals Xero contact name (case-insensitive)
2. **Close match** — either name contains the other, or significant word overlap (excluding common business suffixes: Ltd, Limited, Inc, LLC, PLC, Co, The, and, &, UK, Group)
3. **No match** — no meaningful similarity found

The contact matching page shows summary cards (total accounts, not invoiced, exact/close/no match) and allows manual linking via a modal.

**Current limitation:** Manual links are in-memory only (reset on page reload). To persist links, add a `xero_contact_id` column to the Accounts sheet.

## IX. Reusing This Integration

To use this pattern in another Cloudflare Pages project:

1. **Copy the Worker Functions** — the entire `/functions/api/xero/` directory
2. **Update the redirect URI** in:
   - Xero developer portal (Configuration > Redirect URIs)
   - No code changes needed — `auth.js` builds the redirect URI dynamically from the request URL
3. **Set environment variables** — `XERO_CLIENT_ID` and `XERO_CLIENT_SECRET`
4. **Create and bind a KV namespace** — `XERO_TOKENS`
5. **Add `--kv XERO_TOKENS`** to your local dev command
6. **Add frontend** — the admin connection UI and wherever you want to display Xero data

The Worker Functions are self-contained and have no dependencies on the rest of the app.

## X. Status (GenHub CRM)

- [x] Xero app registered (GenHub CRM) — 2026-04-11
- [x] Client ID and Secret obtained
- [x] Redirect URI set to `https://genhub-crm.pages.dev/api/xero/callback`
- [x] Credentials added to `.dev.vars`
- [x] Credentials added to Cloudflare Pages environment variables
- [x] KV namespace created (XERO_TOKENS) and bound to Pages project
- [x] OAuth flow Worker Functions built (`auth.js`, `callback.js`)
- [x] Token storage and auto-refresh implemented (`_helpers.js`)
- [x] Invoice proxy endpoint built (`invoices.js`)
- [x] Contacts proxy endpoint built (`contacts.js`)
- [x] Status check endpoint built (`status.js`)
- [x] Config endpoint updated to expose `XERO_CLIENT_ID`
- [x] Admin page: Xero connection status + Connect/Reconnect button
- [x] Account detail page: Xero Invoices section (matched by account name)
- [x] Contact matching page with summary cards, filters, and manual linking
- [x] Fixed scopes: `accounting.transactions.read` → `accounting.invoices.read` (granular scope requirement for post-March 2026 apps)
- [x] Fixed false close matches: excluded common business suffixes (Ltd, Inc, etc.) from word matching
- [x] First OAuth connection test — working (2026-04-11)
- [x] Invoice display on account detail — working
- [ ] Persist manual contact links (add `xero_contact_id` to Accounts sheet)
- [ ] Paginate invoices (currently returns first 100 only)
