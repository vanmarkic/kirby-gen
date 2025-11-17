/**
 * Workflow state and progress types
 */
import { ProjectStatus } from '@kirby-gen/shared';

/**
 * Workflow phase definition
 */
export interface WorkflowPhase {
  id: string;
  name: string;
  description: string;
  order: number;
  estimatedDuration?: number; // in seconds
}

/**
 * Workflow phases
 */
export const WORKFLOW_PHASES: WorkflowPhase[] = [
  {
    id: 'domain-mapping',
    name: 'Domain Mapping',
    description: 'Analyzing content and creating domain model',
    order: 1,
    estimatedDuration: 60,
  },
  {
    id: 'content-structuring',
    name: 'Content Structuring',
    description: 'Structuring content based on domain model',
    order: 2,
    estimatedDuration: 90,
  },
  {
    id: 'design-automation',
    name: 'Design Automation',
    description: 'Generating design system and tokens',
    order: 3,
    estimatedDuration: 120,
  },
  {
    id: 'cms-adaptation',
    name: 'CMS Adaptation',
    description: 'Generating Kirby CMS structure and templates',
    order: 4,
    estimatedDuration: 60,
  },
  {
    id: 'deployment',
    name: 'Deployment',
    description: 'Deploying the generated site',
    order: 5,
    estimatedDuration: 30,
  },
];

/**
 * Workflow progress event
 */
export interface WorkflowProgress {
  projectId: string;
  phase: string;
  status: 'started' | 'in_progress' | 'completed' | 'failed';
  progress: number; // 0-100
  message: string;
  timestamp: Date;
  data?: any;
  error?: WorkflowError;
}

/**
 * Workflow error
 */
export interface WorkflowError {
  code: string;
  message: string;
  phase: string;
  details?: any;
  timestamp: Date;
}

/**
 * Workflow state
 */
export interface WorkflowState {
  projectId: string;
  status: ProjectStatus;
  currentPhase: string;
  currentPhaseOrder: number;
  completedPhases: string[];
  failedPhases: string[];
  startedAt: Date;
  completedAt?: Date;
  errors: WorkflowError[];
  progress: WorkflowProgress[];
}

/**
 * Skill request/response types
 */
export interface SkillRequest {
  skill: string;
  input: any;
  options?: SkillOptions;
}

export interface SkillOptions {
  timeout?: number;
  retries?: number;
  [key: string]: any;
}

export interface SkillResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    duration: number;
    skill: string;
    timestamp: string;
  };
}

/**
 * Domain mapping skill request/response
 */
export interface DomainMappingRequest {
  contentFiles: Array<{
    path: string;
    filename: string;
    mimeType: string;
  }>;
  existingModel?: any;
}

export interface DomainMappingResponse {
  domainModel: {
    entities: any[];
    relationships: any[];
    schema: any;
  };
}

/**
 * Content structuring skill request/response
 */
export interface ContentStructuringRequest {
  domainModel: any;
  contentFiles: Array<{
    path: string;
    filename: string;
    mimeType: string;
  }>;
}

export interface ContentStructuringResponse {
  structuredContent: {
    [entityType: string]: any[];
  };
}

/**
 * Design automation skill request/response
 */
export interface DesignAutomationRequest {
  brandingAssets: {
    logo?: { path: string };
    colors?: any;
    fonts?: any;
    guidelines?: { path: string };
  };
  pinterestUrl?: string;
  domainModel?: any;
}

export interface DesignAutomationResponse {
  designSystem: {
    tokens: any;
    moodboard?: any;
    branding: any;
  };
}

/**
 * Workflow execution context
 */
export interface WorkflowContext {
  projectId: string;
  workingDir: string;
  uploadDir: string;
  outputDir: string;
  sessionId: string;
}

/**
 * Phase result
 */
export interface PhaseResult<T = any> {
  success: boolean;
  data?: T;
  error?: WorkflowError;
  duration: number;
}
