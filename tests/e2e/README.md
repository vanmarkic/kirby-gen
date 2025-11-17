# End-to-End (E2E) Tests

Comprehensive end-to-end tests for the Kirby-Gen portfolio generator, validating the complete workflow from project creation to deployment.

## Overview

The E2E test suite validates the entire portfolio generation workflow including:

1. **Project Creation** - API endpoints for creating and managing projects
2. **File Upload** - Content file upload and storage
3. **Domain Mapping** - AI-powered content analysis and schema generation
4. **Content Structuring** - Converting raw content into structured data
5. **Design Automation** - Generating design systems and tokens
6. **CMS Adaptation** - Creating Kirby CMS structure and templates
7. **Git Integration** - Repository initialization and commits
8. **Deployment** - Site deployment and accessibility
9. **WebSocket Communication** - Real-time progress updates
10. **Error Handling** - Graceful error recovery

## Directory Structure

```
tests/e2e/
├── README.md                          # This file
├── full-workflow.test.ts              # Main E2E test suite
├── playwright-e2e.test.ts             # Browser E2E tests (optional)
├── fixtures/                          # Test data
│   ├── sample-content/                # Sample markdown files
│   │   ├── about.md
│   │   ├── projects.md
│   │   ├── blog-posts.md
│   │   └── contact.md
│   ├── sample-schema.json             # Pre-defined domain model
│   ├── sample-design-system.json      # Pre-defined design tokens
│   └── sample-structured-content.json # Expected structured output
└── helpers/                           # Test utilities
    ├── server-setup.ts                # Start/stop API server
    ├── mock-skills.ts                 # Mock Python skill responses
    └── assertions.ts                  # Custom validation functions
```

## Prerequisites

### Required

- **Node.js** >= 20.0.0
- **npm** >= 10.0.0
- **All dependencies installed**: `npm install`

### Optional (for Playwright tests)

- **Playwright**: `npm install -D @playwright/test`
- **Browser binaries**: `npx playwright install`

## Running E2E Tests

### Quick Start

Run all E2E tests:

```bash
npm run test:e2e
```

Or from the root directory:

```bash
npm run test:e2e --workspace=packages/api
```

### Run Specific Test File

```bash
# Run main workflow test
npx jest tests/e2e/full-workflow.test.ts

# Run Playwright tests (requires Playwright installation)
npx playwright test tests/e2e/playwright-e2e.test.ts
```

### Run with Verbose Output

```bash
npm run test:e2e -- --verbose
```

### Watch Mode (for development)

```bash
npx jest tests/e2e --watch
```

## Test Configuration

### Environment Variables

E2E tests use isolated test directories to avoid conflicts:

```bash
NODE_ENV=test
PORT=3003
LOG_LEVEL=error
AUTH_ENABLED=false
STORAGE_DIR=./test-data/e2e/storage
SESSION_DIR=./test-data/e2e/sessions
UPLOAD_DIR=./test-data/e2e/uploads
DEPLOYMENT_DIR=./test-data/e2e/deployments
SKILLS_SERVER_URL=http://localhost:5001
```

These are automatically set by the test setup.

### Mock Skills Server

The E2E tests use a **mock Python skills server** that:

- Runs on port 5001 (default)
- Returns fixture data from `fixtures/` directory
- Simulates realistic processing times
- Provides consistent, predictable responses

This eliminates dependency on the actual Python skills server during testing.

### Test Timeouts

- **Default test timeout**: 30 seconds
- **Full workflow test**: 120 seconds (2 minutes)
- **Individual operations**: 5-10 seconds

## Test Suites

### 1. Full Workflow Test (`full-workflow.test.ts`)

**Purpose**: Validates the complete portfolio generation workflow.

**Test Flow**:

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Project Creation                                         │
│    POST /api/projects → projectId                           │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 2. WebSocket Connection                                     │
│    Connect to WS, subscribe to projectId                    │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 3. Upload Content Files                                     │
│    POST /api/projects/:id/files/upload                      │
│    - about.md, projects.md, blog-posts.md, contact.md       │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 4. Add Branding Assets                                      │
│    PATCH /api/projects/:id                                  │
│    - Colors, fonts, Pinterest URL                           │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 5. Trigger Generation                                       │
│    POST /api/projects/:id/generate                          │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 6. Monitor Progress (via WebSocket)                         │
│    ┌─────────────────────────────────────────┐             │
│    │ Phase 1: Domain Mapping         (20%)  │             │
│    │ Phase 2: Content Structuring    (40%)  │             │
│    │ Phase 3: Design Automation      (60%)  │             │
│    │ Phase 4: CMS Adaptation         (80%)  │             │
│    │ Phase 5: Deployment            (100%)  │             │
│    └─────────────────────────────────────────┘             │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 7. Validate Results                                         │
│    - Project status = "completed"                           │
│    - Domain model exists                                    │
│    - Structured content exists                              │
│    - Design system exists                                   │
│    - Kirby site structure valid                             │
│    - Git repository initialized                             │
│    - Deployment URL available                               │
└─────────────────────────────────────────────────────────────┘
```

**Assertions**:

- ✅ All 5 workflow phases complete successfully
- ✅ Progress events received in correct order
- ✅ Domain model contains entities and schema
- ✅ Structured content matches expected format
- ✅ Design system has tokens and branding
- ✅ Kirby site has correct directory structure
- ✅ Git repository is initialized with commits
- ✅ Deployment URL is generated

**Error Scenarios Tested**:

- Missing project (404)
- Invalid file uploads (400)
- Invalid Pinterest URL (400)
- Validation errors (400)

**Partial Workflows Tested**:

- Manual domain model creation
- Skipping domain mapping when model exists

### 2. Playwright Browser Tests (`playwright-e2e.test.ts`)

**Purpose**: Validates the web interface and user interactions.

**Note**: Requires Playwright installation. Tests are automatically skipped if Playwright is not available.

**Test Scenarios**:

1. **UI Loading**
   - Homepage loads correctly
   - Page title and headings display

2. **Project Creation**
   - Create new project via UI button
   - Project workspace appears

3. **File Upload**
   - Upload via file picker
   - Files appear in upload list

4. **Branding Configuration**
   - Set primary color
   - Set Pinterest URL
   - Save settings

5. **Real-time Progress**
   - Monitor progress bar
   - See phase updates
   - Completion status

6. **Site Preview**
   - Preview iframe loads
   - Generated site displays

7. **Download**
   - Download button triggers download
   - ZIP file name is correct

8. **Responsive Design**
   - Mobile viewport
   - Mobile menu functionality

9. **Accessibility**
   - Landmarks present
   - Skip links available
   - Heading hierarchy

10. **WebSocket Handling**
    - Connection status display
    - Reconnection on network issues

## Helpers

### Server Setup (`helpers/server-setup.ts`)

**`startTestServer(config?)`**
Starts the API server with test configuration.

```typescript
const server = await startTestServer({
  port: 3003,
  storageDir: './test-data/e2e/storage',
  cleanupOnStop: true,
});

// Use server.baseUrl for requests
// Call server.cleanup() when done
```

**`createTestClient(baseUrl)`**
Creates a simple HTTP client for API requests.

```typescript
const client = createTestClient(server.baseUrl);

const response = await client.get('/api/projects');
const data = await response.json();
```

### Mock Skills (`helpers/mock-skills.ts`)

**`startMockSkillsServer(config?)`**
Starts the mock Python skills server.

```typescript
const mockServer = await startMockSkillsServer({
  port: 5001,
  fixturesDir: './fixtures',
});

// Automatically responds to skill requests with fixture data
// Call mockServer.stop() when done
```

**Mocked Skills**:

- `domain-mapping` → Returns `sample-schema.json`
- `content-structuring` → Returns `sample-structured-content.json`
- `design-automation` → Returns `sample-design-system.json`

### Assertions (`helpers/assertions.ts`)

Custom assertion functions for validating generated files:

```typescript
// File system assertions
await assertFileExists('/path/to/file');
await assertDirectoryExists('/path/to/dir');
await assertFileContains('/path/to/file', 'expected content');
await assertJsonStructure('/path/to/file.json', ['key1', 'key2']);

// Kirby assertions
await assertKirbySiteStructure('/path/to/site');
await assertGitRepository('/path/to/repo');

// Project assertions
assertProjectComplete(project);
assertDomainModel(project);
assertStructuredContent(project);
assertDesignSystem(project);

// Utility functions
const count = await countFiles('/path/to/dir', '.php');
const files = await getAllFiles('/path/to/dir');
```

## Fixtures

### Sample Content Files

Realistic portfolio content in Markdown format:

- **`about.md`** - About page with bio, skills, experience
- **`projects.md`** - 4 portfolio projects with details
- **`blog-posts.md`** - 4 blog posts with metadata
- **`contact.md`** - Contact information and availability

### Sample Schema (`sample-schema.json`)

Pre-defined domain model with:

- **Entities**: Page, Project, BlogPost
- **Fields**: Text, textarea, markdown, number, date, tags, etc.
- **Relationships**: One-to-many between projects and blog posts
- **JSON Schema**: Complete schema definition

### Sample Design System (`sample-design-system.json`)

Complete design tokens including:

- **Colors**: Primary, neutral, accent, semantic
- **Typography**: Font families, sizes, weights, line heights
- **Spacing**: Base unit and scale
- **Breakpoints**: Responsive sizes
- **Shadows**: Box shadows
- **Borders**: Radius and width
- **Animations**: Duration and easing

### Sample Structured Content (`sample-structured-content.json`)

Expected output after content structuring:

- 2 Pages (About, Contact)
- 4 Projects (with full details)
- 4 Blog Posts (with metadata)

## Troubleshooting

### Tests Fail to Start

**Issue**: Server won't start

```
Error: listen EADDRINUSE: address already in use :::3003
```

**Solution**: Another process is using the test port

```bash
# Find and kill the process
lsof -ti:3003 | xargs kill -9

# Or use a different port
startTestServer({ port: 3004 })
```

### Mock Skills Server Issues

**Issue**: Skills server connection refused

**Solution**: Ensure mock server started before API server

```typescript
// Correct order
await startMockSkillsServer();
await startTestServer();
```

### Timeout Errors

**Issue**: Test times out waiting for workflow

**Solution**: Increase timeout or check mock server responses

```typescript
it('should complete workflow', async () => {
  // ...test code
}, 180000); // 3 minutes
```

### File Permission Errors

**Issue**: Cannot write to test directories

**Solution**: Ensure write permissions

```bash
chmod -R 755 test-data/
```

### WebSocket Connection Fails

**Issue**: WebSocket won't connect in tests

**Solution**: Ensure Socket.IO transports are configured

```typescript
const socketClient = ioClient(baseUrl, {
  transports: ['websocket'], // Force WebSocket
});
```

## Continuous Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  e2e:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm install

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload test results
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: test-results
          path: coverage/
```

### With Playwright

```yaml
- name: Install Playwright
  run: npx playwright install --with-deps

- name: Run Playwright tests
  run: npx playwright test

- name: Upload Playwright report
  if: failure()
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: playwright-report/
```

## Best Practices

### 1. Test Isolation

- Each test should be independent
- Use separate test directories
- Clean up after tests complete

### 2. Realistic Data

- Use fixtures that mirror real-world usage
- Include edge cases in test data
- Validate against actual schemas

### 3. Error Handling

- Test both success and failure paths
- Verify error messages are helpful
- Ensure graceful degradation

### 4. Performance

- Tests should complete quickly
- Use mocks to avoid external dependencies
- Run tests in parallel when possible

### 5. Maintainability

- Keep tests readable and well-documented
- Use helper functions to reduce duplication
- Update tests when APIs change

## Contributing

When adding new features, please:

1. Add corresponding E2E tests
2. Update fixtures if needed
3. Document test scenarios in this README
4. Ensure tests pass in CI

## Resources

- [Jest Documentation](https://jestjs.io/)
- [Playwright Documentation](https://playwright.dev/)
- [Socket.IO Testing](https://socket.io/docs/v4/testing/)
- [Supertest Documentation](https://github.com/visionmedia/supertest)

## Support

For issues with E2E tests, please:

1. Check this README for troubleshooting
2. Review test output for specific errors
3. Open an issue with test logs
4. Tag with `testing` label
