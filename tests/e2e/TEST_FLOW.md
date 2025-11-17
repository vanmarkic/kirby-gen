# E2E Test Flow Diagram

## Complete Workflow Test Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         E2E TEST INITIALIZATION                             │
│                                                                             │
│  1. Start Mock Python Skills Server (port 5001)                            │
│     - Loads fixtures from fixtures/ directory                              │
│     - Responds to /skills/domain-mapping                                   │
│     - Responds to /skills/content-structuring                              │
│     - Responds to /skills/design-automation                                │
│                                                                             │
│  2. Start API Server (port 3003)                                           │
│     - Creates test directories (storage, sessions, uploads, deployments)   │
│     - Initializes dependency injection                                     │
│     - Sets up Express app and Socket.IO                                    │
│     - Configures test environment variables                                │
│                                                                             │
│  3. Create Test Client                                                     │
│     - HTTP client for API requests                                         │
│     - Base URL: http://localhost:3003                                      │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PHASE 1: PROJECT CREATION                           │
│                                                                             │
│  POST /api/projects                                                         │
│  ────────────────────                                                       │
│  Request:  {}                                                               │
│  Response: {                                                                │
│    success: true,                                                           │
│    data: {                                                                  │
│      id: "proj_abc123",                                                     │
│      status: "input",                                                       │
│      createdAt: "2024-01-01T00:00:00Z",                                     │
│      ...                                                                    │
│    }                                                                        │
│  }                                                                          │
│                                                                             │
│  ✅ Assertion: Response status is 201                                       │
│  ✅ Assertion: Project ID is returned                                       │
│  ✅ Assertion: Initial status is "input"                                    │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      PHASE 2: WEBSOCKET CONNECTION                          │
│                                                                             │
│  Connect to Socket.IO                                                       │
│  ────────────────────────                                                   │
│  URL: http://localhost:3003                                                 │
│  Transport: websocket                                                       │
│                                                                             │
│  emit('subscribe', { projectId: 'proj_abc123' })                            │
│                                                                             │
│  on('progress', (event) => {                                                │
│    console.log(event.phase, event.status, event.progress)                  │
│  })                                                                         │
│                                                                             │
│  ✅ Assertion: WebSocket connects successfully                              │
│  ✅ Assertion: Subscription acknowledged                                    │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       PHASE 3: UPLOAD CONTENT FILES                         │
│                                                                             │
│  For each file in fixtures/sample-content/:                                 │
│                                                                             │
│  POST /api/projects/:id/files/upload                                        │
│  ────────────────────────────────────                                       │
│  Content-Type: multipart/form-data                                          │
│  Body: FormData with file                                                   │
│                                                                             │
│  Files uploaded:                                                            │
│  ┌──────────────────────────────────────────┐                              │
│  │ 1. about.md         (1.2 KB)            │                              │
│  │ 2. projects.md      (2.8 KB)            │                              │
│  │ 3. blog-posts.md    (1.5 KB)            │                              │
│  │ 4. contact.md       (0.8 KB)            │                              │
│  └──────────────────────────────────────────┘                              │
│                                                                             │
│  ✅ Assertion: Each upload returns 200                                      │
│  ✅ Assertion: File appears in project.inputs.contentFiles                  │
│  ✅ Assertion: Total of 4 files uploaded                                    │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      PHASE 4: ADD BRANDING ASSETS                           │
│                                                                             │
│  PATCH /api/projects/:id                                                    │
│  ────────────────────────────                                               │
│  Body: {                                                                    │
│    inputs: {                                                                │
│      brandingAssets: {                                                      │
│        colors: {                                                            │
│          primary: "#0ea5e9",                                                │
│          secondary: "#8b5cf6",                                              │
│          accent: "#10b981"                                                  │
│        },                                                                   │
│        fonts: [{                                                            │
│          name: "Inter",                                                     │
│          family: "Inter",                                                   │
│          weights: [400, 500, 600, 700],                                     │
│          source: "google"                                                   │
│        }]                                                                   │
│      },                                                                     │
│      pinterestUrl: "https://pinterest.com/example/inspiration"              │
│    }                                                                        │
│  }                                                                          │
│                                                                             │
│  ✅ Assertion: Update returns 200                                           │
│  ✅ Assertion: Branding data saved                                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       PHASE 5: TRIGGER GENERATION                           │
│                                                                             │
│  POST /api/projects/:id/generate                                            │
│  ────────────────────────────────────                                       │
│  Response: {                                                                │
│    success: true,                                                           │
│    message: "Generation started"                                            │
│  }                                                                          │
│                                                                             │
│  ✅ Assertion: Response status is 202 (Accepted)                            │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────┐     │
│  │  WORKFLOW ORCHESTRATOR BEGINS                                     │     │
│  │  Running in background on API server                              │     │
│  └───────────────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PHASE 6: WORKFLOW EXECUTION                              │
│                (Monitored via WebSocket progress events)                    │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────┐           │
│  │  PHASE 6.1: DOMAIN MAPPING (20%)                            │           │
│  │  ──────────────────────────────────                         │           │
│  │  WS Event: { phase: "domain-mapping", status: "started" }   │           │
│  │                                                              │           │
│  │  API → POST http://localhost:5001/skills/domain-mapping     │           │
│  │  Request: {                                                  │           │
│  │    contentFiles: [                                           │           │
│  │      { path: "uploads/proj_abc123/about.md", ... },         │           │
│  │      { path: "uploads/proj_abc123/projects.md", ... },      │           │
│  │      ...                                                     │           │
│  │    ]                                                         │           │
│  │  }                                                           │           │
│  │                                                              │           │
│  │  Mock Skills Server → Response (from sample-schema.json):   │           │
│  │  {                                                           │           │
│  │    success: true,                                            │           │
│  │    data: {                                                   │           │
│  │      domainModel: {                                          │           │
│  │        entities: [Page, Project, BlogPost],                 │           │
│  │        relationships: [...],                                │           │
│  │        schema: { ... }                                       │           │
│  │      }                                                       │           │
│  │    }                                                         │           │
│  │  }                                                           │           │
│  │                                                              │           │
│  │  WS Event: { phase: "domain-mapping", status: "completed" } │           │
│  │                                                              │           │
│  │  ✅ Domain model saved to project                            │           │
│  │  ✅ Project status → "structuring"                           │           │
│  └─────────────────────────────────────────────────────────────┘           │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────┐           │
│  │  PHASE 6.2: CONTENT STRUCTURING (40%)                       │           │
│  │  ───────────────────────────────────────                    │           │
│  │  WS Event: { phase: "content-structuring", status: "started" }         │
│  │                                                              │           │
│  │  API → POST http://localhost:5001/skills/content-structuring│           │
│  │  Request: {                                                  │           │
│  │    domainModel: { ... },                                     │           │
│  │    contentFiles: [ ... ]                                     │           │
│  │  }                                                           │           │
│  │                                                              │           │
│  │  Mock Skills Server → Response (from sample-structured-content.json):  │
│  │  {                                                           │           │
│  │    success: true,                                            │           │
│  │    data: {                                                   │           │
│  │      structuredContent: {                                    │           │
│  │        page: [{ id, title, slug, fields, ... }],            │           │
│  │        project: [{ ... }],                                   │           │
│  │        blog_post: [{ ... }]                                  │           │
│  │      }                                                       │           │
│  │    }                                                         │           │
│  │  }                                                           │           │
│  │                                                              │           │
│  │  WS Event: { phase: "content-structuring", status: "completed" }       │
│  │                                                              │           │
│  │  ✅ Structured content saved to project                      │           │
│  │  ✅ Project status → "design"                                │           │
│  └─────────────────────────────────────────────────────────────┘           │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────┐           │
│  │  PHASE 6.3: DESIGN AUTOMATION (60%)                         │           │
│  │  ────────────────────────────────────                       │           │
│  │  WS Event: { phase: "design-automation", status: "started" }│           │
│  │                                                              │           │
│  │  API → POST http://localhost:5001/skills/design-automation  │           │
│  │  Request: {                                                  │           │
│  │    brandingAssets: {                                         │           │
│  │      colors: { ... },                                        │           │
│  │      fonts: [ ... ]                                          │           │
│  │    },                                                        │           │
│  │    pinterestUrl: "...",                                      │           │
│  │    domainModel: { ... }                                      │           │
│  │  }                                                           │           │
│  │                                                              │           │
│  │  Mock Skills Server → Response (from sample-design-system.json):       │
│  │  {                                                           │           │
│  │    success: true,                                            │           │
│  │    data: {                                                   │           │
│  │      designSystem: {                                         │           │
│  │        tokens: { colors, typography, spacing, ... },        │           │
│  │        moodboard: { ... },                                   │           │
│  │        branding: { ... }                                     │           │
│  │      }                                                       │           │
│  │    }                                                         │           │
│  │  }                                                           │           │
│  │                                                              │           │
│  │  WS Event: { phase: "design-automation", status: "completed" }         │
│  │                                                              │           │
│  │  ✅ Design system saved to project                           │           │
│  │  ✅ Project status → "blueprints"                            │           │
│  └─────────────────────────────────────────────────────────────┘           │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────┐           │
│  │  PHASE 6.4: CMS ADAPTATION (80%)                            │           │
│  │  ─────────────────────────────────                          │           │
│  │  WS Event: { phase: "cms-adaptation", status: "started" }   │           │
│  │                                                              │           │
│  │  Kirby Generator executes:                                  │           │
│  │  ┌────────────────────────────────────────────────┐         │           │
│  │  │ 1. Create site directory structure             │         │           │
│  │  │    - site/blueprints/                           │         │           │
│  │  │    - site/templates/                            │         │           │
│  │  │    - site/snippets/                             │         │           │
│  │  │    - content/                                   │         │           │
│  │  │    - assets/                                    │         │           │
│  │  │                                                 │         │           │
│  │  │ 2. Generate blueprints from domain model       │         │           │
│  │  │    - pages/page.yml                             │         │           │
│  │  │    - pages/project.yml                          │         │           │
│  │  │    - pages/blog-post.yml                        │         │           │
│  │  │                                                 │         │           │
│  │  │ 3. Generate templates from entities            │         │           │
│  │  │    - default.php                                │         │           │
│  │  │    - project.php                                │         │           │
│  │  │    - blog-post.php                              │         │           │
│  │  │                                                 │         │           │
│  │  │ 4. Generate content files                       │         │           │
│  │  │    - 1_about/default.txt                        │         │           │
│  │  │    - 2_projects/projects.txt                    │         │           │
│  │  │    - ...                                        │         │           │
│  │  │                                                 │         │           │
│  │  │ 5. Generate theme CSS from design tokens       │         │           │
│  │  │    - assets/css/theme.css                       │         │           │
│  │  │                                                 │         │           │
│  │  │ 6. Initialize Git repository                   │         │           │
│  │  │    - git init                                   │         │           │
│  │  │    - git add .                                  │         │           │
│  │  │    - git commit -m "Initial commit"            │         │           │
│  │  └────────────────────────────────────────────────┘         │           │
│  │                                                              │           │
│  │  WS Event: { phase: "cms-adaptation", status: "completed" } │           │
│  │                                                              │           │
│  │  ✅ Kirby site structure created                             │           │
│  │  ✅ Git repository initialized                               │           │
│  │  ✅ Project status → "deploying"                             │           │
│  └─────────────────────────────────────────────────────────────┘           │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────┐           │
│  │  PHASE 6.5: DEPLOYMENT (100%)                               │           │
│  │  ──────────────────────────────                             │           │
│  │  WS Event: { phase: "deployment", status: "started" }       │           │
│  │                                                              │           │
│  │  Local Deployment Service:                                  │           │
│  │  ┌────────────────────────────────────────────────┐         │           │
│  │  │ 1. Copy site to deployment directory           │         │           │
│  │  │    → test-data/e2e/deployments/portfolio-...   │         │           │
│  │  │                                                 │         │           │
│  │  │ 2. Generate deployment metadata                │         │           │
│  │  │    - deployment.json                            │         │           │
│  │  │    - deployment URL                             │         │           │
│  │  │    - deployment ID                              │         │           │
│  │  │                                                 │         │           │
│  │  │ 3. Mark as deployed                             │         │           │
│  │  └────────────────────────────────────────────────┘         │           │
│  │                                                              │           │
│  │  WS Event: { phase: "deployment", status: "completed" }     │           │
│  │                                                              │           │
│  │  ✅ Deployment URL generated                                 │           │
│  │  ✅ Project status → "completed"                             │           │
│  └─────────────────────────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PHASE 7: VALIDATION                                 │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────┐           │
│  │  7.1: Validate Progress Events                              │           │
│  │  ───────────────────────────────                            │           │
│  │  ✅ All 5 phases executed                                    │           │
│  │  ✅ Events received in correct order                         │           │
│  │  ✅ Final progress = 100%                                    │           │
│  └─────────────────────────────────────────────────────────────┘           │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────┐           │
│  │  7.2: Validate Project State                                │           │
│  │  ────────────────────────────                               │           │
│  │  GET /api/projects/:id                                       │           │
│  │                                                              │           │
│  │  ✅ project.status = "completed"                             │           │
│  │  ✅ project.domainModel exists                               │           │
│  │  ✅ project.structuredContent exists                         │           │
│  │  ✅ project.designSystem exists                              │           │
│  │  ✅ project.generated.sitePath exists                        │           │
│  │  ✅ project.generated.deploymentUrl exists                   │           │
│  └─────────────────────────────────────────────────────────────┘           │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────┐           │
│  │  7.3: Validate Domain Model                                 │           │
│  │  ────────────────────────────                               │           │
│  │  ✅ 3 entities (Page, Project, BlogPost)                     │           │
│  │  ✅ All entities have fields                                 │           │
│  │  ✅ Relationships defined                                    │           │
│  │  ✅ JSON Schema present                                      │           │
│  └─────────────────────────────────────────────────────────────┘           │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────┐           │
│  │  7.4: Validate Structured Content                           │           │
│  │  ─────────────────────────────────                          │           │
│  │  ✅ 2 pages (About, Contact)                                 │           │
│  │  ✅ 4 projects                                               │           │
│  │  ✅ 4 blog posts                                             │           │
│  │  ✅ All content items have required fields                   │           │
│  └─────────────────────────────────────────────────────────────┘           │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────┐           │
│  │  7.5: Validate Design System                                │           │
│  │  ────────────────────────────                               │           │
│  │  ✅ Color tokens defined                                     │           │
│  │  ✅ Typography tokens defined                                │           │
│  │  ✅ Spacing tokens defined                                   │           │
│  │  ✅ Branding assets present                                  │           │
│  └─────────────────────────────────────────────────────────────┘           │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────┐           │
│  │  7.6: Validate Generated Files                              │           │
│  │  ───────────────────────────────                            │           │
│  │  Site Path: test-data/e2e/storage/proj_abc123/output/site   │           │
│  │                                                              │           │
│  │  ✅ site/ directory exists                                   │           │
│  │  ✅ site/blueprints/ exists                                  │           │
│  │  ✅ site/templates/ exists                                   │           │
│  │  ✅ site/snippets/ exists                                    │           │
│  │  ✅ content/ directory exists                                │           │
│  │  ✅ assets/ directory exists                                 │           │
│  │  ✅ Multiple files generated (> 0)                           │           │
│  └─────────────────────────────────────────────────────────────┘           │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────┐           │
│  │  7.7: Validate Git Repository                               │           │
│  │  ─────────────────────────────                              │           │
│  │  ✅ .git/ directory exists                                   │           │
│  │  ✅ Initial commit present                                   │           │
│  └─────────────────────────────────────────────────────────────┘           │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────┐           │
│  │  7.8: Validate Deployment                                   │           │
│  │  ──────────────────────────                                 │           │
│  │  ✅ Deployment URL present                                   │           │
│  │  ✅ Deployment ID present                                    │           │
│  └─────────────────────────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            TEST CLEANUP                                     │
│                                                                             │
│  1. Disconnect WebSocket client                                            │
│  2. Stop API server                                                         │
│  3. Stop mock skills server                                                │
│  4. Remove test directories (if cleanupOnStop=true)                         │
│     - test-data/e2e/storage/                                               │
│     - test-data/e2e/sessions/                                              │
│     - test-data/e2e/uploads/                                               │
│     - test-data/e2e/deployments/                                           │
│                                                                             │
│  ✅ All resources cleaned up                                                │
└─────────────────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════════
                           TEST COMPLETE ✅
═══════════════════════════════════════════════════════════════════════════════
```

## Test Duration

- **Project Creation**: ~100ms
- **WebSocket Connection**: ~500ms
- **File Uploads** (4 files): ~400ms
- **Branding Update**: ~100ms
- **Domain Mapping**: ~500ms (mocked)
- **Content Structuring**: ~800ms (mocked)
- **Design Automation**: ~1200ms (mocked)
- **CMS Adaptation**: ~2000ms (Kirby generation)
- **Deployment**: ~500ms
- **Validation**: ~1000ms

**Total Expected Duration**: ~7-10 seconds

## WebSocket Event Sequence

```
time  │ event
──────┼────────────────────────────────────────────────────────────────
0.0s  │ connect
0.1s  │ subscribe { projectId: 'proj_abc123' }
──────┼────────────────────────────────────────────────────────────────
3.5s  │ progress { phase: 'domain-mapping', status: 'started', progress: 5 }
3.6s  │ progress { phase: 'domain-mapping', status: 'in_progress', progress: 10 }
4.0s  │ progress { phase: 'domain-mapping', status: 'completed', progress: 20 }
──────┼────────────────────────────────────────────────────────────────
4.1s  │ progress { phase: 'content-structuring', status: 'started', progress: 25 }
4.2s  │ progress { phase: 'content-structuring', status: 'in_progress', progress: 30 }
4.9s  │ progress { phase: 'content-structuring', status: 'completed', progress: 40 }
──────┼────────────────────────────────────────────────────────────────
5.0s  │ progress { phase: 'design-automation', status: 'started', progress: 45 }
5.1s  │ progress { phase: 'design-automation', status: 'in_progress', progress: 50 }
6.2s  │ progress { phase: 'design-automation', status: 'completed', progress: 60 }
──────┼────────────────────────────────────────────────────────────────
6.3s  │ progress { phase: 'cms-adaptation', status: 'started', progress: 65 }
6.4s  │ progress { phase: 'cms-adaptation', status: 'in_progress', progress: 70 }
7.0s  │ progress { phase: 'cms-adaptation', status: 'in_progress', progress: 75 }
8.4s  │ progress { phase: 'cms-adaptation', status: 'completed', progress: 80 }
──────┼────────────────────────────────────────────────────────────────
8.5s  │ progress { phase: 'deployment', status: 'started', progress: 85 }
8.6s  │ progress { phase: 'deployment', status: 'in_progress', progress: 90 }
9.1s  │ progress { phase: 'deployment', status: 'completed', progress: 100 }
──────┼────────────────────────────────────────────────────────────────
9.1s  │ progress { phase: 'completed', status: 'completed', progress: 100 }
──────┴────────────────────────────────────────────────────────────────
```
