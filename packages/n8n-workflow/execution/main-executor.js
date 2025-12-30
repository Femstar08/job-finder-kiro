/**
 * Main Workflow Execution Entry Point
 * Orchestrates the complete workflow execution with monitoring and error handling
 */

const WorkflowExecutor = require('./workflow-executor');
const RetryHandler = require('./retry-handler');
const WorkflowMonitor = require('./workflow-monitor');
const axios = require('axios');

class MainExecutor {
  constructor(config = {}) {
    this.config = {
      apiBaseUrl: config.apiBaseUrl || 'http://localhost:3001/api',
      apiTimeout: config.apiTimeout || 30000,
      enableMonitoring: config.enableMonitoring !== false,
      ...config
    };

    this.executor = new WorkflowExecutor(config);
    this.retryHandler = new RetryHandler(config);
    this.monitor = config.enableMonitoring ? new WorkflowMonitor(config) : null;

    this.setupEventHandlers();
  }

  /**
   * Setup event handlers for monitoring
   */
  setupEventHandlers() {
    if (!this.monitor) return;

    // Start monitoring
    this.monitor.startMonitoring();

    // Handle alerts
    this.monitor.on('alert:slow_execution', (alert) => {
      console.warn('ALERT: Slow execution detected', alert);
    });

    this.monitor.on('alert:high_error_count', (alert) => {
      console.error('ALERT: High error count detected', alert);
    });

    this.monitor.on('alert:low_match_rate', (alert) => {
      console.warn('ALERT: Low match rate detected', alert);
    });
  }

  /**
   * Execute complete workflow
   */
  async executeWorkflow() {
    const executionId = this.generateExecutionId();
    const startTime = new Date();

    console.log(`Starting workflow execution: ${executionId}`);

    try {
      // Fetch active preferences from API
      const preferences = await this.fetchActivePreferences();
      
      if (preferences.length === 0) {
        console.log('No active preferences found, skipping execution');
        return { success: true, message: 'No active preferences', executionId };
      }

      // Fetch website configurations
      const websites = await this.fetchWebsiteConfigurations();

      // Execute workflow with retry logic
      const result = await this.retryHandler.executeWithRetry(
        () => this.executor.executeWorkflow(preferences, websites),
        { operationKey: 'main_workflow', executionId }
      );

      const endTime = new Date();
      const duration = endTime - startTime;

      // Record execution metrics
      if (this.monitor) {
        this.monitor.recordExecution({
          executionId,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          durationMs: duration,
          success: result.success,
          processedJobs: result.report?.processedJobs || 0,
          matchedJobs: result.report?.matchedJobs || 0,
          preferencesCount: preferences.length,
          websitesCount: websites.length
        });
      }

      console.log(`Workflow execution completed: ${executionId}`);
      console.log(`Duration: ${(duration / 1000).toFixed(2)}s`);
      console.log(`Processed: ${result.report?.processedJobs || 0} jobs`);
      console.log(`Matched: ${result.report?.matchedJobs || 0} jobs`);

      return result;

    } catch (error) {
      const endTime = new Date();
      const duration = endTime - startTime;

      console.error(`Workflow execution failed: ${executionId}`, error);

      // Record error
      if (this.monitor) {
        this.monitor.recordError({
          executionId,
          error: error.message,
          stack: error.stack,
          duration
        });
      }

      throw error;
    }
  }

  /**
   * Fetch active job preferences from backend API
   */
  async fetchActivePreferences() {
    try {
      const response = await axios.get(`${this.config.apiBaseUrl}/preferences/active`, {
        timeout: this.config.apiTimeout,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'N8N-Workflow-Executor/1.0'
        }
      });

      console.log(`Fetched ${response.data.length} active preferences`);
      return response.data;

    } catch (error) {
      if (error.response) {
        throw new Error(`API error fetching preferences: ${error.response.status} - ${error.response.data?.message || error.message}`);
      } else if (error.request) {
        throw new Error(`Network error fetching preferences: ${error.message}`);
      } else {
        throw new Error(`Error fetching preferences: ${error.message}`);
      }
    }
  }

  /**
   * Fetch website configurations
   */
  async fetchWebsiteConfigurations() {
    try {
      const configPath = require('path').join(__dirname, '..', 'website-configs.json');
      const fs = require('fs');
      
      if (fs.existsSync(configPath)) {
        const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        console.log(`Loaded ${configData.websites.length} website configurations`);
        return configData.websites;
      } else {
        // Fallback to default configurations
        return this.getDefaultWebsiteConfigurations();
      }

    } catch (error) {
      console.warn('Error loading website configurations, using defaults:', error.message);
      return this.getDefaultWebsiteConfigurations();
    }
  }

  /**
   * Get default website configurations
   */
  getDefaultWebsiteConfigurations() {
    return [
      {
        name: 'Indeed',
        baseUrl: 'https://www.indeed.com',
        enabled: true,
        rateLimit: 1000,
        adapter: 'indeed-adapter'
      },
      {
        name: 'LinkedIn',
        baseUrl: 'https://www.linkedin.com',
        enabled: true,
        rateLimit: 2000,
        adapter: 'linkedin-adapter'
      },
      {
        name: 'Glassdoor',
        baseUrl: 'https://www.glassdoor.com',
        enabled: true,
        rateLimit: 1500,
        adapter: 'glassdoor-adapter'
      }
    ];
  }

  /**
   * Submit job matches to backend API
   */
  async submitJobMatches(matches, userId) {
    try {
      const response = await axios.post(
        `${this.config.apiBaseUrl}/job-matches`,
        {
          userId,
          matches,
          source: 'n8n-workflow',
          timestamp: new Date().toISOString()
        },
        {
          timeout: this.config.apiTimeout,
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'N8N-Workflow-Executor/1.0'
          }
        }
      );

      console.log(`Submitted ${matches.length} job matches for user ${userId}`);
      return response.data;

    } catch (error) {
      if (error.response) {
        throw new Error(`API error submitting matches: ${error.response.status} - ${error.response.data?.message || error.message}`);
      } else if (error.request) {
        throw new Error(`Network error submitting matches: ${error.message}`);
      } else {
        throw new Error(`Error submitting matches: ${error.message}`);
      }
    }
  }

  /**
   * Get workflow health status
   */
  async getHealthStatus() {
    const health = {
      timestamp: new Date().toISOString(),
      status: 'healthy',
      components: {}
    };

    try {
      // Check API connectivity
      health.components.api = await this.checkApiHealth();
      
      // Check executor health
      health.components.executor = await this.executor.healthCheck();
      
      // Check monitor health (if enabled)
      if (this.monitor) {
        health.components.monitor = await this.monitor.performHealthCheck();
      }

      // Check retry handler stats
      health.components.retryHandler = {
        status: 'healthy',
        stats: this.retryHandler.getAllStats(),
        circuitBreakers: this.retryHandler.getCircuitBreakerStatus()
      };

      // Determine overall health
      const componentStatuses = Object.values(health.components).map(c => c.status);
      if (componentStatuses.includes('critical')) {
        health.status = 'critical';
      } else if (componentStatuses.includes('warning')) {
        health.status = 'warning';
      }

    } catch (error) {
      health.status = 'critical';
      health.error = error.message;
    }

    return health;
  }

  /**
   * Check API health
   */
  async checkApiHealth() {
    try {
      const response = await axios.get(`${this.config.apiBaseUrl}/health`, {
        timeout: 5000
      });

      return {
        status: 'healthy',
        message: 'API is responsive',
        responseTime: response.headers['x-response-time'] || 'unknown'
      };

    } catch (error) {
      return {
        status: 'critical',
        message: `API health check failed: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * Get execution metrics
   */
  getMetrics() {
    if (!this.monitor) {
      return { error: 'Monitoring not enabled' };
    }

    return this.monitor.getMetrics();
  }

  /**
   * Generate execution ID
   */
  generateExecutionId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `main_${timestamp}_${random}`;
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    if (this.monitor) {
      this.monitor.stopMonitoring();
    }
  }
}

// CLI execution support
if (require.main === module) {
  const config = {
    apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:3001/api',
    logLevel: process.env.LOG_LEVEL || 'info',
    maxRetries: parseInt(process.env.MAX_RETRIES) || 3,
    enableMonitoring: process.env.ENABLE_MONITORING !== 'false'
  };

  const executor = new MainExecutor(config);

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('Received SIGINT, shutting down gracefully...');
    executor.cleanup();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('Received SIGTERM, shutting down gracefully...');
    executor.cleanup();
    process.exit(0);
  });

  // Execute workflow
  executor.executeWorkflow()
    .then(result => {
      console.log('Workflow execution result:', JSON.stringify(result, null, 2));
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Workflow execution failed:', error);
      process.exit(1);
    });
}

module.exports = MainExecutor;