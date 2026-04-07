import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { getProjectStats, getRecentBudgets, getPurchaseOrders, getPurchaseOrderItems } from '../../api/projectsApi';
import KpiCard from './components/KpiCard';
import ProjectGroupsCard from './components/ProjectGroupsCard';
import HealthDistributionCard from './components/HealthDistributionCard';
import ActivityStatsCard from './components/ActivityStatsCard';
import PeopleListCard from './components/PeopleListCard';
import RecentBudgets from './components/RecentBudgets';
import LoadingSpinner from '../../commoncomponents/LoadingSpinner';

function fmt(n) {
  return Number(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function ExchangeRatesModal({ rates, updatedAt, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const entries = Object.entries(rates)
    .filter(([code]) => code !== 'USD')
    .sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={ref} className="w-80 rounded-lg border border-border bg-surface-card p-5 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-text-primary">Exchange Rates (USD base)</h3>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary text-lg leading-none">&times;</button>
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-medium text-text-secondary border-b border-border pb-1 mb-2">
            <span>Currency</span>
            <span>1 USD =</span>
          </div>
          {entries.map(([code, rate]) => (
            <div key={code} className="flex justify-between text-sm">
              <span className="text-text-secondary">{code}</span>
              <span className="font-medium text-text-primary">{rate.toFixed(4)}</span>
            </div>
          ))}
        </div>
        {updatedAt && (
          <p className="mt-4 text-xs text-text-secondary border-t border-border pt-3">
            Last updated: {new Date(updatedAt).toLocaleString()}
          </p>
        )}
      </div>
    </div>
  );
}

function POValueCard({ total, spent, exchangeRates = {}, exchangeRatesUpdatedAt }) {
  const [showModal, setShowModal] = useState(false);
  const balance = total - spent;
  const spentPct = total > 0 ? Math.round((spent / total) * 100) : 0;
  const eurRate = exchangeRates.EUR;

  return (
    <div className="rounded-lg border border-border bg-surface-card p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-text-secondary">PO Value</p>
        <div className="flex items-center gap-2">
          {eurRate != null && (
            <span className="text-xs text-text-secondary whitespace-nowrap">
              1 USD = <span className="font-medium text-text-primary">{eurRate.toFixed(4)}</span> EUR
            </span>
          )}
          <button onClick={() => setShowModal(true)} className="text-xs text-primary-600 hover:underline">
            more
          </button>
        </div>
      </div>
      <p className="text-2xl font-bold text-text-primary mb-3">
        <span className="text-base font-semibold text-text-secondary mr-1">USD</span>
        {fmt(total)}
      </p>

      {/* Progress bar */}
      <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-surface">
        <div
          className="h-full rounded-full bg-warning-500 transition-all duration-500"
          style={{ width: `${Math.min(spentPct, 100)}%` }}
        />
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-text-secondary">Spent</span>
          <span className="font-medium text-warning-600">{fmt(spent)} <span className="text-text-secondary">({spentPct}%)</span></span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-text-secondary">Balance</span>
          <span className={`font-medium ${balance < 0 ? 'text-error-600' : 'text-success-600'}`}>{fmt(balance)}</span>
        </div>
      </div>

      {showModal && <ExchangeRatesModal rates={exchangeRates} updatedAt={exchangeRatesUpdatedAt} onClose={() => setShowModal(false)} />}
    </div>
  );
}

export default function DashboardPage() {
  const { role } = useAuth();
  const isSuperAdmin = role === 'superadmin';
  const [stats, setStats] = useState(null);
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, budgetsRes] = await Promise.all([
          getProjectStats(),
          getRecentBudgets(5)
        ]);

        setStats(statsRes.data.data);

        // Fetch PO items for each budget to calculate balance
        const budgetsWithItems = await Promise.all(
          (budgetsRes.data.data || []).map(async (budget) => {
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
      } catch {
        setStats(null);
        setBudgets([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <LoadingSpinner size="lg" className="mt-20" />;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-text-primary">Dashboard</h1>
        <p className="text-sm text-text-secondary">Welcome to Projects Tracker</p>
      </div>

      {/* KPI Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <POValueCard
          total={stats?.totalPOAmount || 0}
          spent={stats?.totalPOSpent || 0}
          exchangeRates={stats?.exchangeRates || {}}
          exchangeRatesUpdatedAt={stats?.exchangeRatesUpdatedAt}
        />
        <ProjectGroupsCard groupCounts={stats?.groupCounts || {}} />
        <ActivityStatsCard activityStats={stats?.activityStats} />
        <HealthDistributionCard distribution={stats?.healthDistribution || []} />
      </div>

      {/* People */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <PeopleListCard title="Project Managers" people={stats?.projectManagers || []} isSuperAdmin={isSuperAdmin} />
        <PeopleListCard title="Solution Architects" people={stats?.solutionArchitects || []} isSuperAdmin={isSuperAdmin} />
        <PeopleListCard title="Owners" people={stats?.owners || []} isSuperAdmin={isSuperAdmin} />
      </div>

      {/* Recent Budgets */}
      <div className="mt-6">
        <RecentBudgets budgets={budgets} />
      </div>
    </div>
  );
}
