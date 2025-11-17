# Claude CLI Integration

This project now supports using the Claude CLI instead of the Anthropic API for local development, eliminating API costs during development.

## How It Works

When `NODE_ENV=local` and `CLAUDE_API_KEY` is empty (or not set), the skills server automatically uses the Claude CLI instead of making HTTP API calls. This is implemented through:

1. **ClaudeCLIAdapter** (`packages/skills/src/utils/claude_cli_adapter.py`) - Wraps the `claude` CLI command with an interface compatible with the Anthropic SDK
2. **Config Module** (`packages/skills/src/config.py`) - Detects environment and provides the appropriate client (API or CLI)
3. **FastAPI Server** (`packages/skills/src/main.py`) - Uses the configured client transparently

## Setup

1. **Install Claude CLI** (if not already installed):
   ```bash
   npm install -g @anthropic-ai/claude-code
   ```

2. **Configure Environment**:
   ```bash
   # Ensure .env has NODE_ENV=local and empty CLAUDE_API_KEY
   cp .env.example .env
   # The default .env.example is already configured for CLI mode
   ```

3. **Install Dependencies**:
   ```bash
   npm install
   npm run setup  # Sets up Python venv and installs deps
   ```

4. **Test the Setup**:
   ```bash
   ./test-local.sh
   ```

## Running the Application

```bash
# Start all services (API, Web, Skills)
npm run dev

# Or start individual services
npm run dev:api      # Backend API
npm run dev:web      # React frontend
npm run dev:skills   # Python skills server with CLI
```

## Verifying CLI Mode

Check the skills server health endpoint:
```bash
curl http://localhost:8001/health
```

Response should show:
```json
{
  "status": "healthy",
  "version": "0.1.0",
  "environment": "local",
  "using_cli": true  ← CLI mode is active
}
```

## Switching Between CLI and API

### Use CLI (Local Development - No API Costs)
```bash
# In .env:
NODE_ENV=local
CLAUDE_API_KEY=
```

### Use API (Production or when API key available)
```bash
# In .env:
NODE_ENV=production
CLAUDE_API_KEY=sk-ant-your-key-here
```

## How the CLI Adapter Works

The `ClaudeCLIAdapter` provides the same interface as `AsyncAnthropic`:

```python
# Instead of:
from anthropic import AsyncAnthropic
client = AsyncAnthropic(api_key=api_key)

# We use:
from utils.claude_cli_adapter import ClaudeCLIAdapter
client = ClaudeCLIAdapter()  # No API key needed

# Same interface:
message = await client.messages.create(
    model="claude-opus-4",
    max_tokens=4096,
    system="System prompt",
    messages=[...]
)
```

Under the hood, it:
1. Writes the prompt to a temp file
2. Calls `claude --file <tempfile> --output text`
3. Parses the response
4. Returns in the same format as the Anthropic SDK

## Limitations

1. **Streaming**: CLI doesn't support native streaming, so we simulate it by chunking the complete response
2. **Model Selection**: The Claude CLI uses the default model (typically Sonnet), not necessarily the model specified in code
3. **Rate Limits**: Subject to Claude CLI's rate limits (usually generous for local development)

## Benefits

- ✅ **Zero API costs** during development
- ✅ **Same code** works with both CLI and API
- ✅ **Easy switching** via environment variables
- ✅ **Transparent** to the rest of the application
- ✅ **Fast iteration** without worrying about API usage

## Troubleshooting

### "Claude CLI not found"
```bash
# Install globally:
npm install -g @anthropic-ai/claude-code

# Verify installation:
which claude
```

### Python Import Errors
```bash
# Recreate venv:
cd packages/skills
rm -rf venv
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Server Won't Start
```bash
# Check logs:
cd packages/skills
source venv/bin/activate
export PYTHONPATH=$(pwd):$PYTHONPATH
uvicorn src.main:app --host 0.0.0.0 --port 8001
```

## Files Modified/Created

- `packages/skills/src/utils/claude_cli_adapter.py` - CLI wrapper
- `packages/skills/src/config.py` - Environment-based client selection
- `packages/skills/src/main.py` - FastAPI server
- `packages/skills/src/skills/domain_mapping/skill.py` - Updated to accept any client
- `.env.example` - Updated with CLI mode instructions
- `CLAUDE.md` - Updated with CLI mode documentation
- `test-local.sh` - Test script for local setup

## Next Steps

This integration is fully working! You can now:
1. Run `npm run dev` to start all services
2. Test the domain mapping skill via API calls to `http://localhost:8001/skills/domain-mapping`
3. The skills will use Claude CLI under the hood (no API costs)
