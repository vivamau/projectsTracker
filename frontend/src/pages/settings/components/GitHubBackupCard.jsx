import { useState, useEffect } from 'react';
import { GitBranch, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import Card from '../../../commoncomponents/Card';
import {
  getGithubBackupSettings,
  saveGithubBackupSettings,
  testGithubBackupConnection,
  syncGithubBackup,
} from '../../../api/githubBackupApi';

const MASKED = '••••••••';

const DEFAULT_FORM = {
  enabled: false,
  token: '',
  repo: '',
  branch: 'main',
  filePath: 'database.sqlite',
};

export default function GitHubBackupCard() {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [lastSync, setLastSync] = useState(null);
  const [lastStatus, setLastStatus] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null); // null | { ok, message }

  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null); // null | { ok, message }

  useEffect(() => {
    getGithubBackupSettings()
      .then(r => {
        const d = r.data.data;
        setForm({
          enabled:  d.enabled,
          token:    d.token || '',
          repo:     d.repo || '',
          branch:   d.branch || 'main',
          filePath: d.filePath || 'database.sqlite',
        });
        setLastSync(d.lastSync);
        setLastStatus(d.lastStatus);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setSaveError('');
    try {
      const res = await saveGithubBackupSettings(form);
      const d = res.data.data;
      setForm(f => ({ ...f, token: d.token || '' }));
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setSaveError(err.response?.data?.error || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await testGithubBackupConnection({ token: form.token, repo: form.repo });
      setTestResult({ ok: true, message: `Connected to ${res.data.data.name}` });
    } catch (err) {
      setTestResult({ ok: false, message: err.response?.data?.error || 'Connection failed' });
    } finally {
      setTesting(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await syncGithubBackup();
      const d = res.data.data;
      setLastSync(d.syncedAt);
      setLastStatus('ok');
      if (d.action === 'pushed') {
        setSyncResult({ ok: true, message: `Pushed — commit ${d.commitSha.slice(0, 7)}` });
      } else if (d.action === 'pulled') {
        setSyncResult({ ok: true, message: 'Remote database is newer — restore staged. Restart the server to apply.', warn: true });
      } else {
        setSyncResult({ ok: true, message: 'Already up to date' });
      }
    } catch (err) {
      const msg = err.response?.data?.error || 'Sync failed';
      setLastStatus(`error: ${msg}`);
      setSyncResult({ ok: false, message: msg });
    } finally {
      setSyncing(false);
    }
  };

  const inputClass = 'w-full rounded-lg border border-border-dark px-3 py-2 text-sm outline-none focus:border-primary-500 bg-surface';
  const labelClass = 'mb-1.5 block text-sm font-medium text-text-primary';

  if (loading) {
    return (
      <Card title="GitHub Backup">
        <p className="text-sm text-text-secondary">Loading…</p>
      </Card>
    );
  }

  return (
    <Card title="GitHub Backup">
      <div className="flex items-start gap-3 mb-4">
        <GitBranch size={18} className="mt-0.5 text-text-secondary shrink-0" />
        <p className="text-sm text-text-secondary">
          Sync the database to a <strong>private</strong> GitHub repository on demand.
          The token needs <span className="font-mono text-xs">repo</span> scope.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        {/* Enable toggle */}
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <div
            onClick={() => setForm(f => ({ ...f, enabled: !f.enabled }))}
            className={`relative w-10 h-6 rounded-full transition-colors ${form.enabled ? 'bg-primary-500' : 'bg-border-dark'}`}
          >
            <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.enabled ? 'translate-x-4' : ''}`} />
          </div>
          <span className="text-sm font-medium text-text-primary">Enable GitHub backup</span>
        </label>

        {/* Config fields — always shown so user can configure before enabling */}
        <div>
          <label className={labelClass}>GitHub Personal Access Token</label>
          <input
            type="password"
            value={form.token}
            onChange={e => setForm(f => ({ ...f, token: e.target.value }))}
            placeholder="ghp_…"
            className={inputClass}
            autoComplete="new-password"
          />
          <p className="mt-1 text-xs text-text-secondary">
            Classic PAT with <span className="font-mono">repo</span> scope, or a fine-grained token with Contents read/write.
          </p>
        </div>

        <div>
          <label className={labelClass}>Repository (owner/repo)</label>
          <input
            type="text"
            value={form.repo}
            onChange={e => setForm(f => ({ ...f, repo: e.target.value }))}
            placeholder="myorg/my-private-backup"
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Branch</label>
            <input
              type="text"
              value={form.branch}
              onChange={e => setForm(f => ({ ...f, branch: e.target.value }))}
              placeholder="main"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>File path in repo</label>
            <input
              type="text"
              value={form.filePath}
              onChange={e => setForm(f => ({ ...f, filePath: e.target.value }))}
              placeholder="database.sqlite"
              className={inputClass}
            />
          </div>
        </div>

        {saveError && (
          <p className="text-sm text-red-500">{saveError}</p>
        )}

        <div className="flex items-center gap-3 flex-wrap pt-1">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 transition-colors disabled:opacity-60"
          >
            {saving ? 'Saving…' : saved ? 'Saved!' : 'Save'}
          </button>

          <button
            type="button"
            onClick={handleTest}
            disabled={testing || !form.repo || !form.token}
            className="rounded-lg border border-border-dark px-4 py-2 text-sm font-medium text-text-primary hover:bg-surface-hover transition-colors disabled:opacity-60"
          >
            {testing ? 'Testing…' : 'Test connection'}
          </button>

          <button
            type="button"
            onClick={handleSync}
            disabled={syncing || !form.enabled}
            className="flex items-center gap-1.5 rounded-lg border border-border-dark px-4 py-2 text-sm font-medium text-text-primary hover:bg-surface-hover transition-colors disabled:opacity-60"
            title={!form.enabled ? 'Enable backup first' : undefined}
          >
            <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Syncing…' : 'Sync now'}
          </button>
        </div>
      </form>

      {/* Inline feedback */}
      {testResult && (
        <div className={`mt-3 flex items-center gap-2 text-sm ${testResult.ok ? 'text-green-600' : 'text-red-500'}`}>
          {testResult.ok ? <CheckCircle size={14} /> : <XCircle size={14} />}
          {testResult.message}
        </div>
      )}
      {syncResult && (
        <div className={`mt-2 flex items-center gap-2 text-sm ${syncResult.ok ? (syncResult.warn ? 'text-amber-600' : 'text-green-600') : 'text-red-500'}`}>
          {syncResult.ok ? <CheckCircle size={14} /> : <XCircle size={14} />}
          {syncResult.message}
        </div>
      )}

      {/* Status footer */}
      {(lastSync || lastStatus) && (
        <div className="mt-4 pt-3 border-t border-border text-xs text-text-secondary space-y-0.5">
          {lastSync && (
            <p>Last sync: {new Date(lastSync).toLocaleString()}</p>
          )}
          {lastStatus && (
            <p className={lastStatus === 'ok' ? 'text-green-600' : 'text-red-500'}>
              Status: {lastStatus}
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
