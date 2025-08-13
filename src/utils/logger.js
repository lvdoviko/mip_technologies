// Production-safe logger utility with data sanitization
class Logger {
  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.isDebugMode = process.env.REACT_APP_DEBUG_MODE === 'true';
    // In production, ONLY enable logging if explicitly set via env or query param
    this.enableLogging = this.isDevelopment || this.isDebugMode;
    
    // Check for debug query param (only in development)
    if (this.isDevelopment && typeof window !== 'undefined' && window.location.search.includes('debug=true')) {
      this.enableLogging = true;
    }
  }

  // Sanitize sensitive data from logs
  sanitize(data) {
    if (!data) return data;
    
    // Deep clone to avoid mutating original
    const sanitized = JSON.parse(JSON.stringify(data));
    
    // List of sensitive keys to mask
    const sensitiveKeys = [
      'token', 'jwt', 'authorization', 'auth',
      'apikey', 'api_key', 'x-api-key', 'secret',
      'password', 'session_id', 'sessionid',
      'chat_id', 'chatid', 'visitor_id', 'visitorid'
    ];
    
    const maskValue = (key, value) => {
      const lowerKey = key.toLowerCase();
      
      // Check if key contains sensitive terms
      if (sensitiveKeys.some(term => lowerKey.includes(term))) {
        if (typeof value === 'string' && value.length > 0) {
          // Show first 4 chars for debugging, mask the rest
          return value.length > 8 ? `${value.substring(0, 4)}...` : '***';
        }
        return '***';
      }
      
      // Mask JWT tokens in any field
      if (typeof value === 'string' && value.startsWith('eyJ')) {
        return 'JWT[***]';
      }
      
      // Mask UUIDs that might be sensitive
      if (typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
        return `UUID[${value.substring(0, 8)}...]`;
      }
      
      return value;
    };
    
    const recursiveSanitize = (obj, path = '') => {
      if (!obj || typeof obj !== 'object') return obj;
      
      for (const key in obj) {
        const currentPath = path ? `${path}.${key}` : key;
        
        if (obj[key] && typeof obj[key] === 'object') {
          recursiveSanitize(obj[key], currentPath);
        } else {
          obj[key] = maskValue(key, obj[key]);
        }
      }
      
      return obj;
    };
    
    return recursiveSanitize(sanitized);
  }

  // Format log message with timestamp and context
  format(level, message, data) {
    if (!this.enableLogging && level !== 'error') return null;
    
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    const prefix = {
      debug: '🔍',
      info: '📝',
      warn: '⚠️',
      error: '❌',
      success: '✅'
    }[level] || '📌';
    
    return {
      message: `${prefix} [${timestamp}] ${message}`,
      data: data ? this.sanitize(data) : undefined
    };
  }

  debug(message, data) {
    // NEVER show debug logs in production
    if (!this.isDevelopment) return;
    if (!this.enableLogging) return;
    const formatted = this.format('debug', message, data);
    if (formatted) {
      console.log(formatted.message, formatted.data || '');
    }
  }

  info(message, data) {
    // Info logs only in development or debug mode
    if (!this.isDevelopment && !this.isDebugMode) return;
    if (!this.enableLogging) return;
    const formatted = this.format('info', message, data);
    if (formatted) {
      console.info(formatted.message, formatted.data || '');
    }
  }

  warn(message, data) {
    // Warnings shown in production but sanitized
    const formatted = this.format('warn', message, data);
    if (formatted) {
      console.warn(formatted.message, formatted.data || '');
    }
  }

  error(message, data) {
    // Errors always shown but sanitized
    const formatted = this.format('error', message, data);
    if (formatted) {
      console.error(formatted.message, formatted.data || '');
    }
  }

  success(message, data) {
    // Success logs only in development
    if (!this.isDevelopment) return;
    if (!this.enableLogging) return;
    const formatted = this.format('success', message, data);
    if (formatted) {
      console.log(formatted.message, formatted.data || '');
    }
  }

  // Group related logs (development only)
  group(label) {
    if (!this.isDevelopment) return;
    if (!this.enableLogging) return;
    console.group(`📁 ${label}`);
  }

  groupEnd() {
    if (!this.isDevelopment) return;
    if (!this.enableLogging) return;
    console.groupEnd();
  }

  // Table display for structured data (development only)
  table(data, columns) {
    if (!this.isDevelopment) return;
    if (!this.enableLogging) return;
    const sanitized = this.sanitize(data);
    console.table(sanitized, columns);
  }

  // Performance timing (development only)
  time(label) {
    if (!this.isDevelopment) return;
    if (!this.enableLogging) return;
    console.time(`⏱️ ${label}`);
  }

  timeEnd(label) {
    if (!this.isDevelopment) return;
    if (!this.enableLogging) return;
    console.timeEnd(`⏱️ ${label}`);
  }
}

// Create singleton instance
const logger = new Logger();

export default logger;