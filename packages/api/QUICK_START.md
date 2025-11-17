# API Backend - Quick Start Guide

## Installation

```bash
cd packages/api
npm install
```

## Configuration

1. Copy environment template:
```bash
cp .env.example .env
```

2. Edit `.env` with your settings (defaults work for local development)

## Development

Start the development server with hot reload:
```bash
npm run dev
```

Server will be available at: `http://localhost:3001`

## Testing

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:e2e

# Watch mode
npm run test:watch
```

## Production

Build and start:
```bash
npm run build
npm start
```

## API Usage Example

```javascript
// 1. Create a project
const createRes = await fetch('http://localhost:3001/api/projects', {
  method: 'POST'
});
const { data: project } = await createRes.json();

// 2. Upload files
const formData = new FormData();
formData.append('files', file);
await fetch(`http://localhost:3001/api/projects/${project.id}/files/content`, {
  method: 'POST',
  body: formData
});

// 3. Connect WebSocket for progress
import { io } from 'socket.io-client';
const socket = io('http://localhost:3001');
socket.emit('subscribe:project', project.id);
socket.on('workflow:progress', (progress) => {
  console.log(`${progress.phase}: ${progress.progress}%`);
});

// 4. Start generation
await fetch(`http://localhost:3001/api/projects/${project.id}/generate`, {
  method: 'POST'
});
```

## Endpoints

- `GET /api/health` - Health check
- `GET /api/info` - API information
- `POST /api/projects` - Create project
- `GET /api/projects` - List projects
- `GET /api/projects/:id` - Get project
- `POST /api/projects/:id/files/content` - Upload files
- `POST /api/projects/:id/generate` - Start generation

See README.md for complete API documentation.
