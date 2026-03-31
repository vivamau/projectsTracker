import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import { getAllBudgets, getPurchaseOrders, getPurchaseOrderItems } from '../../api/projectsApi';
import Card from '../../commoncomponents/Card';
import LoadingSpinner from '../../commoncomponents/LoadingSpinner';

export default function BudgetsPage() {
  const navigate = useNavigate();
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const budgetsRes = await getAllBudgets();
        const budgetsData = budgetsRes.data.data || [];

        // Fetch PO items for each budget to calculate balance
        const budgetsWithItems = await Promise.all(
          budgetsData.map(async (budget) => {
            try {
              const posRes = await getPurchaseOrders(budget.id);
              const pos = posRes.data.data || [];

              let allItems = [];
              for (const po of pos) {
                try {
                  const itemsRes = await getPurchaseOrderItems(budget.id, po.id);
                  allItems.push(...(itemsRes.data.data || []));
                } catch {
                  // Continue if items fetch fails
                }
              }

              return { ...budget, items: allItems };
            } catch {
              return { ...budget, items: [] };
            }
          })
        );

        setBudgets(budgetsWithItems);
      } catch (err) {
        console.error('Failed to fetch budgets:', err);
        setBudgets([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const formatDate = (ts) => {
    if (!ts) return '-';
    return new Date(ts).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatCurrency = (amount, currencyName) => {
    if (amount === null || amount === undefined) return '-';
    const formatted = Number(amount).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    return currencyName ? `${formatted} ${currencyName}` : formatted;
  };

  const calculateBalance = (budget) => {
    const totalSpent = (budget.items || []).reduce((sum, item) => {
      const days = item.purchaseorderitems_days || 0;
      const rate = item.purchaseorderitems_discounted_rate || 0;
      return sum + (days * rate);
    }, 0);
    return budget.budget_amount - totalSpent;
  };

  const getBalanceColor = (balance) => {
    if (balance < 0) return 'text-error-500';
    if (balance < 1000) return 'text-warning-500';
    return 'text-success-600';
  };

  const getStatusIcon = (balance) => {
    if (balance < 0) return <TrendingDown size={14} className="text-error-500" />;
    if (balance < 1000) return <TrendingDown size={14} className="text-warning-500" />;
    return <TrendingUp size={14} className="text-success-600" />;
  };

  const getStatusText = (balance) => {
    if (balance < 0) return 'Over Budget';
    if (balance < 1000) return 'Low';
    return 'Healthy';
  };

  if (loading) return <LoadingSpinner size="lg" className="mt-20" />;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
          <DollarSign size={24} className="text-primary-500" />
          Budgets
        </h1>
        <p className="text-sm text-text-secondary">View all project budgets and their balances</p>
      </div>

      <Card noPadding>
        {budgets.length === 0 ? (
          <p className="px-6 py-12 text-center text-text-secondary">No budgets found</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface/50">
                <th className="px-6 py-3 text-left font-medium text-text-secondary">Project</th>
                <th className="px-6 py-3 text-right font-medium text-text-secondary">Budget Amount</th>
                <th className="px-6 py-3 text-right font-medium text-text-secondary">Balance</th>
                <th className="px-6 py-3 text-left font-medium text-text-secondary">Status</th>
                <th className="px-6 py-3 text-left font-medium text-text-secondary">Created</th>
              </tr>
            </thead>
            <tbody>
              {budgets.map(budget => {
                const balance = calculateBalance(budget);

                return (
                  <tr
                    key={budget.id}
                    className="border-b border-border last:border-0 hover:bg-surface/30 transition-colors cursor-pointer"
                    onClick={() => navigate(`/budgets/${budget.id}`)}
                  >
                    <td className="px-6 py-3">
                      <div>
                        <p className="font-medium text-primary-600 hover:underline">{budget.project_name}</p>
                        <p className="text-xs text-text-secondary">ID: {budget.id}</p>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-right font-medium text-text-primary">
                      {formatCurrency(budget.budget_amount, budget.currency_name)}
                    </td>
                    <td className="px-6 py-3 text-right font-semibold">
                      <span className={getBalanceColor(balance)}>
                        {formatCurrency(balance, budget.currency_name)}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-1.5">
                        {getStatusIcon(balance)}
                        <span className={`text-xs font-medium ${balance < 0 ? 'text-error-500' : balance < 1000 ? 'text-warning-500' : 'text-success-600'}`}>
                          {getStatusText(balance)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-text-secondary">{formatDate(budget.budget_create_date)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
