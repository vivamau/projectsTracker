const fs = require('fs');
const path = require('path');
const appSettingsService = require('./appSettingsService');
const { getStore } = require('./secretsStore');

const KEYS = {
  ENABLED:     'github_backup_enabled',
  TOKEN:       'github_backup_token',
  REPO:        'github_backup_repo',
  BRANCH:      'github_backup_branch',
  LAST_SYNC:   'github_backup_last_sync',
  LAST_STATUS: 'github_backup_last_status',
};

const STAGING_SUFFIX = '.github-restore';

async function getSettings(db) {
  const store = getStore();
  const [enabled, repo, branch, lastSync, lastStatus] = await Promise.all([
    appSettingsService.get(db, KEYS.ENABLED),
    appSettingsService.get(db, KEYS.REPO),
    appSettingsService.get(db, KEYS.BRANCH),
    appSettingsService.get(db, KEYS.LAST_SYNC),
    appSettingsService.get(db, KEYS.LAST_STATUS),
  ]);
  return {
    enabled:    enabled === 'true',
    token:      store.get(KEYS.TOKEN) || '',
    repo:       repo || '',
    branch:     branch || 'main',
    lastSync:   lastSync || null,
    lastStatus: lastStatus || null,
  };
}

async function saveSettings(db, { enabled, token, repo, branch }, updatedBy) {
  const store = getStore();
  const ops = [
    appSettingsService.set(db, KEYS.ENABLED, String(enabled === true || enabled === 'true'), updatedBy),
  ];
  if (token  !== undefined) store.set(KEYS.TOKEN, token);
  if (repo   !== undefined) ops.push(appSettingsService.set(db, KEYS.REPO, repo, updatedBy));
  if (branch !== undefined) ops.push(appSettingsService.set(db, KEYS.BRANCH, branch || 'main', updatedBy));
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

// Fetches the remote branch head and returns a flat map of all blob entries.
async function getRemoteTree(token, owner, repoName, branch) {
  let headSha = null;
  let baseTreeSha = null;
  const treeEntries = {}; // repoPath → { sha: blobSha }

  try {
    const refData = await githubRequest(token, 'GET', `/repos/${owner}/${repoName}/git/ref/heads/${branch}`);
    headSha = refData.object.sha;
    const commitData = await githubRequest(token, 'GET', `/repos/${owner}/${repoName}/git/commits/${headSha}`);
    baseTreeSha = commitData.tree.sha;
  } catch {
    return { headSha: null, baseTreeSha: null, treeEntries };
  }

  try {
    const treeData = await githubRequest(
      token, 'GET',
      `/repos/${owner}/${repoName}/git/trees/${baseTreeSha}?recursive=1`
    );
    for (const entry of treeData.tree) {
      if (entry.type === 'blob') treeEntries[entry.path] = { sha: entry.sha };
    }
  } catch {
    // Tree fetch failed — treat remote as empty
  }

  return { headSha, baseTreeSha, treeEntries };
}

async function getFileDate(token, owner, repoName, branch, filePath) {
  try {
    const commits = await githubRequest(
      token, 'GET',
      `/repos/${owner}/${repoName}/commits?path=${encodeURIComponent(filePath)}&per_page=1&sha=${branch}`
    );
    if (commits.length > 0) return new Date(commits[0].commit.committer.date);
  } catch {}
  return null;
}

// Push multiple files as a single commit. Returns { sha, syncedAt }.
async function pushFiles(token, owner, repoName, branch, files, headSha, baseTreeSha) {
  const treeItems = [];
  for (const { repoPath, localPath } of files) {
    const content = fs.readFileSync(localPath);
    const blob = await githubRequest(token, 'POST', `/repos/${owner}/${repoName}/git/blobs`, {
      content: content.toString('base64'),
      encoding: 'base64',
    });
    treeItems.push({ path: repoPath, mode: '100644', type: 'blob', sha: blob.sha });
  }

  const treeBody = { tree: treeItems };
  if (baseTreeSha) treeBody.base_tree = baseTreeSha;
  const tree = await githubRequest(token, 'POST', `/repos/${owner}/${repoName}/git/trees`, treeBody);

  const now = new Date().toISOString();
  const commit = await githubRequest(token, 'POST', `/repos/${owner}/${repoName}/git/commits`, {
    message: `Backup – ${now}`,
    tree: tree.sha,
    parents: headSha ? [headSha] : [],
  });

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

  return { sha: commit.sha, syncedAt: now };
}

async function pullBlob(token, owner, repoName, blobSha) {
  const blob = await githubRequest(token, 'GET', `/repos/${owner}/${repoName}/git/blobs/${blobSha}`);
  return Buffer.from(blob.content.replace(/\n/g, ''), 'base64');
}

// Syncs database.sqlite, audit.sqlite, and all notes/*.md files in dataDir.
// SQLite files are downloaded to a staging path (restart required to apply).
// Notes files are written directly.
async function syncAll(db, dataDir) {
  const settings = await getSettings(db);
  if (!settings.enabled) throw new Error('GitHub backup is not enabled');
  if (!settings.token)   throw new Error('GitHub token is not configured');
  if (!settings.repo)    throw new Error('GitHub repository is not configured');

  const parts = settings.repo.split('/');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error('Invalid repo format, expected owner/repo');
  }
  const [owner, repoName] = parts;
  const branch = settings.branch || 'main';

  const dbFiles = [
    { repoPath: 'database.sqlite', localPath: path.join(dataDir, 'database.sqlite') },
    { repoPath: 'audit.sqlite',    localPath: path.join(dataDir, 'audit.sqlite') },
  ];

  const notesDir = path.join(dataDir, 'notes');
  const localNoteFiles = [];
  if (fs.existsSync(notesDir)) {
    for (const f of fs.readdirSync(notesDir)) {
      if (f.endsWith('.md')) {
        localNoteFiles.push({ repoPath: `notes/${f}`, localPath: path.join(notesDir, f) });
      }
    }
  }

  const { headSha, baseTreeSha, treeEntries } = await getRemoteTree(settings.token, owner, repoName, branch);

  // All candidate files (local DB files + local notes + remote-only notes)
  const allFiles = [...dbFiles, ...localNoteFiles];
  for (const repoPath of Object.keys(treeEntries)) {
    if (repoPath.startsWith('notes/') && repoPath.endsWith('.md')) {
      if (!allFiles.find(f => f.repoPath === repoPath)) {
        allFiles.push({
          repoPath,
          localPath: path.join(notesDir, path.basename(repoPath)),
          remoteOnly: true,
        });
      }
    }
  }

  // Fetch dates in parallel for all files that exist in the remote tree
  const remoteFilePaths = allFiles.map(f => f.repoPath).filter(p => treeEntries[p]);
  const datePairs = await Promise.all(
    remoteFilePaths.map(p =>
      getFileDate(settings.token, owner, repoName, branch, p).then(d => [p, d])
    )
  );
  const remoteDates = Object.fromEntries(datePairs);

  const toPush  = [];
  const toPull  = [];
  const upToDate = [];

  for (const { repoPath, localPath, remoteOnly } of allFiles) {
    const localExists = fs.existsSync(localPath);
    const remoteEntry = treeEntries[repoPath];
    const remoteDate  = remoteDates[repoPath] || null;

    if (remoteOnly || (!localExists && remoteEntry)) {
      toPull.push({ repoPath, localPath, blobSha: remoteEntry.sha, isDb: false });
    } else if (!remoteEntry) {
      if (localExists) toPush.push({ repoPath, localPath });
    } else {
      const localMtime = fs.statSync(localPath).mtime;
      if (!remoteDate || localMtime > remoteDate) {
        toPush.push({ repoPath, localPath });
      } else if (remoteDate > localMtime) {
        toPull.push({ repoPath, localPath, blobSha: remoteEntry.sha, isDb: repoPath.endsWith('.sqlite') });
      } else {
        upToDate.push(repoPath);
      }
    }
  }

  let commitSha = null;
  let syncedAt  = new Date().toISOString();
  let requiresRestart = false;

  if (toPush.length > 0) {
    const pushResult = await pushFiles(settings.token, owner, repoName, branch, toPush, headSha, baseTreeSha);
    commitSha = pushResult.sha;
    syncedAt  = pushResult.syncedAt;
  }

  if (toPull.length > 0) {
    for (const { localPath, blobSha, isDb } of toPull) {
      const content = await pullBlob(settings.token, owner, repoName, blobSha);
      if (isDb) {
        fs.writeFileSync(`${localPath}${STAGING_SUFFIX}`, content);
        requiresRestart = true;
      } else {
        const dir = path.dirname(localPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(localPath, content);
      }
    }
  }

  await appSettingsService.set(db, KEYS.LAST_SYNC, syncedAt, 'system');
  await appSettingsService.set(db, KEYS.LAST_STATUS, 'ok', 'system');

  return {
    syncedAt,
    pushed:         toPush.map(f => f.repoPath),
    pulled:         toPull.map(f => f.repoPath),
    upToDate,
    commitSha,
    requiresRestart,
  };
}

async function recordFailure(db, message) {
  await appSettingsService.set(db, KEYS.LAST_STATUS, `error: ${message}`, 'system');
}

module.exports = {
  getSettings, saveSettings, testConnection, syncAll, recordFailure,
  KEYS, STAGING_SUFFIX,
};
