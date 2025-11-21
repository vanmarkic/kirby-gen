# Kirby Auto-Installation Analysis

**Date:** 2025-01-21
**Context:** User wants automatic Kirby installation after blueprint generation
**Current State:** Manual script exists but requires manual execution

---

## Current Architecture

### 1. Workflow Orchestrator (5 Phases)

```
Phase 1: Domain Mapping          (20%)  → Generate ContentSchema
Phase 2: Content Structuring      (40%)  → Map content to entities
Phase 3: Design Automation        (60%)  → Extract design tokens
Phase 4: CMS Adaptation           (80%)  → Generate Kirby artifacts
Phase 5: Deployment              (100%)  → Deploy site
```

**Location:** `/Users/dragan/Documents/kirby-gen/packages/api/src/workflow/workflow-orchestrator.ts`

### 2. Kirby Generator (CMS Adapter Pattern)

**Package:** `packages/kirby-generator/`

**Main Adapter:** `src/adapters/kirby/kirby.adapter.ts`
- Implements `ICMSAdapter` interface
- Converts CMS-agnostic content → Kirby-specific format
- Uses 5 specialized generators:
  1. **BlueprintGenerator** - Converts EntitySchema → YAML blueprints
  2. **ContentGenerator** - Converts ContentItems → Kirby .txt files
  3. **TemplateGenerator** - Generates PHP templates
  4. **ThemeGenerator** - Generates CSS from design tokens
  5. **SiteScaffolder** - Creates Kirby installation structure

**Key Method:** `generateSite(config: GenerationConfig): Promise<GeneratedSite>`
- Validates schema
- Generates site structure
- Generates blueprints, content, templates, design
- **Writes files to disk** (uses `writeFiles()` method)

### 3. Manual Installation Script

**Location:** `packages/api/scripts/install-kirby-local.sh`

**What it does:**
1. Downloads Kirby Plainkit from GitHub
2. Extracts to `packages/api/kirby-site/` subdirectory
3. Installs Composer dependencies (Kirby core)
4. Creates blueprint directory structure
5. **Copies blueprints** from `data/claude-output/manual-flow/blueprints/` to `kirby-site/site/blueprints/pages/`
6. Configures Kirby for subfolder deployment:
   - Creates `site/config/config.php` with base URL `/kirby-site`
   - Creates `.htaccess` with `RewriteBase /kirby-site`
7. Outputs instructions for PHP server: `php -S localhost:8080 kirby/router.php`

**Current Status:** Must be run manually after blueprints exist

---

## What We Have vs What We Need

### Existing Components

✅ **BlueprintGenerator** - Already generates YAML blueprints
✅ **SiteScaffolder** - Already generates site structure files (config, .htaccess, index.php, etc.)
✅ **Manual script** - Proven working approach for local Kirby installation
✅ **KirbyCMSAdapter.generateSite()** - Already writes files to disk

### Missing Components

❌ **Kirby Plainkit download** - Not integrated into TypeScript workflow
❌ **Composer dependency installation** - Not automated in workflow
❌ **Subfolder-specific configuration** - SiteScaffolder doesn't support custom base paths
❌ **PHP server management** - No process management for `php -S`

---

## Key Observations

### 1. Workflow Phase 4 Already Writes Files

```typescript
// packages/api/src/workflow/workflow-orchestrator.ts:298-321
private async executePhase4_CMSAdaptation() {
  // TODO: Collect actual generated file references from Kirby adapter
  // For now, we'll use placeholder data
  await this.storageService.saveGeneratedArtifacts(project.id, {
    blueprints: [],
    templates: [],
    content: [],
    assets: [],
    generatedAt: new Date(),
    cmsAdapter: 'kirby',
  });
}
```

**Current behavior:** Phase 4 is simulated, not actually calling `KirbyCMSAdapter.generateSite()`

### 2. SiteScaffolder Has `installKirby: true` Option

```typescript
// packages/kirby-generator/src/adapters/kirby/kirby.adapter.ts:100-106
this.siteScaffolder = new SiteScaffolder({
  installKirby: true,  // ← Option exists but not implemented
  kirbyVersion: this.options.kirbyVersion,
  createGitignore: true,
  createHtaccess: true,
  createReadme: true,
  setupPanel: true,
  debugMode: this.options.debugMode,
});
```

**Current behavior:** `installKirby` option exists but doesn't actually download Kirby

### 3. Two Separate Concerns

**A) File Generation** (already working)
- Blueprint YAML files
- Config.php
- .htaccess
- index.php
- Templates, content files

**B) Kirby Installation** (missing)
- Download Kirby Plainkit ZIP
- Extract to target directory
- Run `composer install`
- Download Kirby core if Composer not available

---

## Architecture Gaps

### Gap 1: Phase 4 Doesn't Actually Generate

**Current:**
```typescript
// Simulated result for now
const outputPath = path.join(context.outputDir, 'site');

// TODO: Collect actual generated file references from Kirby adapter
```

**Should be:**
```typescript
const kirbyAdapter = new KirbyCMSAdapter();
const generatedSite = await kirbyAdapter.generateSite({
  schema: project.domainModel,
  content: project.structuredContent,
  designSystem: project.designSystem,
  outputPath: path.join(context.outputDir, 'kirby-site'),
  projectId: project.id,
});
```

### Gap 2: SiteScaffolder Can't Download Kirby

**Current:** Only generates config files as strings
**Needs:** Ability to download and extract external dependencies

**Why it's hard in TypeScript:**
- Requires HTTP download (axios/node-fetch)
- Requires ZIP extraction (adm-zip, extract-zip)
- Requires running shell commands (child_process)
- Requires error handling for network failures

### Gap 3: No Subfolder Configuration Support

**Current:** SiteScaffolder generates config with hardcoded values
**Needs:** Accept `baseUrl` and `basePath` parameters

Example:
```typescript
generateConfig({ baseUrl: '/kirby-site', debug: true })
```

### Gap 4: Composer Installation

**Current:** Not handled at all
**Options:**
1. Require Composer to be installed (fail if not available)
2. Download Kirby core manually as ZIP (fallback)
3. Include Kirby core as npm dependency (not recommended)

---

## Design Options

### Option A: Extend Phase 4 to Call Real Adapter

**Changes:**
1. Import `KirbyCMSAdapter` into workflow orchestrator
2. Call `generateSite()` in Phase 4
3. SiteScaffolder remains file-only (no Kirby download)
4. Manual script still required for Kirby installation

**Pros:**
- Minimal changes
- Keeps concerns separated
- Already have working manual script

**Cons:**
- User still needs to run manual script
- Doesn't meet "automatic" requirement

### Option B: Add Kirby Download to SiteScaffolder

**Changes:**
1. Add `downloadKirby()` method to SiteScaffolder
2. Use axios/node-fetch to download Plainkit ZIP
3. Extract ZIP to target directory
4. Handle Composer installation (with fallback)

**Pros:**
- Truly automatic
- All-in-one solution
- No manual steps required

**Cons:**
- Adds network dependencies to generators
- Harder to test (requires mocking HTTP)
- Slower workflow (download takes time)
- Could fail due to network issues

### Option C: New Phase 4.5 "Local Development Setup"

**Changes:**
1. Add optional phase between CMS Adaptation and Deployment
2. Only runs if `LOCAL_DEV_MODE=true` in env
3. Calls bash script via child_process
4. Updates progress bar to show 6 phases instead of 5

**Pros:**
- Isolates local-dev concerns
- Reuses proven bash script
- Easy to skip in production
- Clear separation of concerns

**Cons:**
- Changes workflow structure
- Requires process management
- Bash script dependency

### Option D: Deployment Service Handles It

**Changes:**
1. Create `LocalDeploymentService` (implements `IDeploymentService`)
2. Phase 5 deployment checks deployment type
3. If local: download Kirby, copy files, start PHP server
4. If production: use existing deployment logic

**Pros:**
- Fits existing architecture (DI container)
- Deployment abstraction already exists
- No workflow changes needed

**Cons:**
- Conflates deployment with installation
- "Deployment" shouldn't download dependencies

---

## Manual Script Analysis

### What Makes It Work

```bash
# 1. Download from stable URL
curl -L https://github.com/getkirby/plainkit/archive/main.zip -o kirby-plainkit.zip

# 2. Extract with rename
unzip -q kirby-plainkit.zip
mv plainkit-main "$KIRBY_DIR"

# 3. Composer install (with fallback)
if ! command -v composer &> /dev/null; then
  # Fallback: Download Kirby core manually
  curl -L https://github.com/getkirby/kirby/archive/main.zip -o kirby-core.zip
  unzip -q kirby-core.zip
  mv kirby-main kirby
else
  composer install
fi

# 4. Copy blueprints
cp "$BLUEPRINTS_SOURCE"/*.yml "$KIRBY_DIR/site/blueprints/pages/"

# 5. Custom config for subfolder
cat > "$KIRBY_DIR/site/config/config.php" << 'EOF'
<?php
return [
  'debug' => true,
  'url' => 'http://localhost:8080/kirby-site',
];
EOF
```

### Why Bash vs TypeScript?

| Aspect | Bash | TypeScript |
|--------|------|-----------|
| HTTP download | `curl -L` | `axios.get()` + stream handling |
| ZIP extraction | `unzip -q` | `adm-zip` or `extract-zip` library |
| Command existence | `command -v composer` | `which composer` + `child_process.exec()` |
| Process execution | Native | `child_process.spawn()` |
| Error handling | Exit codes | Try/catch + Promise rejections |
| File operations | `cp`, `mkdir -p` | `fs.copyFile()`, `fs.mkdir({ recursive: true })` |

**Bash wins for:** System integration, process management
**TypeScript wins for:** Type safety, cross-platform compatibility, error handling

---

## Recommendation

**Hybrid Approach: Option C + Improved Integration**

1. **Short term:** Integrate bash script into Phase 4
   - Add step after `generateSite()` writes files
   - Call `install-kirby-local.sh` via `child_process.execFile()`
   - Pass blueprint output directory as argument
   - Update progress bar: "Installing Kirby locally..."

2. **Long term:** Rewrite bash script in TypeScript
   - Create `LocalKirbyInstaller` service
   - Implement in `packages/api/src/services/local/`
   - Use axios + adm-zip
   - Registered in DI container
   - Used only when `LOCAL_DEV_MODE=true`

### Why This Works

- **Immediate solution:** Reuse proven bash script
- **Future-proof:** Path to TypeScript implementation
- **Minimal risk:** Bash script already tested
- **Clear responsibility:** Workflow calls installer, installer handles Kirby
- **Environment-aware:** Only runs in local development

---

## Open Questions

1. **When should Kirby be downloaded?**
   - Every workflow run? (slow, but always fresh)
   - Only if `kirby-site/` doesn't exist? (faster, but could be outdated)
   - User-initiated "refresh" command?

2. **Should PHP server auto-start?**
   - Yes → Requires background process management
   - No → User must run `php -S` manually (current approach)

3. **Where should Kirby be installed?**
   - `packages/api/kirby-site/` (current)
   - `storage/projects/{projectId}/kirby/` (per-project)
   - User-specified path via env variable?

4. **How to handle Kirby versions?**
   - Always use `main` branch (latest, unstable)
   - Pin to specific version tag (stable, but needs updating)
   - Let user choose via config?

5. **What about multiple projects?**
   - One shared Kirby installation with multiple content folders?
   - Separate Kirby installation per project?
   - Virtual hosts with different ports?

---

## Next Steps

**Before implementation:**
1. ✅ Analyze current architecture (this document)
2. ⏳ Decide on installation timing (when to download Kirby)
3. ⏳ Decide on installation location (where to put Kirby)
4. ⏳ Decide on process management (auto-start PHP server?)
5. ⏳ Get user feedback on approach

**For implementation:**
1. Write integration test that verifies end-to-end flow
2. Implement chosen approach (likely Option C short-term)
3. Update workflow orchestrator Phase 4
4. Add progress tracking for Kirby installation step
5. Document new workflow in README
6. Add environment variable for LOCAL_DEV_MODE

---

## Files Analyzed

- [workflow-orchestrator.ts](../../packages/api/src/workflow/workflow-orchestrator.ts) - Main workflow coordination
- [kirby.adapter.ts](../../packages/kirby-generator/src/adapters/kirby/kirby.adapter.ts) - Kirby CMS adapter
- [site-scaffolder.ts](../../packages/kirby-generator/src/adapters/kirby/site-scaffolder.ts) - Site structure generation
- [install-kirby-local.sh](../../packages/api/scripts/install-kirby-local.sh) - Manual installation script
- [domain-to-blueprint-complete-flow.test.ts](../../packages/api/tests/integration/domain-to-blueprint-complete-flow.test.ts) - Integration test demonstrating flow

---

**Status:** Analysis complete, awaiting decision on approach
