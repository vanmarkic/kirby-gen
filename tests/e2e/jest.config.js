/**
 * Jest configuration for E2E tests
 * Extends the main Jest config with E2E-specific settings
 */
module.exports = {
  // Extend from main config
  ...require('../../packages/api/jest.config'),

  // Override testMatch to only include E2E tests
  testMatch: ['**/tests/e2e/**/*.test.ts'],

  // Exclude Playwright tests from Jest
  testPathIgnorePatterns: [
    '/node_modules/',
    'playwright-e2e.test.ts',
  ],

  // E2E tests need longer timeout
  testTimeout: 120000, // 2 minutes

  // Display name for test suite
  displayName: {
    name: 'E2E',
    color: 'blue',
  },

  // Run tests serially to avoid port conflicts
  maxWorkers: 1,

  // Don't collect coverage for E2E tests (too slow)
  collectCoverage: false,

  // Setup file
  setupFilesAfterEnv: ['<rootDir>/tests/e2e/setup.ts'],
};
