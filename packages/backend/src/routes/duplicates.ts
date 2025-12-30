import { Router } from 'express';
import { DuplicateController } from '../controllers/DuplicateController';
import { authenticateToken } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import { duplicateDetectionSchema, batchDuplicateDetectionSchema } from '../validation/schemas';

const router = Router();
const duplicateController = new DuplicateController();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// GET /api/duplicates/statistics - Get duplicate statistics for user
router.get('/statistics', duplicateController.getDuplicateStatistics.bind(duplicateController));

// POST /api/duplicates/consolidate - Consolidate all duplicates for user
router.post('/consolidate', duplicateController.consolidateDuplicates.bind(duplicateController));

// POST /api/duplicates/consolidate/:preferenceId - Consolidate duplicates for specific preference
router.post('/consolidate/:preferenceId', duplicateController.consolidateDuplicatesForPreference.bind(duplicateController));

// POST /api/duplicates/detect - Detect duplicates for a single job
router.post('/detect',
  validateBody(duplicateDetectionSchema),
  duplicateController.detectJobDuplicates.bind(duplicateController)
);

// POST /api/duplicates/detect/batch - Detect duplicates for multiple jobs
router.post('/detect/batch',
  validateBody(batchDuplicateDetectionSchema),
  duplicateController.detectBatchDuplicates.bind(duplicateController)
);

// DELETE /api/duplicates/cleanup - Cleanup old duplicate records
router.delete('/cleanup', duplicateController.cleanupOldDuplicates.bind(duplicateController));

export default router;