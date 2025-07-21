// src/utils/errorHandler.js
import DOMPurify from 'dompurify';

/**
 * Error classifications for different error types
 */
export const ERROR_TYPES = {
  NETWORK: 'NETWORK',
  API: 'API',
  WEBSOCKET: 'WEBSOCKET',
  AUTHENTICATION: 'AUTHENTICATION',
  VALIDATION: 'VALIDATION',
  RATE_LIMIT: 'RATE_LIMIT',
  PERMISSION: 'PERMISSION',
  SYSTEM: 'SYSTEM',
  PLATFORM: 'PLATFORM',          // ✅ CRITICAL: Platform-specific errors
  TENANT: 'TENANT',              // ✅ CRITICAL: Tenant configuration errors
  CHAT_SESSION: 'CHAT_SESSION',  // ✅ CRITICAL: Chat session errors
  AI_SERVICE: 'AI_SERVICE',      // ✅ CRITICAL: AI service initialization errors
  UNKNOWN: 'UNKNOWN'
};

/**
 * Severity levels for errors
 */
export const ERROR_SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

/**
 * Custom error class for MIPTech platform errors
 */
export class MIPTechError extends Error {
  constructor(message, type = ERROR_TYPES.UNKNOWN, severity = ERROR_SEVERITY.MEDIUM, details = {}) {
    super(message);
    this.name = 'MIPTechError';
    this.type = type;
    this.severity = severity;
    this.details = details;
    this.timestamp = new Date().toISOString();
    this.userAgent = navigator.userAgent;
    this.url = window.location.href;
    
    // Maintain proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, MIPTechError);
    }
  }

  /**
   * Convert error to a safe object for logging
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      type: this.type,
      severity: this.severity,
      details: this.details,
      timestamp: this.timestamp,
      userAgent: this.userAgent,
      url: this.url,
      stack: this.stack
    };
  }
}

/**
 * Sanitize user input to prevent XSS attacks
 */
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true
  });
};

/**
 * Handle API errors with proper classification
 */
export const handleApiError = (error, context = {}) => {
  console.error('[API Error]', error, context);
  
  let errorType = ERROR_TYPES.UNKNOWN;
  let severity = ERROR_SEVERITY.MEDIUM;
  let userMessage = 'An error occurred. Please try again.';
  
  if (error.response) {
    // Server responded with error status
    const { status, data } = error.response;
    
    switch (status) {
      case 400:
        errorType = ERROR_TYPES.VALIDATION;
        severity = ERROR_SEVERITY.LOW;
        userMessage = 'Invalid request. Please check your input.';
        break;
      case 401:
        errorType = ERROR_TYPES.AUTHENTICATION;
        severity = ERROR_SEVERITY.HIGH;
        userMessage = 'Authentication required. Please refresh the page.';
        break;
      case 403:
        errorType = ERROR_TYPES.PERMISSION;
        severity = ERROR_SEVERITY.HIGH;
        userMessage = 'Access denied. You may not have permission for this action.';
        break;
      case 404:
        errorType = ERROR_TYPES.API;
        severity = ERROR_SEVERITY.MEDIUM;
        userMessage = 'Service not found. Please try again later.';
        break;
      case 422:
        errorType = ERROR_TYPES.VALIDATION;
        severity = ERROR_SEVERITY.MEDIUM;
        // ✅ CRITICAL: Platform-specific 422 error handling
        if (data?.detail && Array.isArray(data.detail)) {
          const fieldErrors = data.detail.map(err => 
            `${err.loc?.join('.') || 'field'}: ${err.msg}`
          ).join(', ');
          userMessage = `Validation failed: ${fieldErrors}`;
        } else if (data?.detail && typeof data.detail === 'string') {
          if (data.detail.includes('tenant')) {
            errorType = ERROR_TYPES.TENANT;
            userMessage = 'Tenant configuration error. Please check your setup.';
          } else if (data.detail.includes('session_id') || data.detail.includes('visitor_id')) {
            errorType = ERROR_TYPES.CHAT_SESSION;
            userMessage = 'Chat session error. Please refresh and try again.';
          } else {
            userMessage = `Platform error: ${data.detail}`;
          }
        } else {
          userMessage = 'Request validation failed. Please check your input.';
        }
        break;
      case 429:
        errorType = ERROR_TYPES.RATE_LIMIT;
        severity = ERROR_SEVERITY.HIGH;
        userMessage = 'Rate limit exceeded. Please wait a moment and try again.';
        break;
      case 500:
      case 502:
      case 503:
      case 504:
        errorType = ERROR_TYPES.SYSTEM;
        severity = ERROR_SEVERITY.CRITICAL;
        userMessage = 'Server error. Please try again later.';
        break;
      default:
        errorType = ERROR_TYPES.API;
        userMessage = data?.message || 'An error occurred. Please try again.';
    }
  } else if (error.request) {
    // Request was made but no response received
    errorType = ERROR_TYPES.NETWORK;
    severity = ERROR_SEVERITY.HIGH;
    userMessage = 'Network error. Please check your connection and try again.';
  } else {
    // Something else happened
    errorType = ERROR_TYPES.UNKNOWN;
    severity = ERROR_SEVERITY.MEDIUM;
    userMessage = 'An unexpected error occurred. Please try again.';
  }
  
  const mipError = new MIPTechError(
    sanitizeInput(userMessage),
    errorType,
    severity,
    {
      originalError: error.message,
      context: sanitizeInput(JSON.stringify(context)),
      status: error.response?.status,
      data: error.response?.data
    }
  );
  
  // Log error for monitoring
  logError(mipError);
  
  return mipError;
};

/**
 * Handle WebSocket errors with proper classification
 */
export const handleWebSocketError = (error, context = {}) => {
  // Check if this is actually a health check error that shouldn't be treated as WebSocket error
  if (error.details?.isolated || 
      error.details?.skipGlobalErrorHandler ||
      error.message?.includes('Health endpoint') ||
      error.message?.includes('health circuit breaker')) {
    
    // Log but don't treat as WebSocket error
    if (process.env.REACT_APP_DEBUG_API === 'true') {
      console.info('[Error Handler] Health check error filtered out of WebSocket error handling:', error.message);
    }
    
    return new MIPTechError(
      'Health check unavailable',
      ERROR_TYPES.API,
      ERROR_SEVERITY.LOW,
      { ...context, isolated: true, skipGlobalErrorHandler: true }
    );
  }
  
  console.error('[WebSocket Error]', error, context);
  
  let errorType = ERROR_TYPES.WEBSOCKET;
  let severity = ERROR_SEVERITY.MEDIUM;
  let userMessage = 'Connection error. Attempting to reconnect...';
  
  if (error.code) {
    switch (error.code) {
      case 1000:
        severity = ERROR_SEVERITY.LOW;
        userMessage = 'Connection closed normally.';
        break;
      case 1001:
        severity = ERROR_SEVERITY.MEDIUM;
        userMessage = 'Connection lost. Attempting to reconnect...';
        break;
      case 1006:
        severity = ERROR_SEVERITY.HIGH;
        userMessage = 'Connection closed unexpectedly. Attempting to reconnect...';
        break;
      case 1011:
        severity = ERROR_SEVERITY.CRITICAL;
        errorType = ERROR_TYPES.SYSTEM;
        userMessage = 'Server error. Please refresh the page if issues persist.';
        break;
      case 4003:
        severity = ERROR_SEVERITY.HIGH;
        errorType = ERROR_TYPES.RATE_LIMIT;
        userMessage = 'Rate limit exceeded. Connection will retry automatically.';
        break;
      case 4004:
        severity = ERROR_SEVERITY.CRITICAL;
        errorType = ERROR_TYPES.TENANT;
        userMessage = 'Tenant authentication failed. Please check your configuration.';
        break;
      case 4005:
        severity = ERROR_SEVERITY.MEDIUM;
        errorType = ERROR_TYPES.CHAT_SESSION;
        userMessage = 'Chat session invalid. Please refresh the page.';
        break;
      case 4006:
        severity = ERROR_SEVERITY.MEDIUM;
        errorType = ERROR_TYPES.AI_SERVICE;
        userMessage = 'AI services are initializing. Please wait...';
        break;
      default:
        userMessage = 'Connection error. Attempting to reconnect...';
    }
  }
  
  const mipError = new MIPTechError(
    sanitizeInput(userMessage),
    errorType,
    severity,
    {
      originalError: error.message,
      context: sanitizeInput(JSON.stringify(context)),
      code: error.code,
      reason: error.reason
    }
  );
  
  logError(mipError);
  
  return mipError;
};

/**
 * Handle platform-specific errors with detailed context
 * ✅ CRITICAL: Platform-aware error handling for MIPTech AI Platform
 */
export const handlePlatformError = (error, context = {}) => {
  console.error('[Platform Error]', error, context);
  
  let errorType = ERROR_TYPES.PLATFORM;
  let severity = ERROR_SEVERITY.MEDIUM;
  let userMessage = 'Platform error occurred. Please try again.';
  
  // Handle specific platform error patterns
  if (error.message) {
    const message = error.message.toLowerCase();
    
    if (message.includes('tenant') || message.includes('tenant_id')) {
      errorType = ERROR_TYPES.TENANT;
      severity = ERROR_SEVERITY.HIGH;
      userMessage = 'Tenant configuration error. Please check your setup.';
    } else if (message.includes('session_id') || message.includes('visitor_id') || message.includes('chat_id')) {
      errorType = ERROR_TYPES.CHAT_SESSION;
      severity = ERROR_SEVERITY.MEDIUM;
      userMessage = 'Chat session error. Please refresh and try again.';
    } else if (message.includes('ai service') || message.includes('vector database') || message.includes('llm')) {
      errorType = ERROR_TYPES.AI_SERVICE;
      severity = ERROR_SEVERITY.MEDIUM;
      userMessage = 'AI services are initializing. Please wait a moment...';
    } else if (message.includes('health') && message.includes('404')) {
      errorType = ERROR_TYPES.API;
      severity = ERROR_SEVERITY.LOW;
      userMessage = 'Platform health check unavailable. Connection may still work.';
    } else if (message.includes('connection timeout') || message.includes('platform may be starting')) {
      errorType = ERROR_TYPES.PLATFORM;
      severity = ERROR_SEVERITY.MEDIUM;
      userMessage = 'Platform is starting up. Please wait a moment and try again.';
    }
  }
  
  // Handle HTTP status codes from platform responses
  if (error.status || context.status) {
    const status = error.status || context.status;
    switch (status) {
      case 422:
        errorType = ERROR_TYPES.VALIDATION;
        severity = ERROR_SEVERITY.MEDIUM;
        userMessage = 'Platform validation failed. Please check your request.';
        break;
      case 403:
        errorType = ERROR_TYPES.TENANT;
        severity = ERROR_SEVERITY.HIGH;
        userMessage = 'Tenant access denied. Please check your configuration.';
        break;
      case 503:
        errorType = ERROR_TYPES.AI_SERVICE;
        severity = ERROR_SEVERITY.MEDIUM;
        userMessage = 'AI services are temporarily unavailable. Please try again shortly.';
        break;
    }
  }
  
  const mipError = new MIPTechError(
    sanitizeInput(userMessage),
    errorType,
    severity,
    {
      originalError: error.message,
      context: sanitizeInput(JSON.stringify(context)),
      platform: 'miptech-ai',
      timestamp: new Date().toISOString(),
      status: error.status || context.status,
      details: error.details || context.details
    }
  );
  
  logError(mipError);
  
  return mipError;
};

/**
 * Handle tenant context errors specifically
 * Based on actual log errors: "Tenant ID not found in request"
 */
export const handleTenantError = (error, context = {}) => {
  console.error('[Tenant Error]', error, context);
  
  let errorType = ERROR_TYPES.TENANT;
  let severity = ERROR_SEVERITY.HIGH;
  let userMessage = 'Tenant configuration error. Please check your setup.';
  
  // Handle specific tenant error patterns from logs
  if (error.message) {
    const message = error.message.toLowerCase();
    
    if (message.includes('tenant id not found')) {
      userMessage = 'Missing tenant ID in request headers. Please ensure X-Tenant-ID header is included.';
    } else if (message.includes('tenant not found')) {
      userMessage = 'Tenant not found in platform database. Please verify your tenant configuration.';
    } else if (message.includes('tenant access denied')) {
      userMessage = 'Access denied for tenant. Please check your permissions.';
    }
  }
  
  const mipError = new MIPTechError(
    sanitizeInput(userMessage),
    errorType,
    severity,
    {
      originalError: error.message,
      context: sanitizeInput(JSON.stringify(context)),
      platform: 'miptech-ai',
      timestamp: new Date().toISOString(),
      troubleshooting: 'Ensure REACT_APP_MIPTECH_TENANT_ID is set correctly and X-Tenant-ID header is included in all requests'
    }
  );
  
  logError(mipError);
  
  return mipError;
};

/**
 * Log errors to monitoring service
 */
export const logError = (error) => {
  // Send to console for development
  console.error('[MIPTech Error]', error.toJSON());
  
  // Send to monitoring service in production
  if (process.env.NODE_ENV === 'production') {
    // Example: Send to Sentry, LogRocket, or custom monitoring
    if (window.Sentry) {
      window.Sentry.captureException(error);
    }
    
    // Example: Send to analytics
    if (window.gtag) {
      window.gtag('event', 'exception', {
        description: error.message,
        fatal: error.severity === ERROR_SEVERITY.CRITICAL,
        custom_map: {
          error_type: error.type,
          error_severity: error.severity
        }
      });
    }
  }
};

/**
 * Create a retry mechanism with exponential backoff
 */
export const createRetryMechanism = (
  operation, 
  maxRetries = 3, 
  baseDelay = 1000,
  maxDelay = 10000
) => {
  return async (...args) => {
    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation(...args);
      } catch (error) {
        lastError = error;
        
        // Don't retry on certain error types
        if (error.type === ERROR_TYPES.AUTHENTICATION || 
            error.type === ERROR_TYPES.PERMISSION ||
            error.type === ERROR_TYPES.VALIDATION) {
          throw error;
        }
        
        // Don't retry on the last attempt
        if (attempt === maxRetries) {
          throw error;
        }
        
        // Calculate delay with exponential backoff
        const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
        
        console.warn(`[Retry] Attempt ${attempt + 1}/${maxRetries + 1} failed, retrying in ${delay}ms...`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError;
  };
};

/**
 * Circuit breaker pattern implementation
 */
export class CircuitBreaker {
  constructor(threshold = 5, timeout = 60000, monitoringPeriod = 10000) {
    this.failureThreshold = threshold;
    this.timeout = timeout;
    this.monitoringPeriod = monitoringPeriod;
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.nextAttemptTime = null;
  }

  async execute(operation) {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttemptTime) {
        throw new MIPTechError(
          'Circuit breaker is open. Service temporarily unavailable.',
          ERROR_TYPES.SYSTEM,
          ERROR_SEVERITY.HIGH,
          { circuitBreakerState: this.state }
        );
      } else {
        this.state = 'HALF_OPEN';
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
    this.nextAttemptTime = null;
  }

  onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttemptTime = Date.now() + this.timeout;
    }
  }

  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
      nextAttemptTime: this.nextAttemptTime
    };
  }
}

/**
 * Specialized circuit breaker for health check operations
 * Prevents health check failures from affecting other services
 */
export class HealthCircuitBreaker extends CircuitBreaker {
  constructor(threshold = 10, timeout = 30000, monitoringPeriod = 5000) {
    // Use more lenient settings for health checks
    super(threshold, timeout, monitoringPeriod);
    this.serviceName = 'HealthCheck';
  }

  async execute(operation) {
    try {
      return await super.execute(operation);
    } catch (error) {
      // For health check circuit breaker, we log but don't propagate critical errors
      if (error.message.includes('Circuit breaker is open')) {
        if (process.env.REACT_APP_DEBUG_API === 'true') {
          console.info('[HealthCircuitBreaker] Health endpoint temporarily unavailable:', error.message);
        }
        // Return a mock successful response to prevent downstream failures
        return { 
          connected: false, 
          error: 'Health endpoint circuit breaker open',
          circuitBreakerState: this.state,
          isolated: true // Mark as isolated error
        };
      }
      throw error;
    }
  }

  onFailure() {
    super.onFailure();
    
    if (process.env.REACT_APP_DEBUG_API === 'true') {
      console.info(`[HealthCircuitBreaker] Failure recorded. Count: ${this.failureCount}/${this.failureThreshold}, State: ${this.state}`);
    }
  }

  onSuccess() {
    super.onSuccess();
    
    if (process.env.REACT_APP_DEBUG_API === 'true') {
      console.info('[HealthCircuitBreaker] Health check successful. Circuit reset.');
    }
  }
}

/**
 * Rate limiter implementation
 */
export class RateLimiter {
  constructor(maxRequests = 10, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = [];
  }

  canMakeRequest() {
    const now = Date.now();
    
    // Remove requests outside the window
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    
    // Check if we can make a request
    if (this.requests.length >= this.maxRequests) {
      return false;
    }
    
    // Add this request
    this.requests.push(now);
    return true;
  }

  getTimeUntilNextRequest() {
    if (this.requests.length === 0) return 0;
    
    const oldestRequest = Math.min(...this.requests);
    const timeUntilReset = this.windowMs - (Date.now() - oldestRequest);
    
    return Math.max(0, timeUntilReset);
  }
}

export default {
  ERROR_TYPES,
  ERROR_SEVERITY,
  MIPTechError,
  sanitizeInput,
  handleApiError,
  handleWebSocketError,
  handlePlatformError,
  handleTenantError,
  logError,
  createRetryMechanism,
  CircuitBreaker,
  HealthCircuitBreaker,
  RateLimiter
};