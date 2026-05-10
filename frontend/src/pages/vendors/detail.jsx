import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Globe, Mail, Phone, MapPin, FolderKanban, Users, ChevronDown, ChevronRight } from 'lucide-react';
import { getVendor, getVendorContracts, getVendorContractRoles, getVendorRoleRates, getVendorPurchaseOrders } from '../../api/entitiesApi';
import Card from '../../commoncomponents/Card';
import LoadingSpinner from '../../commoncomponents/LoadingSpinner';
import EntityNotes from '../../commoncomponents/EntityNotes';

const TABS = ['Contracts', 'Purchase Orders'];

export default function VendorDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [vendor, setVendor] = useState(null);
  const [resources, setResources] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [contractRoles, setContractRoles] = useState({});
  const [ratesByRole, setRatesByRole] = useState({});
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [expandedPos, setExpandedPos] = useState({});
  const [activeTab, setActiveTab] = useState('Contracts');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [vendorRes, contractsRes, posRes] = await Promise.all([
          getVendor(parseInt(id)),
          getVendorContracts(parseInt(id)),
          getVendorPurchaseOrders(parseInt(id)),
        ]);

        const vendorData = vendorRes.data.data;
        setVendor(vendorData);
        setResources(vendorData.resources || []);
        setContracts(contractsRes.data.data || []);
        setPurchaseOrders(posRes.data.data || []);

        const rolesData = {};
        const ratesData = {};
        for (const contract of contractsRes.data.data || []) {
          const rolesRes = await getVendorContractRoles(parseInt(id), contract.id);
          rolesData[contract.id] = rolesRes.data.data || [];
          for (const role of rolesRes.data.data || []) {
            const ratesRes = await getVendorRoleRates(parseInt(id), contract.id, role.id);
            ratesData[role.id] = ratesRes.data.data || [];
          }
        }
        setContractRoles(rolesData);
        setRatesByRole(ratesData);
      } catch (err) {
        console.error('Failed to fetch vendor details:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) return <LoadingSpinner size="lg" className="mt-20" />;
  if (!vendor) return null;

  const fmt = (ts) => {
    if (!ts) return '-';
    return new Date(ts).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const fmtNum = (n) => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

  const allSeniorities = new Set();
  const allCurrencies = new Set();
  Object.values(ratesByRole).forEach(rates => {
    rates.forEach(r => {
      if (r.seniority_description) allSeniorities.add(r.seniority_description);
      allCurrencies.add(r.currency_name);
    });
  });
  const seniorities = Array.from(allSeniorities).sort();
  const currencies = Array.from(allCurrencies).sort();

  const totalPoAmount = purchaseOrders.reduce((sum, po) => sum + (po.total || 0), 0);
  const poCurrencies = [...new Set(purchaseOrders.map(po => po.currency_name).filter(Boolean))];

  const togglePo = (poId) => setExpandedPos(prev => ({ ...prev, [poId]: !prev[poId] }));

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/vendors')}
          className="mb-3 inline-flex items-center gap-1 text-sm text-text-secondary hover:text-primary-500 transition-colors"
        >
          <ArrowLeft size={14} /> Back to Vendors
        </button>

        <div className="bg-surface rounded-lg border border-border p-6">
          <h1 className="text-2xl font-bold text-text-primary mb-4">{vendor.vendor_name}</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              {vendor.vendor_email && (
                <div className="flex items-start gap-3">
                  <Mail size={18} className="text-primary-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-text-secondary uppercase tracking-wide">Email</p>
                    <a href={`mailto:${vendor.vendor_email}`} className="text-sm font-medium text-primary-600 hover:underline">{vendor.vendor_email}</a>
                  </div>
                </div>
              )}
              {vendor.vendor_phone && (
                <div className="flex items-start gap-3">
                  <Phone size={18} className="text-primary-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-text-secondary uppercase tracking-wide">Phone</p>
                    <p className="text-sm font-medium">{vendor.vendor_phone}</p>
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-3">
              {vendor.vendor_address && (
                <div className="flex items-start gap-3">
                  <MapPin size={18} className="text-primary-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-text-secondary uppercase tracking-wide">Address</p>
                    <p className="text-sm font-medium">{vendor.vendor_address}</p>
                  </div>
                </div>
              )}
              {vendor.vendor_website && (
                <div className="flex items-start gap-3">
                  <Globe size={18} className="text-primary-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-text-secondary uppercase tracking-wide">Website</p>
                    <a href={vendor.vendor_website} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-primary-600 hover:underline">
                      {vendor.vendor_website.replace(/^https?:\/\//, '')}
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {/* Resources */}
          {resources.length > 0 && (
            <Card title="Resources" noPadding className="mb-6">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-surface/50">
                      <th className="px-6 py-3 text-left font-medium text-text-secondary">Name</th>
                      <th className="px-6 py-3 text-left font-medium text-text-secondary">Email</th>
                      <th className="px-6 py-3 text-left font-medium text-text-secondary">Phone</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resources.map(r => (
                      <tr key={r.id} className="border-b border-border last:border-0 hover:bg-surface/30 transition-colors">
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-2">
                            <Users size={14} className="text-primary-500 flex-shrink-0" />
                            <Link to={`/vendors/${id}/resources/${r.id}`} className="font-medium text-primary-600 hover:underline">
                              {r.vendorresource_name} {r.vendorresource_lastname}
                            </Link>
                          </div>
                        </td>
                        <td className="px-6 py-3">
                          {r.vendorresource_email
                            ? <a href={`mailto:${r.vendorresource_email}`} className="text-sm text-primary-600 hover:underline">{r.vendorresource_email}</a>
                            : <span className="text-text-secondary">-</span>}
                        </td>
                        <td className="px-6 py-3 text-text-secondary">{r.vendorresource_phone || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Tabs */}
          <div className="border-b border-border mb-4 flex gap-1">
            {TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium rounded-t transition-colors ${
                  activeTab === tab
                    ? 'text-primary-600 border-b-2 border-primary-500 -mb-px bg-surface-card'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {tab}
                {tab === 'Purchase Orders' && purchaseOrders.length > 0 && (
                  <span className="ml-1.5 rounded-full bg-primary-100 text-primary-700 px-1.5 py-0.5 text-xs">
                    {purchaseOrders.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Contracts tab */}
          {activeTab === 'Contracts' && (
            contracts.length === 0 ? (
              <Card><p className="text-center py-8 text-text-secondary">No contracts for this vendor</p></Card>
            ) : (
              <div className="space-y-6">
                {contracts.map(contract => {
                  const roles = contractRoles[contract.id] || [];
                  return (
                    <Card key={contract.id} title={contract.contract_name} noPadding>
                      <div className="px-6 py-3 border-b border-border bg-surface/30 text-sm text-text-secondary">
                        {fmt(contract.contract_start_date)} – {fmt(contract.contract_end_date)}
                      </div>
                      {roles.length === 0 ? (
                        <p className="px-6 py-8 text-center text-text-secondary text-sm">No roles defined</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b border-border">
                                <th className="px-6 py-3 text-left font-medium text-text-secondary bg-surface/50">Role</th>
                                {seniorities.map(sen => (
                                  <th key={sen} colSpan={currencies.length} className="px-3 py-3 text-center font-medium text-text-secondary bg-surface/50 border-l border-border">
                                    {sen}
                                  </th>
                                ))}
                              </tr>
                              <tr className="border-b border-border">
                                <th className="px-6 py-3 bg-surface/30" />
                                {seniorities.map(sen => currencies.map(curr => (
                                  <th key={`${sen}-${curr}`} className="px-3 py-2 text-center text-xs font-medium text-text-secondary bg-surface/30">{curr}</th>
                                )))}
                              </tr>
                            </thead>
                            <tbody>
                              {roles.map(role => {
                                const rates = ratesByRole[role.id] || [];
                                return (
                                  <tr key={role.id} className="border-b border-border last:border-0 hover:bg-surface/20">
                                    <td className="px-6 py-3 font-medium text-text-primary whitespace-nowrap sticky left-0 bg-surface-card z-10">
                                      {role.vendorcontractrole_name}
                                    </td>
                                    {seniorities.map(sen => currencies.map(curr => {
                                      const rate = rates.find(r => r.seniority_description === sen && r.currency_name === curr);
                                      return (
                                        <td key={`${sen}-${curr}`} className="px-3 py-3 text-center border-l border-border">
                                          {rate
                                            ? <span className="font-medium text-text-primary">{rate.currency_symbol || ''}{rate.vendorrolerate_rate?.toFixed(2)}</span>
                                            : <span className="text-text-secondary text-xs">-</span>}
                                        </td>
                                      );
                                    }))}
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            )
          )}

          {/* Purchase Orders tab */}
          {activeTab === 'Purchase Orders' && (
            purchaseOrders.length === 0 ? (
              <Card><p className="text-center py-8 text-text-secondary">No purchase orders for this vendor</p></Card>
            ) : (
              <div className="space-y-3">
                {purchaseOrders.map(po => {
                  const isOpen = expandedPos[po.id];
                  return (
                    <div key={po.id} className="rounded-xl border border-border bg-surface-card overflow-hidden">
                      <button
                        onClick={() => togglePo(po.id)}
                        className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-surface/30 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {isOpen ? <ChevronDown size={15} className="text-text-secondary flex-shrink-0" /> : <ChevronRight size={15} className="text-text-secondary flex-shrink-0" />}
                          <div className="min-w-0">
                            <p className="font-medium text-text-primary truncate">{po.purchaseorder_description || `PO #${po.id}`}</p>
                            <div className="flex items-center gap-2 mt-0.5 text-xs text-text-secondary">
                              <Link
                                to={`/projects/${po.project_id}`}
                                onClick={e => e.stopPropagation()}
                                className="text-primary-600 hover:underline flex items-center gap-1"
                              >
                                <FolderKanban size={11} /> {po.project_name}
                              </Link>
                              {po.status_name && (
                                <span className="rounded-full bg-surface px-2 py-0.5 border border-border">{po.status_name}</span>
                              )}
                              <span>{fmt(po.purchaseorder_start_date)} – {fmt(po.purchaseorder_end_date)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                          {po.currency_name && <span className="text-xs text-text-secondary">{po.currency_name}</span>}
                          <span className="font-semibold text-text-primary">{fmtNum(po.total)}</span>
                        </div>
                      </button>

                      {isOpen && po.items.length > 0 && (
                        <div className="border-t border-border overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b border-border bg-surface/40">
                                <th className="px-5 py-2 text-left font-medium text-text-secondary">Description</th>
                                <th className="px-3 py-2 text-left font-medium text-text-secondary">Role</th>
                                <th className="px-3 py-2 text-left font-medium text-text-secondary">Resource</th>
                                <th className="px-3 py-2 text-right font-medium text-text-secondary">Days</th>
                                <th className="px-3 py-2 text-right font-medium text-text-secondary">Rate</th>
                                <th className="px-3 py-2 text-right font-medium text-text-secondary">Total</th>
                                <th className="px-3 py-2 text-left font-medium text-text-secondary">Period</th>
                              </tr>
                            </thead>
                            <tbody>
                              {po.items.map(item => {
                                const itemTotal = (item.purchaseorderitems_days || 0) * (item.purchaseorderitems_discounted_rate || 0);
                                return (
                                  <tr key={item.id} className="border-b border-border last:border-0 hover:bg-surface/20">
                                    <td className="px-5 py-2 text-text-primary">{item.purchaseorderitem_description || '-'}</td>
                                    <td className="px-3 py-2 text-text-secondary">{item.role_name || '-'}</td>
                                    <td className="px-3 py-2 text-text-secondary">{item.resource_name?.trim() || '-'}</td>
                                    <td className="px-3 py-2 text-right text-text-primary">{item.purchaseorderitems_days ?? '-'}</td>
                                    <td className="px-3 py-2 text-right text-text-secondary">{item.purchaseorderitems_discounted_rate != null ? fmtNum(item.purchaseorderitems_discounted_rate) : '-'}</td>
                                    <td className="px-3 py-2 text-right font-medium text-text-primary">{fmtNum(itemTotal)}</td>
                                    <td className="px-3 py-2 text-text-secondary whitespace-nowrap">{fmt(item.purchaseorderitem_start_date)} – {fmt(item.purchaseorderitem_end_date)}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                      {isOpen && po.items.length === 0 && (
                        <p className="px-5 py-4 text-xs text-text-secondary border-t border-border">No line items</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <p className="text-sm text-text-secondary">Total Purchase Orders</p>
            <p className="text-2xl font-bold text-text-primary mt-2">{fmtNum(totalPoAmount)}</p>
            {poCurrencies.length > 0 && (
              <p className="text-xs text-text-secondary mt-2">{poCurrencies.join(', ')}</p>
            )}
          </Card>

          <EntityNotes entityType="vendor" entityId={id} />
        </div>
      </div>
    </div>
  );
}
