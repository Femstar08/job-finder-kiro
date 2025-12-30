/**
 * Workflow Execution Logic
 * Handles incremental job processing, logging, and error tracking
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class WorkflowExecutor {
  constructor(config = {}) {
    this.config = {
      maxRetries: config.maxRetries || 3,
      retryDelay: config.retryDelay || 5000,
      batchSize: config.batchSize || 10,
      logLevel: config.logLevel || 'info',
      ...config
    };
    
    this.executionState = {
      startTime: null,
      endTime: null,
      processedJobs: 0,
      matchedJobs: 0,
      errors: [],
      lastRunTimestamp: null
    };
    
    this.logger = this.createLogger();
  }

  /**
   * Create logger instance
   */
  createLogger() {
    return {
      info: (message, data = {}) => this.log('info', message, data),
      warn: (message, data = {}) => this.log('warn', message, data),
      error: (message, data = {}) => this.log('error', message, data),
      debug: (message, data = {}) => this.log('debug', message, data)
    };
  }

  /**
   * Log messages with structured format
   */
  log(level, message, data = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      executionId: this.executionState.executionId,
      ...data
    };

    if (this.config.logLevel === 'debug' || 
        (this.config.logLevel === 'info' && ['info', 'warn', 'error'].includes(level)) ||
        (this.config.logLevel === 'warn' && ['warn', 'error'].includes(level)) ||
        (this.config.logLevel === 'error' && level === 'error')) {
      console.log(JSON.stringify(logEntry));
    }

    // Store error logs for reporting
    if (level === 'error') {
      this.executionState.errors.push(logEntry);
    }
  }

  /**
   * Execute complete workflow with incremental processing
   */
  async executeWorkflow(preferences, websites) {
    this.executionState.executionId = this.generateExecutionId();
    this.executionState.startTime = new Date();
    
    this.logger.info('Starting workflow execution', {
      preferencesCount: preferences.length,
      websitesCount: websites.length
    });

    try {
      // Load last run timestamp for incremental processing
      await this.loadLastRunTimestamp();

      // Process preferences in batches
      const results = [];
      for (let i = 0; i < preferences.length; i += this.config.batchSize) {
        const batch = preferences.slice(i, i + this.config.batchSize);
        const batchResults = await this.processBatch(batch, websites);
        results.push(...batchResults);
      }

      // Update execution state
      this.executionState.processedJobs = results.reduce((sum, r) => sum + r.processedJobs, 0);
      this.executionState.matchedJobs = results.reduce((sum, r) => sum + r.matchedJobs, 0);
      this.executionState.endTime = new Date();

      // Save execution timestamp
      await this.saveLastRunTimestamp();

      // Generate execution report
      const report = this.generateExecutionReport(results);
      
      this.logger.info('Workflow execution completed', report);
      
      return {
        success: true,
        executionId: this.executionState.executionId,
        report
      };

    } catch (error) {
      this.executionState.endTime = new Date();
      this.logger.error('Workflow execution failed', { error: error.message, stack: error.stack });
      
      return {
        success: false,
        executionId: this.executionState.executionId,
        error: error.message,
        report: this.generateExecutionReport([])
      };
    }
  }

  /**
   * Process a batch of preferences against all websites
   */
  async processBatch(preferences, websites) {
    const batchResults = [];

    for (const preference of preferences) {
      this.logger.debug('Processing preference', { 
        userId: preference.userId, 
        profileName: preference.profileName 
      });

      for (const website of websites) {
        try {
          const result = await this.processPreferenceWebsite(preference, website);
          batchResults.push(result);
        } catch (error) {
          this.logger.error('Failed to process preference-website combination', {
            userId: preference.userId,
            website: website.name,
            error: error.message
          });
          
          batchResults.push({
            success: false,
            preference,
            website,
            error: error.message,
            processedJobs: 0,
            matchedJobs: 0
          });
        }
      }
    }

    return batchResults;
  }

  /**
   * Process single preference against single website
   */
  async processPreferenceWebsite(preference, website) {
    const startTime = Date.now();
    
    try {
      // Build search parameters
      const searchParams = this.buildSearchParams(preference);
      
      // Scrape jobs from website
      const scrapingResult = await this.scrapeJobs(website, searchParams);
      
      if (!scrapingResult.success) {
        throw new Error(`Scraping failed: ${scrapingResult.error}`);
      }

      // Filter jobs based on last run timestamp (incremental processing)
      const newJobs = this.filterNewJobs(scrapingResult.jobs);
      
      // Match jobs against preference criteria
      const matchedJobs = this.matchJobs(newJobs, preference);
      
      // Store results
      const storeResult = await this.storeJobMatches(matchedJobs, preference);
      
      const processingTime = Date.now() - startTime;
      
      this.logger.debug('Processed preference-website combination', {
        userId: preference.userId,
        website: website.name,
        scrapedJobs: scrapingResult.jobs.length,
        newJobs: newJobs.length,
        matchedJobs: matchedJobs.length,
        processingTimeMs: processingTime
      });

      return {
        success: true,
        preference,
        website,
        processedJobs: newJobs.length,
        matchedJobs: matchedJobs.length,
        processingTimeMs: processingTime
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      this.logger.error('Error processing preference-website combination', {
        userId: preference.userId,
        website: website.name,
        error: error.message,
        processingTimeMs: processingTime
      });

      throw error;
    }
  }

  /**
   * Build search parameters from user preference
   */
  buildSearchParams(preference) {
    return {
      jobTitle: preference.jobTitle || '',
      location: preference.location?.city || '',
      keywords: preference.keywords || [],
      contractTypes: preference.contractTypes || [],
      salaryRange: preference.salaryRange || {},
      remote: preference.location?.remote || false
    };
  }

  /**
   * Scrape jobs from website (mock implementation)
   */
  async scrapeJobs(website, searchParams) {
    // This would integrate with the actual scraping logic
    // For now, return mock data
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          jobs: [
            {
              jobTitle: `${searchParams.jobTitle} Position`,
              company: 'Example Corp',
              location: searchParams.location || 'Remote',
              salary: '$80,000 - $120,000',
              contractType: 'permanent',
              jobUrl: `https://${website.name.toLowerCase()}.com/job/123`,
              sourceWebsite: website.name,
              foundAt: new Date().toISOString(),
              jobHash: this.generateJobHash(`${searchParams.jobTitle} Position`, 'Example Corp', searchParams.location)
            }
          ]
        });
      }, 1000); // Simulate network delay
    });
  }

  /**
   * Filter jobs to only include new ones since last run
   */
  filterNewJobs(jobs) {
    if (!this.executionState.lastRunTimestamp) {
      return jobs; // First run, include all jobs
    }

    const lastRunTime = new Date(this.executionState.lastRunTimestamp);
    
    return jobs.filter(job => {
      const jobTime = new Date(job.foundAt);
      return jobTime > lastRunTime;
    });
  }

  /**
   * Match jobs against user preference criteria
   */
  matchJobs(jobs, preference) {
    return jobs.filter(job => {
      return this.isJobMatch(job, preference);
    });
  }

  /**
   * Check if job matches user preference
   */
  isJobMatch(job, preference) {
    // Title matching
    if (preference.jobTitle) {
      const titleMatch = job.jobTitle.toLowerCase().includes(preference.jobTitle.toLowerCase());
      if (!titleMatch) return false;
    }

    // Keywords matching
    if (preference.keywords && preference.keywords.length > 0) {
      const jobText = `${job.jobTitle} ${job.jobDescription || ''}`.toLowerCase();
      const keywordMatch = preference.keywords.some(keyword => 
        jobText.includes(keyword.toLowerCase())
      );
      if (!keywordMatch) return false;
    }

    // Location matching
    if (preference.location) {
      if (preference.location.remote && job.location.toLowerCase().includes('remote')) {
        // Remote job matches remote preference
      } else if (preference.location.city) {
        const locationMatch = job.location.toLowerCase().includes(preference.location.city.toLowerCase());
        if (!locationMatch) return false;
      }
    }

    // Contract type matching
    if (preference.contractTypes && preference.contractTypes.length > 0) {
      const contractMatch = preference.contractTypes.some(type => 
        job.contractType.toLowerCase().includes(type.toLowerCase())
      );
      if (!contractMatch) return false;
    }

    // Salary matching (simplified)
    if (preference.salaryRange && (preference.salaryRange.min || preference.salaryRange.max)) {
      // Would implement salary parsing and comparison
      // For now, assume match
    }

    return true;
  }

  /**
   * Store job matches (mock implementation)
   */
  async storeJobMatches(matchedJobs, preference) {
    // This would integrate with the actual API
    return new Promise((resolve) => {
      setTimeout(() => {
        this.logger.debug('Stored job matches', {
          userId: preference.userId,
          matchCount: matchedJobs.length
        });
        resolve({ success: true, stored: matchedJobs.length });
      }, 500);
    });
  }

  /**
   * Generate unique execution ID
   */
  generateExecutionId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `exec_${timestamp}_${random}`;
  }

  /**
   * Generate job hash for deduplication
   */
  generateJobHash(title, company, location) {
    const normalizedData = `${title}-${company}-${location}`.toLowerCase();
    return crypto.createHash('md5').update(normalizedData).digest('hex');
  }

  /**
   * Load last run timestamp from storage
   */
  async loadLastRunTimestamp() {
    try {
      const timestampFile = path.join(__dirname, '..', 'data', 'last-run.json');
      
      if (fs.existsSync(timestampFile)) {
        const data = JSON.parse(fs.readFileSync(timestampFile, 'utf8'));
        this.executionState.lastRunTimestamp = data.timestamp;
        
        this.logger.debug('Loaded last run timestamp', {
          timestamp: this.executionState.lastRunTimestamp
        });
      } else {
        this.logger.info('No previous run timestamp found - first execution');
      }
    } catch (error) {
      this.logger.warn('Failed to load last run timestamp', { error: error.message });
    }
  }

  /**
   * Save current execution timestamp
   */
  async saveLastRunTimestamp() {
    try {
      const timestampFile = path.join(__dirname, '..', 'data', 'last-run.json');
      const dataDir = path.dirname(timestampFile);
      
      // Ensure data directory exists
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      
      const data = {
        timestamp: this.executionState.startTime.toISOString(),
        executionId: this.executionState.executionId
      };
      
      fs.writeFileSync(timestampFile, JSON.stringify(data, null, 2));
      
      this.logger.debug('Saved execution timestamp', data);
    } catch (error) {
      this.logger.error('Failed to save execution timestamp', { error: error.message });
    }
  }

  /**
   * Generate execution report
   */
  generateExecutionReport(results) {
    const duration = this.executionState.endTime - this.executionState.startTime;
    
    const report = {
      executionId: this.executionState.executionId,
      startTime: this.executionState.startTime.toISOString(),
      endTime: this.executionState.endTime.toISOString(),
      durationMs: duration,
      processedJobs: this.executionState.processedJobs,
      matchedJobs: this.executionState.matchedJobs,
      errorCount: this.executionState.errors.length,
      successfulOperations: results.filter(r => r.success).length,
      failedOperations: results.filter(r => !r.success).length,
      averageProcessingTime: results.length > 0 ? 
        results.reduce((sum, r) => sum + (r.processingTimeMs || 0), 0) / results.length : 0
    };

    // Add performance metrics
    report.performance = {
      jobsPerSecond: report.processedJobs / (duration / 1000),
      matchRate: report.processedJobs > 0 ? (report.matchedJobs / report.processedJobs) * 100 : 0,
      errorRate: results.length > 0 ? (report.failedOperations / results.length) * 100 : 0
    };

    return report;
  }

  /**
   * Retry failed operations with exponential backoff
   */
  async retryOperation(operation, context = {}) {
    let lastError;
    
    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        this.logger.debug('Attempting operation', { attempt, context });
        return await operation();
      } catch (error) {
        lastError = error;
        
        this.logger.warn('Operation failed, will retry', {
          attempt,
          error: error.message,
          context
        });

        if (attempt < this.config.maxRetries) {
          const delay = this.config.retryDelay * Math.pow(2, attempt - 1);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    this.logger.error('Operation failed after all retries', {
      attempts: this.config.maxRetries,
      error: lastError.message,
      context
    });

    throw lastError;
  }

  /**
   * Health check for workflow components
   */
  async healthCheck() {
    const checks = {
      timestamp: new Date().toISOString(),
      status: 'healthy',
      checks: {}
    };

    try {
      // Check data directory access
      const dataDir = path.join(__dirname, '..', 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      checks.checks.dataDirectory = { status: 'ok' };
    } catch (error) {
      checks.checks.dataDirectory = { status: 'error', error: error.message };
      checks.status = 'unhealthy';
    }

    // Check last execution status
    try {
      await this.loadLastRunTimestamp();
      checks.checks.lastExecution = { 
        status: 'ok', 
        timestamp: this.executionState.lastRunTimestamp 
      };
    } catch (error) {
      checks.checks.lastExecution = { status: 'warning', error: error.message };
    }

    return checks;
  }
}

module.exports = WorkflowExecutor;