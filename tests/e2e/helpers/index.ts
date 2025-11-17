/**
 * E2E Test Helpers Index
 * Exports all helper functions for easy importing
 */

// Server setup
export {
  startTestServer,
  waitForServer,
  createTestClient,
  type TestServerInstance,
  type TestServerConfig,
  type TestClient,
} from './server-setup';

// Mock skills
export {
  MockSkillsServer,
  startMockSkillsServer,
  type MockSkillsServerConfig,
} from './mock-skills';

// Assertions
export {
  assertFileExists,
  assertDirectoryExists,
  assertFileContains,
  assertJsonStructure,
  assertKirbySiteStructure,
  assertProjectComplete,
  assertDomainModel,
  assertStructuredContent,
  assertDesignSystem,
  assertGitRepository,
  assertDeploymentAccessible,
  countFiles,
  getAllFiles,
} from './assertions';
