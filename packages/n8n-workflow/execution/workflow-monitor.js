/**
 * Workflow Monitor
 * Provides monitoring, health checks, and execution tracking for N8N workflows
 */

const EventEmitter = require('events');
const fs = require('fs');
const path = require('path');

class WorkflowMonitor extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      healthCheckInterval: config.healthCheckInterval || 30000, // 30 seconds
      metricsRetentionDays: config.metricsRetentionDays || 7,
      alertThresholds: {
        errorRate: config.errorRateThreshold || 10, // 10%
        avgExecutionTime: config.avgExecutionTimeThreshold || 300000, // 5 minutes
        failureCount: config.failureCountThreshold || 5,
        ...config.alertThresholds
      },
      ...config
    };

    this.metrics = {
      executions: [],
      errors: [],
      performance: {},
      health: {
        status: 'unknown',
        lastCheck: null,
        components: {}
      }
    };

    this.isMonitoring = false;
    this.healthCheckTimer = null;
  }

  /**
   * Start monitoring workflow executions
   */
  startMonitoring() {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    this.emit('monitoring:started');

    // Start periodic health checks
    this.healthCheckTimer = setInterval(() => {
      this.performHealthCheck();
    }, this.config.healthCheckInterval);

    // Load historical metrics
    this.loadMetrics();

    console.log('Workflow monitoring started');
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;
    
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }

    this.emit('monitoring:stopped');
    console.log('Workflow monitoring stopped');
  }

  /**
   * Record workflow execution
   */
  recordExecution(executionData) {
    const execution = {
      ...executionData,
      timestamp: new Date().toISOString(),
      id: executionData.executionId || this.generateId()
    };

    this.metrics.executions.push(execution);
    
    // Emit execution event
    this.emit('execution:recorded', execution);

    // Check for alerts
    this.checkAlerts(execution);

    // Clean old metrics
    this.cleanOldMetrics();

    // Save metrics
    this.saveMetrics();

    console.log(`Recorded execution: ${execution.id}`);
  }

  /**
   * Record execution error
   */
  recordError(errorData) {
    const error = {
      ...errorData,
      timestamp: new Date().toISOString(),
      id: this.generateId()
    };

    this.metrics.errors.push(error);
    
    // Emit error event
    this.emit('execution:error', error);

    // Check for alerts
    this.checkErrorAlerts();

    console.error(`Recorded error: ${error.message}`);
  }

  /**
   * Perform comprehensive health check
   */
  async performHealthCheck() {
    const healthCheck = {
      timestamp: new Date().toISOString(),
      status: 'healthy',
      components: {}
    };

    try {
      // Check execution frequency
      healthCheck.components.executionFrequency = await this.checkExecutionFrequency();
      
      // Check error rates
      healthCheck.components.errorRate = await this.checkErrorRate();
      
      // Check performance metrics
      healthCheck.components.performance = await this.checkPerformance();
      
      // Check data storage
      healthCheck.components.dataStorage = await this.checkDataStorage();

      // Determine overall health
      const componentStatuses = Object.values(healthCheck.components).map(c => c.status);
      if (componentStatuses.includes('critical')) {
        healthCheck.status = 'critical';
      } else if (componentStatuses.includes('warning')) {
        healthCheck.status = 'warning';
      } else {
        healthCheck.status = 'healthy';
      }

    } catch (error) {
      healthCheck.status = 'critical';
      healthCheck.error = error.message;
    }

    this.metrics.health = healthCheck;
    this.emit('health:checked', healthCheck);

    return healthCheck;
  }

  /**
   * Check execution frequency
   */
  async checkExecutionFrequency() {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const recentExecutions = this.metrics.executions.filter(exec => 
      new Date(exec.timestamp) > oneDayAgo
    );

    const expectedExecutions = 1; // Should run once per day
    const actualExecutions = recentExecutions.length;

    let status = 'healthy';
    let message = `${actualExecutions} executions in last 24 hours`;

    if (actualExecutions === 0) {
      status = 'critical';
      message = 'No executions in last 24 hours';
    } else if (actualExecutions < expectedExecutions) {
      status = 'warning';
      message = `Only ${actualExecutions} executions in last 24 hours (expected ${expectedExecutions})`;
    }

    return {
      status,
      message,
      actualExecutions,
      expectedExecutions,
      lastExecution: recentExecutions.length > 0 ? 
        recentExecutions[recentExecutions.length - 1].timestamp : null
    };
  }

  /**
   * Check error rate
   */
  async checkErrorRate() {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const recentExecutions = this.metrics.executions.filter(exec => 
      new Date(exec.timestamp) > oneDayAgo
    );
    
    const recentErrors = this.metrics.errors.filter(error => 
      new Date(error.timestamp) > oneDayAgo
    );

    const totalExecutions = recentExecutions.length;
    const totalErrors = recentErrors.length;
    const errorRate = totalExecutions > 0 ? (totalErrors / totalExecutions) * 100 : 0;

    let status = 'healthy';
    let message = `Error rate: ${errorRate.toFixed(2)}%`;

    if (errorRate > this.config.alertThresholds.errorRate) {
      status = 'warning';
      message = `High error rate: ${errorRate.toFixed(2)}% (threshold: ${this.config.alertThresholds.errorRate}%)`;
    }

    return {
      status,
      message,
      errorRate,
      totalExecutions,
      totalErrors,
      threshold: this.config.alertThresholds.errorRate
    };
  }

  /**
   * Check performance metrics
   */
  async checkPerformance() {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const recentExecutions = this.metrics.executions.filter(exec => 
      new Date(exec.timestamp) > oneDayAgo && exec.durationMs
    );

    if (recentExecutions.length === 0) {
      return {
        status: 'warning',
        message: 'No performance data available',
        avgExecutionTime: null
      };
    }

    const avgExecutionTime = recentExecutions.reduce((sum, exec) => 
      sum + exec.durationMs, 0) / recentExecutions.length;

    let status = 'healthy';
    let message = `Average execution time: ${(avgExecutionTime / 1000).toFixed(2)}s`;

    if (avgExecutionTime > this.config.alertThresholds.avgExecutionTime) {
      status = 'warning';
      message = `Slow execution time: ${(avgExecutionTime / 1000).toFixed(2)}s (threshold: ${(this.config.alertThresholds.avgExecutionTime / 1000).toFixed(2)}s)`;
    }

    return {
      status,
      message,
      avgExecutionTime,
      executionCount: recentExecutions.length,
      threshold: this.config.alertThresholds.avgExecutionTime
    };
  }

  /**
   * Check data storage health
   */
  async checkDataStorage() {
    try {
      const dataDir = path.join(__dirname, '..', 'data');
      
      // Check if data directory exists and is writable
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      // Test write access
      const testFile = path.join(dataDir, 'health-check.tmp');
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);

      return {
        status: 'healthy',
        message: 'Data storage accessible',
        dataDirectory: dataDir
      };

    } catch (error) {
      return {
        status: 'critical',
        message: `Data storage error: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * Check for execution alerts
   */
  checkAlerts(execution) {
    // Check execution duration
    if (execution.durationMs && execution.durationMs > this.config.alertThresholds.avgExecutionTime) {
      this.emit('alert:slow_execution', {
        type: 'slow_execution',
        execution,
        threshold: this.config.alertThresholds.avgExecutionTime,
        message: `Execution took ${(execution.durationMs / 1000).toFixed(2)}s (threshold: ${(this.config.alertThresholds.avgExecutionTime / 1000).toFixed(2)}s)`
      });
    }

    // Check for low match rates
    if (execution.processedJobs > 0 && execution.matchedJobs !== undefined) {
      const matchRate = (execution.matchedJobs / execution.processedJobs) * 100;
      if (matchRate < 5) { // Less than 5% match rate
        this.emit('alert:low_match_rate', {
          type: 'low_match_rate',
          execution,
          matchRate,
          message: `Low match rate: ${matchRate.toFixed(2)}%`
        });
      }
    }
  }

  /**
   * Check for error-based alerts
   */
  checkErrorAlerts() {
    const recentErrors = this.metrics.errors.filter(error => {
      const errorTime = new Date(error.timestamp);
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      return errorTime > oneHourAgo;
    });

    if (recentErrors.length >= this.config.alertThresholds.failureCount) {
      this.emit('alert:high_error_count', {
        type: 'high_error_count',
        errorCount: recentErrors.length,
        threshold: this.config.alertThresholds.failureCount,
        message: `${recentErrors.length} errors in the last hour (threshold: ${this.config.alertThresholds.failureCount})`
      });
    }
  }

  /**
   * Get current metrics summary
   */
  getMetrics() {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const recentExecutions = this.metrics.executions.filter(exec => 
      new Date(exec.timestamp) > oneDayAgo
    );
    
    const recentErrors = this.metrics.errors.filter(error => 
      new Date(error.timestamp) > oneDayAgo
    );

    return {
      summary: {
        totalExecutions: this.metrics.executions.length,
        recentExecutions: recentExecutions.length,
        totalErrors: this.metrics.errors.length,
        recentErrors: recentErrors.length,
        errorRate: recentExecutions.length > 0 ? 
          (recentErrors.length / recentExecutions.length) * 100 : 0
      },
      health: this.metrics.health,
      recentExecutions: recentExecutions.slice(-10), // Last 10 executions
      recentErrors: recentErrors.slice(-10) // Last 10 errors
    };
  }

  /**
   * Clean old metrics data
   */
  cleanOldMetrics() {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.metricsRetentionDays);

    // Clean old executions
    this.metrics.executions = this.metrics.executions.filter(exec => 
      new Date(exec.timestamp) > cutoffDate
    );

    // Clean old errors
    this.metrics.errors = this.metrics.errors.filter(error => 
      new Date(error.timestamp) > cutoffDate
    );
  }

  /**
   * Save metrics to disk
   */
  saveMetrics() {
    try {
      const dataDir = path.join(__dirname, '..', 'data');
      const metricsFile = path.join(dataDir, 'metrics.json');
      
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      const metricsData = {
        executions: this.metrics.executions,
        errors: this.metrics.errors,
        lastSaved: new Date().toISOString()
      };

      fs.writeFileSync(metricsFile, JSON.stringify(metricsData, null, 2));
    } catch (error) {
      console.error('Failed to save metrics:', error.message);
    }
  }

  /**
   * Load metrics from disk
   */
  loadMetrics() {
    try {
      const dataDir = path.join(__dirname, '..', 'data');
      const metricsFile = path.join(dataDir, 'metrics.json');
      
      if (fs.existsSync(metricsFile)) {
        const metricsData = JSON.parse(fs.readFileSync(metricsFile, 'utf8'));
        
        this.metrics.executions = metricsData.executions || [];
        this.metrics.errors = metricsData.errors || [];
        
        console.log(`Loaded ${this.metrics.executions.length} executions and ${this.metrics.errors.length} errors from disk`);
      }
    } catch (error) {
      console.warn('Failed to load metrics:', error.message);
    }
  }

  /**
   * Generate unique ID
   */
  generateId() {
    return `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  /**
   * Export metrics for external monitoring systems
   */
  exportMetrics(format = 'json') {
    const metrics = this.getMetrics();
    
    switch (format) {
      case 'prometheus':
        return this.formatPrometheusMetrics(metrics);
      case 'json':
      default:
        return JSON.stringify(metrics, null, 2);
    }
  }

  /**
   * Format metrics for Prometheus
   */
  formatPrometheusMetrics(metrics) {
    const lines = [];
    
    lines.push('# HELP workflow_executions_total Total number of workflow executions');
    lines.push('# TYPE workflow_executions_total counter');
    lines.push(`workflow_executions_total ${metrics.summary.totalExecutions}`);
    
    lines.push('# HELP workflow_errors_total Total number of workflow errors');
    lines.push('# TYPE workflow_errors_total counter');
    lines.push(`workflow_errors_total ${metrics.summary.totalErrors}`);
    
    lines.push('# HELP workflow_error_rate Error rate percentage');
    lines.push('# TYPE workflow_error_rate gauge');
    lines.push(`workflow_error_rate ${metrics.summary.errorRate}`);
    
    return lines.join('\n');
  }
}

module.exports = WorkflowMonitor;