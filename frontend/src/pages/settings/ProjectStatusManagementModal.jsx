import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { getProjectStatuses, createProjectStatus, updateProjectStatus, deleteProjectStatus } from '../../api/projectsApi';
import Modal from '../../commoncomponents/Modal';
import ConfirmDialog from '../../commoncomponents/ConfirmDialog';
import LoadingSpinner from '../../commoncomponents/LoadingSpinner';
import ProjectStatusBadge from '../../commoncomponents/ProjectStatusBadge';

export default function ProjectStatusManagementModal({ open, onClose }) {
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formModal, setFormModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState({ project_status_name: '', project_status_description: '' });

  const fetchStatuses = useCallback(() => {
    setLoading(true);
    getProjectStatuses()
      .then(r => setStatuses(r.data.data || []))
      .catch(() => setStatuses([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (open) fetchStatuses();
  }, [open, fetchStatuses]);

  const openCreate = () => {
    setEditTarget(null);
    setForm({ project_status_name: '', project_status_description: '' });
    setFormModal(true);
  };

  const openEdit = (status) => {
    setEditTarget(status);
    setForm({
      project_status_name: status.project_status_name || '',
      project_status_description: status.project_status_description || ''
    });
    setFormModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.project_status_name.trim()) return;
    try {
      if (editTarget) {
        await updateProjectStatus(editTarget.id, form);
      } else {
        await createProjectStatus(form);
      }
      fetchStatuses();
      setFormModal(false);
    } catch (err) {
      console.error('Failed to save project status:', err);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteProjectStatus(deleteTarget.id);
      setDeleteTarget(null);
      fetchStatuses();
    } catch (err) {
      console.error('Failed to delete project status:', err);
    }
  };

  if (!open) return null;

  return (
    <>
      <Modal open={open} onClose={onClose} title="Manage Project Statuses" maxWidth="max-w-2xl">
        <div>
          <div className="mb-4">
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-lg bg-primary-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-600 transition-colors"
            >
              <Plus size={14} /> Add Status
            </button>
          </div>

          {loading ? (
            <LoadingSpinner className="py-8" />
          ) : statuses.length === 0 ? (
            <p className="text-center py-8 text-text-secondary text-sm">No project statuses yet</p>
          ) : (
            <div className="space-y-3">
              {statuses.map(status => (
                <div key={status.id} className="rounded-lg border border-border p-4 hover:bg-surface/30 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 flex items-center gap-3">
                      <ProjectStatusBadge status={status.project_status_name} />
                      {status.project_status_description && (
                        <span className="text-sm text-text-secondary">{status.project_status_description}</span>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => openEdit(status)}
                        className="rounded-lg p-1.5 text-text-secondary hover:bg-surface hover:text-text-primary transition-colors"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(status)}
                        className="rounded-lg p-1.5 text-text-secondary hover:bg-error-50 hover:text-error-500 transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      <Modal
        open={formModal}
        onClose={() => setFormModal(false)}
        title={editTarget ? 'Edit Project Status' : 'New Project Status'}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Name <span className="text-error-500">*</span>
            </label>
            <input
              type="text"
              value={form.project_status_name}
              onChange={e => setForm(f => ({ ...f, project_status_name: e.target.value }))}
              className="w-full rounded-lg border border-border-dark px-3 py-2 text-sm outline-none focus:border-primary-500"
              placeholder="e.g., Discovery"
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Description</label>
            <input
              type="text"
              value={form.project_status_description}
              onChange={e => setForm(f => ({ ...f, project_status_description: e.target.value }))}
              className="w-full rounded-lg border border-border-dark px-3 py-2 text-sm outline-none focus:border-primary-500"
              placeholder="Optional description"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setFormModal(false)}
              className="rounded-lg border border-border-dark px-4 py-2 text-sm font-medium hover:bg-surface transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 transition-colors"
            >
              {editTarget ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Project Status"
        message={`Delete status "${deleteTarget?.project_status_name || ''}"? Projects using this status will be unaffected but the status will no longer be assignable.`}
      />
    </>
  );
}
