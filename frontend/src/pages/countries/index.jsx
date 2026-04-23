import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Globe, FolderKanban } from 'lucide-react';
import { getCountriesWithProjects } from '../../api/entitiesApi';
import Card from '../../commoncomponents/Card';
import LoadingSpinner from '../../commoncomponents/LoadingSpinner';
import SearchInput from '../../commoncomponents/SearchInput';

export default function CountriesPage() {
  const [allItems, setAllItems] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    getCountriesWithProjects()
      .then(r => {
        const data = r.data.data || [];
        setAllItems(data);
        setItems(data);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!search.trim()) {
      setItems(allItems);
      return;
    }
    const q = search.toLowerCase();
    setItems(allItems.filter(c =>
      c.short_name?.toLowerCase().includes(q) ||
      c.official_name?.toLowerCase().includes(q) ||
      c.ISO2?.toLowerCase().includes(q) ||
      c.ISO3?.toLowerCase().includes(q)
    ));
  }, [search, allItems]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Countries</h1>
          <p className="text-sm text-text-secondary">Countries with active projects</p>
        </div>
      </div>

      <Card noPadding>
        <div className="border-b border-border px-6 py-4">
          <div className="w-64">
            <SearchInput value={search} onChange={setSearch} placeholder="Search countries..." />
          </div>
        </div>

        {loading ? <LoadingSpinner className="py-12" /> : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface/50">
                <th className="px-6 py-3 text-left font-medium text-text-secondary">Country</th>
                <th className="px-6 py-3 text-left font-medium text-text-secondary">ISO</th>
                <th className="px-6 py-3 text-left font-medium text-text-secondary">Official Name</th>
                <th className="px-6 py-3 text-right font-medium text-text-secondary">Projects</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-text-secondary">
                    No countries with projects found
                  </td>
                </tr>
              ) : items.map(country => (
                <tr key={country.UN_country_code} className="border-b border-border last:border-0 hover:bg-surface/30 transition-colors">
                  <td className="px-6 py-3 font-medium">
                    <Link
                      to={`/countries/${country.UN_country_code}`}
                      className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700"
                    >
                      <Globe size={15} className="text-primary-400 shrink-0" />
                      {country.short_name}
                    </Link>
                  </td>
                  <td className="px-6 py-3 text-text-secondary font-mono text-xs">
                    {country.ISO2} / {country.ISO3}
                  </td>
                  <td className="px-6 py-3 text-text-secondary">{country.official_name || '-'}</td>
                  <td className="px-6 py-3 text-right">
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary-500/10 px-2.5 py-0.5 text-xs font-semibold text-primary-600">
                      <FolderKanban size={12} />
                      {country.project_count}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
