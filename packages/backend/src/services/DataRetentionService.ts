import { JobMatchRepository } from '../database/repositories/JobMatchRepository';
import { logger } from '../utils/logger';

export interface DataRetentionConfig {
  jobMatchRetentionDays: number;
  archiveBeforeDeleteDays: number;
  batchSize: number;
  enableArchiving: boolean;
}

export interface DataRetentionResult {
  jobMatchesDeleted: number;
  jobMatchesArchived: number;
  errors: string[];
  executionTime: number;
}

export class DataRetentionService {
  private jobMatchRepository: JobMatchRepository;
  private config: DataRetentionConfig;

  constructor(config?: Partial<DataRetentionConfig>) {
    this.jobMatchRepository = new JobMatchRepository();
    this.config = {
      jobMatchRetentionDays: 90, // Keep job matches for 90 days
      archiveBeforeDeleteDays: 30, // Archive 30 days before deletion
      batchSize: 1000, // Process in batches of 1000
      enableArchiving: true,
      ...config,
    };
  }

  /**
   * Execute data retention policies
   */
  async executeRetentionPolicies(): Promise<DataRetentionResult> {
    const startTime = Date.now();
    const result: DataRetentionResult = {
      jobMatchesDeleted: 0,
      jobMatchesArchived: 0,
      errors: [],
      executionTime: 0,
    };

    logger.info('Starting data retention policy execution', {
      config: this.config,
    });

    try {
      // Step 1: Archive old job matches (if archiving is enabled)
      if (this.config.enableArchiving) {
        result.jobMatchesArchived = await this.archiveOldJobMatches();
      }

      // Step 2: Delete very old job matches
      result.jobMatchesDeleted = await this.deleteOldJobMatches();

      // Step 3: Clean up orphaned data
      await this.cleanupOrphanedData();

      result.executionTime = Date.now() - startTime;

      logger.info('Data retention policy execution completed', {
        result,
      });

      return result;
    } catch (error) {
      result.errors.push(`Data retention execution failed: ${error}`);
      result.executionTime = Date.now() - startTime;

      logger.error('Data retention policy execution failed', error);
      return result;
    }
  }

  /**
   * Archive old job matches before deletion
   */
  private async archiveOldJobMatches(): Promise<number> {
    const archiveCutoffDate = new Date();
    archiveCutoffDate.setDate(archiveCutoffDate.getDate() - (this.config.jobMatchRetentionDays - this.config.archiveBeforeDeleteDays));

    logger.info('Archiving job matches', {
      cutoffDate: archiveCutoffDate,
    });

    try {
      // Get job matches to archive
      const jobMatchesToArchive = await this.jobMatchRepository.findOldJobMatches(
        archiveCutoffDate,
        this.config.batchSize
      );

      if (jobMatchesToArchive.length === 0) {
        logger.info('No job matches to archive');
        return 0;
      }

      // Archive the job matches
      const archivedCount = await this.jobMatchRepository.archiveJobMatches(
        jobMatchesToArchive.map(job => job.id)
      );

      logger.info(`Archived ${archivedCount} job matches`);
      return archivedCount;
    } catch (error) {
      logger.error('Failed to archive job matches', error);
      throw error;
    }
  }

  /**
   * Delete old job matches
   */
  private async deleteOldJobMatches(): Promise<number> {
    const deleteCutoffDate = new Date();
    deleteCutoffDate.setDate(deleteCutoffDate.getDate() - this.config.jobMatchRetentionDays);

    logger.info('Deleting old job matches', {
      cutoffDate: deleteCutoffDate,
    });

    try {
      const deletedCount = await this.jobMatchRepository.deleteOldMatches(
        this.config.jobMatchRetentionDays
      );

      logger.info(`Deleted ${deletedCount} old job matches`);
      return deletedCount;
    } catch (error) {
      logger.error('Failed to delete old job matches', error);
      throw error;
    }
  }

  /**
   * Clean up orphaned data
   */
  private async cleanupOrphanedData(): Promise<void> {
    logger.info('Cleaning up orphaned data');

    try {
      // Clean up job matches for deleted preferences
      await this.jobMatchRepository.cleanupOrphanedJobMatches();

      logger.info('Orphaned data cleanup completed');
    } catch (error) {
      logger.error('Failed to cleanup orphaned data', error);
      throw error;
    }
  }

  /**
   * Get data retention statistics
   */
  async getRetentionStatistics(): Promise<{
    totalJobMatches: number;
    jobMatchesNearExpiry: number;
    archivedJobMatches: number;
    oldestJobMatch?: Date;
    newestJobMatch?: Date;
  }> {
    try {
      const stats = await this.jobMatchRepository.getRetentionStatistics(
        this.config.jobMatchRetentionDays
      );

      return stats;
    } catch (error) {
      logger.error('Failed to get retention statistics', error);
      throw error;
    }
  }

  /**
   * Schedule automatic cleanup
   */
  scheduleAutomaticCleanup(): NodeJS.Timeout {
    // Run cleanup daily at 2 AM
    const runCleanup = async () => {
      try {
        await this.executeRetentionPolicies();
      } catch (error) {
        logger.error('Scheduled data retention failed', error);
      }
    };

    // Calculate milliseconds until next 2 AM
    const now = new Date();
    const next2AM = new Date();
    next2AM.setHours(2, 0, 0, 0);

    if (next2AM <= now) {
      next2AM.setDate(next2AM.getDate() + 1);
    }

    const msUntil2AM = next2AM.getTime() - now.getTime();

    // Set initial timeout, then repeat every 24 hours
    const initialTimeout = setTimeout(() => {
      runCleanup();

      // Set up daily interval
      setInterval(runCleanup, 24 * 60 * 60 * 1000); // 24 hours
    }, msUntil2AM);

    logger.info('Data retention cleanup scheduled', {
      nextRun: next2AM,
      msUntilNextRun: msUntil2AM,
    });

    return initialTimeout;
  }

  /**
   * Manual cleanup for testing or immediate execution
   */
  async manualCleanup(dryRun: boolean = false): Promise<DataRetentionResult> {
    if (dryRun) {
      logger.info('Performing dry run of data retention policies');

      // Get statistics without actually deleting
      const stats = await this.getRetentionStatistics();

      return {
        jobMatchesDeleted: stats.jobMatchesNearExpiry,
        jobMatchesArchived: 0,
        errors: [],
        executionTime: 0,
      };
    }

    return await this.executeRetentionPolicies();
  }

  /**
   * Update retention configuration
   */
  updateConfig(newConfig: Partial<DataRetentionConfig>): void {
    this.config = {
      ...this.config,
      ...newConfig,
    };

    logger.info('Data retention configuration updated', {
      config: this.config,
    });
  }

  /**
   * Get current configuration
   */
  getConfig(): DataRetentionConfig {
    return { ...this.config };
  }
}