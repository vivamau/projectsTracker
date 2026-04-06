import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Eye, Pencil, Trash2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { getProjects, deleteProject, getBudgets, getProjectStatuses } from '../../api/projectsApi';
import { getDivisions } from '../../api/entitiesApi';
import { useAuth } from '../../hooks/useAuth';
import SearchInput from '../../commoncomponents/SearchInput';
import StatusBadge from '../../commoncomponents/StatusBadge';
import ProjectStatusBadge from '../../commoncomponents/ProjectStatusBadge';
import ConfirmDialog from '../../commoncomponents/ConfirmDialog';
import LoadingSpinner from '../../commoncomponents/LoadingSpinner';

const QUEUED_STATUSES    = new Set(['queued']);
const DISCOVERY_STATUSES = new Set(['discovery']);
const ENDED_STATUSES     = new Set(['discontinued', 'ended', 'support ended']);

function groupProjects(projects) {
  const queued = [], discovery = [], active = [], ended = [];
  for (const p of projects) {
    const status = (p.project_status_name || '').toLowerCase();
    if (QUEUED_STATUSES.has(status))         queued.push(p);
    else if (DISCOVERY_STATUSES.has(status)) discovery.push(p);
    else if (ENDED_STATUSES.has(status))     ended.push(p);
    else                                     active.push(p);
  }
  return { queued, discovery, active, ended };
}

function projectsByYear(projects) {
  const map = {};
  for (const p of projects) {
    const ts = p.project_start_date || p.project_create_date;
    if (!ts) continue;
    const year = new Date(ts).getFullYear();
    map[year] = (map[year] || 0) + 1;
  }
  let cumulative = 0;
  return Object.entries(map)
    .sort(([a], [b]) => a - b)
    .map(([year, count]) => {
      cumulative += count;
      return { year, count, cumulative };
    });
}

function SectionTable({ projects, budgetsData, isAdmin, onDelete, formatDate, formatCurrency }) {
  if (projects.length === 0) return null;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm table-fixed">
        <thead>
          <tr className="border-b border-border bg-surface/50">
            <th className="px-6 py-3 text-left font-medium text-text-secondary w-44">Name</th>
            <th className="px-6 py-3 text-left font-medium text-text-secondary w-28">Status</th>
            <th className="px-6 py-3 text-left font-medium text-text-secondary w-32">Division</th>
            <th className="px-6 py-3 text-left font-medium text-text-secondary w-28">Health</th>
            <th className="px-6 py-3 text-left font-medium text-text-secondary w-28">Budget</th>
            <th className="px-6 py-3 text-left font-medium text-text-secondary w-28">Start</th>
            <th className="px-6 py-3 text-left font-medium text-text-secondary w-28">End</th>
            <th className="px-6 py-3 text-right font-medium text-text-secondary w-24">Actions</th>
          </tr>
        </thead>
        <tbody>
          {projects.map(p => (
            <tr key={p.id} className="border-b border-border last:border-0 hover:bg-surface/30 transition-colors">
              <td className="px-6 py-3">
                <Link to={`/projects/${p.id}`} className="font-medium text-primary-600 hover:text-primary-700 block truncate" title={p.project_name}>
                  {p.project_name}
                </Link>
              </td>
              <td className="px-6 py-3"><ProjectStatusBadge status={p.project_status_name} /></td>
              <td className="px-6 py-3 truncate">
                {p.division_id ? (
                  <Link to={`/divisions/${p.division_id}`} className="font-medium text-primary-600 hover:text-primary-700" title={p.division_name}>
                    {p.division_name || '-'}
                  </Link>
                ) : (
                  <span className="text-text-secondary">-</span>
                )}
              </td>
              <td className="px-6 py-3"><StatusBadge value={p.health_status} /></td>
              <td className="px-6 py-3 truncate">
                {budgetsData[p.id]?.budgets?.length > 0 ? (
                  <span className="font-medium text-text-primary">
                    {formatCurrency(budgetsData[p.id].total || 0)}
                  </span>
                ) : (
                  <span className="text-text-secondary">-</span>
                )}
              </td>
              <td className="px-6 py-3 text-text-secondary">{formatDate(p.project_start_date)}</td>
              <td className="px-6 py-3 text-text-secondary">{formatDate(p.project_end_date)}</td>
              <td className="px-6 py-3">
                <div className="flex justify-end gap-1">
                  <Link to={`/projects/${p.id}`} className="rounded-lg p-1.5 text-text-secondary hover:bg-surface hover:text-primary-500 transition-colors" title="View">
                    <Eye size={16} />
                  </Link>
                  {isAdmin && (
                    <>
                      <Link to={`/projects/${p.id}/edit`} className="rounded-lg p-1.5 text-text-secondary hover:bg-surface hover:text-primary-500 transition-colors" title="Edit">
                        <Pencil size={16} />
                      </Link>
                      <button onClick={() => onDelete(p)} className="rounded-lg p-1.5 text-text-secondary hover:bg-error-50 hover:text-error-500 transition-colors" title="Delete">
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SectionHeader({ label, count }) {
  return (
    <div className="flex items-center gap-3 border-b border-border px-6 py-3 bg-surface/50">
      <span className="text-sm font-semibold text-text-primary">{label}</span>
      <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-medium text-text-secondary border border-border">
        {count}
      </span>
    </div>
  );
}

const GROUP_COLORS = {
  queued: '#faad14',
  discovery: '#1677ff',
  active: '#52c41a',
  ended: '#8c8c8c',
};

function StatCard({ label, count, color }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3">
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-sm text-text-secondary">{label}</span>
      </div>
      <span className="text-sm font-semibold text-text-primary">{count}</span>
    </div>
  );
}

export default function ProjectsPage() {
  const { isAdmin } = useAuth();
  const [projects, setProjects] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [projectStatuses, setProjectStatuses] = useState([]);
  const [budgetsData, setBudgetsData] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [divisionFilter, setDivisionFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: 1, limit: 1000, search };
      if (divisionFilter) params.division_id = divisionFilter;
      if (statusFilter)   params.status_id   = statusFilter;

      const res = await getProjects(params);
      const list = res.data.data;
      setProjects(list);

      const budgetsByProject = {};
      await Promise.all(list.map(async (project) => {
        try {
          const b = (await getBudgets(project.id)).data.data || [];
          budgetsByProject[project.id] = {
            total: b.reduce((sum, x) => sum + (x.budget_amount || 0), 0),
            budgets: b
          };
        } catch {
          budgetsByProject[project.id] = { total: 0, budgets: [] };
        }
      }));
      setBudgetsData(budgetsByProject);
    } catch (err) {
      console.error('Failed to fetch projects', err);
    } finally {
      setLoading(false);
    }
  }, [search, divisionFilter, statusFilter]);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  useEffect(() => {
    getDivisions().then(res => setDivisions(res.data.data)).catch(() => {});
    getProjectStatuses().then(res => setProjectStatuses(res.data.data)).catch(() => {});
  }, []);

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

  const { queued, discovery, active, ended } = groupProjects(projects);
  const yearData = projectsByYear(projects);
  const tableProps = { budgetsData, isAdmin, onDelete: setDeleteTarget, formatDate, formatCurrency };

  const byStatus = projects.reduce((acc, p) => {
    const name = p.project_status_name || 'Unknown';
    acc[name] = (acc[name] || 0) + 1;
    return acc;
  }, {});
  const statusRows = Object.entries(byStatus).sort(([, a], [, b]) => b - a);

  return (
    <div>
      {/* Header */}
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

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="w-64">
          <SearchInput value={search} onChange={setSearch} placeholder="Search projects..." />
        </div>
        <select
          value={divisionFilter}
          onChange={(e) => setDivisionFilter(e.target.value)}
          className="rounded-lg border border-border-dark bg-surface px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 appearance-none"
        >
          <option value="">All Divisions</option>
          {divisions.map(d => <option key={d.id} value={d.id}>{d.division_name}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-border-dark bg-surface px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 appearance-none"
        >
          <option value="">All Statuses</option>
          {projectStatuses.map(s => <option key={s.id} value={s.id}>{s.project_status_name}</option>)}
        </select>
      </div>

      {loading ? (
        <LoadingSpinner className="py-12" />
      ) : (
        <div className="flex gap-5 items-start">

          {/* Left — grouped project list */}
          <div className="min-w-0 flex-1">
            {projects.length === 0 ? (
              <div className="rounded-lg border border-border bg-surface-card px-6 py-12 text-center text-sm text-text-secondary">
                No projects found
              </div>
            ) : (
              <div className="rounded-lg border border-border bg-surface-card overflow-hidden divide-y divide-border">
                {queued.length > 0 && (
                  <div>
                    <SectionHeader label="Queued" count={queued.length} />
                    <SectionTable projects={queued} {...tableProps} />
                  </div>
                )}
                {discovery.length > 0 && (
                  <div>
                    <SectionHeader label="Discovery" count={discovery.length} />
                    <SectionTable projects={discovery} {...tableProps} />
                  </div>
                )}
                {active.length > 0 && (
                  <div>
                    <SectionHeader label="Active" count={active.length} />
                    <SectionTable projects={active} {...tableProps} />
                  </div>
                )}
                {ended.length > 0 && (
                  <div>
                    <SectionHeader label="Ended" count={ended.length} />
                    <SectionTable projects={ended} {...tableProps} />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right — stats panel */}
          <div className="w-1/4 shrink-0 flex flex-col gap-4">

            {/* Group counts */}
            <div className="rounded-lg border border-border bg-surface-card p-4 flex flex-col gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary mb-1">By Group</p>
              <StatCard label="Queued"    count={queued.length}    color={GROUP_COLORS.queued} />
              <StatCard label="Discovery" count={discovery.length} color={GROUP_COLORS.discovery} />
              <StatCard label="Active"    count={active.length}    color={GROUP_COLORS.active} />
              <StatCard label="Ended"     count={ended.length}     color={GROUP_COLORS.ended} />
            </div>

            {/* Projects by status */}
            <div className="rounded-lg border border-border bg-surface-card p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary mb-3">By Status</p>
              <table className="w-full text-xs">
                <tbody>
                  {statusRows.map(([name, count]) => (
                    <tr key={name} className="border-b border-border last:border-0">
                      <td className="py-1.5"><ProjectStatusBadge status={name} /></td>
                      <td className="py-1.5 text-right font-semibold text-text-primary">{count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Projects by year */}
            <div className="rounded-lg border border-border bg-surface-card p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary mb-4">By Year</p>
              {yearData.length === 0 ? (
                <p className="text-xs text-text-secondary">No data</p>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={160}>
                    <AreaChart data={yearData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3d82f5" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#3d82f5" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                      <XAxis dataKey="year" tick={{ fontSize: 11, angle: -90, textAnchor: 'end', dy: 4 }} axisLine={false} tickLine={false} height={40} />
                      <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip
                        formatter={(v, name) => [v, name === 'count' ? 'Projects' : name]}
                        contentStyle={{ fontSize: 12 }}
                      />
                      <Area type="monotone" dataKey="count" stroke="#3d82f5" strokeWidth={2} fill="url(#colorCount)" dot={{ r: 3, fill: '#3d82f5' }} />
                    </AreaChart>
                  </ResponsiveContainer>

                  <table className="w-full text-xs mt-4">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="py-1.5 text-left font-medium text-text-secondary">Year</th>
                        <th className="py-1.5 text-right font-medium text-text-secondary">Projects</th>
                        <th className="py-1.5 text-right font-medium text-text-secondary">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {yearData.map(({ year, count, cumulative }) => (
                        <tr key={year} className="border-b border-border last:border-0">
                          <td className="py-1.5 text-text-secondary">{year}</td>
                          <td className="py-1.5 text-right font-medium text-text-primary">{count}</td>
                          <td className="py-1.5 text-right text-text-secondary">{cumulative}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </div>

          </div>
        </div>
      )}

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
