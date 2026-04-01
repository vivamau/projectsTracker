import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Trash2, FolderOpen, DollarSign } from 'lucide-react';
import { getDeliveryPaths, deleteDeliveryPath } from '../../api/entitiesApi';
import { getProjects, getBudgets, getPurchaseOrders, getPurchaseOrderItems } from '../../api/projectsApi';
import { useAuth } from '../../hooks/useAuth';
import Card from '../../commoncomponents/Card';
import StatusBadge from '../../commoncomponents/StatusBadge';
import ConfirmDialog from '../../commoncomponents/ConfirmDialog';
import LoadingSpinner from '../../commoncomponents/LoadingSpinner';

export default function DeliveryPathDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [deliveryPath, setDeliveryPath] = useState(null);
  const [projects, setProjects] = useState([]);
  const [projectBudgets, setProjectBudgets] = useState({});
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const fetchData = async () => {
    try {
      // Fetch delivery path
      const pathsRes = await getDeliveryPaths();
      const pathData = pathsRes.data.data.find(p => p.id === parseInt(id));
      setDeliveryPath(pathData);

      // Fetch projects for this delivery path
      const projectsRes = await getProjects({ limit: 100, deliverypath_id: parseInt(id) });
      const projectsList = projectsRes.data.data || [];
      setProjects(projectsList);

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
      console.error('Failed to fetch delivery path details:', err);
      navigate('/delivery-paths');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [id]);

  const handleDelete = async () => {
    await deleteDeliveryPath(id);
    navigate('/delivery-paths');
  };

  const formatDate = (ts) => {
    if (!ts) return '-';
    return new Date(ts).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return '-';
    return Number(amount).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  };

  if (loading) return <LoadingSpinner size="lg" className="mt-20" />;
  if (!deliveryPath) return null;

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <button
            onClick={() => navigate('/delivery-paths')}
            className="mb-3 inline-flex items-center gap-1 text-sm text-text-secondary hover:text-primary-500 transition-colors"
          >
            <ArrowLeft size={14} /> Back to Delivery Paths
          </button>
          <h1 className="text-xl font-bold text-text-primary">{deliveryPath.deliverypath_name}</h1>
          {deliveryPath.deilverypath_description && (
            <p className="text-sm text-text-secondary mt-1">{deliveryPath.deilverypath_description}</p>
          )}
          <div className="mt-3 flex items-center gap-4 text-sm text-text-secondary">
            <span className="flex items-center gap-1"><FolderOpen size={14} /> {projects.length} project{projects.length !== 1 ? 's' : ''}</span>
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

      {/* Projects */}
      <Card title="Projects" noPadding>
        {projects.length === 0 ? (
          <p className="px-6 py-8 text-sm text-text-secondary text-center">No projects using this delivery path</p>
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
                  <td className="px-6 py-3"><StatusBadge value={p.health_status} /></td>
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

      {/* Delete confirm */}
      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        title="Delete Delivery Path"
        message={`Are you sure you want to delete "${deliveryPath.deliverypath_name}"? This will not delete its projects.`}
      />
    </div>
  );
}
