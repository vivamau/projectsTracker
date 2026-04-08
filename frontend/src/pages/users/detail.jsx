import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, BarChart3 } from 'lucide-react';
import { getUserById, getUserProjects, getAuditLogs } from '../../api/entitiesApi';
import { useAuth } from '../../hooks/useAuth';
import Card from '../../commoncomponents/Card';
import LoadingSpinner from '../../commoncomponents/LoadingSpinner';
import Pagination from '../../commoncomponents/Pagination';
import ProjectStatusBadge from '../../commoncomponents/ProjectStatusBadge';
import UserAvatar from '../../commoncomponents/UserAvatar';

const ACTION_ICONS = {
  CREATE: '+',
  UPDATE: '•',
  DELETE: '−',
  LOGIN: '→',
  LOGOUT: '←',
};

function UserDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { role } = useAuth();
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [projectsError, setProjectsError] = useState(false);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [logsPagination, setLogsPagination] = useState({});

  useEffect(() => {
    if (role !== 'superadmin') {
      navigate('/users');
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        const userRes = await getUserById(parseInt(id));
        setUser(userRes.data.data);
      } catch (err) {
        console.error('Failed to fetch user:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, role, navigate]);

  useEffect(() => {
    if (!user) return;

    getUserProjects(parseInt(id))
      .then(res => setProjects(res.data.data || []))
      .catch(() => setProjectsError(true));
  }, [user, id]);

  useEffect(() => {
    if (!user) return;

    setLogsLoading(true);
    getAuditLogs({ user: user.user_email, page, limit: 20 })
      .then(res => {
        setLogs(res.data.data.logs || []);
        const d = res.data.data;
        setLogsPagination({ page: d.page, totalPages: Math.ceil(d.total / 20), total: d.total });
      })
      .catch(() => setLogs([]))
      .finally(() => setLogsLoading(false));
  }, [user, page]);

  const getActionBadgeColor = (action) => {
    const colors = {
      CREATE: 'bg-green-100 text-green-800',
      UPDATE: 'bg-blue-100 text-blue-800',
      DELETE: 'bg-red-100 text-red-800',
      LOGIN: 'bg-purple-100 text-purple-800',
      LOGOUT: 'bg-gray-100 text-gray-800',
    };
    return colors[action] || 'bg-gray-100 text-gray-800';
  };

  const getProjectRoleBadgeColor = (role) => {
    const colors = {
      Owner: 'bg-blue-100 text-blue-800',
      'Project Manager': 'bg-green-100 text-green-800',
      'Solution Architect': 'bg-purple-100 text-purple-800',
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '-';
    return new Date(timestamp).toLocaleString();
  };

  if (loading) {
    return <LoadingSpinner className="py-12" />;
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center py-12">
        <span className="text-text-secondary">User not found</span>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div className="flex items-start gap-4">
          <button
            onClick={() => navigate('/users')}
            className="rounded-lg p-2 text-text-secondary hover:bg-surface hover:text-text-primary transition-colors"
            title="Back to users"
          >
            <ArrowLeft size={20} />
          </button>
          <UserAvatar seed={user.user_email} name={user.user_name} size={96} />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">
                {user.user_name} {user.user_lastname}
              </h1>
              <span className="rounded-full bg-primary-600 px-2.5 py-0.5 text-xs font-medium text-white capitalize">
                {user.role}
              </span>
            </div>
            <p className="text-sm text-text-secondary">{user.user_email}</p>
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1">
              <span className="text-xs text-text-secondary">
                <span className="font-medium">Created:</span> {formatDate(user.user_create_date)}
              </span>
              <span className="text-xs text-text-secondary">
                <span className="font-medium">Last login:</span> {formatDate(user.user_lastlogin_date)}
              </span>
              <span className="text-xs text-text-secondary">
                <span className="font-medium">Updated:</span> {formatDate(user.user_update_date)}
              </span>
              <span className="text-xs font-mono text-text-secondary">
                #{user.id}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
          {/* Projects */}
          <Card title="Projects" noPadding>
            {projectsError ? (
              <div className="px-6 py-12 text-center text-text-secondary">
                Failed to load projects
              </div>
            ) : projects.length === 0 ? (
              <div className="px-6 py-12 text-center text-text-secondary">
                No project assignments
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface/50">
                    <th className="px-6 py-3 text-left font-medium text-text-secondary">
                      Project
                    </th>
                    <th className="px-6 py-3 text-left font-medium text-text-secondary">
                      Division
                    </th>
                    <th className="px-6 py-3 text-left font-medium text-text-secondary">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left font-medium text-text-secondary">
                      From / To
                    </th>
                    <th className="px-6 py-3 text-left font-medium text-text-secondary">
                      %
                    </th>
                    <th className="px-6 py-3 text-left font-medium text-text-secondary">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((proj) => (
                    <tr
                      key={`${proj.id}-${proj.user_role}`}
                      className="border-b border-border last:border-0 hover:bg-surface/30 transition-colors"
                    >
                      <td className="px-6 py-3">
                        <a
                          href={`/projects/${proj.id}`}
                          className="font-medium text-primary-600 hover:text-primary-700"
                        >
                          {proj.project_name}
                        </a>
                      </td>
                      <td className="px-6 py-3 text-text-secondary">
                        {proj.division_name || '-'}
                      </td>
                      <td className="px-6 py-3">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${getProjectRoleBadgeColor(
                            proj.user_role
                          )}`}
                        >
                          {proj.user_role}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-text-secondary text-sm">
                        {proj.role_since_date
                          ? new Date(proj.role_since_date).toLocaleDateString()
                          : '-'}
                        {proj.role_end_date && (
                          <span> → {new Date(proj.role_end_date).toLocaleDateString()}</span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-text-secondary text-sm">
                        {proj.role_percentage != null ? `${proj.role_percentage}%` : '-'}
                      </td>
                      <td className="px-6 py-3">
                        <ProjectStatusBadge status={proj.project_status_name} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>

          {/* Activity Log */}
          <Card title="Activity Log" noPadding>
            {logsLoading ? (
              <LoadingSpinner className="py-8" />
            ) : logs.length === 0 ? (
              <div className="px-6 py-12 text-center text-text-secondary">
                No activity recorded
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface/50">
                    <th className="px-6 py-3 text-left font-medium text-text-secondary">
                      Timestamp
                    </th>
                    <th className="px-6 py-3 text-left font-medium text-text-secondary">
                      Action
                    </th>
                    <th className="px-6 py-3 text-left font-medium text-text-secondary">
                      Entity
                    </th>
                    <th className="px-6 py-3 text-left font-medium text-text-secondary">
                      IP Address
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr
                      key={log.id}
                      className="border-b border-border last:border-0 hover:bg-surface/30 transition-colors"
                    >
                      <td className="px-6 py-3 text-text-secondary">
                        {formatDate(log.created_at)}
                      </td>
                      <td className="px-6 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${getActionBadgeColor(
                            log.action
                          )}`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-text-secondary">
                        {log.entity_type ? (
                          <div>
                            <div className="font-medium">{log.entity_type}</div>
                            {log.entity_id && (
                              <div className="text-xs text-text-secondary">
                                ID: {log.entity_id}
                              </div>
                            )}
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-6 py-3 text-text-secondary">
                        {log.ip_address || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {!logsLoading && logs.length > 0 && (
              <Pagination
                page={logsPagination.page || 1}
                totalPages={logsPagination.totalPages || 1}
                total={logsPagination.total || 0}
                onPageChange={setPage}
              />
            )}
          </Card>
      </div>
    </div>
  );
}

export default UserDetailPage;
