# Kirby-Gen Roadmap

This document outlines potential future enhancements and features for the Kirby-Gen portfolio generator.

## Current Status

✅ **Version 1.0 - Production Ready**
- CMS-agnostic architecture complete
- All core services implemented (Storage, Session, Git, Deployment)
- Three Claude skills operational (Domain Mapping, Content Structuring, Design Automation)
- Kirby CMS adapter fully functional
- React web interface with real-time updates
- API backend with workflow orchestration
- Comprehensive test suite (90%+ coverage)
- Complete documentation

---

## Future Enhancements

### 🚀 Immediate Enhancements

#### 1. Magic Link Authentication
**Current State**: Simple token-based authentication
**Enhancement**: Passwordless email-based authentication
- Send magic links via email (using Resend, SendGrid, or similar)
- Time-limited tokens (15-minute expiry)
- Secure token generation and validation
- Session management tied to magic link

**Effort**: ~2-3 days
**Priority**: Medium
**Files to modify**:
- `packages/api/src/middleware/auth.ts`
- `packages/api/src/controllers/auth.controller.ts` (new)
- `packages/web/src/pages/LoginPage.tsx` (new)

#### 2. Image Optimization During Upload
**Current State**: Images uploaded as-is
**Enhancement**: Automatic image optimization
- Resize images to multiple sizes (thumbnail, medium, large)
- Convert to modern formats (WebP, AVIF)
- Compress with quality optimization
- Generate responsive srcset attributes
- Use Sharp library for processing

**Effort**: ~2-3 days
**Priority**: High
**Files to modify**:
- `packages/api/src/controllers/file.controller.ts`
- `packages/api/src/services/image-optimizer.service.ts` (new)
- `packages/kirby-generator/src/adapters/kirby/content-generator.ts`

**Dependencies**: `sharp`, `image-size`

#### 3. Content Preview Before Generation
**Current State**: User commits to full generation
**Enhancement**: Preview structured content before generating site
- Show preview of parsed content
- Display how content maps to entities
- Allow editing/refinement before generation
- Preview design tokens visually
- "Looks good? Generate!" confirmation

**Effort**: ~3-4 days
**Priority**: High
**Files to create**:
- `packages/web/src/pages/ContentPreviewPage.tsx`
- `packages/web/src/components/EntityPreview.tsx`
- `packages/web/src/components/DesignPreview.tsx`
- `packages/api/src/controllers/preview-content.controller.ts`

#### 4. Multi-Language Support
**Current State**: English only
**Enhancement**: Internationalization (i18n)
- Web interface translations (French, German, Spanish, etc.)
- Content localization support in generated sites
- Multi-language entity fields in domain mapping
- Kirby multi-language setup generation

**Effort**: ~5-7 days
**Priority**: Medium
**Files to modify**:
- All React components for i18n
- `packages/web/src/i18n/` (new directory)
- `packages/shared/src/types/cms-agnostic.types.ts` (add locale fields)
- `packages/kirby-generator/src/adapters/kirby/kirby.adapter.ts`

**Dependencies**: `react-i18next`, `i18next`

---

### 🔌 New CMS Adapters

#### 1. Strapi Adapter
**Effort**: ~500 lines, 3-4 days
**Priority**: High
**Location**: `packages/strapi-generator/`

**Conversion Logic**:
- `ContentSchema` → Strapi Content-Type schemas
- `EntitySchema` → Strapi collections
- `FieldSchema` → Strapi field types
- `StructuredContent` → Strapi entries (via API or JSON import)
- `DesignTokens` → Custom theme plugin

**Key Files**:
- `src/adapters/strapi/strapi.adapter.ts`
- `src/adapters/strapi/content-type-generator.ts`
- `src/adapters/strapi/entry-generator.ts`
- `src/adapters/strapi/theme-plugin-generator.ts`

**Strapi-Specific Features**:
- Admin panel customization
- REST/GraphQL API configuration
- Media library setup
- Role-based permissions

#### 2. Contentful Adapter
**Effort**: ~500 lines, 3-4 days
**Priority**: Medium
**Location**: `packages/contentful-generator/`

**Conversion Logic**:
- `ContentSchema` → Contentful Content Models
- `EntitySchema` → Contentful Content Types
- `FieldSchema` → Contentful field types
- Upload content via Contentful Management API
- Theme applied via custom frontend

**Key Files**:
- `src/adapters/contentful/contentful.adapter.ts`
- `src/adapters/contentful/content-model-generator.ts`
- `src/adapters/contentful/entry-uploader.ts`

**Dependencies**: `contentful-management`

**Contentful-Specific Features**:
- Space creation and configuration
- Environment setup (staging/production)
- Webhook configuration
- Asset management

#### 3. WordPress Adapter
**Effort**: ~600 lines, 4-5 days
**Priority**: Medium-Low
**Location**: `packages/wordpress-generator/`

**Conversion Logic**:
- `ContentSchema` → Custom Post Types
- `EntitySchema` → CPT definitions
- `FieldSchema` → Advanced Custom Fields (ACF)
- `StructuredContent` → WordPress posts
- `DesignTokens` → Theme customizer settings

**Key Files**:
- `src/adapters/wordpress/wordpress.adapter.ts`
- `src/adapters/wordpress/cpt-generator.ts` (Custom Post Types)
- `src/adapters/wordpress/acf-generator.ts` (ACF JSON)
- `src/adapters/wordpress/theme-generator.ts`

**Dependencies**: None (generates PHP files)

**WordPress-Specific Features**:
- Theme.json generation (block editor support)
- Plugin scaffolding for CPTs
- REST API endpoints
- Gutenberg block registration

---

### ☁️ Cloud Migration

#### 1. S3 Storage Service
**Current State**: Local file system storage
**Enhancement**: AWS S3 or compatible storage (MinIO, DigitalOcean Spaces)

**Implementation**:
```typescript
// packages/api/src/services/cloud/s3-storage.service.ts
class S3StorageService implements IStorageService {
  constructor(
    private s3Client: S3Client,
    private bucket: string
  ) {}

  async uploadFile(projectId: string, file: Buffer, filename: string) {
    await this.s3Client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: `${projectId}/${filename}`,
      Body: file,
    }));
    return `https://${this.bucket}.s3.amazonaws.com/${projectId}/${filename}`;
  }
  // ... implement other methods
}
```

**Effort**: ~2 days
**Priority**: High (for production scaling)
**Dependencies**: `@aws-sdk/client-s3`

#### 2. Redis Session Service
**Current State**: Local JSON file storage
**Enhancement**: Redis-based session storage

**Implementation**:
```typescript
// packages/api/src/services/cloud/redis-session.service.ts
class RedisSessionService implements ISessionService {
  constructor(private redisClient: RedisClient) {}

  async create(projectId: string, data: ProjectData) {
    const sessionId = nanoid();
    await this.redisClient.setEx(
      `session:${sessionId}`,
      604800, // 7 days TTL
      JSON.stringify(data)
    );
    return sessionId;
  }
  // ... implement other methods
}
```

**Effort**: ~2 days
**Priority**: High (for production scaling)
**Dependencies**: `redis`, `@redis/client`

#### 3. Vercel/Netlify Deployment Service
**Current State**: Local PHP server deployment
**Enhancement**: Deploy to Vercel, Netlify, or custom hosting

**Implementation**:
```typescript
// packages/api/src/services/cloud/vercel-deployment.service.ts
class VercelDeploymentService implements IDeploymentService {
  constructor(private vercelClient: VercelClient) {}

  async deploy(projectId: string, buildPath: string) {
    // Create deployment
    const deployment = await this.vercelClient.createDeployment({
      name: projectId,
      files: await this.collectFiles(buildPath),
      projectSettings: { framework: 'static' }
    });

    return {
      deploymentId: deployment.id,
      url: deployment.url,
      status: 'deploying'
    };
  }
}
```

**Effort**: ~3-4 days
**Priority**: High (for production)
**Dependencies**: `vercel`, `netlify` (SDK)

**Supported Platforms**:
- Vercel (for static sites + serverless)
- Netlify (for static sites + functions)
- Custom servers via SSH/SCP
- Docker container deployments

#### 4. GitHub Integration for Git Service
**Current State**: Local git repositories
**Enhancement**: Automatic GitHub repository creation and push

**Implementation**:
```typescript
// packages/api/src/services/cloud/github-git.service.ts
class GitHubGitService implements IGitService {
  constructor(private octokit: Octokit) {}

  async createRepo(projectId: string) {
    // Create GitHub repo
    const repo = await this.octokit.repos.createForAuthenticatedUser({
      name: projectId,
      private: true,
      auto_init: false
    });

    // Initialize local repo and set remote
    await git.init(this.getLocalPath(projectId));
    await git.addRemote('origin', repo.clone_url);

    return repo.html_url;
  }

  async push(projectId: string, remote = 'origin', branch = 'main') {
    await git.push(['--set-upstream', remote, branch]);
  }
}
```

**Effort**: ~3 days
**Priority**: Medium
**Dependencies**: `@octokit/rest`

---

### 🎨 Advanced Features

#### 1. Migration Tool (Import from Existing Site)
**Enhancement**: Import content from existing websites

**Supported Sources**:
- Existing Kirby sites
- WordPress sites (via WP REST API)
- Static HTML sites (web scraping)
- Markdown repositories (GitHub, GitLab)

**Implementation**:
```typescript
// packages/skills/src/skills/site_migration/
class SiteMigrationSkill {
  async migrateFromWordPress(wpUrl: string, credentials: WPCredentials) {
    // 1. Fetch all posts, pages, custom post types via REST API
    // 2. Extract content, metadata, taxonomies
    // 3. Map to generic ContentSchema
    // 4. Use Claude to infer entity relationships
    // 5. Return StructuredContentCollection
  }

  async migrateFromHTML(siteUrl: string) {
    // 1. Crawl site and extract HTML pages
    // 2. Parse content using Cheerio
    // 3. Use Claude to extract structured data
    // 4. Generate ContentSchema from patterns
  }
}
```

**Effort**: ~7-10 days
**Priority**: High
**Location**: `packages/skills/src/skills/site_migration/`

**User Flow**:
1. User provides existing site URL
2. Tool crawls/fetches content
3. Claude analyzes structure and content
4. Suggests entity mapping
5. User confirms or adjusts
6. Migration completes → ready for generation

#### 2. Partial Regeneration
**Current State**: Full site regeneration only
**Enhancement**: Update specific parts without touching others

**Use Cases**:
- Update design system without regenerating content
- Add new content without re-deploying entire site
- Modify templates without touching blueprints
- Update single entity type

**Implementation**:
```typescript
// packages/api/src/workflow/partial-regenerator.ts
class PartialRegenerator {
  async updateDesignOnly(projectId: string, newDesignSystem: DesignSystemSchema) {
    // 1. Fetch existing project
    // 2. Update design system only
    // 3. Regenerate theme CSS
    // 4. Update Kirby site/config and assets
    // 5. Deploy changes (skip content/blueprint regeneration)
  }

  async addNewEntity(projectId: string, entity: EntitySchema) {
    // 1. Add entity to existing schema
    // 2. Generate blueprint for new entity only
    // 3. Update site config to include new entity
    // 4. Deploy changes (keep existing content)
  }
}
```

**Effort**: ~5-7 days
**Priority**: High
**Benefits**:
- Faster updates (no full regeneration)
- Preserves manual edits to content
- Reduces processing time
- Better user experience

#### 3. Multi-User Project Collaboration
**Current State**: Single-user projects
**Enhancement**: Team collaboration on portfolio projects

**Features**:
- Project sharing with email invitations
- Role-based access control (Owner, Editor, Viewer)
- Real-time collaborative editing (Yjs, Socket.IO)
- Comment system on entities and content
- Version history and rollback
- Activity log

**Implementation**:
```typescript
// packages/shared/src/types/collaboration.types.ts
interface ProjectCollaborator {
  userId: string;
  email: string;
  role: 'owner' | 'editor' | 'viewer';
  addedAt: Date;
  permissions: {
    editContent: boolean;
    editDesign: boolean;
    regenerate: boolean;
    deploy: boolean;
    invite: boolean;
  };
}

// packages/api/src/controllers/collaboration.controller.ts
class CollaborationController {
  async inviteCollaborator(projectId: string, email: string, role: string) { }
  async acceptInvitation(token: string) { }
  async updateRole(projectId: string, userId: string, newRole: string) { }
  async removeCollaborator(projectId: string, userId: string) { }
}
```

**Effort**: ~10-14 days
**Priority**: Medium
**Dependencies**: `yjs`, `y-websocket`, `y-indexeddb`

#### 4. Portfolio Templates Library
**Enhancement**: Pre-built portfolio templates for different professions

**Template Categories**:
- **Photography**: Galleries, exhibitions, client work
- **Design**: Case studies, dribbble-style portfolios
- **Development**: Project showcases, blog, tech stack
- **Writing**: Articles, books, speaking engagements
- **Art**: Portfolio pieces, exhibitions, commissions
- **Business**: Services, testimonials, case studies

**Implementation**:
```typescript
// packages/shared/src/templates/
interface PortfolioTemplate {
  id: string;
  name: string;
  profession: string;
  description: string;
  preview: string; // URL to preview
  schema: ContentSchema; // Pre-defined entity structure
  designSystem: DesignSystemSchema; // Default design tokens
  sampleContent: StructuredContentCollection; // Example content
  popularity: number;
  tags: string[];
}

// packages/api/src/controllers/templates.controller.ts
class TemplatesController {
  async listTemplates(profession?: string) { }
  async getTemplate(templateId: string) { }
  async applyTemplate(projectId: string, templateId: string) { }
  async forkTemplate(templateId: string, customizations: Partial<PortfolioTemplate>) { }
}
```

**User Flow**:
1. User selects "Start from Template"
2. Browse templates by profession/style
3. Preview template
4. Customize (colors, fonts, content structure)
5. Generate site based on template

**Effort**: ~10-14 days (including 5-10 templates)
**Priority**: Medium-High
**Benefits**:
- Faster onboarding for new users
- Inspiration for portfolio structure
- Best practices built-in
- Reduced generation time

---

## Technical Debt & Improvements

### Code Quality
- [ ] Add Prettier for consistent code formatting
- [ ] Set up ESLint rules more strictly
- [ ] Implement Husky pre-commit hooks
- [ ] Add Renovate for dependency updates

### Performance
- [ ] Implement caching layer (Redis) for API responses
- [ ] Add CDN support for static assets
- [ ] Optimize bundle size (code splitting, tree shaking)
- [ ] Add service worker for offline support

### Security
- [ ] Add rate limiting per user (not just per IP)
- [ ] Implement CSRF protection
- [ ] Add input sanitization for all user content
- [ ] Security audit with npm audit / Snyk
- [ ] Add Content Security Policy headers

### Observability
- [ ] Add Sentry for error tracking
- [ ] Implement OpenTelemetry for distributed tracing
- [ ] Add Prometheus metrics endpoint
- [ ] Create Grafana dashboards
- [ ] Set up alerts for critical errors

### DevOps
- [ ] Create Docker Compose for local development
- [ ] Add Kubernetes manifests for cloud deployment
- [ ] Set up CI/CD pipeline (GitHub Actions)
- [ ] Create staging environment
- [ ] Implement blue-green deployments

---

## Versioning & Releases

### Version 1.0 (Current) ✅
- CMS-agnostic architecture
- Kirby CMS adapter
- Three Claude skills
- Local services
- Web interface
- API backend
- E2E tests

### Version 1.1 (Planned)
**Target**: Q2 2025
**Focus**: Production readiness
- [ ] Magic link authentication
- [ ] Image optimization
- [ ] Content preview
- [ ] S3 + Redis cloud services
- [ ] Deployment to Vercel/Netlify

### Version 1.2 (Planned)
**Target**: Q3 2025
**Focus**: New CMS adapters
- [ ] Strapi adapter
- [ ] Contentful adapter
- [ ] Migration tool (WordPress import)

### Version 2.0 (Future)
**Target**: Q4 2025
**Focus**: Advanced features
- [ ] Multi-user collaboration
- [ ] Portfolio templates library
- [ ] Partial regeneration
- [ ] Multi-language support

---

## Contributing

To propose a new feature or enhancement:

1. **Check this roadmap** - Is it already planned?
2. **Open a discussion** - Explain the use case and value
3. **Create a proposal** - Document the technical approach
4. **Get approval** - Discuss with maintainers
5. **Implement** - Follow TDD, write tests first
6. **Submit PR** - Include documentation updates

---

## Notes

- All effort estimates assume one developer working full-time
- Priorities may shift based on user feedback and business needs
- Cloud migration features are essential for production scaling
- New CMS adapters follow the same pattern (~500 lines each)
- Advanced features should maintain backward compatibility

**Last Updated**: November 17, 2025
**Version**: 1.0.0
