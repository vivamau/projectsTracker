import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { getPurchaseOrderItems, createPurchaseOrderItem, updatePurchaseOrderItem, deletePurchaseOrderItem } from '../../api/projectsApi';
import { getVendors, getVendorContracts, getVendorContractRoles, getVendorRoleRates } from '../../api/entitiesApi';
import Modal from '../../commoncomponents/Modal';
import ConfirmDialog from '../../commoncomponents/ConfirmDialog';
import LoadingSpinner from '../../commoncomponents/LoadingSpinner';

export default function PoItemsModal({ open, onClose, budgetId, po, currencies, isAdmin }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [itemModal, setItemModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Dropdown data
  const [vendors, setVendors] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [roles, setRoles] = useState([]);
  const [rates, setRates] = useState([]);
  const [resources, setResources] = useState([]);

  const [itemForm, setItemForm] = useState({
    purchaseorderitem_description: '',
    purchaseorderitem_start_date: '',
    purchaseorderitem_end_date: '',
    purchaseorderitems_days: '',
    purchaseorderitems_discounted_rate: '',
    currency_id: '',
    vendor_id: '',
    vendorcontract_id: '',
    vendorcontractrole_id: '',
    vendorrolerate_id: '',
    vendorresource_id: ''
  });

  const fetchItems = useCallback(() => {
    if (!po?.id) return;
    setLoading(true);
    getPurchaseOrderItems(budgetId, po.id)
      .then(r => setItems(r.data.data))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [budgetId, po?.id]);

  const fetchVendors = useCallback(() => {
    getVendors()
      .then(r => setVendors(r.data.data || []))
      .catch(() => setVendors([]));
  }, []);

  const fetchContracts = useCallback((vendorId) => {
    if (!vendorId) {
      setContracts([]);
      setRoles([]);
      setRates([]);
      setResources([]);
      return;
    }
    getVendorContracts(vendorId)
      .then(r => setContracts(r.data.data || []))
      .catch(() => setContracts([]));
  }, []);

  const fetchRoles = useCallback((vendorId, contractId) => {
    if (!vendorId || !contractId) {
      setRoles([]);
      setRates([]);
      return;
    }
    getVendorContractRoles(vendorId, contractId)
      .then(r => setRoles(r.data.data || []))
      .catch(() => setRoles([]));
  }, []);

  const fetchRates = useCallback((vendorId, contractId, roleId) => {
    if (!vendorId || !contractId || !roleId) {
      setRates([]);
      return;
    }
    getVendorRoleRates(vendorId, contractId, roleId)
      .then(r => setRates(r.data.data || []))
      .catch(() => setRates([]));
  }, []);

  useEffect(() => {
    if (open && po?.id) {
      fetchItems();
      fetchVendors();
    }
  }, [open, po?.id, fetchItems, fetchVendors]);

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
      currency_id: '',
      vendor_id: '',
      vendorcontract_id: '',
      vendorcontractrole_id: '',
      vendorrolerate_id: '',
      vendorresource_id: ''
    });
    setContracts([]);
    setRoles([]);
    setRates([]);
    setResources([]);
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
      currency_id: item.currency_id || '',
      vendor_id: '',
      vendorcontract_id: '',
      vendorcontractrole_id: item.vendorcontractrole_id || '',
      vendorrolerate_id: item.vendorrolerate_id || '',
      vendorresource_id: item.vendorresource_id || ''
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
      currency_id: itemForm.currency_id ? parseInt(itemForm.currency_id) : null,
      vendorcontractrole_id: itemForm.vendorcontractrole_id ? parseInt(itemForm.vendorcontractrole_id) : null,
      vendorrolerate_id: itemForm.vendorrolerate_id ? parseInt(itemForm.vendorrolerate_id) : null,
      vendorresource_id: itemForm.vendorresource_id ? parseInt(itemForm.vendorresource_id) : null
    };

    if (editItem) {
      await updatePurchaseOrderItem(budgetId, po.id, editItem.id, data);
    } else {
      await createPurchaseOrderItem(budgetId, po.id, data);
    }

    fetchItems();
    setItemModal(false);
  };

  const handleVendorChange = (vendorId) => {
    setItemForm(f => ({
      ...f,
      vendor_id: vendorId,
      vendorcontract_id: '',
      vendorcontractrole_id: '',
      vendorrolerate_id: '',
      vendorresource_id: ''
    }));
    setContracts([]);
    setRoles([]);
    setRates([]);
    setResources([]);
    if (vendorId) {
      fetchContracts(vendorId);
    }
  };

  const handleContractChange = (contractId) => {
    setItemForm(f => ({
      ...f,
      vendorcontract_id: contractId,
      vendorcontractrole_id: '',
      vendorrolerate_id: '',
      vendorresource_id: ''
    }));
    setRoles([]);
    setRates([]);
    if (itemForm.vendor_id && contractId) {
      fetchRoles(itemForm.vendor_id, contractId);
    }
  };

  const handleRoleChange = (roleId) => {
    setItemForm(f => ({
      ...f,
      vendorcontractrole_id: roleId,
      vendorrolerate_id: '',
      purchaseorderitems_discounted_rate: ''
    }));
    setRates([]);
    if (itemForm.vendor_id && itemForm.vendorcontract_id && roleId) {
      fetchRates(itemForm.vendor_id, itemForm.vendorcontract_id, roleId);
    }
  };

  const handleRateChange = (rateId) => {
    const selectedRate = rates.find(r => r.id === parseInt(rateId));
    setItemForm(f => ({
      ...f,
      vendorrolerate_id: rateId,
      purchaseorderitems_discounted_rate: selectedRate ? selectedRate.vendorrolerate_rate : '',
      currency_id: selectedRate ? selectedRate.currency_id : itemForm.currency_id
    }));
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
                    <th className="px-4 py-3 text-left font-medium text-text-secondary">Vendor Role</th>
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
                      <td className="px-4 py-3 text-text-secondary">{item.vendorcontractrole_name || '-'}</td>
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
                className="w-full rounded-lg border border-border-dark bg-surface px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 appearance-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">End Date</label>
              <input
                type="date"
                value={itemForm.purchaseorderitem_end_date}
                onChange={e => setItemForm(f => ({ ...f, purchaseorderitem_end_date: e.target.value }))}
                className="w-full rounded-lg border border-border-dark bg-surface px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 appearance-none"
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
                className="w-full rounded-lg border border-border-dark bg-surface px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 appearance-none"
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
                className="w-full rounded-lg border border-border-dark bg-surface px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 appearance-none"
                placeholder="0"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Currency</label>
            <select
              value={itemForm.currency_id}
              onChange={e => setItemForm(f => ({ ...f, currency_id: e.target.value }))}
              className="w-full rounded-lg border border-border-dark bg-surface px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 appearance-none"
            >
              <option value="">Select a currency...</option>
              {currencies.map(c => (
                <option key={c.id} value={c.id}>{c.currency_name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Vendor</label>
            <select
              value={itemForm.vendor_id}
              onChange={e => handleVendorChange(e.target.value)}
              className="w-full rounded-lg border border-border-dark bg-surface px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 appearance-none"
            >
              <option value="">Select a vendor...</option>
              {vendors.map(v => (
                <option key={v.id} value={v.id}>{v.vendor_name}</option>
              ))}
            </select>
          </div>

          {itemForm.vendor_id && (
            <div>
              <label className="mb-1.5 block text-sm font-medium">Contract</label>
              <select
                value={itemForm.vendorcontract_id}
                onChange={e => handleContractChange(e.target.value)}
                className="w-full rounded-lg border border-border-dark bg-surface px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 appearance-none"
              >
                <option value="">Select a contract...</option>
                {contracts.map(c => (
                  <option key={c.id} value={c.id}>{c.contract_name}</option>
                ))}
              </select>
            </div>
          )}

          {itemForm.vendorcontract_id && (
            <div>
              <label className="mb-1.5 block text-sm font-medium">Role</label>
              <select
                value={itemForm.vendorcontractrole_id}
                onChange={e => handleRoleChange(e.target.value)}
                className="w-full rounded-lg border border-border-dark bg-surface px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 appearance-none"
              >
                <option value="">Select a role...</option>
                {roles.map(r => (
                  <option key={r.id} value={r.id}>{r.vendorcontractrole_name}</option>
                ))}
              </select>
            </div>
          )}

          {itemForm.vendorcontractrole_id && (
            <div>
              <label className="mb-1.5 block text-sm font-medium">Rate</label>
              <select
                value={itemForm.vendorrolerate_id}
                onChange={e => handleRateChange(e.target.value)}
                className="w-full rounded-lg border border-border-dark bg-surface px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 appearance-none"
              >
                <option value="">Select a rate...</option>
                {rates.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.currency_symbol || ''}{r.vendorrolerate_rate?.toFixed(2)} ({r.currency_name}) - {r.seniority_description || 'No seniority'}
                  </option>
                ))}
              </select>
            </div>
          )}

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
