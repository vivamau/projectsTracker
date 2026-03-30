import client from './client';

export const getDivisions = () => client.get('/divisions');
export const getDivision = (id) => client.get(`/divisions/${id}`);
export const createDivision = (data) => client.post('/divisions', data);
export const updateDivision = (id, data) => client.put(`/divisions/${id}`, data);
export const deleteDivision = (id) => client.delete(`/divisions/${id}`);

export const getDivisionProjects = (id) => client.get(`/divisions/${id}/projects`);
export const getDivisionFocalPoints = (id) => client.get(`/divisions/${id}/focal-points`);
export const addDivisionFocalPoint = (id, data) => client.post(`/divisions/${id}/focal-points`, data);
export const removeDivisionFocalPoint = (divisionId, fpId) => client.delete(`/divisions/${divisionId}/focal-points/${fpId}`);
export const syncDivisionFocalPoints = (id, userIds) => client.put(`/divisions/${id}/focal-points`, { user_ids: userIds });
export const getDivisionProjectManagers = (id) => client.get(`/divisions/${id}/project-managers`);

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

export const getUsers = (params) => client.get('/users', { params });
export const createUser = (data) => client.post('/users', data);
export const updateUser = (id, data) => client.put(`/users/${id}`, data);
export const deleteUser = (id) => client.delete(`/users/${id}`);
