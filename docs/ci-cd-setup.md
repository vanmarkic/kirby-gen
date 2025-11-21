# CI/CD Setup Guide

This document explains the Continuous Integration and Continuous Deployment pipeline for Kirby-Gen.

## Overview

The CI/CD pipeline uses **GitHub Actions** to validate code quality before deployment, then triggers **Coolify** to deploy the application only if all checks pass.

## Pipeline Stages

The pipeline is optimized for **fast failure** using a two-stage validation approach:

### 1. Quick Validation (runs first, ~30-60 seconds)

Fast checks that catch 80% of errors without expensive builds:

1. **Type Check** (`npm run typecheck`)
   - Validates TypeScript types across all packages
   - Ensures type safety before runtime
   - Fails in ~20-30 seconds if types are wrong

2. **Lint** (`npm run lint`)
   - Runs ESLint on all packages
   - Enforces code style and catches common errors
   - Includes custom rules (e.g., no raw `fetch()` calls)
   - Fails in ~10-20 seconds if linting errors exist

**If quick validation fails**, the pipeline stops immediately (no expensive builds or tests run).

### 2. Full Validation (only runs if quick validation passes, ~3-4 minutes)

Comprehensive checks that require building and running the application:

1. **Build** (`npm run build`)
   - Compiles TypeScript to JavaScript
   - Ensures all packages build successfully
   - Validates import/export structure

2. **Unit Tests** (`npm run test:unit`)
   - Runs isolated unit tests
   - Tests individual services, utilities, and generators

3. **Integration Tests** (`npm run test:integration`)
   - Tests API endpoints and workflow phases
   - Validates service interactions

4. **Smoke Tests** (`npm run test:smoke:local`)
   - Starts local API server
   - Validates health checks, authentication, CORS
   - Ensures critical paths work end-to-end

### 3. Deployment Job (only on main branch)

The deployment job:
- **Only runs if both validation stages pass** (uses `needs: validate-full`)
- **Only runs on pushes to main** (not on PRs)
- Triggers Coolify webhook to start deployment
- Validates webhook response

## Setup Instructions

### 1. Configure GitHub Secrets

Add the following secret to your GitHub repository:

**Settings → Secrets and variables → Actions → New repository secret**

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `COOLIFY_WEBHOOK_URL` | Webhook URL from Coolify deployment settings | `https://coolify.example.com/api/v1/deploy/webhook/xxx` |
| `CLAUDE_API_KEY` | Anthropic API key for running tests | `sk-ant-xxx` |

### 2. Get Coolify Webhook URL

1. Open your Coolify dashboard
2. Go to your application's deployment settings
3. Find the **Webhook URL** section
4. Copy the webhook URL
5. Add it as `COOLIFY_WEBHOOK_URL` secret in GitHub

### 3. Configure Coolify

In Coolify, configure your deployment settings:

- **Auto Deploy**: Turn OFF (we trigger via webhook instead)
- **Build Command**: `npm run setup && npm run build`
- **Start Command**: `npm run dev` (or custom production command)
- **Environment Variables**: Add all required vars from `.env.example`

### 4. Branch Protection (Optional but Recommended)

To prevent broken code from reaching main:

1. **Settings → Branches → Add branch protection rule**
2. Branch name pattern: `main`
3. Enable:
   - ✅ Require status checks to pass before merging
   - ✅ Require branches to be up to date before merging
   - Select status check: `Validate (Typecheck, Lint, Build, Test)`
4. Save changes

This ensures all PRs must pass CI before merging.

## Workflow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ Developer pushes to main or opens PR                        │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ Stage 1: Quick Validation (~30-60 seconds)                  │
│                                                              │
│  1. Type Check     ✓                                        │
│  2. Lint           ✓                                        │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ├─── ❌ Quick checks fail (type/lint errors)
                      │    → STOP (saves 3-4 min of CI time)
                      │    → No expensive builds/tests run
                      │
                      └─── ✅ Quick checks pass
                           │
                           ▼
           ┌─────────────────────────────────────────────────┐
           │ Stage 2: Full Validation (~3-4 minutes)         │
           │                                                  │
           │  1. Build          ✓                            │
           │  2. Unit Tests     ✓                            │
           │  3. Integration    ✓                            │
           │  4. Smoke Tests    ✓                            │
           └────────────────┬────────────────────────────────┘
                            │
                            ├─── ❌ Any check fails
                            │    → Deployment blocked
                            │    → Notify developer
                            │
                            └─── ✅ All checks pass
                                 │
                                 ▼
                 ┌────────────────────────────────┐
                 │ Is this push to main branch?   │
                 └────────┬──────────────┬────────┘
                          │              │
                         No             Yes
                          │              │
                          ▼              ▼
                    Stop here   ┌─────────────────────┐
                    (PR only)   │ Trigger Coolify     │
                                │ via Webhook         │
                                └──────────┬──────────┘
                                           │
                                           ▼
                                ┌─────────────────────┐
                                │ Coolify deploys     │
                                │ to production       │
                                └─────────────────────┘
```

## Testing the Pipeline

### Test on Pull Request

1. Create a new branch: `git checkout -b test-ci`
2. Make a change and commit
3. Push and open PR: `gh pr create`
4. Watch GitHub Actions run validation
5. Deployment job should NOT run (PR only)

### Test on Main Branch

1. Merge PR to main or push directly
2. Watch GitHub Actions run validation
3. If validation passes, deployment job triggers
4. Check Coolify dashboard for deployment progress

## Troubleshooting

### Validation Job Fails

**Type Check Errors:**
- Run `npm run typecheck` locally
- Fix TypeScript errors before pushing

**Lint Errors:**
- Run `npm run lint` locally
- Fix with `npm run lint -- --fix` if auto-fixable

**Build Errors:**
- Run `npm run build` locally
- Check for import/export errors

**Test Failures:**
- Run tests locally: `npm test`
- Check test output for specific failures

**Smoke Test Failures:**
- Start API locally: `npm run dev:api`
- Run smoke tests: `npm run test:smoke:local`
- Check API health endpoint: `curl http://localhost:3001/health`

### Deployment Job Fails

**Webhook fails:**
- Verify `COOLIFY_WEBHOOK_URL` secret is correct
- Check Coolify webhook URL hasn't changed
- Test webhook manually: `curl -X GET $COOLIFY_WEBHOOK_URL`

**Coolify deployment fails:**
- Check Coolify build logs
- Verify environment variables are set in Coolify
- Ensure build commands are correct

## Performance Optimization

### Faster CI Runs

The pipeline uses these optimizations:

1. **Two-Stage Validation**: Quick checks run first (fail in 30s instead of 4min)
2. **Dependency Caching**: Node modules and pip packages are cached
3. **Parallel Jobs**: Validation and deployment run in separate jobs
4. **Conditional Deployment**: Only runs on main branch pushes
5. **Smart Test Running**: Type/Lint → Build → Tests (fail fast at each stage)

### Estimated Run Times

**Stage 1 (Quick Validation):**
- Type Check: ~20-30s
- Lint: ~10-20s
- **Quick Total: ~30-60 seconds**

**Stage 2 (Full Validation - only if Stage 1 passes):**
- Build: ~1min
- Unit Tests: ~30s
- Integration Tests: ~1min
- Smoke Tests: ~30s
- **Full Total: ~3-4 minutes**

**Total Time:**
- ✅ All checks pass: ~4-5 minutes
- ❌ Type/lint errors: ~30-60 seconds (saves 3-4 min!)
- ❌ Build/test errors: ~2-3 minutes (better than 4-5 min)

## Best Practices

1. **Run checks locally first**: Use `npm run typecheck && npm run lint && npm run build && npm test` before pushing
2. **Keep PRs small**: Smaller changes = faster reviews and safer deployments
3. **Monitor CI runs**: Check GitHub Actions tab for failures
4. **Don't skip CI**: Never force-push to main to bypass checks
5. **Fix failures quickly**: Broken main branch blocks everyone's deployments

## Additional Configuration

### Running Different Tests in CI

To skip certain tests in CI (e.g., slow E2E tests), use environment variables:

```yaml
- name: Run tests
  run: npm test
  env:
    CI: true
    SKIP_E2E: true
```

### Custom Deployment Targets

To deploy to different environments:

```yaml
deploy-staging:
  needs: validate
  if: github.ref == 'refs/heads/develop'
  steps:
    - run: curl -X GET "${{ secrets.COOLIFY_STAGING_WEBHOOK }}"

deploy-production:
  needs: validate
  if: github.ref == 'refs/heads/main'
  steps:
    - run: curl -X GET "${{ secrets.COOLIFY_PRODUCTION_WEBHOOK }}"
```

## See Also

- [Smoke Tests Documentation](../scripts/smoke-test.sh)
- [Poka-Yoke Measures](../CLAUDE.md#poka-yoke-mistake-proofing-measures)
- [Testing Strategy](../CLAUDE.md#testing-strategy-tdd)
