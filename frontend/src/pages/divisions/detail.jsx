import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Pencil, Trash2, Plus, Users, FolderOpen, DollarSign } from 'lucide-react';
import {
  getDivision, deleteDivision,
  getDivisionProjects, getDivisionSupportingProjects, getDivisionFocalPoints,
  addDivisionFocalPoint, removeDivisionFocalPoint,
  getDivisionProjectManagers, getUsers
} from '../../api/entitiesApi';
import { getBudgets, getPurchaseOrders, getPurchaseOrderItems } from '../../api/projectsApi';
import { useAuth } from '../../hooks/useAuth';
import Card from '../../commoncomponents/Card';
import StatusBadge from '../../commoncomponents/StatusBadge';
import ConfirmDialog from '../../commoncomponents/ConfirmDialog';
import Modal from '../../commoncomponents/Modal';
import LoadingSpinner from '../../commoncomponents/LoadingSpinner';

export default function DivisionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [division, setDivision] = useState(null);
  const [projects, setProjects] = useState([]);
  const [supportingProjects, setSupportingProjects] = useState([]);
  const [projectBudgets, setProjectBudgets] = useState({});
  const [focalPoints, setFocalPoints] = useState([]);
  const [projectManagers, setProjectManagers] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [fpModal, setFpModal] = useState(false);
  const [fpUserId, setFpUserId] = useState('');
  const [removeFpTarget, setRemoveFpTarget] = useState(null);

  const fetchData = async () => {
    try {
      const [divRes, projRes, suppProjRes, fpRes, pmRes, usersRes] = await Promise.all([
        getDivision(id),
        getDivisionProjects(id),
        getDivisionSupportingProjects(id),
        getDivisionFocalPoints(id),
        getDivisionProjectManagers(id),
        getUsers({ limit: 100 }).catch(() => ({ data: { data: [] } }))
      ]);

      setDivision(divRes.data.data);
      const projectsList = projRes.data.data || [];
      setProjects(projectsList);
      setSupportingProjects(suppProjRes.data.data || []);
      setFocalPoints(fpRes.data.data);
      setProjectManagers(pmRes.data.data);
      setUsers(usersRes.data.data);

      // Fetch budget data for each project
      const budgetsData = {};
      for (const project of projectsList) {
        try {
          const budgetsRes = await getBudgets(project.id);
          const budgets = budgetsRes.data.data || [];

          let totalInitialBudget = 0;
          let totalSpent = 0;
          const currencies = new Set();

          for (const budget of budgets) {
            totalInitialBudget += budget.budget_amount || 0;
            if (budget.currency_name) {
              currencies.add(budget.currency_name);
            }

            try {
              const posRes = await getPurchaseOrders(budget.id);
              const pos = posRes.data.data || [];

              for (const po of pos) {
                try {
                  const itemsRes = await getPurchaseOrderItems(budget.id, po.id);
                  const items = itemsRes.data.data || [];
                  const poTotal = items.reduce((sum, item) => {
                    const days = item.purchaseorderitems_days || 0;
                    const rate = item.purchaseorderitems_discounted_rate || 0;
                    return sum + (days * rate);
                  }, 0);
                  totalSpent += poTotal;
                } catch {
                  // Continue if items fail
                }
              }
            } catch {
              // Continue if POs fail
            }
          }

          budgetsData[project.id] = {
            initialBudget: totalInitialBudget,
            spent: totalSpent,
            currentBudget: totalInitialBudget - totalSpent,
            currencies: Array.from(currencies).sort()
          };
        } catch {
          budgetsData[project.id] = {
            initialBudget: 0,
            spent: 0,
            currentBudget: 0,
            currencies: []
          };
        }
      }

      setProjectBudgets(budgetsData);
    } catch (err) {
      navigate('/divisions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [id]);

  const handleDelete = async () => {
    await deleteDivision(id);
    navigate('/divisions');
  };

  const handleAddFocalPoint = async (e) => {
    e.preventDefault();
    if (!fpUserId) return;
    await addDivisionFocalPoint(id, { user_id: parseInt(fpUserId) });
    const [fpRes, divRes] = await Promise.all([
      getDivisionFocalPoints(id),
      getDivision(id)
    ]);
    setFocalPoints(fpRes.data.data);
    setDivision(divRes.data.data);
    setFpModal(false);
    setFpUserId('');
  };

  const handleRemoveFocalPoint = async () => {
    await removeDivisionFocalPoint(id, removeFpTarget.id);
    setRemoveFpTarget(null);
    const [fpRes, divRes] = await Promise.all([
      getDivisionFocalPoints(id),
      getDivision(id)
    ]);
    setFocalPoints(fpRes.data.data);
    setDivision(divRes.data.data);
  };

  const formatDate = (ts) => {
    if (!ts) return '-';
    return new Date(ts).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return '-';
    return Number(amount).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  };

  // Filter out users already assigned as focal points
  const availableUsers = users.filter(
    u => !focalPoints.find(fp => fp.user_id === u.id)
  );

  if (loading) return <LoadingSpinner size="lg" className="mt-20" />;
  if (!division) return null;

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-text-primary">{division.division_name}</h1>
          <div className="mt-1 flex items-center gap-4 text-sm text-text-secondary">
            <span className="flex items-center gap-1"><FolderOpen size={14} /> {division.projects_count} project{division.projects_count !== 1 ? 's' : ''}</span>
            <span className="flex items-center gap-1"><Users size={14} /> {division.focal_points_count} focal point{division.focal_points_count !== 1 ? 's' : ''}</span>
            <span className="flex items-center gap-1"><DollarSign size={14} /> {Number(division.total_budget).toLocaleString('en-US')} total budget</span>
          </div>
        </div>
        {isAdmin && (
          <button
            onClick={() => setConfirmDelete(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-error-500 px-3 py-2 text-sm font-medium text-error-500 hover:bg-error-50 transition-colors"
          >
            <Trash2 size={15} /> Delete
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Projects list */}
        <div className="lg:col-span-2">
          {/* Budget Summary */}
          {projects.length > 0 && (() => {
            const allCurrencies = Array.from(new Set(Object.values(projectBudgets).flatMap(b => b.currencies || []))).sort().join('/');
            return (
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-surface rounded-lg border border-border p-4">
                  <p className="text-xs text-text-secondary uppercase tracking-wide mb-2">Total Initial Budget</p>
                  <p className="text-xl font-bold text-text-primary">
                    {formatCurrency(Object.values(projectBudgets).reduce((sum, b) => sum + (b.initialBudget || 0), 0))} {allCurrencies}
                  </p>
                </div>
                <div className="bg-surface rounded-lg border border-border p-4">
                  <p className="text-xs text-text-secondary uppercase tracking-wide mb-2">Total Spent</p>
                  <p className="text-xl font-bold text-text-primary">
                    {formatCurrency(Object.values(projectBudgets).reduce((sum, b) => sum + (b.spent || 0), 0))} {allCurrencies}
                  </p>
                </div>
                <div className="bg-surface rounded-lg border border-border p-4">
                  <p className="text-xs text-text-secondary uppercase tracking-wide mb-2">Total Current Budget</p>
                  <p className={`text-xl font-bold ${Object.values(projectBudgets).reduce((sum, b) => sum + (b.currentBudget || 0), 0) < 0 ? 'text-error-500' : 'text-success-600'}`}>
                    {formatCurrency(Object.values(projectBudgets).reduce((sum, b) => sum + (b.currentBudget || 0), 0))} {allCurrencies}
                  </p>
                </div>
              </div>
            );
          })()}

          <Card title="Projects" noPadding>
            {projects.length === 0 ? (
              <p className="px-6 py-8 text-sm text-text-secondary text-center">No projects in this division</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface/50">
                    <th className="px-6 py-3 text-left font-medium text-text-secondary">Project</th>
                    <th className="px-6 py-3 text-left font-medium text-text-secondary">Health</th>
                    <th className="px-6 py-3 text-left font-medium text-text-secondary">Owner</th>
                    <th className="px-6 py-3 text-left font-medium text-text-secondary">Start Date</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map(p => (
                    <tr key={p.id} className="border-b border-border last:border-0 hover:bg-surface/30 transition-colors">
                      <td className="px-6 py-3">
                        <Link to={`/projects/${p.id}`} className="font-medium text-primary-500 hover:text-primary-600 hover:underline">
                          {p.project_name}
                        </Link>
                        {p.project_description && (
                          <p className="mt-0.5 text-xs text-text-secondary line-clamp-1">{p.project_description}</p>
                        )}
                      </td>
                      <td className="px-6 py-3"><StatusBadge value={p.health_status} name={p.health_status_name} /></td>
                      <td className="px-6 py-3 text-text-secondary">
                        {p.owner_name ? `${p.owner_name} ${p.owner_lastname || ''}`.trim() : '-'}
                      </td>
                      <td className="px-6 py-3 text-text-secondary">{formatDate(p.project_start_date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Focal Points */}
          <Card
            title="Focal Points"
            extra={
              isAdmin && (
                <button
                  onClick={() => setFpModal(true)}
                  className="inline-flex items-center gap-1 rounded-lg bg-primary-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-600 transition-colors"
                >
                  <Plus size={14} /> Add
                </button>
              )
            }
          >
            {focalPoints.length === 0 ? (
              <p className="text-sm text-text-secondary">No focal points assigned</p>
            ) : (
              <div className="space-y-2">
                {focalPoints.map(fp => (
                  <div key={fp.id} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-50 text-xs font-bold text-primary-600">
                        {(fp.user_name?.[0] || '') + (fp.user_lastname?.[0] || '')}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-text-primary">{fp.user_name} {fp.user_lastname}</p>
                        <p className="text-xs text-text-secondary">{fp.user_email}</p>
                      </div>
                    </div>
                    {isAdmin && (
                      <button
                        onClick={() => setRemoveFpTarget(fp)}
                        className="text-text-secondary hover:text-error-500 transition-colors p-1"
                        title="Remove focal point"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Project Managers */}
          {projectManagers.length > 0 && (
            <Card title="Project Managers">
              <div className="space-y-3">
                {Object.values(
                  projectManagers.reduce((acc, pm) => {
                    if (!acc[pm.user_id]) {
                      acc[pm.user_id] = { ...pm, projects: [] };
                    }
                    acc[pm.user_id].projects.push({ id: pm.project_id, name: pm.project_name });
                    return acc;
                  }, {})
                ).map(pm => (
                  <div key={pm.user_id} className="flex items-start gap-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-50 text-xs font-bold text-primary-600">
                      {(pm.user_name?.[0] || '') + (pm.user_lastname?.[0] || '')}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-text-primary">{pm.user_name} {pm.user_lastname}</p>
                      <p className="text-xs text-text-secondary">{pm.user_email}</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {pm.projects.map(p => (
                          <Link key={p.id} to={`/projects/${p.id}`} className="text-xs text-primary-500 hover:underline">
                            {p.name}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Supporting Projects */}
          {supportingProjects.length > 0 && (
            <Card title="Supporting Projects">
              <div className="space-y-2">
                {supportingProjects.map(p => (
                  <div key={p.id} className="flex flex-col gap-1">
                    <Link to={`/projects/${p.id}`} className="font-medium text-primary-500 hover:text-primary-600 hover:underline text-sm">
                      {p.project_name}
                    </Link>
                    {p.project_description && (
                      <p className="text-xs text-text-secondary line-clamp-1">{p.project_description}</p>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Metadata */}
          <Card title="Metadata">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-text-secondary">Created</span>
                <span className="font-medium">{formatDate(division.division_create_date)}</span>
              </div>
              {division.division_update_date && (
                <div className="flex justify-between">
                  <span className="text-text-secondary">Updated</span>
                  <span className="font-medium">{formatDate(division.division_update_date)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-text-secondary">ID</span>
                <span className="font-mono text-text-secondary">#{division.id}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Delete confirm */}
      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        title="Delete Division"
        message={`Are you sure you want to delete "${division.division_name}"? This will not delete its projects.`}
      />

      {/* Remove focal point confirm */}
      <ConfirmDialog
        open={!!removeFpTarget}
        onClose={() => setRemoveFpTarget(null)}
        onConfirm={handleRemoveFocalPoint}
        title="Remove Focal Point"
        message={`Remove ${removeFpTarget?.user_name} ${removeFpTarget?.user_lastname || ''} as a focal point?`}
      />

      {/* Add focal point modal */}
      <Modal open={fpModal} onClose={() => setFpModal(false)} title="Add Focal Point" maxWidth="max-w-sm">
        <form onSubmit={handleAddFocalPoint} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">User</label>
            {availableUsers.length === 0 ? (
              <p className="text-sm text-text-secondary">All users are already assigned as focal points</p>
            ) : (
              <select
                value={fpUserId}
                onChange={e => setFpUserId(e.target.value)}
                className="w-full rounded-lg border border-border-dark bg-surface px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 appearance-none"
              >
                <option value="">Select user</option>
                {availableUsers.map(u => (
                  <option key={u.id} value={u.id}>{u.user_name} {u.user_lastname} ({u.user_email})</option>
                ))}
              </select>
            )}
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setFpModal(false)} className="rounded-lg border border-border-dark px-4 py-2 text-sm font-medium hover:bg-surface transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={!fpUserId}
              className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-60 transition-colors"
            >
              Add
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
