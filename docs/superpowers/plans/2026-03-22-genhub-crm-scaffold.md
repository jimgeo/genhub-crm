# GenHub CRM Scaffold — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold a working CRM for Generator Hub coworking space with Accounts and Contacts entities, using Google Sheets as the backend, Cloudflare Pages for hosting, and Generator Hub's visual design language.

**Architecture:** Vanilla HTML/CSS/JS static site deployed on Cloudflare Pages. Google Sheets API v4 for reads (API key), Apps Script web app proxy for writes. Cloudflare Access for Google OAuth. Generator Hub fonts (Questrial, Roboto, Montserrat) and editorial styling adapted into a CRM layout with sidebar navigation.

**Tech Stack:** HTML5, CSS3 (custom properties), ES2020+ vanilla JS, Google Sheets API v4, Google Apps Script, Cloudflare Pages + Functions + Access, Wrangler CLI

---

## File Structure

```
genhub-crm/
├── index.html                     # Dashboard (stub)
├── accounts.html                  # Accounts list page
├── account-detail.html            # Account view/edit form
├── contacts.html                  # Contacts list page
├── contact-detail.html            # Contact view/edit form
├── favicon.svg                    # Simple favicon
├── css/
│   └── styles.css                 # Full design system (Generator look & feel)
├── js/
│   ├── config.js                  # CONFIG object, secrets init, user init
│   ├── sheets-api.js              # Google Sheets CRUD wrapper
│   ├── app.js                     # Shared utilities (ID gen, dates, toasts, nav)
│   ├── layout.js                  # Header + sidebar injection
│   ├── accounts.js                # Accounts list + detail logic
│   └── contacts.js                # Contacts list + detail logic
├── functions/
│   └── api/
│       └── config.js              # Cloudflare Pages Function (serves env vars)
├── apps-script/
│   └── Code.gs                    # Apps Script write proxy (for user to paste)
├── package.json                   # Wrangler dev dependency
├── .gitignore                     # node_modules, .dev.vars, etc.
├── .dev.vars.example              # Template for local env vars
└── docs/                          # Plans and specs
```

## Data Model

**Accounts sheet headers:**
`account_id, name, type, phone, email, website, address_line1, address_line2, city, postcode, created_by, created_at, modified_by, modified_at`

**Contacts sheet headers:**
`contact_id, account_id, first_name, last_name, email, phone, mobile, job_title, created_by, created_at, modified_by, modified_at`

**Users sheet headers:**
`user_id, name, email, photo_url, last_login`

**Lookups sheet headers:**
`account_type` (column with values: Tenant, Virtual, Meeting Room, Partner, Vendor)

---

### Task 1: Project config files

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `.dev.vars.example`

- [ ] **Step 1: Create package.json**
```json
{
  "name": "genhub-crm",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "npx wrangler pages dev . --port 8787"
  },
  "devDependencies": {
    "wrangler": "^4.73.0"
  }
}
```

- [ ] **Step 2: Create .gitignore**
```
node_modules/
.dev.vars
.wrangler/
.DS_Store
```

- [ ] **Step 3: Create .dev.vars.example**
```
API_KEY=your-google-sheets-api-key
SPREADSHEET_ID=your-spreadsheet-id
WRITE_PROXY_URL=your-apps-script-url
```

- [ ] **Step 4: Install dependencies**
Run: `cd /Users/jimstrong/Dev/genhub-crm && npm install`

- [ ] **Step 5: Commit**
```bash
git add package.json .gitignore .dev.vars.example package-lock.json
git commit -m "chore: add project config files"
```

---

### Task 2: Cloudflare Pages Function

**Files:**
- Create: `functions/api/config.js`

- [ ] **Step 1: Create the config endpoint**
Same pattern as jscrm — serves env vars as JSON (no LOGO_DEV_TOKEN needed here).

- [ ] **Step 2: Commit**
```bash
git add functions/
git commit -m "feat: add Cloudflare Pages Function for config"
```

---

### Task 3: Core JS infrastructure

**Files:**
- Create: `js/config.js`
- Create: `js/sheets-api.js`
- Create: `js/app.js`

- [ ] **Step 1: Create config.js**
CONFIG object with SHEETS (ACCOUNTS, CONTACTS, USERS, LOOKUPS), initSecrets(), initUser(). Simplified from jscrm — only 4 sheets.

- [ ] **Step 2: Create sheets-api.js**
Copy jscrm's SheetsAPI wrapper verbatim — getAll, batchGet, append, update, batchUpdate, deleteRow.

- [ ] **Step 3: Create app.js**
Utilities: generateId(), nowISO(), formatDate(), getParam(), findById(), findRowIndex(), showToast(), setActiveNav().

- [ ] **Step 4: Commit**
```bash
git add js/config.js js/sheets-api.js js/app.js
git commit -m "feat: add core JS infrastructure"
```

---

### Task 4: CSS design system

**Files:**
- Create: `css/styles.css`

- [ ] **Step 1: Create styles.css**
Generator Hub's typography and colour palette adapted for a CRM layout:
- Google Fonts import (Questrial, Roboto, Montserrat)
- CSS custom properties from Generator (--font-heading, --font-body, --font-ui, colours)
- Added CRM-specific variables (--sidebar-width, --header-height, --color-primary, etc.)
- Reset/base styles matching Generator's body typography
- CRM layout: fixed header, collapsible sidebar, main content area
- Table styles (sticky headers, striped rows, hover)
- Form styles (inputs, selects, textareas matching Generator button aesthetic)
- Button styles derived from Generator's .btn class
- Modal, toast, breadcrumb, pagination components
- Responsive breakpoints

- [ ] **Step 2: Commit**
```bash
git add css/styles.css
git commit -m "feat: add CSS design system with Generator Hub typography"
```

---

### Task 5: Layout (header + sidebar)

**Files:**
- Create: `js/layout.js`
- Create: `favicon.svg`

- [ ] **Step 1: Create layout.js**
Injects header (logo text "GenHub CRM", user avatar, dark mode toggle) and sidebar (Dashboard, Accounts, Contacts, Settings links with SVG icons). Simpler than jscrm — just 4 nav items.

- [ ] **Step 2: Create favicon.svg**
Simple "G" lettermark.

- [ ] **Step 3: Commit**
```bash
git add js/layout.js favicon.svg
git commit -m "feat: add shared layout with header and sidebar"
```

---

### Task 6: Dashboard stub

**Files:**
- Create: `index.html`

- [ ] **Step 1: Create index.html**
Shell page that loads all core JS, injects layout, shows a welcome message with account/contact counts. Placeholder cards for future stats.

- [ ] **Step 2: Commit**
```bash
git add index.html
git commit -m "feat: add dashboard stub"
```

---

### Task 7: Accounts list page

**Files:**
- Create: `accounts.html`
- Create: `js/accounts.js`

- [ ] **Step 1: Create accounts.html**
Page shell with toolbar (search input, "New Account" button), table container, pagination controls.

- [ ] **Step 2: Create accounts.js — list functionality**
- Load all accounts via SheetsAPI.getAll
- Render table (name, type, phone, email, city)
- Client-side search filtering
- Click row navigates to account-detail.html?id=xxx
- "New Account" button navigates to account-detail.html?new=1

- [ ] **Step 3: Commit**
```bash
git add accounts.html js/accounts.js
git commit -m "feat: add accounts list page"
```

---

### Task 8: Account detail page

**Files:**
- Create: `account-detail.html`

- [ ] **Step 1: Create account-detail.html**
Form with all account fields, grouped into sections (Details, Address). Linked contacts table at bottom showing contacts where account_id matches.

- [ ] **Step 2: Add to accounts.js — detail functionality**
- Load account by ID from URL param
- Populate form fields
- Save (append or update) with dirty tracking
- Load and display linked contacts in a sub-table
- "Add Contact" button links to contact-detail.html?new=1&account_id=xxx

- [ ] **Step 3: Commit**
```bash
git add account-detail.html js/accounts.js
git commit -m "feat: add account detail page with linked contacts"
```

---

### Task 9: Contacts list page

**Files:**
- Create: `contacts.html`
- Create: `js/contacts.js`

- [ ] **Step 1: Create contacts.html**
Same pattern as accounts — toolbar, table, pagination.

- [ ] **Step 2: Create contacts.js — list functionality**
- Load contacts + accounts (for account name display)
- Render table (name, email, phone, job title, account name)
- Search filtering
- Row click → contact-detail.html?id=xxx

- [ ] **Step 3: Commit**
```bash
git add contacts.html js/contacts.js
git commit -m "feat: add contacts list page"
```

---

### Task 10: Contact detail page

**Files:**
- Create: `contact-detail.html`

- [ ] **Step 1: Create contact-detail.html**
Form with contact fields. Account linked via dropdown (populated from Accounts sheet). If opened with account_id param, pre-select that account.

- [ ] **Step 2: Add to contacts.js — detail functionality**
- Load contact by ID
- Populate form, account dropdown
- Save with dirty tracking
- Account name links to account-detail.html?id=xxx

- [ ] **Step 3: Commit**
```bash
git add contact-detail.html js/contacts.js
git commit -m "feat: add contact detail page with account linking"
```

---

### Task 11: Apps Script write proxy

**Files:**
- Create: `apps-script/Code.gs`

- [ ] **Step 1: Create Code.gs**
Apps Script web app that handles POST requests with actions: append, update, batch_update, delete. Same pattern as jscrm proxy but bound to the new GenHub CRM spreadsheet.

- [ ] **Step 2: Commit**
```bash
git add apps-script/
git commit -m "docs: add Apps Script write proxy code"
```

---

### Task 12: Final integration test & push

- [ ] **Step 1: Local smoke test**
Run: `cd /Users/jimstrong/Dev/genhub-crm && npm run dev`
Verify: pages load, layout renders, navigation works.

- [ ] **Step 2: Push to GitHub**
```bash
git push origin main
```
Cloudflare auto-deploys from GitHub.

---

## Manual steps (user)

After code is deployed, the user needs to:
1. Create Google Spreadsheet with 4 tabs (Accounts, Contacts, Users, Lookups) and headers
2. Create Google Sheets API key in Cloud Console
3. Paste Apps Script code into Extensions → Apps Script, deploy as web app
4. Set Cloudflare Pages env vars (API_KEY, SPREADSHEET_ID, WRITE_PROXY_URL)
5. Configure Cloudflare Access with Google IdP
