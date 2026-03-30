import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, DollarSign, Calendar, ArrowLeft } from 'lucide-react';
import { getBudget, getPurchaseOrders, createPurchaseOrder, updatePurchaseOrder, deletePurchaseOrder } from '../../api/projectsApi';
import { useAuth } from '../../hooks/useAuth';
import Card from '../../commoncomponents/Card';
import Modal from '../../commoncomponents/Modal';
import ConfirmDialog from '../../commoncomponents/ConfirmDialog';
import LoadingSpinner from '../../commoncomponents/LoadingSpinner';

export default function BudgetDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [budget, setBudget] = useState(null);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [poModal, setPoModal] = useState(false);
  const [editPo, setEditPo] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [poForm, setPoForm] = useState({
    purchaseorder_description: '',
    purchaseorder_start_date: '',
    purchaseorder_end_date: ''
  });

  const fetchData = () => {
    Promise.all([
      getBudget(id).then(r => setBudget(r.data.data)),
      getPurchaseOrders(id).then(r => setPurchaseOrders(r.data.data))
    ])
      .catch(() => navigate(-1))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [id]);

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
    setPoForm({ purchaseorder_description: '', purchaseorder_start_date: '', purchaseorder_end_date: '' });
    setPoModal(true);
  };

  const openEdit = (po) => {
    setEditPo(po);
    setPoForm({
      purchaseorder_description: po.purchaseorder_description || '',
      purchaseorder_start_date: tsToInput(po.purchaseorder_start_date),
      purchaseorder_end_date: tsToInput(po.purchaseorder_end_date)
    });
    setPoModal(true);
  };

  const handleSavePo = async (e) => {
    e.preventDefault();
    const data = {
      purchaseorder_description: poForm.purchaseorder_description.trim(),
      purchaseorder_start_date: inputToTs(poForm.purchaseorder_start_date),
      purchaseorder_end_date: inputToTs(poForm.purchaseorder_end_date)
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
            <div className="mt-1 flex items-center gap-4 text-sm text-text-secondary">
              {budget.budget_start_date && (
                <span className="flex items-center gap-1">
                  <Calendar size={14} /> {formatDate(budget.budget_start_date)} – {formatDate(budget.budget_end_date)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Purchase Orders */}
        <div className="lg:col-span-2">
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
                    {isAdmin && <th className="px-6 py-3 text-right font-medium text-text-secondary">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {purchaseOrders.map(po => (
                    <tr key={po.id} className="border-b border-border last:border-0 hover:bg-surface/30 transition-colors">
                      <td className="px-6 py-3 font-medium">{po.purchaseorder_description || '-'}</td>
                      <td className="px-6 py-3 text-text-secondary">{formatDate(po.purchaseorder_start_date)}</td>
                      <td className="px-6 py-3 text-text-secondary">{formatDate(po.purchaseorder_end_date)}</td>
                      <td className="px-6 py-3 text-text-secondary">{po.vendor_name || '-'}</td>
                      {isAdmin && (
                        <td className="px-6 py-3">
                          <div className="flex justify-end gap-1">
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

        {/* Sidebar */}
        <div className="space-y-6">
          <Card title="Budget Details">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-text-secondary">Amount</span>
                <span className="font-bold">{formatCurrency(budget.budget_amount, budget.currency_name)}</span>
              </div>
              {budget.currency_name && (
                <div className="flex justify-between">
                  <span className="text-text-secondary">Currency</span>
                  <span className="font-medium">{budget.currency_name}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-text-secondary">Start Date</span>
                <span className="font-medium">{formatDate(budget.budget_start_date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">End Date</span>
                <span className="font-medium">{formatDate(budget.budget_end_date)}</span>
              </div>
              {budget.budget_approve_date && (
                <div className="flex justify-between">
                  <span className="text-text-secondary">Approved</span>
                  <span className="font-medium">{formatDate(budget.budget_approve_date)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-text-secondary">Created</span>
                <span className="font-medium">{formatDate(budget.budget_create_date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">ID</span>
                <span className="font-mono text-text-secondary">#{budget.id}</span>
              </div>
            </div>
          </Card>
        </div>
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Start Date <span className="text-error-500">*</span></label>
              <input
                type="date"
                value={poForm.purchaseorder_start_date}
                onChange={e => setPoForm(f => ({ ...f, purchaseorder_start_date: e.target.value }))}
                required
                className="w-full rounded-lg border border-border-dark px-3 py-2 text-sm outline-none focus:border-primary-500"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">End Date</label>
              <input
                type="date"
                value={poForm.purchaseorder_end_date}
                onChange={e => setPoForm(f => ({ ...f, purchaseorder_end_date: e.target.value }))}
                className="w-full rounded-lg border border-border-dark px-3 py-2 text-sm outline-none focus:border-primary-500"
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
    </div>
  );
}
