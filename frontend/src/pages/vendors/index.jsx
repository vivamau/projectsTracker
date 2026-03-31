import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, Globe, Mail, Phone, FileText } from 'lucide-react';
import { getVendors, createVendor, updateVendor, deleteVendor } from '../../api/entitiesApi';
import { useAuth } from '../../hooks/useAuth';
import Card from '../../commoncomponents/Card';
import Modal from '../../commoncomponents/Modal';
import ConfirmDialog from '../../commoncomponents/ConfirmDialog';
import LoadingSpinner from '../../commoncomponents/LoadingSpinner';
import SearchInput from '../../commoncomponents/SearchInput';
import ContractsModal from './ContractsModal';

export default function VendorsPage() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [vendors, setVendors] = useState([]);
  const [allVendors, setAllVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [contractsModal, setContractsModal] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    vendor_name: '', vendor_address: '', vendor_phone: '', vendor_email: '', vendor_website: ''
  });

  const fetchVendors = () => {
    setLoading(true);
    getVendors()
      .then(r => {
        setAllVendors(r.data.data);
        filterVendors(r.data.data, search);
      })
      .finally(() => setLoading(false));
  };

  const filterVendors = (vendorsList, searchTerm) => {
    if (!searchTerm.trim()) {
      setVendors(vendorsList);
      return;
    }

    const filtered = vendorsList.filter(v =>
      v.vendor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.vendor_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.vendor_phone?.includes(searchTerm) ||
      v.vendor_address?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setVendors(filtered);
  };

  useEffect(() => { fetchVendors(); }, []);

  useEffect(() => {
    filterVendors(allVendors, search);
  }, [search, allVendors]);

  const openCreate = () => {
    setEditItem(null);
    setForm({ vendor_name: '', vendor_address: '', vendor_phone: '', vendor_email: '', vendor_website: '' });
    setModal(true);
  };

  const openEdit = (v) => {
    setEditItem(v);
    setForm({
      vendor_name: v.vendor_name || '',
      vendor_address: v.vendor_address || '',
      vendor_phone: v.vendor_phone || '',
      vendor_email: v.vendor_email || '',
      vendor_website: v.vendor_website || ''
    });
    setModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.vendor_name.trim()) return;
    const data = {
      vendor_name: form.vendor_name.trim(),
      vendor_address: form.vendor_address.trim() || null,
      vendor_phone: form.vendor_phone.trim() || null,
      vendor_email: form.vendor_email.trim() || null,
      vendor_website: form.vendor_website.trim() || null
    };
    if (editItem) {
      await updateVendor(editItem.id, data);
    } else {
      await createVendor(data);
    }
    setModal(false);
    fetchVendors();
  };

  const handleDelete = async () => {
    await deleteVendor(deleteTarget.id);
    setDeleteTarget(null);
    fetchVendors();
  };

  const handleChange = (field, value) => setForm(f => ({ ...f, [field]: value }));

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Vendors</h1>
          <p className="text-sm text-text-secondary">Manage external vendors and suppliers</p>
        </div>
        {isAdmin && (
          <button onClick={openCreate} className="inline-flex items-center gap-2 rounded-lg bg-primary-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-600 transition-colors">
            <Plus size={18} /> New Vendor
          </button>
        )}
      </div>

      <Card noPadding>
        {/* Search Filter */}
        <div className="border-b border-border px-6 py-4">
          <div className="w-64">
            <SearchInput value={search} onChange={setSearch} placeholder="Search vendors..." />
          </div>
        </div>

        {loading ? <LoadingSpinner className="py-12" /> : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface/50">
                <th className="px-6 py-3 text-left font-medium text-text-secondary">Name</th>
                <th className="px-6 py-3 text-left font-medium text-text-secondary">Contact</th>
                <th className="px-6 py-3 text-left font-medium text-text-secondary">Address</th>
                <th className="px-6 py-3 text-left font-medium text-text-secondary">Created</th>
                {isAdmin && <th className="px-6 py-3 text-right font-medium text-text-secondary">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {vendors.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-text-secondary">No vendors</td></tr>
              ) : vendors.map(v => (
                <tr key={v.id} className="border-b border-border last:border-0 hover:bg-surface/30 transition-colors">
                  <td className="px-6 py-3">
                    <button onClick={() => navigate(`/vendors/${v.id}`)} className="text-left hover:text-primary-500 transition-colors w-full">
                      <p className="font-medium text-primary-600 hover:underline">{v.vendor_name}</p>
                      {v.vendor_website && (
                        <p className="text-xs text-primary-500 flex items-center gap-1 mt-0.5">
                          <Globe size={11} /> {v.vendor_website.replace(/^https?:\/\//, '')}
                        </p>
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-3">
                    {v.vendor_email && (
                      <p className="text-text-secondary text-xs flex items-center gap-1"><Mail size={11} /> {v.vendor_email}</p>
                    )}
                    {v.vendor_phone && (
                      <p className="text-text-secondary text-xs flex items-center gap-1 mt-0.5"><Phone size={11} /> {v.vendor_phone}</p>
                    )}
                    {!v.vendor_email && !v.vendor_phone && <span className="text-text-secondary">-</span>}
                  </td>
                  <td className="px-6 py-3 text-text-secondary text-xs">{v.vendor_address || '-'}</td>
                  <td className="px-6 py-3 text-text-secondary">{v.vendor_create_date ? new Date(v.vendor_create_date).toLocaleDateString() : '-'}</td>
                  {isAdmin && (
                    <td className="px-6 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => { setSelectedVendor(v); setContractsModal(true); }}
                          className="rounded-lg p-1.5 text-text-secondary hover:bg-surface hover:text-primary-500 transition-colors"
                          title="Contracts"
                        >
                          <FileText size={16} />
                        </button>
                        <button onClick={() => openEdit(v)} className="rounded-lg p-1.5 text-text-secondary hover:bg-surface hover:text-primary-500 transition-colors"><Pencil size={16} /></button>
                        <button onClick={() => setDeleteTarget(v)} className="rounded-lg p-1.5 text-text-secondary hover:bg-error-50 hover:text-error-500 transition-colors"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Modal open={modal} onClose={() => setModal(false)} title={editItem ? 'Edit Vendor' : 'New Vendor'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Vendor Name <span className="text-error-500">*</span></label>
            <input type="text" value={form.vendor_name} onChange={e => handleChange('vendor_name', e.target.value)}
              className="w-full rounded-lg border border-border-dark px-3 py-2 text-sm outline-none focus:border-primary-500" placeholder="Vendor name" autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Email</label>
              <input type="email" value={form.vendor_email} onChange={e => handleChange('vendor_email', e.target.value)}
                className="w-full rounded-lg border border-border-dark px-3 py-2 text-sm outline-none focus:border-primary-500" placeholder="contact@vendor.com" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Phone</label>
              <input type="text" value={form.vendor_phone} onChange={e => handleChange('vendor_phone', e.target.value)}
                className="w-full rounded-lg border border-border-dark px-3 py-2 text-sm outline-none focus:border-primary-500" placeholder="+1-555-0100" />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Address</label>
            <input type="text" value={form.vendor_address} onChange={e => handleChange('vendor_address', e.target.value)}
              className="w-full rounded-lg border border-border-dark px-3 py-2 text-sm outline-none focus:border-primary-500" placeholder="Street address, city" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Website</label>
            <input type="text" value={form.vendor_website} onChange={e => handleChange('vendor_website', e.target.value)}
              className="w-full rounded-lg border border-border-dark px-3 py-2 text-sm outline-none focus:border-primary-500" placeholder="https://vendor.com" />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setModal(false)} className="rounded-lg border border-border-dark px-4 py-2 text-sm font-medium hover:bg-surface transition-colors">Cancel</button>
            <button type="submit" className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 transition-colors">{editItem ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </Modal>

      <ContractsModal
        open={contractsModal}
        onClose={() => { setContractsModal(false); setSelectedVendor(null); }}
        vendor={selectedVendor}
        isAdmin={isAdmin}
      />

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} title="Delete Vendor" message={`Delete "${deleteTarget?.vendor_name}"?`} />
    </div>
  );
}
