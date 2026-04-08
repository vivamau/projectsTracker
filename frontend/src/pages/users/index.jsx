import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { getUsers, createUser, updateUser, deleteUser } from '../../api/entitiesApi';
import { getProjectStats } from '../../api/projectsApi';
import { useAuth } from '../../hooks/useAuth';
import Card from '../../commoncomponents/Card';
import Modal from '../../commoncomponents/Modal';
import ConfirmDialog from '../../commoncomponents/ConfirmDialog';
import SearchInput from '../../commoncomponents/SearchInput';
import Pagination from '../../commoncomponents/Pagination';
import LoadingSpinner from '../../commoncomponents/LoadingSpinner';

const ROLES = [
  { id: 1, name: 'superadmin' },
  { id: 2, name: 'admin' },
  { id: 3, name: 'contributor' },
  { id: 4, name: 'guest' },
];

export default function UsersPage() {
  const navigate = useNavigate();
  const { role } = useAuth();
  const isSuperAdmin = role === 'superadmin';
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ user_email: '', user_name: '', user_lastname: '', password: '', userrole_id: 3 });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [error, setError] = useState('');
  const [stats, setStats] = useState(null);

  const fetchData = () => {
    setLoading(true);
    getUsers({ page, limit: 20, search })
      .then(r => { setUsers(r.data.data); setPagination(r.data.pagination); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [page, search]);
  useEffect(() => { setPage(1); }, [search]);
  useEffect(() => {
    if (isSuperAdmin) {
      getProjectStats()
        .then(r => setStats(r.data.data))
        .catch(() => setStats(null));
    }
  }, [isSuperAdmin]);

  const openCreate = () => {
    setEditItem(null);
    setForm({ user_email: '', user_name: '', user_lastname: '', password: '', userrole_id: 3 });
    setError('');
    setModal(true);
  };

  const openEdit = (u) => {
    setEditItem(u);
    setForm({ user_email: u.user_email, user_name: u.user_name || '', user_lastname: u.user_lastname || '', password: '', userrole_id: u.userrole_id });
    setError('');
    setModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editItem) {
        const data = { ...form };
        if (!data.password) delete data.password;
        await updateUser(editItem.id, data);
      } else {
        if (!form.user_email || !form.password) {
          setError('Email and password are required');
          return;
        }
        await createUser(form);
      }
      setModal(false);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save user');
    }
  };

  const handleDelete = async () => {
    await deleteUser(deleteTarget.id);
    setDeleteTarget(null);
    fetchData();
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Users</h1>
          <p className="text-sm text-text-secondary">Manage system users</p>
        </div>
        {isSuperAdmin && (
          <button onClick={openCreate} className="inline-flex items-center gap-2 rounded-lg bg-primary-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-600 transition-colors">
            <Plus size={18} /> New User
          </button>
        )}
      </div>

      <div>
        <Card noPadding>
        <div className="border-b border-border px-6 py-4">
          <div className="w-64"><SearchInput value={search} onChange={setSearch} placeholder="Search users..." /></div>
        </div>

        {loading ? <LoadingSpinner className="py-12" /> : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface/50">
                <th className="px-6 py-3 text-left font-medium text-text-secondary">Name</th>
                <th className="px-6 py-3 text-left font-medium text-text-secondary">Email</th>
                <th className="px-6 py-3 text-left font-medium text-text-secondary">Role</th>
                <th className="px-6 py-3 text-left font-medium text-text-secondary">Act as</th>
                {isSuperAdmin && <th className="px-6 py-3 text-right font-medium text-text-secondary">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-text-secondary">No users</td></tr>
              ) : users.map(u => {
                const userRoles = (stats?.roleAssignments || [])
                  .filter(ra => ra.user_id === u.id)
                  .map(ra => ra.role_name)
                  .filter((v, i, a) => a.indexOf(v) === i);
                const isOwner = stats?.owners?.some(p => p.user_id === u.id);
                const actAs = [...userRoles, isOwner && 'Owner'].filter(Boolean).join(' · ') || '-';
                return (
                <tr key={u.id} className="border-b border-border last:border-0 hover:bg-surface/30 transition-colors cursor-pointer" onClick={() => isSuperAdmin && navigate(`/users/${u.id}`)}>
                  <td className="px-6 py-3 font-medium">
                    {isSuperAdmin
                      ? <Link to={`/users/${u.id}`} className="text-primary-600 hover:underline" onClick={e => e.stopPropagation()}>{u.user_name} {u.user_lastname}</Link>
                      : <>{u.user_name} {u.user_lastname}</>
                    }
                  </td>
                  <td className="px-6 py-3 text-text-secondary">{u.user_email}</td>
                  <td className="px-6 py-3">
                    <span className="rounded-full bg-primary-600 px-2.5 py-0.5 text-xs font-medium text-white capitalize">
                      {u.role || u.userrole_name}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-sm text-text-secondary">{actAs}</td>
                  {isSuperAdmin && (
                    <td className="px-6 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openEdit(u)} className="rounded-lg p-1.5 text-text-secondary hover:bg-surface hover:text-primary-500 transition-colors"><Pencil size={16} /></button>
                        <button onClick={() => setDeleteTarget(u)} className="rounded-lg p-1.5 text-text-secondary hover:bg-error-50 hover:text-error-500 transition-colors"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  )}
                </tr>
              );})}
            </tbody>
          </table>
        )}
        <Pagination page={pagination.page || 1} totalPages={pagination.totalPages || 1} total={pagination.total || 0} onPageChange={setPage} />
      </Card>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editItem ? 'Edit User' : 'New User'} maxWidth="max-w-md">
        <form onSubmit={handleSave} className="space-y-4">
          {error && <div className="rounded-lg bg-error-50 px-4 py-3 text-sm text-error-600">{error}</div>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium">First Name</label>
              <input type="text" value={form.user_name} onChange={e => setForm(f => ({ ...f, user_name: e.target.value }))} className="w-full rounded-lg border border-border-dark bg-surface px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 appearance-none" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Last Name</label>
              <input type="text" value={form.user_lastname} onChange={e => setForm(f => ({ ...f, user_lastname: e.target.value }))} className="w-full rounded-lg border border-border-dark bg-surface px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 appearance-none" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Email</label>
            <input type="email" value={form.user_email} onChange={e => setForm(f => ({ ...f, user_email: e.target.value }))} className="w-full rounded-lg border border-border-dark bg-surface px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 appearance-none" required />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Password {editItem && '(leave blank to keep)'}</label>
            <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} className="w-full rounded-lg border border-border-dark bg-surface px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 appearance-none" {...(!editItem && { required: true })} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Role</label>
            <select value={form.userrole_id} onChange={e => setForm(f => ({ ...f, userrole_id: parseInt(e.target.value) }))} className="w-full rounded-lg border border-border-dark bg-surface px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 appearance-none">
              {ROLES.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setModal(false)} className="rounded-lg border border-border-dark px-4 py-2 text-sm font-medium hover:bg-surface transition-colors">Cancel</button>
            <button type="submit" className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 transition-colors">{editItem ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} title="Delete User" message={`Delete "${deleteTarget?.user_email}"?`} />
    </div>
  );
}
