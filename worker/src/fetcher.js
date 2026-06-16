import { fetchGitHub } from './adapters/github.js';
import { fetchGitLab } from './adapters/gitlab.js';
import { fetchCodeberg } from './adapters/codeberg.js';

export async function fetchAndCacheApp(app, env) {
  const { id, source, owner, repo, name } = app;

  // Pick token per source
  const token =
    source === 'github' ? env.GITHUB_TOKEN :
    source === 'gitlab' ? env.GITLAB_TOKEN :
    source === 'codeberg' ? env.CODEBERG_TOKEN :
    null;

  // Pick adapter
  let raw;
  if (source === 'github') raw = await fetchGitHub(owner, repo, token);
  else if (source === 'gitlab') raw = await fetchGitLab(owner, repo, token);
  else if (source === 'codeberg') raw = await fetchCodeberg(owner, repo, token);
  else throw new Error(`Unknown source: ${source}`);

  const cached = {
    id,
    url: app.url,
    source,
    owner,
    repo,
    name,
    meta: raw.meta,
    latest: raw.releases[0] || null,
    releases: raw.releases,
    addedAt: app.addedAt,
    updatedAt: new Date().toISOString(),
  };

  // Cache in KV for 6 hours
  await env.APK_KV.put(`release:${id}`, JSON.stringify(cached), {
    expirationTtl: 60 * 60 * 6,
  });

  return cached;
}

// Refresh all apps — used by cron
export async function refreshAll(env) {
  const raw = await env.APK_KV.get('apps');
  const apps = raw ? JSON.parse(raw) : [];

  const results = await Promise.allSettled(
    apps.map(app => fetchAndCacheApp(app, env))
  );

  const failed = results
    .map((r, i) => r.status === 'rejected' ? `${apps[i].id}: ${r.reason?.message}` : null)
    .filter(Boolean);

  console.log(`[cron] refreshed ${apps.length} apps, ${failed.length} failed`);
  if (failed.length) console.error('[cron] failures:', failed);
}
