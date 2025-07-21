// src/services/miptechApi.js
class MIPTechApiClient {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || process.env.REACT_APP_MIPTECH_API_URL || 'http://localhost:8000';
    this.tenantId = options.tenantId || process.env.REACT_APP_MIPTECH_TENANT_ID || 'miptech-company';
    this.apiKey = options.apiKey || process.env.REACT_APP_MIPTECH_API_KEY;
    this.version = options.version || process.env.REACT_APP_MIPTECH_API_VERSION || 'v1';
    
    // ✅ ENHANCEMENT: Environment-specific configuration
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.isDebugMode = process.env.REACT_APP_DEBUG_MODE === 'true';
    
    // Development-specific settings
    this.developmentTimeout = this.isDevelopment ? 60000 : 30000; // Longer timeout in dev
    this.enableRequestLogging = this.isDevelopment || this.isDebugMode;
    this.enableDetailedErrors = this.isDevelopment || this.isDebugMode;
  }

  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
      'X-Tenant-ID': this.tenantId,
      'X-Tenant': this.tenantId, // Fallback header
      'Tenant-ID': this.tenantId, // Additional fallback
      'User-Agent': 'MIPTech-Client/1.0'
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    return headers;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;  // ✅ ENDPOINT ALREADY HAS /api/v1/

    const config = {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers
      },
      // ✅ ENHANCEMENT: Environment-specific timeout
      signal: AbortSignal.timeout(options.timeout || this.developmentTimeout)
    };

    // ✅ ENHANCEMENT: Conditional request logging based on environment
    if (this.enableRequestLogging) {
      console.log(`🌐 [API] ${config.method || 'GET'} ${endpoint}`, {
        environment: this.isDevelopment ? 'development' : 'production',
        headers: config.headers,
        tenantId: this.tenantId,
        data: config.body,
        timeout: config.signal?.timeout || this.developmentTimeout
      });
    }

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
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
        
        const apiError = new Error(`API Error ${response.status}: ${errorData.detail || response.statusText}`);
        apiError.status = response.status;
        apiError.data = errorData;
        throw apiError;
      }

      return await response.json();
    } catch (error) {
      // ✅ ENHANCEMENT: Environment-specific error handling
      if (this.enableDetailedErrors) {
        console.error(`❌ [API] Request failed:`, {
          endpoint,
          error: error.message,
          status: error.status,
          environment: this.isDevelopment ? 'development' : 'production',
          troubleshooting: this.isDevelopment ? 'Check server logs and network tab' : 'Contact support'
        });
      } else {
        console.error(`❌ [API] Request failed: ${error.message}`);
      }
      
      // Add environment context to error
      error.environment = this.isDevelopment ? 'development' : 'production';
      error.endpoint = endpoint;
      
      throw error;
    }
  }

  // Health check
  async health() {
    return this.request('/api/v1/health');  // ✅ CORRECT WITH FIXED request() METHOD
  }

  // Chat endpoints
  async getChatConfig() {
    return this.request('/chat/config');
  }

  async getChats() {
    return this.request('/chat/list');
  }

  async getChat(chatId) {
    return this.request(`/chat/${chatId}`);
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
    // Generate IDs if not provided (for MVP implementation)
    const finalSessionId = sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const finalVisitorId = visitorId || `visitor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Validate input before making request
    this.validateChatCreateData(finalSessionId, finalVisitorId, options);
    
    const requestData = {
      session_id: finalSessionId,           // ✅ REQUIRED
      visitor_id: finalVisitorId,           // ✅ REQUIRED
      title: options.title || 'Website Chat Session',
      context: options.context || {},
      tenant_id: this.tenantId              // ✅ CRITICAL: Add tenant_id to body
    };
    
    console.log('🔍 [API] Creating chat with validated data:', requestData);
    
    return this.request('/api/v1/chat', {   // ✅ CRITICAL: Correct endpoint
      method: 'POST',
      body: JSON.stringify(requestData)
    });
  }

  async sendMessage(chatId, content, options = {}) {
    return this.request(`/api/v1/chat/${chatId}/messages`, {
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
    return this.request('/admin/tenant');
  }

  async getStats() {
    return this.request('/admin/stats');
  }
}

export default MIPTechApiClient;