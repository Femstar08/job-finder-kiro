/**
 * Data Retention Routes
 * Provides endpoints for managing data retention policies
 */

import { Router } from 'express';
import { DataRetentionController } from '../controllers/DataRetentionController';
import { authenticateToken } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import Joi from 'joi';

const router = Router();
const dataRetentionController = new DataRetentionController();

// Validation schemas
const executeRetentionSchema = Joi.object({
  dryRun: Joi.boolean().optional().default(false),
});

const updateConfigSchema = Joi.object({
  jobMatchRetentionDays: Joi.number().integer().min(1).max(365).optional(),
  archiveBeforeDeleteDays: Joi.number().integer().min(0).max(90).optional(),
  batchSize: Joi.number().integer().min(100).max(10000).optional(),
  enableArchiving: Joi.boolean().optional(),
});

// All routes require authentication
router.use(authenticateToken);

/**
 * POST /api/data-retention/execute
 * Execute data retention policies manually
 */
router.post('/execute', validateBody(executeRetentionSchema), dataRetentionController.executeRetentionPolicies);

/**
 * GET /api/data-retention/statistics
 * Get data retention statistics
 */
router.get('/statistics', dataRetentionController.getRetentionStatistics);

/**
 * GET /api/data-retention/config
 * Get current data retention configuration
 */
router.get('/config', dataRetentionController.getRetentionConfig);

/**
 * PUT /api/data-retention/config
 * Update data retention configuration
 */
router.put('/config', validateBody(updateConfigSchema), dataRetentionController.updateRetentionConfig);

/**
 * GET /api/data-retention/health
 * Health check for data retention service
 */
router.get('/health', dataRetentionController.healthCheck);

export default router;