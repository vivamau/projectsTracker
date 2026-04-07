import client from './client';

export const getProjects = (params) =>
  client.get('/projects', { params });

export const getProject = (id) =>
  client.get(`/projects/${id}`);

export const createProject = (data) =>
  client.post('/projects', data);

export const updateProject = (id, data) =>
  client.put(`/projects/${id}`, data);

export const deleteProject = (id) =>
  client.delete(`/projects/${id}`);

export const getProjectStats = () =>
  client.get('/projects/stats');

export const getHealthStatuses = (projectId) =>
  client.get(`/projects/${projectId}/health-statuses`);

export const createHealthStatus = (projectId, data) =>
  client.post(`/projects/${projectId}/health-statuses`, data);

// Completions (milestones)
export const getCompletions = (projectId) =>
  client.get(`/projects/${projectId}/completions`);

export const createCompletion = (projectId, data) =>
  client.post(`/projects/${projectId}/completions`, data);

export const updateCompletion = (projectId, completionId, data) =>
  client.put(`/projects/${projectId}/completions/${completionId}`, data);

export const deleteCompletion = (projectId, completionId) =>
  client.delete(`/projects/${projectId}/completions/${completionId}`);

// Budgets
export const getBudgets = (projectId) =>
  client.get(`/projects/${projectId}/budgets`);

export const getBudgetTotal = (projectId) =>
  client.get(`/projects/${projectId}/budgets/total`);

export const createBudget = (projectId, data) =>
  client.post(`/projects/${projectId}/budgets`, data);

export const updateBudget = (projectId, budgetId, data) =>
  client.put(`/projects/${projectId}/budgets/${budgetId}`, data);

export const deleteBudget = (projectId, budgetId) =>
  client.delete(`/projects/${projectId}/budgets/${budgetId}`);

// Project Managers
export const getProjectManagers = (projectId) =>
  client.get(`/projects/${projectId}/project-managers`);

export const syncProjectManagers = (projectId, projectManagers) =>
  client.put(`/projects/${projectId}/project-managers`, { project_managers: projectManagers });

export const getSolutionArchitects = (projectId) =>
  client.get(`/projects/${projectId}/solution-architects`);

export const syncSolutionArchitects = (projectId, solutionArchitects) =>
  client.put(`/projects/${projectId}/solution-architects`, { solution_architects: solutionArchitects });

// Budget detail & Purchase Orders
export const getAllBudgets = () =>
  client.get(`/budgets`);

export const getRecentBudgets = (limit = 5) =>
  client.get(`/budgets/recent`, { params: { limit } });

export const getBudget = (budgetId) =>
  client.get(`/budgets/${budgetId}`);

export const getPurchaseOrders = (budgetId) =>
  client.get(`/budgets/${budgetId}/purchase-orders`);

export const createPurchaseOrder = (budgetId, data) =>
  client.post(`/budgets/${budgetId}/purchase-orders`, data);

export const updatePurchaseOrder = (budgetId, poId, data) =>
  client.put(`/budgets/${budgetId}/purchase-orders/${poId}`, data);

export const deletePurchaseOrder = (budgetId, poId) =>
  client.delete(`/budgets/${budgetId}/purchase-orders/${poId}`);

// PO Items
export const getPurchaseOrderItems = (budgetId, poId) =>
  client.get(`/budgets/${budgetId}/purchase-orders/${poId}/items`);

export const createPurchaseOrderItem = (budgetId, poId, data) =>
  client.post(`/budgets/${budgetId}/purchase-orders/${poId}/items`, data);

export const updatePurchaseOrderItem = (budgetId, poId, itemId, data) =>
  client.put(`/budgets/${budgetId}/purchase-orders/${poId}/items/${itemId}`, data);

export const deletePurchaseOrderItem = (budgetId, poId, itemId) =>
  client.delete(`/budgets/${budgetId}/purchase-orders/${poId}/items/${itemId}`);

// PO Item Consumptions
export const getConsumptions = (budgetId, poId, itemId) =>
  client.get(`/budgets/${budgetId}/purchase-orders/${poId}/items/${itemId}/consumptions`);

export const createConsumption = (budgetId, poId, itemId, data) =>
  client.post(`/budgets/${budgetId}/purchase-orders/${poId}/items/${itemId}/consumptions`, data);

export const updateConsumption = (budgetId, poId, itemId, consumptionId, data) =>
  client.put(`/budgets/${budgetId}/purchase-orders/${poId}/items/${itemId}/consumptions/${consumptionId}`, data);

export const deleteConsumption = (budgetId, poId, itemId, consumptionId) =>
  client.delete(`/budgets/${budgetId}/purchase-orders/${poId}/items/${itemId}/consumptions/${consumptionId}`);

export const getVendorResources = (projectId) =>
  client.get(`/projects/${projectId}/vendor-resources`);

export const getProjectAssignments = (projectId) =>
  client.get(`/projects/${projectId}/assignments`);

export const syncProjectAssignments = (projectId, assignments) =>
  client.put(`/projects/${projectId}/assignments`, { assignments });

export const getProjectStatuses = () =>
  client.get('/project-statuses');

export const createProjectStatus = (data) =>
  client.post('/project-statuses', data);

export const updateProjectStatus = (id, data) =>
  client.put(`/project-statuses/${id}`, data);

export const deleteProjectStatus = (id) =>
  client.delete(`/project-statuses/${id}`);

export const getActivities = (projectId) =>
  client.get(`/projects/${projectId}/activities`);

export const getTecStacks = () =>
  client.get('/tec-stacks');

export const syncTecStacks = (projectId, tec_stack_ids) =>
  client.put(`/projects/${projectId}/tec-stacks`, { tec_stack_ids });

