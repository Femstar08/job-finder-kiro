import { Router } from 'express';
import { JobPreferencesController } from '../controllers/JobPreferencesController';
import { validateBody, validateParams } from '../middleware/validation';
import { preferencesLimiter } from '../middleware/rateLimiter';
import {
  createJobPreferencesSchema,
  updateJobPreferencesSchema
} from '../validation/schemas';
import Joi from 'joi';

import { authenticateToken } from '../middleware/auth';

const router = Router();
const preferencesController = new JobPreferencesController();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Validation schemas
const uuidParamSchema = Joi.object({
  id: Joi.string().uuid().required(),
});

const duplicatePreferencesSchema = Joi.object({
  profileName: Joi.string().min(1).max(100).required(),
});

// Public routes (no authentication required)
router.get('/',
  preferencesController.getUserPreferences
);

router.get('/active',
  preferencesController.getActivePreferences
);

router.get('/stats',
  preferencesController.getPreferencesStats
);

router.get('/:id',
  validateParams(uuidParamSchema),
  preferencesController.getPreferencesById
);

router.post('/',
  preferencesLimiter,
  validateBody(createJobPreferencesSchema),
  preferencesController.createPreferences
);

router.put('/:id',
  preferencesLimiter,
  validateParams(uuidParamSchema),
  validateBody(updateJobPreferencesSchema),
  preferencesController.updatePreferences
);

router.post('/:id/toggle',
  preferencesLimiter,
  validateParams(uuidParamSchema),
  preferencesController.toggleActive
);

router.post('/:id/duplicate',
  preferencesLimiter,
  validateParams(uuidParamSchema),
  validateBody(duplicatePreferencesSchema),
  preferencesController.duplicatePreferences
);

router.delete('/:id',
  preferencesLimiter,
  validateParams(uuidParamSchema),
  preferencesController.deletePreferences
);

export default router;