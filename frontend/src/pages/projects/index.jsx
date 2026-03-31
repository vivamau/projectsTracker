import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Eye, Pencil, Trash2 } from 'lucide-react';
import { getProjects, deleteProject, getBudgets } from '../../api/projectsApi';
import { getDivisions } from '../../api/entitiesApi';
import { useAuth } from '../../hooks/useAuth';
import Card from '../../commoncomponents/Card';
import SearchInput from '../../commoncomponents/SearchInput';
import Pagination from '../../commoncomponents/Pagination';
import StatusBadge from '../../commoncomponents/StatusBadge';
import ConfirmDialog from '../../commoncomponents/ConfirmDialog';
import LoadingSpinner from '../../commoncomponents/LoadingSpinner';

export default function ProjectsPage() {
  const { isAdmin } = useAuth();
  const [projects, setProjects] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [budgetsData, setBudgetsData] = useState({});
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [search, setSearch] = useState('');
  const [divisionFilter, setDivisionFilter] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 15, search };
      if (divisionFilter) params.division_id = divisionFilter;
      const res = await getProjects(params);
      setProjects(res.data.data);
      setPagination(res.data.pagination);

      // Fetch budgets for each project
      const budgetsByProject = {};
      for (const project of res.data.data) {
        try {
          const budgetsRes = await getBudgets(project.id);
          const projectBudgets = budgetsRes.data.data || [];
          budgetsByProject[project.id] = {
            total: projectBudgets.reduce((sum, b) => sum + (b.budget_amount || 0), 0),
            budgets: projectBudgets
          };
        } catch {
          budgetsByProject[project.id] = { total: 0, budgets: [] };
        }
      }
      setBudgetsData(budgetsByProject);
    } catch (err) {
      console.error('Failed to fetch projects', err);
    } finally {
      setLoading(false);
    }
  }, [page, search, divisionFilter]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    getDivisions().then(res => setDivisions(res.data.data)).catch(() => {});
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, divisionFilter]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteProject(deleteTarget.id);
      setDeleteTarget(null);
      fetchProjects();
    } catch (err) {
      console.error('Failed to delete', err);
    }
  };

  const formatDate = (ts) => {
    if (!ts) return '-';
    return new Date(ts).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return '-';
    const num = Number(amount);
    if (isNaN(num)) return '-';
    return num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Projects</h1>
          <p className="text-sm text-text-secondary">Manage your projects</p>
        </div>
        {isAdmin && (
          <Link
            to="/projects/new"
            className="inline-flex items-center gap-2 rounded-lg bg-primary-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-600 transition-colors"
          >
            <Plus size={18} />
            New Project
          </Link>
        )}
      </div>

      <Card noPadding>
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-6 py-4">
          <div className="w-64">
            <SearchInput value={search} onChange={setSearch} placeholder="Search projects..." />
          </div>
          <select
            value={divisionFilter}
            onChange={(e) => setDivisionFilter(e.target.value)}
            className="rounded-lg border border-border-dark bg-surface px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 appearance-none"
          >
            <option value="">All Divisions</option>
            {divisions.map(d => (
              <option key={d.id} value={d.id}>{d.division_name}</option>
            ))}
          </select>
        </div>

        {/* Table */}
        {loading ? (
          <LoadingSpinner className="py-12" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface/50">
                  <th className="px-6 py-3 text-left font-medium text-text-secondary">Name</th>
                  <th className="px-6 py-3 text-left font-medium text-text-secondary">Division</th>
                  <th className="px-6 py-3 text-left font-medium text-text-secondary">Health</th>
                  <th className="px-6 py-3 text-left font-medium text-text-secondary">Current Budget</th>
                  <th className="px-6 py-3 text-left font-medium text-text-secondary">Start Date</th>
                  <th className="px-6 py-3 text-left font-medium text-text-secondary">End Date</th>
                  <th className="px-6 py-3 text-right font-medium text-text-secondary">Actions</th>
                </tr>
              </thead>
              <tbody>
                {projects.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-text-secondary">
                      No projects found
                    </td>
                  </tr>
                ) : (
                  projects.map(p => (
                    <tr key={p.id} className="border-b border-border last:border-0 hover:bg-surface/30 transition-colors">
                      <td className="px-6 py-3">
                        <Link to={`/projects/${p.id}`} className="font-medium text-primary-600 hover:text-primary-700">
                          {p.project_name}
                        </Link>
                      </td>
                      <td className="px-6 py-3">
                        {p.division_id ? (
                          <Link to={`/divisions/${p.division_id}`} className="font-medium text-primary-600 hover:text-primary-700">
                            {p.division_name || '-'}
                          </Link>
                        ) : (
                          <span className="text-text-secondary">-</span>
                        )}
                      </td>
                      <td className="px-6 py-3">
                        <StatusBadge value={p.health_status} />
                      </td>
                      <td className="px-6 py-3">
                        {budgetsData[p.id]?.budgets?.length > 0 ? (
                          <Link to={`/budgets/${budgetsData[p.id].budgets[0].id}`} className="font-medium text-primary-600 hover:text-primary-700">
                            {formatCurrency(budgetsData[p.id].total || 0)}
                          </Link>
                        ) : (
                          <span className="text-text-secondary">-</span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-text-secondary">{formatDate(p.project_start_date)}</td>
                      <td className="px-6 py-3 text-text-secondary">{formatDate(p.project_end_date)}</td>
                      <td className="px-6 py-3">
                        <div className="flex justify-end gap-1">
                          <Link
                            to={`/projects/${p.id}`}
                            className="rounded-lg p-1.5 text-text-secondary hover:bg-surface hover:text-primary-500 transition-colors"
                            title="View"
                          >
                            <Eye size={16} />
                          </Link>
                          {isAdmin && (
                            <>
                              <Link
                                to={`/projects/${p.id}/edit`}
                                className="rounded-lg p-1.5 text-text-secondary hover:bg-surface hover:text-primary-500 transition-colors"
                                title="Edit"
                              >
                                <Pencil size={16} />
                              </Link>
                              <button
                                onClick={() => setDeleteTarget(p)}
                                className="rounded-lg p-1.5 text-text-secondary hover:bg-error-50 hover:text-error-500 transition-colors"
                                title="Delete"
                              >
                                <Trash2 size={16} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          page={pagination.page || 1}
          totalPages={pagination.totalPages || 1}
          total={pagination.total || 0}
          onPageChange={setPage}
        />
      </Card>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Project"
        message={`Are you sure you want to delete "${deleteTarget?.project_name}"? This action cannot be undone.`}
      />
    </div>
  );
}
