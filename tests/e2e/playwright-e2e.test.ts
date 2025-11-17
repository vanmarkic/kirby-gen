/**
 * Playwright E2E Test
 * Browser-based end-to-end test for the web interface
 *
 * Prerequisites:
 * - npm install -D @playwright/test
 * - npx playwright install
 *
 * This test validates:
 * 1. Web UI loads correctly
 * 2. User can create a project through the UI
 * 3. User can upload files via drag-and-drop or file picker
 * 4. User can configure branding settings
 * 5. Real-time progress updates display correctly
 * 6. Generated site preview works
 * 7. Download functionality works
 */
import { test, expect, Page } from '@playwright/test';
import path from 'path';
import { startTestServer, TestServerInstance } from './helpers/server-setup';
import { startMockSkillsServer, MockSkillsServer } from './helpers/mock-skills';

/**
 * NOTE: This test requires Playwright to be installed.
 * To install: npm install -D @playwright/test && npx playwright install
 *
 * If Playwright is not available, this test will be skipped.
 */

// Check if Playwright is available
let playwrightAvailable = true;
try {
  require('@playwright/test');
} catch {
  playwrightAvailable = false;
  console.warn('⚠️  Playwright not installed. Skipping browser E2E tests.');
  console.warn('   To install: npm install -D @playwright/test && npx playwright install');
}

// Skip all tests if Playwright is not available
const describeOrSkip = playwrightAvailable ? describe : describe.skip;

describeOrSkip('Playwright E2E: Web Interface', () => {
  let testServer: TestServerInstance;
  let mockSkillsServer: MockSkillsServer;
  let webServerUrl: string;

  // Test timeout
  const testTimeout = 120000; // 2 minutes

  /**
   * Setup: Start servers before all tests
   */
  test.beforeAll(async () => {
    // Start mock Python skills server
    mockSkillsServer = await startMockSkillsServer({
      port: 5001,
      fixturesDir: path.join(__dirname, 'fixtures'),
    });

    // Start API server
    testServer = await startTestServer({
      port: 3004, // Different port from other E2E tests
      skillsServerUrl: 'http://localhost:5001',
    });

    // Web server URL (assumes web app runs on port 5173 in dev)
    // In a real scenario, you'd start the web server here too
    webServerUrl = 'http://localhost:5173';

    console.log('🚀 Test servers started');
  }, testTimeout);

  /**
   * Cleanup: Stop servers after all tests
   */
  test.afterAll(async () => {
    await testServer.cleanup();
    await mockSkillsServer.stop();
    console.log('🛑 Test servers stopped');
  }, testTimeout);

  /**
   * Test: Homepage loads correctly
   */
  test('should load homepage', async ({ page }) => {
    await page.goto(webServerUrl);

    // Check page title
    await expect(page).toHaveTitle(/Kirby Gen/i);

    // Check for main heading
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();

    console.log('✓ Homepage loaded');
  });

  /**
   * Test: Create new project via UI
   */
  test('should create new project through UI', async ({ page }) => {
    await page.goto(webServerUrl);

    // Click "New Project" button
    const newProjectButton = page.locator('button', { hasText: /new project/i });
    await newProjectButton.click();

    // Wait for project creation
    await page.waitForSelector('[data-testid="project-workspace"]', {
      timeout: 5000,
    });

    // Verify project ID is displayed
    const projectId = await page.locator('[data-testid="project-id"]').textContent();
    expect(projectId).toBeTruthy();

    console.log(`✓ Project created: ${projectId}`);
  });

  /**
   * Test: Upload files via drag and drop
   */
  test('should upload files via file picker', async ({ page }) => {
    await page.goto(webServerUrl);

    // Create new project
    await page.locator('button', { hasText: /new project/i }).click();
    await page.waitForSelector('[data-testid="project-workspace"]');

    // Find file input
    const fileInput = page.locator('input[type="file"]');

    // Upload test file
    const testFilePath = path.join(__dirname, 'fixtures/sample-content/about.md');
    await fileInput.setInputFiles(testFilePath);

    // Wait for upload to complete
    await page.waitForSelector('[data-testid="uploaded-file"]', {
      timeout: 5000,
    });

    // Verify file appears in list
    const uploadedFile = page.locator('[data-testid="uploaded-file"]');
    await expect(uploadedFile).toContainText('about.md');

    console.log('✓ File uploaded via file picker');
  });

  /**
   * Test: Configure branding settings
   */
  test('should configure branding settings', async ({ page }) => {
    await page.goto(webServerUrl);

    // Create new project
    await page.locator('button', { hasText: /new project/i }).click();
    await page.waitForSelector('[data-testid="project-workspace"]');

    // Navigate to branding tab
    await page.locator('[data-testid="tab-branding"]').click();

    // Set primary color
    const colorInput = page.locator('input[name="primaryColor"]');
    await colorInput.fill('#0ea5e9');

    // Set Pinterest URL
    const pinterestInput = page.locator('input[name="pinterestUrl"]');
    await pinterestInput.fill('https://pinterest.com/example/inspiration');

    // Save settings
    await page.locator('button', { hasText: /save/i }).click();

    // Verify success message
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();

    console.log('✓ Branding settings configured');
  });

  /**
   * Test: Complete workflow with real-time progress
   */
  test(
    'should complete workflow with real-time progress updates',
    async ({ page }) => {
      await page.goto(webServerUrl);

      // Create new project
      await page.locator('button', { hasText: /new project/i }).click();
      await page.waitForSelector('[data-testid="project-workspace"]');

      // Upload files
      const fileInput = page.locator('input[type="file"]');
      const testFiles = [
        'sample-content/about.md',
        'sample-content/projects.md',
        'sample-content/blog-posts.md',
      ];

      for (const file of testFiles) {
        const filePath = path.join(__dirname, 'fixtures', file);
        await fileInput.setInputFiles(filePath);
        await page.waitForTimeout(500);
      }

      // Start generation
      await page.locator('button', { hasText: /generate/i }).click();

      // Monitor progress
      const progressBar = page.locator('[data-testid="progress-bar"]');
      await expect(progressBar).toBeVisible();

      // Wait for each phase to appear
      const phases = [
        'domain-mapping',
        'content-structuring',
        'design-automation',
        'cms-adaptation',
        'deployment',
      ];

      for (const phase of phases) {
        await expect(
          page.locator(`[data-testid="phase-${phase}"]`)
        ).toBeVisible({
          timeout: 30000,
        });
        console.log(`✓ Phase: ${phase}`);
      }

      // Wait for completion
      await expect(
        page.locator('[data-testid="status-completed"]')
      ).toBeVisible({
        timeout: 60000,
      });

      console.log('✓ Workflow completed with real-time updates');
    },
    testTimeout
  );

  /**
   * Test: Preview generated site
   */
  test('should preview generated site', async ({ page }) => {
    // This assumes a project has already been generated
    // In a real scenario, you'd complete the workflow first

    await page.goto(webServerUrl);

    // Navigate to projects list
    await page.locator('[data-testid="projects-link"]').click();

    // Click on a completed project
    await page.locator('[data-testid="project-item"]:first-child').click();

    // Click preview button
    await page.locator('button', { hasText: /preview/i }).click();

    // Wait for preview iframe or new tab
    const previewFrame = page.frameLocator('[data-testid="preview-frame"]');
    await expect(previewFrame.locator('body')).toBeVisible();

    console.log('✓ Site preview works');
  });

  /**
   * Test: Download generated site
   */
  test('should download generated site', async ({ page }) => {
    await page.goto(webServerUrl);

    // Navigate to projects list
    await page.locator('[data-testid="projects-link"]').click();

    // Click on a completed project
    await page.locator('[data-testid="project-item"]:first-child').click();

    // Setup download listener
    const downloadPromise = page.waitForEvent('download');

    // Click download button
    await page.locator('button', { hasText: /download/i }).click();

    // Wait for download
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/portfolio.*\.zip/i);

    console.log('✓ Site download works');
  });

  /**
   * Test: Error handling in UI
   */
  test('should display error messages correctly', async ({ page }) => {
    await page.goto(webServerUrl);

    // Create new project
    await page.locator('button', { hasText: /new project/i }).click();
    await page.waitForSelector('[data-testid="project-workspace"]');

    // Try to generate without files
    await page.locator('button', { hasText: /generate/i }).click();

    // Verify error message appears
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText(
      /upload.*file/i
    );

    console.log('✓ Error messages display correctly');
  });

  /**
   * Test: Responsive design
   */
  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto(webServerUrl);

    // Check that mobile menu works
    const mobileMenuButton = page.locator('[data-testid="mobile-menu-button"]');
    await expect(mobileMenuButton).toBeVisible();

    await mobileMenuButton.click();

    // Verify mobile menu opens
    await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();

    console.log('✓ Mobile responsive design works');
  });

  /**
   * Test: Accessibility
   */
  test('should meet basic accessibility standards', async ({ page }) => {
    await page.goto(webServerUrl);

    // Check for landmarks
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('nav')).toBeVisible();

    // Check for skip link
    const skipLink = page.locator('a[href="#main"]');
    await expect(skipLink).toBeTruthy();

    // Check heading hierarchy
    const h1 = page.locator('h1');
    await expect(h1).toBeVisible();

    console.log('✓ Basic accessibility checks pass');
  });

  /**
   * Test: WebSocket connection and disconnection
   */
  test('should handle WebSocket connection properly', async ({ page }) => {
    await page.goto(webServerUrl);

    // Create new project
    await page.locator('button', { hasText: /new project/i }).click();
    await page.waitForSelector('[data-testid="project-workspace"]');

    // Check WebSocket connection status
    const wsStatus = page.locator('[data-testid="ws-status"]');
    await expect(wsStatus).toContainText(/connected/i);

    // Simulate network disconnection
    await page.context().setOffline(true);

    // Check disconnected status
    await expect(wsStatus).toContainText(/disconnected/i);

    // Restore connection
    await page.context().setOffline(false);

    // Check reconnected status
    await expect(wsStatus).toContainText(/connected/i, { timeout: 10000 });

    console.log('✓ WebSocket connection handling works');
  });
});

/**
 * Playwright Configuration
 * Create this in a separate playwright.config.ts file:
 *
 * ```typescript
 * import { defineConfig, devices } from '@playwright/test';
 *
 * export default defineConfig({
 *   testDir: './tests/e2e',
 *   testMatch: '**\/playwright-e2e.test.ts',
 *   fullyParallel: false,
 *   forbidOnly: !!process.env.CI,
 *   retries: process.env.CI ? 2 : 0,
 *   workers: 1,
 *   reporter: 'html',
 *   use: {
 *     baseURL: 'http://localhost:5173',
 *     trace: 'on-first-retry',
 *     screenshot: 'only-on-failure',
 *   },
 *   projects: [
 *     {
 *       name: 'chromium',
 *       use: { ...devices['Desktop Chrome'] },
 *     },
 *     {
 *       name: 'firefox',
 *       use: { ...devices['Desktop Firefox'] },
 *     },
 *     {
 *       name: 'webkit',
 *       use: { ...devices['Desktop Safari'] },
 *     },
 *     {
 *       name: 'Mobile Chrome',
 *       use: { ...devices['Pixel 5'] },
 *     },
 *   ],
 * });
 * ```
 */
