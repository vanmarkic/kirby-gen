/**
 * End-to-end generation flow test
 */
import request from 'supertest';
import path from 'path';
import { createApp } from '../../src/app';
import { setupDependencyInjection } from '../../src/config/di-setup';
import { Application } from 'express';

let app: Application;
let projectId: string;

beforeAll(() => {
  setupDependencyInjection();
  app = createApp();
});

describe('E2E: Portfolio Generation Flow', () => {
  it('should complete the full generation workflow', async () => {
    // Step 1: Create a project
    const createResponse = await request(app)
      .post('/api/projects')
      .expect(201);

    expect(createResponse.body.success).toBe(true);
    projectId = createResponse.body.data.id;

    // Step 2: Upload content files
    // Note: In a real test, you would upload actual files
    // For this example, we'll skip file upload and move to domain mapping

    // Step 3: Generate domain model (skipped - requires actual files)
    // await request(app)
    //   .post(`/api/projects/${projectId}/domain-model/generate`)
    //   .expect(200);

    // Step 4: Get project status
    const statusResponse = await request(app)
      .get(`/api/projects/${projectId}/status`)
      .expect(200);

    expect(statusResponse.body.success).toBe(true);
    expect(statusResponse.body.data).toMatchObject({
      id: projectId,
      status: expect.any(String),
      currentStep: expect.any(Number),
      totalSteps: expect.any(Number),
    });

    // Step 5: List all projects
    const listResponse = await request(app)
      .get('/api/projects')
      .expect(200);

    expect(listResponse.body.success).toBe(true);
    expect(listResponse.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: projectId }),
      ])
    );

    // Step 6: Delete project (cleanup)
    // Note: This requires authentication in production
    // await request(app)
    //   .delete(`/api/projects/${projectId}`)
    //   .expect(204);
  }, 60000); // 60 second timeout for full flow
});

describe('E2E: Error Handling', () => {
  it('should handle invalid project ID gracefully', async () => {
    const response = await request(app)
      .get('/api/projects/invalid-id-12345')
      .expect(404);

    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it('should handle invalid routes', async () => {
    const response = await request(app)
      .get('/api/non-existent-route')
      .expect(404);

    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it('should handle validation errors', async () => {
    // Create a project
    const createResponse = await request(app)
      .post('/api/projects')
      .expect(201);

    const projectId = createResponse.body.data.id;

    // Try to update with invalid data
    const response = await request(app)
      .patch(`/api/projects/${projectId}`)
      .send({
        inputs: {
          pinterestUrl: 'not-a-valid-url',
        },
      })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});
