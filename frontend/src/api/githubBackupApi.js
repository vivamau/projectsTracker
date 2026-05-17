import client from './client';

export const getGithubBackupSettings = () => client.get('/github-backup');
export const saveGithubBackupSettings = (data) => client.put('/github-backup/settings', data);
export const testGithubBackupConnection = (data) => client.post('/github-backup/test', data);
export const pushGithubBackup = () => client.post('/github-backup/push');
export const pullGithubBackup = () => client.post('/github-backup/pull');
