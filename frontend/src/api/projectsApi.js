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

// Budget detail & Purchase Orders
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
