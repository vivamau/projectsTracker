const request = require('supertest');
const { initTestDb, seedTestDb, closeTestDb } = require('../helpers/testDb');
const { createTestApp } = require('../helpers/testApp');
const { superadminToken, adminToken, readerToken, guestToken } = require('../helpers/testAuth');
const { runQuery } = require('../../config/database');

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

describe('GET /api/projects', () => {
  it('should list projects when authenticated', async () => {
    const res = await request(app)
      .get('/api/projects')
      .set('Cookie', ['token=' + adminToken()]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.pagination).toBeDefined();
    expect(res.body.pagination.page).toBe(1);
    expect(res.body.pagination.limit).toBe(20);
  });

  it('should return 401 when not authenticated', async () => {
    const res = await request(app)
      .get('/api/projects');

    expect(res.status).toBe(401);
  });

  it('should support pagination parameters', async () => {
    const res = await request(app)
      .get('/api/projects?page=1&limit=5')
      .set('Cookie', ['token=' + adminToken()]);

    expect(res.status).toBe(200);
    expect(res.body.pagination.page).toBe(1);
    expect(res.body.pagination.limit).toBe(5);
  });
});

describe('GET /api/projects/stats', () => {
  it('should return project stats when authenticated', async () => {
    const res = await request(app)
      .get('/api/projects/stats')
      .set('Cookie', ['token=' + adminToken()]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(typeof res.body.data.totalProjects).toBe('number');
    expect(typeof res.body.data.groupCounts).toBe('object');
    expect(typeof res.body.data.groupCounts.active).toBe('number');
    expect(typeof res.body.data.totalDivisions).toBe('number');
    expect(Array.isArray(res.body.data.healthDistribution)).toBe(true);
    expect(Array.isArray(res.body.data.roleAssignments)).toBe(true);
    expect(Array.isArray(res.body.data.owners)).toBe(true);
  });

  it('should return 401 when not authenticated', async () => {
    const res = await request(app)
      .get('/api/projects/stats');

    expect(res.status).toBe(401);
  });
});

describe('POST /api/projects', () => {
  it('should create a project as admin', async () => {
    const res = await request(app)
      .post('/api/projects')
      .set('Cookie', ['token=' + adminToken()])
      .send({
        project_name: 'Test Project Alpha',
        project_description: 'A test project',
        division_id: 1,
        initiative_id: 1,
        deliverypath_id: 1
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
  });

  it('should create a project as superadmin', async () => {
    const res = await request(app)
      .post('/api/projects')
      .set('Cookie', ['token=' + superadminToken()])
      .send({ project_name: 'Test Project Beta' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
  });

  it('should return 403 when reader tries to create', async () => {
    const res = await request(app)
      .post('/api/projects')
      .set('Cookie', ['token=' + readerToken()])
      .send({ project_name: 'Should Not Create' });

    expect(res.status).toBe(403);
  });

  it('should return 403 when guest tries to create', async () => {
    const res = await request(app)
      .post('/api/projects')
      .set('Cookie', ['token=' + guestToken()])
      .send({ project_name: 'Should Not Create' });

    expect(res.status).toBe(403);
  });

  it('should return 400 when project_name is missing', async () => {
    const res = await request(app)
      .post('/api/projects')
      .set('Cookie', ['token=' + adminToken()])
      .send({ project_description: 'No name provided' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should return 401 when not authenticated', async () => {
    const res = await request(app)
      .post('/api/projects')
      .send({ project_name: 'Unauthenticated' });

    expect(res.status).toBe(401);
  });
});

describe('GET /api/projects/:id', () => {
  let projectId;

  beforeAll(async () => {
    // Create a project to retrieve
    const res = await request(app)
      .post('/api/projects')
      .set('Cookie', ['token=' + adminToken()])
      .send({ project_name: 'Get By Id Project', division_id: 1 });

    projectId = res.body.data.id;
  });

  it('should get a project by id', async () => {
    const res = await request(app)
      .get(`/api/projects/${projectId}`)
      .set('Cookie', ['token=' + adminToken()]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.project_name).toBe('Get By Id Project');
    expect(res.body.data.division_name).toBe('Engineering');
  });

  it('should return 404 for nonexistent project', async () => {
    const res = await request(app)
      .get('/api/projects/99999')
      .set('Cookie', ['token=' + adminToken()]);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('should return 401 when not authenticated', async () => {
    const res = await request(app)
      .get(`/api/projects/${projectId}`);

    expect(res.status).toBe(401);
  });
});

describe('PUT /api/projects/:id', () => {
  let projectId;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/projects')
      .set('Cookie', ['token=' + adminToken()])
      .send({ project_name: 'Update Me Project' });

    projectId = res.body.data.id;
  });

  it('should update a project as admin', async () => {
    const res = await request(app)
      .put(`/api/projects/${projectId}`)
      .set('Cookie', ['token=' + adminToken()])
      .send({ project_name: 'Updated Project Name' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify the update
    const getRes = await request(app)
      .get(`/api/projects/${projectId}`)
      .set('Cookie', ['token=' + adminToken()]);

    expect(getRes.body.data.project_name).toBe('Updated Project Name');
  });

  it('should return 404 for nonexistent project', async () => {
    const res = await request(app)
      .put('/api/projects/99999')
      .set('Cookie', ['token=' + adminToken()])
      .send({ project_name: 'Does Not Exist' });

    expect(res.status).toBe(404);
  });

  it('should return 403 when reader is not a PM or SA on the project', async () => {
    const res = await request(app)
      .put(`/api/projects/${projectId}`)
      .set('Cookie', ['token=' + readerToken()])
      .send({ project_name: 'Reader Update Attempt' });

    expect(res.status).toBe(403);
  });

  describe('contributor as project member', () => {
    let memberProjectId;

    beforeAll(async () => {
      // Create a project
      const projRes = await request(app)
        .post('/api/projects')
        .set('Cookie', ['token=' + adminToken()])
        .send({ project_name: 'PM Edit Project' });
      memberProjectId = projRes.body.data.id;

      // Assign reader (user id=3) as PM (role_id=1) on this project via role-assignments
      await request(app)
        .put(`/api/projects/${memberProjectId}/role-assignments`)
        .set('Cookie', ['token=' + adminToken()])
        .send({ role_assignments: [{ user_id: 3, project_role_id: 1, division_id: 1 }] });
    });

    it('should allow a reader who is PM to update the project', async () => {
      const res = await request(app)
        .put(`/api/projects/${memberProjectId}`)
        .set('Cookie', ['token=' + readerToken()])
        .send({ project_name: 'PM Updated Name' });
      expect(res.status).toBe(200);
    });

    it('should allow a reader who is SA to update the project', async () => {
      // Assign reader (user id=3) as SA (role_id=2) on another project
      const projRes = await request(app)
        .post('/api/projects')
        .set('Cookie', ['token=' + adminToken()])
        .send({ project_name: 'SA Edit Project' });
      const saProjectId = projRes.body.data.id;

      await request(app)
        .put(`/api/projects/${saProjectId}/role-assignments`)
        .set('Cookie', ['token=' + adminToken()])
        .send({ role_assignments: [{ user_id: 3, project_role_id: 2, division_id: 1 }] });

      const res = await request(app)
        .put(`/api/projects/${saProjectId}`)
        .set('Cookie', ['token=' + readerToken()])
        .send({ project_name: 'SA Updated Name' });
      expect(res.status).toBe(200);
    });

    it('should allow a reader who is PM to add a health status', async () => {
      const res = await request(app)
        .post(`/api/projects/${memberProjectId}/health-statuses`)
        .set('Cookie', ['token=' + readerToken()])
        .send({ healthstatus_value: 4, healthstatus_comment: 'Looking good' });
      expect(res.status).toBe(201);
    });

    it('should still return 403 for DELETE even when reader is PM', async () => {
      const res = await request(app)
        .delete(`/api/projects/${memberProjectId}`)
        .set('Cookie', ['token=' + readerToken()]);
      expect(res.status).toBe(403);
    });
  });
});

describe('DELETE /api/projects/:id', () => {
  let projectId;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/projects')
      .set('Cookie', ['token=' + adminToken()])
      .send({ project_name: 'Delete Me Project' });

    projectId = res.body.data.id;
  });

  it('should soft delete a project as admin', async () => {
    const res = await request(app)
      .delete(`/api/projects/${projectId}`)
      .set('Cookie', ['token=' + adminToken()]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify the project is no longer found (soft deleted)
    const getRes = await request(app)
      .get(`/api/projects/${projectId}`)
      .set('Cookie', ['token=' + adminToken()]);

    expect(getRes.status).toBe(404);
  });

  it('should return 404 for nonexistent project', async () => {
    const res = await request(app)
      .delete('/api/projects/99999')
      .set('Cookie', ['token=' + adminToken()]);

    expect(res.status).toBe(404);
  });

  it('should return 403 when reader tries to delete', async () => {
    const res = await request(app)
      .delete('/api/projects/1')
      .set('Cookie', ['token=' + readerToken()]);

    expect(res.status).toBe(403);
  });
});

describe('GET /api/projects/:id/health-statuses', () => {
  let projectId;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/projects')
      .set('Cookie', ['token=' + adminToken()])
      .send({ project_name: 'Health Status Project' });

    projectId = res.body.data.id;
  });

  it('should list health statuses for a project', async () => {
    const res = await request(app)
      .get(`/api/projects/${projectId}/health-statuses`)
      .set('Cookie', ['token=' + adminToken()]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('should return 401 when not authenticated', async () => {
    const res = await request(app)
      .get(`/api/projects/${projectId}/health-statuses`);

    expect(res.status).toBe(401);
  });
});

describe('POST /api/projects/:id/health-statuses', () => {
  let projectId;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/projects')
      .set('Cookie', ['token=' + adminToken()])
      .send({ project_name: 'Health Create Project' });

    projectId = res.body.data.id;
  });

  it('should create a health status as admin', async () => {
    const res = await request(app)
      .post(`/api/projects/${projectId}/health-statuses`)
      .set('Cookie', ['token=' + adminToken()])
      .send({
        healthstatus_value: 'green',
        healthstatus_comment: 'All good'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
  });

  it('should return 400 when healthstatus_value is missing', async () => {
    const res = await request(app)
      .post(`/api/projects/${projectId}/health-statuses`)
      .set('Cookie', ['token=' + adminToken()])
      .send({ healthstatus_comment: 'No value' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should return 403 when reader tries to create', async () => {
    const res = await request(app)
      .post(`/api/projects/${projectId}/health-statuses`)
      .set('Cookie', ['token=' + readerToken()])
      .send({ healthstatus_value: 'red' });

    expect(res.status).toBe(403);
  });

  it('should list created health statuses', async () => {
    // Create another status
    await request(app)
      .post(`/api/projects/${projectId}/health-statuses`)
      .set('Cookie', ['token=' + adminToken()])
      .send({ healthstatus_value: 'amber', healthstatus_comment: 'Some concerns' });

    const res = await request(app)
      .get(`/api/projects/${projectId}/health-statuses`)
      .set('Cookie', ['token=' + adminToken()]);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
  });
});

describe('GET /api/projects/:id/vendor-resources', () => {
  it('should return empty array for project with no vendor resources', async () => {
    const createRes = await request(app)
      .post('/api/projects')
      .set('Cookie', ['token=' + adminToken()])
      .send({ project_name: 'No Resources Project' });

    const res = await request(app)
      .get(`/api/projects/${createRes.body.data.id}/vendor-resources`)
      .set('Cookie', ['token=' + adminToken()]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(0);
  });

  it('should return 401 when not authenticated', async () => {
    const res = await request(app)
      .get('/api/projects/1/vendor-resources');

    expect(res.status).toBe(401);
  });
});
