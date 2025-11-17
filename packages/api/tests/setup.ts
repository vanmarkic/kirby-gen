/**
 * Jest test setup
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = '3002';
process.env.LOG_LEVEL = 'error';
process.env.AUTH_ENABLED = 'false';
process.env.STORAGE_DIR = './test-data/storage';
process.env.SESSION_DIR = './test-data/sessions';
process.env.UPLOAD_DIR = './test-data/uploads';
process.env.DEPLOYMENT_DIR = './test-data/deployments';
process.env.SKILLS_SERVER_URL = 'http://localhost:5001';

// Increase test timeout for integration tests
jest.setTimeout(30000);

// Cleanup function
afterAll(async () => {
  // Allow time for async cleanup
  await new Promise((resolve) => setTimeout(resolve, 500));
});
