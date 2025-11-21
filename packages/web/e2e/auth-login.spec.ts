import { test, expect } from '@playwright/test';

/**
 * E2E test for authentication login flow
 * Tests that the frontend correctly calls the API with the right URL
 */
test.describe('Authentication Login', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.goto('http://localhost:5176');
    await page.evaluate(() => localStorage.clear());
  });

  test('should call correct API endpoint when logging in', async ({ page }) => {
    // Arrange: Listen for API requests
    const apiRequests: string[] = [];

    page.on('request', request => {
      const url = request.url();
      if (url.includes('/auth/login')) {
        apiRequests.push(url);
      }
    });

    // Act: Navigate to login page and submit
    await page.goto('http://localhost:5176/login');

    // Wait for page to load
    await page.waitForSelector('input[type="password"]', { timeout: 5000 });

    // Fill in password field
    await page.fill('input[type="password"]', 'test-password');

    // Submit form
    await page.click('button[type="submit"]');

    // Wait for request to be made
    await page.waitForTimeout(1000);

    // Assert: Should have called the correct API endpoint
    expect(apiRequests.length).toBeGreaterThan(0);

    const loginRequest = apiRequests[0];
    console.log('Login API request URL:', loginRequest);

    // The request should be to http://localhost:5176/api/auth/login
    // (frontend uses /api, which Vite proxies to http://localhost:3000/api)
    expect(loginRequest).toContain('/api/auth/login');
    expect(loginRequest).toBe('http://localhost:5176/api/auth/login');
  });

  test('should successfully login when auth is disabled', async ({ page, context }) => {
    // Arrange: Navigate to login page
    await page.goto('http://localhost:5176/login');

    // Wait for password input
    await page.waitForSelector('input[type="password"]', { timeout: 5000 });

    // Act: Enter any password and submit
    await page.fill('input[type="password"]', 'any-password');
    await page.click('button[type="submit"]');

    // Assert: Should redirect away from login page (successful login)
    await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 5000 });

    // Should have a token in localStorage
    const token = await page.evaluate(() => localStorage.getItem('auth_token'));
    expect(token).toBeTruthy();
    expect(token).toBe('dev-mode-no-auth');
  });
});
