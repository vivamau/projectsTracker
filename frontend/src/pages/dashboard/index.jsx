import { useState, useEffect } from 'react';
import { FolderKanban, Activity, Building2, HeartPulse } from 'lucide-react';
import { getProjectStats, getRecentBudgets, getPurchaseOrders, getPurchaseOrderItems } from '../../api/projectsApi';
import KpiCard from './components/KpiCard';
import HealthChart from './components/HealthChart';
import RecentProjects from './components/RecentProjects';
import RecentBudgets from './components/RecentBudgets';
import LoadingSpinner from '../../commoncomponents/LoadingSpinner';

export default function DashboardPage() {
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
        <KpiCard
          title="Total Projects"
          value={stats?.totalProjects || 0}
          icon={FolderKanban}
          color="primary"
        />
        <KpiCard
          title="Active Projects"
          value={stats?.activeProjects || 0}
          icon={Activity}
          color="success"
          subtitle="Currently in progress"
        />
        <KpiCard
          title="Divisions"
          value={stats?.totalDivisions || 0}
          icon={Building2}
          color="warning"
        />
        <KpiCard
          title="Healthy Projects"
          value={stats?.healthDistribution?.[3] || 0}
          icon={HeartPulse}
          color="success"
          subtitle="On Track status"
        />
      </div>

      {/* Charts + Recent */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <HealthChart distribution={stats?.healthDistribution || {}} />
        </div>
        <div className="lg:col-span-2">
          <RecentProjects projects={stats?.recentProjects || []} />
        </div>
      </div>

      {/* Recent Budgets */}
      <div className="mt-6">
        <RecentBudgets budgets={budgets} />
      </div>
    </div>
  );
}
