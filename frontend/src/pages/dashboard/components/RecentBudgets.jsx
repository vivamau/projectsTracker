import { DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Card from '../../../commoncomponents/Card';

export default function RecentBudgets({ budgets = [] }) {
  const navigate = useNavigate();

  const calculateBalance = (budget, items = []) => {
    const totalSpent = items.reduce((sum, item) => {
      const days = item.purchaseorderitems_days || 0;
      const rate = item.purchaseorderitems_discounted_rate || 0;
      return sum + (days * rate);
    }, 0);
    return budget.budget_amount - totalSpent;
  };

  const formatCurrency = (amount, currencyName) => {
    if (amount === null || amount === undefined) return '-';
    const formatted = Number(amount).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    return currencyName ? `${formatted} ${currencyName}` : formatted;
  };

  const getBalanceColor = (balance) => {
    if (balance < 0) return 'text-error-500';
    if (balance < 1000) return 'text-warning-500';
    return 'text-success-600';
  };

  return (
    <Card title="Recent Budgets" noPadding>
      {budgets.length === 0 ? (
        <p className="px-6 py-8 text-sm text-text-secondary text-center">No budgets yet</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface/50">
              <th className="px-6 py-3 text-left font-medium text-text-secondary">Project</th>
              <th className="px-6 py-3 text-right font-medium text-text-secondary">Budget Amount</th>
              <th className="px-6 py-3 text-right font-medium text-text-secondary">Balance</th>
              <th className="px-6 py-3 text-left font-medium text-text-secondary">Status</th>
            </tr>
          </thead>
          <tbody>
            {budgets.map(budget => {
              const balance = calculateBalance(budget, budget.items || []);
              const isOverBudget = balance < 0;

              return (
                <tr
                  key={budget.id}
                  className="border-b border-border last:border-0 hover:bg-surface/30 transition-colors cursor-pointer"
                  onClick={() => navigate(`/budgets/${budget.id}`)}
                >
                  <td className="px-6 py-3">
                    <div>
                      <p className="font-medium text-primary-600 hover:underline">{budget.project_name}</p>
                      <p className="text-xs text-text-secondary">{new Date(budget.budget_create_date).toLocaleDateString()}</p>
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
                      {isOverBudget ? (
                        <>
                          <TrendingDown size={14} className="text-error-500" />
                          <span className="text-xs font-medium text-error-500">Over Budget</span>
                        </>
                      ) : balance < 1000 ? (
                        <>
                          <TrendingDown size={14} className="text-warning-500" />
                          <span className="text-xs font-medium text-warning-500">Low</span>
                        </>
                      ) : (
                        <>
                          <TrendingUp size={14} className="text-success-600" />
                          <span className="text-xs font-medium text-success-600">Healthy</span>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </Card>
  );
}
