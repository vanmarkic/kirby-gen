# Kirby Gen - Web Interface

React-based web interface for the Kirby Gen portfolio generator.

## Overview

The web interface provides a user-friendly experience for generating portfolio websites from creative work. It guides users through file uploads, domain mapping, and portfolio generation with real-time progress updates.

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **React Router** - Client-side routing
- **TanStack Query** - Server state management
- **Zustand** - Client state management
- **Socket.IO Client** - Real-time WebSocket updates
- **Axios** - HTTP client
- **React Dropzone** - File upload handling
- **Lucide React** - Icon library
- **Vitest** - Testing framework
- **React Testing Library** - Component testing

## Project Structure

```
src/
├── api/                  # API layer
│   ├── client.ts        # Axios client configuration
│   ├── endpoints.ts     # API endpoint functions
│   └── websocket.ts     # Socket.IO client
├── components/          # Reusable components
│   ├── BrandingForm.tsx
│   ├── ConversationUI.tsx
│   ├── DeploymentInfo.tsx
│   ├── FileUpload.tsx
│   ├── ProgressBar.tsx
│   ├── ProgressLog.tsx
│   └── SchemaVisualization.tsx
├── hooks/               # Custom React hooks
│   ├── useFileUpload.ts
│   ├── useProject.ts
│   └── useWebSocket.ts
├── pages/               # Page components
│   ├── HomePage.tsx
│   ├── InputPage.tsx
│   ├── DomainMappingPage.tsx
│   ├── ProgressPage.tsx
│   ├── PreviewPage.tsx
│   └── ErrorPage.tsx
├── stores/              # Zustand stores
│   ├── projectStore.ts
│   └── progressStore.ts
├── styles/              # Global styles
│   ├── globals.css
│   └── variables.css
├── test/                # Tests
│   ├── components/
│   ├── pages/
│   └── setup.ts
├── App.tsx              # Main app component
└── main.tsx             # App entry point
```

## User Flow

1. **Home Page** (`/`)
   - Landing page with feature overview
   - Click "Start New Project" to begin

2. **Input Page** (`/project/:id/input`)
   - Upload images, PDFs via drag-and-drop
   - Optional: Add Pinterest board URL
   - Customize branding (colors, fonts)
   - Submit to proceed

3. **Domain Mapping Page** (`/project/:id/domain-mapping`)
   - Conversational AI interface
   - AI discovers entities from uploaded content
   - Visual schema representation
   - User confirms and refines domain model

4. **Progress Page** (`/project/:id/progress`)
   - Real-time generation progress
   - WebSocket-powered live updates
   - Streaming logs from backend
   - Progress bar with stages
   - Auto-redirects on completion/failure

5. **Preview Page** (`/project/:id/preview`)
   - Live preview in iframe
   - CMS access credentials
   - Download portfolio files
   - Deployment instructions

6. **Error Page** (`/error`)
   - Error handling with details
   - Navigation options

## WebSocket Integration

The app uses Socket.IO for real-time updates during portfolio generation:

### Connection Flow
1. User navigates to Progress Page
2. `useWebSocket` hook connects to server
3. Joins project-specific room
4. Receives progress updates, logs, and status changes
5. Updates Zustand store in real-time
6. Disconnects on page exit

### Events

**Client → Server:**
- `join-project` - Join project room
- `leave-project` - Leave project room

**Server → Client:**
- `progress-update` - Progress percentage and stage
- `log-entry` - Log message with level
- `generation-complete` - Success notification
- `generation-failed` - Error notification

### Store Updates

Progress updates flow through the `progressStore`:
```typescript
{
  progress: number,        // 0-100
  status: string,         // pending | in_progress | completed | failed
  currentStage: string,   // e.g., "Creating CMS"
  logs: LogEntry[],       // Streaming logs
  error: string | null    // Error message if failed
}
```

## State Management

### Zustand Stores

**`projectStore`** - Project data
- Current project
- Project list
- Loading states
- Error handling

**`progressStore`** - Generation progress
- Progress percentage
- Current stage
- Real-time logs
- Status tracking

### TanStack Query

Used for server state:
- API request caching
- Automatic refetching
- Optimistic updates
- Loading/error states

## API Layer

### Client Configuration
- Base URL: `/api`
- 30s timeout
- Automatic error handling
- Request/response interceptors

### Endpoints

**Projects:**
- `POST /api/projects` - Create project
- `GET /api/projects/:id` - Get project
- `PUT /api/projects/:id` - Update project
- `POST /api/projects/:id/generate` - Start generation
- `GET /api/projects/:id/preview-url` - Get preview URL
- `GET /api/projects/:id/download` - Download portfolio

**Domain Mapping:**
- `POST /api/projects/:id/domain-mapping/init` - Initialize conversation
- `POST /api/projects/:id/domain-mapping/message` - Send message
- `GET /api/projects/:id/domain-mapping/schema` - Get schema

**Files:**
- `POST /api/projects/:id/files` - Upload files
- `POST /api/projects/:id/pinterest` - Add Pinterest URL

## Components

### FileUpload
Drag-and-drop file upload with validation:
- Multiple file support
- File type/size restrictions
- Preview uploaded files
- Remove files

### BrandingForm
Color and font customization:
- Color pickers with hex input
- Font family selection
- Live preview

### ConversationUI
Chat interface for domain mapping:
- Message history
- Typing indicator
- Real-time schema updates
- Auto-scroll

### ProgressBar
Visual progress indicator:
- Percentage display
- Stage indicators
- Status icons
- Shimmer animation

### ProgressLog
Streaming log viewer:
- Color-coded log levels
- Timestamps
- Auto-scroll
- Terminal styling

### SchemaVisualization
Domain model visualization:
- Entity cards
- Field types
- Relationships
- Required indicators

### DeploymentInfo
Deployment details:
- CMS panel URL
- Credentials display
- Copy to clipboard
- Next steps guide

## Custom Hooks

### useProject
Project CRUD operations:
```typescript
const {
  createProject,
  getProject,
  updateProject,
  deleteProject,
  generatePortfolio,
  isCreating,
  isUpdating,
} = useProject();
```

### useWebSocket
WebSocket connection management:
```typescript
const { connect, disconnect, isConnected } = useWebSocket(projectId);
```

### useFileUpload
File upload with progress:
```typescript
const {
  uploadFiles,
  uploadPinterestUrl,
  uploadProgress,
  isUploading,
} = useFileUpload({ projectId });
```

## Styling

### CSS Custom Properties
All design tokens in `variables.css`:
- Colors (light/dark mode)
- Typography
- Spacing
- Border radius
- Shadows
- Transitions

### Global Styles
Comprehensive `globals.css`:
- CSS reset
- Typography scale
- Button variants
- Form controls
- Layout utilities
- Page-specific styles
- Responsive breakpoints

### Design System
- Primary color: Indigo (#6366f1)
- Font: Inter
- Border radius: 0.5rem
- Shadows: Subtle elevation
- Transitions: 200ms ease

## Testing

### Test Setup
- Vitest + jsdom
- React Testing Library
- Mock implementations for:
  - window.matchMedia
  - IntersectionObserver
  - ResizeObserver
  - navigator.clipboard
  - fetch

### Test Coverage

**Components:**
- FileUpload - Upload, remove, validation
- BrandingForm - Color/font changes
- ProgressBar - Progress, stages, status

**Pages:**
- HomePage - Navigation, project creation
- ErrorPage - Error display, navigation

**Integration:**
All tests use realistic user interactions and verify behavior, not implementation.

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Type check
npm run typecheck

# Build for production
npm run build

# Preview production build
npm run preview
```

## Configuration

### Vite Config
- React plugin
- Path aliases (`@/`)
- Proxy to backend API
- WebSocket proxy
- Vitest integration

### TypeScript
- Strict mode
- Path mapping
- Type checking

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Performance

- Code splitting by route
- Lazy loading
- Image optimization
- WebSocket connection pooling
- Request caching
- Optimistic updates

## Accessibility

- Semantic HTML
- ARIA labels
- Keyboard navigation
- Focus management
- Screen reader support

## Error Handling

- API error interceptors
- Error boundaries (React)
- User-friendly error messages
- Retry logic
- Fallback UI

## Future Enhancements

- [ ] Dark mode toggle
- [ ] Project dashboard
- [ ] Template selection
- [ ] Collaborative editing
- [ ] Version history
- [ ] Export options
- [ ] Analytics integration
