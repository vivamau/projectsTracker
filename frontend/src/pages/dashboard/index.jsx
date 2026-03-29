import { useState, useEffect } from 'react';
import { FolderKanban, Activity, Building2, HeartPulse } from 'lucide-react';
import { getProjectStats } from '../../api/projectsApi';
import KpiCard from './components/KpiCard';
import HealthChart from './components/HealthChart';
import RecentProjects from './components/RecentProjects';
import LoadingSpinner from '../../commoncomponents/LoadingSpinner';

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProjectStats()
      .then(res => setStats(res.data.data))
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
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
    </div>
  );
}
