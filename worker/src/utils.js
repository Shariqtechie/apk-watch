export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

export function detectSource(url) {
  if (url.includes('github.com')) return 'github';
  if (url.includes('gitlab.com')) return 'gitlab';
  if (url.includes('codeberg.org')) return 'codeberg';
  return null;
}

export function parseRepoUrl(url) {
  const clean = url.replace(/\.git$/, '').replace(/\/$/, '').split('?')[0];
  const parts = clean.split('/');
  const repo = parts.pop();
  const owner = parts.pop();
  return { owner, repo };
}

export function buildAppId(source, owner, repo) {
  return `${source}:${owner}:${repo}`;
}

// Filter assets to only .apk files and normalize shape
export function extractApks(assets) {
  return assets
    .filter(a => a.name?.toLowerCase().endsWith('.apk'))
    .map(a => ({
      name: a.name,
      downloadUrl: a.downloadUrl,
      size: a.size || null,
    }));
}
