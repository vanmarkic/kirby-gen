/**
 * E2E Test Setup
 * Global setup for all E2E tests
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error'; // Reduce noise in tests
process.env.AUTH_ENABLED = 'false';

// Extend Jest timeout for E2E tests
jest.setTimeout(120000); // 2 minutes

// Global error handlers
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection in E2E test:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception in E2E test:', error);
});

// Cleanup function
afterAll(async () => {
  // Allow time for async cleanup
  await new Promise((resolve) => setTimeout(resolve, 1000));
});

console.log('🧪 E2E test environment initialized');
