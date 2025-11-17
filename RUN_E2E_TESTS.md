# Running End-to-End Tests

## Prerequisites

All servers must be running:
- ✅ Web server on port 5176
- ✅ API server on port 3001
- ✅ Skills server on port 8001

## Quick Start

```bash
# 1. Install Playwright (already done)
npm install -D @playwright/test

# 2. Install browser
npx playwright install chromium

# 3. Run the happy path test (with visible browser)
npx playwright test tests/e2e/happy-path.test.ts --config=tests/e2e/playwright.config.ts --headed

# 4. Run without browser UI (faster)
npx playwright test tests/e2e/happy-path.test.ts --config=tests/e2e/playwright.config.ts

# 5. Run with debugging UI
npx playwright test tests/e2e/happy-path.test.ts --config=tests/e2e/playwright.config.ts --ui
```

## What the Happy Path Test Covers

The test validates the complete user journey:

1. ✅ **Homepage Loading** - Verifies homepage loads with "Kirby Gen" title
2. ✅ **Project Creation** - Clicks "Start New Project" and captures project ID
3. ✅ **Input Page** - Verifies all sections are visible (Content, Branding)
4. ✅ **File Upload** - Creates and uploads a test file
5. ✅ **Pinterest URL** - Adds optional Pinterest board URL
6. ✅ **Branding Configuration** - Sets primary/secondary colors and font
7. ✅ **Font Loading** - Confirms Google Fonts are dynamically loaded
8. ✅ **Form Submission** - Submits and navigates to domain mapping
9. ✅ **Validation** - Tests form validation (disabled without content)
10. ✅ **Navigation** - Tests back button functionality

## Current Status

✅ Playwright installed
✅ Test file created: `tests/e2e/happy-path.test.ts`
✅ Config updated: `tests/e2e/playwright.config.ts` (port 5176)
✅ All servers running correctly

## Troubleshooting

### If browser installation fails:
```bash
# Install all browsers
npx playwright install

# Or just Chromium
npx playwright install chromium
```

### If you get permission errors:
```bash
# Run with sudo (macOS/Linux only)
sudo npx playwright install chromium
```

### To see what went wrong:
```bash
# Run with debug output
DEBUG=pw:api npx playwright test tests/e2e/happy-path.test.ts --config=tests/e2e/playwright.config.ts
```

### To open the test report:
```bash
# After running tests
npx playwright show-report playwright-report
```

## Expected Output

When the test runs successfully, you should see:

```
Running 4 tests using 1 worker

  ✓  Happy Path: Complete Portfolio Generation Flow › should complete full workflow (25s)
  ✓  Happy Path: Complete Portfolio Generation Flow › should handle going back (5s)
  ✓  Happy Path: Complete Portfolio Generation Flow › should prevent submission without files (3s)
  ✓  Happy Path: Complete Portfolio Generation Flow › should preserve project ID (4s)

  4 passed (37s)
```

## Test Details

### Test 1: Complete Workflow
- Creates project
- Uploads file
- Configures branding
- Verifies font loading
- Submits form
- Reaches domain mapping page

### Test 2: Navigation
- Creates project
- Clicks Cancel
- Returns to homepage

### Test 3: Validation
- Creates project
- Verifies Continue button is disabled without content
- Adds Pinterest URL
- Verifies Continue button is enabled

### Test 4: Persistence
- Creates project
- Navigates away and back
- Verifies same project ID persists

## Files Created

- `tests/e2e/happy-path.test.ts` - The actual test suite
- `tests/e2e/playwright.config.ts` - Updated with port 5176
- `RUN_E2E_TESTS.md` - This file

## Next Steps

1. Open a new terminal (to avoid permission issues)
2. Run: `npx playwright install chromium`
3. Run: `npx playwright test tests/e2e/happy-path.test.ts --config=tests/e2e/playwright.config.ts --headed`
4. Watch the browser automation!

The test will automatically:
- Open Chrome
- Navigate to localhost:5176
- Click through the UI
- Verify everything works
- Close the browser

You can watch it all happen in headed mode!
