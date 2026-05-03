import client from './client';

export const getTokenLogStats  = (params) => client.get('/agent/token-logs/stats', { params });
export const getTokenLogs      = (params) => client.get('/agent/token-logs', { params });
export const getSessionMessages = (sessionId) => client.get(`/agent/token-logs/sessions/${sessionId}`);
