import { extractApks } from '../utils.js';

const BASE = 'https://codeberg.org/api/v1';

async function cbFetch(path, token) {
  const headers = { 'User-Agent': 'apk-tracker/1.0' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { headers });
  if (!res.ok) throw new Error(`Codeberg ${res.status}: ${path}`);
  return res.json();
}

function normalizeRelease(r) {
  return {
    version: r.tag_name,
    name: r.name || r.tag_name,
    publishedAt: r.published_at || r.created_at,
    changelog: r.body || '',
    prerelease: r.prerelease || false,
    releaseUrl: r.html_url,
    apks: extractApks(
      (r.assets || []).map(a => ({
        name: a.name,
        downloadUrl: a.browser_download_url,
        size: a.size || null,
      }))
    ),
  };
}

function normalizeMeta(m) {
  return {
    description: m.description || '',
    stars: m.stars_count || 0,
    iconUrl: m.owner?.avatar_url || null,
    homepage: m.website || null,
  };
}

export async function fetchCodeberg(owner, repo, token) {
  const [releases, meta] = await Promise.all([
    cbFetch(`/repos/${owner}/${repo}/releases?limit=10`, token),
    cbFetch(`/repos/${owner}/${repo}`, token),
  ]);

  return {
    releases: releases.map(normalizeRelease),
    meta: normalizeMeta(meta),
  };
}
