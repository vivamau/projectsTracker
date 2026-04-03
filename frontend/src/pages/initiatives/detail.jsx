import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, FolderKanban } from 'lucide-react';
import { getInitiatives } from '../../api/entitiesApi';
import { getProjects, getBudgets, getPurchaseOrders, getPurchaseOrderItems } from '../../api/projectsApi';
import Card from '../../commoncomponents/Card';
import LoadingSpinner from '../../commoncomponents/LoadingSpinner';
import StatusBadge from '../../commoncomponents/StatusBadge';

export default function InitiativeDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [initiative, setInitiative] = useState(null);
  const [projects, setProjects] = useState([]);
  const [projectBudgets, setProjectBudgets] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const initiativesRes = await getInitiatives();
        const initiativeData = initiativesRes.data.data.find(i => i.id === parseInt(id));
        setInitiative(initiativeData);

        const projectsRes = await getProjects({ limit: 100, initiative_id: parseInt(id) });
        const projectsList = projectsRes.data.data || [];
        setProjects(projectsList);

        const budgetsData = {};
        const currenciesSet = new Set();
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
                currenciesSet.add(budget.currency_name);
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
                  }
                }
              } catch {
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
        console.error('Failed to fetch initiative details:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  if (loading) return <LoadingSpinner size="lg" className="mt-20" />;
  if (!initiative) return null;

  const formatDate = (ts) => {
    if (!ts) return '-';
    return new Date(ts).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return '-';
    return Number(amount).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  };

  return (
    <div>
      <div className="mb-6">
        <button
          onClick={() => navigate('/initiatives')}
          className="mb-3 inline-flex items-center gap-1 text-sm text-text-secondary hover:text-primary-500 transition-colors"
        >
          <ArrowLeft size={14} /> Back to Initiatives
        </button>

        <div className="bg-surface rounded-lg border border-border p-6 mb-6">
          <h1 className="text-2xl font-bold text-text-primary mb-2">{initiative.initiative_name}</h1>
          {initiative.initiative_description && (
            <p className="text-sm text-text-secondary">{initiative.initiative_description}</p>
          )}
        </div>

        {projects.length > 0 && (() => {
          const allCurrencies = Array.from(new Set(Object.values(projectBudgets).flatMap(b => b.currencies || []))).sort().join('/');
          return (
            <div className="grid grid-cols-3 gap-4">
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
      </div>

      <Card title={`Projects (${projects.length})`} noPadding>
        {projects.length === 0 ? (
          <p className="px-6 py-8 text-center text-text-secondary">No projects in this initiative</p>
        ) : (
          <div className="divide-y divide-border">
            {projects.map(project => {
              const budgetData = projectBudgets[project.id] || { initialBudget: 0, spent: 0, currentBudget: 0 };
              return (
                <Link
                  key={project.id}
                  to={`/projects/${project.id}`}
                  className="block px-6 py-4 hover:bg-surface/30 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <FolderKanban size={18} className="text-primary-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-primary-600 hover:text-primary-700 truncate">{project.project_name}</p>
                        <StatusBadge value={project.health_status} />
                      </div>
                      <div className="flex flex-col gap-2 mt-2">
                        <div className="flex flex-col gap-1 text-xs text-text-secondary">
                          <p>Division: {project.division_name || '-'}</p>
                          <p>Start: {formatDate(project.project_start_date)}</p>
                        </div>
                        <div className="grid grid-cols-3 gap-3 mt-2 pt-2 border-t border-border/30">
                          <div>
                            <p className="text-xs text-text-secondary uppercase tracking-wide">Initial Budget</p>
                            <p className="text-sm font-semibold text-text-primary">
                              {formatCurrency(budgetData.initialBudget)} {budgetData.currencies?.join('/')}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-text-secondary uppercase tracking-wide">Spent</p>
                            <p className="text-sm font-semibold text-text-primary">
                              {formatCurrency(budgetData.spent)} {budgetData.currencies?.join('/')}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-text-secondary uppercase tracking-wide">Current</p>
                            <p className={`text-sm font-semibold ${budgetData.currentBudget < 0 ? 'text-error-500' : 'text-success-600'}`}>
                              {formatCurrency(budgetData.currentBudget)} {budgetData.currencies?.join('/')}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
