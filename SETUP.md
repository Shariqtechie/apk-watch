# 🚀 APK Tracker Worker — Full Setup Guide

---

## Step 1 — Install Node.js
If you don't have it: https://nodejs.org → download LTS version

Check it works:
```bash
node -v   # should print v18 or higher
npm -v    # should print something
```

---

## Step 2 — Install Wrangler (Cloudflare's CLI)
```bash
npm install -g wrangler
```

Check it works:
```bash
wrangler --version
```

---

## Step 3 — Login to Cloudflare
```bash
wrangler login
```
This opens your browser → log in to your Cloudflare account → authorize Wrangler.
If you don't have a Cloudflare account, make one free at cloudflare.com

---

## Step 4 — Clone/create your repo
Put the worker folder in a GitHub repo. Then:
```bash
cd worker
npm install
```

---

## Step 5 — Create KV Namespace
KV = Cloudflare's key-value database. Think of it like a big JSON object stored in the cloud.
You need TWO namespaces — one for real, one for local testing.

```bash
# Production namespace
npm run kv:create
```

You'll see output like:
```
✅ Created namespace "APK_KV" with id "abc123def456..."
```

Copy that id. Now create the preview (local dev) one:
```bash
npm run kv:create:preview
```

Copy that id too. Now open `wrangler.toml` and paste both:
```toml
[[kv_namespaces]]
binding = "APK_KV"
id = "abc123def456..."          ← paste production id here
preview_id = "xyz789..."        ← paste preview id here
```

---

## Step 6 — Get API Tokens (optional but recommended)
Without tokens you get 60 requests/hour per source. With tokens: 5000/hour.
For a personal tracker 60/hr is fine, but tokens are better long term.

### GitHub Token
1. Go to github.com → click your profile pic → Settings
2. Scroll down → Developer settings → Personal access tokens → Tokens (classic)
3. Generate new token → give it a name like "apk-tracker"
4. **No scopes needed** for public repos — just scroll down and click Generate
5. Copy the token (starts with `ghp_...`)

### GitLab Token (only if you track GitLab apps)
1. Go to gitlab.com → your profile → Edit profile → Access Tokens
2. Add new token → name it → select `read_api` scope → Create
3. Copy the token

### Codeberg Token (only if you track Codeberg apps)
1. Go to codeberg.org → your avatar → Settings → Applications
2. Generate token → copy it

---

## Step 7 — Add tokens to local dev
Open `.dev.vars` and paste your tokens:
```
GITHUB_TOKEN=ghp_your_token_here
GITLAB_TOKEN=glpat_your_token_here
CODEBERG_TOKEN=your_codeberg_token
```
⚠️ `.dev.vars` is in `.gitignore` so it will NEVER be committed. Safe!

---

## Step 8 — Run locally
```bash
npm run dev
```

You'll see:
```
⛅️ wrangler dev
------------------
Running on http://localhost:8787
```

Your worker is live locally! Open a new terminal to test it.

---

## Step 9 — Test the endpoints

### Check it's alive
```bash
curl http://localhost:8787/health
```
Expected: `{ "status": "ok", "ts": "..." }`

### Add your first app
```bash
curl -X POST http://localhost:8787/apps \
  -H "Content-Type: application/json" \
  -d '{"url": "https://github.com/signalapp/Signal-Android", "name": "Signal"}'
```
Expected: full app JSON with latest release and APKs

### Get all apps
```bash
curl http://localhost:8787/apps
```

### Force refresh one app
```bash
# Use the id from the response above, URL-encode the colons
curl -X POST "http://localhost:8787/apps/github:signalapp:Signal-Android/refresh"
```

### Get release history
```bash
curl "http://localhost:8787/apps/github:signalapp:Signal-Android"
```

### Delete an app
```bash
curl -X DELETE "http://localhost:8787/apps/github:signalapp:Signal-Android"
```

---

## Step 10 — Deploy to Cloudflare
```bash
npm run deploy
```

Your worker is now live at:
`https://apk-tracker-worker.YOUR_SUBDOMAIN.workers.dev`

---

## Step 11 — Add production secrets
Tokens need to be added separately for production (not from `.dev.vars`):
```bash
wrangler secret put GITHUB_TOKEN
# paste your token when prompted

wrangler secret put GITLAB_TOKEN
wrangler secret put CODEBERG_TOKEN
```

---

## 🗂️ File Structure
```
worker/
├── src/
│   ├── index.js              → main router (entry point)
│   ├── fetcher.js            → core fetch + KV cache logic
│   ├── utils.js              → helpers (json, detectSource, etc)
│   ├── adapters/
│   │   ├── github.js         → GitHub API
│   │   ├── gitlab.js         → GitLab API
│   │   └── codeberg.js       → Codeberg API
│   └── routes/
│       └── apps.js           → all /apps handlers
├── wrangler.toml             → Cloudflare config
├── package.json
├── .dev.vars                 → local secrets (NOT committed)
└── .gitignore
```

---

## 🔄 How cron works
The worker auto-refreshes all your apps every 6 hours via Cloudflare's cron triggers.
Zero setup needed — it just runs in the cloud automatically after deploy.

To change frequency, edit `wrangler.toml`:
```toml
crons = ["0 */6 * * *"]    # every 6 hours (default)
crons = ["0 */12 * * *"]   # every 12 hours
crons = ["0 0 * * *"]      # once a day at midnight
```

---

## ❓ Common Issues

**`wrangler login` not working?**
Try `wrangler login --browser` or manually go to dash.cloudflare.com and create an API token

**KV id says REPLACE_WITH...**
You forgot Step 5 — run `npm run kv:create` and paste the ids

**401 errors from GitHub/GitLab**
Your token is wrong or expired — regenerate it and update `.dev.vars`

**App added but no APKs showing**
The repo doesn't attach APK files to their releases — only source code zips.
The dashboard will show "View Release" link as fallback.
