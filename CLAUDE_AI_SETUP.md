# Claude AI Integration

The Kirby Gen app uses Claude AI for intelligent domain mapping conversations. This feature helps users discover and define the content entities in their portfolio through an interactive AI conversation.

## Two Modes

The app supports two modes for Claude AI:

1. **API Mode** (Production) - Uses Anthropic's API, requires API key, costs money per request
2. **CLI Mode** (Local Development) - Uses Claude Code CLI locally, no API key needed, **no costs**

### Mode Comparison

| Feature | API Mode | CLI Mode |
|---------|----------|----------|
| **Use Case** | Production deployment | Local development |
| **Cost** | ~$0.01-0.02 per project | Free |
| **Setup** | API key required | Claude Code CLI required |
| **Internet** | Required | Not required for Claude |
| **Speed** | Fast (direct API) | Slightly slower (file I/O) |
| **Conversation History** | Full support | Full support |

## Setup

Choose the mode that fits your needs:

### Option 1: API Mode (Production)

#### 1. Get an Anthropic API Key

1. Go to [https://console.anthropic.com/](https://console.anthropic.com/)
2. Sign up or log in
3. Navigate to API Keys
4. Create a new API key
5. Copy the key (it starts with `sk-ant-`)

#### 2. Configure the API

1. Navigate to the API package:
   ```bash
   cd packages/api
   ```

2. Create a `.env` file (if it doesn't exist):
   ```bash
   cp .env.example .env
   ```

3. Add your API key to the `.env` file:
   ```env
   ANTHROPIC_API_KEY=sk-ant-your-api-key-here
   CLAUDE_MODEL=claude-3-5-sonnet-20241022
   ```

4. Ensure CLI mode is disabled (default):
   ```env
   CLAUDE_USE_CLI=false
   ```

#### 3. Restart the API Server

```bash
npm run dev
```

### Option 2: CLI Mode (Local Development)

#### 1. Install Claude Code CLI

Follow the installation instructions at [https://claude.com/claude-code](https://claude.com/claude-code)

Verify installation:
```bash
claude --version
```

#### 2. Configure CLI Mode

1. Navigate to the API package:
   ```bash
   cd packages/api
   ```

2. Create a `.env` file (if it doesn't exist):
   ```bash
   cp .env.example .env
   ```

3. Enable CLI mode in the `.env` file:
   ```env
   CLAUDE_USE_CLI=true
   CLAUDE_CLI_SCRIPT=./scripts/claude-cli.sh
   CLAUDE_CLI_OUTPUT_DIR=./data/claude-output
   ```

4. Make sure the CLI script is present:
   ```bash
   ls scripts/claude-cli.sh
   ```

#### 3. Restart the API Server

```bash
npm run dev
```

The server will log: `Claude CLI mode enabled for local development`

## Usage

Once configured, the domain mapping page will use Claude AI to have intelligent conversations about your portfolio structure. Claude will:

- Ask clarifying questions about your content
- Suggest appropriate entity types
- Help define fields and relationships
- Generate a structured domain model

## Fallback Mode (No Configuration)

If neither API nor CLI mode is configured, the app will still work but with limited functionality:

- A message will inform users that Claude AI is not configured
- Users can still proceed to the next step
- The conversation will be basic without AI intelligence

This allows the app to function without requiring Claude AI setup.

## Cost Information

### API Mode
Claude API usage is billed by Anthropic. Check their [pricing page](https://www.anthropic.com/pricing) for current rates. The domain mapping feature uses:

- Model: Claude 3.5 Sonnet (default)
- Average tokens per conversation: ~2000-4000
- Cost: Approximately $0.01-0.02 per portfolio project

### CLI Mode
Using Claude Code CLI has **no API costs**. You only need the Claude Code CLI installed on your development machine. This is ideal for:

- Local development and testing
- Running the app without internet (except for initial CLI setup)
- Unlimited conversations without worrying about costs

## Troubleshooting

### "Claude AI is not configured" message

**Cause**: Neither API key nor CLI mode is set.

**Solution**:
1. Choose which mode you want to use (API or CLI)
2. For API mode: Set `ANTHROPIC_API_KEY` in `.env`
3. For CLI mode: Set `CLAUDE_USE_CLI=true` in `.env`
4. Restart the API server

### API Mode Issues

#### API Errors

**Cause**: Invalid API key or API rate limits

**Solution**:
1. Verify your API key is valid in the Anthropic console
2. Check your API usage limits
3. Review the API server logs for detailed error messages

#### No Response from Claude (API)

**Cause**: Network issues or API timeout

**Solution**:
1. Check your internet connection
2. Verify Anthropic's service status at [https://status.anthropic.com/](https://status.anthropic.com/)
3. Try again in a few moments

### CLI Mode Issues

#### "Claude CLI failed" error

**Cause**: Claude Code CLI is not installed or not in PATH

**Solution**:
1. Verify Claude Code CLI is installed: `claude --version`
2. If not installed, follow the setup guide at [https://claude.com/claude-code](https://claude.com/claude-code)
3. Ensure the `claude` command is available in your PATH

#### Script Permission Issues

**Cause**: The `claude-cli.sh` script doesn't have execute permissions

**Solution**:
The script can be executed with `bash` even without execute permissions. If you still want to set permissions:
```bash
chmod +x packages/api/scripts/claude-cli.sh
```

#### Timeout Errors

**Cause**: Claude CLI took too long to respond (>60 seconds)

**Solution**:
1. Check if the `claude` command is working: `echo "Hello" | claude --quiet`
2. Ensure your system has enough resources
3. Try restarting the API server

#### File I/O Errors

**Cause**: Cannot write to or read from the output directory

**Solution**:
1. Check that `CLAUDE_CLI_OUTPUT_DIR` path is writable
2. Default is `./data/claude-output` in the API directory
3. Ensure the directory exists and has proper permissions:
   ```bash
   mkdir -p packages/api/data/claude-output
   chmod 755 packages/api/data/claude-output
   ```

## Development Notes

The Claude integration is implemented in:

- **Service**: `packages/api/src/services/claude.service.ts` - Main service with both API and CLI support
- **CLI Script**: `packages/api/scripts/claude-cli.sh` - Wrapper for Claude Code CLI
- **Controller**: `packages/api/src/controllers/project.controller.ts` - Domain mapping endpoints
- **Routes**: `packages/api/src/routes/project.routes.ts` - API routes
- **Frontend**: `packages/web/src/components/ConversationUI.tsx` - Conversation UI
- **Environment**: `packages/api/src/config/env.ts` - Configuration schema

### How It Works

#### API Mode
1. Frontend sends message to `/api/projects/:id/domain-mapping/message`
2. Controller calls `claudeService.sendMessage()`
3. Service calls Anthropic API directly
4. Response returned to frontend

#### CLI Mode
1. Frontend sends message to `/api/projects/:id/domain-mapping/message`
2. Controller calls `claudeService.sendMessage()`
3. Service creates temporary files:
   - `session-{timestamp}-prompt.txt` - Contains full prompt with history
   - `session-{timestamp}-output.txt` - Will contain Claude's response
   - `session-{timestamp}-finished.hook` - Signals completion
4. Service executes `claude-cli.sh` script via bash
5. Script pipes prompt to `claude --quiet` command
6. Script writes output and creates hook file
7. Service polls for hook file (with timeout)
8. Service reads output and cleans up files
9. Response returned to frontend

### Graceful Degradation

The integration gracefully degrades when Claude is not available:
- **API Mode**: If API key is invalid or API is down, returns friendly error message
- **CLI Mode**: If CLI fails, returns error with troubleshooting hints
- **No Configuration**: Returns message informing user AI is not configured, allows proceeding

This ensures the app remains functional in all scenarios.
