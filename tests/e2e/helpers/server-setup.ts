/**
 * E2E Test Server Setup
 * Utilities for starting and stopping the API server in test mode
 */
import { Server } from '../../../packages/api/src/server';
import { createApp } from '../../../packages/api/src/app';
import { setupDependencyInjection, cleanupServices } from '../../../packages/api/src/config/di-setup';
import { logger } from '../../../packages/api/src/config/logger';
import { Application } from 'express';
import { Server as SocketIOServer } from 'socket.io';
import http from 'http';
import path from 'path';
import fs from 'fs/promises';

export interface TestServerInstance {
  app: Application;
  server: Server;
  httpServer: http.Server;
  io: SocketIOServer;
  baseUrl: string;
  cleanup: () => Promise<void>;
}

/**
 * Configuration for test server
 */
export interface TestServerConfig {
  port?: number;
  storageDir?: string;
  sessionDir?: string;
  uploadDir?: string;
  deploymentDir?: string;
  skillsServerUrl?: string;
  cleanupOnStop?: boolean;
}

/**
 * Default test configuration
 */
const defaultConfig: Required<TestServerConfig> = {
  port: 3003, // Different from dev and regular test ports
  storageDir: './test-data/e2e/storage',
  sessionDir: './test-data/e2e/sessions',
  uploadDir: './test-data/e2e/uploads',
  deploymentDir: './test-data/e2e/deployments',
  skillsServerUrl: 'http://localhost:5001',
  cleanupOnStop: true,
};

/**
 * Start test server
 */
export async function startTestServer(
  config: TestServerConfig = {}
): Promise<TestServerInstance> {
  const finalConfig = { ...defaultConfig, ...config };

  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.PORT = String(finalConfig.port);
  process.env.HOST = '0.0.0.0';
  process.env.LOG_LEVEL = 'error'; // Reduce noise in tests
  process.env.AUTH_ENABLED = 'false';
  process.env.STORAGE_DIR = finalConfig.storageDir;
  process.env.SESSION_DIR = finalConfig.sessionDir;
  process.env.UPLOAD_DIR = finalConfig.uploadDir;
  process.env.DEPLOYMENT_DIR = finalConfig.deploymentDir;
  process.env.SKILLS_SERVER_URL = finalConfig.skillsServerUrl;
  process.env.CORS_ORIGIN = '*';
  process.env.CORS_CREDENTIALS = 'true';

  // Ensure test directories exist
  await ensureTestDirectories(finalConfig);

  // Setup dependency injection
  setupDependencyInjection();

  // Create Express app
  const app = createApp();

  // Create and start server
  const server = new Server(app);
  await server.start();

  const httpServer = server.getHttpServer();
  const io = server.getSocketServer();
  const baseUrl = `http://localhost:${finalConfig.port}`;

  logger.info(`Test server started on ${baseUrl}`);

  // Cleanup function
  const cleanup = async () => {
    logger.info('Stopping test server...');

    try {
      // Stop server
      await server.stop();

      // Cleanup services
      await cleanupServices();

      // Cleanup test directories
      if (finalConfig.cleanupOnStop) {
        await cleanupTestDirectories(finalConfig);
      }

      logger.info('Test server stopped');
    } catch (error) {
      logger.error('Error stopping test server', { error });
      throw error;
    }
  };

  return {
    app,
    server,
    httpServer,
    io,
    baseUrl,
    cleanup,
  };
}

/**
 * Ensure test directories exist
 */
async function ensureTestDirectories(config: Required<TestServerConfig>): Promise<void> {
  const directories = [
    config.storageDir,
    config.sessionDir,
    config.uploadDir,
    config.deploymentDir,
  ];

  for (const dir of directories) {
    await fs.mkdir(dir, { recursive: true });
  }
}

/**
 * Cleanup test directories
 */
async function cleanupTestDirectories(config: Required<TestServerConfig>): Promise<void> {
  const directories = [
    config.storageDir,
    config.sessionDir,
    config.uploadDir,
    config.deploymentDir,
  ];

  for (const dir of directories) {
    try {
      await fs.rm(dir, { recursive: true, force: true });
    } catch (error) {
      // Ignore errors if directory doesn't exist
      logger.debug(`Failed to cleanup ${dir}`, { error });
    }
  }
}

/**
 * Wait for server to be ready
 */
export async function waitForServer(
  baseUrl: string,
  timeout: number = 10000
): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      const response = await fetch(`${baseUrl}/`, {
        method: 'GET',
        signal: AbortSignal.timeout(1000),
      });

      if (response.ok) {
        return true;
      }
    } catch (error) {
      // Server not ready yet, wait and retry
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  return false;
}

/**
 * Create test client for making API requests
 */
export interface TestClient {
  get: (path: string) => Promise<Response>;
  post: (path: string, data?: any) => Promise<Response>;
  patch: (path: string, data?: any) => Promise<Response>;
  delete: (path: string) => Promise<Response>;
  upload: (path: string, files: File[]) => Promise<Response>;
}

export function createTestClient(baseUrl: string): TestClient {
  const request = async (
    method: string,
    path: string,
    data?: any,
    isFormData: boolean = false
  ): Promise<Response> => {
    const url = `${baseUrl}${path}`;
    const headers: HeadersInit = {};

    let body: any;

    if (data) {
      if (isFormData) {
        body = data; // FormData
      } else {
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify(data);
      }
    }

    return fetch(url, {
      method,
      headers,
      body,
    });
  };

  return {
    get: (path: string) => request('GET', path),
    post: (path: string, data?: any) => request('POST', path, data),
    patch: (path: string, data?: any) => request('PATCH', path, data),
    delete: (path: string) => request('DELETE', path),
    upload: async (path: string, files: File[]) => {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append('files', file);
      });
      return request('POST', path, formData, true);
    },
  };
}
