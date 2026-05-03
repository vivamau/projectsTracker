import client from './client';

export const getAgentSettings = () => client.get('/agent/settings');
export const updateAgentSettings = (data) => client.put('/agent/settings', data);
export const getAgentModels = () => client.get('/agent/models');
export const sendChatMessage = (message, history, sessionId) => client.post('/agent/chat', { message, history, sessionId });
