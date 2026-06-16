import { json, CORS_HEADERS } from './utils.js';
import { getApps, addApp, deleteApp, getAppReleases, refreshApp } from './routes/apps.js';
import { refreshAll } from './fetcher.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const method = request.method;
    const path = url.pathname;

    // CORS preflight
    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    try {
      // GET /health
      if (path === '/health' && method === 'GET') {
        return json({ status: 'ok', ts: new Date().toISOString() });
      }

      // GET /apps
      if (path === '/apps' && method === 'GET') return getApps(env);

      // POST /apps
      if (path === '/apps' && method === 'POST') return addApp(request, env);

      // /apps/:id
      const appMatch = path.match(/^\/apps\/([^/]+)$/);
      if (appMatch) {
        const id = appMatch[1];
        if (method === 'DELETE') return deleteApp(id, env);
        if (method === 'GET')    return getAppReleases(id, env);
      }

      // POST /apps/:id/refresh
      const refreshMatch = path.match(/^\/apps\/([^/]+)\/refresh$/);
      if (refreshMatch && method === 'POST') return refreshApp(refreshMatch[1], env);

      return json({ error: 'Not found' }, 404);

    } catch (err) {
      console.error('[worker error]', err);
      return json({ error: err.message || 'Internal server error' }, 500);
    }
  },

  // Cron trigger — runs every 6 hours
  async scheduled(event, env) {
    await refreshAll(env);
  },
};
