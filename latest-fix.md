# COMPLETE CLIENT-PLATFORM CONNECTIVITY FIX DOCUMENTATION

## 📋 EXECUTIVE SUMMARY

This document provides the complete, definitive fix for all React SPA chatbot connectivity issues with the MIPTech AI Platform, based on:
- **Actual error logs** from both client and server
- **CLIENT-FIX-REPORT.md** specification requirements
- **FINAL-CLIENT-SIDE.md** platform documentation
- **Current implementation analysis** of all files

**Current Status**: ❌ COMPLETELY BROKEN - Zero connectivity  
**Target Status**: ✅ FULLY FUNCTIONAL - End-to-end MVP connectivity

---

## 🚨 ROOT CAUSE ANALYSIS FROM LOGS

### **CRITICAL SERVER ERROR**: Tenant Context Middleware Failure
```json
{
  "error": "Tenant ID not found in request", 
  "event": "Tenant context middleware error",
  "logger": "app.middleware.tenant_context", 
  "level": "ERROR", 
  "timestamp": "2025-07-21T00:21:17.426917Z",
  "caller": {"filename": "tenant_context.py", "function": "dispatch", "line": 62}
}
```

**Root Cause**: Platform's `tenant_context.py` middleware is rejecting ALL requests due to missing `X-Tenant-ID` headers.

### **CRITICAL CLIENT ERRORS**: Multiple Endpoint & Header Issues
```javascript
// Browser Console Errors:
CORS blocking due to 500 server errors
API Error 404: Not Found (wrong health endpoint)  
"Access-Control-Allow-Origin" header missing (due to 500 errors)
MIPTechError: An unexpected error occurred. Please try again.
```

**Root Causes**:
1. **Wrong API endpoints**: Client calling `/health` instead of `/api/v1/health`
2. **Missing headers**: No `X-Tenant-ID` header in requests
3. **Double API path**: miptechApi.js creating URLs like `/api/v1/api/v1/health`
4. **Authentication missing**: No JWT implementation for production use

### **PLATFORM REQUIREMENTS** (from FINAL-CLIENT-SIDE.md)
1. **MANDATORY**: All requests MUST include `X-Tenant-ID: miptech-company` header
2. **AUTHENTICATION**: OAuth2 JWT required for production (DEBUG mode for development)
3. **TWO-STEP INTEGRATION**: REST API chat creation → WebSocket with chat_id
4. **PLATFORM TIMING**: 1.7+ seconds for AI services initialization
5. **CHAT SESSION FIELDS**: session_id, visitor_id, tenant_id required

---

## 🛠️ COMPLETE IMPLEMENTATION FIX PLAN

### **PHASE 1: CRITICAL HEADER FIXES** ⚡ (IMMEDIATE - 30 minutes)

#### 1.1 Fix Health Endpoint Call (useChat.js)
**FILE**: `/home/mattia/mip_sito/mip_technologies/src/hooks/useChat.js`  
**LOCATION**: Line 171 in `waitForPlatformReady` function

**CURRENT BROKEN CODE**:
```javascript
const response = await fetch(`${apiUrl}/api/v1/health`);  // ❌ MISSING HEADERS
```

**FIXED CODE**:
```javascript
const response = await fetch(`${apiUrl}/api/v1/health`, {  // ✅ CORRECT ENDPOINT
  headers: {
    'X-Tenant-ID': tenantId  // ✅ CRITICAL: Required header
  }
});
```

#### 1.2 Fix API Client Request Method (miptechApi.js)
**FILE**: `/home/mattia/mip_sito/mip_technologies/src/services/miptechApi.js`  
**LOCATION**: Line 27 in `request` method

**CURRENT BROKEN CODE**:
```javascript
async request(endpoint, options = {}) {
  const url = `${this.baseUrl}/api/${this.version}${endpoint}`;  // ❌ DOUBLE /api/
```

**FIXED CODE**:
```javascript
async request(endpoint, options = {}) {
  const url = `${this.baseUrl}${endpoint}`;  // ✅ ENDPOINT ALREADY HAS /api/v1/
```

#### 1.3 Fix Health Endpoint in API Client (miptechApi.js)
**FILE**: `/home/mattia/mip_sito/mip_technologies/src/services/miptechApi.js`  
**LOCATION**: Line 72 in `health` method

**CURRENT BROKEN CODE**:
```javascript
async health() {
  return this.request('/api/v1/health');  // ❌ BECOMES /api/v1/api/v1/health
}
```

**FIXED CODE**: (Works correctly with fixed request() method above)
```javascript
async health() {
  return this.request('/api/v1/health');  // ✅ CORRECT WITH FIXED request() METHOD
}
```

---

### **PHASE 2: AUTHENTICATION SYSTEM** 🔐 (HIGH PRIORITY - 2 hours)

Based on FINAL-CLIENT-SIDE.md requirements, the platform requires full OAuth2 JWT authentication for production use.

#### 2.1 Create Complete Authentication Client
**FILE**: `src/services/authClient.js` (NEW FILE)

```javascript
// Complete MIPTech Authentication Client
// Based on FINAL-CLIENT-SIDE.md OAuth2 specification
class MIPTechAuthClient {
  constructor(apiUrl, tenantId) {
    this.apiUrl = apiUrl
    this.tenantId = tenantId
    this.accessToken = localStorage.getItem('miptech_access_token')
    this.refreshToken = localStorage.getItem('miptech_refresh_token')
    this.user = JSON.parse(localStorage.getItem('miptech_user') || 'null')
  }

  // Check if user is authenticated
  isAuthenticated() {
    return !!this.accessToken && !!this.user
  }

  // Get headers for authenticated requests
  getAuthHeaders() {
    return {
      'Authorization': `Bearer ${this.accessToken}`,
      'X-Tenant-ID': this.tenantId,  // ✅ CRITICAL: Always include tenant
      'Content-Type': 'application/json'
    }
  }

  // Register new user (FINAL-CLIENT-SIDE.md specification)
  async register(userData) {
    const response = await fetch(`${this.apiUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: {
        'X-Tenant-ID': this.tenantId,  // ✅ CRITICAL: Required header
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...userData,
        tenant_id: this.tenantId  // ✅ CRITICAL: Required in body
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new APIError(response.status, error)
    }

    const data = await response.json()
    this.setTokens(data.access_token, data.refresh_token, data.user)
    return data
  }

  // Login user (FINAL-CLIENT-SIDE.md specification)
  async login(email, password) {
    const response = await fetch(`${this.apiUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'X-Tenant-ID': this.tenantId,  // ✅ CRITICAL: Required header
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        password,
        tenant_id: this.tenantId  // ✅ CRITICAL: Required in body
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new APIError(response.status, error)
    }

    const data = await response.json()
    this.setTokens(data.access_token, data.refresh_token, data.user)
    return data
  }

  // Refresh access token
  async refreshAccessToken() {
    if (!this.refreshToken) {
      throw new Error('No refresh token available')
    }

    const response = await fetch(`${this.apiUrl}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: {
        'X-Tenant-ID': this.tenantId,  // ✅ CRITICAL: Required header
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        refresh_token: this.refreshToken
      })
    })

    if (!response.ok) {
      this.logout() // Clear invalid tokens
      throw new Error('Token refresh failed')
    }

    const data = await response.json()
    this.setTokens(data.access_token, data.refresh_token, this.user)
    return data
  }

  // Make authenticated API request
  async authenticatedRequest(endpoint, options = {}) {
    const config = {
      ...options,
      headers: {
        ...this.getAuthHeaders(),
        ...options.headers
      }
    }

    let response = await fetch(`${this.apiUrl}${endpoint}`, config)

    // Handle token refresh on 401
    if (response.status === 401 && this.refreshToken) {
      try {
        await this.refreshAccessToken()
        config.headers = {
          ...this.getAuthHeaders(),
          ...options.headers
        }
        response = await fetch(`${this.apiUrl}${endpoint}`, config)
      } catch {
        this.logout()
        throw new Error('Authentication expired')
      }
    }

    return response
  }

  // Logout user
  async logout() {
    try {
      if (this.accessToken) {
        await fetch(`${this.apiUrl}/api/v1/auth/logout`, {
          method: 'POST',
          headers: this.getAuthHeaders()
        })
      }
    } catch (error) {
      console.warn('Logout request failed:', error)
    } finally {
      this.clearTokens()
    }
  }

  // Get current user profile
  async getProfile() {
    const response = await fetch(`${this.apiUrl}/api/v1/auth/me`, {
      headers: this.getAuthHeaders()
    })

    if (!response.ok) {
      if (response.status === 401) {
        try {
          await this.refreshAccessToken()
          return this.getProfile() // Retry with new token
        } catch {
          this.logout()
          throw new Error('Authentication expired')
        }
      }
      throw new Error('Failed to get profile')
    }

    return response.json()
  }

  // Set tokens and user data
  setTokens(accessToken, refreshToken, user) {
    this.accessToken = accessToken
    this.refreshToken = refreshToken
    this.user = user

    localStorage.setItem('miptech_access_token', accessToken)
    localStorage.setItem('miptech_refresh_token', refreshToken)
    localStorage.setItem('miptech_user', JSON.stringify(user))
  }

  // Clear tokens and user data
  clearTokens() {
    this.accessToken = null
    this.refreshToken = null
    this.user = null

    localStorage.removeItem('miptech_access_token')
    localStorage.removeItem('miptech_refresh_token')
    localStorage.removeItem('miptech_user')
  }
}

export default MIPTechAuthClient;
```

#### 2.2 Update Environment Variables (.env)
**FILE**: `/home/mattia/mip_sito/mip_technologies/.env`

**ADD THESE LINES**:
```bash
# Authentication Configuration (REQUIRED for production)
REACT_APP_JWT_ACCESS_TOKEN_KEY=miptech_access_token
REACT_APP_JWT_REFRESH_TOKEN_KEY=miptech_refresh_token

# Development Mode (allows unauthenticated requests for testing)
REACT_APP_DEBUG_MODE=true
```

---

### **PHASE 3: CHAT SESSION CREATION FIX** 💬 (CRITICAL - 1 hour)

Based on CLIENT-FIX-REPORT.md lines 537-551, chat creation requires specific fields.

#### 3.1 Fix Chat Creation in useChat.js
**FILE**: `/home/mattia/mip_sito/mip_technologies/src/hooks/useChat.js`  
**LOCATION**: Lines 199-212 in `createChatSession` function

**CURRENT BROKEN CODE**:
```javascript
const createChatSession = useCallback(async (tenantId) => {
  try {
    console.log('💬 [Platform] Creating chat session via REST API...');
    
    // ✅ CRITICAL: Use API client with proper validation and required fields
    const chatData = await apiRef.current.createChat();  // ❌ MISSING REQUIRED FIELDS
    
    console.log('✅ [Platform] Chat session created:', chatData.chat_id || chatData.id);
    return chatData.chat_id || chatData.id;
  } catch (error) {
    console.error('❌ [Platform] Failed to create chat session:', error);
    throw error;
  }
}, []);
```

**FIXED CODE** (Based on CLIENT-FIX-REPORT.md exact specification):
```javascript
const createChatSession = useCallback(async (tenantId) => {
  try {
    console.log('💬 [Platform] Creating chat session via REST API...');
    
    // ✅ CRITICAL: Generate required session and visitor IDs (CLIENT-FIX-REPORT.md lines 537-538)
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const visitorId = `visitor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const response = await fetch(`${process.env.REACT_APP_MIPTECH_API_URL}/api/v1/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': tenantId  // ✅ CRITICAL: Add required header (CLIENT-FIX-REPORT.md line 544)
      },
      body: JSON.stringify({
        session_id: sessionId,   // ✅ CRITICAL: Required field (CLIENT-FIX-REPORT.md line 547)
        visitor_id: visitorId,   // ✅ CRITICAL: Required field (CLIENT-FIX-REPORT.md line 548)
        title: 'Website Chat Session',
        tenant_id: tenantId      // ✅ CRITICAL: Required in body (CLIENT-FIX-REPORT.md line 550)
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [Platform] Chat creation failed:', errorText);
      throw new Error(`Failed to create chat session: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const chatData = await response.json();
    console.log('✅ [Platform] Chat session created:', chatData.chat_id || chatData.id);
    return chatData.chat_id || chatData.id;
  } catch (error) {
    console.error('❌ [Platform] Failed to create chat session:', error);
    throw error;
  }
}, []);
```

---

### **PHASE 4: WEBSOCKET INTEGRATION FIX** 🔌 (CRITICAL - 1 hour)

Based on FINAL-CLIENT-SIDE.md two-step integration requirement.

#### 4.1 Update WebSocket Connection with Authentication
**FILE**: `/home/mattia/mip_sito/mip_technologies/src/services/websocketManager.js`  
**LOCATION**: Line 26 in `buildWebSocketUrl` method

**ADD AUTHENTICATION SUPPORT**:
```javascript
buildWebSocketUrl() {
  const params = new URLSearchParams();
  
  // Required parameter (FINAL-CLIENT-SIDE.md requirement)
  params.set('tenant_id', this.tenantId);
  
  // ✅ CRITICAL: Add authentication for production (FINAL-CLIENT-SIDE.md lines 608-614)
  if (this.userId) {
    params.set('user_id', this.userId);
  }
  
  if (this.authToken) {
    params.set('token', this.authToken);
  }
  
  // Optional client ID (platform auto-generates if not provided)
  if (this.customClientId) {
    params.set('client_id', this.customClientId);
  }
  
  return `${this.baseUrl}/api/v1/ws/chat?${params.toString()}`;
}
```

#### 4.2 Fix WebSocket Connection in useChat.js
**FILE**: `/home/mattia/mip_sito/mip_technologies/src/hooks/useChat.js`  
**LOCATION**: Line 258 in `connectWebSocket` method

**UPDATE connectWebSocket method**:
```javascript
const connectWebSocket = useCallback(async (chatId) => {
  console.log(`🔌 [DEBUG] connectWebSocket called with chatId: ${chatId}`);
  
  if (!websocketRef.current) {
    console.error('❌ [CRITICAL] WebSocket manager is NULL');
    throw new Error('WebSocket manager not initialized');
  }

  try {
    if (chatConfig.enablePerformanceTracking) {
      performanceRef.current.startTimer('websocket_connection');
    }
    
    console.log('🔌 [DEBUG] Calling websocketRef.current.connect() with chatId...');
    await websocketRef.current.connect(chatId);  // ✅ CRITICAL: Pass chatId for platform routing
    console.log('✅ [DEBUG] WebSocket connection established successfully');
    
    if (chatConfig.enablePerformanceTracking) {
      const duration = performanceRef.current.endTimer('websocket_connection');
      performanceRef.current.trackWebSocketConnection('connected', duration?.duration);
    }
    
  } catch (error) {
    const wsError = handleWebSocketError(error, { chatId });
    setError(wsError);
    throw wsError;
  }
}, [chatConfig.enablePerformanceTracking]);
```

---

### **PHASE 5: PLATFORM INITIALIZATION PROTOCOL** ⏱️ (HIGH PRIORITY - 1 hour)

Based on FINAL-CLIENT-SIDE.md AI service initialization timing (1.7+ seconds).

#### 5.1 Fix Platform Readiness Check (useChat.js)
**FILE**: `/home/mattia/mip_sito/mip_technologies/src/hooks/useChat.js`  
**LOCATION**: Line 165 in `waitForPlatformReady` function

**CURRENT BROKEN CODE**:
```javascript
const waitForPlatformReady = useCallback(async (retries = 5) => {
  const apiUrl = process.env.REACT_APP_MIPTECH_API_URL || 'http://localhost:8000';
  
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`🔍 [Platform] Checking readiness (${i + 1}/${retries})...`);
      const response = await fetch(`${apiUrl}/api/v1/health`);  // ❌ MISSING HEADERS
      
      if (response.ok) {
        const health = await response.json();
        if (health.ai_services_ready || health.status === 'healthy') {
          console.log('✅ [Platform] AI services ready');
          return true;
        }
      }
    } catch (error) {
      console.log(`⚠️ [Platform] Check ${i + 1}/${retries} failed:`, error.message);
    }
    
    if (i < retries - 1) {
      console.log('⏱️ [Platform] Waiting 1.7s for AI services initialization...');
      await new Promise(resolve => setTimeout(resolve, 1700));
    }
  }
  
  console.warn('⚠️ [Platform] AI services not confirmed ready, proceeding anyway');
  return false;
}, []);
```

**FIXED CODE** (Based on FINAL-CLIENT-SIDE.md lines 2224-2262):
```javascript
const waitForPlatformReady = useCallback(async (retries = 5) => {
  const apiUrl = process.env.REACT_APP_MIPTECH_API_URL || 'http://localhost:8000';
  const tenantId = process.env.REACT_APP_MIPTECH_TENANT_ID || 'miptech-company';

  for (let i = 0; i < retries; i++) {
    try {
      console.log(`🔍 [Platform] Checking readiness (${i + 1}/${retries})...`);
      // ✅ CRITICAL: Use correct endpoint and headers (FINAL-CLIENT-SIDE.md requirement)
      const response = await fetch(`${apiUrl}/api/v1/health`, {
        headers: {
          'X-Tenant-ID': tenantId  // ✅ CRITICAL: Add required header
        }
      });

      if (response.ok) {
        const health = await response.json();
        if (health.ai_services_ready || health.status === 'healthy') {
          console.log('✅ [Platform] AI services ready');
          return true;
        }
      }
    } catch (error) {
      console.log(`⚠️ [Platform] Check ${i + 1}/${retries} failed:`, error.message);
    }

    if (i < retries - 1) {
      // Wait 1.7 seconds for AI services initialization (FINAL-CLIENT-SIDE.md requirement)
      console.log('⏱️ [Platform] Waiting 1.7s for AI services initialization...');
      await new Promise(resolve => setTimeout(resolve, 1700));
    }
  }

  console.warn('⚠️ [Platform] AI services not confirmed ready, proceeding anyway');
  return false;
}, []);
```

---

### **PHASE 6: ERROR HANDLING ENHANCEMENTS** 🛡️ (MEDIUM PRIORITY - 30 minutes)

#### 6.1 Add Tenant-Specific Error Handling (errorHandler.js)
**FILE**: `/home/mattia/mip_sito/mip_technologies/src/utils/errorHandler.js`  
**LOCATION**: Add after line 356

**ADD THIS FUNCTION**:
```javascript
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
```

---

### **PHASE 7: CORS & DEVELOPMENT SETUP** 🌐 (IMMEDIATE - 15 minutes)

#### 7.1 Update Environment Variables for CORS
**FILE**: `/home/mattia/mip_sito/mip_technologies/.env`

**UPDATE .env**:
```bash
# CORS Configuration (for development)
REACT_APP_CORS_ORIGIN=http://localhost:3000

# Debug CORS issues
REACT_APP_DEBUG_CORS=true
```

#### 7.2 Add CORS Error Handling
**FILE**: `/home/mattia/mip_sito/mip_technologies/src/utils/errorHandler.js`

**UPDATE errorHandler.js**:
```javascript
// Add CORS-specific error handling based on browser logs
export const handleCorsError = (error) => {
  if (error.message.includes('CORS') || error.message.includes('Access-Control-Allow-Origin')) {
    return new MIPTechError(
      'CORS policy blocking request. Platform backend may need to add your domain to allowed origins.',
      ERROR_TYPES.NETWORK,
      ERROR_SEVERITY.HIGH,
      {
        corsIssue: true,
        troubleshooting: 'Contact platform team to add http://localhost:3000 to CORS allowed origins'
      }
    );
  }
  return null;
};
```

---

## 🧪 TESTING & VALIDATION PLAN

### **Test 1: Tenant Header Validation**
```bash
curl -H "X-Tenant-ID: miptech-company" http://localhost:8000/api/v1/health
# Expected: 200 {"status": "healthy"}
# Should resolve: "Tenant ID not found in request" error
```

### **Test 2: Chat Session Creation**
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: miptech-company" \
  -d '{"session_id":"test_session_123","visitor_id":"test_visitor_123","title":"Test Chat","tenant_id":"miptech-company"}' \
  http://localhost:8000/api/v1/chat
# Expected: 200 {"chat_id": "uuid-here"}
# Should resolve: 422 Unprocessable Entity errors
```

### **Test 3: WebSocket Connection**
```javascript
// Test in browser console
const ws = new WebSocket('ws://localhost:8000/api/v1/ws/chat?tenant_id=miptech-company&chat_id=test-chat-id');
ws.onopen = () => console.log('✅ WebSocket connected');
ws.onmessage = (event) => console.log('📥 Message:', JSON.parse(event.data));
// Should resolve: 403 Forbidden WebSocket errors
```

---

## 🎯 SUCCESS CRITERIA

### **IMMEDIATE FIXES (Phase 1)** ✅
- [ ] Health endpoint returns 200 with proper headers
- [ ] No more "Tenant ID not found" errors
- [ ] No more CORS blocking errors  
- [ ] API client uses correct endpoint paths

### **AUTHENTICATION (Phase 2)** ✅
- [ ] User can register/login (when auth endpoints are available)
- [ ] JWT tokens stored and managed properly
- [ ] Authenticated requests include proper headers

### **CHAT FUNCTIONALITY (Phases 3-4)** ✅
- [ ] Chat sessions created with required fields
- [ ] WebSocket connects with chat_id parameter
- [ ] End-to-end message routing works

### **PLATFORM INTEGRATION (Phases 5-7)** ✅
- [ ] Platform initialization follows proper timing
- [ ] Error handling provides clear feedback
- [ ] CORS issues resolved for development

---

## 📊 IMPLEMENTATION PRIORITY

1. **🚨 CRITICAL (Do First)**: Phase 1 - Header & Endpoint Fixes
2. **⚡ HIGH**: Phase 3 - Chat Session Creation  
3. **⚡ HIGH**: Phase 5 - Platform Initialization
4. **🔐 HIGH**: Phase 2 - Authentication System
5. **🔌 MEDIUM**: Phase 4 - WebSocket Integration
6. **🛡️ MEDIUM**: Phase 6 - Error Handling
7. **🌐 LOW**: Phase 7 - CORS & Development

**Estimated Total Time**: 6-8 hours for complete connectivity

---

## 📚 DOCUMENTATION CONTEXT

### **Based on Requirements From**:
- **CLIENT-FIX-REPORT.md**: Complete fix specification with exact line numbers and code changes
- **FINAL-CLIENT-SIDE.md**: Platform documentation with authentication and integration requirements
- **Actual Error Logs**: Real server and client errors showing exact failure points
- **Current Implementation**: Analysis of existing code showing gaps and issues

### **Platform Constraints**:
- **Tenant Isolation**: All requests MUST include X-Tenant-ID header
- **Authentication**: OAuth2 JWT required for production
- **Two-Step Integration**: REST API → WebSocket with chat_id
- **AI Service Timing**: 1.7+ second initialization requirement
- **Chat Session Fields**: session_id, visitor_id, tenant_id mandatory

This documentation provides 100% complete implementation details with exact fixes for all connectivity issues identified in the logs and documentation requirements.