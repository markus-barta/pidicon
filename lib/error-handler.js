/**
 * @fileoverview Error Handler - Standardized error handling patterns
 * @description Centralized error handling utilities with consistent logging,
 * reporting, and recovery patterns across the entire application.
 * @author Markus Barta (mba) with assistance from Cursor AI
 * @license GPL-3.0-or-later
 */

const logger = require('./logger');

/**
 * Error Handler - Centralized error handling with consistent patterns
 */
class ErrorHandler {
  constructor(options = {}) {
    this.defaultContext = options.defaultContext || {};
    this.errorThresholds = options.errorThresholds || {
      warn: 5,
      error: 10,
      critical: 20,
    };
    this.errorCounts = new Map();
  }

  /**
   * Handle an error with standardized logging and reporting
   * @param {Error} error - Error object
   * @param {Object} context - Error context information
   * @param {Object} options - Error handling options
   * @returns {Object} Standardized error response
   */
  handleError(error, context = {}, options = {}) {
    const { publish = true, rethrow = false, recovery = null } = options;

    // Create standardized error context
    const errorContext = {
      ...this.defaultContext,
      ...context,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        timestamp: Date.now(),
      },
    };

    // Track error frequency
    const errorKey = `${context.scene || 'unknown'}:${error.name}`;
    const count = this.errorCounts.get(errorKey) || 0;
    this.errorCounts.set(errorKey, count + 1);

    // Determine severity based on frequency
    const severity = this.getSeverity(errorKey);

    // Log error with appropriate level
    const logMessage = `[${context.scene || 'unknown'}] ${error.message}`;
    const logData = {
      severity,
      count: this.errorCounts.get(errorKey),
      context: errorContext,
    };

    switch (severity) {
      case 'critical':
        logger.error(`🚨 ${logMessage}`, logData);
        break;
      case 'warn':
        logger.warn(`⚠️ ${logMessage}`, logData);
        break;
      default:
        logger.error(`❌ ${logMessage}`, logData);
    }

    // Publish error if requested
    if (publish && context.publishError) {
      try {
        context.publishError(error, errorContext);
      } catch (publishError) {
        logger.warn('Failed to publish error:', {
          error: publishError.message,
        });
      }
    }

    // Attempt recovery if provided
    if (recovery && typeof recovery === 'function') {
      try {
        const recoveryResult = recovery(error, errorContext);
        logger.info('Recovery attempted:', { result: recoveryResult });
      } catch (recoveryError) {
        logger.error('Recovery failed:', {
          error: recoveryError.message,
          originalError: error.message,
        });
      }
    }

    // Create standardized error response
    const errorResponse = {
      success: false,
      error: error.message,
      severity,
      context: errorContext,
      timestamp: Date.now(),
    };

    // Rethrow if requested
    if (rethrow) {
      throw error;
    }

    return errorResponse;
  }

  /**
   * Get error severity based on frequency
   * @param {string} errorKey - Error key for tracking
   * @returns {string} Error severity level
   */
  getSeverity(errorKey) {
    const count = this.errorCounts.get(errorKey) || 0;

    if (count >= this.errorThresholds.critical) {
      return 'critical';
    } else if (count >= this.errorThresholds.error) {
      return 'error';
    } else if (count >= this.errorThresholds.warn) {
      return 'warn';
    } else {
      return 'info';
    }
  }

  /**
   * Handle asynchronous errors with proper cleanup
   * @param {Function} asyncFunction - Async function to wrap
   * @param {Object} context - Error context
   * @param {Object} options - Error handling options
   * @returns {Function} Wrapped async function
   */
  wrapAsync(asyncFunction, context = {}, options = {}) {
    return async (...args) => {
      try {
        return await asyncFunction(...args);
      } catch (error) {
        return this.handleError(error, context, {
          ...options,
          rethrow: false,
        });
      }
    };
  }

  /**
   * Create recovery function for common error scenarios
   * @param {Object} recoveryStrategies - Recovery strategies by error type
   * @returns {Function} Recovery function
   */
  createRecoveryFunction(recoveryStrategies = {}) {
    return (error, context) => {
      const strategy =
        recoveryStrategies[error.name] || recoveryStrategies.default;

      if (strategy) {
        try {
          return strategy(error, context);
        } catch (recoveryError) {
          logger.error('Recovery strategy failed:', {
            error: recoveryError.message,
            originalError: error.message,
          });
          return null;
        }
      }

      return null;
    };
  }

  /**
   * Reset error counts
   * @param {string} errorKey - Specific error key or null for all
   */
  resetErrorCounts(errorKey = null) {
    if (errorKey) {
      this.errorCounts.delete(errorKey);
    } else {
      this.errorCounts.clear();
    }

    logger.info('Error counts reset', { errorKey });
  }

  /**
   * Get error statistics
   * @returns {Object} Error statistics
   */
  getErrorStats() {
    const stats = {
      totalErrors: this.errorCounts.size,
      errorCounts: Object.fromEntries(this.errorCounts),
      criticalErrors: 0,
      errorErrors: 0,
      warnErrors: 0,
    };

    this.errorCounts.forEach((count, errorKey) => {
      const severity = this.getSeverity(errorKey);
      stats[`${severity}Errors`]++;
    });

    return stats;
  }
}

/**
 * Common Error Recovery Strategies
 */
const ErrorRecovery = {
  /**
   * Default recovery strategy - log and continue
   * @param {Error} error - Error object
   * @param {Object} context - Error context
   * @returns {Object} Recovery result
   */
  default: (error, context) => {
    logger.info('Using default recovery strategy', {
      error: error.name,
      context,
    });
    return { strategy: 'default', action: 'continue' };
  },

  /**
   * Network error recovery - retry with backoff
   * @param {Error} error - Error object
   * @param {Object} context - Error context
   * @returns {Object} Recovery result
   */
  network: (error, context) => {
    const retryCount = context.retryCount || 0;
    const maxRetries = 3;

    if (retryCount < maxRetries) {
      const delay = Math.min(1000 * Math.pow(2, retryCount), 10000);
      logger.info('Scheduling network retry', {
        retryCount: retryCount + 1,
        delay,
      });
      return {
        strategy: 'retry',
        delay,
        maxRetries,
        nextRetry: retryCount + 1,
      };
    } else {
      logger.warn('Max network retries exceeded');
      return { strategy: 'fail', reason: 'maxRetries' };
    }
  },

  /**
   * Device error recovery - fallback to safe state
   * @param {Error} error - Error object
   * @param {Object} context - Error context
   * @returns {Object} Recovery result
   */
  device: (error, context) => {
    logger.warn('Device error detected, attempting fallback', {
      device: context.device,
      error: error.message,
    });

    // Try to reset device state
    return {
      strategy: 'fallback',
      action: 'reset',
      device: context.device,
    };
  },

  /**
   * Scene error recovery - switch to safe scene
   * @param {Error} error - Error object
   * @param {Object} context - Error context
   * @returns {Object} Recovery result
   */
  scene: (error, context) => {
    logger.warn('Scene error detected, switching to safe scene', {
      scene: context.scene,
      error: error.message,
    });

    return {
      strategy: 'fallback',
      action: 'switch',
      newScene: 'empty', // Safe fallback scene
    };
  },
};

/**
 * Error Reporter - Centralized error reporting
 */
class ErrorReporter {
  constructor(options = {}) {
    this.reportUrl = options.reportUrl;
    this.enabled = options.enabled !== false;
    this.batched = options.batched !== false;
    this.errorQueue = [];
  }

  /**
   * Report an error to external service
   * @param {Error} error - Error object
   * @param {Object} context - Error context
   * @returns {Promise<boolean>} True if reported successfully
   */
  async reportError(error, context = {}) {
    if (!this.enabled) {
      return false;
    }

    const report = {
      timestamp: Date.now(),
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      context,
    };

    if (this.batched) {
      this.errorQueue.push(report);
      return this.flushBatch();
    } else {
      return this.sendReport(report);
    }
  }

  /**
   * Flush batched error reports
   * @returns {Promise<boolean>} True if flushed successfully
   */
  async flushBatch() {
    if (this.errorQueue.length === 0) {
      return true;
    }

    const batch = [...this.errorQueue];
    this.errorQueue = [];

    return this.sendBatch(batch);
  }

  /**
   * Send error report to external service
   * @param {Object} report - Error report
   * @returns {Promise<boolean>} True if sent successfully
   */
  async sendReport(report) {
    try {
      if (!this.reportUrl) {
        logger.debug('No error report URL configured');
        return false;
      }

      const response = await fetch(this.reportUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(report),
      });

      if (response.ok) {
        logger.debug('Error report sent successfully');
        return true;
      } else {
        logger.warn('Error report failed', {
          status: response.status,
          statusText: response.statusText,
        });
        return false;
      }
    } catch (error) {
      logger.warn('Error report network error:', {
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Send batch of error reports
   * @param {Array} batch - Array of error reports
   * @returns {Promise<boolean>} True if sent successfully
   */
  async sendBatch(batch) {
    return this.sendReport({
      batch: true,
      reports: batch,
      count: batch.length,
    });
  }
}

module.exports = {
  ErrorHandler,
  ErrorRecovery,
  ErrorReporter,
};
