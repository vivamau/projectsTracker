jest.mock('../../services/ragService', () => ({
  getSettings: jest.fn(),
  saveSettings: jest.fn(),
  checkHealth: jest.fn(),
  runLearningPhase: jest.fn(),
}));

const request = require('supertest');
const express = require('express');
const cookieParser = require('cookie-parser');
const { TEST_SECRET, superadminToken, adminToken, readerToken } = require('../helpers/testAuth');
const ragService = require('../../services/ragService');
const createRagRoutes = require('../../routes/ragRoutes');

let app;
const db = {};

beforeAll(() => {
  process.env.JWT_SECRET = TEST_SECRET;
  app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api/rag', createRagRoutes(db));
});

beforeEach(() => jest.clearAllMocks());

const auth = token => ['Cookie', `token=${token}`];

describe('GET /api/rag/settings', () => {
  it('returns settings for superadmin', async () => {
    ragService.getSettings.mockResolvedValue({ embeddingModel: 'embeddinggemma', chunkCount: 5 });
    const res = await request(app).get('/api/rag/settings').set(...auth(superadminToken()));
    expect(res.status).toBe(200);
    expect(res.body.data.embeddingModel).toBe('embeddinggemma');
  });

  it('rejects non-superadmin', async () => {
    const res = await request(app).get('/api/rag/settings').set(...auth(adminToken()));
    expect(res.status).toBe(403);
  });

  it('rejects unauthenticated', async () => {
    const res = await request(app).get('/api/rag/settings');
    expect(res.status).toBe(401);
  });

  it('returns 500 when the service throws', async () => {
    ragService.getSettings.mockRejectedValue(new Error('db down'));
    const res = await request(app).get('/api/rag/settings').set(...auth(superadminToken()));
    expect(res.status).toBe(500);
  });
});

describe('PUT /api/rag/settings', () => {
  it('saves the embedding model and returns updated settings', async () => {
    ragService.saveSettings.mockResolvedValue();
    ragService.getSettings.mockResolvedValue({ embeddingModel: 'gemma3n:e4b' });
    const res = await request(app).put('/api/rag/settings')
      .set(...auth(superadminToken())).send({ embeddingModel: 'gemma3n:e4b' });
    expect(res.status).toBe(200);
    expect(ragService.saveSettings).toHaveBeenCalledWith(db, { embeddingModel: 'gemma3n:e4b' });
    expect(res.body.data.embeddingModel).toBe('gemma3n:e4b');
  });

  it('rejects non-superadmin', async () => {
    const res = await request(app).put('/api/rag/settings')
      .set(...auth(readerToken())).send({ embeddingModel: 'x' });
    expect(res.status).toBe(403);
  });

  it('returns 500 when save fails', async () => {
    ragService.saveSettings.mockRejectedValue(new Error('boom'));
    const res = await request(app).put('/api/rag/settings')
      .set(...auth(superadminToken())).send({ embeddingModel: 'x' });
    expect(res.status).toBe(500);
  });
});

describe('GET /api/rag/health', () => {
  it('returns health based on current settings', async () => {
    ragService.getSettings.mockResolvedValue({ ollamaUrl: 'http://localhost:11434', embeddingModel: 'embeddinggemma' });
    ragService.checkHealth.mockResolvedValue({ ollamaAvailable: true, modelAvailable: true, models: ['embeddinggemma'] });
    const res = await request(app).get('/api/rag/health').set(...auth(superadminToken()));
    expect(res.status).toBe(200);
    expect(res.body.data.ollamaAvailable).toBe(true);
    expect(ragService.checkHealth).toHaveBeenCalledWith('http://localhost:11434', 'embeddinggemma');
  });

  it('rejects non-superadmin', async () => {
    const res = await request(app).get('/api/rag/health').set(...auth(adminToken()));
    expect(res.status).toBe(403);
  });

  it('returns 500 on failure', async () => {
    ragService.getSettings.mockRejectedValue(new Error('x'));
    const res = await request(app).get('/api/rag/health').set(...auth(superadminToken()));
    expect(res.status).toBe(500);
  });
});

describe('POST /api/rag/learn', () => {
  it('triggers the learning phase for superadmin', async () => {
    ragService.runLearningPhase.mockResolvedValue({ chunks: 42, sources: 7, durationMs: 1234 });
    const res = await request(app).post('/api/rag/learn').set(...auth(superadminToken()));
    expect(res.status).toBe(200);
    expect(res.body.data.chunks).toBe(42);
    expect(ragService.runLearningPhase).toHaveBeenCalledWith(db);
  });

  it('rejects non-superadmin', async () => {
    const res = await request(app).post('/api/rag/learn').set(...auth(adminToken()));
    expect(res.status).toBe(403);
  });

  it('returns 500 with the error message when learning fails', async () => {
    ragService.runLearningPhase.mockRejectedValue(new Error('ollama unreachable'));
    const res = await request(app).post('/api/rag/learn').set(...auth(superadminToken()));
    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/ollama unreachable/);
  });

  it('falls back to a generic message when the error has none', async () => {
    ragService.runLearningPhase.mockRejectedValue(new Error(''));
    const res = await request(app).post('/api/rag/learn').set(...auth(superadminToken()));
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Learning phase failed');
  });
});
