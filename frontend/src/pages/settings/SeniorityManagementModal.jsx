import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { getSeniorities } from '../../api/entitiesApi';
import Modal from '../../commoncomponents/Modal';
import ConfirmDialog from '../../commoncomponents/ConfirmDialog';
import LoadingSpinner from '../../commoncomponents/LoadingSpinner';

export default function SeniorityManagementModal({ open, onClose }) {
  const [seniorities, setSeniorities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [seniorityModal, setSeniorityModal] = useState(false);
  const [editSeniority, setEditSeniority] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState({
    seniority_description: ''
  });

  const fetchSeniorities = useCallback(() => {
    setLoading(true);
    getSeniorities()
      .then(r => setSeniorities(r.data.data || []))
      .catch(() => setSeniorities([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (open) {
      fetchSeniorities();
    }
  }, [open, fetchSeniorities]);

  const openCreate = () => {
    setEditSeniority(null);
    setForm({ seniority_description: '' });
    setSeniorityModal(true);
  };

  const openEdit = (seniority) => {
    setEditSeniority(seniority);
    setForm({ seniority_description: seniority.seniority_description || '' });
    setSeniorityModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.seniority_description.trim()) return;

    try {
      if (editSeniority) {
        // Edit would require a PUT endpoint, which doesn't exist yet
        // For now, we can only create and delete
        return;
      } else {
        const response = await fetch('/api/seniorities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(form)
        });
        if (!response.ok) throw new Error('Failed to create seniority');
      }
      fetchSeniorities();
      setSeniorityModal(false);
    } catch (err) {
      console.error('Failed to save seniority:', err);
    }
  };

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/seniorities/${deleteTarget.id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to delete seniority');
      setDeleteTarget(null);
      fetchSeniorities();
    } catch (err) {
      console.error('Failed to delete seniority:', err);
    }
  };

  if (!open) return null;

  return (
    <>
      <Modal open={open} onClose={onClose} title="Manage Seniority Levels" maxWidth="max-w-2xl">
        <div>
          <div className="mb-4">
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-lg bg-primary-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-600 transition-colors"
            >
              <Plus size={14} /> Add Seniority Level
            </button>
          </div>

          {loading ? (
            <LoadingSpinner className="py-8" />
          ) : seniorities.length === 0 ? (
            <p className="text-center py-8 text-text-secondary text-sm">No seniority levels yet</p>
          ) : (
            <div className="space-y-3">
              {seniorities.map(seniority => (
                <div key={seniority.id} className="rounded-lg border border-border p-4 hover:bg-surface/30 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h4 className="font-medium text-text-primary">{seniority.seniority_description}</h4>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setDeleteTarget(seniority)}
                        className="rounded-lg p-1.5 text-text-secondary hover:bg-error-50 hover:text-error-500 transition-colors"
                      >
                        <Trash2 size={16} />
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
        open={seniorityModal}
        onClose={() => setSeniorityModal(false)}
        title={editSeniority ? 'Edit Seniority Level' : 'New Seniority Level'}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Description <span className="text-error-500">*</span>
            </label>
            <input
              type="text"
              value={form.seniority_description}
              onChange={e => setForm(f => ({ ...f, seniority_description: e.target.value }))}
              className="w-full rounded-lg border border-border-dark px-3 py-2 text-sm outline-none focus:border-primary-500"
              placeholder="e.g., Senior Consultant"
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setSeniorityModal(false)}
              className="rounded-lg border border-border-dark px-4 py-2 text-sm font-medium hover:bg-surface transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 transition-colors"
            >
              {editSeniority ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Seniority Level"
        message={`Delete seniority level "${deleteTarget?.seniority_description || ''}"?`}
      />
    </>
  );
}
