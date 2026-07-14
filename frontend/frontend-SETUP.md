# 🎨 Frontend Setup Guide

Static frontend for APK Watch — plain HTML, CSS, and JS. No build step, no framework, no dependencies. Deploy anywhere.

---

## Files

```
frontend/
├── index.html   → markup
├── style.css    → all styles (glassmorphism dark/light)
└── app.js       → all logic (API calls, rendering, state)
```

---

## Configuration

Before deploying, open `app.js` and find this line near the top:

```js
let workerUrl = localStorage.getItem(WORKER_KEY) || 'https://your-worker.workers.dev';
```

Replace the URL with your deployed Cloudflare Worker URL. Users can also change it later in the Settings panel on the dashboard.

---

## Deploy options

### ▲ Vercel (easiest)

1. Push `frontend/` to your GitHub repo
2. Go to [vercel.com](https://vercel.com) → New Project → Import your repo
3. Set **Root Directory** to `frontend`
4. Framework preset: **Other**
5. Click Deploy

Your site is live at `your-project.vercel.app`

---

### 📄 GitHub Pages

1. Go to your repo → Settings → Pages
2. Source: **Deploy from a branch**
3. Branch: `main` / folder: `/frontend`
4. Save

Your site is live at `username.github.io/apk-watch`

> If styles/scripts don't load, make sure paths in `index.html` are relative (`./style.css`, `./app.js`) not absolute.

---

### 🟣 Render

1. Go to [render.com](https://render.com) → New → Static Site
2. Connect your repo
3. Root directory: `frontend`
4. Build command: *(leave empty)*
5. Publish directory: `frontend`
6. Deploy

Your site is live at `your-project.onrender.com`

---

### ☁️ Cloudflare Pages (recommended — pairs best with the Worker)

1. dash.cloudflare.com → Workers & Pages → Create → Pages → Connect Git
2. Pick your `apk-watch` repo
3. Root directory: `frontend`
4. Build command: *(leave empty)*
5. Build output directory: *(leave empty)*
6. Deploy

Your site is live at `your-project.pages.dev`

---

### 🖥️ Self-hosted / Local

Since it's just static files, you can serve it with anything:

```bash
# Python
cd frontend && python -m http.server 3000

# Node
npx serve frontend

# VS Code
Install "Live Server" extension → right click index.html → Open with Live Server
```

---

## Connecting to your Worker

The frontend talks to your Worker API. Make sure:

1. Your Worker is deployed and accessible
2. The Worker URL is correct in `app.js` or set via Settings ⚙️ in the UI
3. CORS is enabled on the Worker (it already is by default in our setup)

---

## localStorage keys

The frontend stores these in the browser (per device):

| Key | What it stores |
|---|---|
| `apkwatch_worker` | Your Worker API URL |
| `apkwatch_arch` | Your device architecture |
| `apkwatch_installed` | Installed versions per app |
| `apkwatch_theme` | dark or light |

These never leave your browser — they're not sent to the Worker.
