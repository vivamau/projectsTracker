import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, User, FolderKanban } from 'lucide-react';
import { getVendor, getVendorResourceProjects } from '../../api/entitiesApi';
import Card from '../../commoncomponents/Card';
import LoadingSpinner from '../../commoncomponents/LoadingSpinner';

export default function VendorResourceDetailPage() {
  const { vendorId, resourceId } = useParams();
  const navigate = useNavigate();
  const [resource, setResource] = useState(null);
  const [vendor, setVendor] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const vendorRes = await getVendor(vendorId);
        const vendorData = vendorRes.data.data;
        setVendor(vendorData);

        const res = (vendorData.resources || []).find(r => r.id === parseInt(resourceId));
        if (!res) {
          setLoading(false);
          return;
        }
        setResource(res);

        const projectsRes = await getVendorResourceProjects(vendorId, resourceId);
        setProjects(projectsRes.data.data || []);
      } catch (err) {
        console.error('Failed to fetch resource details:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [vendorId, resourceId]);

  if (loading) return <LoadingSpinner size="lg" className="mt-20" />;
  if (!resource) return <p className="text-center py-20 text-text-secondary">Resource not found</p>;

  const formatDate = (ts) => {
    if (!ts) return '-';
    return new Date(ts).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const fullName = `${resource.vendorresource_name}${resource.vendorresource_middlename ? ' ' + resource.vendorresource_middlename : ''} ${resource.vendorresource_lastname}`;

  return (
    <div>
      <div className="mb-6">
        <button
          onClick={() => navigate(`/vendors/${vendorId}`)}
          className="mb-3 inline-flex items-center gap-1 text-sm text-text-secondary hover:text-primary-500 transition-colors"
        >
          <ArrowLeft size={14} /> Back to {vendor?.vendor_name || 'Vendor'}
        </button>

        <div className="bg-surface rounded-lg border border-border p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary-100 text-primary-600">
              <User size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-text-primary">{fullName}</h1>
              <Link to={`/vendors/${vendorId}`} className="text-sm text-primary-600 hover:underline">
                {vendor?.vendor_name}
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {resource.vendorresource_email && (
              <div className="flex items-center gap-3">
                <Mail size={16} className="text-primary-500 flex-shrink-0" />
                <a href={`mailto:${resource.vendorresource_email}`} className="text-sm text-primary-600 hover:underline">
                  {resource.vendorresource_email}
                </a>
              </div>
            )}
            {resource.vendorresource_phone && (
              <div className="flex items-center gap-3">
                <Phone size={16} className="text-primary-500 flex-shrink-0" />
                <span className="text-sm">{resource.vendorresource_phone}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <Card title={`Projects (${projects.length})`} noPadding>
        {projects.length === 0 ? (
          <p className="text-center py-8 text-text-secondary text-sm">No projects assigned to this resource</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface/50">
                  <th className="px-6 py-3 text-left font-medium text-text-secondary">Project</th>
                  <th className="px-6 py-3 text-left font-medium text-text-secondary">Division</th>
                  <th className="px-6 py-3 text-left font-medium text-text-secondary">PO</th>
                  <th className="px-6 py-3 text-left font-medium text-text-secondary">Start</th>
                  <th className="px-6 py-3 text-left font-medium text-text-secondary">End</th>
                  <th className="px-6 py-3 text-right font-medium text-text-secondary">PO Items</th>
                </tr>
              </thead>
              <tbody>
                {projects.map(project => (
                  <tr key={project.project_id} className="border-b border-border last:border-0 hover:bg-surface/30 transition-colors">
                    <td className="px-6 py-3">
                      <Link to={`/projects/${project.project_id}`} className="font-medium text-primary-600 hover:underline">
                        {project.project_name}
                      </Link>
                      {project.project_description && (
                        <p className="text-xs text-text-secondary mt-0.5 line-clamp-1">{project.project_description}</p>
                      )}
                    </td>
                    <td className="px-6 py-3 text-text-secondary">{project.division_name || '-'}</td>
                    <td className="px-6 py-3 text-text-secondary">{project.po_description || '-'}</td>
                    <td className="px-6 py-3 text-text-secondary">{formatDate(project.project_start_date)}</td>
                    <td className="px-6 py-3 text-text-secondary">{formatDate(project.project_end_date)}</td>
                    <td className="px-6 py-3 text-right">
                      <span className="inline-flex items-center gap-1 bg-primary-50 text-primary-700 text-xs font-medium px-2 py-0.5 rounded-full">
                        <FolderKanban size={12} /> {project.item_count}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
