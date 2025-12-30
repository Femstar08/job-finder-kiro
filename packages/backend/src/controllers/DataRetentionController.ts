/**
 * Data Retention Controller
 * Handles data retention policies and cleanup operations
 */

import { Response } from 'express';
import { DataRetentionService } from '../services/DataRetentionService';
import { logger } from '../utils/logger';
import { AuthenticatedRequest } from '../types';

export class DataRetentionController {
  private dataRetentionService: DataRetentionService;

  constructor() {
    this.dataRetentionService = new DataRetentionService();
  }

  /**
   * Execute data retention policies manually
   */
  executeRetentionPolicies = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { dryRun = false } = req.body;

      logger.info('Manual data retention execution requested', {
        dryRun,
        requestedBy: req.user?.id,
      });

      const result = await this.dataRetentionService.manualCleanup(dryRun);

      res.json({
        success: true,
        data: result,
        message: dryRun ? 'Dry run completed successfully' : 'Data retention policies executed successfully',
      });
    } catch (error) {
      logger.error('Failed to execute data retention policies', error);
      res.status(500).json({
        success: false,
        error: 'Failed to execute data retention policies',
      });
    }
  };

  /**
   * Get data retention statistics
   */
  getRetentionStatistics = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      logger.info('Data retention statistics requested', {
        requestedBy: req.user?.id,
      });

      const statistics = await this.dataRetentionService.getRetentionStatistics();

      res.json({
        success: true,
        data: statistics,
      });
    } catch (error) {
      logger.error('Failed to get retention statistics', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve retention statistics',
      });
    }
  };

  /**
   * Get current data retention configuration
   */
  getRetentionConfig = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const config = this.dataRetentionService.getConfig();

      res.json({
        success: true,
        data: config,
      });
    } catch (error) {
      logger.error('Failed to get retention configuration', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve retention configuration',
      });
    }
  };

  /**
   * Update data retention configuration
   */
  updateRetentionConfig = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const {
        jobMatchRetentionDays,
        archiveBeforeDeleteDays,
        batchSize,
        enableArchiving,
      } = req.body;

      logger.info('Data retention configuration update requested', {
        newConfig: req.body,
        requestedBy: req.user?.id,
      });

      // Validate configuration
      if (jobMatchRetentionDays && (jobMatchRetentionDays < 1 || jobMatchRetentionDays > 365)) {
        res.status(400).json({
          success: false,
          error: 'Job match retention days must be between 1 and 365',
        });
        return;
      }

      if (archiveBeforeDeleteDays && (archiveBeforeDeleteDays < 0 || archiveBeforeDeleteDays > 90)) {
        res.status(400).json({
          success: false,
          error: 'Archive before delete days must be between 0 and 90',
        });
        return;
      }

      if (batchSize && (batchSize < 100 || batchSize > 10000)) {
        res.status(400).json({
          success: false,
          error: 'Batch size must be between 100 and 10000',
        });
        return;
      }

      this.dataRetentionService.updateConfig({
        jobMatchRetentionDays,
        archiveBeforeDeleteDays,
        batchSize,
        enableArchiving,
      });

      const updatedConfig = this.dataRetentionService.getConfig();

      res.json({
        success: true,
        data: updatedConfig,
        message: 'Data retention configuration updated successfully',
      });
    } catch (error) {
      logger.error('Failed to update retention configuration', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update retention configuration',
      });
    }
  };

  /**
   * Health check for data retention service
   */
  healthCheck = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const statistics = await this.dataRetentionService.getRetentionStatistics();
      const config = this.dataRetentionService.getConfig();

      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        config,
        statistics,
        recommendations: this.generateRecommendations(statistics, config),
      };

      res.json(health);
    } catch (error) {
      logger.error('Data retention health check failed', error);
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
      });
    }
  };

  private generateRecommendations(statistics: any, config: any): string[] {
    const recommendations: string[] = [];

    if (statistics.jobMatchesNearExpiry > 1000) {
      recommendations.push('Consider running data retention cleanup - many job matches are near expiry');
    }

    if (statistics.totalJobMatches > 50000) {
      recommendations.push('Large number of job matches detected - consider reducing retention period');
    }

    if (!config.enableArchiving && statistics.totalJobMatches > 10000) {
      recommendations.push('Consider enabling archiving to preserve data before deletion');
    }

    if (config.jobMatchRetentionDays > 180 && statistics.totalJobMatches > 20000) {
      recommendations.push('Consider reducing retention period to improve performance');
    }

    return recommendations;
  }
}