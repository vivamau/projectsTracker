import { useState, useEffect } from "react";
import {
  Filter,
  Trash2,
  FileText,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  PieChart as PieChartIcon,
  Eye,
  EyeOff,
  Plus,
  Pencil,
  Trash,
  LogIn,
  LogOut,
  Eye as EyeIcon,
  Target,
  Package,
  Search,
  HelpCircle,
  BarChart3,
} from "lucide-react";
import Card from "../../commoncomponents/Card";
import RechartsDonutChart from "../../commoncomponents/RechartsDonutChart";
import {
  getAuditLogs,
  getAuditLogFilters,
  getAuditLogStats,
  cleanupAuditLogs,
} from "../../api/entitiesApi";

const ACTION_COLORS = [
  "#22c55e",
  "#3b82f6",
  "#ef4444",
  "#a855f7",
  "#6b7280",
  "#f59e0b",
  "#06b6d4",
  "#ec4899",
];
const ENTITY_COLORS = [
  "#f97316",
  "#14b8a6",
  "#8b5cf6",
  "#f43f5e",
  "#0ea5e9",
  "#84cc16",
  "#d946ef",
  "#fbbf24",
];

const ACTION_ICONS = {
  CREATE: Plus,
  UPDATE: Pencil,
  DELETE: Trash,
  LOGIN: LogIn,
  LOGOUT: LogOut,
  READ: EyeIcon,
};

const FUN_MESSAGES = [
  "Another day, another audit trail",
  "Someone's been busy! Look at all these logs",
  "The logs tell a story... of who did what",
  "Big Brother is watching... I mean, auditing",
  "These logs have seen things...",
  "Plot twist: the logs are watching YOU",
  "Fun fact: logs never lie (usually)",
  "Behind every great admin is a mountain of logs",
  "If these logs could talk... oh wait, they can!",
  "Logs: because 'trust me bro' isn't enough",
];

const SORT_COLUMNS = [
  { key: "created_at", label: "Timestamp" },
  { key: "user_email", label: "User" },
  { key: "action", label: "Action" },
  { key: "entity_type", label: "Entity" },
  { key: "ip_address", label: "IP Address" },
];

function getFunMessage(total) {
  if (total === 0) return "Crickets... no logs yet!";
  if (total < 10) return "Just getting started! The logs are coming";
  if (total < 50) return "Nice collection of logs!";
  if (total < 200) return "That's a lot of activity! Someone's working hard";
  if (total < 500) return "Wow, this place is buzzing!";
  return "LOG OVERLOAD! You need a vacation";
}

export default function LogsPage() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState([]);
  const [filterOptions, setFilterOptions] = useState({
    actions: [],
    entityTypes: [],
    userEmails: [],
  });
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [cleanupModalOpen, setCleanupModalOpen] = useState(false);
  const [detailsModal, setDetailsModal] = useState({
    open: false,
    content: null,
    raw: "",
  });
  const [sortConfig, setSortConfig] = useState({
    sortBy: "created_at",
    sortOrder: "DESC",
  });
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [showStats, setShowStats] = useState(false);
  const [funMessageIndex] = useState(
    Math.floor(Math.random() * FUN_MESSAGES.length),
  );

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: 50,
        sort_by: sortConfig.sortBy,
        sort_order: sortConfig.sortOrder,
      };
      if (filters.user) params.user = filters.user;
      if (filters.action) params.action = filters.action;
      if (filters.entity_type) params.entity_type = filters.entity_type;
      if (filters.date_from) params.date_from = filters.date_from;
      if (filters.date_to) params.date_to = filters.date_to;
      if (searchTerm) params.search = searchTerm;

      const response = await getAuditLogs(params);
      setLogs(response.data.data.logs);
      setTotal(response.data.data.total);
    } catch (error) {
      console.error("Failed to fetch logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFilters = async () => {
    try {
      const response = await getAuditLogFilters();
      setFilterOptions(response.data.data);
    } catch (error) {
      console.error("Failed to fetch filters:", error);
    }
  };

  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      const response = await getAuditLogStats();
      setStats(response.data.data);
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    fetchFilters();
    fetchStats();
  }, [page, filters, searchTerm, sortConfig]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleSearch = () => {
    setPage(1);
    fetchLogs();
  };

  const handleSort = (column) => {
    setSortConfig((prev) => {
      if (prev.sortBy === column) {
        return {
          sortBy: column,
          sortOrder: prev.sortOrder === "ASC" ? "DESC" : "ASC",
        };
      }
      return { sortBy: column, sortOrder: "ASC" };
    });
    setPage(1);
  };

  const SortIcon = ({ column }) => {
    if (sortConfig.sortBy !== column)
      return <ArrowUpDown size={14} className="opacity-40" />;
    return sortConfig.sortOrder === "ASC" ? (
      <ArrowUp size={14} />
    ) : (
      <ArrowDown size={14} />
    );
  };

  const handleCleanup = async () => {
    try {
      const retentionDays =
        document.getElementById("retentionDays")?.value || 90;
      const response = await cleanupAuditLogs({ retentionDays });
      alert(`Deleted ${response.data.data.deleted} old logs`);
      setCleanupModalOpen(false);
      fetchLogs();
    } catch (error) {
      console.error("Failed to cleanup logs:", error);
      alert("Failed to cleanup logs");
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "-";
    return new Date(timestamp).toLocaleString();
  };

  const getActionColor = (action) => {
    const colors = {
      CREATE: "text-green-600",
      UPDATE: "text-blue-600",
      DELETE: "text-red-600",
      LOGIN: "text-purple-600",
      LOGOUT: "text-gray-600",
    };
    return colors[action] || "text-gray-600";
  };

  const getActionBadgeColor = (action) => {
    const colors = {
      CREATE: "bg-green-100 text-green-800",
      UPDATE: "bg-blue-100 text-blue-800",
      DELETE: "bg-red-100 text-red-800",
      LOGIN: "bg-purple-100 text-purple-800",
      LOGOUT: "bg-gray-100 text-gray-800",
    };
    return colors[action] || "bg-gray-100 text-gray-800";
  };

  const totalPages = Math.ceil(total / 50);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <PieChartIcon size={24} className="text-primary-500" />
            Audit Logs
          </h1>
          <p className="text-sm text-text-secondary">{getFunMessage(total)}</p>
          <p className="text-xs text-text-secondary mt-1 italic">
            {FUN_MESSAGES[funMessageIndex]}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowStats(!showStats)}
            className="flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-surface-hover transition-colors"
          >
            {showStats ? <EyeOff size={16} /> : <Eye size={16} />}
            {showStats ? "Hide" : "Show"} Stats
          </button>
          <button
            onClick={() => setCleanupModalOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-error-500 px-4 py-2 text-sm font-medium text-white hover:bg-error-600 transition-colors"
          >
            <Trash2 size={16} />
            Cleanup Old Logs
          </button>
        </div>
      </div>

      {showStats && (
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-sm font-semibold text-text-secondary mb-2 flex items-center gap-2">
              <Target size={16} /> Actions Breakdown
            </h2>
            <Card className="p-6">
              {statsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <span className="text-text-secondary text-sm">
                    Loading stats...
                  </span>
                </div>
              ) : stats && stats.byAction.length > 0 ? (
                <div className="flex flex-col items-center">
                  <RechartsDonutChart
                    data={stats.byAction.map((item) => ({
                      ...item,
                      name: item.action,
                    }))}
                    colors={ACTION_COLORS}
                    dataKey="count"
                    nameKey="action"
                  />
                  <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 w-full">
                    {stats.byAction.map((item, i) => {
                      const Icon = ACTION_ICONS[item.action] || BarChart3;
                      return (
                        <div
                          key={item.action}
                          className="flex items-center gap-2 text-sm"
                        >
                          <Icon
                            size={14}
                            className="text-text-secondary flex-shrink-0"
                          />
                          <span
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{
                              backgroundColor:
                                ACTION_COLORS[i % ACTION_COLORS.length],
                            }}
                          />
                          <span className="text-text-secondary truncate">
                            {item.action}
                          </span>
                          <span className="font-medium ml-auto">
                            {item.count}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center py-8">
                  <HelpCircle size={32} className="mb-2 text-text-secondary" />
                  <span className="text-text-secondary text-sm">
                    No action data yet
                  </span>
                </div>
              )}
            </Card>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-text-secondary mb-2 flex items-center gap-2">
              <Package size={16} /> Entity Types
            </h2>
            <Card className="p-6">
              {statsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <span className="text-text-secondary text-sm">
                    Loading stats...
                  </span>
                </div>
              ) : stats && stats.byEntityType.length > 0 ? (
                <div className="flex flex-col items-center">
                  <RechartsDonutChart
                    data={stats.byEntityType.map((item) => ({
                      ...item,
                      name: item.entity_type,
                    }))}
                    colors={ENTITY_COLORS}
                    dataKey="count"
                    nameKey="entity_type"
                  />
                  <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 w-full">
                    {stats.byEntityType.map((item, i) => (
                      <div
                        key={item.entity_type}
                        className="flex items-center gap-2 text-sm"
                      >
                        <span
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{
                            backgroundColor:
                              ENTITY_COLORS[i % ENTITY_COLORS.length],
                          }}
                        />
                        <span className="text-text-secondary truncate">
                          {item.entity_type}
                        </span>
                        <span className="font-medium ml-auto">
                          {item.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center py-8">
                  <HelpCircle size={32} className="mb-2 text-text-secondary" />
                  <span className="text-text-secondary text-sm">
                    No entity data yet
                  </span>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      <Card className="mb-6">
        <div className="flex flex-col gap-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-surface-hover transition-colors"
            >
              <Filter size={16} />
              Filters
            </button>
            <button
              onClick={handleSearch}
              className="rounded-lg bg-primary-500 px-6 py-2 text-sm font-medium text-white hover:bg-primary-600 transition-colors"
            >
              Search
            </button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 pt-4 border-t border-border">
              <div>
                <label className="mb-1 block text-xs font-medium text-text-secondary">
                  User Email
                </label>
                <select
                  value={filters.user || ""}
                  onChange={(e) => handleFilterChange("user", e.target.value)}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">All Users</option>
                  {filterOptions.userEmails.map((email) => (
                    <option key={email} value={email}>
                      {email}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-text-secondary">
                  Action
                </label>
                <select
                  value={filters.action || ""}
                  onChange={(e) => handleFilterChange("action", e.target.value)}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">All Actions</option>
                  {filterOptions.actions.map((action) => (
                    <option key={action} value={action}>
                      {action}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-text-secondary">
                  Entity Type
                </label>
                <select
                  value={filters.entity_type || ""}
                  onChange={(e) =>
                    handleFilterChange("entity_type", e.target.value)
                  }
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">All Entities</option>
                  {filterOptions.entityTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-text-secondary">
                  Date From
                </label>
                <input
                  type="date"
                  value={filters.date_from || ""}
                  onChange={(e) =>
                    handleFilterChange(
                      "date_from",
                      e.target.value ? new Date(e.target.value).getTime() : "",
                    )
                  }
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-text-secondary">
                  Date To
                </label>
                <input
                  type="date"
                  value={filters.date_to || ""}
                  onChange={(e) =>
                    handleFilterChange(
                      "date_to",
                      e.target.value
                        ? new Date(e.target.value).getTime() + 86399999
                        : "",
                    )
                  }
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          )}
        </div>
      </Card>

      <Card>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-text-secondary">Loading logs...</div>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <FileText className="mb-4 text-text-secondary" size={48} />
            <div className="text-text-secondary">No logs found</div>
            <div className="text-sm text-text-secondary mt-2 italic">
              Maybe they&apos;re hiding? Try adjusting your filters
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  {SORT_COLUMNS.map((col) => (
                    <th
                      key={col.key}
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary cursor-pointer select-none hover:text-text-primary transition-colors"
                      onClick={() => handleSort(col.key)}
                    >
                      <div className="flex items-center gap-1">
                        <SortIcon column={col.key} />
                        {col.label}
                      </div>
                    </th>
                  ))}
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-surface-hover">
                    <td className="px-4 py-3 text-sm text-text-primary">
                      {formatDate(log.created_at)}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-primary">
                      {log.user_email || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${getActionBadgeColor(log.action)}`}
                      >
                        {(() => {
                          const Icon = ACTION_ICONS[log.action] || BarChart3;
                          return <Icon size={12} />;
                        })()}
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-primary">
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
                        "-"
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-primary">
                      {log.ip_address || "-"}
                    </td>
                    <td
                      className="px-4 py-3 text-sm text-primary-500 cursor-pointer"
                      onClick={() => {
                        let parsed = null;
                        let raw = log.details || "";
                        try {
                          parsed = JSON.parse(raw);
                          if (typeof parsed === "string")
                            parsed = JSON.parse(parsed);
                        } catch {
                          parsed = null;
                        }
                        if (
                          parsed === null ||
                          typeof parsed !== "object" ||
                          Array.isArray(parsed)
                        )
                          parsed = null;
                        if (
                          parsed &&
                          Object.keys(parsed).length === 1 &&
                          parsed.data !== undefined
                        )
                          parsed = parsed.data;
                        if (
                          parsed &&
                          (typeof parsed !== "object" || Array.isArray(parsed))
                        )
                          parsed = { value: parsed };
                        setDetailsModal({ open: true, content: parsed, raw });
                      }}
                    >
                      Open
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-border px-4 py-3">
                <div className="text-sm text-text-secondary">
                  Showing {(page - 1) * 50 + 1} to {Math.min(page * 50, total)}{" "}
                  of {total} entries
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium hover:bg-surface-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                  <span className="flex items-center px-3 py-1.5 text-sm">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium hover:bg-surface-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      {cleanupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-surface p-6 shadow-lg">
            <h2 className="mb-4 text-lg font-bold">Cleanup Old Logs</h2>
            <p className="mb-4 text-sm text-text-secondary">
              This will permanently delete all logs older than the specified
              number of days.
            </p>
            <div className="mb-6">
              <label className="mb-2 block text-sm font-medium">
                Retention Period (Days)
              </label>
              <input
                id="retentionDays"
                type="number"
                defaultValue={90}
                min="1"
                className="w-full rounded-lg border border-border bg-surface px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setCleanupModalOpen(false)}
                className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-surface-hover transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCleanup}
                className="rounded-lg bg-error-500 px-4 py-2 text-sm font-medium text-white hover:bg-error-600 transition-colors"
              >
                Delete Logs
              </button>
            </div>
          </div>
        </div>
      )}

      {detailsModal.open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setDetailsModal((prev) => ({ ...prev, open: false }))}
        >
          <div
            className="w-full max-w-2xl rounded-lg bg-surface-card p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">Log Details</h2>
              <button
                onClick={() =>
                  setDetailsModal((prev) => ({ ...prev, open: false }))
                }
                className="text-text-secondary hover:text-text-primary text-xl leading-none"
              >
                &times;
              </button>
            </div>
            <div className="rounded-lg border border-border overflow-hidden">
              {!detailsModal.raw ? (
                <div className="p-4 text-sm text-text-secondary italic">
                  No additional information
                </div>
              ) : (
                <pre className="max-h-96 overflow-auto bg-surface p-4 text-xs text-text-primary leading-relaxed whitespace-pre-wrap break-all">
                  {(() => {
                    try {
                      const parsed = JSON.parse(detailsModal.raw);
                      return JSON.stringify(parsed, null, 2);
                    } catch {
                      return detailsModal.raw;
                    }
                  })()}
                </pre>
              )}
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() =>
                  setDetailsModal((prev) => ({ ...prev, open: false }))
                }
                className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-surface-hover transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
