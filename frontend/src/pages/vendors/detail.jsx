import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Globe, Mail, Phone, MapPin, FolderKanban, Users } from 'lucide-react';
import { getVendor, getVendors, getVendorContracts, getVendorContractRoles, getVendorRoleRates } from '../../api/entitiesApi';
import { getProjects, getBudgets, getPurchaseOrders, getPurchaseOrderItems } from '../../api/projectsApi';
import Card from '../../commoncomponents/Card';
import LoadingSpinner from '../../commoncomponents/LoadingSpinner';

export default function VendorDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [vendor, setVendor] = useState(null);
  const [resources, setResources] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [contractRoles, setContractRoles] = useState({});
  const [ratesByRole, setRatesByRole] = useState({});
  const [projects, setProjects] = useState([]);
  const [totalPoAmount, setTotalPoAmount] = useState(0);
  const [poCurrencies, setPoCurrencies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch vendor
        const vendorRes = await getVendor(parseInt(id));
        const vendorData = vendorRes.data.data;
        setVendor(vendorData);
        setResources(vendorData.resources || []);

        // Fetch contracts
        const contractsRes = await getVendorContracts(parseInt(id));
        setContracts(contractsRes.data.data || []);

        // Fetch roles and rates for each contract
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

        // Fetch projects where vendor is involved
        const projectsRes = await getProjects({ limit: 100 });
        const allProjects = projectsRes.data.data || [];
        const vendorProjects = new Set();
        let total = 0;
        const currencies = new Set();

        for (const project of allProjects) {
          try {
            const budgetsRes = await getBudgets(project.id);
            const budgets = budgetsRes.data.data || [];

            for (const budget of budgets) {
              try {
                const posRes = await getPurchaseOrders(budget.id);
                const pos = posRes.data.data || [];

                const vendorPos = pos.filter(po => po.vendor_id === parseInt(id));
                if (vendorPos.length > 0) {
                  vendorProjects.add(project);
                  if (budget.currency_name) currencies.add(budget.currency_name);

                  // Calculate PO totals from items
                  for (const po of vendorPos) {
                    try {
                      const itemsRes = await getPurchaseOrderItems(budget.id, po.id);
                      const items = itemsRes.data.data || [];
                      const poTotal = items.reduce((sum, item) => {
                        const days = item.purchaseorderitems_days || 0;
                        const rate = item.purchaseorderitems_discounted_rate || 0;
                        return sum + (days * rate);
                      }, 0);
                      total += poTotal;
                    } catch {
                      // Continue if items fetch fails
                    }
                  }
                }
              } catch {
                // Continue if POs fail
              }
            }
          } catch {
            // Continue if budgets fail
          }
        }

        setProjects(Array.from(vendorProjects));
        setTotalPoAmount(total);
        setPoCurrencies(Array.from(currencies));
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

  const formatDate = (ts) => {
    if (!ts) return '-';
    return new Date(ts).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return '-';
    return Number(amount).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  };

  const getRateForSeniority = (roleId, seniority) => {
    const rates = ratesByRole[roleId] || [];
    return rates.filter(r => r.seniority_description === seniority);
  };

  // Collect all unique seniorities and currencies across all rates
  const allSeniorities = new Set();
  const allCurrencies = new Set();

  Object.values(ratesByRole).forEach(rates => {
    rates.forEach(rate => {
      if (rate.seniority_description) allSeniorities.add(rate.seniority_description);
      allCurrencies.add(rate.currency_name);
    });
  });

  const seniorities = Array.from(allSeniorities).sort();
  const currencies = Array.from(allCurrencies).sort();

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
            {/* Contact Info */}
            <div className="space-y-3">
              {vendor.vendor_email && (
                <div className="flex items-start gap-3">
                  <Mail size={18} className="text-primary-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-text-secondary uppercase tracking-wide">Email</p>
                    <a href={`mailto:${vendor.vendor_email}`} className="text-sm font-medium text-primary-600 hover:underline">
                      {vendor.vendor_email}
                    </a>
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

            {/* Address & Website */}
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

      {/* Resources and Contracts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {/* Resources Card */}
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
                            <div>
                              <Link to={`/vendors/${id}/resources/${r.id}`} className="font-medium text-primary-600 hover:underline">
                                {r.vendorresource_name} {r.vendorresource_lastname}
                              </Link>
                              {r.vendorresource_middlename && (
                                <span className="text-text-secondary ml-1">{r.vendorresource_middlename}</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-3">
                          {r.vendorresource_email ? (
                            <a href={`mailto:${r.vendorresource_email}`} className="text-sm text-primary-600 hover:underline">{r.vendorresource_email}</a>
                          ) : (
                            <span className="text-text-secondary">-</span>
                          )}
                        </td>
                        <td className="px-6 py-3 text-text-secondary">{r.vendorresource_phone || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {contracts.length === 0 ? (
            <Card>
              <p className="text-center py-8 text-text-secondary">No contracts for this vendor</p>
            </Card>
          ) : (
            <div className="space-y-6">
              {contracts.map(contract => {
            const roles = contractRoles[contract.id] || [];
            return (
              <Card key={contract.id} title={contract.contract_name} noPadding>
                <div className="px-6 py-3 border-b border-border bg-surface/30 text-sm text-text-secondary">
                  <span>{formatDate(contract.contract_start_date)} – {formatDate(contract.contract_end_date)}</span>
                </div>

                {roles.length === 0 ? (
                  <p className="px-6 py-8 text-center text-text-secondary text-sm">No roles defined for this contract</p>
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
                          <th className="px-6 py-3 text-left font-medium text-text-secondary bg-surface/30"></th>
                          {seniorities.map(sen =>
                            currencies.map(curr => (
                              <th key={`${sen}-${curr}`} className="px-3 py-2 text-center text-xs font-medium text-text-secondary bg-surface/30">
                                {curr}
                              </th>
                            ))
                          )}
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
                              {seniorities.map(sen =>
                                currencies.map(curr => {
                                  const rate = rates.find(r => r.seniority_description === sen && r.currency_name === curr);
                                  return (
                                    <td key={`${sen}-${curr}`} className="px-3 py-3 text-center text-text-secondary border-l border-border">
                                      {rate ? (
                                        <span className="font-medium text-text-primary">
                                          {rate.currency_symbol || ''}{rate.vendorrolerate_rate?.toFixed(2)}
                                        </span>
                                      ) : (
                                        <span className="text-text-secondary text-xs">-</span>
                                      )}
                                    </td>
                                  );
                                })
                              )}
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
          )}
        </div>

        {/* Projects Sidebar */}
        <div className="space-y-6">
          {/* Total POs Card */}
          <Card>
            <div>
              <p className="text-sm text-text-secondary">Total Purchase Orders</p>
              <p className="text-2xl font-bold text-text-primary mt-2">{formatCurrency(totalPoAmount)}</p>
              {poCurrencies.length > 0 && (
                <p className="text-xs text-text-secondary mt-2">
                  {poCurrencies.length === 1 ? poCurrencies[0] : poCurrencies.join(', ')}
                </p>
              )}
            </div>
          </Card>

          <Card title="Projects" noPadding>
            {projects.length === 0 ? (
              <p className="px-6 py-8 text-center text-text-secondary text-sm">No projects using this vendor</p>
            ) : (
              <div className="divide-y divide-border">
                {projects.map(project => (
                  <Link
                    key={project.id}
                    to={`/projects/${project.id}`}
                    className="block px-6 py-3 hover:bg-surface/30 transition-colors"
                  >
                    <div className="flex items-start gap-2">
                      <FolderKanban size={16} className="text-primary-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-primary-600 hover:text-primary-700 truncate">{project.project_name}</p>
                        <p className="text-xs text-text-secondary mt-1">{project.division_name || 'No division'}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
