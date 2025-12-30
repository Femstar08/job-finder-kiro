import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { JobMatchService } from '../services/JobMatchService';
import { DuplicateDetectionService } from '../services/DuplicateDetectionService';
import { AppError } from '../middleware/errorHandler';

export class DuplicateController {
  private jobMatchService: JobMatchService;
  private duplicateDetectionService: DuplicateDetectionService;

  constructor() {
    this.jobMatchService = new JobMatchService();
    this.duplicateDetectionService = new DuplicateDetectionService();
  }

  // GET /api/duplicates/statistics
  async getDuplicateStatistics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
      }

      const statistics = await this.jobMatchService.getDuplicateStatistics(userId);

      res.json({
        success: true,
        data: statistics
      });
    } catch (error) {
      throw error;
    }
  }

  // POST /api/duplicates/consolidate
  async consolidateDuplicates(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
      }

      const consolidatedCount = await this.jobMatchService.consolidateDuplicatesForUser(userId);

      res.json({
        success: true,
        data: {
          consolidatedCount,
          message: `Successfully consolidated ${consolidatedCount} duplicate job matches`
        }
      });
    } catch (error) {
      throw error;
    }
  }

  // POST /api/duplicates/consolidate/:preferenceId
  async consolidateDuplicatesForPreference(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { preferenceId } = req.params;

      if (!userId) {
        throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
      }

      if (!preferenceId) {
        throw new AppError('Preference ID is required', 400, 'MISSING_PREFERENCE_ID');
      }

      // Verify user owns this preference (this will be done in the service layer)
      const consolidatedCount = await this.duplicateDetectionService.consolidateDuplicatesForPreference(preferenceId);

      res.json({
        success: true,
        data: {
          consolidatedCount,
          message: `Successfully consolidated ${consolidatedCount} duplicate job matches for preference`
        }
      });
    } catch (error) {
      throw error;
    }
  }

  // POST /api/duplicates/detect
  async detectJobDuplicates(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { jobData, options } = req.body;

      if (!jobData) {
        throw new AppError('Job data is required', 400, 'MISSING_JOB_DATA');
      }

      const duplicateResult = await this.duplicateDetectionService.detectDuplicates(jobData, options);

      res.json({
        success: true,
        data: duplicateResult
      });
    } catch (error) {
      throw error;
    }
  }

  // POST /api/duplicates/detect/batch
  async detectBatchDuplicates(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { jobs, options } = req.body;

      if (!jobs || !Array.isArray(jobs)) {
        throw new AppError('Jobs array is required', 400, 'MISSING_JOBS_ARRAY');
      }

      if (jobs.length > 100) {
        throw new AppError('Maximum 100 jobs allowed per batch', 400, 'BATCH_SIZE_EXCEEDED');
      }

      const duplicateResults = await this.duplicateDetectionService.detectBatchDuplicates(jobs, options);

      // Convert Map to object for JSON response
      const resultsObject = Object.fromEntries(duplicateResults);

      res.json({
        success: true,
        data: {
          results: resultsObject,
          summary: {
            totalJobs: jobs.length,
            duplicatesFound: Array.from(duplicateResults.values()).filter(r => r.isDuplicate).length,
            uniqueJobs: Array.from(duplicateResults.values()).filter(r => !r.isDuplicate).length
          }
        }
      });
    } catch (error) {
      throw error;
    }
  }

  // DELETE /api/duplicates/cleanup
  async cleanupOldDuplicates(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
      }

      const { daysOld = 30 } = req.query;
      const cleanedCount = await this.duplicateDetectionService.cleanupDuplicates(Number(daysOld));

      res.json({
        success: true,
        data: {
          cleanedCount,
          message: `Successfully cleaned up ${cleanedCount} old duplicate records`
        }
      });
    } catch (error) {
      throw error;
    }
  }
}