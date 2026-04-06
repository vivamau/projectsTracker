import { useState, useEffect, useCallback } from 'react';
import { Trash2, RefreshCw } from 'lucide-react';
import { getAuditLogs, getAuditLogFilters, getAuditLogStats, cleanupAuditLogs } from '../../api/entitiesApi';
import { useAuth } from '../../hooks/useAuth';
import Card from '../../commoncomponents/Card';
import Pagination from '../../commoncomponents/Pagination';
import LoadingSpinner from '../../commoncomponents/LoadingSpinner';
import ConfirmDialog from '../../commoncomponents/ConfirmDialog';

const ACTION_COLORS = {
  CREATE: 'bg-green-50 text-green-700',
  UPDATE: 'bg-blue-50 text-blue-700',
  DELETE: 'bg-red-50 text-red-700',
  LOGIN: 'bg-purple-50 text-purple-700',
  LOGOUT: 'bg-gray-50 text-gray-600',
};

function formatDate(ts) {
  if (!ts) return '-';
  return new Date(ts).toLocaleString();
}

export default function LogsPage() {
  const { role } = useAuth();
  const isSuperAdmin = role === 'superadmin';

  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [filters, setFilters] = useState({ actions: [], entityTypes: [], userEmails: [] });
  const [cleanupOpen, setCleanupOpen] = useState(false);

  const [filterUser, setFilterUser] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterEntity, setFilterEntity] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  const LIMIT = 50;

  const fetchLogs = useCallback(() => {
    setLoading(true);
    const params = { page, limit: LIMIT };
    if (filterUser) params.user = filterUser;
    if (filterAction) params.action = filterAction;
    if (filterEntity) params.entity_type = filterEntity;
    if (filterDateFrom) params.date_from = new Date(filterDateFrom).getTime();
    if (filterDateTo) params.date_to = new Date(filterDateTo + 'T23:59:59').getTime();

    getAuditLogs(params)
      .then(r => { setLogs(r.data.data.logs || []); setTotal(r.data.data.total || 0); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, filterUser, filterAction, filterEntity, filterDateFrom, filterDateTo]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);
  useEffect(() => { setPage(1); }, [filterUser, filterAction, filterEntity, filterDateFrom, filterDateTo]);

  useEffect(() => {
    getAuditLogFilters().then(r => setFilters(r.data.data)).catch(() => {});
    getAuditLogStats().then(r => setStats(r.data.data)).catch(() => {});
  }, []);

  const handleCleanup = async () => {
    await cleanupAuditLogs({});
    setCleanupOpen(false);
    fetchLogs();
    getAuditLogStats().then(r => setStats(r.data.data)).catch(() => {});
  };

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  const selectCls = 'rounded-lg border border-border-dark bg-surface px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 appearance-none';
  const inputCls = 'rounded-lg border border-border-dark bg-surface px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500';

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Audit Logs</h1>
          <p className="text-sm text-text-secondary">Track all system activity</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchLogs} className="inline-flex items-center gap-2 rounded-lg border border-border-dark px-3 py-2 text-sm font-medium hover:bg-surface transition-colors">
            <RefreshCw size={15} /> Refresh
          </button>
          {isSuperAdmin && (
            <button onClick={() => setCleanupOpen(true)} className="inline-flex items-center gap-2 rounded-lg bg-error-500 px-3 py-2 text-sm font-semibold text-white hover:bg-error-600 transition-colors">
              <Trash2 size={15} /> Cleanup
            </button>
          )}
        </div>
      </div>

      {stats && (
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card noPadding>
            <div className="p-4">
              <p className="text-xs text-text-secondary uppercase tracking-wide">Total Logs</p>
              <p className="mt-1 text-2xl font-bold">{stats.total?.toLocaleString() ?? '-'}</p>
            </div>
          </Card>
          {(stats.byAction || []).slice(0, 3).map(a => (
            <Card key={a.action} noPadding>
              <div className="p-4">
                <p className="text-xs text-text-secondary uppercase tracking-wide">{a.action}</p>
                <p className="mt-1 text-2xl font-bold">{a.count?.toLocaleString()}</p>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Card noPadding>
        <div className="flex flex-wrap gap-3 border-b border-border px-6 py-4">
          <select value={filterUser} onChange={e => setFilterUser(e.target.value)} className={selectCls}>
            <option value="">All users</option>
            {filters.userEmails.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
          <select value={filterAction} onChange={e => setFilterAction(e.target.value)} className={selectCls}>
            <option value="">All actions</option>
            {filters.actions.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <select value={filterEntity} onChange={e => setFilterEntity(e.target.value)} className={selectCls}>
            <option value="">All entities</option>
            {filters.entityTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} className={inputCls} title="From date" />
          <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} className={inputCls} title="To date" />
          {(filterUser || filterAction || filterEntity || filterDateFrom || filterDateTo) && (
            <button
              onClick={() => { setFilterUser(''); setFilterAction(''); setFilterEntity(''); setFilterDateFrom(''); setFilterDateTo(''); }}
              className="rounded-lg border border-border-dark px-3 py-2 text-sm hover:bg-surface transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        {loading ? <LoadingSpinner className="py-12" /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface/50">
                  <th className="px-6 py-3 text-left font-medium text-text-secondary">Time</th>
                  <th className="px-6 py-3 text-left font-medium text-text-secondary">User</th>
                  <th className="px-6 py-3 text-left font-medium text-text-secondary">Action</th>
                  <th className="px-6 py-3 text-left font-medium text-text-secondary">Entity</th>
                  <th className="px-6 py-3 text-left font-medium text-text-secondary">Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-12 text-center text-text-secondary">No logs found</td></tr>
                ) : logs.map(log => (
                  <tr key={log.id} className="border-b border-border last:border-0 hover:bg-surface/30 transition-colors">
                    <td className="px-6 py-3 text-text-secondary whitespace-nowrap">{formatDate(log.timestamp)}</td>
                    <td className="px-6 py-3">{log.user_email || '-'}</td>
                    <td className="px-6 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ACTION_COLORS[log.action] || 'bg-gray-50 text-gray-600'}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-text-secondary">
                      {log.entity_type}{log.entity_id ? ` #${log.entity_id}` : ''}
                    </td>
                    <td className="px-6 py-3 text-text-secondary max-w-xs truncate" title={log.details}>{log.details || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
      </Card>

      <ConfirmDialog
        open={cleanupOpen}
        onClose={() => setCleanupOpen(false)}
        onConfirm={handleCleanup}
        title="Cleanup Audit Logs"
        message="This will delete old audit logs based on the configured retention period. This action cannot be undone."
      />
    </div>
  );
}
