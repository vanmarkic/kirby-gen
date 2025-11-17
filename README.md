# Kirby-Gen: AI-Powered Portfolio Generator

Generate fully customized Kirby CMS portfolio sites through an AI-guided conversational interface.

## Features

- 🤖 **Conversational Domain Mapping**: AI agent (Claude Opus) guides you through defining your portfolio structure
- 📝 **Smart Content Structuring**: Automatically organize unstructured content into Kirby format
- 🎨 **Design Automation**: Extract design tokens from Pinterest moodboards and branding assets
- 🏗️ **Blueprint Generation**: Auto-generate Kirby blueprints based on your content model
- 🎛️ **Custom Panel**: Editable design tokens directly in the Kirby admin panel
- 🚀 **One-Click Deployment**: Automatically deploy to staging/local environment
- 🔄 **Regeneration Support**: Update and regenerate sites as needed

## Architecture

```
kirby-gen/
├── packages/
│   ├── shared/          # Shared TypeScript types and utilities
│   ├── api/             # Node.js backend API
│   ├── web/             # React frontend
│   ├── skills/          # Claude skills (Python)
│   └── kirby-generator/ # Kirby site generator
├── ARCHITECTURE.md      # Detailed architecture documentation
├── package.json         # Monorepo root
└── README.md           # This file
```

## Prerequisites

- **Node.js** 20+
- **npm** 10+
- **Python** 3.11+
- **PHP** 8.2+
- **Composer**
- **Git**

## Quick Start

### 1. Clone and Install

```bash
git clone <repo-url> kirby-gen
cd kirby-gen
npm run setup
```

This will:
- Install all npm dependencies
- Set up Python virtual environment
- Install Python dependencies

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env and add your CLAUDE_API_KEY
```

### 3. Start Development Servers

```bash
npm run dev
```

This starts:
- **Web interface**: http://localhost:5173
- **API backend**: http://localhost:3000
- **Skills server**: http://localhost:8001

### 4. Run Tests

```bash
# All tests
npm test

# Unit tests only
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Watch mode (for development)
npm run test:watch --workspace=packages/api
```

## Package Details

### @kirby-gen/shared

Shared TypeScript types, interfaces, and utilities used across the monorepo.

```bash
cd packages/shared
npm run build    # Build
npm run dev      # Watch mode
npm test         # Run tests
```

### @kirby-gen/api

Backend API server (Express + Socket.IO).

**Key Features:**
- REST API for project management
- WebSocket for real-time progress updates
- Session management
- Workflow orchestration
- Service abstraction layer (DI)

```bash
cd packages/api
npm run dev      # Start dev server
npm test         # Run all tests
npm run test:e2e # Run E2E tests
```

**Key Endpoints:**
- `POST /api/projects` - Create new project
- `POST /api/projects/:id/upload` - Upload files
- `POST /api/projects/:id/generate` - Start generation
- `GET /api/projects/:id/status` - Get project status
- `WebSocket /socket.io` - Real-time updates

### @kirby-gen/web

React frontend with TypeScript.

**Tech Stack:**
- React 18
- TypeScript
- TanStack Query
- Zustand
- Socket.IO client
- Vite

```bash
cd packages/web
npm run dev      # Start dev server (port 5173)
npm run build    # Production build
npm test         # Run tests
```

### @kirby-gen/skills

Claude Opus-powered skills for content processing.

**Skills:**
1. **Domain Mapping**: Conversational entity discovery
2. **Content Structuring**: Organize unstructured content
3. **Design Automation**: Extract design tokens from moodboards
4. **Blueprint Generation**: Create Kirby blueprints

```bash
cd packages/skills
source venv/bin/activate  # Activate virtual environment
npm run dev               # Start FastAPI server (port 8001)
pytest                    # Run tests
```

**Key Endpoints:**
- `POST /skills/domain-mapping` - Start domain mapping conversation
- `POST /skills/content-structuring` - Structure content
- `POST /skills/design-automation` - Extract design tokens
- `POST /skills/blueprint-generation` - Generate blueprints

### @kirby-gen/kirby-generator

Kirby CMS site generator.

**Generates:**
- Kirby 4 installation
- Custom blueprints
- PHP templates
- Content files (.txt)
- Custom blocks
- Design system (CSS)
- Panel customizations

```bash
cd packages/kirby-generator
npm run dev      # Watch mode
npm test         # Run tests
npm run download-kirby  # Download latest Kirby
```

## Development Workflow

### TDD Approach

We follow Test-Driven Development:

1. **Write failing test**
2. **Implement minimum code to pass**
3. **Refactor**
4. **Repeat**

Example workflow:

```bash
# 1. Create test file
touch packages/api/tests/unit/services/storage.test.ts

# 2. Write test (should fail)
npm run test:watch --workspace=packages/api

# 3. Implement feature
# 4. Watch test pass
# 5. Refactor if needed
```

### Local Services (Dependency Injection)

All cloud services have local equivalents:

| Service | Local | Cloud (Future) |
|---------|-------|----------------|
| Storage | File system | S3 |
| Sessions | JSON files | Redis |
| Deployment | PHP server | Vercel/Netlify |
| Git | Local repos | GitHub |

Configuration in `.env`:

```bash
STORAGE_TYPE=local      # or 's3'
SESSION_TYPE=local      # or 'redis'
DEPLOY_TYPE=local       # or 'vercel'
GIT_TYPE=local          # or 'github'
```

## Project Structure

```
packages/
├── shared/
│   └── src/
│       ├── types/           # TypeScript types
│       ├── interfaces/      # Service interfaces
│       └── utils/           # Shared utilities
├── api/
│   ├── src/
│   │   ├── controllers/     # Request handlers
│   │   ├── services/        # Business logic
│   │   │   ├── local/       # Local implementations
│   │   │   └── cloud/       # Cloud implementations (future)
│   │   ├── routes/          # Express routes
│   │   ├── middleware/      # Express middleware
│   │   ├── di/              # DI container
│   │   └── index.ts         # Entry point
│   └── tests/
│       ├── unit/
│       ├── integration/
│       └── e2e/
├── web/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/           # Page components
│   │   ├── hooks/           # Custom hooks
│   │   ├── stores/          # Zustand stores
│   │   ├── api/             # API client
│   │   └── App.tsx          # Root component
│   └── tests/
├── skills/
│   ├── src/
│   │   ├── skills/          # Individual skills
│   │   │   ├── domain_mapping/
│   │   │   ├── content_structuring/
│   │   │   ├── design_automation/
│   │   │   └── blueprint_generation/
│   │   ├── models/          # Pydantic models
│   │   ├── utils/           # Utilities
│   │   └── main.py          # FastAPI app
│   └── tests/
│       ├── unit/
│       └── integration/
└── kirby-generator/
    ├── src/
    │   ├── generators/      # Code generators
    │   │   ├── blueprints/
    │   │   ├── templates/
    │   │   ├── content/
    │   │   └── theme/
    │   ├── templates/       # EJS templates
    │   └── index.ts         # Entry point
    └── tests/
```

## Environment Variables

See `.env.example` for all available options. Key variables:

```bash
# Required
CLAUDE_API_KEY=sk-ant-...           # Get from https://console.anthropic.com

# Optional (defaults work for local dev)
NODE_ENV=local
PORT=3000
STORAGE_PATH=/tmp/kirby-gen/storage
SESSION_PATH=/tmp/kirby-gen/sessions
DEPLOY_BASE_PATH=/tmp/kirby-gen/deployments
```

## Testing

### Running Tests

```bash
# All packages
npm test

# Specific package
npm test --workspace=packages/api

# Specific type
npm run test:unit           # Unit tests
npm run test:integration    # Integration tests
npm run test:e2e           # E2E tests

# Watch mode
npm run test:watch --workspace=packages/api

# With coverage
npm test -- --coverage
```

### Test Structure

```
tests/
├── unit/              # Unit tests (isolated, fast)
│   ├── services/
│   ├── generators/
│   └── utils/
├── integration/       # Integration tests (components together)
│   ├── api/
│   └── workflows/
└── e2e/              # End-to-end tests (full flow)
    └── scenarios/
```

## Deployment

### Local Deployment

Generated sites are automatically deployed locally:

```
http://localhost:8000  # First project
http://localhost:8001  # Second project
http://localhost:8002  # Third project
...
```

### Staging Deployment (Future)

```
{project-slug}.staging.yourdomain.com
```

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Write tests first (TDD)
4. Implement feature
5. Ensure tests pass (`npm test`)
6. Commit changes (`git commit -m 'Add amazing feature'`)
7. Push to branch (`git push origin feature/amazing-feature`)
8. Open Pull Request

## Troubleshooting

### Python virtual environment issues

```bash
cd packages/skills
rm -rf venv
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
pip install -r requirements.txt
```

### Port already in use

```bash
# Find process using port
lsof -i :3000
# Kill process
kill -9 <PID>
```

### TypeScript build errors

```bash
# Clean and rebuild
npm run clean
npm install
npm run build
```

## License

MIT

## Links

- [Architecture Documentation](./ARCHITECTURE.md)
- [API Documentation](./packages/api/README.md) (TODO)
- [Skills Documentation](./packages/skills/README.md) (TODO)
- [Kirby CMS Docs](https://getkirby.com/docs)
