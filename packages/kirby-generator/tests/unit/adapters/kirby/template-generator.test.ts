/**
 * Template generator unit tests
 */
import { TemplateGenerator, TemplateGeneratorConfig } from '../../../../src/adapters/kirby/template-generator';
import { EntitySchema, FieldSchema } from '@kirby-gen/shared';

describe('TemplateGenerator', () => {
  let generator: TemplateGenerator;
  let mockEntity: EntitySchema;

  beforeEach(() => {
    generator = new TemplateGenerator();

    mockEntity = {
      id: 'project',
      name: 'Project',
      pluralName: 'Projects',
      description: 'A project entity',
      fields: [
        {
          id: 'title',
          name: 'title',
          label: 'Title',
          type: 'text',
          required: true,
        },
        {
          id: 'description',
          name: 'description',
          label: 'Description',
          type: 'textarea',
          required: false,
        },
      ],
      relationships: [],
      schema: {},
    };
  });

  describe('constructor', () => {
    it('should use default configuration', () => {
      const defaultGenerator = new TemplateGenerator();
      expect(defaultGenerator['config'].useAtomicDesign).toBe(true);
      expect(defaultGenerator['config'].includeComments).toBe(true);
      expect(defaultGenerator['config'].phpVersion).toBe('8.0');
      expect(defaultGenerator['config'].useStrictTypes).toBe(true);
      expect(defaultGenerator['config'].templateEngine).toBe('php');
    });

    it('should accept custom configuration', () => {
      const customConfig: TemplateGeneratorConfig = {
        useAtomicDesign: false,
        includeComments: false,
        phpVersion: '7.4',
        useStrictTypes: false,
      };

      const customGenerator = new TemplateGenerator(customConfig);
      expect(customGenerator['config'].useAtomicDesign).toBe(false);
      expect(customGenerator['config'].includeComments).toBe(false);
      expect(customGenerator['config'].phpVersion).toBe('7.4');
      expect(customGenerator['config'].useStrictTypes).toBe(false);
    });
  });

  describe('generateTemplate', () => {
    it('should generate template for entity', async () => {
      const result = await generator.generateTemplate(mockEntity);

      expect(result.path).toBe('templates/project.php');
      expect(result.type).toBe('page');
      expect(result.content).toContain('<?php');
    });

    it('should include strict types declaration', async () => {
      const result = await generator.generateTemplate(mockEntity);

      expect(result.content).toContain('declare(strict_types=1)');
    });

    it('should not include strict types if disabled', async () => {
      const noStrictGenerator = new TemplateGenerator({ useStrictTypes: false });
      const result = await noStrictGenerator.generateTemplate(mockEntity);

      expect(result.content).not.toContain('declare(strict_types=1)');
      expect(result.content).toContain('<?php');
    });

    it('should include comments', async () => {
      const result = await generator.generateTemplate(mockEntity);

      expect(result.content).toContain('/**');
      expect(result.content).toContain('* Template: Project');
      expect(result.content).toContain('* A project entity');
    });

    it('should not include comments if disabled', async () => {
      const noCommentsGenerator = new TemplateGenerator({ includeComments: false });
      const result = await noCommentsGenerator.generateTemplate(mockEntity);

      expect(result.content).not.toContain('/**');
      expect(result.content).not.toContain('* Template: Project');
    });

    it('should include header and footer snippets', async () => {
      const result = await generator.generateTemplate(mockEntity);

      expect(result.content).toContain("snippet('header')");
      expect(result.content).toContain("snippet('footer')");
    });

    it('should generate field output for all fields', async () => {
      const result = await generator.generateTemplate(mockEntity);

      expect(result.content).toContain('$page->title()');
      expect(result.content).toContain('$page->description()');
    });
  });

  describe('generateFieldOutput', () => {
    it('should generate output for text field', () => {
      const field: FieldSchema = {
        id: 'title',
        name: 'title',
        label: 'Title',
        type: 'text',
        required: true,
      };

      const output = generator['generateFieldOutput'](field);

      expect(output).toContain('$page->title()');
      expect(output).toContain('isNotEmpty()');
    });

    it('should generate output for textarea field', () => {
      const field: FieldSchema = {
        id: 'description',
        name: 'description',
        label: 'Description',
        type: 'textarea',
        required: false,
      };

      const output = generator['generateFieldOutput'](field);

      expect(output).toContain('$page->description()');
      expect(output).toContain('isNotEmpty()');
    });

    it('should generate output for richtext field', () => {
      const field: FieldSchema = {
        id: 'content',
        name: 'content',
        label: 'Content',
        type: 'richtext',
        required: false,
      };

      const output = generator['generateFieldOutput'](field);

      expect(output).toContain('$page->content()->kirbytext()');
    });

    it('should generate output for markdown field', () => {
      const field: FieldSchema = {
        id: 'body',
        name: 'body',
        label: 'Body',
        type: 'markdown',
        required: false,
      };

      const output = generator['generateFieldOutput'](field);

      expect(output).toContain('$page->body()->kirbytext()');
    });

    it('should generate output for blocks field', () => {
      const field: FieldSchema = {
        id: 'layout',
        name: 'layout',
        label: 'Layout',
        type: 'blocks',
        required: false,
      };

      const output = generator['generateFieldOutput'](field);

      expect(output).toContain('$page->layout()->toBlocks()');
    });

    it('should generate output for image field', () => {
      const field: FieldSchema = {
        id: 'cover',
        name: 'cover',
        label: 'Cover',
        type: 'image',
        required: false,
      };

      const output = generator['generateFieldOutput'](field);

      expect(output).toContain('$page->cover()->toFile()');
      expect(output).toContain('$image->url()');
      expect(output).toContain('$image->alt()');
    });

    it('should generate output for gallery field', () => {
      const field: FieldSchema = {
        id: 'images',
        name: 'images',
        label: 'Images',
        type: 'gallery',
        required: false,
      };

      const output = generator['generateFieldOutput'](field);

      expect(output).toContain('$page->images()->toFiles()');
      expect(output).toContain('foreach');
    });

    it('should generate output for structure field', () => {
      const field: FieldSchema = {
        id: 'team',
        name: 'team',
        label: 'Team',
        type: 'structure',
        required: false,
      };

      const output = generator['generateFieldOutput'](field);

      expect(output).toContain('$page->team()->toStructure()');
      expect(output).toContain('foreach');
      expect(output).toContain("snippet('team-item'");
    });

    it('should generate output for relation field', () => {
      const field: FieldSchema = {
        id: 'related',
        name: 'related',
        label: 'Related',
        type: 'relation',
        required: false,
      };

      const output = generator['generateFieldOutput'](field);

      expect(output).toContain('$page->related()->toPages()');
      expect(output).toContain("snippet('card'");
    });
  });

  describe('generateSnippets', () => {
    it('should generate all required snippets', async () => {
      const snippets = await generator.generateSnippets();

      expect(snippets).toHaveLength(4);
      expect(snippets.map((s) => s.path)).toEqual([
        'snippets/header.php',
        'snippets/footer.php',
        'snippets/page-header.php',
        'snippets/card.php',
      ]);
    });

    it('should mark all snippets with correct type', async () => {
      const snippets = await generator.generateSnippets();

      snippets.forEach((snippet) => {
        expect(snippet.type).toBe('snippet');
      });
    });
  });

  describe('generateHeaderSnippet', () => {
    it('should generate HTML5 doctype', () => {
      const header = generator['generateHeaderSnippet']();

      expect(header).toContain('<!DOCTYPE html>');
      expect(header).toContain('<html lang="en">');
    });

    it('should include meta tags', () => {
      const header = generator['generateHeaderSnippet']();

      expect(header).toContain('charset="UTF-8"');
      expect(header).toContain('viewport');
    });

    it('should include CSS links', () => {
      const header = generator['generateHeaderSnippet']();

      expect(header).toContain("css('assets/css/main.css')");
      expect(header).toContain("css('assets/css/theme.css')");
    });

    it('should include navigation', () => {
      const header = generator['generateHeaderSnippet']();

      expect(header).toContain('<nav');
      expect(header).toContain('$site->children()->listed()');
    });
  });

  describe('generateFooterSnippet', () => {
    it('should close HTML tags', () => {
      const footer = generator['generateFooterSnippet']();

      expect(footer).toContain('</footer>');
      expect(footer).toContain('</body>');
      expect(footer).toContain('</html>');
    });

    it('should include JavaScript', () => {
      const footer = generator['generateFooterSnippet']();

      expect(footer).toContain("js('assets/js/main.js')");
    });

    it('should include copyright notice', () => {
      const footer = generator['generateFooterSnippet']();

      expect(footer).toContain('&copy;');
      expect(footer).toContain("date('Y')");
    });
  });

  describe('generatePageHeaderSnippet', () => {
    it('should include page title', () => {
      const pageHeader = generator['generatePageHeaderSnippet']();

      expect(pageHeader).toContain('<h1');
      expect(pageHeader).toContain('$page->title()');
    });

    it('should include optional subtitle', () => {
      const pageHeader = generator['generatePageHeaderSnippet']();

      expect(pageHeader).toContain('$page->subtitle()');
      expect(pageHeader).toContain('isNotEmpty()');
    });
  });

  describe('generateCardSnippet', () => {
    it('should include card structure', () => {
      const card = generator['generateCardSnippet']();

      expect(card).toContain('<article class="card">');
      expect(card).toContain('$page->title()');
      expect(card).toContain('$page->url()');
    });

    it('should include optional image', () => {
      const card = generator['generateCardSnippet']();

      expect(card).toContain('$page->image()');
    });

    it('should include optional excerpt', () => {
      const card = generator['generateCardSnippet']();

      expect(card).toContain('$page->excerpt()');
    });
  });

  describe('generateDefaultTemplate', () => {
    it('should generate default template', () => {
      const result = generator.generateDefaultTemplate();

      expect(result.path).toBe('templates/default.php');
      expect(result.type).toBe('page');
      expect(result.content).toContain('Template: Default');
    });

    it('should use kirbytext for content', () => {
      const result = generator.generateDefaultTemplate();

      expect(result.content).toContain('$page->text()->kirbytext()');
    });
  });

  describe('generateHomeTemplate', () => {
    it('should generate home template', () => {
      const result = generator.generateHomeTemplate();

      expect(result.path).toBe('templates/home.php');
      expect(result.type).toBe('page');
      expect(result.content).toContain('Template: Home');
    });

    it('should include hero section', () => {
      const result = generator.generateHomeTemplate();

      expect(result.content).toContain('<section class="hero">');
    });

    it('should include featured section', () => {
      const result = generator.generateHomeTemplate();

      expect(result.content).toContain('$page->children()->listed()->limit(6)');
      expect(result.content).toContain('<section class="featured">');
    });
  });

  describe('generateAllTemplates', () => {
    it('should generate templates for all entities', async () => {
      const entities: EntitySchema[] = [
        mockEntity,
        {
          id: 'category',
          name: 'Category',
          pluralName: 'Categories',
          description: 'A category',
          fields: [],
          relationships: [],
          schema: {},
        },
      ];

      const templates = await generator.generateAllTemplates(entities);

      expect(templates.length).toBeGreaterThan(2); // entities + default + home + snippets
      expect(templates.map((t) => t.path)).toContain('templates/project.php');
      expect(templates.map((t) => t.path)).toContain('templates/category.php');
      expect(templates.map((t) => t.path)).toContain('templates/default.php');
      expect(templates.map((t) => t.path)).toContain('templates/home.php');
    });

    it('should include all snippets', async () => {
      const templates = await generator.generateAllTemplates([mockEntity]);

      const snippetPaths = templates.filter((t) => t.type === 'snippet').map((t) => t.path);
      expect(snippetPaths).toContain('snippets/header.php');
      expect(snippetPaths).toContain('snippets/footer.php');
      expect(snippetPaths).toContain('snippets/page-header.php');
      expect(snippetPaths).toContain('snippets/card.php');
    });
  });

  describe('entityToTemplate', () => {
    it('should convert entity ID to template name', () => {
      const templateName = generator['entityToTemplate']('ProjectPage');
      expect(templateName).toBe('projectpage');
    });

    it('should handle special characters', () => {
      const templateName = generator['entityToTemplate']('Project-Page_Item');
      expect(templateName).toBe('project-page-item');
    });

    it('should convert to lowercase', () => {
      const templateName = generator['entityToTemplate']('UPPERCASE');
      expect(templateName).toBe('uppercase');
    });
  });

  describe('complex field types', () => {
    it('should handle entity with multiple complex fields', async () => {
      const complexEntity: EntitySchema = {
        id: 'portfolio',
        name: 'Portfolio',
        pluralName: 'Portfolios',
        description: 'Portfolio with various field types',
        fields: [
          { id: 'title', name: 'title', label: 'Title', type: 'text', required: true },
          { id: 'content', name: 'content', label: 'Content', type: 'richtext', required: false },
          { id: 'images', name: 'images', label: 'Images', type: 'gallery', required: false },
          { id: 'team', name: 'team', label: 'Team', type: 'structure', required: false },
          { id: 'related', name: 'related', label: 'Related', type: 'relation', required: false },
        ],
        relationships: [],
        schema: {},
      };

      const result = await generator.generateTemplate(complexEntity);

      expect(result.content).toContain('$page->title()');
      expect(result.content).toContain('$page->content()->kirbytext()');
      expect(result.content).toContain('$page->images()->toFiles()');
      expect(result.content).toContain('$page->team()->toStructure()');
      expect(result.content).toContain('$page->related()->toPages()');
    });
  });

  describe('integration', () => {
    it('should generate complete template set', async () => {
      const entities: EntitySchema[] = [mockEntity];
      const templates = await generator.generateAllTemplates(entities);

      // Verify we have everything needed for a functional Kirby site
      const paths = templates.map((t) => t.path);

      // Page templates
      expect(paths).toContain('templates/project.php');
      expect(paths).toContain('templates/default.php');
      expect(paths).toContain('templates/home.php');

      // Snippets
      expect(paths).toContain('snippets/header.php');
      expect(paths).toContain('snippets/footer.php');
      expect(paths).toContain('snippets/page-header.php');
      expect(paths).toContain('snippets/card.php');
    });
  });
});
