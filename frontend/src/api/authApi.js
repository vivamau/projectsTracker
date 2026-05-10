import client from './client';

export const login = (email, password) =>
  client.post('/auth/login', { email, password });

export const logout = () =>
  client.post('/auth/logout');

export const getMe = () =>
  client.get('/auth/me');

export const updateAvatar = (seed) =>
  client.put('/auth/me/avatar', { seed });

export const forgotPassword = (email) =>
  client.post('/auth/forgot-password', { email });

export const resetPassword = (token, password) =>
  client.post('/auth/reset-password', { token, password });
