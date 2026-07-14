# 🔧 Worker Setup Guide

Backend API for APK Watch — runs on Cloudflare Workers with KV storage.

---

## Prerequisites

- [Node.js](https://nodejs.org) v18 or higher
- A [Cloudflare account](https://cloudflare.com) (free tier is enough)
- Wrangler CLI (installed in Step 2)

---

## Step 1 — Install Wrangler

```bash
npm install -g wrangler
wrangler --version   # verify it works
```

---

## Step 2 — Login to Cloudflare

```bash
wrangler login
```

Opens your browser → log in → authorize. Done.

---

## Step 3 — Install dependencies

```bash
cd worker
npm install
```

---

## Step 4 — Create KV Namespace

KV is Cloudflare's key-value store — this is where all your app and release data lives.
You need two: one for production, one for local dev.

```bash
npm run kv:create
npm run kv:create:preview
```

Each command prints something like:
```
✅ Created namespace "APK_KV" with id "abc123..."
```

Copy both IDs and paste them into `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "APK_KV"
id = "abc123..."         ← production id
preview_id = "xyz789..."  ← preview id
```

---

## Step 5 — Add API tokens (optional but recommended)

Without tokens: 60 requests/hour per source (fine for personal use).
With tokens: 5000/hour.

### GitHub token
1. github.com → Profile → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate new token → name it `apk-watch`
3. **No scopes needed** for public repos
4. Copy the token (starts with `ghp_...`)

### GitLab token *(only needed if tracking GitLab apps)*
1. gitlab.com → Profile → Edit profile → Access Tokens
2. New token → `read_api` scope → Create
3. Copy the token

### Codeberg token *(only needed if tracking Codeberg apps)*
1. codeberg.org → Settings → Applications → Generate token
2. Copy the token

---

## Step 6 — Configure local secrets

Create `worker/.dev.vars` (this file is gitignored — never committed):

```
GITHUB_TOKEN=ghp_your_token_here
GITLAB_TOKEN=glpat_your_token_here
CODEBERG_TOKEN=your_codeberg_token
```

---

## Step 7 — Run locally

```bash
npm run dev
# Worker starts at http://localhost:8787
```

---

## Step 8 — Test endpoints

On Windows PowerShell:

```powershell
# Health check
Invoke-WebRequest -Uri "http://localhost:8787/health"

# Add an app
Invoke-WebRequest -Uri "http://localhost:8787/apps" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"url": "https://github.com/signalapp/Signal-Android", "name": "Signal"}'

# Get all apps
Invoke-WebRequest -Uri "http://localhost:8787/apps"

# Release history
Invoke-WebRequest -Uri "http://localhost:8787/apps/github:signalapp:Signal-Android"

# Force refresh
Invoke-WebRequest -Uri "http://localhost:8787/apps/github:signalapp:Signal-Android/refresh" -Method POST

# Delete
Invoke-WebRequest -Uri "http://localhost:8787/apps/github:signalapp:Signal-Android" -Method DELETE
```

On Mac/Linux:

```bash
curl http://localhost:8787/health
curl -X POST http://localhost:8787/apps \
  -H "Content-Type: application/json" \
  -d '{"url": "https://github.com/signalapp/Signal-Android", "name": "Signal"}'
```

---

## Step 9 — Deploy to Cloudflare

### Option A — Connect via Cloudflare Dashboard (recommended)
1. dash.cloudflare.com → Workers & Pages → Create → Import Git repository
2. Pick your `apk-watch` repo
3. Root directory: `worker`
4. Build command: `npm install`
5. Deploy command: `npx wrangler deploy`
6. Add secrets in Settings → Environment Variables

### Option B — Deploy from CLI
```bash
npm run deploy
```

---

## Step 10 — Add production secrets

In Cloudflare dashboard → your Worker → Settings → Environment Variables → add:
- `GITHUB_TOKEN`
- `GITLAB_TOKEN` *(if needed)*
- `CODEBERG_TOKEN` *(if needed)*

Or via CLI:
```bash
wrangler secret put GITHUB_TOKEN
wrangler secret put GITLAB_TOKEN
wrangler secret put CODEBERG_TOKEN
```

---

## 🗂️ File Structure

```
worker/
├── src/
│   ├── index.js          → main router
│   ├── fetcher.js        → fetch + KV cache logic
│   ├── utils.js          → helpers (json, detectSource, etc)
│   ├── adapters/
│   │   ├── github.js     → GitHub API adapter
│   │   ├── gitlab.js     → GitLab API adapter
│   │   └── codeberg.js   → Codeberg API adapter
│   └── routes/
│       └── apps.js       → all /apps route handlers
├── wrangler.toml         → Cloudflare config + cron
├── package.json
├── .dev.vars             → local secrets (gitignored!)
└── .gitignore
```

---

## 🔄 Cron schedule

Edit in `wrangler.toml`:

```toml
crons = ["0 */6 * * *"]     # every 6 hours (default)
crons = ["0 */12 * * *"]    # every 12 hours
crons = ["0 0 * * *"]       # once a day
```

---

## ❓ Troubleshooting

| Problem | Fix |
|---|---|
| `wrangler login` not opening | Try `wrangler login --browser` |
| KV id still says REPLACE_WITH | Run `npm run kv:create` and paste the id |
| 401 errors from GitHub | Token expired — regenerate and update `.dev.vars` |
| App added but no APKs | Repo doesn't attach APKs to releases — "view release" link shown instead |
| Worker not auto-deploying | Check root directory is set to `worker` in Pages settings |
