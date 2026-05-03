import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useAppSettings } from '../../hooks/useAppSettings';
import client from '../../api/client';
import { updateAvatar } from '../../api/authApi';
import Card from '../../commoncomponents/Card';
import UserAvatar from '../../commoncomponents/UserAvatar';
import SeniorityManagementModal from './SeniorityManagementModal';
import ProjectStatusManagementModal from './ProjectStatusManagementModal';
import HealthStatusManagementModal from './HealthStatusManagementModal';
import ProjectRolesManagementModal from './ProjectRolesManagementModal';
import { getAgentSettings, updateAgentSettings, getAgentModels } from '../../api/agentApi';

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

  const [agentForm, setAgentForm] = useState({ ollama_url: '', ollama_model: '', ollama_api_key: '' });
  const [agentModels, setAgentModels] = useState([]);
  const [agentSaving, setAgentSaving] = useState(false);
  const [agentSaved, setAgentSaved] = useState(false);

  useEffect(() => {
    if (role !== 'superadmin' && role !== 'admin') return;
    getAgentSettings().then(r => setAgentForm(r.data.data)).catch(() => {});
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
        </div>

        {/* ── Right column ─────────────────────────────────────────────── */}
        <div className="space-y-6">
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

          {(role === 'superadmin' || role === 'admin') && (
            <Card title="AI Agent">
              <p className="text-sm text-text-secondary mb-4">
                Configure the Ollama instance used by the AI data assistant.
              </p>
              <form onSubmit={handleAgentSave} className="space-y-4">
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
                      className="w-full rounded-lg border border-border-dark px-3 py-2 text-sm outline-none focus:border-primary-500 bg-surface"
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
