import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { getPurchaseOrderItems, createPurchaseOrderItem, updatePurchaseOrderItem, deletePurchaseOrderItem } from '../../api/projectsApi';
import Modal from '../../commoncomponents/Modal';
import ConfirmDialog from '../../commoncomponents/ConfirmDialog';
import LoadingSpinner from '../../commoncomponents/LoadingSpinner';

export default function PoItemsModal({ open, onClose, budgetId, po, currencies, isAdmin }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [itemModal, setItemModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [itemForm, setItemForm] = useState({
    purchaseorderitem_description: '',
    purchaseorderitem_start_date: '',
    purchaseorderitem_end_date: '',
    purchaseorderitems_days: '',
    purchaseorderitems_discounted_rate: '',
    currency_id: ''
  });

  const fetchItems = useCallback(() => {
    if (!po?.id) return;
    setLoading(true);
    getPurchaseOrderItems(budgetId, po.id)
      .then(r => setItems(r.data.data))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [budgetId, po?.id]);

  useEffect(() => {
    if (open && po?.id) {
      fetchItems();
    }
  }, [open, po?.id, fetchItems]);

  const formatDate = (ts) => {
    if (!ts) return '-';
    return new Date(ts).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const tsToInput = (ts) => {
    if (!ts) return '';
    return new Date(ts).toISOString().split('T')[0];
  };

  const inputToTs = (val) => {
    if (!val) return null;
    return new Date(val).getTime();
  };

  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return '-';
    return Number(amount).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  };

  const openCreate = () => {
    setEditItem(null);
    setItemForm({
      purchaseorderitem_description: '',
      purchaseorderitem_start_date: '',
      purchaseorderitem_end_date: '',
      purchaseorderitems_days: '',
      purchaseorderitems_discounted_rate: '',
      currency_id: ''
    });
    setItemModal(true);
  };

  const openEdit = (item) => {
    setEditItem(item);
    setItemForm({
      purchaseorderitem_description: item.purchaseorderitem_description || '',
      purchaseorderitem_start_date: tsToInput(item.purchaseorderitem_start_date),
      purchaseorderitem_end_date: tsToInput(item.purchaseorderitem_end_date),
      purchaseorderitems_days: item.purchaseorderitems_days || '',
      purchaseorderitems_discounted_rate: item.purchaseorderitems_discounted_rate || '',
      currency_id: item.currency_id || ''
    });
    setItemModal(true);
  };

  const handleSaveItem = async (e) => {
    e.preventDefault();
    if (!itemForm.purchaseorderitem_start_date) return;

    const data = {
      purchaseorderitem_description: itemForm.purchaseorderitem_description.trim(),
      purchaseorderitem_start_date: inputToTs(itemForm.purchaseorderitem_start_date),
      purchaseorderitem_end_date: inputToTs(itemForm.purchaseorderitem_end_date),
      purchaseorderitems_days: itemForm.purchaseorderitems_days ? parseFloat(itemForm.purchaseorderitems_days) : null,
      purchaseorderitems_discounted_rate: itemForm.purchaseorderitems_discounted_rate ? parseFloat(itemForm.purchaseorderitems_discounted_rate) : null,
      currency_id: itemForm.currency_id ? parseInt(itemForm.currency_id) : null
    };

    if (editItem) {
      await updatePurchaseOrderItem(budgetId, po.id, editItem.id, data);
    } else {
      await createPurchaseOrderItem(budgetId, po.id, data);
    }

    fetchItems();
    setItemModal(false);
  };

  const handleDeleteItem = async () => {
    await deletePurchaseOrderItem(budgetId, po.id, deleteTarget.id);
    setDeleteTarget(null);
    fetchItems();
  };

  if (!open) return null;

  return (
    <>
      <Modal open={open} onClose={onClose} title={`Items for PO: ${po?.purchaseorder_description || ''}`} maxWidth="max-w-2xl">
        <div>
          {isAdmin && (
            <div className="mb-4">
              <button
                onClick={openCreate}
                className="inline-flex items-center gap-2 rounded-lg bg-primary-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-600 transition-colors"
              >
                <Plus size={14} /> Add Item
              </button>
            </div>
          )}

          {loading ? (
            <LoadingSpinner className="py-8" />
          ) : items.length === 0 ? (
            <p className="text-center py-8 text-text-secondary text-sm">No items yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface/50">
                    <th className="px-4 py-3 text-left font-medium text-text-secondary">Description</th>
                    <th className="px-4 py-3 text-left font-medium text-text-secondary">Start</th>
                    <th className="px-4 py-3 text-left font-medium text-text-secondary">End</th>
                    <th className="px-4 py-3 text-right font-medium text-text-secondary">Days</th>
                    <th className="px-4 py-3 text-right font-medium text-text-secondary">Rate</th>
                    <th className="px-4 py-3 text-left font-medium text-text-secondary">Currency</th>
                    {isAdmin && <th className="px-4 py-3 text-right font-medium text-text-secondary">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => (
                    <tr key={item.id} className="border-b border-border last:border-0 hover:bg-surface/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-text-primary">{item.purchaseorderitem_description || '-'}</td>
                      <td className="px-4 py-3 text-text-secondary">{formatDate(item.purchaseorderitem_start_date)}</td>
                      <td className="px-4 py-3 text-text-secondary">{formatDate(item.purchaseorderitem_end_date)}</td>
                      <td className="px-4 py-3 text-right text-text-secondary">{item.purchaseorderitems_days || '-'}</td>
                      <td className="px-4 py-3 text-right text-text-secondary">{formatCurrency(item.purchaseorderitems_discounted_rate)}</td>
                      <td className="px-4 py-3 text-text-secondary">{item.currency_name || '-'}</td>
                      {isAdmin && (
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => openEdit(item)}
                              className="rounded-lg p-1.5 text-text-secondary hover:bg-surface hover:text-primary-500 transition-colors"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(item)}
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
        open={itemModal}
        onClose={() => setItemModal(false)}
        title={editItem ? 'Edit Item' : 'New Item'}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSaveItem} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Description</label>
            <textarea
              value={itemForm.purchaseorderitem_description}
              onChange={e => setItemForm(f => ({ ...f, purchaseorderitem_description: e.target.value }))}
              rows={2}
              className="w-full rounded-lg border border-border-dark px-3 py-2 text-sm outline-none focus:border-primary-500 resize-none"
              placeholder="Item description..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Start Date <span className="text-error-500">*</span></label>
              <input
                type="date"
                value={itemForm.purchaseorderitem_start_date}
                onChange={e => setItemForm(f => ({ ...f, purchaseorderitem_start_date: e.target.value }))}
                required
                className="w-full rounded-lg border border-border-dark px-3 py-2 text-sm outline-none focus:border-primary-500"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">End Date</label>
              <input
                type="date"
                value={itemForm.purchaseorderitem_end_date}
                onChange={e => setItemForm(f => ({ ...f, purchaseorderitem_end_date: e.target.value }))}
                className="w-full rounded-lg border border-border-dark px-3 py-2 text-sm outline-none focus:border-primary-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Days</label>
              <input
                type="number"
                step="0.01"
                value={itemForm.purchaseorderitems_days}
                onChange={e => setItemForm(f => ({ ...f, purchaseorderitems_days: e.target.value }))}
                className="w-full rounded-lg border border-border-dark px-3 py-2 text-sm outline-none focus:border-primary-500"
                placeholder="0"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Discounted Rate</label>
              <input
                type="number"
                step="0.01"
                value={itemForm.purchaseorderitems_discounted_rate}
                onChange={e => setItemForm(f => ({ ...f, purchaseorderitems_discounted_rate: e.target.value }))}
                className="w-full rounded-lg border border-border-dark px-3 py-2 text-sm outline-none focus:border-primary-500"
                placeholder="0"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Currency</label>
            <select
              value={itemForm.currency_id}
              onChange={e => setItemForm(f => ({ ...f, currency_id: e.target.value }))}
              className="w-full rounded-lg border border-border-dark px-3 py-2 text-sm outline-none focus:border-primary-500"
            >
              <option value="">Select a currency...</option>
              {currencies.map(c => (
                <option key={c.id} value={c.id}>{c.currency_name}</option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setItemModal(false)}
              className="rounded-lg border border-border-dark px-4 py-2 text-sm font-medium hover:bg-surface transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 transition-colors"
            >
              {editItem ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteItem}
        title="Delete Item"
        message={`Delete item "${deleteTarget?.purchaseorderitem_description || 'this item'}"?`}
      />
    </>
  );
}
