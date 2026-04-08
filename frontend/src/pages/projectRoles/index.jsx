import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { getProjectRoles, createProjectRole, updateProjectRole, deleteProjectRole } from '../../api/projectsApi';
import { useAuth } from '../../hooks/useAuth';
import Card from '../../commoncomponents/Card';
import Modal from '../../commoncomponents/Modal';
import ConfirmDialog from '../../commoncomponents/ConfirmDialog';
import LoadingSpinner from '../../commoncomponents/LoadingSpinner';

export default function ProjectRolesPage() {
  const { role } = useAuth();
  const isSuperAdmin = role === 'superadmin';
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ role_name: '', role_description: '' });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [error, setError] = useState('');

  const fetchData = () => {
    setLoading(true);
    getProjectRoles()
      .then(r => setRoles(r.data.data))
      .catch(() => setRoles([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const openCreate = () => {
    setEditItem(null);
    setForm({ role_name: '', role_description: '' });
    setError('');
    setModal(true);
  };

  const openEdit = (item) => {
    setEditItem(item);
    setForm({ role_name: item.role_name || '', role_description: item.role_description || '' });
    setError('');
    setModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.role_name.trim()) {
      setError('Role name is required');
      return;
    }
    try {
      if (editItem) {
        await updateProjectRole(editItem.id, form);
      } else {
        await createProjectRole(form);
      }
      setModal(false);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save role');
    }
  };

  const handleDelete = async () => {
    await deleteProjectRole(deleteTarget.id);
    setDeleteTarget(null);
    fetchData();
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Project Roles</h1>
          <p className="text-sm text-text-secondary">Manage roles that can be assigned to project team members</p>
        </div>
        {isSuperAdmin && (
          <button onClick={openCreate} className="inline-flex items-center gap-2 rounded-lg bg-primary-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-600 transition-colors">
            <Plus size={18} /> New Role
          </button>
        )}
      </div>

      <Card noPadding>
        {loading ? <LoadingSpinner className="py-12" /> : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface/50">
                <th className="px-6 py-3 text-left font-medium text-text-secondary">Name</th>
                <th className="px-6 py-3 text-left font-medium text-text-secondary">Description</th>
                {isSuperAdmin && <th className="px-6 py-3 text-right font-medium text-text-secondary">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {roles.length === 0 ? (
                <tr><td colSpan={isSuperAdmin ? 3 : 2} className="px-6 py-12 text-center text-text-secondary">No project roles defined</td></tr>
              ) : roles.map(r => (
                <tr key={r.id} className="border-b border-border last:border-0 hover:bg-surface/30 transition-colors">
                  <td className="px-6 py-3 font-medium text-text-primary">{r.role_name}</td>
                  <td className="px-6 py-3 text-text-secondary">{r.role_description || '-'}</td>
                  {isSuperAdmin && (
                    <td className="px-6 py-3">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openEdit(r)} className="rounded-lg p-1.5 text-text-secondary hover:bg-surface hover:text-primary-500 transition-colors"><Pencil size={16} /></button>
                        <button onClick={() => setDeleteTarget(r)} className="rounded-lg p-1.5 text-text-secondary hover:bg-error-50 hover:text-error-500 transition-colors"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Modal open={modal} onClose={() => setModal(false)} title={editItem ? 'Edit Role' : 'New Role'} maxWidth="max-w-md">
        <form onSubmit={handleSave} className="space-y-4">
          {error && <div className="rounded-lg bg-error-50 px-4 py-3 text-sm text-error-600">{error}</div>}
          <div>
            <label className="mb-1 block text-sm font-medium">Name</label>
            <input
              type="text"
              value={form.role_name}
              onChange={e => setForm(f => ({ ...f, role_name: e.target.value }))}
              className="w-full rounded-lg border border-border-dark bg-surface px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 appearance-none"
              placeholder="e.g. Product Owner"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Description</label>
            <textarea
              value={form.role_description}
              onChange={e => setForm(f => ({ ...f, role_description: e.target.value }))}
              rows={3}
              className="w-full rounded-lg border border-border-dark bg-surface px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 resize-none"
              placeholder="Optional description..."
            />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setModal(false)} className="rounded-lg border border-border-dark px-4 py-2 text-sm font-medium hover:bg-surface transition-colors">Cancel</button>
            <button type="submit" className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 transition-colors">{editItem ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} title="Delete Role" message={`Delete "${deleteTarget?.role_name}"? This will not remove existing assignments.`} />
    </div>
  );
}
