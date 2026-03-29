import { Link } from 'react-router-dom';
import Card from '../../../commoncomponents/Card';
import StatusBadge from '../../../commoncomponents/StatusBadge';

export default function RecentProjects({ projects = [] }) {
  const formatDate = (ts) => {
    if (!ts) return '-';
    return new Date(ts).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <Card title="Recent Projects" noPadding>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface/50">
              <th className="px-6 py-3 text-left font-medium text-text-secondary">Name</th>
              <th className="px-6 py-3 text-left font-medium text-text-secondary">Division</th>
              <th className="px-6 py-3 text-left font-medium text-text-secondary">Status</th>
              <th className="px-6 py-3 text-left font-medium text-text-secondary">Created</th>
            </tr>
          </thead>
          <tbody>
            {projects.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-text-secondary">
                  No projects yet
                </td>
              </tr>
            ) : (
              projects.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0 hover:bg-surface/30 transition-colors">
                  <td className="px-6 py-3">
                    <Link to={`/projects/${p.id}`} className="font-medium text-primary-600 hover:text-primary-700">
                      {p.project_name}
                    </Link>
                  </td>
                  <td className="px-6 py-3 text-text-secondary">{p.division_name || '-'}</td>
                  <td className="px-6 py-3">
                    <StatusBadge value={p.health_status} />
                  </td>
                  <td className="px-6 py-3 text-text-secondary">{formatDate(p.project_create_date)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
