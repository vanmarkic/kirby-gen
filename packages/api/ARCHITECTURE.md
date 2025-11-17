# API Backend Architecture

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           Web Frontend                               │
│                     (React + Socket.IO Client)                       │
└────────────────┬───────────────────────────────┬────────────────────┘
                 │                               │
                 │ HTTP REST API                 │ WebSocket
                 │                               │
┌────────────────▼───────────────────────────────▼────────────────────┐
│                        Express Server                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐ │
│  │  Middleware  │  │   Routes     │  │   Socket.IO Handler      │ │
│  │  - CORS      │  │  - Projects  │  │  - Connection mgmt       │ │
│  │  - Auth      │  │  - Files     │  │  - Room subscriptions    │ │
│  │  - Validator │  │  - Generate  │  │  - Progress events       │ │
│  │  - Logger    │  │  - Domain    │  └──────────────────────────┘ │
│  │  - Errors    │  │  - Preview   │                               │
│  └──────────────┘  └──────────────┘                               │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │                     Controllers                               │ │
│  │  ┌─────────┐ ┌─────────┐ ┌────────────┐ ┌────────────────┐ │ │
│  │  │ Project │ │  File   │ │ Generation │ │ Domain Mapping │ │ │
│  │  └─────────┘ └─────────┘ └────────────┘ └────────────────┘ │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │              Workflow Orchestrator                            │ │
│  │  ┌────────────────────────────────────────────────────────┐ │ │
│  │  │  Phase 1: Domain Mapping                               │ │ │
│  │  │  Phase 2: Content Structuring                          │ │ │
│  │  │  Phase 3: Design Automation                            │ │ │
│  │  │  Phase 4: CMS Adaptation                               │ │ │
│  │  │  Phase 5: Deployment                                   │ │ │
│  │  └────────────────────────────────────────────────────────┘ │ │
│  └──────────────────────────────────────────────────────────────┘ │
└─────┬────────────────┬────────────────┬──────────────┬────────────┘
      │                │                │              │
      │                │                │              │
┌─────▼─────┐   ┌──────▼──────┐  ┌─────▼──────┐  ┌───▼────────┐
│  Storage  │   │   Session   │  │    Git     │  │ Deployment │
│  Service  │   │   Service   │  │  Service   │  │  Service   │
└───────────┘   └─────────────┘  └────────────┘  └────────────┘

      │                                  │
      │                                  │
┌─────▼──────────────────┐      ┌───────▼────────────────┐
│  Python Skills Server  │      │  Kirby CMS Generator   │
│  - Domain Mapping      │      │  - Blueprints          │
│  - Content Structuring │      │  - Templates           │
│  - Design Automation   │      │  - Content Files       │
└────────────────────────┘      └────────────────────────┘
```

## Request Flow

### 1. Project Creation
```
Client → POST /api/projects
       → Controller.createProject()
       → StorageService.createProject()
       → Response { projectId, status: 'input' }
```

### 2. File Upload
```
Client → POST /api/projects/:id/files/content + FormData
       → Multer middleware (validate, store)
       → Controller.uploadContentFiles()
       → StorageService.updateProject() (add file references)
       → Response { files: [...] }
```

### 3. Generation Workflow
```
Client → POST /api/projects/:id/generate
       → Controller.startGeneration()
       → WorkflowOrchestrator.execute()
       │
       ├─ Phase 1: Domain Mapping
       │  ├─ emit(progress: started)
       │  ├─ SkillClient.domainMapping()
       │  ├─ StorageService.updateProject(domainModel)
       │  └─ emit(progress: completed)
       │
       ├─ Phase 2: Content Structuring
       │  ├─ emit(progress: started)
       │  ├─ SkillClient.contentStructuring()
       │  ├─ StorageService.updateProject(structuredContent)
       │  └─ emit(progress: completed)
       │
       ├─ Phase 3: Design Automation
       │  ├─ emit(progress: started)
       │  ├─ SkillClient.designAutomation()
       │  ├─ StorageService.updateProject(designSystem)
       │  └─ emit(progress: completed)
       │
       ├─ Phase 4: CMS Adaptation
       │  ├─ emit(progress: started)
       │  ├─ KirbyAdapter.generate()
       │  ├─ GitService.init() + commit()
       │  ├─ StorageService.updateProject(generated)
       │  └─ emit(progress: completed)
       │
       └─ Phase 5: Deployment
          ├─ emit(progress: started)
          ├─ DeploymentService.deploy()
          ├─ StorageService.updateProject(deployment)
          └─ emit(progress: completed)

       → Response { status: 'processing' }
       → WebSocket events throughout
```

## Data Flow

### Project Data Evolution
```
1. Creation
   { id, status: 'input', inputs: {} }

2. After File Upload
   {
     id,
     status: 'input',
     inputs: {
       contentFiles: [...]
     }
   }

3. After Domain Mapping
   {
     id,
     status: 'structuring',
     inputs: {...},
     domainModel: {
       entities: [...],
       relationships: [...],
       schema: {...}
     }
   }

4. After Content Structuring
   {
     id,
     status: 'design',
     inputs: {...},
     domainModel: {...},
     structuredContent: {
       [entityType]: [...]
     }
   }

5. After Design Automation
   {
     id,
     status: 'blueprints',
     inputs: {...},
     domainModel: {...},
     structuredContent: {...},
     designSystem: {
       tokens: {...},
       branding: {...}
     }
   }

6. After CMS Adaptation
   {
     id,
     status: 'deploying',
     inputs: {...},
     domainModel: {...},
     structuredContent: {...},
     designSystem: {...},
     generated: {
       sitePath: '...',
       gitRepo: '...',
       kirbyVersion: '...'
     }
   }

7. After Deployment
   {
     id,
     status: 'completed',
     inputs: {...},
     domainModel: {...},
     structuredContent: {...},
     designSystem: {...},
     generated: {
       sitePath: '...',
       gitRepo: '...',
       deploymentUrl: '...',
       deploymentId: '...',
       kirbyVersion: '...'
     }
   }
```

## Module Dependencies

```
index.ts
  └─> server.ts
       ├─> app.ts
       │    ├─> middleware/*
       │    ├─> routes/*
       │    │    └─> controllers/*
       │    │         ├─> workflow/orchestrator
       │    │         │    ├─> workflow/skill-client
       │    │         │    └─> services/* (via DI)
       │    │         └─> services/* (via DI)
       │    └─> config/di-setup
       │         └─> services/*
       │
       └─> websocket/socket-handler
            └─> websocket/progress-emitter
```

## Error Flow

```
Error occurs in:
  - Controller
  - Workflow Orchestrator
  - Skill Client
  - Local Service
         │
         ▼
  Thrown as AppError subclass
         │
         ▼
  Caught by asyncHandler (routes)
         │
         ▼
  Passed to next(error)
         │
         ▼
  Global errorHandler middleware
         │
         ▼
  Response with standardized format:
  {
    success: false,
    error: {
      code: 'ERROR_CODE',
      message: '...',
      statusCode: 4xx/5xx,
      details: {...}
    }
  }
```

## WebSocket Room Structure

```
Socket.IO Namespaces:
  /  (default namespace)
     │
     ├─ room: project:abc123
     │   └─ clients: [socket1, socket2, ...]
     │
     ├─ room: project:def456
     │   └─ clients: [socket3, ...]
     │
     └─ ...

Events:
  Client → Server:
    - subscribe:project(projectId)
    - unsubscribe:project(projectId)
    - ping

  Server → Client (room):
    - workflow:progress
    - workflow:completed
    - workflow:failed
    - pong
```

## Security Layers

```
Request
  │
  ├─> Helmet (Security Headers)
  ├─> CORS (Origin Validation)
  ├─> Rate Limiter (Abuse Prevention)
  ├─> Authentication (Token Validation)
  ├─> Request Validator (Zod Schema)
  │
  └─> Controller (Business Logic)
```

## Performance Considerations

1. **Async Workflow Execution**
   - Generation runs in background
   - Immediate 202 Accepted response
   - Progress via WebSocket

2. **Event-Driven Architecture**
   - EventEmitter for workflow progress
   - Decoupled components
   - Easy to add listeners

3. **Dependency Injection**
   - Singleton services
   - Lazy initialization
   - Memory efficient

4. **File Upload Optimization**
   - Streaming uploads via Multer
   - Size limits enforced
   - Automatic cleanup on errors

5. **Logging**
   - Async logging with Winston
   - Log levels for production
   - Structured logs for analysis

## Scalability Path

### Horizontal Scaling
```
Load Balancer
  ├─> API Server 1 ──┐
  ├─> API Server 2 ──┤
  └─> API Server 3 ──┤
                      │
                      ├─> Shared Storage (S3)
                      ├─> Shared Session (Redis)
                      ├─> Message Queue (RabbitMQ)
                      └─> Database (PostgreSQL)
```

### Vertical Enhancements
- Add database for project storage
- Add Redis for caching and sessions
- Add message queue for background jobs
- Add CDN for file delivery
- Add container orchestration (K8s)

## Technology Stack Summary

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Runtime | Node.js | JavaScript runtime |
| Language | TypeScript | Type safety |
| Framework | Express.js | Web server |
| WebSocket | Socket.IO | Real-time updates |
| Validation | Zod | Schema validation |
| Logging | Winston | Structured logging |
| Testing | Jest | Unit/Integration tests |
| File Upload | Multer | Multipart form data |
| Security | Helmet | Security headers |
| DI | Custom | Service container |
| HTTP Client | Fetch API | Skills server calls |
