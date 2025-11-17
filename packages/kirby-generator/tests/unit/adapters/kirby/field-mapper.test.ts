/**
 * Field Mapper Tests
 */

import { FieldMapper } from '../../../../src/adapters/kirby/field-mapper';
import { FieldSchema } from '@kirby-gen/shared';

describe('FieldMapper', () => {
  let mapper: FieldMapper;

  beforeEach(() => {
    mapper = new FieldMapper();
  });

  describe('mapField', () => {
    it('should map text field correctly', () => {
      const field: FieldSchema = {
        id: 'title',
        name: 'title',
        label: 'Title',
        type: 'text',
        required: true,
      };

      const result = mapper.mapField(field);

      expect(result.type).toBe('text');
      expect(result.label).toBe('Title');
      expect(result.required).toBe(true);
    });

    it('should map textarea field correctly', () => {
      const field: FieldSchema = {
        id: 'description',
        name: 'description',
        label: 'Description',
        type: 'textarea',
        required: false,
        options: {
          maxLength: 500,
        },
      };

      const result = mapper.mapField(field);

      expect(result.type).toBe('textarea');
      expect(result.maxlength).toBe(500);
    });

    it('should map richtext to writer field', () => {
      const field: FieldSchema = {
        id: 'content',
        name: 'content',
        label: 'Content',
        type: 'richtext',
        required: false,
      };

      const result = mapper.mapField(field);

      expect(result.type).toBe('writer');
    });

    it('should map boolean to toggle field', () => {
      const field: FieldSchema = {
        id: 'featured',
        name: 'featured',
        label: 'Featured',
        type: 'boolean',
        required: false,
      };

      const result = mapper.mapField(field);

      expect(result.type).toBe('toggle');
    });

    it('should map select field with choices', () => {
      const field: FieldSchema = {
        id: 'status',
        name: 'status',
        label: 'Status',
        type: 'select',
        required: true,
        options: {
          choices: [
            { value: 'draft', label: 'Draft' },
            { value: 'published', label: 'Published' },
          ],
        },
      };

      const result = mapper.mapField(field);

      expect(result.type).toBe('select');
      expect(result.options).toEqual({
        draft: 'Draft',
        published: 'Published',
      });
    });

    it('should map image field correctly', () => {
      const field: FieldSchema = {
        id: 'cover',
        name: 'cover',
        label: 'Cover Image',
        type: 'image',
        required: false,
        options: {
          accept: ['image/jpeg', 'image/png'],
          maxSize: 2097152, // 2MB
        },
      };

      const result = mapper.mapField(field);

      expect(result.type).toBe('files');
      expect(result.max).toBe(1);
      expect(result.accept).toBe('image/jpeg,image/png');
      expect(result.max_size).toBe(2048); // KB
    });

    it('should map structure field with nested fields', () => {
      const field: FieldSchema = {
        id: 'team',
        name: 'team',
        label: 'Team Members',
        type: 'structure',
        required: false,
        options: {
          fields: [
            {
              id: 'name',
              name: 'name',
              label: 'Name',
              type: 'text',
              required: true,
            },
            {
              id: 'role',
              name: 'role',
              label: 'Role',
              type: 'text',
              required: true,
            },
          ],
        },
      };

      const result = mapper.mapField(field);

      expect(result.type).toBe('structure');
      expect(result.fields).toBeDefined();
      expect(result.fields!.name).toBeDefined();
      expect(result.fields!.role).toBeDefined();
    });

    it('should apply width mapping', () => {
      const field: FieldSchema = {
        id: 'test',
        name: 'test',
        label: 'Test',
        type: 'text',
        required: false,
        width: 'half',
      };

      const result = mapper.mapField(field);

      expect(result.width).toBe('1/2');
    });

    it('should include help text and placeholder', () => {
      const field: FieldSchema = {
        id: 'email',
        name: 'email',
        label: 'Email',
        type: 'email',
        required: true,
        helpText: 'Enter your email address',
        placeholder: 'you@example.com',
      };

      const result = mapper.mapField(field);

      expect(result.help).toBe('Enter your email address');
      expect(result.placeholder).toBe('you@example.com');
    });
  });

  describe('getFieldWarnings', () => {
    it('should warn about location fields', () => {
      const field: FieldSchema = {
        id: 'location',
        name: 'location',
        label: 'Location',
        type: 'location',
        required: false,
      };

      const warnings = mapper.getFieldWarnings(field);

      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings[0]).toContain('custom');
    });

    it('should warn about unique validation', () => {
      const field: FieldSchema = {
        id: 'slug',
        name: 'slug',
        label: 'Slug',
        type: 'text',
        required: true,
        validation: {
          unique: true,
        },
      };

      const warnings = mapper.getFieldWarnings(field);

      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings[0]).toContain('Unique');
    });
  });

  describe('isSupported', () => {
    it('should support all field types', () => {
      const types = ['text', 'textarea', 'richtext', 'boolean', 'select', 'image'];

      types.forEach((type) => {
        expect(mapper.isSupported(type as any)).toBe(true);
      });
    });
  });
});
