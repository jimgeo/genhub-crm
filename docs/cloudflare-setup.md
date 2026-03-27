# Cloudflare Pages & Access Setup Guide

## I. Set up Cloudflare Pages

1. Log in to your Cloudflare dashboard
2. Go to **Workers & Pages** > **Create application**
3. At the bottom click **"Looking to deploy Pages? Get started"**
4. Choose **Import an existing Git repository** > **Get started**
5. Connect your GitHub account and select the `genhub-crm` repo
6. Build settings:
   - **Framework preset:** None
   - **Build command:** leave empty (static site)
   - **Build output directory:** `/`
7. Click **Save and Deploy**
8. You'll get a URL like `genhub-crm.pages.dev`

## II. Set environment variables

1. In Cloudflare Pages > your project > **Settings** > **Environment variables**
2. Click **+ Add** and add these for **Production**:
   - `API_KEY` — your Google Sheets API key
   - `SPREADSHEET_ID` — your spreadsheet ID
   - `WRITE_PROXY_URL` — your Apps Script deployment URL
3. Redeploy for the vars to take effect (Deployments > click latest > Retry deployment)

## III. Test

1. Visit `https://genhub-crm.pages.dev/`
2. Should load the dashboard (no auth at this point)
3. Verify pages load, data appears, navigation works

## IV. Set up Google OAuth (Cloudflare Access)

1. In Cloudflare dashboard, go to **Zero Trust** (left sidebar)
2. **Settings** > **Authentication** > **Login methods** > **Add new** > **Google**
3. You'll need a Google OAuth Client ID and Secret:
   - Go to Google Cloud Console > **APIs & Credentials** > **Create Credentials** > **OAuth Client ID**
   - Application type: **Web application**
   - Authorized redirect URI: `https://<your-zero-trust-team-name>.cloudflareaccess.com/cdn-cgi/access/callback`
   - Copy the **Client ID** and **Client Secret**
4. Paste them into the Cloudflare Google login method config
5. Save

## V. Protect the site with Access

1. In **Zero Trust** > **Access** > **Applications** > **Add an application**
2. Choose **Self-hosted**
3. Application domain: `genhub-crm.pages.dev` (or your custom domain later)
4. Set a policy name, e.g. "GenHub team"
5. **Policy action:** Allow
6. **Include rule:** Emails — add the Google email addresses that should have access
7. Save

After step V, visiting the site will require Google login first.

## Notes

- Cloudflare Pages auto-deploys on every push to `main`
- Environment variables only take effect after a new deployment
- To move to a custom domain later: Pages project > Custom domains > Add
- The `functions/api/config.js` file automatically becomes a Pages Function (serves env vars to the app)
