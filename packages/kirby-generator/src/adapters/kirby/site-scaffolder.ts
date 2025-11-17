/**
 * Site Scaffolder
 * Downloads and scaffolds a complete Kirby CMS installation
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { GeneratedFile } from '@kirby-gen/shared';

/**
 * Kirby Version Configuration
 */
export interface KirbyVersionConfig {
  version: string;
  downloadUrl: string;
  sha256?: string;
}

/**
 * Scaffolding Configuration
 */
export interface ScaffoldConfig {
  installKirby?: boolean;
  kirbyVersion?: string;
  createGitignore?: boolean;
  createHtaccess?: boolean;
  createReadme?: boolean;
  setupPanel?: boolean;
  debugMode?: boolean;
}

/**
 * Site Scaffolder
 */
export class SiteScaffolder {
  private config: ScaffoldConfig;
  private kirbyVersion: string;

  constructor(config: ScaffoldConfig = {}) {
    this.config = {
      installKirby: true,
      kirbyVersion: '4.0.0',
      createGitignore: true,
      createHtaccess: true,
      createReadme: true,
      setupPanel: true,
      debugMode: false,
      ...config,
    };
    this.kirbyVersion = this.config.kirbyVersion || '4.0.0';
  }

  /**
   * Generate site structure files
   */
  generateSiteStructure(): GeneratedFile[] {
    const files: GeneratedFile[] = [];

    // Config file
    files.push(this.generateConfig());

    // .gitignore
    if (this.config.createGitignore) {
      files.push(this.generateGitignore());
    }

    // .htaccess
    if (this.config.createHtaccess) {
      files.push(this.generateHtaccess());
    }

    // README
    if (this.config.createReadme) {
      files.push(this.generateReadme());
    }

    // robots.txt
    files.push(this.generateRobotsTxt());

    // index.php (entry point)
    files.push(this.generateIndexPHP());

    // Panel CSS customization
    if (this.config.setupPanel) {
      files.push(this.generatePanelCSS());
    }

    return files;
  }

  /**
   * Generate config.php
   */
  private generateConfig(): GeneratedFile {
    const config = `<?php

return [
  // Debug mode
  'debug' => ${this.config.debugMode ? 'true' : 'false'},

  // Panel configuration
  'panel' => [
    'install' => true,
    'slug' => 'panel',
  ],

  // Language configuration
  'languages' => false,

  // Cache configuration
  'cache' => [
    'pages' => [
      'active' => true,
      'type' => 'file',
    ],
  ],

  // Routes
  'routes' => [
    // Custom routes can be added here
  ],

  // Hooks
  'hooks' => [
    // Custom hooks can be added here
  ],

  // Custom options
  'thumbs' => [
    'quality' => 80,
    'presets' => [
      'default' => ['width' => 1024, 'quality' => 80],
      'thumb' => ['width' => 400, 'height' => 400, 'crop' => true],
      'medium' => ['width' => 800],
      'large' => ['width' => 1200],
    ],
  ],
];
`;

    return {
      path: 'site/config/config.php',
      content: config,
      encoding: 'utf-8',
    };
  }

  /**
   * Generate .gitignore
   */
  private generateGitignore(): GeneratedFile {
    const content = `# Kirby
/site/accounts/*
!/site/accounts/index.html
/site/cache/*
!/site/cache/index.html
/site/sessions/*
!/site/sessions/index.html

# Media
/media/*
!/media/index.html

# Node
node_modules/
npm-debug.log

# macOS
.DS_Store
._*

# Windows
Thumbs.db
Desktop.ini

# IDEs
.idea/
.vscode/
*.sublime-project
*.sublime-workspace

# Temp files
*.tmp
*.temp
*.log

# Environment
.env
.env.local
`;

    return {
      path: '.gitignore',
      content,
      encoding: 'utf-8',
    };
  }

  /**
   * Generate .htaccess for Apache
   */
  private generateHtaccess(): GeneratedFile {
    const content = `# Kirby .htaccess

# Rewrite rules
<IfModule mod_rewrite.c>
  RewriteEngine On

  # Redirect to https (optional, uncomment if needed)
  # RewriteCond %{HTTPS} off
  # RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

  # Block access to kirby and all content folders
  RewriteRule ^content/(.*) index.php [L]
  RewriteRule ^site/(.*) index.php [L]
  RewriteRule ^kirby/(.*) index.php [L]

  # Make site links work
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule ^(.*) index.php [L]
</IfModule>

# Additional recommended server settings
<IfModule mod_headers.c>
  # Security headers
  Header set X-Content-Type-Options "nosniff"
  Header set X-Frame-Options "SAMEORIGIN"
  Header set X-XSS-Protection "1; mode=block"
</IfModule>

# PHP settings
<IfModule mod_php.c>
  php_flag short_open_tag off
</IfModule>
`;

    return {
      path: '.htaccess',
      content,
      encoding: 'utf-8',
    };
  }

  /**
   * Generate README.md
   */
  private generateReadme(): GeneratedFile {
    const content = `# Kirby CMS Site

This site was generated using Kirby Gen - a CMS-agnostic portfolio generator.

## About

- **CMS**: Kirby CMS ${this.kirbyVersion}
- **PHP Version**: 8.0+
- **Generator**: Kirby Gen

## Installation

1. Install dependencies (if using Composer):
   \`\`\`bash
   composer install
   \`\`\`

2. Set up your web server to point to this directory

3. Visit your site in the browser

4. Access the Kirby Panel at \`/panel\` to set up your admin account

## Directory Structure

- \`/content\` - Content files (.txt format)
- \`/site\` - Site configuration, blueprints, templates, snippets
  - \`/site/blueprints\` - Panel blueprints (YAML)
  - \`/site/templates\` - Page templates (PHP)
  - \`/site/snippets\` - Reusable template parts (PHP)
  - \`/site/config\` - Configuration files
- \`/assets\` - CSS, JavaScript, images
- \`/media\` - Generated thumbnails and processed images
- \`/kirby\` - Kirby core files

## Documentation

- [Kirby Documentation](https://getkirby.com/docs)
- [Kirby Cookbook](https://getkirby.com/docs/cookbook)
- [Kirby Forum](https://forum.getkirby.com)

## License

This project structure is generated. Kirby CMS is licensed separately.
`;

    return {
      path: 'README.md',
      content,
      encoding: 'utf-8',
    };
  }

  /**
   * Generate robots.txt
   */
  private generateRobotsTxt(): GeneratedFile {
    const content = `User-agent: *
Disallow: /panel
Disallow: /site
Disallow: /kirby
Allow: /assets
Allow: /media

Sitemap: /sitemap.xml
`;

    return {
      path: 'robots.txt',
      content,
      encoding: 'utf-8',
    };
  }

  /**
   * Generate index.php
   */
  private generateIndexPHP(): GeneratedFile {
    const content = `<?php

/**
 * Kirby CMS
 * Entry Point
 */

require __DIR__ . '/kirby/bootstrap.php';

echo (new Kirby())->render();
`;

    return {
      path: 'index.php',
      content,
      encoding: 'utf-8',
    };
  }

  /**
   * Generate custom panel CSS
   */
  private generatePanelCSS(): GeneratedFile {
    const content = `/*
 * Kirby Panel Customization
 * Add your custom panel styles here
 */

/* Example: Customize panel colors */
/*
.k-panel {
  --color-accent: #0066ff;
}
*/

/* Example: Custom button styles */
/*
.k-button {
  border-radius: 4px;
}
*/
`;

    return {
      path: 'site/plugins/custom-panel/panel.css',
      content,
      encoding: 'utf-8',
    };
  }

  /**
   * Generate plugin for panel customization
   */
  generatePanelPlugin(): GeneratedFile {
    const content = `<?php

/**
 * Custom Panel Plugin
 * Adds custom panel styles and functionality
 */

Kirby::plugin('custom/panel', [
  'options' => [
    'panel.css' => 'panel.css',
  ],
]);
`;

    return {
      path: 'site/plugins/custom-panel/index.php',
      content,
      encoding: 'utf-8',
    };
  }

  /**
   * Generate composer.json for PHP dependencies
   */
  generateComposerJSON(): GeneratedFile {
    const content = JSON.stringify(
      {
        name: 'kirby-gen/site',
        description: 'Kirby CMS site generated by Kirby Gen',
        type: 'project',
        license: 'MIT',
        require: {
          php: '>=8.0',
          'getkirby/cms': `^${this.kirbyVersion}`,
        },
        config: {
          'optimize-autoloader': true,
        },
      },
      null,
      2
    );

    return {
      path: 'composer.json',
      content,
      encoding: 'utf-8',
    };
  }

  /**
   * Generate package.json for frontend dependencies
   */
  generatePackageJSON(projectName: string): GeneratedFile {
    const content = JSON.stringify(
      {
        name: projectName || 'kirby-site',
        version: '1.0.0',
        description: 'Kirby CMS site',
        scripts: {
          dev: 'php -S localhost:8000',
          build: 'echo "No build step required"',
        },
        keywords: ['kirby', 'cms', 'php'],
        author: '',
        license: 'MIT',
      },
      null,
      2
    );

    return {
      path: 'package.json',
      content,
      encoding: 'utf-8',
    };
  }

  /**
   * Generate directory structure placeholders
   */
  generatePlaceholders(): GeneratedFile[] {
    const placeholderContent = 'This file maintains the directory structure.';

    return [
      {
        path: 'content/.gitkeep',
        content: placeholderContent,
        encoding: 'utf-8',
      },
      {
        path: 'site/accounts/.gitkeep',
        content: placeholderContent,
        encoding: 'utf-8',
      },
      {
        path: 'site/cache/.gitkeep',
        content: placeholderContent,
        encoding: 'utf-8',
      },
      {
        path: 'site/sessions/.gitkeep',
        content: placeholderContent,
        encoding: 'utf-8',
      },
      {
        path: 'media/.gitkeep',
        content: placeholderContent,
        encoding: 'utf-8',
      },
      {
        path: 'assets/js/.gitkeep',
        content: placeholderContent,
        encoding: 'utf-8',
      },
    ];
  }

  /**
   * Get Kirby download information
   */
  getKirbyDownloadInfo(): KirbyVersionConfig {
    // This would normally fetch the latest version info
    // For now, return static configuration
    return {
      version: this.kirbyVersion,
      downloadUrl: `https://github.com/getkirby/kirby/archive/refs/tags/${this.kirbyVersion}.zip`,
    };
  }

  /**
   * Generate post-install instructions
   */
  generatePostInstallInstructions(): string[] {
    return [
      'Installation complete! Next steps:',
      '',
      '1. If using Composer, run: composer install',
      '2. Configure your web server to point to the site directory',
      '3. Ensure the following directories are writable:',
      '   - site/accounts',
      '   - site/cache',
      '   - site/sessions',
      '   - media',
      '4. Visit your site in a web browser',
      '5. Navigate to /panel to set up your admin account',
      '',
      'Documentation: https://getkirby.com/docs',
    ];
  }
}
