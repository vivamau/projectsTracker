import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { getProjectRoleUsers } from '../../api/projectsApi';
import Card from '../../commoncomponents/Card';
import LoadingSpinner from '../../commoncomponents/LoadingSpinner';
import UserAvatar from '../../commoncomponents/UserAvatar';
import ProjectStatusBadge from '../../commoncomponents/ProjectStatusBadge';

function formatDate(ts) {
  return ts ? new Date(ts).toLocaleDateString() : null;
}

export default function ProjectRoleDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [role, setRole] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProjectRoleUsers(parseInt(id))
      .then(res => {
        const { role: r, assignments } = res.data.data;
        setRole(r);

        // Group flat assignment rows by user
        const map = new Map();
        assignments.forEach(row => {
          if (!map.has(row.user_id)) {
            map.set(row.user_id, {
              user_id: row.user_id,
              user_name: row.user_name,
              user_lastname: row.user_lastname,
              user_email: row.user_email,
              projects: [],
            });
          }
          map.get(row.user_id).projects.push({
            project_id: row.project_id,
            project_name: row.project_name,
            division_name: row.division_name,
            project_status_name: row.project_status_name,
            assignment_start_date: row.assignment_start_date,
            assignment_end_date: row.assignment_end_date,
            assignment_percentage: row.assignment_percentage,
          });
        });
        setUsers([...map.values()]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingSpinner className="py-12" />;

  if (!role) {
    return (
      <div className="flex items-center justify-center py-12">
        <span className="text-text-secondary">Role not found</span>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-start gap-4">
        <button
          onClick={() => navigate(-1)}
          className="rounded-lg p-2 text-text-secondary hover:bg-surface hover:text-text-primary transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-bold">{role.role_name}</h1>
          {role.role_description && (
            <p className="text-sm text-text-secondary mt-0.5">{role.role_description}</p>
          )}
          <p className="text-xs text-text-secondary mt-1">
            {users.length} {users.length === 1 ? 'person' : 'people'} assigned across{' '}
            {users.reduce((acc, u) => acc + u.projects.length, 0)} project assignments
          </p>
        </div>
      </div>

      {users.length === 0 ? (
        <Card>
          <p className="py-8 text-center text-sm text-text-secondary">
            No users are assigned to this role yet.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {users.map(u => (
            <Card key={u.user_id} noPadding>
              <div className="flex items-center gap-3 border-b border-border px-5 py-4">
                <UserAvatar seed={u.user_email} name={u.user_name} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-text-primary">
                    {u.user_name} {u.user_lastname}
                  </p>
                  <p className="text-xs text-text-secondary">{u.user_email}</p>
                </div>
                <span className="shrink-0 rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-medium text-primary-700">
                  {u.projects.length} {u.projects.length === 1 ? 'project' : 'projects'}
                </span>
              </div>

              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface/50">
                    <th className="px-5 py-2.5 text-left text-xs font-medium text-text-secondary">Project</th>
                    <th className="px-5 py-2.5 text-left text-xs font-medium text-text-secondary">Division</th>
                    <th className="px-5 py-2.5 text-left text-xs font-medium text-text-secondary">Status</th>
                    <th className="px-5 py-2.5 text-left text-xs font-medium text-text-secondary">From / To</th>
                    <th className="px-5 py-2.5 text-left text-xs font-medium text-text-secondary">%</th>
                  </tr>
                </thead>
                <tbody>
                  {u.projects.map(p => (
                    <tr key={p.project_id} className="border-b border-border last:border-0 hover:bg-surface/30 transition-colors">
                      <td className="px-5 py-2.5">
                        <Link
                          to={`/projects/${p.project_id}`}
                          className="font-medium text-primary-600 hover:underline"
                        >
                          {p.project_name}
                        </Link>
                      </td>
                      <td className="px-5 py-2.5 text-text-secondary">{p.division_name || '-'}</td>
                      <td className="px-5 py-2.5">
                        <ProjectStatusBadge status={p.project_status_name} />
                      </td>
                      <td className="px-5 py-2.5 text-text-secondary text-xs">
                        {formatDate(p.assignment_start_date) || '-'}
                        {p.assignment_end_date && ` → ${formatDate(p.assignment_end_date)}`}
                      </td>
                      <td className="px-5 py-2.5 text-text-secondary">
                        {p.assignment_percentage != null ? `${p.assignment_percentage}%` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
