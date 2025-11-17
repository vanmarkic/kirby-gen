#!/bin/bash
# Test script for local development with Claude CLI

set -e

echo "🔧 Testing Kirby-Gen with Claude CLI"
echo "======================================"
echo ""

# Check if Claude CLI is installed
echo "1. Checking Claude CLI installation..."
if ! command -v claude &> /dev/null; then
    echo "❌ Claude CLI not found. Install with: npm install -g @anthropic-ai/claude-code"
    exit 1
fi
echo "✓ Claude CLI found at: $(which claude)"
echo ""

# Check .env file
echo "2. Checking .env configuration..."
if [ ! -f ".env" ]; then
    echo "⚠ No .env file found, creating from .env.example..."
    cp .env.example .env
fi

# Check if CLAUDE_API_KEY is empty (for CLI mode)
if grep -q "CLAUDE_API_KEY=$" .env || grep -q "CLAUDE_API_KEY=\"\"" .env; then
    echo "✓ CLAUDE_API_KEY is empty - will use CLI mode"
else
    echo "⚠ CLAUDE_API_KEY is set - will use API mode instead of CLI"
fi
echo ""

# Check Python venv
echo "3. Checking Python virtual environment..."
if [ ! -d "packages/skills/venv" ]; then
    echo "❌ Python venv not found. Run: npm run setup"
    exit 1
fi
echo "✓ Python venv exists"
echo ""

# Test skills server import
echo "4. Testing skills server imports..."
cd packages/skills
export PYTHONPATH=$(pwd):$PYTHONPATH
source venv/bin/activate
if python -c "from src.main import app; print('✓ Skills server imports successfully')" 2>&1; then
    echo "✓ All imports successful"
else
    echo "❌ Import failed"
    exit 1
fi
cd ../..
echo ""

echo "5. Testing skills server startup..."
echo "Starting server on http://localhost:8001..."
cd packages/skills
export PYTHONPATH=$(pwd):$PYTHONPATH
source venv/bin/activate

# Start server in background
uvicorn src.main:app --host 0.0.0.0 --port 8001 > /tmp/skills-test.log 2>&1 &
SERVER_PID=$!
echo "Server PID: $SERVER_PID"

# Wait for server to start
sleep 3

# Test health endpoint
echo "Testing /health endpoint..."
if curl -s http://localhost:8001/health > /tmp/health-response.json; then
    echo "✓ Health check response:"
    cat /tmp/health-response.json | python3 -m json.tool 2>/dev/null || cat /tmp/health-response.json
    echo ""
else
    echo "❌ Health check failed"
    echo "Server logs:"
    cat /tmp/skills-test.log
    kill $SERVER_PID 2>/dev/null || true
    exit 1
fi

# Stop server
echo ""
echo "Stopping server..."
kill $SERVER_PID 2>/dev/null || true
sleep 1

echo ""
echo "======================================"
echo "✅ All tests passed!"
echo ""
echo "To start the full application:"
echo "  npm run dev"
echo ""
echo "The skills server will use Claude CLI instead of the API"
echo "This means no API costs during development!"
