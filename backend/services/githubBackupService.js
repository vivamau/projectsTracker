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

// Staging suffix used by syncDatabase (pull) and index.js startup restore
const STAGING_SUFFIX = '.github-restore';

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
    let message = `GitHub API ${resp.status}`;
    try {
      const json = await resp.json();
      message = humaniseGithubError(resp.status, json.message || '');
    } catch {
      // ignore parse failure — use status-only message
    }
    throw new Error(message);
  }
  return resp.json();
}

function humaniseGithubError(status, msg) {
  if (status === 401) return 'GitHub token is invalid or expired. Generate a new PAT and save it in Settings.';
  if (status === 403) {
    if (msg.toLowerCase().includes('not accessible by personal access token')) {
      return 'Token does not have write access to this repository. ' +
        'For a classic PAT add the "repo" scope; for a fine-grained PAT set Contents to "Read and write".';
    }
    return `GitHub returned 403 Forbidden: ${msg}`;
  }
  if (status === 404) return 'Repository not found. Check the owner/repo value and that the token can access it.';
  if (status === 422) return `GitHub rejected the request (422): ${msg}`;
  return `GitHub API ${status}: ${msg}`;
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
  if (!data.permissions?.push) {
    throw new Error(
      'Token does not have write access to this repository. ' +
      'For a classic PAT add the "repo" scope; for a fine-grained PAT set Contents to "Read and write".'
    );
  }
  return { name: data.full_name, private: data.private };
}

// Returns { headSha, baseTreeSha, blobSha, fileDate } for the branch/file.
// headSha/baseTreeSha are null when the branch doesn't exist yet (first push).
// blobSha/fileDate are null when the file isn't in the tree yet.
async function getRemoteState(token, owner, repoName, branch, filePath) {
  let headSha = null;
  let baseTreeSha = null;

  try {
    const refData = await githubRequest(token, 'GET', `/repos/${owner}/${repoName}/git/ref/heads/${branch}`);
    headSha = refData.object.sha;
    const commitData = await githubRequest(token, 'GET', `/repos/${owner}/${repoName}/git/commits/${headSha}`);
    baseTreeSha = commitData.tree.sha;
  } catch {
    // Branch doesn't exist or repo is empty — treat as first push
    return { headSha: null, baseTreeSha: null, blobSha: null, fileDate: null };
  }

  let blobSha = null;
  let fileDate = null;
  try {
    const treeData = await githubRequest(
      token, 'GET',
      `/repos/${owner}/${repoName}/git/trees/${baseTreeSha}?recursive=1`
    );
    const entry = treeData.tree.find(e => e.path === filePath);
    if (entry) {
      blobSha = entry.sha;
      // Get the date of the last commit that touched this specific file
      const commits = await githubRequest(
        token, 'GET',
        `/repos/${owner}/${repoName}/commits?path=${encodeURIComponent(filePath)}&per_page=1&sha=${branch}`
      );
      if (commits.length > 0) {
        fileDate = new Date(commits[0].commit.committer.date);
      }
    }
  } catch {
    // Tree/commits fetch failed — treat file as absent, will push
  }

  return { headSha, baseTreeSha, blobSha, fileDate };
}

async function pushDatabase(token, owner, repoName, branch, filePath, dbPath, headSha, baseTreeSha, db) {
  const fileContent = fs.readFileSync(dbPath);
  const base64Content = fileContent.toString('base64');

  const blob = await githubRequest(token, 'POST', `/repos/${owner}/${repoName}/git/blobs`, {
    content: base64Content,
    encoding: 'base64',
  });

  const treeBody = {
    tree: [{ path: filePath, mode: '100644', type: 'blob', sha: blob.sha }],
  };
  if (baseTreeSha) treeBody.base_tree = baseTreeSha;
  const tree = await githubRequest(token, 'POST', `/repos/${owner}/${repoName}/git/trees`, treeBody);

  const now = new Date().toISOString();
  const commitBody = {
    message: `Database backup – ${now}`,
    tree: tree.sha,
    parents: headSha ? [headSha] : [],
  };
  const commit = await githubRequest(token, 'POST', `/repos/${owner}/${repoName}/git/commits`, commitBody);

  if (headSha) {
    await githubRequest(token, 'PATCH', `/repos/${owner}/${repoName}/git/refs/heads/${branch}`, {
      sha: commit.sha,
      force: false,
    });
  } else {
    await githubRequest(token, 'POST', `/repos/${owner}/${repoName}/git/refs`, {
      ref: `refs/heads/${branch}`,
      sha: commit.sha,
    });
  }

  await appSettingsService.set(db, KEYS.LAST_SYNC, now, 'system');
  await appSettingsService.set(db, KEYS.LAST_STATUS, 'ok', 'system');

  return { syncedAt: now, commitSha: commit.sha, action: 'pushed' };
}

// Downloads the remote blob to a staging file. The server must be restarted
// for the restore to take effect (index.js moves the staging file on startup).
async function pullDatabase(token, owner, repoName, blobSha, dbPath, db) {
  const blob = await githubRequest(token, 'GET', `/repos/${owner}/${repoName}/git/blobs/${blobSha}`);
  const content = Buffer.from(blob.content.replace(/\n/g, ''), 'base64');

  const stagingPath = `${dbPath}${STAGING_SUFFIX}`;
  fs.writeFileSync(stagingPath, content);

  const now = new Date().toISOString();
  await appSettingsService.set(db, KEYS.LAST_SYNC, now, 'system');
  await appSettingsService.set(db, KEYS.LAST_STATUS, 'ok', 'system');

  return { syncedAt: now, action: 'pulled', requiresRestart: true };
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

  const localMtime = fs.existsSync(dbPath) ? fs.statSync(dbPath).mtime : new Date(0);
  const { headSha, baseTreeSha, blobSha, fileDate } = await getRemoteState(
    settings.token, owner, repoName, branch, filePath
  );

  // No remote file yet, or local DB is newer → push
  if (fileDate === null || localMtime > fileDate) {
    return await pushDatabase(settings.token, owner, repoName, branch, filePath, dbPath, headSha, baseTreeSha, db);
  }

  // Remote is strictly newer → download to staging (restart required to apply)
  if (fileDate > localMtime) {
    return await pullDatabase(settings.token, owner, repoName, blobSha, dbPath, db);
  }

  // Same timestamp — already in sync
  const now = new Date().toISOString();
  await appSettingsService.set(db, KEYS.LAST_SYNC, now, 'system');
  await appSettingsService.set(db, KEYS.LAST_STATUS, 'ok', 'system');
  return { syncedAt: now, action: 'up_to_date' };
}

async function recordFailure(db, message) {
  await appSettingsService.set(db, KEYS.LAST_STATUS, `error: ${message}`, 'system');
}

module.exports = {
  getSettings, saveSettings, testConnection, syncDatabase, recordFailure,
  KEYS, STAGING_SUFFIX,
};
