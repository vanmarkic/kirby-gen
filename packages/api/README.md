# @kirby-gen/api

Backend API server for the Kirby-Gen portfolio generation system. Orchestrates the entire workflow from content upload to deployment.

## Features

- **Express + TypeScript** - Type-safe REST API
- **Socket.IO** - Real-time progress updates
- **Workflow Orchestration** - Sequential phase execution with error handling
- **Service Integration** - Seamless integration with local services and Python skills
- **File Upload** - Multer-based file handling with validation
- **Authentication** - Simple token-based auth (MVP)
- **Rate Limiting** - Protect endpoints from abuse
- **Comprehensive Logging** - Winston-based structured logging
- **Request Validation** - Zod schema validation
- **Error Handling** - Global error handler with custom error types
- **Testing** - Unit, integration, and E2E tests

## Architecture

```
packages/api/
├── src/
│   ├── config/           # Configuration (env, logger, DI)
│   ├── controllers/      # Request handlers
│   ├── middleware/       # Express middleware
│   ├── routes/          # API routes
│   ├── workflow/        # Workflow orchestration
│   ├── websocket/       # Socket.IO handlers
│   ├── utils/           # Utilities (errors, responses)
│   ├── services/        # Local services
│   ├── app.ts           # Express app configuration
│   ├── server.ts        # Server class with Socket.IO
│   └── index.ts         # Entry point
└── tests/
    ├── unit/            # Unit tests
    ├── integration/     # API integration tests
    └── e2e/             # End-to-end tests
```

## Workflow Orchestration

The workflow orchestrator manages five sequential phases:

### Phase 1: Domain Mapping
- Analyzes uploaded content files
- Calls domain-mapping Python skill
- Generates domain model (entities, relationships, schema)

### Phase 2: Content Structuring
- Uses domain model to structure content
- Calls content-structuring Python skill
- Produces structured content for each entity type

### Phase 3: Design Automation
- Processes branding assets and Pinterest URL
- Calls design-automation Python skill
- Generates design system and tokens

### Phase 4: CMS Adaptation
- Calls Kirby adapter to generate CMS structure
- Creates blueprints, templates, and content
- Initializes Git repository

### Phase 5: Deployment
- Deploys site using local deployment service
- Returns preview URL
- Updates project with deployment info

Each phase emits WebSocket progress events for real-time updates.

## API Endpoints

### Projects
- `POST /api/projects` - Create new project
- `GET /api/projects` - List all projects (paginated)
- `GET /api/projects/:id` - Get project by ID
- `PATCH /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project
- `GET /api/projects/:id/status` - Get project status

### File Upload
- `POST /api/projects/:id/files/content` - Upload content files
- `POST /api/projects/:id/files/branding` - Upload branding assets
- `GET /api/projects/:id/files` - List project files
- `DELETE /api/projects/:id/files/:fileId` - Delete file

### Domain Mapping
- `POST /api/projects/:id/domain-model/generate` - Generate domain model
- `GET /api/projects/:id/domain-model` - Get domain model
- `PUT /api/projects/:id/domain-model` - Update domain model
- `POST /api/domain-model/validate` - Validate domain model

### Generation
- `POST /api/projects/:id/generate` - Start generation
- `GET /api/projects/:id/generate` - Get generation status
- `DELETE /api/projects/:id/generate` - Cancel generation
- `POST /api/projects/:id/generate/retry` - Retry failed generation

### Health & Info
- `GET /api/health` - Health check
- `GET /api/info` - API information

## WebSocket Events

### Client → Server
- `subscribe:project` - Subscribe to project updates
- `unsubscribe:project` - Unsubscribe from project
- `ping` - Connection health check

### Server → Client
- `workflow:progress` - Progress update
- `workflow:completed` - Workflow completed
- `workflow:failed` - Workflow failed
- `pong` - Ping response

## Environment Variables

Create a `.env` file based on `.env.example`:

```bash
# Server
NODE_ENV=development
PORT=3001
HOST=0.0.0.0

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/api.log

# CORS
CORS_ORIGIN=http://localhost:3000
CORS_CREDENTIALS=true

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# File Upload
MAX_FILE_SIZE=52428800
UPLOAD_DIR=./data/uploads

# Storage
STORAGE_DIR=./data/storage
SESSION_DIR=./data/sessions

# Git
GIT_USER_NAME=Kirby Generator
GIT_USER_EMAIL=generator@kirby-gen.local

# Deployment
DEPLOYMENT_DIR=./data/deployments
DEPLOYMENT_PORT_START=4000

# Skills Server
SKILLS_SERVER_URL=http://localhost:5000
SKILLS_TIMEOUT_MS=300000

# Kirby Generator
KIRBY_GENERATOR_PATH=../kirby-generator

# Auth
AUTH_ENABLED=false
AUTH_TOKEN=your-secret-token

# WebSocket
WS_PING_INTERVAL=30000
WS_PING_TIMEOUT=60000
```

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run tests
npm test
npm run test:unit
npm run test:integration
npm run test:e2e
npm run test:watch

# Linting
npm run lint

# Type checking
npm run typecheck
```

## Usage Example

```typescript
// Create a project
const createResponse = await fetch('http://localhost:3001/api/projects', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
});
const { data: project } = await createResponse.json();

// Upload content files
const formData = new FormData();
formData.append('files', file1);
formData.append('files', file2);

await fetch(`http://localhost:3001/api/projects/${project.id}/files/content`, {
  method: 'POST',
  body: formData,
});

// Start generation
const generateResponse = await fetch(
  `http://localhost:3001/api/projects/${project.id}/generate`,
  { method: 'POST' }
);

// Connect to WebSocket for progress updates
const socket = io('http://localhost:3001');
socket.emit('subscribe:project', project.id);
socket.on('workflow:progress', (progress) => {
  console.log(`Phase: ${progress.phase}, Progress: ${progress.progress}%`);
});
```

## Error Handling

All errors follow a standard format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "statusCode": 400,
    "details": {}
  }
}
```

Custom error types:
- `ValidationError` - Request validation failed
- `NotFoundError` - Resource not found
- `UnauthorizedError` - Authentication required
- `WorkflowError` - Workflow execution failed
- `SkillError` - Python skill failed
- `StorageError` - Storage operation failed
- `GitError` - Git operation failed
- `DeploymentError` - Deployment failed
- `FileUploadError` - File upload failed

## Testing

The API includes comprehensive test coverage:

- **Unit Tests** - Test individual controllers and workflow components
- **Integration Tests** - Test API endpoints end-to-end
- **E2E Tests** - Test complete generation flow

Run tests with:
```bash
npm test
```

## Dependencies

Key dependencies:
- **express** - Web framework
- **socket.io** - WebSocket support
- **zod** - Schema validation
- **winston** - Logging
- **multer** - File uploads
- **helmet** - Security headers
- **cors** - CORS support
- **express-rate-limit** - Rate limiting

## License

Private - Part of Kirby-Gen monorepo
