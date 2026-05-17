const fs = require('fs');
const appSettingsService = require('./appSettingsService');
const { getStore } = require('./secretsStore');

const KEYS = {
  ENABLED:     'github_backup_enabled',
  TOKEN:       'github_backup_token',
  REPO:        'github_backup_repo',
  BRANCH:      'github_backup_branch',
  FILE_PATH:   'github_backup_path',
  LAST_SYNC:   'github_backup_last_sync',
  LAST_STATUS: 'github_backup_last_status',
};

async function getSettings(db) {
  const store = getStore();
  const [enabled, repo, branch, filePath, lastSync, lastStatus] = await Promise.all([
    appSettingsService.get(db, KEYS.ENABLED),
    appSettingsService.get(db, KEYS.REPO),
    appSettingsService.get(db, KEYS.BRANCH),
    appSettingsService.get(db, KEYS.FILE_PATH),
    appSettingsService.get(db, KEYS.LAST_SYNC),
    appSettingsService.get(db, KEYS.LAST_STATUS),
  ]);
  return {
    enabled:    enabled === 'true',
    token:      store.get(KEYS.TOKEN) || '',
    repo:       repo || '',
    branch:     branch || 'main',
    filePath:   filePath || 'database.sqlite',
    lastSync:   lastSync || null,
    lastStatus: lastStatus || null,
  };
}

async function saveSettings(db, { enabled, token, repo, branch, filePath }, updatedBy) {
  const store = getStore();
  const ops = [
    appSettingsService.set(db, KEYS.ENABLED, String(enabled === true || enabled === 'true'), updatedBy),
  ];
  if (token !== undefined)    store.set(KEYS.TOKEN, token);
  if (repo !== undefined)     ops.push(appSettingsService.set(db, KEYS.REPO, repo, updatedBy));
  if (branch !== undefined)   ops.push(appSettingsService.set(db, KEYS.BRANCH, branch || 'main', updatedBy));
  if (filePath !== undefined) ops.push(appSettingsService.set(db, KEYS.FILE_PATH, filePath || 'database.sqlite', updatedBy));
  await Promise.all(ops);
}

async function githubRequest(token, method, apiPath, body) {
  const resp = await fetch(`https://api.github.com${apiPath}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      'User-Agent': 'ProjectsTracker-Backup/1.0',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`GitHub API ${resp.status}: ${text.slice(0, 300)}`);
  }
  return resp.json();
}

async function testConnection(token, repo) {
  if (!token) throw new Error('Token is required');
  const parts = (repo || '').split('/');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error('Invalid repo format, expected owner/repo');
  }
  const [owner, repoName] = parts;
  const data = await githubRequest(token, 'GET', `/repos/${owner}/${repoName}`);
  if (!data.private) throw new Error('Repository must be private');
  return { name: data.full_name, private: data.private };
}

async function syncDatabase(db, dbPath) {
  const settings = await getSettings(db);
  if (!settings.enabled) throw new Error('GitHub backup is not enabled');
  if (!settings.token)   throw new Error('GitHub token is not configured');
  if (!settings.repo)    throw new Error('GitHub repository is not configured');

  const parts = settings.repo.split('/');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error('Invalid repo format, expected owner/repo');
  }
  const [owner, repoName] = parts;
  const branch   = settings.branch   || 'main';
  const filePath = settings.filePath || 'database.sqlite';

  const fileContent  = fs.readFileSync(dbPath);
  const base64Content = fileContent.toString('base64');

  // Create blob
  const blob = await githubRequest(settings.token, 'POST', `/repos/${owner}/${repoName}/git/blobs`, {
    content: base64Content,
    encoding: 'base64',
  });

  // Try to get current HEAD; handle empty/new repos
  let headSha     = null;
  let baseTreeSha = null;
  try {
    const refData    = await githubRequest(settings.token, 'GET', `/repos/${owner}/${repoName}/git/ref/heads/${branch}`);
    headSha          = refData.object.sha;
    const commitData = await githubRequest(settings.token, 'GET', `/repos/${owner}/${repoName}/git/commits/${headSha}`);
    baseTreeSha      = commitData.tree.sha;
  } catch {
    // Branch doesn't exist yet — first push
  }

  // Create tree
  const treeBody = {
    tree: [{ path: filePath, mode: '100644', type: 'blob', sha: blob.sha }],
  };
  if (baseTreeSha) treeBody.base_tree = baseTreeSha;
  const tree = await githubRequest(settings.token, 'POST', `/repos/${owner}/${repoName}/git/trees`, treeBody);

  // Create commit
  const now = new Date().toISOString();
  const commitBody = { message: `Database backup – ${now}`, tree: tree.sha, parents: headSha ? [headSha] : [] };
  const commit = await githubRequest(settings.token, 'POST', `/repos/${owner}/${repoName}/git/commits`, commitBody);

  // Create or update ref
  if (headSha) {
    await githubRequest(settings.token, 'PATCH', `/repos/${owner}/${repoName}/git/refs/heads/${branch}`, {
      sha: commit.sha,
      force: false,
    });
  } else {
    await githubRequest(settings.token, 'POST', `/repos/${owner}/${repoName}/git/refs`, {
      ref: `refs/heads/${branch}`,
      sha: commit.sha,
    });
  }

  await appSettingsService.set(db, KEYS.LAST_SYNC, now, 'system');
  await appSettingsService.set(db, KEYS.LAST_STATUS, 'ok', 'system');

  return { syncedAt: now, commitSha: commit.sha };
}

async function recordFailure(db, message) {
  await appSettingsService.set(db, KEYS.LAST_STATUS, `error: ${message}`, 'system');
}

module.exports = { getSettings, saveSettings, testConnection, syncDatabase, recordFailure, KEYS };
