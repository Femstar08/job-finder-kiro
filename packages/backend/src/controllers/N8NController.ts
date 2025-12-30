/**
 * N8N Integration Controller
 * Handles N8N workflow integration endpoints
 */

import { Request, Response } from 'express';
import { JobPreferencesService } from '../services/JobPreferencesService';
import { JobMatchService } from '../services/JobMatchService';
import { DuplicateDetectionService } from '../services/DuplicateDetectionService';
import { logger } from '../utils/logger';
import { JobMatch, JobPreferences } from '../types';

export class N8NController {
  private jobPreferencesService: JobPreferencesService;
  private jobMatchService: JobMatchService;
  private duplicateDetectionService: DuplicateDetectionService;

  constructor() {
    this.jobPreferencesService = new JobPreferencesService();
    this.jobMatchService = new JobMatchService();
    this.duplicateDetectionService = new DuplicateDetectionService();
  }

  /**
   * Get all active job preferences for N8N workflow
   */
  getActivePreferences = async (req: Request, res: Response): Promise<void> => {
    try {
      console.log('N8NController.getActivePreferences called'); // Added debug log
      logger.info('N8N requesting active preferences');

      const activePreferences = await this.jobPreferencesService.getAllActivePreferences();

      // Transform preferences for N8N consumption
      const n8nPreferences = activePreferences.map(pref => ({
        id: pref.id,
        userId: pref.userId,
        jobTitle: pref.jobTitle,
        keywords: pref.keywords,
        location: pref.location,
        salaryRange: pref.salaryRange,
        dayRateRange: pref.dayRateRange,
        contractTypes: pref.contractTypes,
        experienceLevel: pref.experienceLevel,
        companySize: pref.companySize,
        isActive: pref.isActive,
        createdAt: pref.createdAt,
        updatedAt: pref.updatedAt
      }));

      logger.info(`Returning ${n8nPreferences.length} active preferences to N8N`);
      res.json({
        success: true,
        data: n8nPreferences,
        count: n8nPreferences.length
      });
    } catch (error) {
      logger.error('Failed to get active preferences for N8N', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve active preferences'
      });
    }
  };

  /**
   * N8N posts found jobs from scraping
   */
  postFoundJobs = async (req: Request, res: Response): Promise<void> => {
    try {
      const { jobs, websiteSource, executionId } = req.body;

      logger.info(`N8N posting ${jobs.length} jobs from ${websiteSource}`, {
        executionId,
        websiteSource,
        jobCount: jobs.length
      });

      // Process each job for duplicates
      const processedJobs = [];
      const duplicateJobs = [];

      for (const job of jobs) {
        const isDuplicate = await this.duplicateDetectionService.detectDuplicates(job);

        if (isDuplicate.isDuplicate) {
          duplicateJobs.push(job);
          logger.debug(`Duplicate job detected: ${job.title} at ${job.company}`);
        } else {
          processedJobs.push({
            ...job,
            source: websiteSource,
            scrapedAt: new Date(),
            executionId
          });
        }
      }

      // Store non-duplicate jobs
      if (processedJobs.length > 0) {
        await this.jobMatchService.storeScrapedJobs(processedJobs);
      }

      logger.info(`Processed ${processedJobs.length} new jobs, ${duplicateJobs.length} duplicates`, {
        executionId,
        websiteSource
      });

      res.json({
        success: true,
        processed: processedJobs.length,
        duplicates: duplicateJobs.length,
        total: jobs.length
      });
    } catch (error) {
      logger.error('Failed to process found jobs from N8N', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process found jobs'
      });
    }
  };

  /**
   * N8N posts job matches after processing
   */
  postJobMatches = async (req: Request, res: Response): Promise<void> => {
    try {
      const { matches, executionId } = req.body;

      logger.info(`N8N posting ${matches.length} job matches`, {
        executionId,
        matchCount: matches.length
      });

      // Store job matches
      const storedMatches = await this.jobMatchService.storeJobMatches(matches);

      logger.info(`Stored ${storedMatches.length} job matches`, {
        executionId
      });

      res.json({
        success: true,
        stored: storedMatches.length,
        total: matches.length
      });
    } catch (error) {
      logger.error('Failed to process job matches from N8N', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process job matches'
      });
    }
  };

  /**
   * Get configured job websites for N8N workflow
   */
  getWebsiteConfigurations = async (req: Request, res: Response): Promise<void> => {
    try {
      logger.info('N8N requesting website configurations');

      // Get website configurations from database or config
      const websites = [
        {
          name: 'indeed',
          baseUrl: 'https://www.indeed.com',
          searchPath: '/jobs',
          enabled: true,
          rateLimit: 1000, // ms between requests
          selectors: {
            jobCard: '.jobsearch-SerpJobCard',
            title: '.jobTitle a',
            company: '.companyName',
            location: '.companyLocation',
            salary: '.salary-snippet',
            description: '.job-snippet'
          }
        },
        {
          name: 'linkedin',
          baseUrl: 'https://www.linkedin.com',
          searchPath: '/jobs/search',
          enabled: true,
          rateLimit: 2000,
          selectors: {
            jobCard: '.job-search-card',
            title: '.base-search-card__title',
            company: '.base-search-card__subtitle',
            location: '.job-search-card__location',
            description: '.base-search-card__metadata'
          }
        },
        {
          name: 'glassdoor',
          baseUrl: 'https://www.glassdoor.com',
          searchPath: '/Job/jobs.htm',
          enabled: true,
          rateLimit: 1500,
          selectors: {
            jobCard: '.react-job-listing',
            title: '.jobTitle',
            company: '.employerName',
            location: '.location',
            salary: '.salaryText'
          }
        }
      ];

      res.json({
        success: true,
        data: websites,
        count: websites.length
      });
    } catch (error) {
      logger.error('Failed to get website configurations for N8N', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve website configurations'
      });
    }
  };

  /**
   * Webhook endpoint for manual workflow testing
   */
  handleTestWebhook = async (req: Request, res: Response): Promise<void> => {
    try {
      const { testType, data } = req.body;

      logger.info(`N8N test webhook triggered: ${testType}`, { data });

      switch (testType) {
        case 'preferences':
          const preferences = await this.jobPreferencesService.getAllActivePreferences();
          res.json({
            success: true,
            testType,
            result: `Found ${preferences.length} active preferences`
          });
          break;

        case 'matching':
          if (data && data.job && data.preferences) {
            const matches = await this.jobMatchService.findMatches(data.job, data.preferences);
            res.json({
              success: true,
              testType,
              result: `Found ${matches.length} matches`
            });
          } else {
            res.status(400).json({
              success: false,
              error: 'Missing job or preferences data for matching test'
            });
          }
          break;

        case 'duplicate':
          if (data && data.job) {
            const isDuplicate = await this.duplicateDetectionService.detectDuplicates(data.job);
            res.json({
              success: true,
              testType,
              result: `Job is ${isDuplicate.isDuplicate ? 'a duplicate' : 'unique'}`
            });
          } else {
            res.status(400).json({
              success: false,
              error: 'Missing job data for duplicate test'
            });
          }
          break;

        default:
          res.status(400).json({
            success: false,
            error: `Unknown test type: ${testType}`
          });
      }
    } catch (error) {
      logger.error('N8N test webhook failed', error);
      res.status(500).json({
        success: false,
        error: 'Test webhook failed'
      });
    }
  };

  /**
   * Health check endpoint for N8N workflow monitoring
   */
  healthCheck = async (req: Request, res: Response): Promise<void> => {
    try {
      // Check database connectivity
      const dbHealth = await this.jobPreferencesService.healthCheck();

      // Check Redis connectivity (if applicable)
      // const redisHealth = await this.redisService.healthCheck();

      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          database: dbHealth ? 'healthy' : 'unhealthy',
          // redis: redisHealth ? 'healthy' : 'unhealthy'
        }
      };

      const isHealthy = dbHealth; // && redisHealth;

      res.status(isHealthy ? 200 : 503).json(health);
    } catch (error) {
      logger.error('Health check failed', error);
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed'
      });
    }
  };
}