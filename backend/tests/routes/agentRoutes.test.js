const request = require('supertest');
const { initTestDb, seedTestDb, closeTestDb } = require('../helpers/testDb');
const { createTestApp } = require('../helpers/testApp');
const { adminToken, readerToken, superadminToken } = require('../helpers/testAuth');

jest.mock('../../services/agentService', () => ({
  getSettings: jest.fn().mockResolvedValue({
    ollama_url: 'http://localhost:11434',
    ollama_model: 'llama3.2',
  }),
  updateSettings: jest.fn().mockResolvedValue(undefined),
  getOllamaModels: jest.fn().mockResolvedValue([{ name: 'llama3.2' }, { name: 'mistral' }]),
  chat: jest.fn().mockResolvedValue({ role: 'assistant', content: 'Hello! I can help.' }),
}));

const agentService = require('../../services/agentService');

let db, app;

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-jwt-secret';
  db = await initTestDb();
  await seedTestDb(db);
  app = createTestApp(db);
});

afterAll(async () => {
  await closeTestDb(db);
});

beforeEach(() => {
  jest.clearAllMocks();
  agentService.getSettings.mockResolvedValue({ ollama_url: 'http://localhost:11434', ollama_model: 'llama3.2' });
  agentService.updateSettings.mockResolvedValue(undefined);
  agentService.getOllamaModels.mockResolvedValue([{ name: 'llama3.2' }, { name: 'mistral' }]);
  agentService.chat.mockResolvedValue({ role: 'assistant', content: 'Hello! I can help.' });
});

describe('Agent Routes', () => {
  describe('GET /api/agent/settings', () => {
    it('should return settings when authenticated', async () => {
      const res = await request(app)
        .get('/api/agent/settings')
        .set('Cookie', ['token=' + adminToken()]);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('ollama_url');
      expect(res.body.data).toHaveProperty('ollama_model');
    });

    it('should return 401 when not authenticated', async () => {
      const res = await request(app).get('/api/agent/settings');
      expect(res.status).toBe(401);
    });
  });

  describe('PUT /api/agent/settings', () => {
    it('should update settings as admin', async () => {
      const res = await request(app)
        .put('/api/agent/settings')
        .set('Cookie', ['token=' + adminToken()])
        .send({ ollama_url: 'http://localhost:11434', ollama_model: 'mistral' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(agentService.updateSettings).toHaveBeenCalled();
    });

    it('should return 403 for reader role', async () => {
      const res = await request(app)
        .put('/api/agent/settings')
        .set('Cookie', ['token=' + readerToken()])
        .send({ ollama_model: 'mistral' });
      expect(res.status).toBe(403);
    });

    it('should return 401 when not authenticated', async () => {
      const res = await request(app)
        .put('/api/agent/settings')
        .send({ ollama_model: 'mistral' });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/agent/models', () => {
    it('should return available Ollama models', async () => {
      const res = await request(app)
        .get('/api/agent/models')
        .set('Cookie', ['token=' + adminToken()]);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should return 401 when not authenticated', async () => {
      const res = await request(app).get('/api/agent/models');
      expect(res.status).toBe(401);
    });

    it('should return empty array when Ollama is unreachable', async () => {
      agentService.getOllamaModels.mockResolvedValue([]);
      const res = await request(app)
        .get('/api/agent/models')
        .set('Cookie', ['token=' + adminToken()]);
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });
  });

  describe('POST /api/agent/chat', () => {
    it('should return assistant response', async () => {
      const res = await request(app)
        .post('/api/agent/chat')
        .set('Cookie', ['token=' + adminToken()])
        .send({ message: 'How many projects are there?', history: [] });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('content');
      expect(agentService.chat).toHaveBeenCalled();
    });

    it('should return 400 when message is missing', async () => {
      const res = await request(app)
        .post('/api/agent/chat')
        .set('Cookie', ['token=' + adminToken()])
        .send({ history: [] });
      expect(res.status).toBe(400);
    });

    it('should return 401 when not authenticated', async () => {
      const res = await request(app)
        .post('/api/agent/chat')
        .send({ message: 'Hello' });
      expect(res.status).toBe(401);
    });

    it('should pass conversation history to service', async () => {
      const history = [{ role: 'user', content: 'Hi' }, { role: 'assistant', content: 'Hello' }];
      await request(app)
        .post('/api/agent/chat')
        .set('Cookie', ['token=' + adminToken()])
        .send({ message: 'How many projects?', history });
      expect(agentService.chat).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ message: 'How many projects?', history })
      );
    });
  });
});
