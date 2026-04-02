import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, BarChart3 } from 'lucide-react';
import { getConsumptions, createConsumption, updateConsumption, deleteConsumption } from '../../api/projectsApi';
import Modal from '../../commoncomponents/Modal';
import ConfirmDialog from '../../commoncomponents/ConfirmDialog';
import LoadingSpinner from '../../commoncomponents/LoadingSpinner';

function UtilizationBar({ pct, allocated, used }) {
  if (pct === null || pct === undefined) {
    return <span className="text-text-secondary text-xs">No allocated days</span>;
  }

  const clampedPct = Math.min(pct, 100);
  let barColor = 'bg-success-500';
  if (pct > 100) barColor = 'bg-error-500';
  else if (pct >= 80) barColor = 'bg-warning-500';

  return (
    <div className="w-full">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-text-secondary">{used} / {allocated} days</span>
        <span className={`font-semibold ${pct > 100 ? 'text-error-500' : pct >= 80 ? 'text-warning-600' : 'text-success-600'}`}>
          {pct}%
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-surface overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${barColor}`}
          style={{ width: `${clampedPct}%` }}
        />
      </div>
    </div>
  );
}

export default function ConsumptionModal({ open, onClose, budgetId, poId, item, isAdmin }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [entryModal, setEntryModal] = useState(false);
  const [editEntry, setEditEntry] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [form, setForm] = useState({
    consumption_month: '',
    consumption_days: '',
    consumption_comment: ''
  });

  useEffect(() => {
    if (!open || !budgetId || !poId || !item?.id) return;
    let cancelled = false;
    setLoading(true);
    getConsumptions(budgetId, poId, item.id)
      .then(r => { if (!cancelled) setSummary(r.data.data); })
      .catch(() => { if (!cancelled) setSummary(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, budgetId, poId, item?.id]);

  const fetchConsumptions = () => {
    if (!budgetId || !poId || !item?.id) return;
    setLoading(true);
    getConsumptions(budgetId, poId, item.id)
      .then(r => setSummary(r.data.data))
      .catch(() => setSummary(null))
      .finally(() => setLoading(false));
  };

  const formatMonth = (ts) => {
    if (!ts) return '-';
    return new Date(ts).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
  };

  const monthToInput = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  const inputToMonthTs = (val) => {
    if (!val) return null;
    const [year, month] = val.split('-').map(Number);
    return new Date(year, month - 1, 1).getTime();
  };

  const allocatedDays = summary?.allocated_days;
  const totalDaysUsed = summary?.total_days_used || 0;
  const utilizationPct = summary?.utilization_pct;

  const openCreate = () => {
    setEditEntry(null);
    setForm({ consumption_month: '', consumption_days: '', consumption_comment: '' });
    setEntryModal(true);
  };

  const openEdit = (entry) => {
    setEditEntry(entry);
    setForm({
      consumption_month: monthToInput(entry.consumption_month),
      consumption_days: String(entry.consumption_days),
      consumption_comment: entry.consumption_comment || ''
    });
    setEntryModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.consumption_month || !form.consumption_days) return;

    const data = {
      consumption_month: inputToMonthTs(form.consumption_month),
      consumption_days: parseFloat(form.consumption_days),
      consumption_comment: form.consumption_comment.trim() || null
    };

    if (editEntry) {
      await updateConsumption(budgetId, poId, item.id, editEntry.id, {
        consumption_days: data.consumption_days,
        consumption_comment: data.consumption_comment
      });
    } else {
      await createConsumption(budgetId, poId, item.id, data);
    }

    fetchConsumptions();
    setEntryModal(false);
  };

  const handleDelete = async () => {
    await deleteConsumption(budgetId, poId, item.id, deleteTarget.id);
    setDeleteTarget(null);
    fetchConsumptions();
  };

  if (!open) return null;

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={`Consumption: ${item?.purchaseorderitem_description || 'Item'}`}
        maxWidth="max-w-2xl"
      >
        <div>
          {summary && (
            <div className="mb-4 p-4 rounded-lg border border-border bg-surface/50">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 size={16} className="text-primary-500" />
                <span className="text-sm font-medium text-text-primary">Utilization</span>
              </div>
              <UtilizationBar
                pct={utilizationPct}
                allocated={allocatedDays}
                used={totalDaysUsed}
              />
            </div>
          )}

          {isAdmin && (
            <div className="mb-4">
              <button
                onClick={openCreate}
                className="inline-flex items-center gap-2 rounded-lg bg-primary-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-600 transition-colors"
              >
                <Plus size={14} /> Log Consumption
              </button>
            </div>
          )}

          {loading ? (
            <LoadingSpinner className="py-8" />
          ) : !summary?.entries?.length ? (
            <p className="text-center py-8 text-text-secondary text-sm">No consumption entries yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface/50">
                    <th className="px-4 py-3 text-left font-medium text-text-secondary">Month</th>
                    <th className="px-4 py-3 text-right font-medium text-text-secondary">Days Used</th>
                    <th className="px-4 py-3 text-left font-medium text-text-secondary">Comment</th>
                    <th className="px-4 py-3 text-left font-medium text-text-secondary">Logged By</th>
                    {isAdmin && <th className="px-4 py-3 text-right font-medium text-text-secondary">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {summary.entries.map(entry => (
                    <tr key={entry.id} className="border-b border-border last:border-0 hover:bg-surface/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-text-primary">{formatMonth(entry.consumption_month)}</td>
                      <td className="px-4 py-3 text-right text-text-secondary">{entry.consumption_days}</td>
                      <td className="px-4 py-3 text-text-secondary">{entry.consumption_comment || '-'}</td>
                      <td className="px-4 py-3 text-text-secondary">
                        {entry.user_name ? `${entry.user_name} ${entry.user_lastname || ''}`.trim() : '-'}
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => openEdit(entry)}
                              className="rounded-lg p-1.5 text-text-secondary hover:bg-surface hover:text-primary-500 transition-colors"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(entry)}
                              className="rounded-lg p-1.5 text-text-secondary hover:bg-error-50 hover:text-error-500 transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Modal>

      <Modal
        open={entryModal}
        onClose={() => setEntryModal(false)}
        title={editEntry ? 'Edit Consumption Entry' : 'Log Monthly Consumption'}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Month <span className="text-error-500">*</span>
            </label>
            <input
              type="month"
              value={form.consumption_month}
              onChange={e => setForm(f => ({ ...f, consumption_month: e.target.value }))}
              required
              disabled={!!editEntry}
              className="w-full rounded-lg border border-border-dark bg-surface px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 appearance-none disabled:opacity-50 disabled:cursor-not-allowed"
            />
            {editEntry && (
              <p className="mt-1 text-xs text-text-secondary">Month cannot be changed. Delete and re-create if needed.</p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Days Used <span className="text-error-500">*</span>
            </label>
            <input
              type="number"
              step="0.5"
              min="0"
              value={form.consumption_days}
              onChange={e => setForm(f => ({ ...f, consumption_days: e.target.value }))}
              required
              className="w-full rounded-lg border border-border-dark bg-surface px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 appearance-none"
              placeholder="e.g. 12.5"
            />
            {allocatedDays && form.consumption_days && (
              <p className="mt-1 text-xs text-text-secondary">
                This item has {allocatedDays} allocated days. Current total: {totalDaysUsed} days ({utilizationPct}% utilized).
              </p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Comment</label>
            <textarea
              value={form.consumption_comment}
              onChange={e => setForm(f => ({ ...f, consumption_comment: e.target.value }))}
              rows={2}
              className="w-full rounded-lg border border-border-dark px-3 py-2 text-sm outline-none focus:border-primary-500 resize-none"
              placeholder="Optional comment..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setEntryModal(false)}
              className="rounded-lg border border-border-dark px-4 py-2 text-sm font-medium hover:bg-surface transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 transition-colors"
            >
              {editEntry ? 'Update' : 'Log'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Consumption Entry"
        message={`Delete consumption entry for ${deleteTarget ? formatMonth(deleteTarget.consumption_month) : 'this month'}?`}
      />
    </>
  );
}
