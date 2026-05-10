import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users } from 'lucide-react';
import { getProjectRoles } from '../../api/projectsApi';
import { getProjectStats } from '../../api/projectsApi';
import LoadingSpinner from '../../commoncomponents/LoadingSpinner';

export default function ProjectRolesPage() {
  const navigate = useNavigate();
  const [roles, setRoles] = useState([]);
  const [countByRole, setCountByRole] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getProjectRoles(), getProjectStats()])
      .then(([rolesRes, statsRes]) => {
        setRoles(rolesRes.data.data || []);
        const counts = {};
        (statsRes.data.data?.roleAssignmentCounts || []).forEach(r => {
          counts[r.role_id] = { assignments: Number(r.count) };
        });
        (statsRes.data.data?.roleAssignments || []).forEach(ra => {
          if (!counts[ra.role_id]) counts[ra.role_id] = { assignments: 0 };
          counts[ra.role_id].uniqueUsers = (counts[ra.role_id].uniqueUsers || new Set());
          counts[ra.role_id].uniqueUsers.add(ra.user_id);
        });
        // Convert Sets to counts
        Object.values(counts).forEach(c => {
          if (c.uniqueUsers instanceof Set) c.users = c.uniqueUsers.size;
          delete c.uniqueUsers;
        });
        setCountByRole(counts);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner className="py-12" />;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold">Project Roles</h1>
        <p className="text-sm text-text-secondary">Browse people by their project role</p>
      </div>

      {roles.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface-card p-12 text-center text-text-secondary">
          No project roles defined yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {roles.map(r => {
            const counts = countByRole[r.id] || {};
            const userCount = counts.users || 0;
            const assignmentCount = counts.assignments || 0;

            return (
              <button
                key={r.id}
                onClick={() => navigate(`/project-roles/${r.id}`)}
                className="group rounded-xl border border-border bg-surface-card p-5 text-left shadow-sm hover:border-primary-400 hover:shadow-md transition-all duration-200"
              >
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-500/10 text-primary-500 group-hover:bg-primary-500/20 transition-colors">
                    <Users size={20} />
                  </div>
                  <span className="rounded-full bg-surface px-2.5 py-0.5 text-xs font-medium text-text-secondary border border-border">
                    {userCount} {userCount === 1 ? 'person' : 'people'}
                  </span>
                </div>

                <h3 className="mb-1 font-semibold text-text-primary group-hover:text-primary-600 transition-colors">
                  {r.role_name}
                </h3>

                {r.role_description ? (
                  <p className="text-xs text-text-secondary line-clamp-2">{r.role_description}</p>
                ) : (
                  <p className="text-xs text-text-secondary italic">No description</p>
                )}

                <div className="mt-3 border-t border-border pt-3 text-xs text-text-secondary">
                  {assignmentCount} {assignmentCount === 1 ? 'assignment' : 'assignments'} across all projects
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
