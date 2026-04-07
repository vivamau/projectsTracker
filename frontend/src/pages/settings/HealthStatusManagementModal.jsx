import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { getHealthStatusTypes, createHealthStatusType, updateHealthStatusType, deleteHealthStatusType } from '../../api/entitiesApi';
import Modal from '../../commoncomponents/Modal';
import ConfirmDialog from '../../commoncomponents/ConfirmDialog';
import LoadingSpinner from '../../commoncomponents/LoadingSpinner';

export default function HealthStatusManagementModal({ open, onClose }) {
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formModal, setFormModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState({ healthstatus_name: '', healthstatus_description: '' });

  const fetchTypes = useCallback(() => {
    setLoading(true);
    getHealthStatusTypes()
      .then(r => setTypes(r.data.data || []))
      .catch(() => setTypes([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (open) fetchTypes();
  }, [open, fetchTypes]);

  const openCreate = () => {
    setEditTarget(null);
    setForm({ healthstatus_name: '', healthstatus_description: '' });
    setFormModal(true);
  };

  const openEdit = (type) => {
    setEditTarget(type);
    setForm({
      healthstatus_name: type.healthstatus_name || '',
      healthstatus_description: type.healthstatus_description || ''
    });
    setFormModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.healthstatus_name.trim()) return;
    try {
      if (editTarget) {
        await updateHealthStatusType(editTarget.id, form);
      } else {
        await createHealthStatusType(form);
      }
      fetchTypes();
      setFormModal(false);
    } catch (err) {
      console.error('Failed to save health status type:', err);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteHealthStatusType(deleteTarget.id);
      setDeleteTarget(null);
      fetchTypes();
    } catch (err) {
      console.error('Failed to delete health status type:', err);
    }
  };

  if (!open) return null;

  return (
    <>
      <Modal open={open} onClose={onClose} title="Manage Health Status Types" maxWidth="max-w-2xl">
        <div>
          <div className="mb-4">
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-lg bg-primary-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-600 transition-colors"
            >
              <Plus size={14} /> Add Health Status
            </button>
          </div>

          {loading ? (
            <LoadingSpinner className="py-8" />
          ) : types.length === 0 ? (
            <p className="text-center py-8 text-text-secondary text-sm">No health status types yet</p>
          ) : (
            <div className="space-y-3">
              {types.map(type => (
                <div key={type.id} className="rounded-lg border border-border p-4 hover:bg-surface/30 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h4 className="font-medium text-text-primary">{type.healthstatus_name}</h4>
                      {type.healthstatus_description && (
                        <p className="text-sm text-text-secondary mt-0.5">{type.healthstatus_description}</p>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => openEdit(type)}
                        className="rounded-lg p-1.5 text-text-secondary hover:bg-surface hover:text-text-primary transition-colors"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(type)}
                        className="rounded-lg p-1.5 text-text-secondary hover:bg-error-50 hover:text-error-500 transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      <Modal
        open={formModal}
        onClose={() => setFormModal(false)}
        title={editTarget ? 'Edit Health Status Type' : 'New Health Status Type'}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Name <span className="text-error-500">*</span>
            </label>
            <input
              type="text"
              value={form.healthstatus_name}
              onChange={e => setForm(f => ({ ...f, healthstatus_name: e.target.value }))}
              className="w-full rounded-lg border border-border-dark px-3 py-2 text-sm outline-none focus:border-primary-500"
              placeholder="e.g., On Track"
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Description</label>
            <input
              type="text"
              value={form.healthstatus_description}
              onChange={e => setForm(f => ({ ...f, healthstatus_description: e.target.value }))}
              className="w-full rounded-lg border border-border-dark px-3 py-2 text-sm outline-none focus:border-primary-500"
              placeholder="Optional description"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setFormModal(false)}
              className="rounded-lg border border-border-dark px-4 py-2 text-sm font-medium hover:bg-surface transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 transition-colors"
            >
              {editTarget ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Health Status Type"
        message={`Delete health status type "${deleteTarget?.healthstatus_name || ''}"? Existing project health status entries will be unaffected.`}
      />
    </>
  );
}
