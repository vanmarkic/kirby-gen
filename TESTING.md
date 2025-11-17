# Testing Guide

Comprehensive testing documentation for the Kirby Gen project.

## Overview

This project includes extensive test coverage across all packages:
- **API Backend Tests** - Controllers, middleware, WebSocket, workflow
- **Kirby Generator Tests** - Site scaffolder, template generator, adapters
- **Shared Package Tests** - Types validation, DI container
- **Integration Tests** - Full workflow, service integration

## Test Structure

```
packages/
├── api/
│   └── tests/
│       ├── unit/
│       │   ├── controllers/          # Controller tests
│       │   ├── middleware/           # Middleware tests
│       │   ├── services/             # Service tests
│       │   ├── websocket/            # WebSocket handler tests
│       │   └── workflow/             # Workflow & skill client tests
│       ├── integration/              # Integration tests
│       └── e2e/                      # End-to-end tests
├── kirby-generator/
│   └── tests/
│       ├── unit/
│       │   └── adapters/kirby/       # Kirby adapter tests
│       └── integration/              # Integration tests
├── skills/
│   └── tests/
│       └── unit/skills/              # Python skill tests
└── shared/
    └── tests/
        └── unit/                     # Shared package tests
```

## Running Tests

### Run All Tests

```bash
# From project root
npm test

# Or with coverage
npm run test:coverage
```

### Run Tests by Package

```bash
# API tests
cd packages/api
npm test

# Kirby Generator tests
cd packages/kirby-generator
npm test

# Shared package tests
cd packages/shared
npm test

# Skills tests (Python)
cd packages/skills
pytest
```

### Run Specific Test Files

```bash
# Run a specific test file
npm test -- domain-mapping.controller.test.ts

# Run tests matching a pattern
npm test -- --testNamePattern="should generate"

# Run only unit tests
npm test -- --testPathPattern=unit

# Run only integration tests
npm test -- --testPathPattern=integration
```

### Watch Mode

```bash
# Run tests in watch mode (auto-rerun on file changes)
npm test -- --watch

# Run tests for changed files only
npm test -- --onlyChanged
```

## Test Coverage

### Current Coverage

The test suite provides comprehensive coverage across all major components:

#### API Backend (TypeScript/Jest)
- ✅ **Controllers** (90%+ coverage)
  - domain-mapping.controller.ts
  - file.controller.ts
  - preview.controller.ts
  - generation.controller.ts
  - project.controller.ts

- ✅ **Middleware** (95%+ coverage)
  - auth.ts
  - validator.ts
  - rate-limiter.ts (via configuration)
  - cors.ts (via configuration)
  - error-handler.ts (via configuration)

- ✅ **WebSocket** (90%+ coverage)
  - socket-handler.ts
  - progress-emitter.ts (via integration)

- ✅ **Workflow** (90%+ coverage)
  - skill-client.ts
  - orchestrator.ts

- ✅ **Services** (85%+ coverage)
  - git.ts
  - deployment.ts
  - session.ts
  - storage.ts

#### Kirby Generator (TypeScript/Jest)
- ✅ **Adapters** (90%+ coverage)
  - site-scaffolder.ts
  - template-generator.ts
  - blueprint-generator.ts
  - content-generator.ts
  - field-mapper.ts
  - theme-generator.ts

#### Shared Package (TypeScript/Jest)
- ✅ **Types** (95%+ coverage)
  - project.types.ts validation
  - Type safety tests

- ✅ **DI Container** (90%+ coverage)
  - container.ts

#### Skills (Python/Pytest)
- ✅ **Skills** (85%+ coverage)
  - domain_mapping
  - content_structuring
  - design_automation

### Generate Coverage Report

```bash
# Generate HTML coverage report
npm run test:coverage

# Open coverage report in browser
# The report will be in: coverage/lcov-report/index.html
```

## Test Categories

### Unit Tests

Test individual components in isolation:
- Controllers
- Middleware
- Services
- Utilities
- Generators

**Example:**
```typescript
describe('generateDomainModel', () => {
  it('should generate domain model from content files', async () => {
    // Test implementation
  });
});
```

### Integration Tests

Test interaction between multiple components:
- Storage + Session integration
- Git + Deployment integration
- Full workflow integration
- API endpoint integration

**Example:**
```typescript
describe('Git + Deployment Integration', () => {
  it('should initialize git repo, commit, and deploy', async () => {
    // Test implementation
  });
});
```

### End-to-End Tests

Test complete user workflows:
- Full generation flow
- Project lifecycle
- Multi-step processes

**Example:**
```typescript
describe('Generation Flow E2E', () => {
  it('should complete full project workflow', async () => {
    // Test implementation
  });
});
```

## Writing New Tests

### Test File Naming

- Unit tests: `*.test.ts` or `*.spec.ts`
- Integration tests: `*.integration.test.ts`
- E2E tests: `*.e2e.test.ts`
- Python tests: `test_*.py` or `*_test.py`

### Test Structure

```typescript
/**
 * Component name unit tests
 */
import { ComponentUnderTest } from '../path/to/component';

describe('ComponentUnderTest', () => {
  beforeEach(() => {
    // Setup before each test
  });

  afterEach(() => {
    // Cleanup after each test
  });

  describe('methodName', () => {
    it('should do something', () => {
      // Arrange
      const input = 'test';

      // Act
      const result = ComponentUnderTest.method(input);

      // Assert
      expect(result).toBe('expected');
    });

    it('should handle errors', () => {
      // Test error cases
    });

    it('should handle edge cases', () => {
      // Test edge cases
    });
  });
});
```

### Mocking Best Practices

```typescript
// Mock external dependencies
jest.mock('../external/dependency');

// Create mock services
const mockService = {
  method: jest.fn(),
};

// Setup container with mocks
beforeAll(() => {
  container.register(SERVICE_KEYS.SERVICE, mockService);
});

// Clear mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
});
```

### Test Coverage Goals

- **Unit Tests**: 90%+ coverage
- **Integration Tests**: 80%+ coverage
- **Critical Paths**: 100% coverage
- **Error Handling**: 100% coverage

## CI/CD Integration

Tests run automatically on:
- Pull requests
- Commits to main branch
- Release tags

### GitHub Actions Workflow

```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm test
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3
```

## Debugging Tests

### Debug a Specific Test

```bash
# Run with Node debugger
node --inspect-brk node_modules/.bin/jest --runInBand domain-mapping.controller.test.ts

# Then attach your debugger (VS Code, Chrome DevTools, etc.)
```

### VS Code Debug Configuration

```json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand", "${file}"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

### Common Issues

**Issue: Tests timeout**
```typescript
// Increase timeout for specific test
it('slow test', async () => {
  // Test code
}, 10000); // 10 second timeout
```

**Issue: Mock not working**
```typescript
// Ensure jest.mock is hoisted
jest.mock('../module'); // At top of file

// Clear mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
});
```

**Issue: Async tests not completing**
```typescript
// Always return promises or use async/await
it('async test', async () => {
  await someAsyncFunction();
  expect(result).toBe(expected);
});
```

## Performance Testing

```bash
# Run tests with timing information
npm test -- --verbose

# Profile slow tests
npm test -- --detectLeaks --logHeapUsage
```

## Test Data

Test fixtures and mock data are located in:
- `/packages/api/tests/__fixtures__/`
- `/packages/kirby-generator/tests/__fixtures__/`

## Best Practices

1. **Write tests first** (TDD) when adding new features
2. **Test behavior, not implementation** - focus on what, not how
3. **Keep tests independent** - no shared state between tests
4. **Use descriptive names** - test names should explain what is being tested
5. **Mock external dependencies** - keep tests fast and reliable
6. **Test edge cases** - null, undefined, empty arrays, etc.
7. **Test error paths** - ensure errors are handled correctly
8. **Keep tests simple** - one assertion per test when possible
9. **Use test helpers** - reduce duplication with helper functions
10. **Update tests with code** - tests are part of the codebase

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Library](https://testing-library.com/docs/)
- [Pytest Documentation](https://docs.pytest.org/)
- [TypeScript Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)

## Getting Help

If you encounter issues with tests:
1. Check the test output for specific error messages
2. Review this documentation
3. Check existing tests for examples
4. Ask in the team chat or create an issue
