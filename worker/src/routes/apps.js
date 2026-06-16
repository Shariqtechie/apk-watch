import { json, detectSource, parseRepoUrl, buildAppId } from '../utils.js';
import { fetchAndCacheApp } from '../fetcher.js';

// GET /apps — return all tracked apps with cached release data
export async function getApps(env) {
  const raw = await env.APK_KV.get('apps');
  const apps = raw ? JSON.parse(raw) : [];

  const results = await Promise.allSettled(
    apps.map(async (app) => {
      const cached = await env.APK_KV.get(`release:${app.id}`);
      if (cached) return JSON.parse(cached);
      // Cache miss → fetch now
      return fetchAndCacheApp(app, env);
    })
  );

  const data = results.map((r, i) =>
    r.status === 'fulfilled'
      ? r.value
      : { ...apps[i], error: r.reason?.message }
  );

  return json(data);
}

// POST /apps — add a new app
export async function addApp(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const { url, name } = body;
  if (!url) return json({ error: '`url` is required' }, 400);

  const source = detectSource(url);
  if (!source) return json({ error: 'Unsupported URL. Use GitHub, GitLab, or Codeberg.' }, 400);

  const { owner, repo } = parseRepoUrl(url);
  if (!owner || !repo) return json({ error: 'Could not parse owner/repo from URL' }, 400);

  const id = buildAppId(source, owner, repo);

  // Dupe check
  const raw = await env.APK_KV.get('apps');
  const apps = raw ? JSON.parse(raw) : [];
  if (apps.find(a => a.id === id)) return json({ error: 'App already tracked' }, 409);

  const newApp = {
    id,
    url,
    source,
    owner,
    repo,
    name: name || `${owner}/${repo}`,
    addedAt: new Date().toISOString(),
  };

  apps.push(newApp);
  await env.APK_KV.put('apps', JSON.stringify(apps));

  // Fetch release data right away
  const cached = await fetchAndCacheApp(newApp, env);
  return json(cached, 201);
}

// DELETE /apps/:id — remove an app
export async function deleteApp(id, env) {
  const decoded = decodeURIComponent(id);
  const raw = await env.APK_KV.get('apps');
  const apps = raw ? JSON.parse(raw) : [];
  const filtered = apps.filter(a => a.id !== decoded);

  await env.APK_KV.put('apps', JSON.stringify(filtered));
  await env.APK_KV.delete(`release:${decoded}`);

  return json({ success: true, deleted: decoded });
}

// GET /apps/:id — release history for one app
export async function getAppReleases(id, env) {
  const decoded = decodeURIComponent(id);
  const cached = await env.APK_KV.get(`release:${decoded}`);
  if (!cached) return json({ error: 'App not found or not yet cached' }, 404);
  const data = JSON.parse(cached);
  return json(data.releases || []);
}

// POST /apps/:id/refresh — force refresh one app
export async function refreshApp(id, env) {
  const decoded = decodeURIComponent(id);
  const raw = await env.APK_KV.get('apps');
  const apps = raw ? JSON.parse(raw) : [];
  const app = apps.find(a => a.id === decoded);
  if (!app) return json({ error: 'App not found' }, 404);

  const fresh = await fetchAndCacheApp(app, env);
  return json(fresh);
}
