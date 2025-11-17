#!/bin/bash
# E2E Test Runner Script
# This script installs Playwright and runs the happy path test

set -e  # Exit on error

# Fix macOS temp directory permission issues
export TMPDIR="$HOME/.cache/tmp"
mkdir -p "$TMPDIR"

echo "🎭 Playwright E2E Test Setup & Runner"
echo "======================================"
echo ""

# Check if servers are running
echo "📡 Checking if servers are running..."
if ! curl -s http://localhost:5176 > /dev/null; then
    echo "❌ Web server not running on port 5176"
    echo "   Please run: npm run dev"
    exit 1
fi

if ! curl -s http://localhost:3001/api/health > /dev/null; then
    echo "❌ API server not running on port 3001"
    echo "   Please run: npm run dev"
    exit 1
fi

echo "✅ All servers are running"
echo ""

# Install Playwright browsers if needed
if [ ! -d "$HOME/.cache/ms-playwright/chromium"* ]; then
    echo "📦 Installing Playwright Chromium browser..."
    npm run playwright:install
    echo "✅ Browser installed"
    echo ""
else
    echo "✅ Playwright browser already installed"
    echo ""
fi

# Ask user which mode to run
echo "Select test mode:"
echo "1) Headed (visible browser - watch it work!)"
echo "2) Headless (faster, no UI)"
echo "3) UI Mode (interactive debugging)"
echo ""
read -p "Enter choice [1-3]: " choice

case $choice in
    1)
        echo ""
        echo "🚀 Running tests in HEADED mode (you'll see the browser)..."
        npm run test:playwright:headed
        ;;
    2)
        echo ""
        echo "🚀 Running tests in HEADLESS mode..."
        npm run test:playwright
        ;;
    3)
        echo ""
        echo "🚀 Opening Playwright UI..."
        npm run test:playwright:ui
        ;;
    *)
        echo ""
        echo "❌ Invalid choice. Running in headless mode..."
        npm run test:playwright
        ;;
esac

echo ""
echo "✅ Test run complete!"
echo ""
echo "To view the HTML report, run:"
echo "  npx playwright show-report playwright-report"
