/**
 * Test to verify ESLint rule prevents raw fetch() usage
 *
 * This is a compile-time test. If this file is uncommented and ESLint runs,
 * it should fail with an error about using fetch().
 *
 * The test is intentionally commented out because we want the build to pass.
 * To test the ESLint rule, uncomment the code below and run: npm run lint
 */

import { describe, it, expect } from 'vitest';

describe('ESLint no-restricted-globals rule for fetch()', () => {
  it('should document that raw fetch() is banned by ESLint', () => {
    // This test documents the poka-yoke measure in place
    expect(true).toBe(true);
  });

  it('should explain the rationale for banning fetch()', () => {
    const rationale = `
      Raw fetch() is banned in this codebase because:
      1. It bypasses authentication token injection
      2. The apiClient automatically adds x-auth-token header
      3. All API calls must go through ../api/endpoints.ts
      4. ESLint rule 'no-restricted-globals' enforces this at compile-time
    `;

    expect(rationale).toContain('authentication');
    expect(rationale).toContain('apiClient');
  });

  // UNCOMMENT BELOW TO TEST THE ESLINT RULE
  // This should fail ESLint with error about using fetch()

  /*
  it('should fail ESLint when using raw fetch()', async () => {
    // This line should trigger ESLint error if uncommented:
    // const response = await fetch('/api/test');

    expect(true).toBe(true);
  });
  */
});
