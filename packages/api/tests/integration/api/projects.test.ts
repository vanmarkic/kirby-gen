/**
 * Project API integration tests
 */
import request from 'supertest';
import { createApp } from '../../../src/app';
import { setupDependencyInjection } from '../../../src/config/di-setup';
import { Application } from 'express';

let app: Application;

beforeAll(() => {
  setupDependencyInjection();
  app = createApp();
});

describe('Project API Integration Tests', () => {
  describe('POST /api/projects', () => {
    it('should create a new project', async () => {
      const response = await request(app)
        .post('/api/projects')
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          id: expect.any(String),
          status: 'input',
          inputs: expect.any(Object),
        }),
      });
    });

    it('should create a new project with name from request body', async () => {
      const projectName = `Portfolio ${new Date().toISOString().split('T')[0]}`;

      const response = await request(app)
        .post('/api/projects')
        .send({ name: projectName })
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          id: expect.any(String),
          name: projectName,
          status: 'input',
          inputs: expect.any(Object),
        }),
      });
    });

    it('should create a project with default name if none provided', async () => {
      const response = await request(app)
        .post('/api/projects')
        .send({})
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          id: expect.any(String),
          name: expect.stringContaining('Untitled Project'),
          status: 'input',
        }),
      });
    });
  });

  describe('GET /api/projects/:projectId', () => {
    it('should get a project by ID', async () => {
      // First create a project
      const createResponse = await request(app)
        .post('/api/projects')
        .expect(201);

      const projectId = createResponse.body.data.id;

      // Then get it
      const response = await request(app)
        .get(`/api/projects/${projectId}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          id: projectId,
        }),
      });
    });

    it('should return 404 for non-existent project', async () => {
      const response = await request(app)
        .get('/api/projects/non-existent-id')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('GET /api/projects', () => {
    it('should list projects with pagination', async () => {
      const response = await request(app)
        .get('/api/projects')
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.any(Array),
        meta: expect.objectContaining({
          pagination: expect.objectContaining({
            page: 1,
            limit: 10,
          }),
        }),
      });
    });
  });

  describe('PATCH /api/projects/:projectId', () => {
    it('should update a project', async () => {
      // Create a project
      const createResponse = await request(app)
        .post('/api/projects')
        .expect(201);

      const projectId = createResponse.body.data.id;

      // Update it
      const response = await request(app)
        .patch(`/api/projects/${projectId}`)
        .send({
          inputs: {
            pinterestUrl: 'https://pinterest.com/test',
          },
        })
        .expect(200);

      expect(response.body.data.inputs.pinterestUrl).toBe('https://pinterest.com/test');
    });

    it('should return 404 for non-existent project', async () => {
      const response = await request(app)
        .patch('/api/projects/non-existent-id')
        .send({
          inputs: {
            pinterestUrl: 'https://pinterest.com/test',
          },
        })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('PUT /api/projects/:projectId', () => {
    it('should update a project via PUT', async () => {
      // Create a project
      const createResponse = await request(app)
        .post('/api/projects')
        .expect(201);

      const projectId = createResponse.body.data.id;

      // Update it via PUT
      const response = await request(app)
        .put(`/api/projects/${projectId}`)
        .send({
          inputs: {
            pinterestUrl: 'https://pinterest.com/test-put',
            brandingAssets: {
              colors: {
                primary: '#000000',
                secondary: '#ffffff',
              },
            },
          },
        })
        .expect(200);

      expect(response.body.data.inputs.pinterestUrl).toBe('https://pinterest.com/test-put');
      expect(response.body.data.inputs.brandingAssets.colors).toEqual({
        primary: '#000000',
        secondary: '#ffffff',
      });
    });

    it('should handle FormData uploads', async () => {
      // Create a project
      const createResponse = await request(app)
        .post('/api/projects')
        .expect(201);

      const projectId = createResponse.body.data.id;

      // Update with multipart/form-data
      const response = await request(app)
        .put(`/api/projects/${projectId}`)
        .field('branding', JSON.stringify({ primaryColor: '#ff0000' }))
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('DELETE /api/projects/:projectId', () => {
    it('should delete a project', async () => {
      // Create a project
      const createResponse = await request(app)
        .post('/api/projects')
        .expect(201);

      const projectId = createResponse.body.data.id;

      // Delete it
      await request(app)
        .delete(`/api/projects/${projectId}`)
        .expect(204);

      // Verify it's gone
      await request(app)
        .get(`/api/projects/${projectId}`)
        .expect(404);
    });

    it('should return 404 when deleting non-existent project', async () => {
      await request(app)
        .delete('/api/projects/non-existent-id')
        .expect(404);
    });
  });

  describe('GET /api/projects/:projectId/status', () => {
    it('should get project status', async () => {
      // Create a project
      const createResponse = await request(app)
        .post('/api/projects')
        .expect(201);

      const projectId = createResponse.body.data.id;

      // Get status
      const response = await request(app)
        .get(`/api/projects/${projectId}/status`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          id: projectId,
          status: 'input',
          currentStep: 0,
          totalSteps: 5,
          errors: [],
        }),
      });
    });

    it('should return 404 for non-existent project', async () => {
      await request(app)
        .get('/api/projects/non-existent-id/status')
        .expect(404);
    });
  });

  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          status: 'healthy',
          services: expect.any(Object),
        }),
      });
    });
  });

  describe('GET /api/info', () => {
    it('should return API information', async () => {
      const response = await request(app)
        .get('/api/info')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          name: 'Kirby-Gen API',
          version: expect.any(String),
        }),
      });
    });
  });
});
