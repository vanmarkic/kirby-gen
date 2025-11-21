#!/bin/bash
# Script to add ANTHROPIC_API_KEY to .env file for testing

ENV_FILE="/Users/dragan/Documents/kirby-gen/.env"

echo "=== Setup Anthropic API Key for Testing ==="
echo ""
echo "This will add ANTHROPIC_API_KEY to your .env file."
echo "The key will be copied from your CLAUDE_API_KEY environment variable."
echo ""

# Check if CLAUDE_API_KEY is set
if [ -z "$CLAUDE_API_KEY" ]; then
    echo "❌ CLAUDE_API_KEY environment variable is not set"
    echo ""
    echo "Please run this script with your API key:"
    echo "  export CLAUDE_API_KEY='your-key-here'"
    echo "  ./setup-api-key.sh"
    exit 1
fi

# Remove any existing ANTHROPIC_API_KEY line
sed -i '' '/^ANTHROPIC_API_KEY=/d' "$ENV_FILE"

# Add new ANTHROPIC_API_KEY
echo "ANTHROPIC_API_KEY=$CLAUDE_API_KEY" >> "$ENV_FILE"

echo "✓ Added ANTHROPIC_API_KEY to $ENV_FILE"
echo ""
echo "You can now run the real API test with:"
echo "  cd packages/api"
echo "  ENABLE_REAL_API_TEST=true npm test -- tests/integration/anthropic-domain-mapping-real-api.integration.test.ts"
