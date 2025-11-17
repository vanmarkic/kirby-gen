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
