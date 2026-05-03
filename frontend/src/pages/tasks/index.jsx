import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus, CheckCircle2, Clock, AlertCircle, Trash2, FolderKanban,
  Users, User, Calendar, ChevronDown, ChevronUp,
} from 'lucide-react';
import { getAllTasks, createTask, closeTask, deleteTask, createFollowup } from '../../api/tasksApi';
import { getProjects, getRoleAssignments } from '../../api/projectsApi';
import { useAuth } from '../../hooks/useAuth';
import Modal from '../../commoncomponents/Modal';
import LoadingSpinner from '../../commoncomponents/LoadingSpinner';

const STATUS_CONFIG = {
  open:        { label: 'Open',        icon: Clock,         color: 'text-warning-500',  bg: 'bg-warning-50',  border: 'border-warning-200' },
  in_progress: { label: 'In Progress', icon: AlertCircle,   color: 'text-primary-500',  bg: 'bg-primary-50',  border: 'border-primary-200' },
  closed:      { label: 'Closed',      icon: CheckCircle2,  color: 'text-success-500',  bg: 'bg-success-50',  border: 'border-success-200' },
};

function StatusPill({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.open;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${cfg.bg} ${cfg.color}`}>
      <Icon size={11} />
      {cfg.label}
    </span>
  );
}

function formatDate(ts) {
  if (!ts) return null;
  return new Date(ts).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function TaskRow({ task, isSuperAdmin, onClosed, onDeleted }) {
  const [expanded, setExpanded] = useState(false);
  const [note, setNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  const handleClose = async (e) => {
    e.stopPropagation();
    await closeTask(task.id);
    onClosed(task.id);
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    await deleteTask(task.id);
    onDeleted(task.id);
  };

  const handleAddNote = async () => {
    if (!note.trim()) return;
    setSavingNote(true);
    try {
      await createFollowup(task.id, { followup_note: note.trim() });
      setNote('');
    } finally {
      setSavingNote(false);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-surface-card overflow-hidden">
      <div
        className="flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-surface transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        {/* Status indicator */}
        <span className={`h-2 w-2 shrink-0 rounded-full ${
          task.task_status === 'closed' ? 'bg-success-500' :
          task.task_status === 'in_progress' ? 'bg-primary-500' : 'bg-warning-500'
        }`} />

        {/* Title + meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm font-medium ${task.task_status === 'closed' ? 'line-through text-text-secondary' : 'text-text-primary'}`}>
              {task.task_title}
            </span>
            <StatusPill status={task.task_status} />
          </div>
          <div className="flex items-center gap-3 mt-0.5 flex-wrap text-xs text-text-secondary">
            <Link
              to={`/projects/${task.project_id}`}
              onClick={e => e.stopPropagation()}
              className="flex items-center gap-1 hover:text-primary-500 transition-colors"
            >
              <FolderKanban size={11} />
              {task.project_name}
            </Link>
            {task.task_assigned_to_user_id ? (
              <span className="flex items-center gap-1">
                <User size={11} />
                {task.assignee_name} {task.assignee_lastname}
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <Users size={11} />
                Whole team
              </span>
            )}
            {task.task_due_date && (
              <span className="flex items-center gap-1">
                <Calendar size={11} />
                {task.task_due_date}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
          {isSuperAdmin && task.task_status !== 'closed' && (
            <>
              <button
                onClick={handleClose}
                title="Mark as closed"
                className="rounded p-1.5 text-text-secondary hover:text-success-500 hover:bg-success-50 transition-colors"
              >
                <CheckCircle2 size={15} />
              </button>
              <button
                onClick={handleDelete}
                title="Delete task"
                className="rounded p-1.5 text-text-secondary hover:text-error-500 hover:bg-error-50 transition-colors"
              >
                <Trash2 size={15} />
              </button>
            </>
          )}
          {expanded
            ? <ChevronUp size={15} className="text-text-secondary" />
            : <ChevronDown size={15} className="text-text-secondary" />
          }
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border px-4 pb-4 pt-3 bg-surface space-y-3">
          {task.task_description && (
            <p className="text-sm text-text-secondary whitespace-pre-wrap">{task.task_description}</p>
          )}
          <div className="text-xs text-text-secondary">
            Created by {task.creator_name} {task.creator_lastname} · {formatDate(task.task_create_date)}
            {task.task_close_date && <span> · Closed {formatDate(task.task_close_date)}</span>}
          </div>
          {/* Quick followup */}
          <div className="flex gap-2 pt-1">
            <input
              className="flex-1 rounded-lg border border-border bg-surface-card px-3 py-1.5 text-sm placeholder:text-text-secondary"
              placeholder="Add a follow-up note…"
              value={note}
              onChange={e => setNote(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddNote()}
              onClick={e => e.stopPropagation()}
            />
            <button
              onClick={e => { e.stopPropagation(); handleAddNote(); }}
              disabled={savingNote || !note.trim()}
              className="rounded-lg bg-primary-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-600 disabled:opacity-50 transition-colors"
            >
              Add
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const TABS = ['open', 'in_progress', 'closed', 'all'];
const TAB_LABELS = { open: 'Open', in_progress: 'In Progress', closed: 'Closed', all: 'All' };

export default function TasksPage() {
  const { role } = useAuth();
  const isSuperAdmin = role === 'superadmin';

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('open');
  const [addModal, setAddModal] = useState(false);
  const [projects, setProjects] = useState([]);
  const [projectMembers, setProjectMembers] = useState([]);
  const [form, setForm] = useState({
    project_id: '',
    task_title: '',
    task_description: '',
    task_assigned_to_user_id: '',
    task_due_date: '',
  });

  const load = useCallback(async () => {
    const res = await getAllTasks();
    setTasks(res.data.data || []);
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const openAddModal = async () => {
    if (projects.length === 0) {
      const res = await getProjects({ limit: 200 });
      const list = res.data.data || [];
      setProjects(list.sort((a, b) => a.project_name.localeCompare(b.project_name)));
    }
    setAddModal(true);
  };

  const handleProjectChange = async (projectId) => {
    setForm(f => ({ ...f, project_id: projectId, task_assigned_to_user_id: '' }));
    if (!projectId) { setProjectMembers([]); return; }
    const res = await getRoleAssignments(projectId).catch(() => ({ data: { data: [] } }));
    setProjectMembers(res.data.data || []);
  };

  const handleAdd = async () => {
    if (!form.project_id || !form.task_title.trim()) return;
    await createTask({
      project_id: parseInt(form.project_id),
      task_title: form.task_title.trim(),
      task_description: form.task_description || null,
      task_assigned_to_user_id: form.task_assigned_to_user_id || null,
      task_due_date: form.task_due_date || null,
    });
    setForm({ project_id: '', task_title: '', task_description: '', task_assigned_to_user_id: '', task_due_date: '' });
    setProjectMembers([]);
    setAddModal(false);
    await load();
  };

  const handleClosed = (id) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, task_status: 'closed', task_close_date: Date.now() } : t));
  };

  const handleDeleted = (id) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const counts = {
    open:        tasks.filter(t => t.task_status === 'open').length,
    in_progress: tasks.filter(t => t.task_status === 'in_progress').length,
    closed:      tasks.filter(t => t.task_status === 'closed').length,
    all:         tasks.length,
  };

  const visible = tab === 'all' ? tasks : tasks.filter(t => t.task_status === tab);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Tasks</h1>
          <p className="text-sm text-text-secondary mt-0.5">{tasks.length} task{tasks.length !== 1 ? 's' : ''} across all projects</p>
        </div>
        {isSuperAdmin && (
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-500 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-600 transition-colors"
          >
            <Plus size={16} />
            New task
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === t
                ? 'border-primary-500 text-primary-500'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            {TAB_LABELS[t]}
            <span className={`ml-2 rounded-full px-1.5 py-0.5 text-xs ${
              tab === t ? 'bg-primary-100 text-primary-600' : 'bg-surface text-text-secondary'
            }`}>
              {counts[t]}
            </span>
          </button>
        ))}
      </div>

      {/* Task list */}
      {loading ? (
        <LoadingSpinner />
      ) : visible.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface-card p-12 text-center">
          <Clock size={32} className="mx-auto mb-3 text-text-secondary/40" />
          <p className="text-sm text-text-secondary">No {tab !== 'all' ? TAB_LABELS[tab].toLowerCase() : ''} tasks</p>
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map(task => (
            <TaskRow
              key={task.id}
              task={task}
              isSuperAdmin={isSuperAdmin}
              onClosed={handleClosed}
              onDeleted={handleDeleted}
            />
          ))}
        </div>
      )}

      {/* Add task modal */}
      <Modal open={addModal} onClose={() => setAddModal(false)} title="New Task">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-text-secondary mb-1">Project *</label>
            <select
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              value={form.project_id}
              onChange={e => handleProjectChange(e.target.value)}
            >
              <option value="">Select a project…</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.project_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-text-secondary mb-1">Title *</label>
            <input
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              placeholder="Task title…"
              value={form.task_title}
              onChange={e => setForm(f => ({ ...f, task_title: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-text-secondary mb-1">Description</label>
            <textarea
              rows={3}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              placeholder="Optional description…"
              value={form.task_description}
              onChange={e => setForm(f => ({ ...f, task_description: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-text-secondary mb-1">Assign to</label>
              <select
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                value={form.task_assigned_to_user_id}
                onChange={e => setForm(f => ({ ...f, task_assigned_to_user_id: e.target.value }))}
                disabled={!form.project_id}
              >
                <option value="">Whole team</option>
                {projectMembers.map(m => (
                  <option key={m.user_id} value={m.user_id}>{m.user_name} {m.user_lastname}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-text-secondary mb-1">Due date</label>
              <input
                type="date"
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                value={form.task_due_date}
                onChange={e => setForm(f => ({ ...f, task_due_date: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setAddModal(false)} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-surface transition-colors">
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={!form.project_id || !form.task_title.trim()}
              className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-50 transition-colors"
            >
              Create task
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
