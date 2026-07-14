# 📦 APK Watch

> Your personal open source Android app tracker. Get updates for apps that aren't on F-Droid — directly from GitHub, GitLab, and Codeberg.

![APK Watch](https://img.shields.io/badge/built%20with-Cloudflare%20Workers-orange?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)

---

## ✨ Features

- 🔍 **Track any open source Android app** from GitHub, GitLab, or Codeberg
- 📦 **Direct APK downloads** — auto-selects the right APK for your device architecture
- 🔄 **Auto-refresh every 6 hours** via Cloudflare cron triggers
- 🆕 **Update badges** — instantly see which apps need updating
- ✅ **Mark installed versions** — track what you have vs what's latest
- 📋 **Full changelog** — read release notes without leaving the dashboard
- 🌙☀️ **Dark & light mode**
- ⚡ **Blazing fast** — powered by Cloudflare Workers + KV edge cache

---

## 🖼️ Screenshot

> Glassmorphism UI with Play Store vibes

---

## 🏗️ Architecture

```
Cloudflare Worker (cron every 6hrs)
        ↓
GitHub / GitLab / Codeberg API
        ↓
Cloudflare KV (edge cache)
        ↓
Cloudflare Pages (frontend)
        ↓
You 🙂
```

---

## 📁 Repo Structure

```
apk-watch/
├── worker/           → Cloudflare Worker (backend API)
│   ├── src/
│   │   ├── index.js          → router
│   │   ├── fetcher.js        → fetch + KV cache
│   │   ├── utils.js          → shared helpers
│   │   ├── adapters/
│   │   │   ├── github.js
│   │   │   ├── gitlab.js
│   │   │   └── codeberg.js
│   │   └── routes/
│   │       └── apps.js
│   ├── wrangler.toml
│   ├── package.json
│   └── SETUP.md      → backend setup guide
│
└── frontend/         → Static frontend (HTML/CSS/JS)
    ├── index.html
    ├── style.css
    ├── app.js
    └── SETUP.md      → frontend setup guide
```

---

## 🚀 Quick Start

- **Backend setup** → [`worker/SETUP.md`](./worker/worker-SETUP.md)
- **Frontend setup** → [`frontend/SETUP.md`](./frontend/frontend-SETUP.md)

---

## 🛠️ Tech Stack

| Layer | Tech |
|---|---|
| Backend | Cloudflare Workers (vanilla JS) |
| Storage | Cloudflare KV |
| Scheduling | Cloudflare Cron Triggers |
| Frontend | HTML + CSS + Vanilla JS |
| Hosting | Cloudflare Pages |
| Sources | GitHub API, GitLab API, Codeberg API |

---

## 📡 API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Worker status |
| `GET` | `/apps` | All tracked apps with release data |
| `POST` | `/apps` | Add a new app |
| `DELETE` | `/apps/:id` | Remove an app |
| `GET` | `/apps/:id` | Release history for one app |
| `POST` | `/apps/:id/refresh` | Force refresh one app |

---

## 📄 License

MIT — do whatever you want with it.
