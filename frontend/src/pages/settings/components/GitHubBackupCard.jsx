import { useState, useEffect } from 'react';
import { GitBranch, CheckCircle, XCircle, ArrowUp, ArrowDown } from 'lucide-react';
import Card from '../../../commoncomponents/Card';
import {
  getGithubBackupSettings,
  saveGithubBackupSettings,
  testGithubBackupConnection,
  pushGithubBackup,
  pullGithubBackup,
} from '../../../api/githubBackupApi';

const DEFAULT_FORM = {
  enabled: false,
  token: '',
  repo: '',
  branch: 'main',
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
  const [testResult, setTestResult] = useState(null);

  const [pushing, setPushing] = useState(false);
  const [pushResult, setPushResult] = useState(null);

  const [pulling, setPulling] = useState(false);
  const [pullResult, setPullResult] = useState(null);

  useEffect(() => {
    getGithubBackupSettings()
      .then(r => {
        const d = r.data.data;
        setForm({
          enabled: d.enabled,
          token:   d.token || '',
          repo:    d.repo || '',
          branch:  d.branch || 'main',
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

  const handlePush = async () => {
    setPushing(true);
    setPushResult(null);
    setPullResult(null);
    try {
      const res = await pushGithubBackup();
      const d = res.data.data;
      setLastSync(d.syncedAt);
      setLastStatus('ok');
      setPushResult({ ok: true, pushed: d.pushed || [], commitSha: d.commitSha });
    } catch (err) {
      const msg = err.response?.data?.error || 'Push failed';
      setLastStatus(`error: ${msg}`);
      setPushResult({ ok: false, error: msg });
    } finally {
      setPushing(false);
    }
  };

  const handlePull = async () => {
    setPulling(true);
    setPullResult(null);
    setPushResult(null);
    try {
      const res = await pullGithubBackup();
      const d = res.data.data;
      setLastSync(d.syncedAt);
      setLastStatus('ok');
      setPullResult({ ok: true, pulled: d.pulled || [], requiresRestart: d.requiresRestart });
    } catch (err) {
      const msg = err.response?.data?.error || 'Pull failed';
      setLastStatus(`error: ${msg}`);
      setPullResult({ ok: false, error: msg });
    } finally {
      setPulling(false);
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
          Back up databases and notes to a <strong>private</strong> GitHub repository.
          Use <strong>Push</strong> to upload local data and <strong>Pull</strong> to restore from GitHub.
          The token needs <span className="font-mono text-xs">repo</span> scope.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <div
            onClick={() => setForm(f => ({ ...f, enabled: !f.enabled }))}
            className={`relative w-10 h-6 rounded-full transition-colors ${form.enabled ? 'bg-primary-500' : 'bg-border-dark'}`}
          >
            <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.enabled ? 'translate-x-4' : ''}`} />
          </div>
          <span className="text-sm font-medium text-text-primary">Enable GitHub backup</span>
        </label>

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

        {saveError && <p className="text-sm text-red-500">{saveError}</p>}

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
            onClick={handlePush}
            disabled={pushing || !form.enabled}
            className="flex items-center gap-1.5 rounded-lg border border-border-dark px-4 py-2 text-sm font-medium text-text-primary hover:bg-surface-hover transition-colors disabled:opacity-60"
            title={!form.enabled ? 'Enable backup first' : 'Push local data to GitHub'}
          >
            <ArrowUp size={14} className={pushing ? 'animate-pulse' : ''} />
            {pushing ? 'Pushing…' : 'Push'}
          </button>

          <button
            type="button"
            onClick={handlePull}
            disabled={pulling || !form.enabled}
            className="flex items-center gap-1.5 rounded-lg border border-border-dark px-4 py-2 text-sm font-medium text-text-primary hover:bg-surface-hover transition-colors disabled:opacity-60"
            title={!form.enabled ? 'Enable backup first' : 'Pull data from GitHub'}
          >
            <ArrowDown size={14} className={pulling ? 'animate-pulse' : ''} />
            {pulling ? 'Pulling…' : 'Pull'}
          </button>
        </div>
      </form>

      {testResult && (
        <div className={`mt-3 flex items-center gap-2 text-sm ${testResult.ok ? 'text-green-600' : 'text-red-500'}`}>
          {testResult.ok ? <CheckCircle size={14} /> : <XCircle size={14} />}
          {testResult.message}
        </div>
      )}

      {pushResult && (
        <div className="mt-3 text-sm space-y-1.5">
          {!pushResult.ok && (
            <div className="flex items-center gap-2 text-red-500">
              <XCircle size={14} className="shrink-0" /> {pushResult.error}
            </div>
          )}
          {pushResult.ok && (
            <div>
              <div className="flex items-center gap-1.5 text-green-600 font-medium mb-0.5">
                <ArrowUp size={13} className="shrink-0" />
                Pushed{pushResult.commitSha ? ` — commit ${pushResult.commitSha.slice(0, 7)}` : ''}
              </div>
              <ul className="ml-5 space-y-0.5 text-text-secondary">
                {pushResult.pushed.map(f => <li key={f} className="font-mono text-xs">{f}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}

      {pullResult && (
        <div className="mt-3 text-sm space-y-1.5">
          {!pullResult.ok && (
            <div className="flex items-center gap-2 text-red-500">
              <XCircle size={14} className="shrink-0" /> {pullResult.error}
            </div>
          )}
          {pullResult.ok && pullResult.pulled.length === 0 && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle size={14} className="shrink-0" /> Nothing to pull — remote is empty
            </div>
          )}
          {pullResult.ok && pullResult.pulled.length > 0 && (
            <div>
              <div className={`flex items-center gap-1.5 font-medium mb-0.5 ${pullResult.requiresRestart ? 'text-amber-600' : 'text-green-600'}`}>
                <ArrowDown size={13} className="shrink-0" />
                Pulled{pullResult.requiresRestart ? ' — restart required to apply DB changes' : ''}
              </div>
              <ul className="ml-5 space-y-0.5 text-text-secondary">
                {pullResult.pulled.map(f => <li key={f} className="font-mono text-xs">{f}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}

      {(lastSync || lastStatus) && (
        <div className="mt-4 pt-3 border-t border-border text-xs text-text-secondary space-y-0.5">
          {lastSync && <p>Last operation: {new Date(lastSync).toLocaleString()}</p>}
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
