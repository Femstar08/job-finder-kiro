/**
 * Retry Handler
 * Implements sophisticated retry logic with exponential backoff and circuit breaker
 */

class RetryHandler {
  constructor(config = {}) {
    this.config = {
      maxRetries: config.maxRetries || 3,
      baseDelay: config.baseDelay || 1000,
      maxDelay: config.maxDelay || 30000,
      backoffMultiplier: config.backoffMultiplier || 2,
      jitterMax: config.jitterMax || 1000,
      circuitBreakerThreshold: config.circuitBreakerThreshold || 5,
      circuitBreakerTimeout: config.circuitBreakerTimeout || 60000,
      ...config
    };

    this.circuitBreakers = new Map();
    this.retryStats = new Map();
  }

  /**
   * Execute operation with retry logic
   */
  async executeWithRetry(operation, context = {}) {
    const operationKey = context.operationKey || 'default';
    
    // Check circuit breaker
    if (this.isCircuitOpen(operationKey)) {
      throw new Error(`Circuit breaker is open for operation: ${operationKey}`);
    }

    let lastError;
    const stats = this.getRetryStats(operationKey);

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        const result = await operation();
        
        // Reset circuit breaker on success
        this.recordSuccess(operationKey);
        
        // Update stats
        stats.successCount++;
        stats.lastSuccess = new Date();
        
        return result;
        
      } catch (error) {
        lastError = error;
        stats.failureCount++;
        stats.lastFailure = new Date();
        
        // Record failure for circuit breaker
        this.recordFailure(operationKey);
        
        // Don't retry on certain types of errors
        if (this.isNonRetryableError(error)) {
          throw error;
        }

        if (attempt < this.config.maxRetries) {
          const delay = this.calculateDelay(attempt);
          
          console.log(`Retry attempt ${attempt}/${this.config.maxRetries} for ${operationKey} after ${delay}ms delay`);
          
          await this.sleep(delay);
        }
      }
    }

    // All retries exhausted
    stats.exhaustedCount++;
    throw new Error(`Operation failed after ${this.config.maxRetries} attempts: ${lastError.message}`);
  }

  /**
   * Calculate delay with exponential backoff and jitter
   */
  calculateDelay(attempt) {
    const exponentialDelay = this.config.baseDelay * Math.pow(this.config.backoffMultiplier, attempt - 1);
    const cappedDelay = Math.min(exponentialDelay, this.config.maxDelay);
    const jitter = Math.random() * this.config.jitterMax;
    
    return Math.floor(cappedDelay + jitter);
  }

  /**
   * Check if error should not be retried
   */
  isNonRetryableError(error) {
    const nonRetryablePatterns = [
      /authentication/i,
      /authorization/i,
      /forbidden/i,
      /not found/i,
      /bad request/i,
      /invalid/i
    ];

    return nonRetryablePatterns.some(pattern => pattern.test(error.message));
  }

  /**
   * Circuit breaker implementation
   */
  isCircuitOpen(operationKey) {
    const breaker = this.circuitBreakers.get(operationKey);
    
    if (!breaker) {
      return false;
    }

    // Check if circuit should be reset
    if (breaker.state === 'open' && 
        Date.now() - breaker.lastFailure > this.config.circuitBreakerTimeout) {
      breaker.state = 'half-open';
      breaker.failureCount = 0;
    }

    return breaker.state === 'open';
  }

  /**
   * Record successful operation
   */
  recordSuccess(operationKey) {
    const breaker = this.circuitBreakers.get(operationKey);
    
    if (breaker) {
      breaker.state = 'closed';
      breaker.failureCount = 0;
    }
  }

  /**
   * Record failed operation
   */
  recordFailure(operationKey) {
    let breaker = this.circuitBreakers.get(operationKey);
    
    if (!breaker) {
      breaker = {
        state: 'closed',
        failureCount: 0,
        lastFailure: null
      };
      this.circuitBreakers.set(operationKey, breaker);
    }

    breaker.failureCount++;
    breaker.lastFailure = Date.now();

    // Open circuit if threshold exceeded
    if (breaker.failureCount >= this.config.circuitBreakerThreshold) {
      breaker.state = 'open';
      console.warn(`Circuit breaker opened for operation: ${operationKey}`);
    }
  }

  /**
   * Get retry statistics for operation
   */
  getRetryStats(operationKey) {
    let stats = this.retryStats.get(operationKey);
    
    if (!stats) {
      stats = {
        successCount: 0,
        failureCount: 0,
        exhaustedCount: 0,
        lastSuccess: null,
        lastFailure: null
      };
      this.retryStats.set(operationKey, stats);
    }

    return stats;
  }

  /**
   * Get all retry statistics
   */
  getAllStats() {
    const allStats = {};
    
    for (const [key, stats] of this.retryStats.entries()) {
      allStats[key] = {
        ...stats,
        successRate: stats.successCount / (stats.successCount + stats.failureCount) || 0,
        totalAttempts: stats.successCount + stats.failureCount
      };
    }

    return allStats;
  }

  /**
   * Get circuit breaker status
   */
  getCircuitBreakerStatus() {
    const status = {};
    
    for (const [key, breaker] of this.circuitBreakers.entries()) {
      status[key] = {
        state: breaker.state,
        failureCount: breaker.failureCount,
        lastFailure: breaker.lastFailure ? new Date(breaker.lastFailure).toISOString() : null
      };
    }

    return status;
  }

  /**
   * Reset circuit breaker for operation
   */
  resetCircuitBreaker(operationKey) {
    const breaker = this.circuitBreakers.get(operationKey);
    
    if (breaker) {
      breaker.state = 'closed';
      breaker.failureCount = 0;
      breaker.lastFailure = null;
    }
  }

  /**
   * Reset all statistics
   */
  resetStats() {
    this.retryStats.clear();
    this.circuitBreakers.clear();
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Batch retry for multiple operations
   */
  async executeBatchWithRetry(operations, options = {}) {
    const {
      concurrency = 5,
      failFast = false,
      collectResults = true
    } = options;

    const results = [];
    const errors = [];
    
    // Process operations in batches
    for (let i = 0; i < operations.length; i += concurrency) {
      const batch = operations.slice(i, i + concurrency);
      
      const batchPromises = batch.map(async (operation, index) => {
        try {
          const result = await this.executeWithRetry(operation.fn, {
            operationKey: operation.key || `batch_${i + index}`,
            ...operation.context
          });
          
          if (collectResults) {
            results[i + index] = { success: true, result };
          }
          
          return result;
        } catch (error) {
          const errorInfo = { 
            success: false, 
            error: error.message, 
            index: i + index 
          };
          
          errors.push(errorInfo);
          
          if (collectResults) {
            results[i + index] = errorInfo;
          }
          
          if (failFast) {
            throw error;
          }
          
          return null;
        }
      });

      await Promise.all(batchPromises);
    }

    return {
      results: collectResults ? results : null,
      errors,
      successCount: operations.length - errors.length,
      failureCount: errors.length
    };
  }
}

module.exports = RetryHandler;