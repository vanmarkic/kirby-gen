/**
 * HTTP client for calling Python skills server
 */
import { env } from '../config/env';
import { logger } from '../config/logger';
import { SkillError } from '../utils/errors';
import {
  SkillRequest,
  SkillResponse,
  DomainMappingRequest,
  DomainMappingResponse,
  ContentStructuringRequest,
  ContentStructuringResponse,
  DesignAutomationRequest,
  DesignAutomationResponse,
} from './workflow-types';

/**
 * Skill client for making HTTP requests to Python skills server
 */
export class SkillClient {
  private baseUrl: string;
  private timeout: number;

  constructor(baseUrl?: string, timeout?: number) {
    this.baseUrl = baseUrl || env.SKILLS_SERVER_URL;
    this.timeout = timeout || env.SKILLS_TIMEOUT_MS;
  }

  /**
   * Make a request to a skill
   */
  private async request<TResponse = any>(
    skillName: string,
    input: any,
    options?: { timeout?: number }
  ): Promise<SkillResponse<TResponse>> {
    const url = `${this.baseUrl}/skills/${skillName}`;
    const timeout = options?.timeout || this.timeout;

    logger.info(`Calling skill: ${skillName}`, { url, input });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json() as SkillResponse<TResponse>;

      if (!response.ok) {
        throw new SkillError(
          skillName,
          data.error?.message || 'Skill request failed',
          {
            statusCode: response.status,
            ...data.error,
          }
        );
      }

      logger.info(`Skill completed: ${skillName}`, {
        success: data.success,
        duration: data.metadata?.duration,
      });

      return data;
    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw new SkillError(skillName, 'Skill request timeout', {
          timeout,
        });
      }

      if (error instanceof SkillError) {
        throw error;
      }

      throw new SkillError(skillName, error.message || 'Skill request failed', {
        originalError: error,
      });
    }
  }

  /**
   * Call domain mapping skill
   */
  async domainMapping(
    input: DomainMappingRequest
  ): Promise<DomainMappingResponse> {
    const response = await this.request<DomainMappingResponse>(
      'domain-mapping',
      input
    );

    if (!response.success || !response.data) {
      throw new SkillError(
        'domain-mapping',
        response.error?.message || 'Domain mapping failed',
        response.error
      );
    }

    return response.data;
  }

  /**
   * Call content structuring skill
   */
  async contentStructuring(
    input: ContentStructuringRequest
  ): Promise<ContentStructuringResponse> {
    const response = await this.request<ContentStructuringResponse>(
      'content-structuring',
      input
    );

    if (!response.success || !response.data) {
      throw new SkillError(
        'content-structuring',
        response.error?.message || 'Content structuring failed',
        response.error
      );
    }

    return response.data;
  }

  /**
   * Call design automation skill
   */
  async designAutomation(
    input: DesignAutomationRequest
  ): Promise<DesignAutomationResponse> {
    const response = await this.request<DesignAutomationResponse>(
      'design-automation',
      input
    );

    if (!response.success || !response.data) {
      throw new SkillError(
        'design-automation',
        response.error?.message || 'Design automation failed',
        response.error
      );
    }

    return response.data;
  }

  /**
   * Health check for skills server
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });

      return response.ok;
    } catch (error) {
      logger.error('Skills server health check failed', { error });
      return false;
    }
  }
}

/**
 * Create a singleton skill client instance
 */
export const skillClient = new SkillClient();
