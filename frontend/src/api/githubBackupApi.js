import client from './client';

export const getGithubBackupSettings = () => client.get('/github-backup');
export const saveGithubBackupSettings = (data) => client.put('/github-backup/settings', data);
export const testGithubBackupConnection = (data) => client.post('/github-backup/test', data);
export const syncGithubBackup = () => client.post('/github-backup/sync');
