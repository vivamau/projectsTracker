import client from './client';

export const getAgentSettings = () => client.get('/agent/settings');
export const updateAgentSettings = (data) => client.put('/agent/settings', data);
export const getAgentModels = () => client.get('/agent/models');
export const sendChatMessage = (message, history, sessionId) => client.post('/agent/chat', { message, history, sessionId });

export const saveAgentSession     = (data)  => client.post('/agent/saved-sessions', data);
export const listAgentSessions    = ()      => client.get('/agent/saved-sessions');
export const loadAgentSession     = (id)    => client.get(`/agent/saved-sessions/${id}`);
export const downloadAgentSession = (id)    => client.get(`/agent/saved-sessions/${id}/download`, { responseType: 'blob' });
export const deleteAgentSession   = (id)    => client.delete(`/agent/saved-sessions/${id}`);
