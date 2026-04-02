import client from './client';

export const getDivisions = () => client.get('/divisions');
export const getDivision = (id) => client.get(`/divisions/${id}`);
export const createDivision = (data) => client.post('/divisions', data);
export const updateDivision = (id, data) => client.put(`/divisions/${id}`, data);
export const deleteDivision = (id) => client.delete(`/divisions/${id}`);

export const getDivisionProjects = (id) => client.get(`/divisions/${id}/projects`);
export const getDivisionSupportingProjects = (id) => client.get(`/divisions/${id}/supporting-projects`);
export const getDivisionFocalPoints = (id) => client.get(`/divisions/${id}/focal-points`);
export const addDivisionFocalPoint = (id, data) => client.post(`/divisions/${id}/focal-points`, data);
export const removeDivisionFocalPoint = (divisionId, fpId) => client.delete(`/divisions/${divisionId}/focal-points/${fpId}`);
export const syncDivisionFocalPoints = (id, userIds) => client.put(`/divisions/${id}/focal-points`, { user_ids: userIds });
export const getDivisionProjectManagers = (id) => client.get(`/divisions/${id}/project-managers`);

export const getVendors = () => client.get('/vendors');
export const getVendor = (id) => client.get(`/vendors/${id}`);
export const createVendor = (data) => client.post('/vendors', data);
export const updateVendor = (id, data) => client.put(`/vendors/${id}`, data);
export const deleteVendor = (id) => client.delete(`/vendors/${id}`);

export const getVendorContracts = (vendorId) => client.get(`/vendors/${vendorId}/contracts`);
export const getVendorContract = (vendorId, contractId) => client.get(`/vendors/${vendorId}/contracts/${contractId}`);
export const createVendorContract = (vendorId, data) => client.post(`/vendors/${vendorId}/contracts`, data);
export const updateVendorContract = (vendorId, contractId, data) => client.put(`/vendors/${vendorId}/contracts/${contractId}`, data);
export const deleteVendorContract = (vendorId, contractId) => client.delete(`/vendors/${vendorId}/contracts/${contractId}`);

export const getVendorContractRoles = (vendorId, contractId) => client.get(`/vendors/${vendorId}/contracts/${contractId}/roles`);
export const getVendorContractRole = (vendorId, contractId, roleId) => client.get(`/vendors/${vendorId}/contracts/${contractId}/roles/${roleId}`);
export const createVendorContractRole = (vendorId, contractId, data) => client.post(`/vendors/${vendorId}/contracts/${contractId}/roles`, data);
export const updateVendorContractRole = (vendorId, contractId, roleId, data) => client.put(`/vendors/${vendorId}/contracts/${contractId}/roles/${roleId}`, data);
export const deleteVendorContractRole = (vendorId, contractId, roleId) => client.delete(`/vendors/${vendorId}/contracts/${contractId}/roles/${roleId}`);

export const getVendorRoleRates = (vendorId, contractId, roleId) => client.get(`/vendors/${vendorId}/contracts/${contractId}/roles/${roleId}/rates`);
export const getVendorRoleRate = (vendorId, contractId, roleId, rateId) => client.get(`/vendors/${vendorId}/contracts/${contractId}/roles/${roleId}/rates/${rateId}`);
export const createVendorRoleRate = (vendorId, contractId, roleId, data) => client.post(`/vendors/${vendorId}/contracts/${contractId}/roles/${roleId}/rates`, data);
export const updateVendorRoleRate = (vendorId, contractId, roleId, rateId, data) => client.put(`/vendors/${vendorId}/contracts/${contractId}/roles/${roleId}/rates/${rateId}`, data);
export const deleteVendorRoleRate = (vendorId, contractId, roleId, rateId) => client.delete(`/vendors/${vendorId}/contracts/${contractId}/roles/${roleId}/rates/${rateId}`);

// Helper functions for cascading dropdowns in PO items
export const getVendorResources = (vendorId) => client.get(`/vendors/${vendorId}`).then(r => ({ data: { data: r.data.data.resources || [] } })).catch(() => ({ data: { data: [] } }));

export const getVendorResourceProjects = (vendorId, resourceId) => client.get(`/vendors/${vendorId}/resources/${resourceId}/projects`);

export const getInitiatives = () => client.get('/initiatives');
export const createInitiative = (data) => client.post('/initiatives', data);
export const updateInitiative = (id, data) => client.put(`/initiatives/${id}`, data);
export const deleteInitiative = (id) => client.delete(`/initiatives/${id}`);

export const getDeliveryPaths = () => client.get('/deliverypaths');
export const createDeliveryPath = (data) => client.post('/deliverypaths', data);
export const updateDeliveryPath = (id, data) => client.put(`/deliverypaths/${id}`, data);
export const deleteDeliveryPath = (id) => client.delete(`/deliverypaths/${id}`);

export const getCountries = (search) => client.get('/countries', { params: { search } });

export const getCurrencies = () => client.get('/currencies');
export const getSeniorities = () => client.get('/seniorities');

export const getUsers = (params) => client.get('/users', { params });
export const createUser = (data) => client.post('/users', data);
export const updateUser = (id, data) => client.put(`/users/${id}`, data);
export const deleteUser = (id) => client.delete(`/users/${id}`);

export const getAuditLogs = (params) => client.get('/audit-logs', { params });
export const getAuditLogFilters = () => client.get('/audit-logs/filters');
export const getAuditLogStats = () => client.get('/audit-logs/stats');
export const cleanupAuditLogs = (data) => client.post('/audit-logs/cleanup', data);
