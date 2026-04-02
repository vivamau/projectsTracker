import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Plus, Pencil, Trash2, DollarSign, Calendar, ArrowLeft, List } from 'lucide-react';
import { getBudget, getPurchaseOrders, createPurchaseOrder, updatePurchaseOrder, deletePurchaseOrder, getPurchaseOrderItems } from '../../api/projectsApi';
import { getVendors, getCurrencies } from '../../api/entitiesApi';
import { useAuth } from '../../hooks/useAuth';
import Card from '../../commoncomponents/Card';
import Modal from '../../commoncomponents/Modal';
import ConfirmDialog from '../../commoncomponents/ConfirmDialog';
import LoadingSpinner from '../../commoncomponents/LoadingSpinner';
import PoItemsModal from './PoItemsModal';

export default function BudgetDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [budget, setBudget] = useState(null);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [poModal, setPoModal] = useState(false);
  const [editPo, setEditPo] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [selectedPo, setSelectedPo] = useState(null);
  const [itemsModalOpen, setItemsModalOpen] = useState(false);
  const [poTotals, setPoTotals] = useState({});
  const [poForm, setPoForm] = useState({
    purchaseorder_description: '',
    purchaseorder_start_date: '',
    purchaseorder_end_date: '',
    vendor_id: ''
  });

  const calculatePoTotals = useCallback(async (pos) => {
    const totals = {};
    for (const po of pos) {
      try {
        const itemsRes = await getPurchaseOrderItems(id, po.id);
        const items = itemsRes.data.data || [];
        let total = 0;
        let spent = 0;
        for (const item of items) {
          const days = item.purchaseorderitems_days || 0;
          const rate = item.purchaseorderitems_discounted_rate || 0;
          const consumed = item.total_days_consumed || 0;
          total += days * rate;
          spent += consumed * rate;
        }
        totals[po.id] = { total, spent, balance: total - spent };
      } catch (err) {
        totals[po.id] = { total: 0, spent: 0, balance: 0 };
      }
    }
    setPoTotals(totals);
  }, [id]);

  const fetchData = useCallback(() => {
    Promise.all([
      getBudget(id).then(r => setBudget(r.data.data)),
      getPurchaseOrders(id).then(r => {
        setPurchaseOrders(r.data.data);
        calculatePoTotals(r.data.data);
      }),
      getVendors().then(r => setVendors(r.data.data)),
      getCurrencies().then(r => setCurrencies(r.data.data))
    ])
      .catch(() => navigate(-1))
      .finally(() => setLoading(false));
  }, [id, navigate, calculatePoTotals]);

  useEffect(() => { fetchData(); }, [fetchData]);

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

  const formatCurrency = (amount, currencyName) => {
    if (amount === null || amount === undefined) return '-';
    const formatted = Number(amount).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    return currencyName ? `${formatted} ${currencyName}` : formatted;
  };

  const openCreate = () => {
    setEditPo(null);
    setPoForm({ purchaseorder_description: '', purchaseorder_start_date: '', purchaseorder_end_date: '', vendor_id: '' });
    setPoModal(true);
  };

  const openEdit = (po) => {
    setEditPo(po);
    setPoForm({
      purchaseorder_description: po.purchaseorder_description || '',
      purchaseorder_start_date: tsToInput(po.purchaseorder_start_date),
      purchaseorder_end_date: tsToInput(po.purchaseorder_end_date),
      vendor_id: po.vendor_id || ''
    });
    setPoModal(true);
  };

  const handleSavePo = async (e) => {
    e.preventDefault();
    const data = {
      purchaseorder_description: poForm.purchaseorder_description.trim(),
      purchaseorder_start_date: inputToTs(poForm.purchaseorder_start_date),
      purchaseorder_end_date: inputToTs(poForm.purchaseorder_end_date),
      vendor_id: poForm.vendor_id ? parseInt(poForm.vendor_id) : null
    };

    if (editPo) {
      await updatePurchaseOrder(id, editPo.id, data);
    } else {
      await createPurchaseOrder(id, data);
    }

    const res = await getPurchaseOrders(id);
    setPurchaseOrders(res.data.data);
    setPoModal(false);
  };

  const handleDeletePo = async () => {
    await deletePurchaseOrder(id, deleteTarget.id);
    setDeleteTarget(null);
    const res = await getPurchaseOrders(id);
    setPurchaseOrders(res.data.data);
  };

  if (loading) return <LoadingSpinner size="lg" className="mt-20" />;
  if (!budget) return null;

  const totalPoAmount = Object.values(poTotals).reduce((sum, t) => sum + (t.total || 0), 0);
  const totalSpent = Object.values(poTotals).reduce((sum, t) => sum + (t.spent || 0), 0);
  const currentBalance = budget.budget_amount - totalPoAmount;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate(-1)}
          className="mb-3 inline-flex items-center gap-1 text-sm text-text-secondary hover:text-primary-500 transition-colors"
        >
          <ArrowLeft size={14} /> Back
        </button>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
              <DollarSign size={22} className="text-success-500" />
              Budget: {formatCurrency(budget.budget_amount, budget.currency_name)}
            </h1>
            <div className="mt-3 space-y-1 text-sm">
              <div className="flex items-center gap-4">
                <span className="text-text-secondary">Purchase Orders: {formatCurrency(totalPoAmount, budget.currency_name)}</span>
                <span className="text-text-secondary">Current Balance: <span className={currentBalance < 0 ? 'text-error-500 font-semibold' : 'text-success-600 font-semibold'}>{formatCurrency(currentBalance, budget.currency_name)}</span></span>
              </div>
              {budget.budget_start_date && (
                <span className="flex items-center gap-1 text-text-secondary">
                  <Calendar size={14} /> {formatDate(budget.budget_start_date)} – {formatDate(budget.budget_end_date)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div>
        {/* Purchase Orders */}
          <Card
            title={`Purchase Orders (${purchaseOrders.length})`}
            noPadding
            extra={
              isAdmin && (
                <button
                  onClick={openCreate}
                  className="inline-flex items-center gap-1 rounded-lg bg-primary-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-600 transition-colors"
                >
                  <Plus size={14} /> Add PO
                </button>
              )
            }
          >
            {purchaseOrders.length === 0 ? (
              <p className="px-6 py-8 text-sm text-text-secondary text-center">No purchase orders yet</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface/50">
                    <th className="px-6 py-3 text-left font-medium text-text-secondary">Description</th>
                    <th className="px-6 py-3 text-left font-medium text-text-secondary">Start Date</th>
                    <th className="px-6 py-3 text-left font-medium text-text-secondary">End Date</th>
                    <th className="px-6 py-3 text-left font-medium text-text-secondary">Vendor</th>
                    <th className="px-6 py-3 text-right font-medium text-text-secondary">Total</th>
                    <th className="px-6 py-3 text-right font-medium text-text-secondary">Spent</th>
                    <th className="px-6 py-3 text-right font-medium text-text-secondary">Balance</th>
                    {isAdmin && <th className="px-6 py-3 text-right font-medium text-text-secondary">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {purchaseOrders.map(po => (
                    <tr key={po.id} className="border-b border-border last:border-0 hover:bg-surface/30 transition-colors">
                      <td className="px-6 py-3">
                        <p className="font-medium text-text-primary">{po.purchaseorder_description || '-'}</p>
                      </td>
                      <td className="px-6 py-3 text-text-secondary">{formatDate(po.purchaseorder_start_date)}</td>
                      <td className="px-6 py-3 text-text-secondary">{formatDate(po.purchaseorder_end_date)}</td>
                      <td className="px-6 py-3">
                        {po.vendor_id ? (
                          <Link to={`/vendors/${po.vendor_id}`} className="font-medium text-primary-600 hover:text-primary-700">
                            {po.vendor_name || '-'}
                          </Link>
                        ) : (
                          <span className="text-text-secondary">-</span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-right font-semibold text-text-primary">{formatCurrency(poTotals[po.id]?.total || 0, budget.currency_name)}</td>
                      <td className="px-6 py-3 text-right text-text-secondary">{formatCurrency(poTotals[po.id]?.spent || 0, budget.currency_name)}</td>
                      <td className="px-6 py-3 text-right font-medium text-text-primary">{formatCurrency(poTotals[po.id]?.balance || 0, budget.currency_name)}</td>
                      {isAdmin && (
                        <td className="px-6 py-3">
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => { setSelectedPo(po); setItemsModalOpen(true); }}
                              className="inline-flex items-center gap-1 rounded-lg border border-border-dark px-2 py-1.5 text-xs text-text-secondary hover:bg-surface hover:text-primary-500 transition-colors"
                              title="Manage items"
                            >
                              <List size={14} /> Items
                            </button>
                            <button onClick={() => openEdit(po)} className="rounded-lg p-1.5 text-text-secondary hover:bg-surface hover:text-primary-500 transition-colors">
                              <Pencil size={16} />
                            </button>
                            <button onClick={() => setDeleteTarget(po)} className="rounded-lg p-1.5 text-text-secondary hover:bg-error-50 hover:text-error-500 transition-colors">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
      </div>

      {/* PO Create/Edit Modal */}
      <Modal open={poModal} onClose={() => setPoModal(false)} title={editPo ? 'Edit Purchase Order' : 'New Purchase Order'}>
        <form onSubmit={handleSavePo} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Description</label>
            <textarea
              value={poForm.purchaseorder_description}
              onChange={e => setPoForm(f => ({ ...f, purchaseorder_description: e.target.value }))}
              rows={3}
              className="w-full rounded-lg border border-border-dark px-3 py-2 text-sm outline-none focus:border-primary-500 resize-none"
              placeholder="Purchase order description..."
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Vendor</label>
            <select
              value={poForm.vendor_id}
              onChange={e => setPoForm(f => ({ ...f, vendor_id: e.target.value }))}
              className="w-full rounded-lg border border-border-dark bg-surface px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 appearance-none"
            >
              <option value="">Select a vendor...</option>
              {vendors.map(v => (
                <option key={v.id} value={v.id}>{v.vendor_name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Start Date <span className="text-error-500">*</span></label>
              <input
                type="date"
                value={poForm.purchaseorder_start_date}
                onChange={e => setPoForm(f => ({ ...f, purchaseorder_start_date: e.target.value }))}
                required
                className="w-full rounded-lg border border-border-dark bg-surface px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 appearance-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">End Date</label>
              <input
                type="date"
                value={poForm.purchaseorder_end_date}
                onChange={e => setPoForm(f => ({ ...f, purchaseorder_end_date: e.target.value }))}
                className="w-full rounded-lg border border-border-dark bg-surface px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 appearance-none"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setPoModal(false)} className="rounded-lg border border-border-dark px-4 py-2 text-sm font-medium hover:bg-surface transition-colors">
              Cancel
            </button>
            <button type="submit" className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 transition-colors">
              {editPo ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete PO confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeletePo}
        title="Delete Purchase Order"
        message={`Delete purchase order "${deleteTarget?.purchaseorder_description || 'this PO'}"?`}
      />

      {/* PO Items Modal */}
      <PoItemsModal
        open={itemsModalOpen}
        onClose={() => {
          setItemsModalOpen(false);
          setSelectedPo(null);
          // Recalculate totals after items are modified
          getPurchaseOrders(id).then(r => {
            setPurchaseOrders(r.data.data);
            calculatePoTotals(r.data.data);
          });
        }}
        budgetId={id}
        po={selectedPo}
        currencies={currencies}
        isAdmin={isAdmin}
      />
    </div>
  );
}
