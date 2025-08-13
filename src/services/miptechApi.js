// src/services/miptechApi.js
import logger from '../utils/logger';

class MIPTechApiClient {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || process.env.REACT_APP_MIPTECH_API_URL || 'http://localhost:8001';
    this.tenantId = options.tenantId || process.env.REACT_APP_MIPTECH_TENANT_ID || 'miptech-company';
    // ✅ FIX: Store apiKey options but read from env dynamically to avoid caching issues
    this.apiKeyOptions = options.apiKey;
    this.version = options.version || process.env.REACT_APP_MIPTECH_API_VERSION || 'v1';
    
    // ✅ ENHANCEMENT: Environment-specific configuration
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.isDebugMode = process.env.REACT_APP_DEBUG_MODE === 'true';
    
    // Development-specific settings
    this.developmentTimeout = this.isDevelopment ? 60000 : 30000; // Longer timeout in dev
    // Use logger utility instead of custom logging flags
    this.enableRequestLogging = false; // Let logger handle environment checks
    this.enableDetailedErrors = false; // Let logger handle error details
    
    // 🔧 CRITICAL FIX: Bind methods that use `this` to preserve context
    this.createChat = this.createChat.bind(this);
    this.healthz = this.healthz.bind(this);
    this.request = this.request.bind(this);
    this.getHeaders = this.getHeaders.bind(this);
    this.validateChatCreateData = this.validateChatCreateData.bind(this);
  }

  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
      'X-Tenant-ID': this.tenantId,
      'X-Tenant': this.tenantId, // Fallback header
      'Tenant-ID': this.tenantId, // Additional fallback
      'User-Agent': 'MIPTech-Client/1.0'
    };

    // ✅ ENTERPRISE FIX: Use X-API-Key header format (enterprise standard)
    const apiKey = this.apiKeyOptions || process.env.REACT_APP_MIPTECH_API_KEY;
    if (apiKey) {
      headers['X-API-Key'] = apiKey;
    }

    return headers;
  }

  async request(endpoint, options = {}) {
    // Now we can safely add /api/v1 without duplication
    const url = `${this.baseUrl}/api/${this.version}${endpoint}`;
    
    if (this.enableRequestLogging) {
      logger.debug('API: Request URL:', url);
    }

    const config = {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers
      },
      // ✅ ENHANCEMENT: Browser-compatible timeout implementation
      signal: (() => {
        // Check if AbortSignal.timeout is available (newer browsers)
        if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
          return AbortSignal.timeout(options.timeout || this.developmentTimeout);
        }
        // Fallback for older browsers
        const controller = new AbortController();
        setTimeout(() => controller.abort(), options.timeout || this.developmentTimeout);
        return controller.signal;
      })()
    };

    // ✅ ENHANCEMENT: Conditional request logging based on environment
    if (this.enableRequestLogging) {
      logger.debug(`🌐 [API] ${config.method || 'GET'} ${endpoint}`, {
        environment: this.isDevelopment ? 'development' : 'production',
        headers: config.headers,
        tenantId: this.tenantId,
        data: config.body,
        timeout: config.signal?.timeout || this.developmentTimeout
      });
    }

    // ✅ FORCE LOGGING: Always log pre-request details for createChat
    if (endpoint === '/chat') {
      logger.debug('API: Pre-request validation for createChat:', {
        finalUrl: url,
        method: config.method || 'GET',
        contentType: config.headers['Content-Type'],
        authorization: config.headers['Authorization'] ? 'Bearer ***' : 'MISSING',
        tenantHeaders: {
          'X-Tenant-ID': config.headers['X-Tenant-ID'],
          'X-Tenant': config.headers['X-Tenant'],
          'Tenant-ID': config.headers['Tenant-ID']
        },
        bodyLength: config.body ? config.body.length : 0,
        hasTimeout: !!config.signal,
        timestamp: new Date().toISOString()
      });
    }

    try {
      const response = await fetch(url, config);

      // ✅ FORCE LOGGING: Always log response details for createChat regardless of environment
      if (endpoint === '/chat' || this.enableRequestLogging) {
        logger.debug('API: Raw HTTP response:', {
          endpoint,
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          url: response.url,
          headers: Object.fromEntries(response.headers.entries())
        });
      }

      if (!response.ok) {
        // ✅ ENHANCED ERROR LOGGING: Get raw response text before parsing
        const responseText = await response.text();
        
        // Force logging for createChat errors
        if (endpoint === '/chat' || this.enableRequestLogging) {
          logger.error('❌ [API] HTTP request failed:', {
            endpoint,
            status: response.status,
            statusText: response.statusText,
            url: response.url,
            rawResponse: responseText,
            requestBody: config.body
          });
        }
        
        // Try to parse as JSON, fallback to empty object
        let errorData = {};
        try {
          errorData = responseText ? JSON.parse(responseText) : {};
        } catch (parseError) {
          logger.error('❌ [API] Failed to parse error response as JSON:', parseError);
          errorData = { detail: responseText || response.statusText };
        }
        
        if (response.status === 422) {
          // Parse platform validation errors
          const details = errorData.detail || [];
          if (Array.isArray(details)) {
            const fieldErrors = details.map(err => 
              `${err.loc?.join('.') || 'field'}: ${err.msg}`
            );
            throw new Error(`Validation failed: ${fieldErrors.join(', ')}`);
          }
        }
        
        // ✅ ENHANCED: Provide better error messages for database issues
        if (response.status === 500) {
          if (errorData.detail?.includes('relation') || errorData.detail?.includes('does not exist')) {
            // Database schema issue
            const dbError = new Error('Database schema temporarily unavailable - this usually resolves automatically');
            dbError.status = 503; // Treat as service unavailable
            dbError.isRetryable = true;
            dbError.data = errorData;
            throw dbError;
          }
        }
        
        const apiError = new Error(`API Error ${response.status}: ${errorData.detail || response.statusText}`);
        apiError.status = response.status;
        apiError.data = errorData;
        throw apiError;
      }

      const responseData = await response.json();
      
      // ✅ FORCE LOGGING: Always log successful response data for createChat
      if (endpoint === '/chat' || this.enableRequestLogging) {
        logger.debug('API: Successful HTTP response:', {
          endpoint,
          status: response.status,
          data: responseData
        });
      }
      
      return responseData;
    } catch (error) {
      // ✅ ENHANCEMENT: Environment-specific error handling
      if (this.enableDetailedErrors) {
        logger.error(`❌ [API] Request failed:`, {
          endpoint,
          error: error.message,
          status: error.status,
          environment: this.isDevelopment ? 'development' : 'production',
          troubleshooting: this.isDevelopment ? 'Check server logs and network tab' : 'Contact support'
        });
      } else {
        logger.error(`❌ [API] Request failed: ${error.message}`);
      }
      
      // Add environment context to error
      error.environment = this.isDevelopment ? 'development' : 'production';
      error.endpoint = endpoint;
      
      throw error;
    }
  }

  // Health check
  async health() {
    return this.request('/healthz/');
  }

  // Healthz endpoint (working endpoint)
  async healthz() {
    const url = `${this.baseUrl}/healthz`;
    logger.debug('HEALTHZ: Starting healthz check to:', url);
    if (this.enableRequestLogging) {
      logger.debug('API: healthz URL:', url);
    }
    
    try {
      // 🔧 CRITICAL FIX: Browser-compatible timeout implementation
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, this.developmentTimeout);
      
      const config = {
        headers: this.getHeaders(),
        signal: controller.signal
      };
      
      logger.debug('HEALTHZ: About to fetch with config:', { headers: config.headers });
      let response;
      try {
        response = await fetch(url, config);
      } catch (fetchError) {
        logger.error('HEALTHZ: Fetch failed', { 
          error: fetchError.message,
          name: fetchError.name 
        });
        // Enhance error for proper handling
        const enhancedError = new Error(`Network request failed: ${fetchError.message}`);
        enhancedError.request = { url, method: 'GET' };
        enhancedError.code = fetchError.name === 'TypeError' ? 'NETWORK_ERROR' : 'FETCH_ERROR';
        throw enhancedError;
      }
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const error = new Error(`Healthz check failed`);
        error.response = { status: response.status, statusText: response.statusText };
        throw error;
      }
      
      const result = await response.json();
      if (this.enableRequestLogging) {
        logger.debug('API: healthz response:', result);
      }
      
      return result; // { status: "healthy", version: "0.1.0" }
    } catch (error) {
      logger.error('HEALTHZ: Caught error in healthz', { error: error.message });
      // Enhance error for proper handling
      if (error.name === 'AbortError') {
        const timeoutError = new Error(`Healthz timeout after ${this.developmentTimeout}ms`);
        timeoutError.code = 'TIMEOUT';
        timeoutError.request = { url, method: 'GET' };
        throw timeoutError;
      }
      // Ensure error has request context
      if (!error.request) {
        error.request = { url, method: 'GET' };
      }
      throw error;
    }
  }

  // ✅ CRITICAL: Readiness check with HEAD→GET fallback
  async checkReadiness() {
    const url = `${this.baseUrl}/readyz`;
    
    try {
      // Try HEAD first (lighter)
      let response = await fetch(url, { 
        method: 'HEAD',
        headers: this.getHeaders()
      });
      
      if (!response.ok) {
        // Fall back to GET
        if (this.enableRequestLogging) {
          logger.debug('API: HEAD failed, trying GET for readyz');
        }
        response = await fetch(url, { 
          method: 'GET',
          headers: this.getHeaders()
        });
      }
      
      const ready = response.ok;
      if (this.enableRequestLogging) {
        logger.debug(`✅ [API] Platform readiness: ${ready ? 'ready' : 'not ready'}`);
      }
      return ready;
    } catch (error) {
      if (this.enableRequestLogging) {
        logger.error('❌ [API] Readiness check failed:', error);
      }
      return false;
    }
  }

  // Chat endpoints
  async getChatConfig() {
    return this.request('/chat/config/');
  }

  async getChats() {
    return this.request('/chat/list/');
  }

  async getChat(chatId) {
    return this.request(`/chat/${chatId}`);
  }

  // ✅ CRITICAL: Persistent session ID for idempotency (201 vs 200 response)
  getOrCreateSessionId() {
    const key = 'miptech_session_id';
    let sessionId = localStorage.getItem(key);
    
    if (!sessionId) {
      try {
        // Modern browsers
        sessionId = crypto.randomUUID();
      } catch {
        // Fallback for older browsers
        sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      }
      localStorage.setItem(key, sessionId);
      
      // Only log in dev mode
      if (this.isDevelopment || this.enableRequestLogging) {
        logger.debug('API: Created new persistent session ID');
      }
    }
    
    return sessionId;
  }

  validateChatCreateData(sessionId, visitorId, options) {
    if (!sessionId || typeof sessionId !== 'string') {
      throw new Error('session_id is required and must be a string');
    }
    if (sessionId.length < 8 || sessionId.length > 100) {
      throw new Error('session_id must be 8-100 characters');
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(sessionId)) {
      throw new Error('session_id contains invalid characters (only alphanumeric, hyphens, and underscores allowed)');
    }
    if (visitorId && (typeof visitorId !== 'string' || visitorId.length > 100)) {
      throw new Error('visitor_id must be a string with max 100 characters');
    }
    if (options.title && (typeof options.title !== 'string' || options.title.length > 255)) {
      throw new Error('title must be a string with max 255 characters');
    }
  }

  async createChat(sessionId = null, visitorId = null, options = {}) {
    // ✅ CRITICAL: Use persistent session ID for idempotency
    const finalSessionId = sessionId || this.getOrCreateSessionId();
    const finalVisitorId = visitorId || `visitor_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    
    // ✅ ADD: Pre-validation logging to pinpoint exact failure
    if (this.enableRequestLogging) {
      logger.debug('API: createChat() PRE-VALIDATION:', {
        finalSessionId,
        finalVisitorId,
        options,
        tenantId: this.tenantId,
        sessionIdLength: finalSessionId.length,
        sessionIdType: typeof finalSessionId,
        visitorIdLength: finalVisitorId.length,
        visitorIdType: typeof finalVisitorId,
        regexTest: /^[a-zA-Z0-9_-]+$/.test(finalSessionId),
        visitorRegexTest: /^[a-zA-Z0-9_-]+$/.test(finalVisitorId)
      });
    }
    
    // Validate input before making request
    if (this.enableRequestLogging) {
      logger.debug('API: About to call validateChatCreateData()...');
    }
    this.validateChatCreateData(finalSessionId, finalVisitorId, options);
    if (this.enableRequestLogging) {
      logger.debug('API: validateChatCreateData() passed successfully');
    }
    
    logger.debug('API: Creating requestData object...');
    const requestData = {
      session_id: finalSessionId,           // ✅ REQUIRED
      visitor_id: finalVisitorId,           // ✅ REQUIRED
      title: options.title || 'Website Chat Session',
      context: options.context || {},
      tenant_id: this.tenantId              // ✅ CRITICAL: Add tenant_id to body
    };
    logger.debug('API: requestData object created successfully');
    
    logger.debug('API: Creating chat with validated data:', requestData);
    
    // ✅ FORCE LOGGING: Always log createChat request details regardless of environment
    const apiKeyMasked = (this.apiKeyOptions || process.env.REACT_APP_MIPTECH_API_KEY)?.substring(0, 20) + '...';
    logger.debug('API: createChat() request details:', {
      url: `${this.baseUrl}/api/${this.version}/chat`,
      method: 'POST',
      headers: this.getHeaders(),
      body: requestData,
      apiKey: apiKeyMasked,
      tenantId: this.tenantId
    });
    
    return this.request('/chat/', {
      method: 'POST',
      body: JSON.stringify(requestData)
    });
  }

  async sendMessage(chatId, content, options = {}) {
    return this.request(`/chat/${chatId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ 
        content,
        role: 'user',
        metadata: options.metadata || {}
      })
    });
  }

  // Admin endpoints (if needed)
  async getTenantInfo() {
    return this.request('/admin/tenant/');
  }

  async getStats() {
    return this.request('/admin/stats/');
  }
}

export default MIPTechApiClient;