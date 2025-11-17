/**
 * Site scaffolder unit tests
 */
import { SiteScaffolder, ScaffoldConfig } from '../../../../src/adapters/kirby/site-scaffolder';

describe('SiteScaffolder', () => {
  let scaffolder: SiteScaffolder;

  beforeEach(() => {
    scaffolder = new SiteScaffolder();
  });

  describe('constructor', () => {
    it('should use default configuration', () => {
      const defaultScaffolder = new SiteScaffolder();
      expect(defaultScaffolder['config'].installKirby).toBe(true);
      expect(defaultScaffolder['config'].kirbyVersion).toBe('4.0.0');
      expect(defaultScaffolder['config'].createGitignore).toBe(true);
      expect(defaultScaffolder['config'].createHtaccess).toBe(true);
      expect(defaultScaffolder['config'].createReadme).toBe(true);
      expect(defaultScaffolder['config'].setupPanel).toBe(true);
      expect(defaultScaffolder['config'].debugMode).toBe(false);
    });

    it('should accept custom configuration', () => {
      const customConfig: ScaffoldConfig = {
        installKirby: false,
        kirbyVersion: '3.9.0',
        createGitignore: false,
        debugMode: true,
      };

      const customScaffolder = new SiteScaffolder(customConfig);
      expect(customScaffolder['config'].installKirby).toBe(false);
      expect(customScaffolder['config'].kirbyVersion).toBe('3.9.0');
      expect(customScaffolder['config'].createGitignore).toBe(false);
      expect(customScaffolder['config'].debugMode).toBe(true);
    });
  });

  describe('generateSiteStructure', () => {
    it('should generate all site structure files', () => {
      const files = scaffolder.generateSiteStructure();

      expect(files).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: 'site/config/config.php',
          }),
          expect.objectContaining({
            path: '.gitignore',
          }),
          expect.objectContaining({
            path: '.htaccess',
          }),
          expect.objectContaining({
            path: 'README.md',
          }),
          expect.objectContaining({
            path: 'robots.txt',
          }),
          expect.objectContaining({
            path: 'index.php',
          }),
          expect.objectContaining({
            path: 'site/plugins/custom-panel/panel.css',
          }),
        ])
      );
    });

    it('should skip gitignore if disabled', () => {
      const customScaffolder = new SiteScaffolder({ createGitignore: false });
      const files = customScaffolder.generateSiteStructure();

      const gitignoreFile = files.find((f) => f.path === '.gitignore');
      expect(gitignoreFile).toBeUndefined();
    });

    it('should skip htaccess if disabled', () => {
      const customScaffolder = new SiteScaffolder({ createHtaccess: false });
      const files = customScaffolder.generateSiteStructure();

      const htaccessFile = files.find((f) => f.path === '.htaccess');
      expect(htaccessFile).toBeUndefined();
    });

    it('should skip README if disabled', () => {
      const customScaffolder = new SiteScaffolder({ createReadme: false });
      const files = customScaffolder.generateSiteStructure();

      const readmeFile = files.find((f) => f.path === 'README.md');
      expect(readmeFile).toBeUndefined();
    });

    it('should skip panel CSS if disabled', () => {
      const customScaffolder = new SiteScaffolder({ setupPanel: false });
      const files = customScaffolder.generateSiteStructure();

      const panelCssFile = files.find((f) => f.path === 'site/plugins/custom-panel/panel.css');
      expect(panelCssFile).toBeUndefined();
    });
  });

  describe('generateConfig', () => {
    it('should generate config with debug mode disabled by default', () => {
      const config = scaffolder['generateConfig']();

      expect(config.content).toContain("'debug' => false");
    });

    it('should generate config with debug mode enabled', () => {
      const debugScaffolder = new SiteScaffolder({ debugMode: true });
      const config = debugScaffolder['generateConfig']();

      expect(config.content).toContain("'debug' => true");
    });

    it('should include panel configuration', () => {
      const config = scaffolder['generateConfig']();

      expect(config.content).toContain("'panel' => [");
      expect(config.content).toContain("'install' => true");
    });

    it('should include cache configuration', () => {
      const config = scaffolder['generateConfig']();

      expect(config.content).toContain("'cache' => [");
      expect(config.content).toContain("'active' => true");
    });

    it('should include thumbs configuration', () => {
      const config = scaffolder['generateConfig']();

      expect(config.content).toContain("'thumbs' => [");
      expect(config.content).toContain("'quality' => 80");
      expect(config.content).toContain("'presets' => [");
    });
  });

  describe('generateGitignore', () => {
    it('should generate proper gitignore content', () => {
      const gitignore = scaffolder['generateGitignore']();

      expect(gitignore.path).toBe('.gitignore');
      expect(gitignore.content).toContain('/site/accounts/*');
      expect(gitignore.content).toContain('/site/cache/*');
      expect(gitignore.content).toContain('node_modules/');
      expect(gitignore.content).toContain('.DS_Store');
      expect(gitignore.content).toContain('.env');
    });
  });

  describe('generateHtaccess', () => {
    it('should generate proper htaccess content', () => {
      const htaccess = scaffolder['generateHtaccess']();

      expect(htaccess.path).toBe('.htaccess');
      expect(htaccess.content).toContain('RewriteEngine On');
      expect(htaccess.content).toContain('RewriteRule');
      expect(htaccess.content).toContain('X-Content-Type-Options');
    });
  });

  describe('generateReadme', () => {
    it('should generate README with Kirby version', () => {
      const readme = scaffolder['generateReadme']();

      expect(readme.path).toBe('README.md');
      expect(readme.content).toContain('Kirby CMS 4.0.0');
      expect(readme.content).toContain('Kirby Gen');
    });

    it('should include installation instructions', () => {
      const readme = scaffolder['generateReadme']();

      expect(readme.content).toContain('## Installation');
      expect(readme.content).toContain('composer install');
    });

    it('should include directory structure documentation', () => {
      const readme = scaffolder['generateReadme']();

      expect(readme.content).toContain('## Directory Structure');
      expect(readme.content).toContain('/content');
      expect(readme.content).toContain('/site/blueprints');
    });
  });

  describe('generateRobotsTxt', () => {
    it('should generate robots.txt with proper content', () => {
      const robots = scaffolder['generateRobotsTxt']();

      expect(robots.path).toBe('robots.txt');
      expect(robots.content).toContain('User-agent: *');
      expect(robots.content).toContain('Disallow: /panel');
      expect(robots.content).toContain('Allow: /assets');
      expect(robots.content).toContain('Sitemap: /sitemap.xml');
    });
  });

  describe('generateIndexPHP', () => {
    it('should generate proper index.php', () => {
      const index = scaffolder['generateIndexPHP']();

      expect(index.path).toBe('index.php');
      expect(index.content).toContain('<?php');
      expect(index.content).toContain("require __DIR__ . '/kirby/bootstrap.php'");
      expect(index.content).toContain('(new Kirby())->render()');
    });
  });

  describe('generatePanelCSS', () => {
    it('should generate panel CSS file', () => {
      const css = scaffolder['generatePanelCSS']();

      expect(css.path).toBe('site/plugins/custom-panel/panel.css');
      expect(css.content).toContain('Kirby Panel Customization');
    });
  });

  describe('generatePanelPlugin', () => {
    it('should generate panel plugin file', () => {
      const plugin = scaffolder.generatePanelPlugin();

      expect(plugin.path).toBe('site/plugins/custom-panel/index.php');
      expect(plugin.content).toContain('<?php');
      expect(plugin.content).toContain("Kirby::plugin('custom/panel'");
    });
  });

  describe('generateComposerJSON', () => {
    it('should generate composer.json with Kirby dependency', () => {
      const composer = scaffolder.generateComposerJSON();

      expect(composer.path).toBe('composer.json');
      const content = JSON.parse(composer.content);
      expect(content.require.php).toBe('>=8.0');
      expect(content.require['getkirby/cms']).toBe('^4.0.0');
    });

    it('should use custom Kirby version', () => {
      const customScaffolder = new SiteScaffolder({ kirbyVersion: '3.9.0' });
      const composer = customScaffolder.generateComposerJSON();

      const content = JSON.parse(composer.content);
      expect(content.require['getkirby/cms']).toBe('^3.9.0');
    });
  });

  describe('generatePackageJSON', () => {
    it('should generate package.json with project name', () => {
      const packageJson = scaffolder.generatePackageJSON('my-portfolio');

      expect(packageJson.path).toBe('package.json');
      const content = JSON.parse(packageJson.content);
      expect(content.name).toBe('my-portfolio');
      expect(content.scripts.dev).toBe('php -S localhost:8000');
    });

    it('should use default name if not provided', () => {
      const packageJson = scaffolder.generatePackageJSON('');

      const content = JSON.parse(packageJson.content);
      expect(content.name).toBe('kirby-site');
    });
  });

  describe('generatePlaceholders', () => {
    it('should generate placeholder files for directories', () => {
      const placeholders = scaffolder.generatePlaceholders();

      expect(placeholders).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: 'content/.gitkeep',
          }),
          expect.objectContaining({
            path: 'site/accounts/.gitkeep',
          }),
          expect.objectContaining({
            path: 'site/cache/.gitkeep',
          }),
          expect.objectContaining({
            path: 'media/.gitkeep',
          }),
        ])
      );
    });

    it('should have consistent placeholder content', () => {
      const placeholders = scaffolder.generatePlaceholders();

      placeholders.forEach((file) => {
        expect(file.content).toBe('This file maintains the directory structure.');
        expect(file.encoding).toBe('utf-8');
      });
    });
  });

  describe('getKirbyDownloadInfo', () => {
    it('should return download info for configured version', () => {
      const info = scaffolder.getKirbyDownloadInfo();

      expect(info.version).toBe('4.0.0');
      expect(info.downloadUrl).toContain('4.0.0');
      expect(info.downloadUrl).toContain('github.com/getkirby/kirby');
    });

    it('should return download info for custom version', () => {
      const customScaffolder = new SiteScaffolder({ kirbyVersion: '3.8.0' });
      const info = customScaffolder.getKirbyDownloadInfo();

      expect(info.version).toBe('3.8.0');
      expect(info.downloadUrl).toContain('3.8.0');
    });
  });

  describe('generatePostInstallInstructions', () => {
    it('should return array of instructions', () => {
      const instructions = scaffolder.generatePostInstallInstructions();

      expect(Array.isArray(instructions)).toBe(true);
      expect(instructions.length).toBeGreaterThan(0);
      expect(instructions[0]).toBe('Installation complete! Next steps:');
    });

    it('should include composer instructions', () => {
      const instructions = scaffolder.generatePostInstallInstructions();
      const composerInstruction = instructions.find((i) => i.includes('composer install'));

      expect(composerInstruction).toBeDefined();
    });

    it('should include writable directories information', () => {
      const instructions = scaffolder.generatePostInstallInstructions();
      const writableInfo = instructions.join('\n');

      expect(writableInfo).toContain('site/accounts');
      expect(writableInfo).toContain('site/cache');
      expect(writableInfo).toContain('site/sessions');
    });

    it('should include documentation link', () => {
      const instructions = scaffolder.generatePostInstallInstructions();
      const docLink = instructions.find((i) => i.includes('getkirby.com/docs'));

      expect(docLink).toBeDefined();
    });
  });

  describe('encoding', () => {
    it('should set utf-8 encoding for all files', () => {
      const files = scaffolder.generateSiteStructure();

      files.forEach((file) => {
        expect(file.encoding).toBe('utf-8');
      });
    });
  });

  describe('integration', () => {
    it('should generate complete site structure in one call', () => {
      const siteFiles = scaffolder.generateSiteStructure();
      const composerJson = scaffolder.generateComposerJSON();
      const packageJson = scaffolder.generatePackageJSON('test-site');
      const placeholders = scaffolder.generatePlaceholders();
      const panelPlugin = scaffolder.generatePanelPlugin();

      const allFiles = [
        ...siteFiles,
        composerJson,
        packageJson,
        ...placeholders,
        panelPlugin,
      ];

      // Verify we have all necessary files for a complete Kirby site
      const paths = allFiles.map((f) => f.path);
      expect(paths).toContain('site/config/config.php');
      expect(paths).toContain('index.php');
      expect(paths).toContain('composer.json');
      expect(paths).toContain('package.json');
      expect(paths).toContain('.gitignore');
    });
  });
});
