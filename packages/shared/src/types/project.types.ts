/**
 * Project data model
 * Represents the complete state of a portfolio generation project
 */
export interface ProjectData {
  id: string;
  createdAt: Date;
  updatedAt: Date;

  // Input phase
  inputs: ProjectInputs;

  // Domain mapping phase
  domainModel?: DomainModel;

  // Content structuring phase
  structuredContent?: StructuredContent;

  // Design phase
  designSystem?: DesignSystem;

  // Blueprint phase
  blueprints?: Blueprints;

  // Generation phase
  generated?: GeneratedSite;

  // Metadata
  status: ProjectStatus;
  currentStep: number;
  totalSteps: number;
  errors: ProjectError[];
}

export type ProjectStatus =
  | 'input'
  | 'mapping'
  | 'structuring'
  | 'design'
  | 'blueprints'
  | 'generating'
  | 'deploying'
  | 'completed'
  | 'failed';

export interface ProjectInputs {
  contentFiles: FileReference[];
  pinterestUrl?: string;
  brandingAssets: BrandingAssets;
}

export interface FileReference {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedAt: Date;
  path: string;
}

export interface BrandingAssets {
  logo?: FileReference;
  colors?: ColorPalette;
  fonts?: FontDefinition[];
  guidelines?: FileReference;
}

export interface ColorPalette {
  primary: string;
  secondary?: string;
  accent?: string;
  background?: string;
  text?: string;
  custom?: Record<string, string>;
}

export interface FontDefinition {
  name: string;
  family: string;
  weights: number[];
  source: 'google' | 'custom' | 'system';
  url?: string;
  files?: FileReference[];
}

export interface DomainModel {
  entities: Entity[];
  relationships: Relationship[];
  schema: JSONSchema;
}

export interface Entity {
  id: string;
  name: string;
  pluralName: string;
  description: string;
  fields: EntityField[];
  icon?: string;
  color?: string;
}

export interface EntityField {
  id: string;
  name: string;
  label: string;
  type: FieldType;
  required: boolean;
  options?: Record<string, any>;
  validation?: FieldValidation;
}

export type FieldType =
  | 'text'
  | 'textarea'
  | 'markdown'
  | 'number'
  | 'date'
  | 'datetime'
  | 'toggle'
  | 'select'
  | 'multiselect'
  | 'tags'
  | 'url'
  | 'email'
  | 'tel'
  | 'image'
  | 'file'
  | 'gallery'
  | 'relation'
  | 'structure'
  | 'blocks';

export interface FieldValidation {
  min?: number;
  max?: number;
  pattern?: string;
  accept?: string[];
}

export interface Relationship {
  id: string;
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
  from: string; // Entity ID
  to: string; // Entity ID
  label: string;
  inversLabel?: string;
}

export type JSONSchema = Record<string, any>;

export interface StructuredContent {
  [entityType: string]: ContentItem[];
}

export interface ContentItem {
  id: string;
  entityType: string;
  title: string;
  slug: string;
  fields: Record<string, any>;
  metadata: ContentMetadata;
}

export interface ContentMetadata {
  createdAt: Date;
  updatedAt: Date;
  source?: string; // Original file reference
  status: 'draft' | 'published';
}

export interface DesignSystem {
  tokens: DesignTokens;
  moodboard?: MoodboardAnalysis;
  branding: BrandingAssets;
}

export interface DesignTokens {
  colors: TokenCategory;
  typography: TokenCategory;
  spacing: TokenCategory;
  breakpoints: TokenCategory;
  shadows: TokenCategory;
  borders: TokenCategory;
  animations: TokenCategory;
  custom?: Record<string, TokenCategory>;
}

export interface TokenCategory {
  [key: string]: string | number | TokenCategory;
}

export interface MoodboardAnalysis {
  url: string;
  extractedColors: string[];
  colorPalette: ColorPalette;
  typography: TypographyAnalysis;
  spacing: SpacingAnalysis;
  mood: string[];
  keywords: string[];
}

export interface TypographyAnalysis {
  headingStyle: 'serif' | 'sans-serif' | 'display' | 'mono';
  bodyStyle: 'serif' | 'sans-serif' | 'mono';
  scale: number;
  suggestions: string[];
}

export interface SpacingAnalysis {
  scale: 'compact' | 'comfortable' | 'spacious';
  baseUnit: number;
}

export interface Blueprints {
  [entityType: string]: KirbyBlueprint;
}

export interface KirbyBlueprint {
  title: string;
  icon?: string;
  tabs?: Record<string, BlueprintTab>;
  sections?: Record<string, BlueprintSection>;
  columns?: BlueprintColumn[];
}

export interface BlueprintTab {
  label: string;
  icon?: string;
  columns?: BlueprintColumn[];
  sections?: Record<string, BlueprintSection>;
}

export interface BlueprintColumn {
  width: string;
  sections?: Record<string, BlueprintSection>;
}

export interface BlueprintSection {
  type: string;
  label?: string;
  fields?: Record<string, BlueprintField>;
  [key: string]: any;
}

export interface BlueprintField {
  label: string;
  type: string;
  required?: boolean;
  width?: string;
  [key: string]: any;
}

export interface GeneratedSite {
  sitePath: string;
  gitRepo: string;
  deploymentUrl: string;
  deploymentId: string;
  kirbyVersion: string;
  generatedAt: Date;
}

export interface ProjectError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
  phase: ProjectStatus;
}
