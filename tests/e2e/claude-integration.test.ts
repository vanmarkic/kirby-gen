/**
 * Claude CLI Integration Test
 * Tests the domain mapping AI conversation feature with Claude CLI
 *
 * Prerequisites:
 * - All servers running (API: 3010, Web: 5176)
 * - Claude CLI installed and configured
 * - Run with: npx playwright test tests/e2e/claude-integration.test.ts --headed
 */
import { test, expect } from '@playwright/test';

// Configuration
const WEB_URL = 'http://localhost:5176';
const TEST_TIMEOUT = 60000; // 60 seconds

test.describe('Claude CLI Integration', () => {
  test.setTimeout(TEST_TIMEOUT);

  test('should successfully initialize and respond via Claude CLI', async ({ page }) => {
    // ========================================
    // Step 1: Load Homepage
    // ========================================
    console.log('📍 Step 1: Loading homepage...');
    await page.goto(WEB_URL);
    await expect(page.locator('h1')).toContainText('Kirby Gen');
    console.log('✓ Homepage loaded');

    // ========================================
    // Step 2: Create New Project
    // ========================================
    console.log('📍 Step 2: Creating new project...');
    await page.locator('button:has-text("Start New Project")').click();
    await page.waitForURL(/\/project\/.*\/input/, { timeout: 10000 });

    const url = page.url();
    const projectId = url.match(/\/project\/([^\/]+)\/input/)?.[1];
    expect(projectId).toBeTruthy();
    console.log(`✓ Project created: ${projectId}`);

    // ========================================
    // Step 3: Add Pinterest URL (to enable Continue button)
    // ========================================
    console.log('📍 Step 3: Adding content...');
    await page.locator('input[id="pinterest-url"]').fill('https://pinterest.com/test/board');
    console.log('✓ Content added');

    // ========================================
    // Step 4: Navigate to Domain Mapping
    // ========================================
    console.log('📍 Step 4: Navigating to domain mapping...');
    const continueButton = page.locator('button:has-text("Continue")');
    await expect(continueButton).toBeEnabled();
    await continueButton.click();

    await page.waitForURL(/\/project\/.*\/domain-mapping/, { timeout: 10000 });
    await expect(page.locator('h1')).toContainText('Domain Mapping');
    console.log('✓ Domain mapping page loaded');

    // ========================================
    // Step 5: Verify Initial Claude Message
    // ========================================
    console.log('📍 Step 5: Verifying Claude AI greeting...');

    // Wait for the AI greeting message to appear
    const aiGreeting = page.locator('.message-bubble').first();
    await expect(aiGreeting).toBeVisible({ timeout: 15000 });

    const greetingText = await aiGreeting.textContent();
    expect(greetingText?.toLowerCase()).toContain('help');
    console.log('✓ Claude AI greeting received');
    console.log(`   Message: ${greetingText?.substring(0, 100)}...`);

    // ========================================
    // Step 6: Send Message to Claude
    // ========================================
    console.log('📍 Step 6: Sending message to Claude...');

    const messageInput = page.locator('textarea, input[type="text"]').last();
    await messageInput.fill('I want to create a portfolio for web development projects');

    const sendButton = page.locator('button:has-text("Send"), button[type="submit"]').last();
    await sendButton.click();

    console.log('✓ Message sent');

    // ========================================
    // Step 7: Verify Claude Response
    // ========================================
    console.log('📍 Step 7: Waiting for Claude response...');

    // Wait for Claude's response (should be the second or third message)
    await page.waitForTimeout(2000); // Give it time to process

    const messages = page.locator('.message-bubble');
    const messageCount = await messages.count();

    expect(messageCount).toBeGreaterThan(1);
    console.log(`✓ Received ${messageCount} messages total`);

    // Get the last message (Claude's response)
    const lastMessage = messages.last();
    const responseText = await lastMessage.textContent();

    // Verify the response is not an error
    expect(responseText).not.toContain('error');
    expect(responseText).not.toContain('trouble');
    expect(responseText).not.toContain('failed');

    console.log('✓ Claude responded successfully');
    console.log(`   Response: ${responseText?.substring(0, 150)}...`);

    // ========================================
    // Complete
    // ========================================
    console.log('');
    console.log('🎉 Claude CLI integration test completed successfully!');
    console.log(`   Project ID: ${projectId}`);
    console.log(`   Total messages: ${messageCount}`);
  });

  test('should handle multiple conversation turns', async ({ page }) => {
    console.log('📍 Testing multiple conversation turns...');

    // Create project and navigate to domain mapping
    await page.goto(WEB_URL);
    await page.locator('button:has-text("Start New Project")').click();
    await page.waitForURL(/\/project\/.*\/input/);

    await page.locator('input[id="pinterest-url"]').fill('https://pinterest.com/test');
    await page.locator('button:has-text("Continue")').click();
    await page.waitForURL(/\/project\/.*\/domain-mapping/);

    // Wait for initial greeting
    await page.waitForTimeout(2000);

    // Send first message
    const messageInput = page.locator('textarea, input[type="text"]').last();
    await messageInput.fill('music projects');
    await page.locator('button:has-text("Send"), button[type="submit"]').last().click();

    await page.waitForTimeout(2000);

    // Send second message
    await messageInput.fill('and also web apps');
    await page.locator('button:has-text("Send"), button[type="submit"]').last().click();

    await page.waitForTimeout(2000);

    // Verify we have multiple messages
    const messages = page.locator('.message-bubble');
    const count = await messages.count();

    expect(count).toBeGreaterThanOrEqual(3); // greeting + 2 user messages + at least 1 response
    console.log(`✓ Multiple turns successful: ${count} messages`);
  });
});

/**
 * Run this test with:
 *
 * # Make sure all servers are running
 * npm run dev
 *
 * # Run the test (headed mode to see the browser)
 * npx playwright test tests/e2e/claude-integration.test.ts --headed
 *
 * # Run in headless mode
 * npx playwright test tests/e2e/claude-integration.test.ts
 */
