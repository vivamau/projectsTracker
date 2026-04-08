import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Pencil, Trash2, Plus, MapPin, Calendar, User, Users, Target, DollarSign, Settings2 } from 'lucide-react';
import {
  getProject, deleteProject,
  getHealthStatuses, createHealthStatus,
  getCompletions, createCompletion, deleteCompletion,
  getBudgets, createBudget, deleteBudget,
  getVendorResources, getActivities,
  getTecStacks, syncTecStacks,
  getProjectAssignments, syncProjectAssignments
} from '../../api/projectsApi';
import { getCurrencies, getHealthStatusTypes } from '../../api/entitiesApi';
import { useAuth } from '../../hooks/useAuth';
import Card from '../../commoncomponents/Card';
import StatusBadge from '../../commoncomponents/StatusBadge';
import ProjectStatusBadge from '../../commoncomponents/ProjectStatusBadge';
import ConfirmDialog from '../../commoncomponents/ConfirmDialog';
import Modal from '../../commoncomponents/Modal';
import LoadingSpinner from '../../commoncomponents/LoadingSpinner';
import MilestoneTimeline from './components/MilestoneTimeline';
import ActivitiesChart from './components/ActivitiesChart';
import Map from './components/Map';

export default function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin, user } = useAuth();
  const [project, setProject] = useState(null);
  // true for admin/superadmin AND for contributors who are PM or SA on this project
  const canEditProject = isAdmin || (
    project !== null && (
      project.role_assignments?.some(ra => ra.user_id === user?.id)
    )
  );
  const [healthStatuses, setHealthStatuses] = useState([]);
  const [completions, setCompletions] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [healthStatusTypes, setHealthStatusTypes] = useState([]);
  const [vendorResources, setVendorResources] = useState([]);
  const [activities, setActivities] = useState([]);
  const [allTecStacks, setAllTecStacks] = useState([]);
  const [tecStackModal, setTecStackModal] = useState(false);
  const [selectedTecStackIds, setSelectedTecStackIds] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [assignmentModal, setAssignmentModal] = useState(false);
  const [editingAssignments, setEditingAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [healthModal, setHealthModal] = useState(false);
  const [completionModal, setCompletionModal] = useState(false);
  const [budgetModal, setBudgetModal] = useState(false);
  const [healthForm, setHealthForm] = useState({ healthstatus_value: 3, healthstatus_comment: '' });
  const [completionForm, setCompletionForm] = useState({ completion_value: '', completion_comment: '', completion_start_date: '', completion_end_date: '' });
  const [budgetForm, setBudgetForm] = useState({ budget_amount: '', currency_id: '', budget_start_date: '', budget_end_date: '' });

  useEffect(() => {
    Promise.all([
      getProject(id).then(r => setProject(r.data.data)),
      getHealthStatuses(id).then(r => setHealthStatuses(r.data.data)),
      getCompletions(id).then(r => setCompletions(r.data.data)),
      getBudgets(id).then(r => setBudgets(r.data.data)),
      getCurrencies().then(r => setCurrencies(r.data.data)),
      getVendorResources(id).then(r => setVendorResources(r.data.data)),
      getActivities(id).then(r => setActivities(r.data.data)).catch(() => {}),
      getTecStacks().then(r => setAllTecStacks(r.data.data)).catch(() => {}),
      getProjectAssignments(id).then(r => setAssignments(r.data.data)).catch(() => {}),
      getHealthStatusTypes().then(r => setHealthStatusTypes(r.data.data)).catch(() => {})
    ])
      .catch(() => navigate('/projects'))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const handleOpenAssignmentModal = () => {
    setEditingAssignments(assignments.map(a => ({
      vendorresource_id: a.vendorresource_id,
      pvr_percentage: a.pvr_percentage,
      pvr_active: a.pvr_active,
      vendorresource_name: a.vendorresource_name,
      vendorresource_lastname: a.vendorresource_lastname,
      vendor_name: a.vendor_name
    })));
    setAssignmentModal(true);
  };

  const handleSaveAssignments = async () => {
    await syncProjectAssignments(id, editingAssignments.map(a => ({
      vendorresource_id: a.vendorresource_id,
      pvr_percentage: a.pvr_percentage,
      pvr_active: a.pvr_active
    })));
    const res = await getProjectAssignments(id);
    setAssignments(res.data.data);
    setAssignmentModal(false);
  };

  const handleSaveTecStacks = async () => {
    await syncTecStacks(id, selectedTecStackIds);
    const res = await getProject(id);
    setProject(res.data.data);
    setTecStackModal(false);
  };

  const handleDelete = async () => {
    await deleteProject(id);
    navigate('/projects');
  };

  const handleAddHealth = async (e) => {
    e.preventDefault();
    await createHealthStatus(id, {
      healthstatus_value: parseInt(healthForm.healthstatus_value),
      healthstatus_comment: healthForm.healthstatus_comment
    });
    const [hsRes, pRes] = await Promise.all([getHealthStatuses(id), getProject(id)]);
    setHealthStatuses(hsRes.data.data);
    setProject(pRes.data.data);
    setHealthModal(false);
    setHealthForm({ healthstatus_value: 3, healthstatus_comment: '' });
  };

  const handleAddCompletion = async (e) => {
    e.preventDefault();
    const data = {
      completion_value: parseInt(completionForm.completion_value),
      completion_comment: completionForm.completion_comment
    };
    if (completionForm.completion_start_date) data.completion_start_date = new Date(completionForm.completion_start_date).getTime();
    if (completionForm.completion_end_date) data.completion_end_date = new Date(completionForm.completion_end_date).getTime();
    await createCompletion(id, data);
    const res = await getCompletions(id);
    setCompletions(res.data.data);
    setCompletionModal(false);
    setCompletionForm({ completion_value: '', completion_comment: '', completion_start_date: '', completion_end_date: '' });
  };

  const handleDeleteCompletion = async (completionId) => {
    await deleteCompletion(id, completionId);
    const res = await getCompletions(id);
    setCompletions(res.data.data);
  };

  const handleAddBudget = async (e) => {
    e.preventDefault();
    const data = {
      budget_amount: parseFloat(budgetForm.budget_amount),
      currency_id: budgetForm.currency_id ? parseInt(budgetForm.currency_id) : null
    };
    if (budgetForm.budget_start_date) data.budget_start_date = new Date(budgetForm.budget_start_date).getTime();
    if (budgetForm.budget_end_date) data.budget_end_date = new Date(budgetForm.budget_end_date).getTime();
    await createBudget(id, data);
    const res = await getBudgets(id);
    setBudgets(res.data.data);
    setBudgetModal(false);
    setBudgetForm({ budget_amount: '', currency_id: '', budget_start_date: '', budget_end_date: '' });
  };

  const handleDeleteBudget = async (budgetId) => {
    await deleteBudget(id, budgetId);
    const res = await getBudgets(id);
    setBudgets(res.data.data);
  };

  const formatDate = (ts) => {
    if (!ts) return '-';
    return new Date(ts).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatCurrency = (amount, currencyName) => {
    if (amount === null || amount === undefined) return '-';
    const formatted = Number(amount).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    return currencyName ? `${formatted} ${currencyName}` : formatted;
  };

  // Derive current completion %
  const latestCompletion = completions.length > 0 ? completions[0] : null;
  const completionPercent = latestCompletion ? latestCompletion.completion_value : 0;
  const budgetTotal = budgets.reduce((sum, b) => sum + (b.budget_amount || 0), 0);

  if (loading) return <LoadingSpinner size="lg" className="mt-20" />;
  if (!project) return null;

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-text-primary">{project.project_name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <ProjectStatusBadge status={project.project_status_name} />
            <StatusBadge value={project.latest_health_status} name={project.latest_health_status_name} />
            {project.division_name && (
              <Link
                to={`/divisions/${project.division_id}`}
                className="text-sm text-primary-500 hover:text-primary-600 transition-colors underline"
              >
                {project.division_name}
              </Link>
            )}
          </div>
        </div>
        {(canEditProject || isAdmin) && (
          <div className="flex gap-2">
            {canEditProject && (
              <Link
                to={`/projects/${id}/edit`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border-dark px-3 py-2 text-sm font-medium hover:bg-surface transition-colors"
              >
                <Pencil size={15} /> Edit
              </Link>
            )}
            {isAdmin && (
              <button
                onClick={() => setConfirmDelete(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-error-500 px-3 py-2 text-sm font-medium text-error-500 hover:bg-error-50 transition-colors"
              >
                <Trash2 size={15} /> Delete
              </button>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main info */}
        <div className="lg:col-span-2 space-y-6">
          {activities.length > 0 && (
            <Card title="Activities">
              <ActivitiesChart activities={activities} />
            </Card>
          )}

          <Card title="Project Details">
            <div className="space-y-4">
              {project.project_description && (
                <div>
                  <label className="text-xs font-semibold uppercase text-text-secondary">Description</label>
                  <p className="mt-1 text-sm text-text-primary whitespace-pre-wrap">{project.project_description}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <InfoItem icon={Calendar} label="Plan Date" value={formatDate(project.project_plan_date)} />
                <InfoItem icon={Calendar} label="Start Date" value={formatDate(project.project_start_date)} />
                <InfoItem icon={Calendar} label="End Date" value={formatDate(project.project_end_date)} />
                <InfoItem icon={User} label="Owner" value={project.owner_name ? `${project.owner_name} ${project.owner_lastname || ''}`.trim() : '-'} />
              </div>
              {project.initiative_name && (
                <InfoItem
                  label="Initiative"
                  value={
                    <Link
                      to={`/initiatives/${project.initiative_id}`}
                      className="text-primary-500 hover:text-primary-600 transition-colors underline"
                    >
                      {project.initiative_name}
                    </Link>
                  }
                />
              )}
              {project.deliverypath_name && (
                <InfoItem
                  label="Delivery Path"
                  value={
                    <Link
                      to={`/delivery-paths/${project.deliverypath_id}`}
                      className="text-primary-500 hover:text-primary-600 transition-colors underline"
                    >
                      {project.deliverypath_name}
                    </Link>
                  }
                />
              )}
            </div>
          </Card>

          {/* Completion / Milestones */}
          <Card
            title="Milestones"
            extra={
              canEditProject && (
                <button
                  onClick={() => setCompletionModal(true)}
                  className="inline-flex items-center gap-1 rounded-lg bg-primary-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-600 transition-colors"
                >
                  <Plus size={14} /> Add Milestone
                </button>
              )
            }
          >
            {/* Progress bar */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium text-text-primary flex items-center gap-1.5">
                  <Target size={14} className="text-primary-500" /> Completion
                </span>
                <span className="text-sm font-bold text-primary-600">{completionPercent}%</span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-surface overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${completionPercent}%`,
                    backgroundColor: completionPercent === 100 ? 'var(--color-success-500)' : 'var(--color-primary-500)'
                  }}
                />
              </div>
            </div>

            <MilestoneTimeline
              completions={completions}
              isAdmin={canEditProject}
              onDelete={handleDeleteCompletion}
              formatDate={formatDate}
            />
          </Card>

          {/* Health Status Timeline */}
          <Card
            title="Health Status History"
            extra={
              canEditProject && (
                <button
                  onClick={() => setHealthModal(true)}
                  className="inline-flex items-center gap-1 rounded-lg bg-primary-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-600 transition-colors"
                >
                  <Plus size={14} /> Add Status
                </button>
              )
            }
          >
            {healthStatuses.length === 0 ? (
              <p className="text-sm text-text-secondary py-4 text-center">No health status records</p>
            ) : (
              <div className="space-y-3">
                {healthStatuses.map((hs, i) => (
                  <div key={hs.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <StatusDot value={hs.healthstatus_value} />
                      {i < healthStatuses.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
                    </div>
                    <div className="pb-3">
                      <div className="flex items-center gap-2">
                        <StatusBadge value={hs.healthstatus_value} name={hs.healthstatus_name} />
                        <span className="text-xs text-text-secondary">{formatDate(hs.healthstatus_create_date)}</span>
                      </div>
                      {hs.healthstatus_comment && (
                        <p className="mt-1 text-sm text-text-secondary">{hs.healthstatus_comment}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Role Assignments (Project Managers, Solution Architects, etc.) */}
          {(() => {
            const byRole = {};
            (project.role_assignments || []).forEach(ra => {
              if (!byRole[ra.role_name]) byRole[ra.role_name] = [];
              byRole[ra.role_name].push(ra);
            });
            const roleNames = Object.keys(byRole);
            if (roleNames.length === 0) return null;
            return (
              <div className={`grid gap-6 ${roleNames.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                {roleNames.map(roleName => (
                  <Card key={roleName} title={roleName + 's'}>
                    <div className="space-y-2">
                      {byRole[roleName].map(ra => (
                        <div key={ra.id} className="flex items-center gap-2.5">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-50 text-xs font-bold text-primary-600">
                            {(ra.user_name?.[0] || '') + (ra.user_lastname?.[0] || '')}
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-text-primary truncate">{ra.user_name} {ra.user_lastname}</p>
                            <p className="text-xs text-text-secondary truncate">
                              {ra.user_email}
                              {ra.division_name && <span className="ml-1.5 text-primary-500">· {ra.division_name}</span>}
                            </p>
                            <p className="text-xs text-text-secondary">
                              {ra.assignment_start_date && (
                                <span>From {new Date(ra.assignment_start_date).toLocaleDateString()}</span>
                              )}
                              {ra.assignment_end_date && (
                                <span> · To {new Date(ra.assignment_end_date).toLocaleDateString()}</span>
                              )}
                              {ra.assignment_percentage != null && (
                                <span>{ra.assignment_start_date || ra.assignment_end_date ? ' · ' : ''}{ra.assignment_percentage}%</span>
                              )}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                ))}
              </div>
            );
          })()}

          {/* Vendor Resources */}
          <Card
            title="Vendor Resources"
            extra={canEditProject ? (
              <button
                onClick={handleOpenAssignmentModal}
                className="flex items-center gap-1 text-xs text-text-secondary hover:text-primary-500 transition-colors"
              >
                <Settings2 size={13} />
                Edit
              </button>
            ) : null}
          >
            {(!assignments || assignments.length === 0) ? (
              <p className="text-sm text-text-secondary">No vendor resources assigned</p>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {assignments.map(a => (
                  <div key={a.vendorresource_id} className="flex items-start gap-2 rounded-lg border border-border p-2.5">
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${a.pvr_active === 'Yes' ? 'bg-warning-50 text-warning-600' : 'bg-surface text-text-secondary border border-border'}`}>
                      {(a.vendorresource_name?.[0] || '') + (a.vendorresource_lastname?.[0] || '')}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-text-primary truncate leading-tight">
                        {a.vendorresource_name} {a.vendorresource_lastname}
                        {a.pvr_active !== 'Yes' && <span className="ml-1 text-xs font-normal text-text-secondary">(inactive)</span>}
                      </p>
                      <p className="text-xs text-text-secondary truncate">
                        {a.vendor_name}
                      </p>
                      {a.pvr_percentage < 100 && (
                        <span className="mt-0.5 inline-block rounded-full bg-primary-50 px-1.5 py-0.5 text-xs text-primary-600 dark:bg-primary-900/30 dark:text-primary-300">
                          {a.pvr_percentage}%
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Budgets */}
          <Card
            title="Budgets"
            extra={
              canEditProject && (
                <button
                  onClick={() => setBudgetModal(true)}
                  className="inline-flex items-center gap-1 rounded-lg bg-primary-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-600 transition-colors"
                >
                  <Plus size={14} /> Add
                </button>
              )
            }
          >
            {budgets.length === 0 ? (
              <p className="text-sm text-text-secondary">No budgets allocated</p>
            ) : (
              <div className="space-y-3">
                {budgets.map(b => (
                  <div key={b.id} className="flex items-start justify-between rounded-lg border border-border px-3 py-2.5">
                    <div>
                      <Link to={`/budgets/${b.id}`} className="text-sm font-semibold text-primary-500 hover:text-primary-600 hover:underline flex items-center gap-1.5">
                        <DollarSign size={13} className="text-success-500" />
                        {formatCurrency(b.budget_amount, b.currency_name)}
                      </Link>
                      <p className="text-xs text-text-secondary mt-0.5">
                        {b.budget_start_date && b.budget_end_date
                          ? `${formatDate(b.budget_start_date)} – ${formatDate(b.budget_end_date)}`
                          : formatDate(b.budget_create_date)
                        }
                      </p>
                    </div>
                    {canEditProject && (
                      <button
                        onClick={() => handleDeleteBudget(b.id)}
                        className="text-text-secondary hover:text-error-500 transition-colors p-1"
                        title="Remove budget"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
                {budgets.length > 1 && (
                  <div className="border-t border-border pt-2 flex justify-between text-sm">
                    <span className="font-medium text-text-secondary">Total</span>
                    <span className="font-bold text-text-primary">{budgetTotal.toLocaleString('en-US')}</span>
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Tech Stack */}
          {(() => {
            const typeConfig = {
              fe:   { label: 'Frontend', color: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
              be:   { label: 'Backend',  color: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
              db:   { label: 'Database', color: 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300' },
              mob:  { label: 'Mobile',   color: 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
              none: { label: 'Other',    color: 'bg-surface text-text-secondary border border-border' },
            };
            const canEdit = canEditProject;
            const stacks = project.tec_stacks || [];
            const groups = stacks.reduce((acc, ts) => {
              const key = ts.tec_stack_type || 'none';
              if (!acc[key]) acc[key] = [];
              acc[key].push(ts);
              return acc;
            }, {});
            return (
              <Card
                title="Tech Stack"
                extra={canEdit && (
                  <button
                    onClick={() => {
                      setSelectedTecStackIds(stacks.map(ts => ts.id));
                      setTecStackModal(true);
                    }}
                    className="inline-flex items-center gap-1 rounded-lg p-1.5 text-text-secondary hover:bg-surface hover:text-primary-500 transition-colors"
                    title="Edit tech stack"
                  >
                    <Settings2 size={15} />
                  </button>
                )
                }
              >
                {stacks.length === 0 ? (
                  <p className="text-sm text-text-secondary">No tech stack available yet</p>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(groups).map(([type, items]) => {
                      const { label, color } = typeConfig[type] || typeConfig.none;
                      return (
                        <div key={type}>
                          <p className="mb-1.5 text-xs font-semibold uppercase text-text-secondary">{label}</p>
                          <div className="flex flex-wrap gap-2">
                            {items.map(ts => (
                              <span key={ts.id} className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${color}`}>
                                {ts.tec_stack_name}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            );
          })()}

          {/* Countries */}
          <Card title="Countries">
            {(!project.countries || project.countries.length === 0) ? (
              <p className="text-sm text-text-secondary">No countries linked</p>
            ) : (
              <Map countrylist={project.countries} />
            )}
          </Card>

          {/* Supporting Divisions */}
          <Card title="Supporting Divisions">
            {(!project.supporting_divisions || project.supporting_divisions.length === 0) ? (
              <p className="text-sm text-text-secondary">No supporting divisions</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {project.supporting_divisions.map(d => (
                  <Link
                    key={d.id}
                    to={`/divisions/${d.id}`}
                    className="inline-flex items-center rounded-full bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-700 hover:bg-primary-100 transition-colors"
                  >
                    {d.division_name}
                  </Link>
                ))}
              </div>
            )}
          </Card>

          {/* Metadata */}
          <Card title="Metadata">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-text-secondary">Created</span>
                <span className="font-medium">{formatDate(project.project_create_date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Updated</span>
                <span className="font-medium">{formatDate(project.project_update_date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">ID</span>
                <span className="font-mono text-text-secondary">#{project.id}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Delete confirm */}
      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        title="Delete Project"
        message={`Are you sure you want to delete "${project.project_name}"?`}
      />

      {/* Add Health Status Modal */}
      <Modal open={healthModal} onClose={() => setHealthModal(false)} title="Add Health Status">
        <form onSubmit={handleAddHealth} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Status</label>
            <select
              value={healthForm.healthstatus_value}
              onChange={e => setHealthForm(f => ({ ...f, healthstatus_value: e.target.value }))}
              className="w-full rounded-lg border border-border-dark bg-surface px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 appearance-none"
            >
              {healthStatusTypes.length > 0
                ? healthStatusTypes.map(t => (
                    <option key={t.id} value={t.id}>{t.healthstatus_name}</option>
                  ))
                : <>
                    <option value={3}>On Track</option>
                    <option value={2}>Needs Attention</option>
                    <option value={1}>At Risk</option>
                  </>
              }
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Comment</label>
            <textarea
              value={healthForm.healthstatus_comment}
              onChange={e => setHealthForm(f => ({ ...f, healthstatus_comment: e.target.value }))}
              rows={3}
              className="w-full rounded-lg border border-border-dark px-3 py-2 text-sm outline-none focus:border-primary-500 resize-none"
              placeholder="Optional comment..."
            />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setHealthModal(false)} className="rounded-lg border border-border-dark px-4 py-2 text-sm font-medium hover:bg-surface transition-colors">
              Cancel
            </button>
            <button type="submit" className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 transition-colors">
              Add Status
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Completion Modal */}
      <Modal open={completionModal} onClose={() => setCompletionModal(false)} title="Add Milestone">
        <form onSubmit={handleAddCompletion} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Completion %</label>
            <input
              type="number"
              min="0"
              max="100"
              value={completionForm.completion_value}
              onChange={e => setCompletionForm(f => ({ ...f, completion_value: e.target.value }))}
              required
              className="w-full rounded-lg border border-border-dark bg-surface px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 appearance-none"
              placeholder="e.g. 50"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Description</label>
            <textarea
              value={completionForm.completion_comment}
              onChange={e => setCompletionForm(f => ({ ...f, completion_comment: e.target.value }))}
              rows={3}
              className="w-full rounded-lg border border-border-dark px-3 py-2 text-sm outline-none focus:border-primary-500 resize-none"
              placeholder="Milestone description..."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Start Date</label>
              <input
                type="date"
                value={completionForm.completion_start_date}
                onChange={e => setCompletionForm(f => ({ ...f, completion_start_date: e.target.value }))}
                className="w-full rounded-lg border border-border-dark bg-surface px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">End Date</label>
              <input
                type="date"
                value={completionForm.completion_end_date}
                onChange={e => setCompletionForm(f => ({ ...f, completion_end_date: e.target.value }))}
                className="w-full rounded-lg border border-border-dark bg-surface px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setCompletionModal(false)} className="rounded-lg border border-border-dark px-4 py-2 text-sm font-medium hover:bg-surface transition-colors">
              Cancel
            </button>
            <button type="submit" className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 transition-colors">
              Add Milestone
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Budget Modal */}
      <Modal open={budgetModal} onClose={() => setBudgetModal(false)} title="Add Budget">
        <form onSubmit={handleAddBudget} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Amount</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={budgetForm.budget_amount}
              onChange={e => setBudgetForm(f => ({ ...f, budget_amount: e.target.value }))}
              required
              className="w-full rounded-lg border border-border-dark bg-surface px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 appearance-none"
              placeholder="e.g. 50000"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Currency</label>
            <select
              value={budgetForm.currency_id}
              onChange={e => setBudgetForm(f => ({ ...f, currency_id: e.target.value }))}
              className="w-full rounded-lg border border-border-dark bg-surface px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 appearance-none"
            >
              <option value="">Select currency</option>
              {currencies.map(c => (
                <option key={c.id} value={c.id}>{c.currency_name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Start Date</label>
              <input
                type="date"
                value={budgetForm.budget_start_date}
                onChange={e => setBudgetForm(f => ({ ...f, budget_start_date: e.target.value }))}
                className="w-full rounded-lg border border-border-dark bg-surface px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 appearance-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">End Date</label>
              <input
                type="date"
                value={budgetForm.budget_end_date}
                onChange={e => setBudgetForm(f => ({ ...f, budget_end_date: e.target.value }))}
                className="w-full rounded-lg border border-border-dark bg-surface px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 appearance-none"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setBudgetModal(false)} className="rounded-lg border border-border-dark px-4 py-2 text-sm font-medium hover:bg-surface transition-colors">
              Cancel
            </button>
            <button type="submit" className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 transition-colors">
              Add Budget
            </button>
          </div>
        </form>
      </Modal>

      {/* Assignments modal */}
      <Modal open={assignmentModal} onClose={() => setAssignmentModal(false)} title="Edit Vendor Resource Assignments">
        <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
          {editingAssignments.length === 0 && (
            <p className="text-sm text-text-secondary">No assignments to edit.</p>
          )}
          {editingAssignments.map((a, idx) => (
            <div key={a.vendorresource_id} className="flex items-center gap-3 rounded-lg border border-border p-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-text-primary truncate">
                  {a.vendorresource_name} {a.vendorresource_lastname}
                </p>
                <p className="text-xs text-text-secondary">{a.vendor_name}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={a.pvr_percentage}
                  onChange={e => setEditingAssignments(prev => prev.map((x, i) => i === idx ? { ...x, pvr_percentage: parseInt(e.target.value) || 100 } : x))}
                  className="w-16 rounded border border-border-dark bg-surface px-2 py-1 text-xs text-right outline-none focus:border-primary-500"
                />
                <span className="text-xs text-text-secondary">%</span>
                <select
                  value={a.pvr_active}
                  onChange={e => setEditingAssignments(prev => prev.map((x, i) => i === idx ? { ...x, pvr_active: e.target.value } : x))}
                  className="rounded border border-border-dark bg-surface px-2 py-1 text-xs outline-none focus:border-primary-500"
                >
                  <option value="Yes">Active</option>
                  <option value="No">Inactive</option>
                </select>
                <button
                  type="button"
                  onClick={() => setEditingAssignments(prev => prev.filter((_, i) => i !== idx))}
                  className="text-error-500 hover:text-error-600 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => setAssignmentModal(false)}
            className="rounded-lg border border-border-dark px-4 py-2 text-sm font-medium hover:bg-surface transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveAssignments}
            className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-600 transition-colors"
          >
            Save
          </button>
        </div>
      </Modal>

      {/* Tech Stack picker modal */}
      <Modal open={tecStackModal} onClose={() => setTecStackModal(false)} title="Edit Tech Stack">
        <div className="space-y-4">
          {['fe', 'be', 'db', 'mob', 'none'].map(type => {
            const typeLabels = { fe: 'Frontend', be: 'Backend', db: 'Database', mob: 'Mobile', none: 'Other' };
            const stacks = allTecStacks.filter(ts => (ts.tec_stack_type || 'none') === type);
            if (stacks.length === 0) return null;
            return (
              <div key={type}>
                <p className="mb-2 text-xs font-semibold uppercase text-text-secondary">{typeLabels[type]}</p>
                <div className="flex flex-wrap gap-2">
                  {stacks.map(ts => {
                    const selected = selectedTecStackIds.includes(ts.id);
                    return (
                      <button
                        key={ts.id}
                        type="button"
                        onClick={() => setSelectedTecStackIds(prev =>
                          selected ? prev.filter(i => i !== ts.id) : [...prev, ts.id]
                        )}
                        className={`rounded-full px-3 py-1 text-xs font-medium transition-colors border ${
                          selected
                            ? 'bg-primary-500 text-white border-primary-500'
                            : 'bg-surface text-text-secondary border-border hover:border-primary-500 hover:text-primary-500'
                        }`}
                      >
                        {ts.tec_stack_name}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setTecStackModal(false)}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-surface transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveTecStacks}
              className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-600 transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function InfoItem({ icon: Icon, label, value }) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase text-text-secondary flex items-center gap-1">
        {Icon && <Icon size={12} />}
        {label}
      </label>
      <p className="mt-0.5 text-sm text-text-primary">{value}</p>
    </div>
  );
}

function StatusDot({ value }) {
  const colors = { 1: 'bg-error-500', 2: 'bg-warning-500', 3: 'bg-success-500' };
  return <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${colors[value] || 'bg-gray-300'}`} />;
}
