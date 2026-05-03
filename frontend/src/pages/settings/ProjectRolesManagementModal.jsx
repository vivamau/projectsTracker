import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { getProjectRoles, createProjectRole, updateProjectRole, deleteProjectRole } from '../../api/projectsApi';
import Modal from '../../commoncomponents/Modal';
import ConfirmDialog from '../../commoncomponents/ConfirmDialog';
import LoadingSpinner from '../../commoncomponents/LoadingSpinner';

export default function ProjectRolesManagementModal({ open, onClose }) {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formModal, setFormModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ role_name: '', role_description: '' });
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchRoles = useCallback(() => {
    setLoading(true);
    getProjectRoles()
      .then(r => setRoles(r.data.data || []))
      .catch(() => setRoles([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { if (open) fetchRoles(); }, [open, fetchRoles]);

  const openCreate = () => {
    setEditItem(null);
    setForm({ role_name: '', role_description: '' });
    setError('');
    setFormModal(true);
  };

  const openEdit = (item) => {
    setEditItem(item);
    setForm({ role_name: item.role_name || '', role_description: item.role_description || '' });
    setError('');
    setFormModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.role_name.trim()) { setError('Role name is required'); return; }
    try {
      if (editItem) {
        await updateProjectRole(editItem.id, form);
      } else {
        await createProjectRole(form);
      }
      setFormModal(false);
      fetchRoles();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save role');
    }
  };

  const handleDelete = async () => {
    await deleteProjectRole(deleteTarget.id);
    setDeleteTarget(null);
    fetchRoles();
  };

  if (!open) return null;

  return (
    <>
      <Modal open={open} onClose={onClose} title="Manage Project Roles" maxWidth="max-w-2xl">
        <div>
          <div className="mb-4">
            <button onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-lg bg-primary-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-600 transition-colors">
              <Plus size={14} /> Add Role
            </button>
          </div>

          {loading ? (
            <LoadingSpinner className="py-8" />
          ) : roles.length === 0 ? (
            <p className="text-center py-8 text-text-secondary text-sm">No project roles defined yet</p>
          ) : (
            <div className="space-y-2">
              {roles.map(r => (
                <div key={r.id} className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-surface/30 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-text-primary">{r.role_name}</p>
                    {r.role_description && <p className="text-xs text-text-secondary mt-0.5">{r.role_description}</p>}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => openEdit(r)}
                      className="rounded-lg p-1.5 text-text-secondary hover:bg-surface hover:text-primary-500 transition-colors">
                      <Pencil size={15} />
                    </button>
                    <button onClick={() => setDeleteTarget(r)}
                      className="rounded-lg p-1.5 text-text-secondary hover:bg-error-50 hover:text-error-500 transition-colors">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      <Modal open={formModal} onClose={() => setFormModal(false)} title={editItem ? 'Edit Role' : 'New Role'} maxWidth="max-w-md">
        <form onSubmit={handleSave} className="space-y-4">
          {error && <div className="rounded-lg bg-error-50 px-4 py-3 text-sm text-error-600">{error}</div>}
          <div>
            <label className="mb-1 block text-sm font-medium">Name <span className="text-error-500">*</span></label>
            <input type="text" value={form.role_name} onChange={e => setForm(f => ({ ...f, role_name: e.target.value }))}
              className="w-full rounded-lg border border-border-dark bg-surface px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              placeholder="e.g. Product Owner" required />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Description</label>
            <textarea value={form.role_description} onChange={e => setForm(f => ({ ...f, role_description: e.target.value }))}
              rows={3}
              className="w-full rounded-lg border border-border-dark bg-surface px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 resize-none"
              placeholder="Optional description..." />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setFormModal(false)}
              className="rounded-lg border border-border-dark px-4 py-2 text-sm font-medium hover:bg-surface transition-colors">Cancel</button>
            <button type="submit"
              className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 transition-colors">
              {editItem ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
        title="Delete Role" message={`Delete "${deleteTarget?.role_name}"? This will not remove existing assignments.`} />
    </>
  );
}
