const request = require('supertest');
const { initTestDb, seedTestDb, closeTestDb } = require('../helpers/testDb');
const { createTestApp } = require('../helpers/testApp');
const { superadminToken, adminToken, readerToken } = require('../helpers/testAuth');

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

describe('GET /api/project-roles', () => {
  it('should return seeded project roles', async () => {
    const res = await request(app)
      .get('/api/project-roles')
      .set('Cookie', ['token=' + adminToken()]);

    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
    const names = res.body.data.map(r => r.role_name);
    expect(names).toContain('Project Manager');
    expect(names).toContain('Solution Architect');
  });

  it('should require authentication', async () => {
    const res = await request(app).get('/api/project-roles');
    expect(res.status).toBe(401);
  });
});

describe('GET /api/project-roles/:id', () => {
  it('should return a single role', async () => {
    const res = await request(app)
      .get('/api/project-roles/1')
      .set('Cookie', ['token=' + adminToken()]);

    expect(res.status).toBe(200);
    expect(res.body.data.role_name).toBe('Project Manager');
  });

  it('should return 404 for non-existent role', async () => {
    const res = await request(app)
      .get('/api/project-roles/999')
      .set('Cookie', ['token=' + adminToken()]);

    expect(res.status).toBe(404);
  });
});

describe('POST /api/project-roles', () => {
  it('should allow superadmin to create a role', async () => {
    const res = await request(app)
      .post('/api/project-roles')
      .set('Cookie', ['token=' + superadminToken()])
      .send({ role_name: 'Product Owner', role_description: 'Owns the product backlog' });

    expect(res.status).toBe(201);
    expect(res.body.data.id).toBeDefined();
  });

  it('should reject if role_name is missing', async () => {
    const res = await request(app)
      .post('/api/project-roles')
      .set('Cookie', ['token=' + superadminToken()])
      .send({ role_description: 'no name' });

    expect(res.status).toBe(400);
  });

  it('should deny admin from creating a role', async () => {
    const res = await request(app)
      .post('/api/project-roles')
      .set('Cookie', ['token=' + adminToken()])
      .send({ role_name: 'Denied Role' });

    expect(res.status).toBe(403);
  });

  it('should deny reader from creating a role', async () => {
    const res = await request(app)
      .post('/api/project-roles')
      .set('Cookie', ['token=' + readerToken()])
      .send({ role_name: 'Denied Role' });

    expect(res.status).toBe(403);
  });
});

describe('PUT /api/project-roles/:id', () => {
  it('should allow superadmin to update a role', async () => {
    const res = await request(app)
      .put('/api/project-roles/1')
      .set('Cookie', ['token=' + superadminToken()])
      .send({ role_name: 'Project Manager', role_description: 'Updated description' });

    expect(res.status).toBe(200);
  });

  it('should return 404 for non-existent role', async () => {
    const res = await request(app)
      .put('/api/project-roles/999')
      .set('Cookie', ['token=' + superadminToken()])
      .send({ role_name: 'Ghost' });

    expect(res.status).toBe(404);
  });

  it('should deny admin from updating', async () => {
    const res = await request(app)
      .put('/api/project-roles/1')
      .set('Cookie', ['token=' + adminToken()])
      .send({ role_name: 'Nope' });

    expect(res.status).toBe(403);
  });
});

describe('DELETE /api/project-roles/:id', () => {
  let roleId;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/project-roles')
      .set('Cookie', ['token=' + superadminToken()])
      .send({ role_name: 'Temporary Role' });
    roleId = res.body.data.id;
  });

  it('should allow superadmin to soft-delete a role', async () => {
    const res = await request(app)
      .delete(`/api/project-roles/${roleId}`)
      .set('Cookie', ['token=' + superadminToken()]);

    expect(res.status).toBe(200);

    // Verify it's gone from list
    const list = await request(app)
      .get('/api/project-roles')
      .set('Cookie', ['token=' + superadminToken()]);
    const names = list.body.data.map(r => r.role_name);
    expect(names).not.toContain('Temporary Role');
  });

  it('should return 404 for already-deleted role', async () => {
    const res = await request(app)
      .delete(`/api/project-roles/${roleId}`)
      .set('Cookie', ['token=' + superadminToken()]);

    expect(res.status).toBe(404);
  });

  it('should deny admin from deleting', async () => {
    const res = await request(app)
      .delete('/api/project-roles/1')
      .set('Cookie', ['token=' + adminToken()]);

    expect(res.status).toBe(403);
  });
});
