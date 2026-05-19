import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useAppSettings } from '../../hooks/useAppSettings';
import client from '../../api/client';
import { updateAvatar } from '../../api/authApi';
import { importActivities } from '../../api/entitiesApi';
import Card from '../../commoncomponents/Card';
import UserAvatar from '../../commoncomponents/UserAvatar';
import SeniorityManagementModal from './SeniorityManagementModal';
import ProjectStatusManagementModal from './ProjectStatusManagementModal';
import HealthStatusManagementModal from './HealthStatusManagementModal';
import ProjectRolesManagementModal from './ProjectRolesManagementModal';
import { getAgentSettings, updateAgentSettings, getAgentModels } from '../../api/agentApi';
import { Upload, CheckCircle, AlertCircle } from 'lucide-react';
import GitHubBackupCard from './components/GitHubBackupCard';

const DICEBEAR_STYLES = [
  'adventurer', 'adventurer-neutral', 'avataaars', 'big-ears', 'big-smile',
  'bottts', 'croodles', 'dylan', 'fun-emoji', 'glass', 'icons', 'identicon',
  'initials', 'lorelei', 'micah', 'miniavs', 'notionists', 'open-peeps',
  'personas', 'pixel-art', 'rings', 'shapes', 'thumbs',
];

const AVATAR_SEEDS = [
  'alpha', 'beta', 'gamma', 'delta', 'echo', 'foxtrot',
  'golf', 'hotel', 'india', 'juliet', 'kilo', 'lima',
  'mike', 'nova', 'oscar', 'papa', 'quinn', 'romeo',
  'sierra', 'tango', 'ultra', 'victor', 'whiskey', 'xray',
];

const PROVIDERS = [
  { value: 'ollama',    label: 'Ollama (local)' },
  { value: 'llamacpp',  label: 'llama.cpp (local)' },
  { value: 'claude',  label: 'Claude (Anthropic)' },
  { value: 'gemini',  label: 'Gemini (Google)' },
  { value: 'gpt',     label: 'GPT (OpenAI)' },
  { value: 'nvidia',      label: 'NVIDIA NIM' },
  { value: 'openrouter',  label: 'OpenRouter' },
];

const CLAUDE_MODELS = ['claude-opus-4-7', 'claude-sonnet-4-6', 'claude-haiku-4-5-20251001'];
const GEMINI_MODELS = [
  'gemini-2.5-pro-preview-05-06',
  'gemini-2.5-flash-preview-04-17',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-pro',
  'gemini-1.5-flash',
];
const GPT_MODELS    = ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'];


const NVIDIA_MODELS = [
  'minimaxai/minimax-m2.7',
  'meta/llama-3.3-70b-instruct',
  'meta/llama-3.1-405b-instruct',
  'mistralai/mistral-large-2-instruct',
  'nvidia/llama-3.1-nemotron-70b-instruct',
  'qwen/qwen2.5-72b-instruct',
  'google/gemma-3-27b-it',
];

const EMPTY_FORM = {
  ollama_url: '', ollama_model: '', ollama_api_key: '',
  llamacpp_url: '', llamacpp_model: '', llamacpp_api_key: '',
  agent_provider: 'ollama',
  claude_api_key: '', claude_model: 'claude-sonnet-4-6',
  gemini_api_key: '', gemini_model: 'gemini-2.0-flash',
  gpt_api_key: '',    gpt_model: 'gpt-4o',
  nvidia_api_key: '',       nvidia_model: 'minimaxai/minimax-m2.7',
  openrouter_api_key: '',   openrouter_model: 'meta-llama/llama-3.3-70b-instruct',
};

export default function SettingsPage() {
  const { user, role, refreshUser } = useAuth();
  const { settings, updateSetting } = useAppSettings();
  const [seniorityModalOpen, setSeniorityModalOpen] = useState(false);
  const [projectStatusModalOpen, setProjectStatusModalOpen] = useState(false);
  const [healthStatusModalOpen, setHealthStatusModalOpen] = useState(false);
  const [projectRolesModalOpen, setProjectRolesModalOpen] = useState(false);
  const [savingStyle, setSavingStyle] = useState(false);

  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);

  const [agentForm, setAgentForm] = useState(EMPTY_FORM);
  const [agentModels, setAgentModels] = useState([]);
  const [agentSaving, setAgentSaving] = useState(false);
  const [agentSaved, setAgentSaved] = useState(false);

  const [importState, setImportState] = useState('idle'); // idle | loading | done | error
  const [importResult, setImportResult] = useState(null);
  const [importError, setImportError] = useState('');
  const [importReset, setImportReset] = useState(false);
  const importFileRef = useRef(null);

  const handleActivityImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setImportState('loading');
    setImportResult(null);
    setImportError('');
    try {
      const res = await importActivities(file, importReset);
      setImportResult(res.data.data);
      setImportState('done');
    } catch (err) {
      setImportError(err.response?.data?.error || 'Import failed');
      setImportState('error');
    }
  };

  useEffect(() => {
    if (role !== 'superadmin' && role !== 'admin') return;
    getAgentSettings().then(r => setAgentForm(f => ({ ...f, ...r.data.data }))).catch(() => {});
    getAgentModels().then(r => setAgentModels(r.data.data || [])).catch(() => {});
  }, [role]);

  const handleAgentSave = async (e) => {
    e.preventDefault();
    setAgentSaving(true);
    try {
      await updateAgentSettings(agentForm);
      const models = await getAgentModels();
      setAgentModels(models.data.data || []);
      setAgentSaved(true);
      setTimeout(() => setAgentSaved(false), 2000);
    } catch {
      // error silently
    } finally {
      setAgentSaving(false);
    }
  };

  const handleRefreshModels = async () => {
    try {
      const models = await getAgentModels();
      setAgentModels(models.data.data || []);
    } catch {
      setAgentModels([]);
    }
  };

  const handleAvatarSelect = async (seed) => {
    setSavingAvatar(true);
    try {
      await updateAvatar(seed);
      await refreshUser();
      setAvatarPickerOpen(false);
    } catch {
      // silent
    } finally {
      setSavingAvatar(false);
    }
  };

  const handleStyleChange = async (style) => {
    setSavingStyle(true);
    try {
      await client.put('/settings/avatar_style', { value: style });
      updateSetting('avatar_style', style);
    } catch {
      // revert on error
    } finally {
      setSavingStyle(false);
    }
  };

  const activeProvider = agentForm.agent_provider || 'ollama';

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold">Settings</h1>
        <p className="text-sm text-text-secondary">Account information</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

        {/* ── Left column ─────────────────────────────────────────────── */}
        <div className="space-y-6">
          <Card title="Profile">
            <div className="flex items-center gap-4 mb-6">
              <div className="relative group">
                <UserAvatar seed={user?.user_avatar_seed || user?.user_email} name={user?.user_name} size={64} />
                <button
                  onClick={() => setAvatarPickerOpen(v => !v)}
                  className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity text-white text-[10px] font-semibold"
                >
                  Change
                </button>
              </div>
              <div>
                <p className="text-lg font-semibold">{user?.user_name} {user?.user_lastname}</p>
                <p className="text-sm text-text-secondary capitalize">{user?.role}</p>
              </div>
            </div>

            {avatarPickerOpen && (
              <div className="mb-6 rounded-lg border border-border p-3">
                <p className="text-xs font-medium text-text-secondary mb-2">Choose an avatar</p>
                <div className="grid grid-cols-6 gap-2 mb-2">
                  {AVATAR_SEEDS.map(seed => (
                    <button
                      key={seed}
                      onClick={() => handleAvatarSelect(seed)}
                      disabled={savingAvatar}
                      title={seed}
                      className={`rounded-full border-2 transition-colors disabled:opacity-50 ${
                        (user?.user_avatar_seed || '') === seed
                          ? 'border-primary-500'
                          : 'border-transparent hover:border-primary-300'
                      }`}
                    >
                      <img
                        src={`https://api.dicebear.com/9.x/${settings.avatar_style || 'fun-emoji'}/svg?seed=${encodeURIComponent(seed)}`}
                        alt={seed}
                        width={36}
                        height={36}
                        className="rounded-full bg-primary-50"
                        crossOrigin="anonymous"
                        loading="lazy"
                      />
                    </button>
                  ))}
                </div>
                {user?.user_avatar_seed && (
                  <button
                    onClick={() => handleAvatarSelect(null)}
                    disabled={savingAvatar}
                    className="text-xs text-text-secondary hover:text-primary-500 transition-colors"
                  >
                    Reset to default
                  </button>
                )}
              </div>
            )}

            <div className="space-y-3">
              <div className="flex justify-between border-b border-border pb-3">
                <span className="text-sm text-text-secondary">Email</span>
                <span className="text-sm font-medium">{user?.user_email}</span>
              </div>
              <div className="flex justify-between border-b border-border pb-3">
                <span className="text-sm text-text-secondary">Role</span>
                <span className="text-sm font-medium capitalize">{user?.role}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-text-secondary">Member since</span>
                <span className="text-sm font-medium">
                  {user?.user_create_date ? new Date(user.user_create_date).toLocaleDateString() : '-'}
                </span>
              </div>
            </div>
          </Card>

          {role === 'superadmin' && (
            <Card title="Vendor Management">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-text-primary">Seniority Levels</h3>
                    <p className="text-sm text-text-secondary">Manage vendor staff seniority classifications</p>
                  </div>
                  <button onClick={() => setSeniorityModalOpen(true)}
                    className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 transition-colors">
                    Manage
                  </button>
                </div>
              </div>
            </Card>
          )}

          {role === 'superadmin' && (
            <Card title="Project Management">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-4 border-b border-border">
                  <div>
                    <h3 className="font-medium text-text-primary">Project Statuses</h3>
                    <p className="text-sm text-text-secondary">Manage project lifecycle status types</p>
                  </div>
                  <button onClick={() => setProjectStatusModalOpen(true)}
                    className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 transition-colors">
                    Manage
                  </button>
                </div>
                <div className="flex items-center justify-between pb-4 border-b border-border">
                  <div>
                    <h3 className="font-medium text-text-primary">Health Status Types</h3>
                    <p className="text-sm text-text-secondary">Manage project health status classifications</p>
                  </div>
                  <button onClick={() => setHealthStatusModalOpen(true)}
                    className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 transition-colors">
                    Manage
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-text-primary">Project Roles</h3>
                    <p className="text-sm text-text-secondary">Manage roles assignable to project team members</p>
                  </div>
                  <button onClick={() => setProjectRolesModalOpen(true)}
                    className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 transition-colors">
                    Manage
                  </button>
                </div>
              </div>
            </Card>
          )}

          {role === 'superadmin' && (
            <Card title="Activities Import">
              <p className="text-sm text-text-secondary mb-4">
                Upload an Azure DevOps Ticket Summary XLSX file to import sprint activities.
                Only rows not already in the database are inserted.
              </p>

              <input
                ref={importFileRef}
                type="file"
                accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                className="hidden"
                onChange={handleActivityImport}
              />

              <label className="flex items-center gap-2 mb-4 cursor-pointer w-fit">
                <input
                  type="checkbox"
                  checked={importReset}
                  onChange={e => setImportReset(e.target.checked)}
                  className="rounded border-border-dark accent-primary-500"
                />
                <span className="text-sm text-text-secondary">
                  Reset — delete all existing activities before importing
                </span>
              </label>

              <button
                onClick={() => importFileRef.current?.click()}
                disabled={importState === 'loading'}
                className="flex items-center gap-2 rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 transition-colors disabled:opacity-60"
              >
                <Upload size={16} />
                {importState === 'loading' ? 'Importing…' : 'Upload XLSX File'}
              </button>

              {importState === 'done' && importResult && (
                <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-green-700 font-medium text-sm">
                    <CheckCircle size={16} />
                    Import complete
                  </div>
                  <div className="text-sm text-green-800 space-y-1">
                    <p><span className="font-medium">{importResult.inserted}</span> rows inserted</p>
                    <p><span className="font-medium">{importResult.skipped}</span> rows skipped (already imported)</p>
                  </div>
                  {importResult.unmatched?.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-medium text-amber-700 mb-1">
                        {importResult.unmatched.length} unmatched project{importResult.unmatched.length !== 1 ? 's' : ''}:
                      </p>
                      <ul className="text-xs text-amber-700 space-y-0.5 max-h-32 overflow-y-auto">
                        {importResult.unmatched.map((u) => (
                          <li key={u.importId} className="font-mono truncate">
                            #{u.importId} — {u.rawProject}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {importState === 'error' && (
                <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  <AlertCircle size={16} />
                  {importError}
                </div>
              )}
            </Card>
          )}

          {role === 'superadmin' && (
            <Card title="Avatar Style">
              <p className="text-sm text-text-secondary mb-4">
                Choose the DiceBear avatar style used across the application
              </p>
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                {DICEBEAR_STYLES.map((style) => (
                  <button
                    key={style}
                    onClick={() => handleStyleChange(style)}
                    disabled={savingStyle}
                    className={`flex flex-col items-center gap-1.5 rounded-lg border-2 p-2 transition-colors ${
                      settings.avatar_style === style
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-border hover:border-primary-300'
                    }`}
                  >
                    <img
                      src={`https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(user?.user_email || 'demo')}`}
                      alt={style}
                      width={40}
                      height={40}
                      className="rounded-full bg-primary-50"
                      crossOrigin="anonymous"
                      loading="lazy"
                    />
                    <span className="text-[10px] text-text-secondary leading-tight text-center truncate w-full">
                      {style}
                    </span>
                  </button>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* ── Right column ─────────────────────────────────────────────── */}
        <div className="space-y-6">
          {role === 'superadmin' && <GitHubBackupCard />}

          {(role === 'superadmin' || role === 'admin') && (
            <Card title="AI Agent">
              <form onSubmit={handleAgentSave} className="space-y-5">

                {/* ── Provider selector (superadmin only) ── */}
                {role === 'superadmin' && (
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-text-primary">Provider</label>
                    <div className="grid grid-cols-2 gap-2">
                      {PROVIDERS.map(p => (
                        <button
                          key={p.value}
                          type="button"
                          onClick={() => setAgentForm(f => ({ ...f, agent_provider: p.value }))}
                          className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors text-left ${
                            activeProvider === p.value
                              ? 'border-primary-500 bg-primary-500/10 text-primary-700'
                              : 'border-border bg-surface text-text-secondary hover:border-primary-300'
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Ollama fields (admin + superadmin when provider = ollama) ── */}
                {(role === 'admin' || activeProvider === 'ollama') && (
                  <>
                    {role === 'admin' && (
                      <p className="text-sm text-text-secondary -mt-1">
                        Configure the Ollama instance used by the AI data assistant.
                      </p>
                    )}
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-text-primary">Ollama URL</label>
                      <input
                        type="url"
                        value={agentForm.ollama_url}
                        onChange={e => setAgentForm(f => ({ ...f, ollama_url: e.target.value }))}
                        placeholder="http://localhost:11434"
                        className="w-full rounded-lg border border-border-dark px-3 py-2 text-sm outline-none focus:border-primary-500 bg-surface"
                      />
                      <p className="mt-1 text-xs text-text-secondary">Base URL of your Ollama server</p>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-sm font-medium text-text-primary">Model</label>
                        <button type="button" onClick={handleRefreshModels} className="text-xs text-primary-600 hover:underline">
                          Refresh models
                        </button>
                      </div>
                      {agentModels.length > 0 ? (
                        <select
                          value={agentForm.ollama_model}
                          onChange={e => setAgentForm(f => ({ ...f, ollama_model: e.target.value }))}
                          className="w-full rounded-lg border border-border-dark px-3 py-2 text-sm outline-none focus:border-primary-500 bg-surface appearance-none"
                        >
                          {agentModels.map(m => <option key={m.name} value={m.name}>{m.name}</option>)}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={agentForm.ollama_model}
                          onChange={e => setAgentForm(f => ({ ...f, ollama_model: e.target.value }))}
                          placeholder="e.g. llama3.2, mistral, qwen2.5"
                          className="w-full rounded-lg border border-border-dark px-3 py-2 text-sm outline-none focus:border-primary-500 bg-surface"
                        />
                      )}
                      <p className="mt-1 text-xs text-text-secondary">
                        {agentModels.length > 0
                          ? `${agentModels.length} model${agentModels.length !== 1 ? 's' : ''} available`
                          : 'No models found — enter model name manually or check that Ollama is running'}
                      </p>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-text-primary">API Key</label>
                      <input
                        type="password"
                        value={agentForm.ollama_api_key}
                        onChange={e => setAgentForm(f => ({ ...f, ollama_api_key: e.target.value }))}
                        placeholder="sk-…"
                        className="w-full rounded-lg border border-border-dark px-3 py-2 text-sm outline-none focus:border-primary-500 bg-surface"
                      />
                      <p className="mt-1 text-xs text-text-secondary">Required for Ollama cloud; leave empty for local</p>
                    </div>
                  </>
                )}

                {/* ── llama.cpp fields (admin + superadmin when provider = llamacpp) ── */}
                {(role === 'admin' || activeProvider === 'llamacpp') && (
                  <>
                    <p className="text-xs text-text-secondary -mt-1">
                      Connects to a running <span className="font-mono text-text-primary">llama-server</span>{' '}
                      via its OpenAI-compatible API.
                    </p>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-text-primary">llama.cpp Server URL</label>
                      <input
                        type="url"
                        value={agentForm.llamacpp_url}
                        onChange={e => setAgentForm(f => ({ ...f, llamacpp_url: e.target.value }))}
                        placeholder="http://localhost:8080"
                        className="w-full rounded-lg border border-border-dark px-3 py-2 text-sm outline-none focus:border-primary-500 bg-surface"
                      />
                      <p className="mt-1 text-xs text-text-secondary">Base URL of your llama-server (no trailing /v1)</p>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-sm font-medium text-text-primary">Model</label>
                        <button type="button" onClick={handleRefreshModels} className="text-xs text-primary-600 hover:underline">
                          Refresh models
                        </button>
                      </div>
                      {agentModels.length > 0 ? (
                        <select
                          value={agentForm.llamacpp_model}
                          onChange={e => setAgentForm(f => ({ ...f, llamacpp_model: e.target.value }))}
                          className="w-full rounded-lg border border-border-dark px-3 py-2 text-sm outline-none focus:border-primary-500 bg-surface appearance-none"
                        >
                          {agentModels.map(m => <option key={m.name} value={m.name}>{m.name}</option>)}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={agentForm.llamacpp_model}
                          onChange={e => setAgentForm(f => ({ ...f, llamacpp_model: e.target.value }))}
                          placeholder="optional — llama-server uses its loaded model"
                          className="w-full rounded-lg border border-border-dark px-3 py-2 text-sm outline-none focus:border-primary-500 bg-surface"
                        />
                      )}
                      <p className="mt-1 text-xs text-text-secondary">
                        {agentModels.length > 0
                          ? `${agentModels.length} model${agentModels.length !== 1 ? 's' : ''} available`
                          : 'Leave blank to use the model loaded by llama-server'}
                      </p>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-text-primary">API Key</label>
                      <input
                        type="password"
                        value={agentForm.llamacpp_api_key}
                        onChange={e => setAgentForm(f => ({ ...f, llamacpp_api_key: e.target.value }))}
                        placeholder="optional"
                        className="w-full rounded-lg border border-border-dark px-3 py-2 text-sm outline-none focus:border-primary-500 bg-surface"
                      />
                      <p className="mt-1 text-xs text-text-secondary">Only needed if llama-server was started with --api-key</p>
                    </div>
                  </>
                )}

                {/* ── Claude fields (superadmin only) ── */}
                {role === 'superadmin' && activeProvider === 'claude' && (
                  <>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-text-primary">Anthropic API Key</label>
                      <input
                        type="password"
                        value={agentForm.claude_api_key}
                        onChange={e => setAgentForm(f => ({ ...f, claude_api_key: e.target.value }))}
                        placeholder="sk-ant-…"
                        className="w-full rounded-lg border border-border-dark px-3 py-2 text-sm outline-none focus:border-primary-500 bg-surface"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-text-primary">Model</label>
                      <select
                        value={agentForm.claude_model}
                        onChange={e => setAgentForm(f => ({ ...f, claude_model: e.target.value }))}
                        className="w-full rounded-lg border border-border-dark px-3 py-2 text-sm outline-none focus:border-primary-500 bg-surface appearance-none"
                      >
                        {CLAUDE_MODELS.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                  </>
                )}

                {/* ── Gemini fields (superadmin only) ── */}
                {role === 'superadmin' && activeProvider === 'gemini' && (
                  <>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-text-primary">Google API Key</label>
                      <input
                        type="password"
                        value={agentForm.gemini_api_key}
                        onChange={e => setAgentForm(f => ({ ...f, gemini_api_key: e.target.value }))}
                        placeholder="AIza…"
                        className="w-full rounded-lg border border-border-dark px-3 py-2 text-sm outline-none focus:border-primary-500 bg-surface"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-text-primary">Model</label>
                      <select
                        value={agentForm.gemini_model}
                        onChange={e => setAgentForm(f => ({ ...f, gemini_model: e.target.value }))}
                        className="w-full rounded-lg border border-border-dark px-3 py-2 text-sm outline-none focus:border-primary-500 bg-surface appearance-none"
                      >
                        {GEMINI_MODELS.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                  </>
                )}

                {/* ── GPT fields (superadmin only) ── */}
                {role === 'superadmin' && activeProvider === 'gpt' && (
                  <>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-text-primary">OpenAI API Key</label>
                      <input
                        type="password"
                        value={agentForm.gpt_api_key}
                        onChange={e => setAgentForm(f => ({ ...f, gpt_api_key: e.target.value }))}
                        placeholder="sk-…"
                        className="w-full rounded-lg border border-border-dark px-3 py-2 text-sm outline-none focus:border-primary-500 bg-surface"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-text-primary">Model</label>
                      <select
                        value={agentForm.gpt_model}
                        onChange={e => setAgentForm(f => ({ ...f, gpt_model: e.target.value }))}
                        className="w-full rounded-lg border border-border-dark px-3 py-2 text-sm outline-none focus:border-primary-500 bg-surface appearance-none"
                      >
                        {GPT_MODELS.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                  </>
                )}

                {/* ── OpenRouter fields (superadmin only) ── */}
                {role === 'superadmin' && activeProvider === 'openrouter' && (
                  <>
                    <p className="text-xs text-text-secondary -mt-1">
                      Get a free API key at{' '}
                      <span className="font-mono text-text-primary">openrouter.ai</span>.
                      Gives access to 300+ models from all providers.
                    </p>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-text-primary">OpenRouter API Key</label>
                      <input
                        type="password"
                        value={agentForm.openrouter_api_key}
                        onChange={e => setAgentForm(f => ({ ...f, openrouter_api_key: e.target.value }))}
                        placeholder="sk-or-…"
                        className="w-full rounded-lg border border-border-dark px-3 py-2 text-sm outline-none focus:border-primary-500 bg-surface"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-text-primary">Model</label>
                      <input
                        type="text"
                        value={agentForm.openrouter_model}
                        onChange={e => setAgentForm(f => ({ ...f, openrouter_model: e.target.value }))}
                        placeholder="e.g. meta-llama/llama-3.3-70b-instruct"
                        className="w-full rounded-lg border border-border-dark px-3 py-2 text-sm outline-none focus:border-primary-500 bg-surface"
                      />
                      <p className="mt-1 text-xs text-text-secondary">Find model IDs at openrouter.ai/models</p>
                    </div>
                  </>
                )}

                {/* ── NVIDIA NIM fields (superadmin only) ── */}
                {role === 'superadmin' && activeProvider === 'nvidia' && (
                  <>
                    <p className="text-xs text-text-secondary -mt-1">
                      Browse available models at{' '}
                      <span className="font-mono text-text-primary">build.nvidia.com</span>.
                      Base URL: <span className="font-mono text-text-primary">integrate.api.nvidia.com/v1</span>
                    </p>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-text-primary">NVIDIA API Key</label>
                      <input
                        type="password"
                        value={agentForm.nvidia_api_key}
                        onChange={e => setAgentForm(f => ({ ...f, nvidia_api_key: e.target.value }))}
                        placeholder="nvapi-…"
                        className="w-full rounded-lg border border-border-dark px-3 py-2 text-sm outline-none focus:border-primary-500 bg-surface"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-text-primary">Model</label>
                      <select
                        value={agentForm.nvidia_model}
                        onChange={e => setAgentForm(f => ({ ...f, nvidia_model: e.target.value }))}
                        className="w-full rounded-lg border border-border-dark px-3 py-2 text-sm outline-none focus:border-primary-500 bg-surface appearance-none"
                      >
                        {NVIDIA_MODELS.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                      <p className="mt-1 text-xs text-text-secondary">Custom model IDs from build.nvidia.com are also accepted</p>
                    </div>
                  </>
                )}

                <div className="flex items-center gap-3 pt-1">
                  <button type="submit" disabled={agentSaving}
                    className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 transition-colors disabled:opacity-60">
                    {agentSaving ? 'Saving…' : agentSaved ? 'Saved!' : 'Save'}
                  </button>
                </div>
              </form>
            </Card>
          )}

        </div>

      </div>

      <SeniorityManagementModal
        open={seniorityModalOpen}
        onClose={() => setSeniorityModalOpen(false)}
      />
      <ProjectStatusManagementModal
        open={projectStatusModalOpen}
        onClose={() => setProjectStatusModalOpen(false)}
      />
      <HealthStatusManagementModal
        open={healthStatusModalOpen}
        onClose={() => setHealthStatusModalOpen(false)}
      />
      <ProjectRolesManagementModal
        open={projectRolesModalOpen}
        onClose={() => setProjectRolesModalOpen(false)}
      />
    </div>
  );
}
