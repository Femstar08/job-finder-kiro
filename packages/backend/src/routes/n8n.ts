/**
 * N8N Integration Routes
 * Provides endpoints for N8N workflow to interact with the job finder system
 */

import { Router } from 'express';
import { N8NController } from '../controllers/N8NController';
import { validateBody } from '../middleware/validation';
import { n8nJobFoundSchema, n8nJobMatchesSchema, n8nTestWebhookSchema } from '../validation/schemas';

const router = Router();
const n8nController = new N8NController();

/**
 * GET /api/n8n/preferences
 * Get all active job preferences for N8N workflow
 */
router.get('/preferences', n8nController.getActivePreferences);

/**
 * POST /api/n8n/jobs/found
 * N8N posts found jobs from scraping
 */
router.post('/jobs/found', validateBody(n8nJobFoundSchema), n8nController.postFoundJobs);

/**
 * POST /api/n8n/jobs/matches
 * N8N posts job matches after processing
 */
router.post('/jobs/matches', validateBody(n8nJobMatchesSchema), n8nController.postJobMatches);

/**
 * GET /api/n8n/websites
 * Get configured job websites for N8N workflow
 */
router.get('/websites', n8nController.getWebsiteConfigurations);

/**
 * POST /api/n8n/webhook/test
 * Webhook endpoint for manual workflow testing
 */
router.post('/webhook/test', validateBody(n8nTestWebhookSchema), n8nController.handleTestWebhook);

/**
 * GET /api/n8n/health
 * Health check endpoint for N8N workflow monitoring
 */
router.get('/health', n8nController.healthCheck);

export default router;