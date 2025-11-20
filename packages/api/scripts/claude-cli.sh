#!/bin/bash
# Claude CLI Wrapper for Local Development
# This script invokes Claude Code CLI and captures the response

set -e

# Arguments
PROMPT_FILE="$1"
OUTPUT_FILE="$2"
FINISHED_HOOK="$3"

if [ -z "$PROMPT_FILE" ] || [ -z "$OUTPUT_FILE" ]; then
  echo "Usage: $0 <prompt_file> <output_file> [finished_hook]"
  exit 1
fi

# Check if prompt file exists
if [ ! -f "$PROMPT_FILE" ]; then
  echo "Error: Prompt file not found: $PROMPT_FILE"
  exit 1
fi

# Read the prompt
PROMPT=$(cat "$PROMPT_FILE")

# Create a temporary directory for Claude CLI output
TEMP_DIR=$(mktemp -d)
RESPONSE_FILE="$TEMP_DIR/response.txt"

# Call Claude CLI and capture output
# We use a here-document to send the prompt to Claude
echo "$PROMPT" | claude > "$RESPONSE_FILE" 2>&1 || {
  echo "Error: Claude CLI failed"
  echo "Error calling Claude CLI" > "$OUTPUT_FILE"
  [ -n "$FINISHED_HOOK" ] && touch "$FINISHED_HOOK"
  rm -rf "$TEMP_DIR"
  exit 1
}

# Copy response to output file
cat "$RESPONSE_FILE" > "$OUTPUT_FILE"

# Execute finished hook if provided
if [ -n "$FINISHED_HOOK" ]; then
  touch "$FINISHED_HOOK"
fi

# Cleanup
rm -rf "$TEMP_DIR"

exit 0
