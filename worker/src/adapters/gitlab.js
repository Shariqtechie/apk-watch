import { extractApks } from '../utils.js';

const BASE = 'https://gitlab.com/api/v4';

async function glFetch(path, token) {
  const headers = { 'User-Agent': 'apk-tracker/1.0' };
  if (token) headers['PRIVATE-TOKEN'] = token;
  const res = await fetch(`${BASE}${path}`, { headers });
  if (!res.ok) throw new Error(`GitLab ${res.status}: ${path}`);
  return res.json();
}

function normalizeRelease(r) {
  const links = r.assets?.links || [];
  return {
    version: r.tag_name,
    name: r.name || r.tag_name,
    publishedAt: r.released_at || r.created_at,
    changelog: r.description || '',
    prerelease: false, // GitLab has no prerelease flag
    releaseUrl: `https://gitlab.com/-/releases/${r.tag_name}`,
    apks: extractApks(
      links.map(a => ({
        name: a.name,
        downloadUrl: a.direct_asset_url || a.url,
        size: a.size || null,
      }))
    ),
  };
}

function normalizeMeta(m) {
  return {
    description: m.description || '',
    stars: m.star_count || 0,
    iconUrl: m.avatar_url || null,
    homepage: m.web_url || null,
  };
}

export async function fetchGitLab(owner, repo, token) {
  const encoded = encodeURIComponent(`${owner}/${repo}`);
  const [releases, meta] = await Promise.all([
    glFetch(`/projects/${encoded}/releases?per_page=10`, token),
    glFetch(`/projects/${encoded}`, token),
  ]);

  return {
    releases: releases.map(normalizeRelease),
    meta: normalizeMeta(meta),
  };
}
