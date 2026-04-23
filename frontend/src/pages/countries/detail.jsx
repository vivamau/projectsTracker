import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, FolderKanban } from 'lucide-react';
import { getCountries, getCountryProjects } from '../../api/entitiesApi';
import Card from '../../commoncomponents/Card';
import LoadingSpinner from '../../commoncomponents/LoadingSpinner';
import StatusBadge from '../../commoncomponents/StatusBadge';

export default function CountryDetailPage() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [country, setCountry] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [countriesRes, projectsRes] = await Promise.all([
          getCountries(),
          getCountryProjects(code)
        ]);
        const found = (countriesRes.data.data || []).find(
          c => String(c.UN_country_code) === String(code)
        );
        setCountry(found || null);
        setProjects(projectsRes.data.data || []);
      } catch (err) {
        console.error('Failed to load country detail:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [code]);

  if (loading) return <LoadingSpinner size="lg" className="mt-20" />;
  if (!country) return (
    <div className="text-center py-20 text-text-secondary">Country not found</div>
  );

  const formatDate = (ts) => {
    if (!ts) return '-';
    return new Date(ts).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div>
      <div className="mb-6">
        <button
          onClick={() => navigate('/countries')}
          className="mb-3 inline-flex items-center gap-1 text-sm text-text-secondary hover:text-primary-500 transition-colors"
        >
          <ArrowLeft size={14} /> Back to Countries
        </button>

        <div className="bg-surface rounded-lg border border-border p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-text-primary mb-1">{country.short_name}</h1>
              {country.official_name && country.official_name !== country.short_name && (
                <p className="text-sm text-text-secondary mb-2">{country.official_name}</p>
              )}
              <div className="flex gap-3">
                <span className="rounded-md bg-surface-card border border-border px-2.5 py-0.5 text-xs font-mono font-semibold text-text-secondary">
                  {country.ISO2}
                </span>
                <span className="rounded-md bg-surface-card border border-border px-2.5 py-0.5 text-xs font-mono font-semibold text-text-secondary">
                  {country.ISO3}
                </span>
                {country.UNDP_country_code && (
                  <span className="rounded-md bg-surface-card border border-border px-2.5 py-0.5 text-xs font-mono font-semibold text-text-secondary">
                    UNDP: {country.UNDP_country_code}
                  </span>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-primary-500">{projects.length}</p>
              <p className="text-xs text-text-secondary uppercase tracking-wide">
                {projects.length === 1 ? 'Project' : 'Projects'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <Card title={`Projects deployed in ${country.short_name} (${projects.length})`} noPadding>
        {projects.length === 0 ? (
          <p className="px-6 py-8 text-center text-text-secondary">No projects in this country</p>
        ) : (
          <div className="divide-y divide-border">
            {projects.map(project => (
              <Link
                key={project.id}
                to={`/projects/${project.id}`}
                className="block px-6 py-4 hover:bg-surface/30 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <FolderKanban size={18} className="text-primary-500 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-primary-600 hover:text-primary-700 truncate">
                        {project.project_name}
                      </p>
                      <StatusBadge value={project.health_status} name={project.health_status_name} />
                      {project.project_status_name && (
                        <span className="text-xs text-text-secondary border border-border rounded px-1.5 py-0.5">
                          {project.project_status_name}
                        </span>
                      )}
                    </div>
                    {project.project_description && (
                      <p className="mt-1 text-xs text-text-secondary line-clamp-1">{project.project_description}</p>
                    )}
                    <div className="mt-1 flex gap-4 text-xs text-text-secondary">
                      {project.division_name && <span>Division: {project.division_name}</span>}
                      {project.project_start_date && <span>Start: {formatDate(project.project_start_date)}</span>}
                      {project.owner_name && (
                        <span>Owner: {project.owner_name} {project.owner_lastname}</span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
