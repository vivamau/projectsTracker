import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Pencil, Trash2, Plus, MapPin, Calendar, User, Users, Target, DollarSign } from 'lucide-react';
import {
  getProject, deleteProject,
  getHealthStatuses, createHealthStatus,
  getCompletions, createCompletion, deleteCompletion,
  getBudgets, createBudget, deleteBudget,
  getVendorResources, getActivities
} from '../../api/projectsApi';
import { getCurrencies } from '../../api/entitiesApi';
import { useAuth } from '../../hooks/useAuth';
import Card from '../../commoncomponents/Card';
import StatusBadge from '../../commoncomponents/StatusBadge';
import ProjectStatusBadge from '../../commoncomponents/ProjectStatusBadge';
import ConfirmDialog from '../../commoncomponents/ConfirmDialog';
import Modal from '../../commoncomponents/Modal';
import LoadingSpinner from '../../commoncomponents/LoadingSpinner';
import MilestoneTimeline from './components/MilestoneTimeline';
import ActivitiesChart from './components/ActivitiesChart';

export default function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [project, setProject] = useState(null);
  const [healthStatuses, setHealthStatuses] = useState([]);
  const [completions, setCompletions] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [vendorResources, setVendorResources] = useState([]);
  const [activities, setActivities] = useState([]);
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
      getActivities(id).then(r => setActivities(r.data.data)).catch(() => {})
    ])
      .catch(() => navigate('/projects'))
      .finally(() => setLoading(false));
  }, [id, navigate]);

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
            <StatusBadge value={project.latest_health_status} />
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
        {isAdmin && (
          <div className="flex gap-2">
            <Link
              to={`/projects/${id}/edit`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border-dark px-3 py-2 text-sm font-medium hover:bg-surface transition-colors"
            >
              <Pencil size={15} /> Edit
            </Link>
            <button
              onClick={() => setConfirmDelete(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-error-500 px-3 py-2 text-sm font-medium text-error-500 hover:bg-error-50 transition-colors"
            >
              <Trash2 size={15} /> Delete
            </button>
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
              isAdmin && (
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
              isAdmin={isAdmin}
              onDelete={handleDeleteCompletion}
              formatDate={formatDate}
            />
          </Card>

          {/* Health Status Timeline */}
          <Card
            title="Health Status History"
            extra={
              isAdmin && (
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
                        <StatusBadge value={hs.healthstatus_value} />
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
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Budgets */}
          <Card
            title="Budgets"
            extra={
              isAdmin && (
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
                    {isAdmin && (
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

          {/* Project Managers */}
          <Card title="Project Managers">
            {(!project.project_managers || project.project_managers.length === 0) ? (
              <p className="text-sm text-text-secondary">No project managers assigned</p>
            ) : (
              <div className="space-y-2">
                {project.project_managers.map(pm => (
                  <div key={pm.id} className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-50 text-xs font-bold text-primary-600">
                      {(pm.user_name?.[0] || '') + (pm.user_lastname?.[0] || '')}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-text-primary">{pm.user_name} {pm.user_lastname}</p>
                      <p className="text-xs text-text-secondary">
                        {pm.user_email}
                        {pm.division_name && <span className="ml-1.5 text-primary-500">· {pm.division_name}</span>}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Solution Architects */}
          <Card title="Solution Architects">
            {(!project.solution_architects || project.solution_architects.length === 0) ? (
              <p className="text-sm text-text-secondary">No solution architects assigned</p>
            ) : (
              <div className="space-y-2">
                {project.solution_architects.map(sa => (
                  <div key={sa.id} className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-50 text-xs font-bold text-primary-600">
                      {(sa.user_name?.[0] || '') + (sa.user_lastname?.[0] || '')}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-text-primary">{sa.user_name} {sa.user_lastname}</p>
                      <p className="text-xs text-text-secondary">
                        {sa.user_email}
                        {sa.division_name && <span className="ml-1.5 text-primary-500">· {sa.division_name}</span>}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Vendor Resources */}
          <Card title="Vendor Resources">
            {(!vendorResources || vendorResources.length === 0) ? (
              <p className="text-sm text-text-secondary">No vendor resources assigned</p>
            ) : (
              <div className="space-y-2">
                {vendorResources.map(vr => (
                  <div key={vr.vendorresource_id} className="flex items-start gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-warning-50 text-xs font-bold text-warning-600">
                      {(vr.vendorresource_name?.[0] || '') + (vr.vendorresource_lastname?.[0] || '')}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-text-primary truncate">
                        {vr.vendorresource_name} {vr.vendorresource_lastname}
                      </p>
                      <p className="text-xs text-text-secondary truncate">
                        {vr.vendor_name}
                        {vr.vendorcontractrole_name && <span className="ml-1 text-primary-500">· {vr.vendorcontractrole_name}</span>}
                      </p>
                      {vr.vendorresource_email && (
                        <p className="text-xs text-text-secondary truncate">{vr.vendorresource_email}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Countries */}
          <Card title="Countries">
            {(!project.countries || project.countries.length === 0) ? (
              <p className="text-sm text-text-secondary">No countries linked</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {project.countries.map(c => (
                  <span key={c.UN_country_code} className="inline-flex items-center gap-1 rounded-full bg-surface px-2.5 py-1 text-xs font-medium text-text-primary">
                    <MapPin size={12} className="text-text-secondary" />
                    {c.short_name}
                  </span>
                ))}
              </div>
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
              <option value={3}>On Track</option>
              <option value={2}>Needs Attention</option>
              <option value={1}>At Risk</option>
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
