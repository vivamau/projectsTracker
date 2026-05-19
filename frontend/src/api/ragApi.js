import client from './client';

export const getRagSettings = () => client.get('/rag/settings');
export const saveRagSettings = (data) => client.put('/rag/settings', data);
export const getRagHealth = () => client.get('/rag/health');
export const runRagLearning = () => client.post('/rag/learn');
