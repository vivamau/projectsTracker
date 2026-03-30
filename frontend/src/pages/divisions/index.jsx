import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { getDivisions, createDivision, updateDivision, deleteDivision } from '../../api/entitiesApi';
import { useAuth } from '../../hooks/useAuth';
import Card from '../../commoncomponents/Card';
import Modal from '../../commoncomponents/Modal';
import ConfirmDialog from '../../commoncomponents/ConfirmDialog';
import LoadingSpinner from '../../commoncomponents/LoadingSpinner';

export default function DivisionsPage() {
  const { isAdmin } = useAuth();
  const [divisions, setDivisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [name, setName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetch = () => {
    setLoading(true);
    getDivisions()
      .then(r => setDivisions(r.data.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetch(); }, []);

  const openCreate = () => { setEditItem(null); setName(''); setModal(true); };
  const openEdit = (d) => { setEditItem(d); setName(d.division_name); setModal(true); };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (editItem) {
      await updateDivision(editItem.id, { division_name: name.trim() });
    } else {
      await createDivision({ division_name: name.trim() });
    }
    setModal(false);
    fetch();
  };

  const handleDelete = async () => {
    await deleteDivision(deleteTarget.id);
    setDeleteTarget(null);
    fetch();
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Divisions</h1>
          <p className="text-sm text-text-secondary">Manage organizational divisions</p>
        </div>
        {isAdmin && (
          <button onClick={openCreate} className="inline-flex items-center gap-2 rounded-lg bg-primary-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-600 transition-colors">
            <Plus size={18} /> New Division
          </button>
        )}
      </div>

      <Card noPadding>
        {loading ? <LoadingSpinner className="py-12" /> : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface/50">
                <th className="px-6 py-3 text-left font-medium text-text-secondary">Name</th>
                <th className="px-6 py-3 text-left font-medium text-text-secondary">Created</th>
                {isAdmin && <th className="px-6 py-3 text-right font-medium text-text-secondary">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {divisions.length === 0 ? (
                <tr><td colSpan={3} className="px-6 py-12 text-center text-text-secondary">No divisions</td></tr>
              ) : divisions.map(d => (
                <tr key={d.id} className="border-b border-border last:border-0 hover:bg-surface/30 transition-colors">
                  <td className="px-6 py-3 font-medium">
                    <Link to={`/divisions/${d.id}`} className="text-primary-500 hover:text-primary-600 hover:underline">{d.division_name}</Link>
                  </td>
                  <td className="px-6 py-3 text-text-secondary">{d.division_create_date ? new Date(d.division_create_date).toLocaleDateString() : '-'}</td>
                  {isAdmin && (
                    <td className="px-6 py-3">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openEdit(d)} className="rounded-lg p-1.5 text-text-secondary hover:bg-surface hover:text-primary-500 transition-colors"><Pencil size={16} /></button>
                        <button onClick={() => setDeleteTarget(d)} className="rounded-lg p-1.5 text-text-secondary hover:bg-error-50 hover:text-error-500 transition-colors"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Modal open={modal} onClose={() => setModal(false)} title={editItem ? 'Edit Division' : 'New Division'} maxWidth="max-w-sm">
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Division Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full rounded-lg border border-border-dark px-3 py-2 text-sm outline-none focus:border-primary-500" placeholder="Division name" autoFocus />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setModal(false)} className="rounded-lg border border-border-dark px-4 py-2 text-sm font-medium hover:bg-surface transition-colors">Cancel</button>
            <button type="submit" className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 transition-colors">{editItem ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} title="Delete Division" message={`Delete "${deleteTarget?.division_name}"?`} />
    </div>
  );
}
