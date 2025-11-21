#!/bin/bash

# Install Kirby locally and deploy generated blueprints
# Usage: ./scripts/install-kirby-local.sh

set -e

echo "=============================================================================="
echo "🚀 KIRBY LOCAL INSTALLATION & BLUEPRINT DEPLOYMENT"
echo "=============================================================================="
echo ""

# Configuration
KIRBY_DIR="kirby-site"
BLUEPRINTS_SOURCE="data/claude-output/manual-flow/blueprints"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

echo "📁 Project root: $PROJECT_ROOT"
echo ""

# Step 1: Download Kirby Plainkit if not exists
if [ -d "$KIRBY_DIR" ]; then
  echo "⚠️  Kirby directory already exists at: $KIRBY_DIR"
  read -p "   Remove and reinstall? (y/N): " -n 1 -r
  echo ""
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🗑️  Removing existing installation..."
    rm -rf "$KIRBY_DIR"
  else
    echo "✅ Skipping download, using existing installation"
  fi
fi

if [ ! -d "$KIRBY_DIR" ]; then
  echo "📥 Downloading Kirby Plainkit..."

  # Download latest Plainkit
  curl -L https://github.com/getkirby/plainkit/archive/main.zip -o kirby-plainkit.zip

  echo "📦 Extracting..."
  unzip -q kirby-plainkit.zip
  mv plainkit-main "$KIRBY_DIR"
  rm kirby-plainkit.zip

  echo "✅ Kirby installed to: $KIRBY_DIR"
  echo ""
fi

# Step 2: Install Composer dependencies (Kirby core)
echo "📦 Installing Composer dependencies..."
cd "$KIRBY_DIR"

if ! command -v composer &> /dev/null; then
  echo "⚠️  Composer not found. Installing Kirby manually..."

  # Download Kirby core manually
  if [ ! -d "kirby" ]; then
    curl -L https://github.com/getkirby/kirby/archive/main.zip -o kirby-core.zip
    unzip -q kirby-core.zip
    mv kirby-main kirby
    rm kirby-core.zip
  fi
else
  composer install
fi

cd "$PROJECT_ROOT"
echo ""

# Step 3: Create blueprints directory structure
echo "📂 Setting up blueprints directory..."
mkdir -p "$KIRBY_DIR/site/blueprints/pages"
echo "✅ Created: $KIRBY_DIR/site/blueprints/pages"
echo ""

# Step 4: Copy generated blueprints
echo "📋 Copying generated blueprints..."

if [ ! -d "$BLUEPRINTS_SOURCE" ]; then
  echo "❌ Error: Blueprints not found at: $BLUEPRINTS_SOURCE"
  exit 1
fi

COPIED_COUNT=0
for blueprint in "$BLUEPRINTS_SOURCE"/*.yml; do
  if [ -f "$blueprint" ]; then
    filename=$(basename "$blueprint")
    cp "$blueprint" "$KIRBY_DIR/site/blueprints/pages/"
    echo "   ✅ Copied: $filename"
    ((COPIED_COUNT++))
  fi
done

echo ""
echo "✅ Copied $COPIED_COUNT blueprints"
echo ""

# Step 5: Configure base URL for subfolder
echo "🔧 Configuring Kirby for subfolder deployment..."

cat > "$KIRBY_DIR/site/config/config.php" << 'EOF'
<?php

return [
  'debug' => true,

  // Configure base URL for subfolder
  'url' => 'http://localhost:8080/kirby-site',

  // Panel installation
  'panel' => [
    'install' => true
  ]
];
EOF

echo "✅ Created config: $KIRBY_DIR/site/config/config.php"
echo ""

# Step 6: Create .htaccess for subfolder routing
echo "🔧 Creating .htaccess for clean URLs..."

cat > "$KIRBY_DIR/.htaccess" << 'EOF'
# Kirby .htaccess

# Rewrite rules
<IfModule mod_rewrite.c>

RewriteEngine on

# Make site available from /kirby-site subfolder
RewriteBase /kirby-site

# Block access to site/blueprints, site/config, etc.
RewriteRule ^site/(.*)$ index.php [L]
RewriteRule ^kirby/(.*)$ index.php [L]

# Make sure to redirect requests to index.php
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ index.php [L]

</IfModule>
EOF

echo "✅ Created: $KIRBY_DIR/.htaccess"
echo ""

# Step 7: List installed blueprints
echo "=============================================================================="
echo "✨ INSTALLATION COMPLETE"
echo "=============================================================================="
echo ""
echo "📊 Installed Blueprints:"
ls -1 "$KIRBY_DIR/site/blueprints/pages" | while read blueprint; do
  echo "   - $blueprint"
done
echo ""

# Step 8: Start instructions
echo "🚀 TO START KIRBY:"
echo ""
echo "   cd packages/api/$KIRBY_DIR"
echo "   php -S localhost:8080 kirby/router.php"
echo ""
echo "📱 ACCESS PANEL:"
echo ""
echo "   http://localhost:8080/kirby-site/panel"
echo ""
echo "🎯 NEXT STEPS:"
echo ""
echo "   1. Start the PHP server (see command above)"
echo "   2. Visit the panel URL"
echo "   3. Create your admin account"
echo "   4. Click 'Add Page' to see your blueprints:"
echo "      - Gig"
echo "      - Artist"
echo "      - Release"
echo "      - Audio Sample"
echo "      - Band Member"
echo ""
echo "=============================================================================="
