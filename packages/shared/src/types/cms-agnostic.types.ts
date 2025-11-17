/**
 * CMS-Agnostic Types
 * These types are independent of any specific CMS (Kirby, Strapi, Contentful, etc.)
 * The generic content model can be converted to any CMS format via adapters
 */

/**
 * Generic Content Schema
 * Defines the structure of content without CMS-specific implementation details
 */
export interface ContentSchema {
  version: string; // Schema version for migration support
  entities: EntitySchema[];
  relationships: RelationshipSchema[];
  metadata: SchemaMetadata;
}

export interface SchemaMetadata {
  name: string;
  description?: string;
  author?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Entity Schema (CMS-agnostic)
 * Describes a content type without implementation details
 */
export interface EntitySchema {
  id: string;
  name: string;
  pluralName: string;
  description?: string;
  fields: FieldSchema[];

  // Display hints (not CMS-specific)
  displayField?: string; // Which field to use as title/label
  icon?: string; // Icon identifier (generic, not CMS-specific)
  color?: string; // Hex color for visual distinction

  // Behavior hints
  sortable?: boolean;
  timestamps?: boolean; // Auto-create createdAt/updatedAt
  slugSource?: string; // Which field to generate slug from
}

/**
 * Field Schema (CMS-agnostic)
 * Describes a field without implementation details
 */
export interface FieldSchema {
  id: string;
  name: string;
  label: string;
  type: GenericFieldType;
  required: boolean;

  // Configuration (generic)
  options?: FieldOptions;
  validation?: FieldValidationRules;

  // Display hints
  helpText?: string;
  placeholder?: string;
  width?: 'full' | 'half' | 'third' | 'quarter';
}

/**
 * Generic Field Types
 * Maps to common field types across all CMS platforms
 */
export type GenericFieldType =
  // Text types
  | 'text'           // Single line text
  | 'textarea'       // Multi-line text
  | 'richtext'       // WYSIWYG editor
  | 'markdown'       // Markdown editor
  | 'code'           // Code editor

  // Number types
  | 'number'         // Integer or float
  | 'range'          // Number with slider

  // Choice types
  | 'boolean'        // True/false toggle
  | 'select'         // Single selection
  | 'multiselect'    // Multiple selections
  | 'radio'          // Radio buttons
  | 'checkbox'       // Checkboxes

  // Date/Time types
  | 'date'           // Date picker
  | 'time'           // Time picker
  | 'datetime'       // Date and time picker

  // Media types
  | 'image'          // Single image
  | 'file'           // Single file
  | 'gallery'        // Multiple images
  | 'files'          // Multiple files

  // Structured types
  | 'json'           // JSON object
  | 'list'           // Array of simple values
  | 'structure'      // Repeatable structured data
  | 'blocks'         // Block editor (modular content)

  // Relational types
  | 'relation'       // Reference to other entity
  | 'relations'      // References to multiple entities

  // Special types
  | 'url'            // URL with validation
  | 'email'          // Email with validation
  | 'tel'            // Phone number
  | 'color'          // Color picker
  | 'location'       // Geographic location
  | 'tags';          // Tag input

export interface FieldOptions {
  // Text options
  minLength?: number;
  maxLength?: number;
  pattern?: string; // Regex pattern

  // Number options
  min?: number;
  max?: number;
  step?: number;

  // Choice options
  choices?: FieldChoice[];
  allowCustom?: boolean;

  // Media options
  accept?: string[]; // MIME types or extensions
  maxSize?: number; // Bytes
  maxFiles?: number;

  // Structure options
  fields?: FieldSchema[]; // For nested structures
  maxItems?: number;

  // Relation options
  targetEntity?: string; // Entity ID to relate to
  multiple?: boolean;

  // Rich text options
  allowedBlocks?: string[];
  allowedFormats?: string[];

  // Generic options
  defaultValue?: any;
  readonly?: boolean;
}

export interface FieldChoice {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface FieldValidationRules {
  required?: boolean;
  unique?: boolean;
  min?: number;
  max?: number;
  pattern?: string;
  custom?: ValidationRule[];
}

export interface ValidationRule {
  type: string;
  message: string;
  params?: Record<string, any>;
}

/**
 * Relationship Schema (CMS-agnostic)
 */
export interface RelationshipSchema {
  id: string;
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
  from: string; // Entity ID
  to: string; // Entity ID
  label: string;
  inversLabel?: string;

  // Behavior
  required?: boolean;
  cascadeDelete?: boolean;
}

/**
 * Structured Content (CMS-agnostic)
 * The actual content data in a generic format
 */
export interface StructuredContentCollection {
  schema: ContentSchema;
  content: Record<string, ContentItem[]>; // entityId -> items
  metadata: ContentMetadata;
}

export interface ContentItem {
  id: string;
  entityType: string; // Reference to EntitySchema.id
  fields: Record<string, any>; // field.name -> value
  metadata: ItemMetadata;
}

export interface ItemMetadata {
  slug?: string;
  status: 'draft' | 'published' | 'archived';
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
  author?: string;
  source?: ContentSource;
}

export interface ContentSource {
  type: 'upload' | 'migration' | 'manual' | 'api';
  reference?: string; // Original file path, API endpoint, etc.
  originalFormat?: string;
}

export interface ContentMetadata {
  generatedAt: Date;
  generator: string;
  version: string;
}

/**
 * Design System (CMS-agnostic)
 * Design tokens and theme configuration independent of CMS
 */
export interface DesignSystemSchema {
  version: string;
  tokens: DesignTokenCollection;
  typography: TypographySystem;
  spacing: SpacingSystem;
  colors: ColorSystem;
  breakpoints: BreakpointSystem;
  components?: ComponentTheme[];
}

export interface DesignTokenCollection {
  colors: Record<string, string>;
  fonts: Record<string, FontToken>;
  spacing: Record<string, string | number>;
  shadows: Record<string, string>;
  borders: Record<string, string>;
  radii: Record<string, string | number>;
  zIndex: Record<string, number>;
  transitions: Record<string, string>;
  custom?: Record<string, any>;
}

export interface FontToken {
  family: string;
  weights: number[];
  lineHeight?: number;
  letterSpacing?: string;
  source: 'google' | 'custom' | 'system';
  url?: string;
}

export interface TypographySystem {
  baseFontSize: number;
  scale: number;
  headingFont: string;
  bodyFont: string;
  monoFont?: string;
  styles: Record<string, TypographyStyle>;
}

export interface TypographyStyle {
  fontSize: string | number;
  fontWeight: number;
  lineHeight: number;
  letterSpacing?: string;
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
}

export interface SpacingSystem {
  baseUnit: number;
  scale: number[];
}

export interface ColorSystem {
  primary: ColorScale;
  secondary?: ColorScale;
  accent?: ColorScale;
  neutral: ColorScale;
  semantic: SemanticColors;
}

export interface ColorScale {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string; // Base color
  600: string;
  700: string;
  800: string;
  900: string;
}

export interface SemanticColors {
  success: string;
  warning: string;
  error: string;
  info: string;
}

export interface BreakpointSystem {
  xs?: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl?: number;
}

export interface ComponentTheme {
  component: string;
  variants?: Record<string, any>;
  defaultProps?: Record<string, any>;
}
