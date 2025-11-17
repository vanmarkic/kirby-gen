/**
 * Mock Python Skills Server
 * Provides mock responses for Python skills in E2E tests
 */
import http from 'http';
import { logger } from '../../../packages/api/src/config/logger';
import {
  DomainMappingResponse,
  ContentStructuringResponse,
  DesignAutomationResponse,
  SkillResponse,
} from '../../../packages/api/src/workflow/workflow-types';
import fs from 'fs/promises';
import path from 'path';

export interface MockSkillsServerConfig {
  port?: number;
  fixturesDir?: string;
}

const defaultConfig: Required<MockSkillsServerConfig> = {
  port: 5001,
  fixturesDir: path.join(__dirname, '../fixtures'),
};

/**
 * Mock skills server
 */
export class MockSkillsServer {
  private server: http.Server | null = null;
  private config: Required<MockSkillsServerConfig>;
  private fixtureCache: Map<string, any> = new Map();

  constructor(config: MockSkillsServerConfig = {}) {
    this.config = { ...defaultConfig, ...config };
  }

  /**
   * Start the mock skills server
   */
  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = http.createServer(async (req, res) => {
        await this.handleRequest(req, res);
      });

      this.server.listen(this.config.port, () => {
        logger.info(`Mock skills server started on port ${this.config.port}`);
        resolve();
      });

      this.server.on('error', (error) => {
        logger.error('Mock skills server error', { error });
        reject(error);
      });
    });
  }

  /**
   * Stop the mock skills server
   */
  async stop(): Promise<void> {
    if (this.server) {
      return new Promise((resolve, reject) => {
        this.server!.close((err) => {
          if (err) {
            logger.error('Error stopping mock skills server', { error: err });
            reject(err);
          } else {
            logger.info('Mock skills server stopped');
            this.server = null;
            resolve();
          }
        });
      });
    }
  }

  /**
   * Handle incoming requests
   */
  private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle OPTIONS preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    // Health check endpoint
    if (req.url === '/health' && req.method === 'GET') {
      this.sendResponse(res, 200, { status: 'ok' });
      return;
    }

    // Skill endpoints
    if (req.url?.startsWith('/skills/') && req.method === 'POST') {
      const skillName = req.url.replace('/skills/', '');
      await this.handleSkillRequest(req, res, skillName);
      return;
    }

    // Not found
    this.sendResponse(res, 404, {
      error: {
        code: 'NOT_FOUND',
        message: 'Endpoint not found',
      },
    });
  }

  /**
   * Handle skill request
   */
  private async handleSkillRequest(
    req: http.IncomingMessage,
    res: http.ServerResponse,
    skillName: string
  ): Promise<void> {
    try {
      // Parse request body
      const body = await this.parseBody(req);

      // Process skill based on name
      let response: SkillResponse;

      switch (skillName) {
        case 'domain-mapping':
          response = await this.handleDomainMapping(body);
          break;
        case 'content-structuring':
          response = await this.handleContentStructuring(body);
          break;
        case 'design-automation':
          response = await this.handleDesignAutomation(body);
          break;
        default:
          this.sendResponse(res, 404, {
            error: {
              code: 'SKILL_NOT_FOUND',
              message: `Skill ${skillName} not found`,
            },
          });
          return;
      }

      this.sendResponse(res, 200, response);
    } catch (error: any) {
      logger.error(`Error handling skill ${skillName}`, { error });
      this.sendResponse(res, 500, {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message,
        },
      });
    }
  }

  /**
   * Handle domain mapping skill
   */
  private async handleDomainMapping(input: any): Promise<SkillResponse<DomainMappingResponse>> {
    const startTime = Date.now();

    // Load fixture
    const domainModel = await this.loadFixture('sample-schema.json');

    // Simulate processing time
    await this.delay(500);

    return {
      success: true,
      data: {
        domainModel,
      },
      metadata: {
        duration: Date.now() - startTime,
        skill: 'domain-mapping',
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Handle content structuring skill
   */
  private async handleContentStructuring(
    input: any
  ): Promise<SkillResponse<ContentStructuringResponse>> {
    const startTime = Date.now();

    // Load fixture
    const structuredContent = await this.loadFixture('sample-structured-content.json');

    // Simulate processing time
    await this.delay(800);

    return {
      success: true,
      data: {
        structuredContent,
      },
      metadata: {
        duration: Date.now() - startTime,
        skill: 'content-structuring',
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Handle design automation skill
   */
  private async handleDesignAutomation(
    input: any
  ): Promise<SkillResponse<DesignAutomationResponse>> {
    const startTime = Date.now();

    // Load fixture
    const designSystem = await this.loadFixture('sample-design-system.json');

    // Simulate processing time (longer for design automation)
    await this.delay(1200);

    return {
      success: true,
      data: {
        designSystem,
      },
      metadata: {
        duration: Date.now() - startTime,
        skill: 'design-automation',
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Load fixture from file
   */
  private async loadFixture(filename: string): Promise<any> {
    // Check cache first
    if (this.fixtureCache.has(filename)) {
      return this.fixtureCache.get(filename);
    }

    // Load from file
    const filePath = path.join(this.config.fixturesDir, filename);
    const content = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(content);

    // Cache for future use
    this.fixtureCache.set(filename, data);

    return data;
  }

  /**
   * Parse request body
   */
  private async parseBody(req: http.IncomingMessage): Promise<any> {
    return new Promise((resolve, reject) => {
      let body = '';

      req.on('data', (chunk) => {
        body += chunk.toString();
      });

      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          resolve(data);
        } catch (error) {
          reject(new Error('Invalid JSON'));
        }
      });

      req.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Send JSON response
   */
  private sendResponse(res: http.ServerResponse, statusCode: number, data: any): void {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  }

  /**
   * Delay helper for simulating processing time
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Create and start mock skills server
 */
export async function startMockSkillsServer(
  config?: MockSkillsServerConfig
): Promise<MockSkillsServer> {
  const server = new MockSkillsServer(config);
  await server.start();
  return server;
}
