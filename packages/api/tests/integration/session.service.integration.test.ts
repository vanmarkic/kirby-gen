import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs/promises';
import * as path from 'path';
import { LocalSessionService } from '../../src/services/local/session.service';
import type { ProjectData, ProjectStatus } from '../../../shared/src/types/project.types';

describe('LocalSessionService Integration Tests', () => {
  let service: LocalSessionService;
  const testBasePath = '/tmp/test-sessions-integration';
  const originalEnv = process.env;

  beforeEach(async () => {
    // Set up test environment
    process.env = { ...originalEnv, SESSION_PATH: testBasePath };

    // Create service
    service = new LocalSessionService();

    // Ensure directory exists
    await fs.mkdir(testBasePath, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testBasePath, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }

    // Restore environment
    process.env = originalEnv;
  });

  const createTestProjectData = (): ProjectData => ({
    id: 'test-project',
    createdAt: new Date(),
    updatedAt: new Date(),
    inputs: {
      contentFiles: [],
      brandingAssets: {}
    },
    status: 'input' as ProjectStatus,
    currentStep: 1,
    totalSteps: 6,
    errors: []
  });

  it('should perform full CRUD operations', async () => {
    const projectData = createTestProjectData();

    // Create
    const sessionId = await service.create('test-project', projectData);
    expect(sessionId).toBeDefined();
    expect(sessionId.length).toBeGreaterThan(0);

    // Verify file was created
    const filePath = path.join(testBasePath, `${sessionId}.json`);
    const fileExists = await fs.access(filePath).then(() => true).catch(() => false);
    expect(fileExists).toBe(true);

    // Read
    const retrievedData = await service.get(sessionId);
    expect(retrievedData).toBeDefined();
    expect(retrievedData?.id).toBe('test-project');

    // Update
    await service.update(sessionId, {
      status: 'completed' as ProjectStatus,
      currentStep: 6
    });

    const updatedData = await service.get(sessionId);
    expect(updatedData?.status).toBe('completed');
    expect(updatedData?.currentStep).toBe(6);

    // Exists
    const exists = await service.exists(sessionId);
    expect(exists).toBe(true);

    // List
    const sessions = await service.listSessions('test-project');
    expect(sessions).toContain(sessionId);

    // Delete
    await service.delete(sessionId);

    // Verify deletion
    const existsAfterDelete = await service.exists(sessionId);
    expect(existsAfterDelete).toBe(false);

    const dataAfterDelete = await service.get(sessionId);
    expect(dataAfterDelete).toBeNull();
  });

  it('should handle multiple sessions for the same project', async () => {
    const projectData = createTestProjectData();
    const projectData2 = { ...createTestProjectData(), id: 'test-project' };
    const projectData3 = { ...createTestProjectData(), id: 'other-project' };

    // Create multiple sessions
    const sessionId1 = await service.create('test-project', projectData2);
    const sessionId2 = await service.create('test-project', projectData2);
    const sessionId3 = await service.create('other-project', projectData3);

    // List sessions for test-project
    const testProjectSessions = await service.listSessions('test-project');
    expect(testProjectSessions).toHaveLength(2);
    expect(testProjectSessions).toContain(sessionId1);
    expect(testProjectSessions).toContain(sessionId2);
    expect(testProjectSessions).not.toContain(sessionId3);

    // List sessions for other-project
    const otherProjectSessions = await service.listSessions('other-project');
    expect(otherProjectSessions).toHaveLength(1);
    expect(otherProjectSessions).toContain(sessionId3);
  });

  it('should cleanup old sessions', async () => {
    const projectData = createTestProjectData();

    // Create a session
    const sessionId = await service.create('test-project', projectData);
    const filePath = path.join(testBasePath, `${sessionId}.json`);

    // Manually set the file's modified time to 2 hours ago
    const oldTime = new Date(Date.now() - 2 * 60 * 60 * 1000);
    await fs.utimes(filePath, oldTime, oldTime);

    // Cleanup sessions older than 1 hour
    const deletedCount = await service.cleanup(60 * 60 * 1000);
    expect(deletedCount).toBe(1);

    // Verify session was deleted
    const exists = await service.exists(sessionId);
    expect(exists).toBe(false);
  });
});