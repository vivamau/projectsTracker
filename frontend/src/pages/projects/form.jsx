import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProject, createProject, updateProject, getProjectRoles } from '../../api/projectsApi';
import { getDivisions, getInitiatives, getDeliveryPaths, getCountries, getUsers } from '../../api/entitiesApi';
import Card from '../../commoncomponents/Card';
import UserAvatar from '../../commoncomponents/UserAvatar';
import LoadingSpinner from '../../commoncomponents/LoadingSpinner';

export default function ProjectFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [form, setForm] = useState({
    project_name: '',
    project_description: '',
    division_id: '',
    initiative_id: '',
    deliverypath_id: '',
    user_id: '',
    project_plan_date: '',
    project_start_date: '',
    project_end_date: '',
    country_codes: [],
    supporting_division_ids: [],
    role_assignments: []
  });
  const [divisions, setDivisions] = useState([]);
  const [initiatives, setInitiatives] = useState([]);
  const [deliveryPaths, setDeliveryPaths] = useState([]);
  const [countries, setCountries] = useState([]);
  const [users, setUsers] = useState([]);
  const [projectRoles, setProjectRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [countrySearch, setCountrySearch] = useState('');

  useEffect(() => {
    const loads = [
      getDivisions().then(r => setDivisions(r.data.data)),
      getInitiatives().then(r => setInitiatives(r.data.data)),
      getDeliveryPaths().then(r => setDeliveryPaths(r.data.data)),
      getCountries().then(r => setCountries(r.data.data)),
      getUsers({ limit: 100 }).then(r => setUsers(r.data.data)).catch(() => {}),
      getProjectRoles().then(r => setProjectRoles(r.data.data)).catch(() => {}),
    ];

    if (isEdit) {
      loads.push(
        getProject(id).then(r => {
          const p = r.data.data;
          setForm({
            project_name: p.project_name || '',
            project_description: p.project_description || '',
            division_id: p.division_id || '',
            initiative_id: p.initiative_id || '',
            deliverypath_id: p.deliverypath_id || '',
            user_id: p.user_id || '',
            project_plan_date: tsToInput(p.project_plan_date),
            project_start_date: tsToInput(p.project_start_date),
            project_end_date: tsToInput(p.project_end_date),
            country_codes: p.countries ? p.countries.map(c => c.UN_country_code) : [],
            supporting_division_ids: p.supporting_divisions ? p.supporting_divisions.map(d => d.id) : [],
            role_assignments: p.role_assignments ? p.role_assignments.map(ra => ({
              user_id: ra.user_id,
              project_role_id: ra.project_role_id,
              division_id: ra.division_id || '',
              start_date: tsToInput(ra.assignment_start_date),
              end_date: tsToInput(ra.assignment_end_date),
              percentage: ra.assignment_percentage ?? ''
            })) : []
          });
        })
      );
    }

    Promise.all(loads).finally(() => setLoading(false));
  }, [id, isEdit]);

  const tsToInput = (ts) => {
    if (!ts) return '';
    return new Date(ts).toISOString().split('T')[0];
  };

  const inputToTs = (val) => {
    if (!val) return null;
    return new Date(val).getTime();
  };

  const handleChange = (field, value) => {
    setForm(f => ({ ...f, [field]: value }));
  };

  const toggleCountry = (code) => {
    setForm(f => ({
      ...f,
      country_codes: f.country_codes.includes(code)
        ? f.country_codes.filter(c => c !== code)
        : [...f.country_codes, code]
    }));
  };

  const toggleSupportingDivision = (divId) => {
    setForm(f => ({
      ...f,
      supporting_division_ids: f.supporting_division_ids.includes(divId)
        ? f.supporting_division_ids.filter(d => d !== divId)
        : [...f.supporting_division_ids, divId]
    }));
  };

  const toggleRoleAssignment = (userId, roleId) => {
    setForm(f => {
      const exists = f.role_assignments.find(ra => ra.user_id === userId && ra.project_role_id === roleId);
      return {
        ...f,
        role_assignments: exists
          ? f.role_assignments.filter(ra => !(ra.user_id === userId && ra.project_role_id === roleId))
          : [...f.role_assignments, { user_id: userId, project_role_id: roleId, division_id: '', start_date: '', end_date: '', percentage: '' }]
      };
    });
  };

  const updateAssignmentField = (userId, roleId, field, value) => {
    setForm(f => ({
      ...f,
      role_assignments: f.role_assignments.map(ra =>
        ra.user_id === userId && ra.project_role_id === roleId ? { ...ra, [field]: field === 'division_id' ? (value ? parseInt(value) : null) : value } : ra
      )
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.project_name.trim()) {
      setError('Project name is required');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        project_name: form.project_name.trim(),
        project_description: form.project_description.trim(),
        division_id: form.division_id || null,
        initiative_id: form.initiative_id || null,
        deliverypath_id: form.deliverypath_id || null,
        user_id: form.user_id || null,
        project_plan_date: inputToTs(form.project_plan_date),
        project_start_date: inputToTs(form.project_start_date),
        project_end_date: inputToTs(form.project_end_date),
        country_codes: form.country_codes,
        supporting_division_ids: form.supporting_division_ids,
        role_assignments: form.role_assignments.map(ra => ({
          user_id: ra.user_id,
          project_role_id: ra.project_role_id,
          division_id: ra.division_id || null,
          start_date: inputToTs(ra.start_date),
          end_date: inputToTs(ra.end_date),
          percentage: ra.percentage !== '' ? parseInt(ra.percentage) : null
        }))
      };

      if (isEdit) {
        await updateProject(id, payload);
        navigate(`/projects/${id}`);
      } else {
        const res = await createProject(payload);
        navigate(`/projects/${res.data.data.id}`);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save project');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner size="lg" className="mt-20" />;

  const filteredCountries = countries.filter(c =>
    !countrySearch || c.short_name?.toLowerCase().includes(countrySearch.toLowerCase()) ||
    c.ISO2?.toLowerCase().includes(countrySearch.toLowerCase())
  );

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold">{isEdit ? 'Edit Project' : 'New Project'}</h1>
        <p className="text-sm text-text-secondary">
          {isEdit ? 'Update project details' : 'Create a new project'}
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          {error && (
            <div className="mb-4 rounded-lg bg-error-50 px-4 py-3 text-sm text-error-600">{error}</div>
          )}

          <div className="space-y-5">
            {/* Name */}
            <FormField label="Project Name" required>
              <input
                type="text"
                value={form.project_name}
                onChange={e => handleChange('project_name', e.target.value)}
                className="w-full rounded-lg border border-border-dark bg-surface px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 appearance-none"
                placeholder="Enter project name"
              />
            </FormField>

            {/* Description */}
            <FormField label="Description">
              <textarea
                value={form.project_description}
                onChange={e => handleChange('project_description', e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-border-dark px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 resize-none"
                placeholder="Project description..."
              />
            </FormField>

            {/* Dropdowns row */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Division">
                <select
                  value={form.division_id}
                  onChange={e => handleChange('division_id', e.target.value)}
                  className="w-full rounded-lg border border-border-dark bg-surface px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 appearance-none"
                >
                  <option value="">Select division</option>
                  {divisions.map(d => <option key={d.id} value={d.id}>{d.division_name}</option>)}
                </select>
              </FormField>

              <FormField label="Initiative">
                <select
                  value={form.initiative_id}
                  onChange={e => handleChange('initiative_id', e.target.value)}
                  className="w-full rounded-lg border border-border-dark bg-surface px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 appearance-none"
                >
                  <option value="">Select initiative</option>
                  {initiatives.map(i => <option key={i.id} value={i.id}>{i.initiative_name}</option>)}
                </select>
              </FormField>

              <FormField label="Delivery Path">
                <select
                  value={form.deliverypath_id}
                  onChange={e => handleChange('deliverypath_id', e.target.value)}
                  className="w-full rounded-lg border border-border-dark bg-surface px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 appearance-none"
                >
                  <option value="">Select delivery path</option>
                  {deliveryPaths.map(dp => <option key={dp.id} value={dp.id}>{dp.deliverypath_name}</option>)}
                </select>
              </FormField>

              <FormField label="Owner">
                <select
                  value={form.user_id}
                  onChange={e => handleChange('user_id', e.target.value)}
                  className="w-full rounded-lg border border-border-dark bg-surface px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 appearance-none"
                >
                  <option value="">Select owner</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.user_name} {u.user_lastname} ({u.user_email})
                    </option>
                  ))}
                </select>
              </FormField>
            </div>

            {/* Team — Role Assignments */}
            {projectRoles.map(role => (
              <FormField key={role.id} label={role.role_name + 's'}>
                {form.role_assignments.filter(ra => ra.project_role_id === role.id).length > 0 && (
                  <div className="mb-2 space-y-2">
                    {form.role_assignments.filter(ra => ra.project_role_id === role.id).map(ra => {
                      const u = users.find(usr => usr.id === ra.user_id);
                      return (
                        <div key={`${ra.user_id}-${ra.project_role_id}`} className="rounded-lg border border-primary-200 bg-primary-50 px-3 py-2 space-y-2">
                          <div className="flex items-center gap-2">
                            <UserAvatar seed={u?.user_email} name={u?.user_name} size={24} />
                            <span className="text-sm font-medium text-primary-700 min-w-[120px]">
                              {u ? `${u.user_name} ${u.user_lastname}` : `User #${ra.user_id}`}
                            </span>
                            <select
                              value={ra.division_id || ''}
                              onChange={e => updateAssignmentField(ra.user_id, role.id, 'division_id', e.target.value)}
                              className="flex-1 rounded border border-border-dark px-2 py-1 text-xs outline-none focus:border-primary-500"
                            >
                              <option value="">No division</option>
                              {divisions.map(d => <option key={d.id} value={d.id}>{d.division_name}</option>)}
                            </select>
                            <button type="button" onClick={() => toggleRoleAssignment(ra.user_id, role.id)} className="text-error-400 hover:text-error-600 text-lg leading-none">&times;</button>
                          </div>
                          <div className="flex items-center gap-2">
                            <label className="text-xs text-text-secondary w-8 shrink-0">From</label>
                            <input type="date" value={ra.start_date || ''} onChange={e => updateAssignmentField(ra.user_id, role.id, 'start_date', e.target.value)}
                              className="flex-1 rounded border border-border-dark bg-white px-2 py-1 text-xs outline-none focus:border-primary-500 appearance-none" />
                            <label className="text-xs text-text-secondary w-4 shrink-0">To</label>
                            <input type="date" value={ra.end_date || ''} onChange={e => updateAssignmentField(ra.user_id, role.id, 'end_date', e.target.value)}
                              className="flex-1 rounded border border-border-dark bg-white px-2 py-1 text-xs outline-none focus:border-primary-500 appearance-none" />
                            <label className="text-xs text-text-secondary w-4 shrink-0">%</label>
                            <input type="number" min="0" max="100" value={ra.percentage ?? ''} onChange={e => updateAssignmentField(ra.user_id, role.id, 'percentage', e.target.value)}
                              placeholder="0–100"
                              className="w-16 rounded border border-border-dark bg-white px-2 py-1 text-xs outline-none focus:border-primary-500" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="max-h-40 overflow-y-auto rounded-lg border border-border">
                  {users.map(u => (
                    <label key={u.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-surface cursor-pointer text-sm">
                      <input
                        type="checkbox"
                        checked={!!form.role_assignments.find(ra => ra.user_id === u.id && ra.project_role_id === role.id)}
                        onChange={() => toggleRoleAssignment(u.id, role.id)}
                        className="rounded border-border-dark text-primary-500 focus:ring-primary-500"
                      />
                      <span>{u.user_name} {u.user_lastname}</span>
                      <span className="text-text-secondary text-xs">({u.user_email})</span>
                    </label>
                  ))}
                </div>
              </FormField>
            ))}

            {/* Dates row */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <FormField label="Plan Date">
                <input type="date" value={form.project_plan_date} onChange={e => handleChange('project_plan_date', e.target.value)}
                  className="w-full rounded-lg border border-border-dark bg-surface px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 appearance-none" />
              </FormField>
              <FormField label="Start Date">
                <input type="date" value={form.project_start_date} onChange={e => handleChange('project_start_date', e.target.value)}
                  className="w-full rounded-lg border border-border-dark bg-surface px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 appearance-none" />
              </FormField>
              <FormField label="End Date">
                <input type="date" value={form.project_end_date} onChange={e => handleChange('project_end_date', e.target.value)}
                  className="w-full rounded-lg border border-border-dark bg-surface px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 appearance-none" />
              </FormField>
            </div>

            {/* Countries multi-select */}
            <FormField label="Countries">
              {form.country_codes.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {form.country_codes.map(code => {
                    const c = countries.find(ct => ct.UN_country_code === code);
                    return (
                      <span key={code} className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-medium text-primary-700">
                        {c?.short_name || code}
                        <button type="button" onClick={() => toggleCountry(code)} className="hover:text-error-500">&times;</button>
                      </span>
                    );
                  })}
                </div>
              )}
              <input
                type="text"
                placeholder="Search countries..."
                value={countrySearch}
                onChange={e => setCountrySearch(e.target.value)}
                className="w-full rounded-lg border border-border-dark px-3 py-2 text-sm outline-none focus:border-primary-500 mb-2"
              />
              <div className="max-h-40 overflow-y-auto rounded-lg border border-border">
                {filteredCountries.slice(0, 50).map(c => (
                  <label key={c.UN_country_code} className="flex items-center gap-2 px-3 py-1.5 hover:bg-surface cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={form.country_codes.includes(c.UN_country_code)}
                      onChange={() => toggleCountry(c.UN_country_code)}
                      className="rounded border-border-dark text-primary-500 focus:ring-primary-500"
                    />
                    <span className="text-text-secondary w-8">{c.ISO2}</span>
                    <span>{c.short_name}</span>
                  </label>
                ))}
              </div>
            </FormField>

            {/* Supporting Divisions multi-select */}
            <FormField label="Supporting Divisions">
              {form.supporting_division_ids.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {form.supporting_division_ids.map(divId => {
                    const d = divisions.find(div => div.id === divId);
                    return (
                      <span key={divId} className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-medium text-primary-700">
                        {d?.division_name || divId}
                        <button type="button" onClick={() => toggleSupportingDivision(divId)} className="hover:text-error-500">&times;</button>
                      </span>
                    );
                  })}
                </div>
              )}
              <div className="max-h-40 overflow-y-auto rounded-lg border border-border">
                {divisions
                  .filter(d => !form.division_id || d.id !== parseInt(form.division_id))
                  .map(d => (
                    <label key={d.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-surface cursor-pointer text-sm">
                      <input
                        type="checkbox"
                        checked={form.supporting_division_ids.includes(d.id)}
                        onChange={() => toggleSupportingDivision(d.id)}
                        className="rounded border-border-dark text-primary-500 focus:ring-primary-500"
                      />
                      <span>{d.division_name}</span>
                    </label>
                  ))}
              </div>
            </FormField>
          </div>

          {/* Actions */}
          <div className="mt-6 flex justify-end gap-3 border-t border-border pt-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="rounded-lg border border-border-dark px-4 py-2 text-sm font-medium hover:bg-surface transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-primary-500 px-6 py-2 text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-60 transition-colors"
            >
              {submitting ? 'Saving...' : isEdit ? 'Update Project' : 'Create Project'}
            </button>
          </div>
        </Card>
      </form>
    </div>
  );
}

function FormField({ label, required, children }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-text-primary">
        {label}
        {required && <span className="text-error-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
