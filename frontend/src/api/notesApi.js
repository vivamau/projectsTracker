import client from './client';

export const getNotes = (params) => client.get('/notes', { params });
export const getNote = (id) => client.get(`/notes/${id}`);
export const getNoteContent = (id) => client.get(`/notes/${id}/content`, { responseType: 'text' });
export const getMentions = (q) => client.get('/notes/mentions', { params: { q } });
export const createNote = (data) => client.post('/notes', data);
export const updateNote = (id, data) => client.put(`/notes/${id}`, data);
export const deleteNote = (id) => client.delete(`/notes/${id}`);
export const aiExtractNote = (id, content) => client.post(`/notes/${id}/ai-extract`, { content });
