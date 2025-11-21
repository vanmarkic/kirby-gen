/**
 * Project data model
 * Represents the complete state of a portfolio generation project
 */
export interface ProjectData {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;

  // Input phase
  inputs: ProjectInputs;

  // Domain mapping phase
  domainModel?: DomainModel;
  schema?: DomainModel; // Alias for domainModel (used by web components)

  // Content structuring phase
  structuredContent?: StructuredContent;

  // Design phase
  designSystem?: DesignSystem;

  // Blueprint phase
  blueprints?: Blueprints;

  // Generation phase
  generated?: GeneratedSite;
  deployment?: GeneratedSite; // Alias for generated (used by web components)
  generatedArtifacts?: GeneratedArtifacts; // NEW: Generated artifacts metadata

  // Instant demo deployment info
  demoDeployment?: {
    url: string;
    panelUrl: string;
    deployedAt: Date;
    port: number;
    expiresAt?: Date;
  };

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
  // Additional properties for web form
  fontFamily?: string;
  primaryColor?: string;
  secondaryColor?: string;
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
  relationships?: Relationship[];
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
  name: string; // Relationship name for display
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
  from: string; // Entity ID
  to: string; // Entity ID
  targetEntity: string; // Target entity name (alias for 'to')
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
  publishedAt?: Date; // When content was published
  author?: string; // Content author
  slug?: string; // URL slug
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
  // CMS-agnostic properties
  cmsName: string;
  cmsVersion: string;
  sitePath: string;
  entryPoint?: string; // Main file to run/serve
  adminUrl?: string; // Admin panel URL pattern
  panelUrl?: string; // CMS panel/admin URL
  files?: GeneratedFile[];
  postInstallSteps?: string[]; // Instructions for manual steps

  // Credentials for CMS access
  credentials?: {
    username?: string;
    password?: string;
    email?: string;
    [key: string]: any;
  };

  // Legacy Kirby-specific properties (for backwards compatibility)
  gitRepo?: string;
  deploymentUrl?: string;
  deploymentId?: string;
  kirbyVersion?: string; // Alias for cmsVersion when CMS is Kirby
  generatedAt?: Date;
}

// Helper type for GeneratedFile (used by GeneratedSite.files)
export interface GeneratedFile {
  path: string;
  content: string | Buffer;
  encoding?: 'utf-8' | 'binary';
  executable?: boolean;
}

export interface ProjectError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
  phase: ProjectStatus;
}

/**
 * Chat message in domain mapping conversation
 * @deprecated Use ConversationTurn instead
 */
export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

/**
 * Single conversation turn (user or assistant message)
 */
export interface ConversationTurn {
  id: string;                    // Unique turn ID
  timestamp: Date;               // When message was sent
  role: 'user' | 'assistant' | 'system';
  content: string;               // Message content
  metadata?: {
    tokensUsed?: number;         // Token count (for cost tracking)
    model?: string;              // Claude model used
    latencyMs?: number;          // Response time
  };
}

/**
 * Conversation session for a specific workflow phase
 */
export interface ConversationSession {
  projectId: string;
  phase: ProjectStatus;          // Phase this conversation belongs to
  sessionId: string;             // Unique session identifier
  startedAt: Date;
  completedAt?: Date;
  turns: ConversationTurn[];     // All conversation turns in order
  status: 'active' | 'completed' | 'abandoned';
}

/**
 * Metadata about generated artifacts
 */
export interface GeneratedArtifacts {
  blueprints: FileReference[];    // Kirby blueprint YAML files
  templates: FileReference[];     // PHP/Twig templates
  content: FileReference[];       // Kirby .txt content files
  assets: FileReference[];        // Processed images, CSS, etc.
  generatedAt: Date;              // When artifacts were generated
  cmsAdapter: string;             // 'kirby' | 'strapi' | etc.
}

/**
 * Domain schema for visualization (alias for DomainModel)
 */
export type DomainSchema = DomainModel;

/**
 * Type aliases for backwards compatibility
 */
export type Project = ProjectData;
export type BrandingConfig = BrandingAssets;
