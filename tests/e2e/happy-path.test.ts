/**
 * Happy Path E2E Test
 * Tests the complete user journey with running servers
 *
 * Prerequisites:
 * - All servers running (API: 3001, Web: 5176, Skills: 8001)
 * - Run with: npx playwright test tests/e2e/happy-path.test.ts --headed
 */
import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

// Configuration
const WEB_URL = 'http://localhost:5176';
const TEST_TIMEOUT = 60000; // 60 seconds

test.describe('Happy Path: Complete Portfolio Generation Flow', () => {
  test.setTimeout(TEST_TIMEOUT);

  test('should complete full workflow from home to uploaded files', async ({ page }) => {
    // ========================================
    // Step 1: Load Homepage
    // ========================================
    console.log('📍 Step 1: Loading homepage...');
    await page.goto(WEB_URL);

    // Verify homepage loaded
    await expect(page.locator('h1')).toContainText('Kirby Gen');
    await expect(page.locator('text=Start New Project')).toBeVisible();
    console.log('✓ Homepage loaded successfully');

    // ========================================
    // Step 2: Create New Project
    // ========================================
    console.log('📍 Step 2: Creating new project...');
    const createProjectButton = page.locator('button:has-text("Start New Project")');
    await createProjectButton.click();

    // Wait for navigation to input page
    await page.waitForURL(/\/project\/.*\/input/, { timeout: 10000 });

    // Extract project ID from URL
    const url = page.url();
    const projectIdMatch = url.match(/\/project\/([^\/]+)\/input/);
    const projectId = projectIdMatch ? projectIdMatch[1] : null;
    expect(projectId).toBeTruthy();
    console.log(`✓ Project created with ID: ${projectId}`);

    // ========================================
    // Step 3: Verify Input Page Elements
    // ========================================
    console.log('📍 Step 3: Verifying input page...');
    await expect(page.locator('h1')).toContainText('Upload Your Work');
    await expect(page.locator('h2:has-text("Portfolio Content")')).toBeVisible();
    await expect(page.locator('h2:has-text("Branding")')).toBeVisible();
    console.log('✓ Input page loaded with all sections');

    // ========================================
    // Step 4: Create Test File
    // ========================================
    console.log('📍 Step 4: Creating test file...');
    const testFilePath = path.join(__dirname, 'test-upload.txt');
    fs.writeFileSync(testFilePath, 'This is test content for portfolio generation.');
    console.log(`✓ Test file created: ${testFilePath}`);

    // ========================================
    // Step 5: Upload File
    // ========================================
    console.log('📍 Step 5: Uploading file...');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testFilePath);

    // Wait a bit for the file to be processed
    await page.waitForTimeout(1000);
    console.log('✓ File uploaded');

    // ========================================
    // Step 6: Add Pinterest URL (Optional)
    // ========================================
    console.log('📍 Step 6: Adding Pinterest URL...');
    const pinterestInput = page.locator('input[id="pinterest-url"]');
    await pinterestInput.fill('https://pinterest.com/test/inspiration');
    console.log('✓ Pinterest URL added');

    // ========================================
    // Step 7: Configure Branding
    // ========================================
    console.log('📍 Step 7: Configuring branding...');

    // Change primary color
    const primaryColorText = page.locator('input[type="text"].color-text-input').first();
    await primaryColorText.fill('#1e40af');

    // Change secondary color
    const secondaryColorText = page.locator('input[type="text"].color-text-input').nth(1);
    await secondaryColorText.fill('#f3f4f6');

    // Change font family
    const fontSelect = page.locator('select[id="font-family"]');
    await fontSelect.selectOption('Roboto');

    // Verify preview updates
    await expect(page.locator('.preview-card h4')).toHaveCSS('color', 'rgb(30, 64, 175)');
    console.log('✓ Branding configured successfully');

    // ========================================
    // Step 8: Verify Font Loading
    // ========================================
    console.log('📍 Step 8: Verifying font loading...');
    // Check that Google Fonts link was added to the page
    const fontLink = page.locator('link[id="google-font-branding"]');
    await expect(fontLink).toHaveAttribute('href', /fonts\.googleapis\.com.*Roboto/);
    console.log('✓ Google Font loaded dynamically');

    // ========================================
    // Step 9: Submit Form
    // ========================================
    console.log('📍 Step 9: Submitting form...');
    const continueButton = page.locator('button:has-text("Continue")');
    await expect(continueButton).toBeEnabled();
    await continueButton.click();

    // Wait for navigation to domain mapping page
    await page.waitForURL(/\/project\/.*\/domain-mapping/, { timeout: 10000 });
    console.log('✓ Form submitted, navigated to domain mapping');

    // ========================================
    // Step 10: Verify Domain Mapping Page
    // ========================================
    console.log('📍 Step 10: Verifying domain mapping page...');
    await expect(page.locator('h1')).toContainText('Domain Mapping');
    console.log('✓ Reached domain mapping page');

    // ========================================
    // Cleanup
    // ========================================
    console.log('📍 Cleanup: Removing test file...');
    fs.unlinkSync(testFilePath);
    console.log('✓ Test file removed');

    console.log('');
    console.log('🎉 Happy path test completed successfully!');
    console.log(`   Project ID: ${projectId}`);
  });

  test('should handle going back to home from input page', async ({ page }) => {
    console.log('📍 Testing navigation back to home...');

    // Create project
    await page.goto(WEB_URL);
    await page.locator('button:has-text("Start New Project")').click();
    await page.waitForURL(/\/project\/.*\/input/);

    // Click back/cancel button
    const cancelButton = page.locator('button:has-text("Cancel")').first();
    await cancelButton.click();

    // Should navigate back to home
    await page.waitForURL(WEB_URL, { timeout: 5000 });
    await expect(page.locator('h1')).toContainText('Kirby Gen');
    console.log('✓ Successfully navigated back to home');
  });

  test('should prevent submission without files or Pinterest URL', async ({ page }) => {
    console.log('📍 Testing form validation...');

    // Create project
    await page.goto(WEB_URL);
    await page.locator('button:has-text("Start New Project")').click();
    await page.waitForURL(/\/project\/.*\/input/);

    // Try to submit without files
    const continueButton = page.locator('button:has-text("Continue")');
    await expect(continueButton).toBeDisabled();
    console.log('✓ Continue button disabled without content');

    // Add Pinterest URL
    await page.locator('input[id="pinterest-url"]').fill('https://pinterest.com/test/board');

    // Button should now be enabled
    await expect(continueButton).toBeEnabled();
    console.log('✓ Continue button enabled with Pinterest URL');
  });

  test('should preserve project ID across page refresh', async ({ page }) => {
    console.log('📍 Testing project ID persistence...');

    // Create project
    await page.goto(WEB_URL);
    await page.locator('button:has-text("Start New Project")').click();
    await page.waitForURL(/\/project\/.*\/input/);

    const firstUrl = page.url();
    const projectId = firstUrl.match(/\/project\/([^\/]+)\/input/)?.[1];
    expect(projectId).toBeTruthy();

    // Reload the page
    await page.reload();

    // Verify same project ID in URL after reload
    const secondUrl = page.url();
    expect(secondUrl).toContain(projectId!);

    // Verify input page is still accessible
    await expect(page.locator('h1')).toContainText('Upload Your Work');
    await expect(page.locator('h2:has-text("Portfolio Content")')).toBeVisible();

    console.log(`✓ Project ID persisted after reload: ${projectId}`);
  });
});

/**
 * Run this test with:
 *
 * # Install Playwright if not already installed
 * npm install -D @playwright/test
 * npx playwright install
 *
 * # Make sure all servers are running
 * npm run dev
 *
 * # Run the test (headed mode to see the browser)
 * npx playwright test tests/e2e/happy-path.test.ts --headed
 *
 * # Run the test (headless mode)
 * npx playwright test tests/e2e/happy-path.test.ts
 *
 * # Run with UI mode for debugging
 * npx playwright test tests/e2e/happy-path.test.ts --ui
 */
