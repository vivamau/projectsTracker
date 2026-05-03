import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from 'lucide-react';
import { getAllPurchaseOrders } from '../../api/projectsApi';
import Card from '../../commoncomponents/Card';
import LoadingSpinner from '../../commoncomponents/LoadingSpinner';
import SearchInput from '../../commoncomponents/SearchInput';

const PAGE_SIZE = 20;

function formatDate(ts) {
  if (!ts) return '-';
  return new Date(ts).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatValue(value, currency) {
  if (value === null || value === undefined || value === 0) return '-';
  const formatted = Number(value).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  return currency ? `${formatted} ${currency}` : formatted;
}

function SortIcon({ col, sortBy, sortDir }) {
  if (sortBy !== col) return <ChevronUp size={13} className="opacity-0 group-hover:opacity-40 transition-opacity" />;
  return sortDir === 'asc'
    ? <ChevronUp size={13} className="text-primary-500" />
    : <ChevronDown size={13} className="text-primary-500" />;
}

const COLUMNS = [
  { key: 'description', label: 'Description', align: 'left' },
  { key: 'project',     label: 'Project',      align: 'left' },
  { key: 'vendor',      label: 'Vendor',        align: 'left' },
  { key: 'items',       label: 'Items',         align: 'right' },
  { key: 'total_value', label: 'Total Value',   align: 'right' },
  { key: 'start_date',  label: 'Start Date',    align: 'left' },
  { key: 'created',     label: 'Created',       align: 'left' },
];

export default function PurchaseOrdersPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [pendingSearch, setPendingSearch] = useState('');
  const [sortBy, setSortBy] = useState('start_date');
  const [sortDir, setSortDir] = useState('desc');
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async (p, s, sb, sd) => {
    setLoading(true);
    try {
      const res = await getAllPurchaseOrders({ page: p, limit: PAGE_SIZE, search: s, sortBy: sb, sortDir: sd });
      const result = res.data.data;
      setRows(result.data || []);
      setTotal(result.total || 0);
      setTotalPages(result.totalPages || 1);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(page, search, sortBy, sortDir);
  }, [page, search, sortBy, sortDir, fetchData]);

  const handleSearch = (value) => {
    setPendingSearch(value);
    setPage(1);
    setSearch(value);
  };

  const handleSort = (col) => {
    if (col === sortBy) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(col);
      setSortDir('asc');
    }
    setPage(1);
  };

  const thClass = (align) =>
    `px-6 py-3 font-medium text-text-secondary select-none cursor-pointer hover:text-text-primary transition-colors group ${align === 'right' ? 'text-right' : 'text-left'}`;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
          <ShoppingCart size={24} className="text-primary-500" />
          Purchase Orders
        </h1>
        <p className="text-sm text-text-secondary">
          {total > 0 ? `${total} purchase order${total !== 1 ? 's' : ''}` : 'All purchase orders'}
        </p>
      </div>

      <Card noPadding>
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="w-72">
            <SearchInput
              value={pendingSearch}
              onChange={handleSearch}
              placeholder="Search by description or vendor…"
            />
          </div>
          {totalPages > 1 && (
            <div className="flex items-center gap-1 text-xs text-text-secondary">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded p-1 hover:bg-surface disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="px-1">{page} / {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded p-1 hover:bg-surface disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <LoadingSpinner className="py-16" />
        ) : rows.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-text-secondary">No purchase orders found</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface/50">
                {COLUMNS.map(col => (
                  <th
                    key={col.key}
                    className={thClass(col.align)}
                    onClick={() => handleSort(col.key)}
                  >
                    <span className={`inline-flex items-center gap-1 ${col.align === 'right' ? 'justify-end w-full' : ''}`}>
                      {col.label}
                      <SortIcon col={col.key} sortBy={sortBy} sortDir={sortDir} />
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(po => (
                <tr key={po.id} className="border-b border-border last:border-0">
                  <td className="px-6 py-3 max-w-xs">
                    <p className="font-medium text-text-primary line-clamp-2 leading-snug">
                      {po.purchaseorder_description || <span className="text-text-secondary italic">No description</span>}
                    </p>
                    <p className="text-xs text-text-secondary mt-0.5">PO #{po.id}</p>
                  </td>
                  <td className="px-6 py-3">
                    {po.project_id ? (
                      <span
                        className="text-primary-600 hover:underline cursor-pointer"
                        onClick={() => navigate(`/projects/${po.project_id}`)}
                      >
                        {po.project_name}
                      </span>
                    ) : (
                      <span className="text-text-secondary">—</span>
                    )}
                  </td>
                  <td className="px-6 py-3">
                    {po.vendor_id ? (
                      <span
                        className="text-primary-600 hover:underline cursor-pointer"
                        onClick={() => navigate(`/vendors/${po.vendor_id}`)}
                      >
                        {po.vendor_name}
                      </span>
                    ) : (
                      <span className="text-text-secondary">—</span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-right tabular-nums">
                    <span className="rounded-full bg-surface border border-border px-2 py-0.5 text-xs font-medium text-text-secondary">
                      {po.item_count}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right font-medium text-text-primary tabular-nums">
                    {formatValue(po.total_value, po.currency_name)}
                  </td>
                  <td className="px-6 py-3 text-text-secondary whitespace-nowrap">
                    {formatDate(po.purchaseorder_start_date)}
                    {po.purchaseorder_end_date ? ` → ${formatDate(po.purchaseorder_end_date)}` : ''}
                  </td>
                  <td className="px-6 py-3 text-text-secondary whitespace-nowrap">
                    {formatDate(po.purchaseorder_create_date)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-6 py-3">
            <span className="text-xs text-text-secondary">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
            </span>
            <div className="flex items-center gap-1 text-xs text-text-secondary">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded p-1 hover:bg-surface disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="px-1">{page} / {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded p-1 hover:bg-surface disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
