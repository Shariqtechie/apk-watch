import { extractApks } from '../utils.js';

const BASE = 'https://api.github.com';

async function ghFetch(path, token) {
  const headers = { 'User-Agent': 'apk-tracker/1.0' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { headers });
  if (!res.ok) throw new Error(`GitHub ${res.status}: ${path}`);
  return res.json();
}

function normalizeRelease(r) {
  return {
    version: r.tag_name,
    name: r.name || r.tag_name,
    publishedAt: r.published_at,
    changelog: r.body || '',
    prerelease: r.prerelease || false,
    releaseUrl: r.html_url,
    apks: extractApks(
      (r.assets || []).map(a => ({
        name: a.name,
        downloadUrl: a.browser_download_url,
        size: a.size,
      }))
    ),
  };
}

function normalizeMeta(m) {
  return {
    description: m.description || '',
    stars: m.stargazers_count || 0,
    iconUrl: m.owner?.avatar_url || null,
    homepage: m.homepage || null,
  };
}

export async function fetchGitHub(owner, repo, token) {
  const [releases, meta] = await Promise.all([
    ghFetch(`/repos/${owner}/${repo}/releases?per_page=10`, token),
    ghFetch(`/repos/${owner}/${repo}`, token),
  ]);

  return {
    releases: releases.map(normalizeRelease),
    meta: normalizeMeta(meta),
  };
}
