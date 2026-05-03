import { useState, useEffect, useCallback } from 'react';
import { Plus, ChevronDown, ChevronUp, CheckCircle2, Clock, AlertCircle, Trash2, MessageSquarePlus, Pencil, X, Users } from 'lucide-react';
import Card from '../../../commoncomponents/Card';
import Modal from '../../../commoncomponents/Modal';
import UserAvatar from '../../../commoncomponents/UserAvatar';
import {
  getTasks, getTask, createTask, updateTask, closeTask, deleteTask,
  createFollowup, updateFollowup, deleteFollowup,
} from '../../../api/tasksApi';

const STATUS_CONFIG = {
  open: { label: 'Open', icon: Clock, color: 'text-warning-500', bg: 'bg-warning-50' },
  in_progress: { label: 'In Progress', icon: AlertCircle, color: 'text-primary-500', bg: 'bg-primary-50' },
  closed: { label: 'Closed', icon: CheckCircle2, color: 'text-success-500', bg: 'bg-success-50' },
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
  if (!ts) return '';
  const d = new Date(typeof ts === 'number' ? ts : ts);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function FollowupThread({ taskId, followups: initialFollowups, canEdit }) {
  const [followups, setFollowups] = useState(initialFollowups || []);
  const [note, setNote] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editNote, setEditNote] = useState('');
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!note.trim()) return;
    setSaving(true);
    try {
      await createFollowup(taskId, { followup_note: note.trim() });
      const res = await getTask(taskId);
      setFollowups(res.data.data.followups || []);
      setNote('');
    } finally {
      setSaving(false);
    }
  };

  const handleEditSave = async (id) => {
    if (!editNote.trim()) return;
    await updateFollowup(taskId, id, { followup_note: editNote.trim() });
    setFollowups(prev => prev.map(f => f.id === id ? { ...f, followup_note: editNote.trim() } : f));
    setEditingId(null);
  };

  const handleDelete = async (id) => {
    await deleteFollowup(taskId, id);
    setFollowups(prev => prev.filter(f => f.id !== id));
  };

  return (
    <div className="mt-3 space-y-2">
      {followups.map(f => (
        <div key={f.id} className="flex gap-2 rounded-lg border border-border bg-surface p-2.5">
          <UserAvatar name={f.author_name} size={28} />
          <div className="flex-1 min-w-0">
            {editingId === f.id ? (
              <div className="flex gap-2">
                <input
                  className="flex-1 rounded border border-border bg-surface-card text-sm px-2 py-1"
                  value={editNote}
                  onChange={e => setEditNote(e.target.value)}
                  autoFocus
                />
                <button onClick={() => handleEditSave(f.id)} className="text-xs font-medium text-primary-500 hover:text-primary-600">Save</button>
                <button onClick={() => setEditingId(null)} className="text-xs text-text-secondary hover:text-text-primary"><X size={13} /></button>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-medium text-text-primary">{f.author_name} {f.author_lastname}</p>
                  <p className="text-sm text-text-primary whitespace-pre-wrap">{f.followup_note}</p>
                  <p className="text-xs text-text-secondary mt-0.5">{formatDate(f.followup_create_date)}</p>
                </div>
                {canEdit && (
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => { setEditingId(f.id); setEditNote(f.followup_note); }} className="text-text-secondary hover:text-primary-500 p-0.5"><Pencil size={12} /></button>
                    <button onClick={() => handleDelete(f.id)} className="text-text-secondary hover:text-error-500 p-0.5"><Trash2 size={12} /></button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ))}
      {canEdit && (
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-lg border border-border bg-surface-card px-3 py-1.5 text-sm placeholder:text-text-secondary"
            placeholder="Add a follow-up note…"
            value={note}
            onChange={e => setNote(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
          <button
            onClick={handleAdd}
            disabled={saving || !note.trim()}
            className="flex items-center gap-1 rounded-lg bg-primary-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-600 disabled:opacity-50 transition-colors"
          >
            <MessageSquarePlus size={13} />
          </button>
        </div>
      )}
    </div>
  );
}

function TaskRow({ task, canEdit, onUpdated, onDeleted, teamMembers }) {
  const [expanded, setExpanded] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [form, setForm] = useState({
    task_title: task.task_title,
    task_description: task.task_description || '',
    task_assigned_to_user_id: task.task_assigned_to_user_id || '',
    task_due_date: task.task_due_date || '',
    task_status: task.task_status,
  });

  const handleClose = async () => {
    await closeTask(task.id);
    onUpdated({ ...task, task_status: 'closed' });
  };

  const handleSave = async () => {
    await updateTask(task.id, {
      ...form,
      task_assigned_to_user_id: form.task_assigned_to_user_id || null,
      task_due_date: form.task_due_date || null,
    });
    setEditModal(false);
    onUpdated({ ...task, ...form });
  };

  const handleDelete = async () => {
    await deleteTask(task.id);
    onDeleted(task.id);
  };

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-surface transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm font-medium ${task.task_status === 'closed' ? 'line-through text-text-secondary' : 'text-text-primary'}`}>
              {task.task_title}
            </span>
            <StatusPill status={task.task_status} />
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-text-secondary">
            {task.task_assigned_to_user_id
              ? <span>→ {task.assignee_name} {task.assignee_lastname}</span>
              : <span className="flex items-center gap-1"><Users size={11} /> Whole team</span>
            }
            {task.task_due_date && <span>Due {task.task_due_date}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
          {canEdit && task.task_status !== 'closed' && (
            <>
              <button
                onClick={() => setEditModal(true)}
                className="text-text-secondary hover:text-primary-500 transition-colors p-1"
                title="Edit task"
              >
                <Pencil size={14} />
              </button>
              <button
                onClick={handleClose}
                className="text-text-secondary hover:text-success-500 transition-colors p-1"
                title="Close task"
              >
                <CheckCircle2 size={14} />
              </button>
              <button
                onClick={handleDelete}
                className="text-text-secondary hover:text-error-500 transition-colors p-1"
                title="Delete task"
              >
                <Trash2 size={14} />
              </button>
            </>
          )}
          {expanded ? <ChevronUp size={15} className="text-text-secondary" /> : <ChevronDown size={15} className="text-text-secondary" />}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border px-4 pb-4 pt-3 bg-surface">
          {task.task_description && (
            <p className="text-sm text-text-secondary mb-3 whitespace-pre-wrap">{task.task_description}</p>
          )}
          <FollowupThread taskId={task.id} followups={task.followups || []} canEdit={canEdit} />
        </div>
      )}

      <Modal open={editModal} onClose={() => setEditModal(false)} title="Edit Task">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-text-secondary mb-1">Title *</label>
            <input
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              value={form.task_title}
              onChange={e => setForm(f => ({ ...f, task_title: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-text-secondary mb-1">Description</label>
            <textarea
              rows={3}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              value={form.task_description}
              onChange={e => setForm(f => ({ ...f, task_description: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-text-secondary mb-1">Assigned to</label>
              <select
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                value={form.task_assigned_to_user_id}
                onChange={e => setForm(f => ({ ...f, task_assigned_to_user_id: e.target.value }))}
              >
                <option value="">Whole team</option>
                {teamMembers.map(m => (
                  <option key={m.user_id} value={m.user_id}>{m.user_name} {m.user_lastname}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-text-secondary mb-1">Status</label>
              <select
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                value={form.task_status}
                onChange={e => setForm(f => ({ ...f, task_status: e.target.value }))}
              >
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="closed">Closed</option>
              </select>
            </div>
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
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setEditModal(false)} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-surface transition-colors">Cancel</button>
            <button onClick={handleSave} className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-600 transition-colors">Save</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default function TasksCard({ projectId, teamMembers = [], canEdit }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addModal, setAddModal] = useState(false);
  const [filter, setFilter] = useState('open');
  const [form, setForm] = useState({ task_title: '', task_description: '', task_assigned_to_user_id: '', task_due_date: '' });

  const loadTasks = useCallback(async () => {
    const res = await getTasks(projectId);
    setTasks(res.data.data || []);
  }, [projectId]);

  useEffect(() => {
    loadTasks().finally(() => setLoading(false));
  }, [loadTasks]);

  const handleAdd = async () => {
    if (!form.task_title.trim()) return;
    await createTask({
      project_id: projectId,
      task_title: form.task_title.trim(),
      task_description: form.task_description || null,
      task_assigned_to_user_id: form.task_assigned_to_user_id || null,
      task_due_date: form.task_due_date || null,
    });
    setForm({ task_title: '', task_description: '', task_assigned_to_user_id: '', task_due_date: '' });
    setAddModal(false);
    await loadTasks();
  };

  const handleUpdated = (updated) => {
    setTasks(prev => prev.map(t => t.id === updated.id ? { ...t, ...updated } : t));
  };

  const handleDeleted = (id) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const filtered = filter === 'all' ? tasks : tasks.filter(t => t.task_status === filter);
  const openCount = tasks.filter(t => t.task_status === 'open').length;
  const inProgressCount = tasks.filter(t => t.task_status === 'in_progress').length;
  const closedCount = tasks.filter(t => t.task_status === 'closed').length;

  return (
    <>
      <Card
        title="Tasks"
        extra={canEdit ? (
          <button
            onClick={() => setAddModal(true)}
            className="inline-flex items-center gap-1 rounded-lg bg-primary-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-600 transition-colors"
          >
            <Plus size={14} /> Add task
          </button>
        ) : null}
      >
        {/* Filter tabs */}
        <div className="flex gap-1 mb-4 border-b border-border pb-3">
          {[
            { key: 'open', label: `Open (${openCount})` },
            { key: 'in_progress', label: `In Progress (${inProgressCount})` },
            { key: 'closed', label: `Closed (${closedCount})` },
            { key: 'all', label: 'All' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${filter === key ? 'bg-primary-500 text-white' : 'text-text-secondary hover:text-primary-500'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-sm text-text-secondary">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-text-secondary">No {filter !== 'all' ? filter.replace('_', ' ') : ''} tasks</p>
        ) : (
          <div className="space-y-2">
            {filtered.map(task => (
              <TaskRow
                key={task.id}
                task={task}
                canEdit={canEdit}
                onUpdated={handleUpdated}
                onDeleted={handleDeleted}
                teamMembers={teamMembers}
              />
            ))}
          </div>
        )}
      </Card>

      <Modal open={addModal} onClose={() => setAddModal(false)} title="Add Task">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-text-secondary mb-1">Title *</label>
            <input
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              placeholder="Task title…"
              value={form.task_title}
              onChange={e => setForm(f => ({ ...f, task_title: e.target.value }))}
              autoFocus
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
              >
                <option value="">Whole team</option>
                {teamMembers.map(m => (
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
            <button onClick={() => setAddModal(false)} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-surface transition-colors">Cancel</button>
            <button
              onClick={handleAdd}
              disabled={!form.task_title.trim()}
              className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-50 transition-colors"
            >
              Add task
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
