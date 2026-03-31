import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, Settings } from 'lucide-react';
import { getVendorContractRoles, createVendorContractRole, updateVendorContractRole, deleteVendorContractRole } from '../../api/entitiesApi';
import Modal from '../../commoncomponents/Modal';
import ConfirmDialog from '../../commoncomponents/ConfirmDialog';
import LoadingSpinner from '../../commoncomponents/LoadingSpinner';
import RatesModal from './RatesModal';

export default function ContractRolesModal({ open, onClose, vendor, contract, isAdmin }) {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [roleModal, setRoleModal] = useState(false);
  const [editRole, setEditRole] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [ratesModal, setRatesModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [roleForm, setRoleForm] = useState({
    vendorcontractrole_name: '',
    vendorcontractrole_description: ''
  });

  const fetchRoles = useCallback(() => {
    if (!vendor?.id || !contract?.id) return;
    setLoading(true);
    getVendorContractRoles(vendor.id, contract.id)
      .then(r => setRoles(r.data.data))
      .catch(() => setRoles([]))
      .finally(() => setLoading(false));
  }, [vendor?.id, contract?.id]);

  useEffect(() => {
    if (open && vendor?.id && contract?.id) {
      fetchRoles();
    }
  }, [open, vendor?.id, contract?.id, fetchRoles]);

  const openCreate = () => {
    setEditRole(null);
    setRoleForm({
      vendorcontractrole_name: '',
      vendorcontractrole_description: ''
    });
    setRoleModal(true);
  };

  const openEdit = (role) => {
    setEditRole(role);
    setRoleForm({
      vendorcontractrole_name: role.vendorcontractrole_name || '',
      vendorcontractrole_description: role.vendorcontractrole_description || ''
    });
    setRoleModal(true);
  };

  const handleSaveRole = async (e) => {
    e.preventDefault();
    if (!roleForm.vendorcontractrole_name.trim()) return;

    const data = {
      vendorcontractrole_name: roleForm.vendorcontractrole_name.trim(),
      vendorcontractrole_description: roleForm.vendorcontractrole_description.trim() || null
    };

    if (editRole) {
      await updateVendorContractRole(vendor.id, contract.id, editRole.id, data);
    } else {
      await createVendorContractRole(vendor.id, contract.id, data);
    }

    fetchRoles();
    setRoleModal(false);
  };

  const handleDeleteRole = async () => {
    await deleteVendorContractRole(vendor.id, contract.id, deleteTarget.id);
    setDeleteTarget(null);
    fetchRoles();
  };

  if (!open) return null;

  return (
    <>
      <Modal open={open} onClose={onClose} title={`Roles for ${contract?.contract_name || ''}`} maxWidth="max-w-2xl">
        <div>
          {isAdmin && (
            <div className="mb-4">
              <button
                onClick={openCreate}
                className="inline-flex items-center gap-2 rounded-lg bg-primary-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-600 transition-colors"
              >
                <Plus size={14} /> Add Role
              </button>
            </div>
          )}

          {loading ? (
            <LoadingSpinner className="py-8" />
          ) : roles.length === 0 ? (
            <p className="text-center py-8 text-text-secondary text-sm">No roles yet</p>
          ) : (
            <div className="space-y-3">
              {roles.map(role => (
                <div key={role.id} className="rounded-lg border border-border p-4 hover:bg-surface/30 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h4 className="font-medium text-text-primary">{role.vendorcontractrole_name}</h4>
                      {role.vendorcontractrole_description && (
                        <p className="text-sm text-text-secondary mt-1">{role.vendorcontractrole_description}</p>
                      )}
                    </div>
                    {isAdmin && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => {
                            setSelectedRole(role);
                            setRatesModal(true);
                          }}
                          className="rounded-lg p-1.5 text-text-secondary hover:bg-surface hover:text-primary-500 transition-colors"
                          title="Manage rates"
                        >
                          <Settings size={16} />
                        </button>
                        <button
                          onClick={() => openEdit(role)}
                          className="rounded-lg p-1.5 text-text-secondary hover:bg-surface hover:text-primary-500 transition-colors"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(role)}
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
        open={roleModal}
        onClose={() => setRoleModal(false)}
        title={editRole ? 'Edit Role' : 'New Role'}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSaveRole} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Role Name <span className="text-error-500">*</span></label>
            <input
              type="text"
              value={roleForm.vendorcontractrole_name}
              onChange={e => setRoleForm(f => ({ ...f, vendorcontractrole_name: e.target.value }))}
              className="w-full rounded-lg border border-border-dark px-3 py-2 text-sm outline-none focus:border-primary-500"
              placeholder="e.g., Senior Consultant"
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Description</label>
            <textarea
              value={roleForm.vendorcontractrole_description}
              onChange={e => setRoleForm(f => ({ ...f, vendorcontractrole_description: e.target.value }))}
              rows={3}
              className="w-full rounded-lg border border-border-dark px-3 py-2 text-sm outline-none focus:border-primary-500 resize-none"
              placeholder="Optional description of the role"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setRoleModal(false)}
              className="rounded-lg border border-border-dark px-4 py-2 text-sm font-medium hover:bg-surface transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 transition-colors"
            >
              {editRole ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteRole}
        title="Delete Role"
        message={`Delete role "${deleteTarget?.vendorcontractrole_name || 'this role'}"?`}
      />

      <RatesModal
        open={ratesModal}
        onClose={() => {
          setRatesModal(false);
          setSelectedRole(null);
        }}
        vendor={vendor}
        contract={contract}
        role={selectedRole}
        isAdmin={isAdmin}
      />
    </>
  );
}
