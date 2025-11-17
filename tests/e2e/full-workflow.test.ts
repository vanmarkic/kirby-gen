/**
 * Full Workflow E2E Test
 * Comprehensive end-to-end test of the entire portfolio generation workflow
 *
 * This test validates:
 * 1. Project creation
 * 2. File upload
 * 3. Domain mapping (via mocked Python skills)
 * 4. Content structuring
 * 5. Design automation
 * 6. CMS adaptation (Kirby generation)
 * 7. Git repository initialization
 * 8. Deployment
 * 9. Cleanup
 */
import path from 'path';
import fs from 'fs/promises';
import { io as ioClient, Socket } from 'socket.io-client';
import {
  startTestServer,
  TestServerInstance,
  createTestClient,
  TestClient,
} from './helpers/server-setup';
import { startMockSkillsServer, MockSkillsServer } from './helpers/mock-skills';
import {
  assertFileExists,
  assertDirectoryExists,
  assertKirbySiteStructure,
  assertProjectComplete,
  assertDomainModel,
  assertStructuredContent,
  assertDesignSystem,
  assertGitRepository,
  countFiles,
} from './helpers/assertions';
import { ProjectData } from '../../packages/shared/src/types/project.types';

describe('E2E: Full Portfolio Generation Workflow', () => {
  let testServer: TestServerInstance;
  let mockSkillsServer: MockSkillsServer;
  let client: TestClient;
  let socketClient: Socket;
  let projectId: string;

  // Test configuration
  const fixturesDir = path.join(__dirname, 'fixtures');
  const testTimeout = 120000; // 2 minutes

  /**
   * Setup: Start servers before all tests
   */
  beforeAll(async () => {
    // Start mock Python skills server
    mockSkillsServer = await startMockSkillsServer({
      port: 5001,
      fixturesDir,
    });

    // Start API server
    testServer = await startTestServer({
      port: 3003,
      storageDir: './test-data/e2e/storage',
      sessionDir: './test-data/e2e/sessions',
      uploadDir: './test-data/e2e/uploads',
      deploymentDir: './test-data/e2e/deployments',
      skillsServerUrl: 'http://localhost:5001',
      cleanupOnStop: true,
    });

    // Create test client
    client = createTestClient(testServer.baseUrl);

    // Wait for server to be ready
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }, testTimeout);

  /**
   * Cleanup: Stop servers after all tests
   */
  afterAll(async () => {
    // Disconnect socket if connected
    if (socketClient && socketClient.connected) {
      socketClient.disconnect();
    }

    // Stop servers
    await testServer.cleanup();
    await mockSkillsServer.stop();
  }, testTimeout);

  /**
   * Test: Complete workflow from project creation to deployment
   */
  describe('Complete Workflow', () => {
    it(
      'should complete full portfolio generation workflow',
      async () => {
        // ===================================================================
        // PHASE 1: Project Creation
        // ===================================================================
        console.log('📦 Creating project...');

        const createResponse = await client.post('/api/projects');
        expect(createResponse.status).toBe(201);

        const createData = await createResponse.json();
        expect(createData.success).toBe(true);
        expect(createData.data).toHaveProperty('id');
        expect(createData.data.status).toBe('input');

        projectId = createData.data.id;
        console.log(`✓ Project created: ${projectId}`);

        // ===================================================================
        // PHASE 2: WebSocket Connection
        // ===================================================================
        console.log('🔌 Connecting to WebSocket...');

        socketClient = ioClient(testServer.baseUrl, {
          transports: ['websocket'],
        });

        await new Promise<void>((resolve, reject) => {
          socketClient.on('connect', () => {
            console.log('✓ WebSocket connected');
            resolve();
          });

          socketClient.on('connect_error', (error) => {
            console.error('WebSocket connection error:', error);
            reject(error);
          });

          setTimeout(() => reject(new Error('WebSocket connection timeout')), 5000);
        });

        // Subscribe to project progress
        socketClient.emit('subscribe', { projectId });

        // Collect progress events
        const progressEvents: any[] = [];
        socketClient.on('progress', (event) => {
          progressEvents.push(event);
          console.log(
            `📊 Progress: ${event.phase} - ${event.status} (${event.progress}%) - ${event.message}`
          );
        });

        // ===================================================================
        // PHASE 3: Upload Content Files
        // ===================================================================
        console.log('📤 Uploading content files...');

        const contentFiles = [
          'sample-content/about.md',
          'sample-content/projects.md',
          'sample-content/blog-posts.md',
          'sample-content/contact.md',
        ];

        for (const file of contentFiles) {
          const filePath = path.join(fixturesDir, file);
          const content = await fs.readFile(filePath);
          const filename = path.basename(file);

          // Create a File-like object for upload
          const blob = new Blob([content], { type: 'text/markdown' });
          const formData = new FormData();
          formData.append('files', blob, filename);

          const uploadResponse = await fetch(
            `${testServer.baseUrl}/api/projects/${projectId}/files/upload`,
            {
              method: 'POST',
              body: formData,
            }
          );

          expect(uploadResponse.status).toBe(200);
          const uploadData = await uploadResponse.json();
          expect(uploadData.success).toBe(true);

          console.log(`✓ Uploaded: ${filename}`);
        }

        // Verify files were uploaded
        const filesResponse = await client.get(`/api/projects/${projectId}/files`);
        expect(filesResponse.status).toBe(200);
        const filesData = await filesResponse.json();
        expect(filesData.data).toHaveLength(contentFiles.length);

        // ===================================================================
        // PHASE 4: Add Branding Assets (Optional)
        // ===================================================================
        console.log('🎨 Adding branding...');

        const brandingResponse = await client.patch(`/api/projects/${projectId}`, {
          inputs: {
            brandingAssets: {
              colors: {
                primary: '#0ea5e9',
                secondary: '#8b5cf6',
                accent: '#10b981',
              },
              fonts: [
                {
                  name: 'Inter',
                  family: 'Inter',
                  weights: [400, 500, 600, 700],
                  source: 'google',
                },
              ],
            },
            pinterestUrl: 'https://pinterest.com/example/portfolio-inspiration',
          },
        });

        expect(brandingResponse.status).toBe(200);
        console.log('✓ Branding added');

        // ===================================================================
        // PHASE 5: Trigger Generation
        // ===================================================================
        console.log('⚡ Starting generation workflow...');

        const generateResponse = await client.post(
          `/api/projects/${projectId}/generate`
        );
        expect(generateResponse.status).toBe(202);

        const generateData = await generateResponse.json();
        expect(generateData.success).toBe(true);

        // ===================================================================
        // PHASE 6: Monitor Progress via WebSocket
        // ===================================================================
        console.log('👀 Monitoring workflow progress...');

        // Wait for workflow to complete
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Workflow timeout after 60 seconds'));
          }, 60000);

          socketClient.on('progress', (event) => {
            if (event.projectId !== projectId) return;

            if (event.status === 'failed') {
              clearTimeout(timeout);
              reject(new Error(`Workflow failed: ${event.message}`));
            }

            if (event.status === 'completed' && event.progress === 100) {
              clearTimeout(timeout);
              console.log('✓ Workflow completed!');
              resolve();
            }
          });
        });

        // ===================================================================
        // PHASE 7: Validate Progress Events
        // ===================================================================
        console.log('✅ Validating progress events...');

        expect(progressEvents.length).toBeGreaterThan(0);

        // Check that all phases were executed
        const phases = new Set(progressEvents.map((e) => e.phase));
        expect(phases.has('domain-mapping')).toBe(true);
        expect(phases.has('content-structuring')).toBe(true);
        expect(phases.has('design-automation')).toBe(true);
        expect(phases.has('cms-adaptation')).toBe(true);
        expect(phases.has('deployment')).toBe(true);

        console.log(`✓ All ${phases.size} phases executed`);

        // ===================================================================
        // PHASE 8: Validate Final Project State
        // ===================================================================
        console.log('🔍 Validating project state...');

        const projectResponse = await client.get(`/api/projects/${projectId}`);
        expect(projectResponse.status).toBe(200);

        const projectData = await projectResponse.json();
        expect(projectData.success).toBe(true);

        const project: ProjectData = projectData.data;

        // Validate project completion
        assertProjectComplete(project);
        console.log('✓ Project marked as completed');

        // Validate domain model
        assertDomainModel(project);
        console.log('✓ Domain model validated');

        // Validate structured content
        assertStructuredContent(project);
        console.log('✓ Structured content validated');

        // Validate design system
        assertDesignSystem(project);
        console.log('✓ Design system validated');

        // ===================================================================
        // PHASE 9: Validate Generated Files
        // ===================================================================
        console.log('📁 Validating generated Kirby site...');

        const sitePath = project.generated!.sitePath;
        await assertDirectoryExists(sitePath);
        console.log(`✓ Site directory exists: ${sitePath}`);

        // Validate Kirby structure
        await assertKirbySiteStructure(sitePath);
        console.log('✓ Kirby site structure validated');

        // Count generated files
        const fileCount = await countFiles(sitePath);
        expect(fileCount).toBeGreaterThan(0);
        console.log(`✓ Generated ${fileCount} files`);

        // ===================================================================
        // PHASE 10: Validate Git Repository
        // ===================================================================
        console.log('📚 Validating Git repository...');

        await assertGitRepository(sitePath);
        console.log('✓ Git repository initialized');

        // ===================================================================
        // PHASE 11: Validate Deployment
        // ===================================================================
        console.log('🚀 Validating deployment...');

        expect(project.generated!.deploymentUrl).toBeTruthy();
        expect(project.generated!.deploymentId).toBeTruthy();
        console.log(`✓ Deployment URL: ${project.generated!.deploymentUrl}`);

        // Note: We don't test actual HTTP accessibility in this test
        // as deployments are local and may not be accessible

        // ===================================================================
        // PHASE 12: Test Project Retrieval
        // ===================================================================
        console.log('📋 Testing project retrieval...');

        const listResponse = await client.get('/api/projects');
        expect(listResponse.status).toBe(200);

        const listData = await listResponse.json();
        expect(listData.success).toBe(true);
        expect(listData.data).toEqual(
          expect.arrayContaining([expect.objectContaining({ id: projectId })])
        );

        console.log('✓ Project appears in list');

        // ===================================================================
        // COMPLETE!
        // ===================================================================
        console.log('🎉 Full workflow test completed successfully!');
      },
      testTimeout
    );
  });

  /**
   * Test: Error handling and recovery
   */
  describe('Error Handling', () => {
    it('should handle missing project gracefully', async () => {
      const response = await client.get('/api/projects/non-existent-id');
      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('NOT_FOUND');
    });

    it('should handle invalid file uploads', async () => {
      // Create a project first
      const createResponse = await client.post('/api/projects');
      const createData = await createResponse.json();
      const testProjectId = createData.data.id;

      // Try to upload with wrong content type
      const invalidResponse = await fetch(
        `${testServer.baseUrl}/api/projects/${testProjectId}/files/upload`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ invalid: 'data' }),
        }
      );

      expect(invalidResponse.status).toBe(400);
    });

    it('should validate Pinterest URL format', async () => {
      const createResponse = await client.post('/api/projects');
      const createData = await createResponse.json();
      const testProjectId = createData.data.id;

      const response = await client.patch(`/api/projects/${testProjectId}`, {
        inputs: {
          pinterestUrl: 'not-a-valid-url',
        },
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });
  });

  /**
   * Test: Partial workflow scenarios
   */
  describe('Partial Workflows', () => {
    it('should allow manual domain model creation', async () => {
      // Create project
      const createResponse = await client.post('/api/projects');
      const createData = await createResponse.json();
      const testProjectId = createData.data.id;

      // Load sample domain model
      const schemaPath = path.join(fixturesDir, 'sample-schema.json');
      const schema = JSON.parse(await fs.readFile(schemaPath, 'utf-8'));

      // Set domain model manually
      const updateResponse = await client.patch(`/api/projects/${testProjectId}`, {
        domainModel: schema,
      });

      expect(updateResponse.status).toBe(200);

      // Verify it was saved
      const projectResponse = await client.get(`/api/projects/${testProjectId}`);
      const projectData = await projectResponse.json();

      expect(projectData.data.domainModel).toBeTruthy();
      expect(projectData.data.status).toBe('structuring');
    });

    it('should skip domain mapping if model already exists', async () => {
      // Create project with domain model
      const createResponse = await client.post('/api/projects');
      const createData = await createResponse.json();
      const testProjectId = createData.data.id;

      // Load sample domain model
      const schemaPath = path.join(fixturesDir, 'sample-schema.json');
      const schema = JSON.parse(await fs.readFile(schemaPath, 'utf-8'));

      // Set domain model
      await client.patch(`/api/projects/${testProjectId}`, {
        domainModel: schema,
      });

      // Upload files
      const filePath = path.join(fixturesDir, 'sample-content/about.md');
      const content = await fs.readFile(filePath);
      const formData = new FormData();
      formData.append('files', new Blob([content]), 'about.md');

      await fetch(
        `${testServer.baseUrl}/api/projects/${testProjectId}/files/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      // Start generation - should skip domain mapping
      const generateResponse = await client.post(
        `/api/projects/${testProjectId}/generate`
      );
      expect(generateResponse.status).toBe(202);

      // Wait for completion
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Verify domain mapping was skipped but workflow continued
      const projectResponse = await client.get(`/api/projects/${testProjectId}`);
      const projectData = await projectResponse.json();

      // Should have progressed past domain mapping
      expect(['structuring', 'design', 'blueprints', 'generating', 'deploying', 'completed']).toContain(
        projectData.data.status
      );
    }, 30000);
  });
});
