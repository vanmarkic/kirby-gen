export interface IKirbyDeploymentService {
  deploy(projectId: string): Promise<KirbyDeploymentResult>;
  getDeployment(projectId: string): Promise<KirbyDeploymentInfo | null>;
  archive(projectId: string): Promise<void>;
  cleanupOldDemos(): Promise<KirbyCleanupResult>;
}

export interface KirbyDeploymentResult {
  projectId: string;
  url: string;
  port: number;
  deployedAt: Date;
  panelUrl: string;
}

export interface KirbyDeploymentInfo {
  projectId: string;
  url: string;
  port: number;
  deployedAt: Date;
  expiresAt: Date;
  isActive: boolean;
}

export interface KirbyCleanupResult {
  archived: string[];
  quotaReached: boolean;
  emailsSent: string[];
}
