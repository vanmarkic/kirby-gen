/**
 * Content Generator Tests
 */

import { ContentGenerator } from '../../../../src/adapters/kirby/content-generator';
import { ContentItem, EntitySchema } from '@kirby-gen/shared';

describe('ContentGenerator', () => {
  let generator: ContentGenerator;

  beforeEach(() => {
    generator = new ContentGenerator();
  });

  describe('generateContentFile', () => {
    it('should generate basic content file', () => {
      const entity: EntitySchema = {
        id: 'project',
        name: 'Project',
        pluralName: 'Projects',
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
      };

      const item: ContentItem = {
        id: '1',
        entityType: 'project',
        fields: {
          title: 'My Project',
          description: 'A great project',
        },
        metadata: {
          slug: 'my-project',
          status: 'published',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-02'),
        },
      };

      const result = generator.generateContentFile(item, entity);

      expect(result.content).toContain('Title: My Project');
      expect(result.content).toContain('Description: A great project');
      expect(result.metadata.slug).toBe('my-project');
      expect(result.metadata.status).toBe('listed');
    });

    it('should handle multiline fields', () => {
      const entity: EntitySchema = {
        id: 'post',
        name: 'Post',
        pluralName: 'Posts',
        fields: [
          {
            id: 'content',
            name: 'content',
            label: 'Content',
            type: 'markdown',
            required: false,
          },
        ],
      };

      const item: ContentItem = {
        id: '1',
        entityType: 'post',
        fields: {
          content: 'Line 1\nLine 2\nLine 3',
        },
        metadata: {
          status: 'published',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
      };

      const result = generator.generateContentFile(item, entity);

      expect(result.content).toContain('Content:\n\nLine 1\nLine 2\nLine 3');
    });

    it('should serialize boolean fields', () => {
      const entity: EntitySchema = {
        id: 'project',
        name: 'Project',
        pluralName: 'Projects',
        fields: [
          {
            id: 'featured',
            name: 'featured',
            label: 'Featured',
            type: 'boolean',
            required: false,
          },
        ],
      };

      const item: ContentItem = {
        id: '1',
        entityType: 'project',
        fields: {
          featured: true,
        },
        metadata: {
          status: 'published',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      const result = generator.generateContentFile(item, entity);

      expect(result.content).toContain('Featured: true');
    });

    it('should serialize array fields', () => {
      const entity: EntitySchema = {
        id: 'project',
        name: 'Project',
        pluralName: 'Projects',
        fields: [
          {
            id: 'tags',
            name: 'tags',
            label: 'Tags',
            type: 'tags',
            required: false,
          },
        ],
      };

      const item: ContentItem = {
        id: '1',
        entityType: 'project',
        fields: {
          tags: ['web', 'design', 'development'],
        },
        metadata: {
          status: 'published',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      const result = generator.generateContentFile(item, entity);

      expect(result.content).toContain('Tags: web, design, development');
    });

    it('should serialize structure fields', () => {
      const entity: EntitySchema = {
        id: 'project',
        name: 'Project',
        pluralName: 'Projects',
        fields: [
          {
            id: 'team',
            name: 'team',
            label: 'Team',
            type: 'structure',
            required: false,
          },
        ],
      };

      const item: ContentItem = {
        id: '1',
        entityType: 'project',
        fields: {
          team: [
            { name: 'John Doe', role: 'Developer' },
            { name: 'Jane Smith', role: 'Designer' },
          ],
        },
        metadata: {
          status: 'published',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      const result = generator.generateContentFile(item, entity);

      expect(result.content).toContain('Team:');
      expect(result.content).toContain('- ');
      expect(result.content).toContain('name: John Doe');
      expect(result.content).toContain('role: Developer');
    });

    it('should generate slug from title if not provided', () => {
      const entity: EntitySchema = {
        id: 'project',
        name: 'Project',
        pluralName: 'Projects',
        fields: [
          {
            id: 'title',
            name: 'title',
            label: 'Title',
            type: 'text',
            required: true,
          },
        ],
      };

      const item: ContentItem = {
        id: '1',
        entityType: 'project',
        fields: {
          title: 'My Amazing Project',
        },
        metadata: {
          status: 'published',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      const result = generator.generateContentFile(item, entity);

      expect(result.metadata.slug).toBe('my-amazing-project');
    });

    it('should map draft status correctly', () => {
      const entity: EntitySchema = {
        id: 'project',
        name: 'Project',
        pluralName: 'Projects',
        fields: [],
      };

      const item: ContentItem = {
        id: '1',
        entityType: 'project',
        fields: {},
        metadata: {
          status: 'draft',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      const result = generator.generateContentFile(item, entity);

      expect(result.metadata.status).toBe('draft');
    });
  });

  describe('generateContentFiles', () => {
    it('should generate multiple content files', () => {
      const entity: EntitySchema = {
        id: 'project',
        name: 'Project',
        pluralName: 'Projects',
        fields: [
          {
            id: 'title',
            name: 'title',
            label: 'Title',
            type: 'text',
            required: true,
          },
        ],
      };

      const items: ContentItem[] = [
        {
          id: '1',
          entityType: 'project',
          fields: { title: 'Project 1' },
          metadata: {
            status: 'published',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
        {
          id: '2',
          entityType: 'project',
          fields: { title: 'Project 2' },
          metadata: {
            status: 'published',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
      ];

      const results = generator.generateContentFiles(items, entity);

      expect(results.length).toBe(2);
      expect(results[0].content).toContain('Project 1');
      expect(results[1].content).toContain('Project 2');
    });
  });
});
