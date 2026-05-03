import api from './client';

export const getTasks = (projectId) => api.get(`/tasks?project_id=${projectId}`);
export const getTask = (id) => api.get(`/tasks/${id}`);
export const createTask = (data) => api.post('/tasks', data);
export const updateTask = (id, data) => api.put(`/tasks/${id}`, data);
export const closeTask = (id) => api.patch(`/tasks/${id}/close`);
export const deleteTask = (id) => api.delete(`/tasks/${id}`);

export const createFollowup = (taskId, data) => api.post(`/tasks/${taskId}/followups`, data);
export const updateFollowup = (taskId, followupId, data) => api.put(`/tasks/${taskId}/followups/${followupId}`, data);
export const deleteFollowup = (taskId, followupId) => api.delete(`/tasks/${taskId}/followups/${followupId}`);
