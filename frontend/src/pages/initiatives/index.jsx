import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { getInitiatives, createInitiative, updateInitiative, deleteInitiative } from '../../api/entitiesApi';
import { useAuth } from '../../hooks/useAuth';
import Card from '../../commoncomponents/Card';
import Modal from '../../commoncomponents/Modal';
import ConfirmDialog from '../../commoncomponents/ConfirmDialog';
import LoadingSpinner from '../../commoncomponents/LoadingSpinner';
import SearchInput from '../../commoncomponents/SearchInput';

export default function InitiativesPage() {
  const { isAdmin } = useAuth();
  const [items, setItems] = useState([]);
  const [allItems, setAllItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ initiative_name: '', initiative_description: '' });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [search, setSearch] = useState('');

  const filterInitiatives = (initiativesList, searchTerm) => {
    if (!searchTerm.trim()) {
      setItems(initiativesList);
      return;
    }

    const filtered = initiativesList.filter(i =>
      i.initiative_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.initiative_description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setItems(filtered);
  };

  const fetchData = () => {
    setLoading(true);
    getInitiatives()
      .then(r => {
        setAllItems(r.data.data);
        filterInitiatives(r.data.data, search);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    filterInitiatives(allItems, search);
  }, [search, allItems]);

  const openCreate = () => { setEditItem(null); setForm({ initiative_name: '', initiative_description: '' }); setModal(true); };
  const openEdit = (item) => { setEditItem(item); setForm({ initiative_name: item.initiative_name || '', initiative_description: item.initiative_description || '' }); setModal(true); };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.initiative_name.trim()) return;
    if (editItem) {
      await updateInitiative(editItem.id, form);
    } else {
      await createInitiative(form);
    }
    setModal(false);
    fetchData();
  };

  const handleDelete = async () => {
    await deleteInitiative(deleteTarget.id);
    setDeleteTarget(null);
    fetchData();
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Initiatives</h1>
          <p className="text-sm text-text-secondary">Manage project initiatives</p>
        </div>
        {isAdmin && (
          <button onClick={openCreate} className="inline-flex items-center gap-2 rounded-lg bg-primary-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-600 transition-colors">
            <Plus size={18} /> New Initiative
          </button>
        )}
      </div>

      <Card noPadding>
        {/* Search Filter */}
        <div className="border-b border-border px-6 py-4">
          <div className="w-64">
            <SearchInput value={search} onChange={setSearch} placeholder="Search initiatives..." />
          </div>
        </div>

        {loading ? <LoadingSpinner className="py-12" /> : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface/50">
                <th className="px-6 py-3 text-left font-medium text-text-secondary">Name</th>
                <th className="px-6 py-3 text-left font-medium text-text-secondary">Description</th>
                {isAdmin && <th className="px-6 py-3 text-right font-medium text-text-secondary">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={3} className="px-6 py-12 text-center text-text-secondary">No initiatives</td></tr>
              ) : items.map(item => (
                <tr key={item.id} className="border-b border-border last:border-0 hover:bg-surface/30 transition-colors">
                  <td className="px-6 py-3 font-medium">
                    <Link to={`/initiatives/${item.id}`} className="text-primary-600 hover:text-primary-700">
                      {item.initiative_name}
                    </Link>
                  </td>
                  <td className="px-6 py-3 text-text-secondary">{item.initiative_description || '-'}</td>
                  {isAdmin && (
                    <td className="px-6 py-3">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openEdit(item)} className="rounded-lg p-1.5 text-text-secondary hover:bg-surface hover:text-primary-500 transition-colors"><Pencil size={16} /></button>
                        <button onClick={() => setDeleteTarget(item)} className="rounded-lg p-1.5 text-text-secondary hover:bg-error-50 hover:text-error-500 transition-colors"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Modal open={modal} onClose={() => setModal(false)} title={editItem ? 'Edit Initiative' : 'New Initiative'} maxWidth="max-w-md">
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Name</label>
            <input type="text" value={form.initiative_name} onChange={e => setForm(f => ({ ...f, initiative_name: e.target.value }))} className="w-full rounded-lg border border-border-dark px-3 py-2 text-sm outline-none focus:border-primary-500" autoFocus />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Description</label>
            <textarea value={form.initiative_description} onChange={e => setForm(f => ({ ...f, initiative_description: e.target.value }))} rows={3} className="w-full rounded-lg border border-border-dark px-3 py-2 text-sm outline-none focus:border-primary-500 resize-none" />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setModal(false)} className="rounded-lg border border-border-dark px-4 py-2 text-sm font-medium hover:bg-surface transition-colors">Cancel</button>
            <button type="submit" className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 transition-colors">{editItem ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} title="Delete Initiative" message={`Delete "${deleteTarget?.initiative_name}"?`} />
    </div>
  );
}
