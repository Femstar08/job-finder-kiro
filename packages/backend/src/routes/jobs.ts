import { Router } from 'express';
import { JobMatchController } from '../controllers/JobMatchController';
import { validateBody, validateParams, validateQuery } from '../middleware/validation';
import { updateApplicationStatusSchema, jobMatchesQuerySchema } from '../validation/schemas';
import { authenticateToken } from '../middleware/auth';
import Joi from 'joi';

const router = Router();
const jobMatchController = new JobMatchController();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Validation schemas
const uuidParamSchema = Joi.object({
  id: Joi.string().uuid().required(),
});

const recentMatchesQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(50).default(10),
});

// Public routes (no authentication required)
router.get('/matches',
  validateQuery(jobMatchesQuerySchema),
  jobMatchController.getUserJobMatches
);

router.get('/matches/recent',
  validateQuery(recentMatchesQuerySchema),
  jobMatchController.getRecentJobMatches
);

router.get('/matches/by-source',
  jobMatchController.getJobMatchesBySource
);

router.get('/matches/:id',
  validateParams(uuidParamSchema),
  jobMatchController.getJobMatchById
);

router.put('/matches/:id/status',
  validateParams(uuidParamSchema),
  validateBody(updateApplicationStatusSchema),
  jobMatchController.updateApplicationStatus
);

router.get('/statistics',
  jobMatchController.getJobStatistics
);

router.get('/dashboard',
  jobMatchController.getDashboardData
);

export default router;