import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, Settings } from 'lucide-react';
import { getVendorContracts, createVendorContract, updateVendorContract, deleteVendorContract } from '../../api/entitiesApi';
import Modal from '../../commoncomponents/Modal';
import ConfirmDialog from '../../commoncomponents/ConfirmDialog';
import LoadingSpinner from '../../commoncomponents/LoadingSpinner';
import ContractRolesModal from './ContractRolesModal';

export default function ContractsModal({ open, onClose, vendor, isAdmin }) {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [contractModal, setContractModal] = useState(false);
  const [rolesModal, setRolesModal] = useState(false);
  const [editContract, setEditContract] = useState(null);
  const [selectedContract, setSelectedContract] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [contractForm, setContractForm] = useState({
    contract_name: '',
    contract_document_path: '',
    contract_start_date: '',
    contract_end_date: ''
  });

  const fetchContracts = useCallback(() => {
    if (!vendor?.id) return;
    setLoading(true);
    getVendorContracts(vendor.id)
      .then(r => setContracts(r.data.data))
      .catch(() => setContracts([]))
      .finally(() => setLoading(false));
  }, [vendor?.id]);

  useEffect(() => {
    if (open && vendor?.id) {
      fetchContracts();
    }
  }, [open, vendor?.id, fetchContracts]);

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

  const openCreate = () => {
    setEditContract(null);
    setContractForm({
      contract_name: '',
      contract_document_path: '',
      contract_start_date: '',
      contract_end_date: ''
    });
    setContractModal(true);
  };

  const openEdit = (contract) => {
    setEditContract(contract);
    setContractForm({
      contract_name: contract.contract_name || '',
      contract_document_path: contract.contract_document_path || '',
      contract_start_date: tsToInput(contract.contract_start_date),
      contract_end_date: tsToInput(contract.contract_end_date)
    });
    setContractModal(true);
  };

  const handleSaveContract = async (e) => {
    e.preventDefault();
    if (!contractForm.contract_name || !contractForm.contract_start_date) return;

    const data = {
      contract_name: contractForm.contract_name.trim(),
      contract_document_path: contractForm.contract_document_path.trim() || null,
      contract_start_date: inputToTs(contractForm.contract_start_date),
      contract_end_date: inputToTs(contractForm.contract_end_date)
    };

    if (editContract) {
      await updateVendorContract(vendor.id, editContract.id, data);
    } else {
      await createVendorContract(vendor.id, data);
    }

    fetchContracts();
    setContractModal(false);
  };

  const handleDeleteContract = async () => {
    await deleteVendorContract(vendor.id, deleteTarget.id);
    setDeleteTarget(null);
    fetchContracts();
  };

  if (!open) return null;

  return (
    <>
      <Modal open={open} onClose={onClose} title={`Contracts for ${vendor?.vendor_name || ''}`} maxWidth="max-w-3xl">
        <div>
          {isAdmin && (
            <div className="mb-4">
              <button
                onClick={openCreate}
                className="inline-flex items-center gap-2 rounded-lg bg-primary-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-600 transition-colors"
              >
                <Plus size={14} /> Add Contract
              </button>
            </div>
          )}

          {loading ? (
            <LoadingSpinner className="py-8" />
          ) : contracts.length === 0 ? (
            <p className="text-center py-8 text-text-secondary text-sm">No contracts yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface/50">
                    <th className="px-4 py-3 text-left font-medium text-text-secondary">Contract Name</th>
                    <th className="px-4 py-3 text-left font-medium text-text-secondary">Start Date</th>
                    <th className="px-4 py-3 text-left font-medium text-text-secondary">End Date</th>
                    <th className="px-4 py-3 text-left font-medium text-text-secondary">Document</th>
                    {isAdmin && <th className="px-4 py-3 text-right font-medium text-text-secondary">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {contracts.map(contract => (
                    <tr key={contract.id} className="border-b border-border last:border-0 hover:bg-surface/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-text-primary">{contract.contract_name || '-'}</td>
                      <td className="px-4 py-3 text-text-secondary">{formatDate(contract.contract_start_date)}</td>
                      <td className="px-4 py-3 text-text-secondary">{formatDate(contract.contract_end_date)}</td>
                      <td className="px-4 py-3 text-text-secondary">
                        {contract.contract_document_path ? (
                          <a href={contract.contract_document_path} className="text-primary-500 hover:underline">
                            {contract.contract_document_path.split('/').pop()}
                          </a>
                        ) : (
                          '-'
                        )}
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => { setSelectedContract(contract); setRolesModal(true); }}
                              className="rounded-lg p-1.5 text-text-secondary hover:bg-surface hover:text-primary-500 transition-colors"
                              title="Manage Roles"
                            >
                              <Settings size={16} />
                            </button>
                            <button
                              onClick={() => openEdit(contract)}
                              className="rounded-lg p-1.5 text-text-secondary hover:bg-surface hover:text-primary-500 transition-colors"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(contract)}
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
        open={contractModal}
        onClose={() => setContractModal(false)}
        title={editContract ? 'Edit Contract' : 'New Contract'}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSaveContract} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Contract Name <span className="text-error-500">*</span></label>
            <input
              type="text"
              value={contractForm.contract_name}
              onChange={e => setContractForm(f => ({ ...f, contract_name: e.target.value }))}
              className="w-full rounded-lg border border-border-dark px-3 py-2 text-sm outline-none focus:border-primary-500"
              placeholder="e.g., Consulting Services Agreement"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Start Date <span className="text-error-500">*</span></label>
              <input
                type="date"
                value={contractForm.contract_start_date}
                onChange={e => setContractForm(f => ({ ...f, contract_start_date: e.target.value }))}
                required
                className="w-full rounded-lg border border-border-dark px-3 py-2 text-sm outline-none focus:border-primary-500"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">End Date</label>
              <input
                type="date"
                value={contractForm.contract_end_date}
                onChange={e => setContractForm(f => ({ ...f, contract_end_date: e.target.value }))}
                className="w-full rounded-lg border border-border-dark px-3 py-2 text-sm outline-none focus:border-primary-500"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Document Path</label>
            <input
              type="text"
              value={contractForm.contract_document_path}
              onChange={e => setContractForm(f => ({ ...f, contract_document_path: e.target.value }))}
              className="w-full rounded-lg border border-border-dark px-3 py-2 text-sm outline-none focus:border-primary-500"
              placeholder="/documents/contract.pdf"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setContractModal(false)}
              className="rounded-lg border border-border-dark px-4 py-2 text-sm font-medium hover:bg-surface transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 transition-colors"
            >
              {editContract ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>

      <ContractRolesModal
        open={rolesModal}
        onClose={() => { setRolesModal(false); setSelectedContract(null); }}
        vendor={vendor}
        contract={selectedContract}
        isAdmin={isAdmin}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteContract}
        title="Delete Contract"
        message={`Delete contract "${deleteTarget?.contract_name || 'this contract'}"?`}
      />
    </>
  );
}
