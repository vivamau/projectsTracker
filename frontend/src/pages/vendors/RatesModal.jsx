import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { getVendorRoleRates, createVendorRoleRate, updateVendorRoleRate, deleteVendorRoleRate, getCurrencies, getSeniorities } from '../../api/entitiesApi';
import Modal from '../../commoncomponents/Modal';
import ConfirmDialog from '../../commoncomponents/ConfirmDialog';
import LoadingSpinner from '../../commoncomponents/LoadingSpinner';

export default function RatesModal({ open, onClose, vendor, contract, role, isAdmin }) {
  const [rates, setRates] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [seniorities, setSeniorities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [rateModal, setRateModal] = useState(false);
  const [editRate, setEditRate] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [rateForm, setRateForm] = useState({
    vendorrolerate_rate: '',
    currency_id: '',
    seniority_id: '',
    vendorrolerate_description: ''
  });

  const fetchRates = useCallback(() => {
    if (!vendor?.id || !contract?.id || !role?.id) return;
    setLoading(true);
    getVendorRoleRates(vendor.id, contract.id, role.id)
      .then(r => setRates(r.data.data))
      .catch(() => setRates([]))
      .finally(() => setLoading(false));
  }, [vendor?.id, contract?.id, role?.id]);

  const fetchMetadata = useCallback(() => {
    Promise.all([getCurrencies(), getSeniorities()])
      .then(([currRes, senRes]) => {
        const currData = currRes.data?.data || currRes.data || [];
        const senData = senRes.data?.data || senRes.data || [];
        setCurrencies(Array.isArray(currData) ? currData : []);
        setSeniorities(Array.isArray(senData) ? senData : []);
      })
      .catch((err) => {
        console.error('Failed to fetch currencies/seniorities:', err);
        setCurrencies([]);
        setSeniorities([]);
      });
  }, []);

  useEffect(() => {
    if (open && vendor?.id && contract?.id && role?.id) {
      fetchRates();
      fetchMetadata();
    }
  }, [open, vendor?.id, contract?.id, role?.id, fetchRates, fetchMetadata]);

  const openCreate = () => {
    setEditRate(null);
    setRateForm({
      vendorrolerate_rate: '',
      currency_id: currencies[0]?.id || '',
      seniority_id: seniorities[0]?.id || '',
      vendorrolerate_description: ''
    });
    setRateModal(true);
  };

  const openEdit = (rate) => {
    setEditRate(rate);
    setRateForm({
      vendorrolerate_rate: rate.vendorrolerate_rate || '',
      currency_id: rate.currency_id || '',
      seniority_id: rate.seniority_id || '',
      vendorrolerate_description: rate.vendorrolerate_description || ''
    });
    setRateModal(true);
  };

  const handleSaveRate = async (e) => {
    e.preventDefault();
    if (!rateForm.vendorrolerate_rate || !rateForm.currency_id) return;

    const data = {
      vendorrolerate_rate: parseFloat(rateForm.vendorrolerate_rate),
      currency_id: parseInt(rateForm.currency_id),
      seniority_id: rateForm.seniority_id ? parseInt(rateForm.seniority_id) : null,
      vendorrolerate_description: rateForm.vendorrolerate_description.trim() || null
    };

    if (editRate) {
      await updateVendorRoleRate(vendor.id, contract.id, role.id, editRate.id, data);
    } else {
      await createVendorRoleRate(vendor.id, contract.id, role.id, data);
    }

    fetchRates();
    setRateModal(false);
  };

  const handleDeleteRate = async () => {
    await deleteVendorRoleRate(vendor.id, contract.id, role.id, deleteTarget.id);
    setDeleteTarget(null);
    fetchRates();
  };

  if (!open) return null;

  const getCurrencySymbol = (currencyId) => {
    const curr = currencies.find(c => c.id === currencyId);
    return curr?.currency_symbol || '';
  };

  const getSeniorityDesc = (seniorityId) => {
    const sen = seniorities.find(s => s.id === seniorityId);
    return sen?.seniority_description || '';
  };

  return (
    <>
      <Modal open={open} onClose={onClose} title={`Rates for ${role?.vendorcontractrole_name || ''}`} maxWidth="max-w-2xl">
        <div>
          {isAdmin && (
            <div className="mb-4">
              <button
                onClick={openCreate}
                className="inline-flex items-center gap-2 rounded-lg bg-primary-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-600 transition-colors"
              >
                <Plus size={14} /> Add Rate
              </button>
            </div>
          )}

          {loading ? (
            <LoadingSpinner className="py-8" />
          ) : rates.length === 0 ? (
            <p className="text-center py-8 text-text-secondary text-sm">No rates yet</p>
          ) : (
            <div className="space-y-3">
              {rates.map(rate => (
                <div key={rate.id} className="rounded-lg border border-border p-4 hover:bg-surface/30 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h4 className="font-medium text-text-primary">
                          {getCurrencySymbol(rate.currency_id)}{rate.vendorrolerate_rate?.toFixed(2)}
                          <span className="text-xs text-text-secondary ml-2">({rate.currency_name})</span>
                        </h4>
                      </div>
                      {rate.seniority_description && (
                        <p className="text-sm text-text-secondary mt-1">Seniority: {rate.seniority_description}</p>
                      )}
                      {rate.vendorrolerate_description && (
                        <p className="text-sm text-text-secondary mt-1">{rate.vendorrolerate_description}</p>
                      )}
                    </div>
                    {isAdmin && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => openEdit(rate)}
                          className="rounded-lg p-1.5 text-text-secondary hover:bg-surface hover:text-primary-500 transition-colors"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(rate)}
                          className="rounded-lg p-1.5 text-text-secondary hover:bg-error-50 hover:text-error-500 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      <Modal
        open={rateModal}
        onClose={() => setRateModal(false)}
        title={editRate ? 'Edit Rate' : 'New Rate'}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSaveRate} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Rate <span className="text-error-500">*</span></label>
            <input
              type="number"
              step="0.01"
              value={rateForm.vendorrolerate_rate}
              onChange={e => setRateForm(f => ({ ...f, vendorrolerate_rate: e.target.value }))}
              className="w-full rounded-lg border border-border-dark bg-surface px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 appearance-none"
              placeholder="e.g., 150.00"
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Currency <span className="text-error-500">*</span></label>
            <select
              value={rateForm.currency_id}
              onChange={e => setRateForm(f => ({ ...f, currency_id: e.target.value }))}
              className="w-full rounded-lg border border-border-dark bg-surface px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 appearance-none"
              required
            >
              <option value="">Select currency</option>
              {currencies.map(curr => (
                <option key={curr.id} value={curr.id}>
                  {curr.currency_name} ({curr.currency_symbol || ''})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Seniority</label>
            <select
              value={rateForm.seniority_id}
              onChange={e => setRateForm(f => ({ ...f, seniority_id: e.target.value }))}
              className="w-full rounded-lg border border-border-dark bg-surface px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 appearance-none"
            >
              <option value="">No seniority level</option>
              {seniorities.map(sen => (
                <option key={sen.id} value={sen.id}>
                  {sen.seniority_description}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Description</label>
            <textarea
              value={rateForm.vendorrolerate_description}
              onChange={e => setRateForm(f => ({ ...f, vendorrolerate_description: e.target.value }))}
              rows={3}
              className="w-full rounded-lg border border-border-dark px-3 py-2 text-sm outline-none focus:border-primary-500 resize-none"
              placeholder="Optional description of the rate"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setRateModal(false)}
              className="rounded-lg border border-border-dark px-4 py-2 text-sm font-medium hover:bg-surface transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 transition-colors"
            >
              {editRate ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteRate}
        title="Delete Rate"
        message={`Delete rate ${getCurrencySymbol(deleteTarget?.currency_id)}${deleteTarget?.vendorrolerate_rate?.toFixed(2)}?`}
      />
    </>
  );
}
