# Xero API Setup Guide

## I. Register a Xero Developer App

1. Go to [developer.xero.com](https://developer.xero.com)
2. Sign in with your Xero account
3. Go to **My Apps** > **New app**
4. Fill in:
   - **App name:** GenHub CRM
   - **Integration type:** Web app
   - **Company or application URL:** `https://genhub-crm.pages.dev`
   - **Redirect URI:** `https://genhub-crm.pages.dev/api/xero/callback`
5. Agree to terms and click **Create app**

## II. Get Your Credentials

1. On your app page, click **Configuration** in the left sidebar
2. Copy the **Client ID**
3. Click **Generate a secret** to create the **Client Secret** — copy it immediately, it's only shown once

## III. Store Credentials

### Local development

Add to `.dev.vars` (gitignored):

```
XERO_CLIENT_ID=your-client-id
XERO_CLIENT_SECRET=your-client-secret
```

### Production

Add the same variables in the Cloudflare Pages dashboard:

1. Go to **Cloudflare Dashboard** > **Pages** > **genhub-crm** > **Settings**
2. Under **Variables and Secrets**, click **+ Add**
3. Add `XERO_CLIENT_ID` and `XERO_CLIENT_SECRET`
4. Redeploy for the vars to take effect

## IV. Xero OAuth 2.0 Flow

Xero uses standard OAuth 2.0 with PKCE. The flow is:

1. **User clicks "Connect to Xero"** in GenHub CRM
2. **Redirect to Xero** — browser goes to `https://login.xero.com/identity/connect/authorize` with:
   - `client_id` — your app's client ID
   - `redirect_uri` — `https://genhub-crm.pages.dev/api/xero/callback`
   - `response_type=code`
   - `scope` — e.g. `openid profile email accounting.transactions.read accounting.contacts.read offline_access`
   - `state` — random string for CSRF protection
3. **User logs in to Xero** and selects which organisation to connect
4. **Xero redirects back** to your callback URL with an authorization `code`
5. **Server exchanges code for tokens** — POST to `https://identity.xero.com/connect/token` with:
   - `grant_type=authorization_code`
   - `code` — from the callback
   - `redirect_uri` — must match exactly
   - `client_id` and `client_secret`
6. **Receive tokens** — access token (30 min), refresh token (60 days), and tenant ID
7. **Store tokens securely** — needed for ongoing API access

## V. Key API Endpoints

Once authenticated, use the access token in the `Authorization: Bearer <token>` header.

### Invoices

```
GET https://api.xero.com/api.xro/2.0/Invoices
Header: Xero-Tenant-Id: <tenant-id>
Header: Authorization: Bearer <access-token>
```

Query parameters:
- `where` — filter expression, e.g. `Contact.Name=="Acme Ltd"`
- `order` — e.g. `Date DESC`
- `page` — pagination (100 per page)
- `Statuses` — e.g. `AUTHORISED,PAID`

### Contacts

```
GET https://api.xero.com/api.xro/2.0/Contacts
Header: Xero-Tenant-Id: <tenant-id>
Header: Authorization: Bearer <access-token>
```

### Token Refresh

Access tokens expire after 30 minutes. Refresh with:

```
POST https://identity.xero.com/connect/token
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token
refresh_token=<refresh-token>
client_id=<client-id>
client_secret=<client-secret>
```

## VI. Scopes Required

| Scope | Purpose |
|-------|---------|
| `openid` | Required for OAuth 2.0 |
| `profile` | User profile info |
| `email` | User email |
| `accounting.transactions.read` | Read invoices, bills, credit notes |
| `accounting.contacts.read` | Read contacts |
| `offline_access` | Get refresh tokens for ongoing access |

## VII. Architecture (Planned)

The integration will use Cloudflare Worker Functions, matching the existing `/api/config` pattern:

| File | Purpose |
|------|---------|
| `/functions/api/xero/auth.js` | Initiates OAuth flow — redirects user to Xero login |
| `/functions/api/xero/callback.js` | Handles OAuth callback — exchanges code for tokens |
| `/functions/api/xero/invoices.js` | Proxies invoice requests to Xero API |
| `/functions/api/xero/contacts.js` | Proxies contact requests to Xero API |

Tokens will be stored server-side in Cloudflare KV — never exposed to the browser.

## VIII. Token Storage (Cloudflare KV)

OAuth tokens (access token, refresh token, tenant ID) are stored in a Cloudflare KV namespace. These are dynamic values that change over time, unlike the fixed client ID/secret in environment variables.

### Create the KV namespace

1. Go to **Cloudflare Dashboard** > **Workers & Pages** > **KV**
2. Click **Create a namespace**
3. Name it **XERO_TOKENS**
4. Click **Add**

### Bind to Pages project (production)

1. Go to **Pages** > **genhub-crm** > **Settings** > **Functions**
2. Scroll to **KV namespace bindings**
3. Click **Add binding**
4. Variable name: `XERO_TOKENS`
5. KV namespace: select the **XERO_TOKENS** namespace
6. Save

### Local development

KV is available locally via the Wrangler dev command flag:

```
npx wrangler pages dev . --port 8787 --kv XERO_TOKENS
```

This is already configured in `package.json` under `npm run dev`.

Local KV data is stored in `.wrangler/state/` (gitignored).

### What's stored in KV

| Key | Value | Notes |
|-----|-------|-------|
| `access_token` | Bearer token | Expires every 30 minutes |
| `refresh_token` | Refresh token | Expires every 60 days |
| `tenant_id` | Xero organisation ID | Obtained during first OAuth connection |
| `token_expiry` | ISO timestamp | When the access token expires |

## IX. Status

- [x] Xero app registered (GenHub CRM)
- [x] Client ID and Secret obtained
- [x] Redirect URI set to `https://genhub-crm.pages.dev/api/xero/callback`
- [x] Credentials added to `.dev.vars`
- [x] Credentials added to Cloudflare Pages environment variables
- [x] OAuth flow Worker Functions built (`/functions/api/xero/auth.js`, `callback.js`)
- [x] Token storage implemented (`/functions/api/xero/_helpers.js` with auto-refresh)
- [x] Invoice proxy endpoint built (`/functions/api/xero/invoices.js`)
- [x] Contacts proxy endpoint built (`/functions/api/xero/contacts.js`)
- [x] Status check endpoint built (`/functions/api/xero/status.js`)
- [x] Config endpoint updated to expose `XERO_CLIENT_ID`
- [x] Admin page: Xero connection status + Connect/Reconnect button
- [x] Account detail page: Xero Invoices section (matches by account name)
- [ ] KV namespace created and bound in Cloudflare dashboard
- [ ] First OAuth connection test
- [ ] Contact matching refinement (fuzzy match or stored xero_contact_id)
