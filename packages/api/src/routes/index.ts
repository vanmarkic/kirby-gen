/**
 * Route aggregation
 * Combines all routes into a single router
 */
import { Router } from 'express';
import authRoutes from './auth.routes';
import projectRoutes from './project.routes';
import fileRoutes from './file.routes';
import generationRoutes from './generation.routes';
import domainMappingRoutes from './domain-mapping.routes';
import { ResponseBuilder } from '../utils/response';
import { skillClient } from '../workflow/skill-client';

const router = Router();

/**
 * Health check endpoint
 */
router.get('/health', async (req, res) => {
  const skillsHealthy = await skillClient.healthCheck();

  res.json(
    ResponseBuilder.success({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        api: 'healthy',
        skills: skillsHealthy ? 'healthy' : 'unhealthy',
      },
    })
  );
});

/**
 * API info endpoint
 */
router.get('/info', (req, res) => {
  res.json(
    ResponseBuilder.success({
      name: 'Kirby-Gen API',
      version: '0.1.0',
      description: 'Backend API for automated portfolio generation',
      endpoints: {
        projects: '/api/projects',
        files: '/api/projects/:projectId/files',
        generation: '/api/projects/:projectId/generate',
        domainMapping: '/api/projects/:projectId/domain-model',
        health: '/api/health',
      },
    })
  );
});

/**
 * Register all routes
 */
router.use('/auth', authRoutes);
router.use('/projects', projectRoutes);
router.use('/projects', fileRoutes);
router.use('/projects', generationRoutes);
router.use('/projects', domainMappingRoutes);

export default router;
