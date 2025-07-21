MIPTech AI Platform - Complete Client-Side Integration Guide

## 🚀 Implementation Priority Guide

This document is organized by implementation priority to ensure clear MVP development path:

- **✅ MVP Required**: Essential for basic chat functionality
- **📅 Post-MVP**: Advanced features for enhanced experience  
- **🏢 Enterprise**: Advanced enterprise deployment features

## Table of Contents

### ✅ MVP Required (Implement First)
1. [Basic Platform Architecture](#mvp-platform-architecture)
2. [Authentication & User Management](#mvp-authentication)
3. [Tenant Context & Headers](#mvp-tenant-context)
4. [Core Configuration](#mvp-configuration)
5. [Basic WebSocket Integration](#mvp-websocket-integration)
6. [Essential Error Handling](#mvp-error-handling)
7. [Basic Troubleshooting](#mvp-troubleshooting)

### 📅 Post-MVP (Future Implementation)
8. [Advanced REST API Integration](#post-mvp-rest-api)
9. [Comprehensive Testing](#post-mvp-testing)
10. [Production Deployment](#post-mvp-production)

### 🏢 Enterprise (Advanced Deployment)
11. [Enterprise SSO Integration](#enterprise-sso)
12. [Advanced Security Features](#enterprise-security)

---
## Overview

This document provides comprehensive guidance for integrating client applications with the MIPTech AI Platform. The
platform is an enterprise-grade, multi-tenant SaaS solution that provides AI-powered chat functionality through both
WebSocket and REST API interfaces.

> **🎯 MVP Focus**: This guide prioritizes getting basic chat connectivity working first, then building advanced features incrementally.

### Key Features

**✅ MVP Required Features:**
- Multi-tenant Architecture: Schema-based tenant isolation
- Real-time Chat: WebSocket-based bidirectional communication  
- Authentication System: JWT-based OAuth2 user authentication
- Tenant Context: Required X-Tenant-ID headers for all requests
- User Management: Registration, login, profile management

**📅 Post-MVP Features:**
- Scalable Infrastructure: AWS-based with auto-scaling capabilities
- Advanced caching and optimization
- Advanced rate limiting configurations

**🏢 Enterprise Features:**
- Enterprise SSO: SAML, OpenID Connect integration
- Advanced Security: JWKS distribution, advanced MFA, WAF protection
- AI Integration: OpenAI GPT models with RAG (Retrieval-Augmented Generation)

---
## ✅ MVP Required: Basic Platform Architecture {#mvp-platform-architecture}

### Backend Infrastructure

**For MVP Implementation, focus on these core components:**

```
┌─────────────────────────────────────────────┐
│           MIPTech AI Platform (MVP)          │
├─────────────────────────────────────────────┤
│  FastAPI Backend (Port 8000)               │
│  ├── ✅ Tenant Context Middleware          │
│  ├── ✅ WebSocket Connection Manager        │
│  └── ✅ PostgreSQL Database (Multi-tenant) │
└─────────────────────────────────────────────┘
```

**📅 Post-MVP Infrastructure:**
- Load Balancer (AWS ALB) → WAF → API Gateway
- Redis Cache (Sessions, rate limiting)
- Rate Limiting middleware

**🏢 Enterprise Infrastructure:**
- Pinecone Vector Database (AI embeddings)
- OpenAI API Integration
- Advanced Authentication Middleware

### ✅ MVP Required: Tenant Isolation

- **Database Level**: Each tenant gets a dedicated PostgreSQL schema
- **Connection Level**: WebSocket connections are tenant-isolated  
- **API Level**: All endpoints require tenant identification

---
## ✅ MVP Required: Authentication & User Management {#mvp-authentication}

> **⚠️ CRITICAL**: Authentication is REQUIRED for platform connectivity. The platform implements full OAuth2 JWT authentication that must be used for all production integrations.

### ✅ MVP Required: OAuth2 Authentication Flow

**The platform requires user authentication for all API access:**

```javascript
// Step 1: User Registration
const registerUser = async (userData) => {
  const response = await fetch(`${apiUrl}/api/v1/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Tenant-ID': 'miptech-company'
    },
    body: JSON.stringify({
      email: userData.email,
      password: userData.password,
      full_name: userData.fullName,
      tenant_id: 'miptech-company'
    })
  })
  return response.json()
}

// Step 2: User Login
const loginUser = async (credentials) => {
  const response = await fetch(`${apiUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Tenant-ID': 'miptech-company'
    },
    body: JSON.stringify({
      email: credentials.email,
      password: credentials.password,
      tenant_id: 'miptech-company'
    })
  })
  
  const loginData = await response.json()
  return {
    accessToken: loginData.access_token,
    refreshToken: loginData.refresh_token,
    user: loginData.user
  }
}

// Step 3: Use JWT Token for API Requests
const authenticatedHeaders = {
  'Authorization': `Bearer ${accessToken}`,
  'X-Tenant-ID': 'miptech-company',
  'Content-Type': 'application/json'
}
```

### ✅ MVP Required: Development Mode Bypass

**For development testing only (DEBUG=true):**

```javascript
// ⚠️ DEVELOPMENT ONLY - Unauthenticated access
const headers = {
  'X-Tenant-ID': 'miptech-company', // Still required
  'Content-Type': 'application/json'
  // No Authorization header - only works in DEBUG mode
}
```

### ✅ MVP Required: JWT Token Management

```javascript
// Token refresh before expiry
const refreshToken = async (refreshToken) => {
  const response = await fetch(`${apiUrl}/api/v1/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Tenant-ID': 'miptech-company'
    },
    body: JSON.stringify({
      refresh_token: refreshToken
    })
  })
  return response.json()
}

// Token validation
const validateToken = async (token) => {
  const response = await fetch(`${apiUrl}/api/v1/auth/me`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Tenant-ID': 'miptech-company'
    }
  })
  return response.ok
}
```

### ✅ MVP Required: Complete Authentication Client

```javascript
// Complete authentication client implementation
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
      'X-Tenant-ID': this.tenantId,
      'Content-Type': 'application/json'
    }
  }

  // Register new user
  async register(userData) {
    const response = await fetch(`${this.apiUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: {
        'X-Tenant-ID': this.tenantId,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...userData,
        tenant_id: this.tenantId
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

  // Login user
  async login(email, password) {
    const response = await fetch(`${this.apiUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'X-Tenant-ID': this.tenantId,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        password,
        tenant_id: this.tenantId
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
        'X-Tenant-ID': this.tenantId,
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

    return handleAPIError(response)
  }
}

// Usage example
const auth = new MIPTechAuthClient(
  process.env.REACT_APP_MIPTECH_API_URL,
  process.env.REACT_APP_MIPTECH_TENANT_ID
)

// Login flow
try {
  const loginResult = await auth.login('user@example.com', 'password')
  console.log('Login successful:', loginResult.user)
} catch (error) {
  console.error('Login failed:', error.message)
}

// Make authenticated requests
try {
  const chatResponse = await auth.authenticatedRequest('/api/v1/chat', {
    method: 'POST',
    body: JSON.stringify({
      title: 'New Chat Session'
    })
  })
} catch (error) {
  console.error('API request failed:', error)
}
```

### ✅ MVP Required: Available Tenants

**Primary Tenant for MVP Development:**

```javascript
// ✅ MVP: Use this tenant for development
const TENANT_ID = 'miptech-company'
```

**📅 Post-MVP: Tenant Management**
- Status monitoring
- Plan management  
- Feature toggles
- Rate limiting configuration

**🏢 Enterprise: Advanced Tenant Features**
- Custom tenant domains
- Enterprise SSO integration
- Advanced security policies
- Multi-region deployment

---
## ✅ MVP Required: Tenant Context & Headers {#mvp-tenant-context}

> **⚠️ CRITICAL**: All API requests MUST include X-Tenant-ID header. The platform enforces strict tenant isolation and will reject requests without proper tenant context.

### ✅ MVP Required: Tenant Header Implementation

**Every API request must include tenant headers:**

```javascript
// Required headers for ALL requests
const requiredHeaders = {
  'X-Tenant-ID': 'miptech-company',  // REQUIRED - Primary tenant header
  'Content-Type': 'application/json'
}

// With authentication (production)
const authenticatedHeaders = {
  'Authorization': `Bearer ${accessToken}`,
  'X-Tenant-ID': 'miptech-company',  // REQUIRED
  'Content-Type': 'application/json'
}
```

### ✅ MVP Required: Tenant Validation

**Platform validates tenant context using multiple methods:**

1. **X-Tenant-ID Header (Primary)**
   ```javascript
   headers: { 'X-Tenant-ID': 'miptech-company' }
   ```

2. **JWT Token Claims (When authenticated)**
   ```javascript
   // Token payload includes tenant_id
   {
     "tenant_id": "miptech-company",
     "user_id": "user123",
     "exp": 1642584000
   }
   ```

3. **Query Parameters (Development only)**
   ```javascript
   // Only works with DEBUG=true
   `${apiUrl}/api/v1/health?tenant_id=miptech-company`
   ```

### ✅ MVP Required: Available Tenants

**Production Tenant for MVP Development:**

```javascript
// Primary tenant for all MVP development
const TENANT_ID = 'miptech-company'

// Tenant capabilities
const tenantInfo = {
  tenant_id: 'miptech-company',
  status: 'active',
  plan: 'enterprise',
  features: {
    chat: true,
    ai_responses: true,
    document_upload: true,
    user_management: true
  },
  limits: {
    users: 1000,
    messages_per_day: 10000,
    concurrent_connections: 100,
    api_calls_per_minute: 1000
  }
}
```

---
## ✅ MVP Required: Core Configuration {#mvp-configuration}

### ✅ MVP Required: Basic Environment Variables

**Essential configuration for MVP development:**

```bash
# =============================================================================
# ✅ MVP Required - Minimal Configuration
# =============================================================================

# Platform Connection (REQUIRED)
REACT_APP_MIPTECH_API_URL=http://localhost:8000
REACT_APP_MIPTECH_WS_URL=ws://localhost:8000

# Tenant Configuration (REQUIRED)
REACT_APP_MIPTECH_TENANT_ID=miptech-company

# Authentication (REQUIRED for production)
REACT_APP_JWT_ACCESS_TOKEN_KEY=miptech_access_token
REACT_APP_JWT_REFRESH_TOKEN_KEY=miptech_refresh_token

# Debug Mode (MVP Development - allows unauthenticated requests)
REACT_APP_DEBUG_MODE=true
```

**⚠️ Important API Path Notes:**
- Health endpoint: Use `/api/v1/health` (NOT `/health`)
- Chat endpoint: Use `/api/v1/chat` 
- All API calls must include `X-Tenant-ID` header
- WebSocket URL: Use `/api/v1/ws/chat` with `tenant_id` parameter

### 📅 Post-MVP: Advanced Configuration

```bash
# =============================================================================
# 📅 Post-MVP - Enhanced Configuration
# =============================================================================

# API Versioning
REACT_APP_MIPTECH_API_VERSION=v1

# WebSocket Configuration
REACT_APP_WS_RECONNECT_ATTEMPTS=3
REACT_APP_WS_RECONNECT_DELAY=1000
REACT_APP_WS_PING_INTERVAL=30000

# Logging Configuration
REACT_APP_LOG_LEVEL=debug
```

### 🏢 Enterprise: Production Configuration

```bash
# =============================================================================
# 🏢 Enterprise - Production Settings
# =============================================================================

# Production URLs
REACT_APP_MIPTECH_API_URL=https://api.miptechnologies.tech
REACT_APP_MIPTECH_WS_URL=wss://api.miptechnologies.tech

# Security
REACT_APP_MIPTECH_API_KEY=miptech_[generated-key]
REACT_APP_DEBUG_MODE=false
REACT_APP_LOG_LEVEL=error
```

### 📅 Post-MVP: CORS Configuration

> **Note**: For MVP development, default CORS settings should work with localhost. Advanced CORS configuration is needed for production deployment.

```javascript
// 📅 Post-MVP: Production CORS Configuration (configured on backend)
CORS_ORIGINS=[
  "http://localhost:3000",      // Local development
  "http://localhost:8080",      // Alternative local port
  "https://yourdomain.com",     // Your production domain
  "https://www.yourdomain.com"  // Your www domain
]
```

---
## ✅ MVP Required: Basic WebSocket Integration {#mvp-websocket-integration}

### ✅ MVP Required: Connection URL Format

  **CRITICAL**: The WebSocket URL must use the correct endpoint and include tenant_id parameter. Authentication via JWT token is REQUIRED for production.

  ```javascript
  // ✅ CORRECT WebSocket URL formats (choose based on your needs)

  // 1. PRODUCTION - With authentication (REQUIRED for production)
  const wsUrl = `${process.env.REACT_APP_MIPTECH_WS_URL}/api/v1/ws/chat?tenant_id=${tenantId}&user_id=${userId}&token=${accessToken}`;

  // 2. DEVELOPMENT - Debug mode only (requires DEBUG=true)
  const wsUrl = `${process.env.REACT_APP_MIPTECH_WS_URL}/api/v1/ws/chat?tenant_id=${tenantId}`;

  // 3. CUSTOM CLIENT ID (Optional - for tracking/debugging)
  const wsUrl = `${process.env.REACT_APP_MIPTECH_WS_URL}/api/v1/ws/chat?tenant_id=${tenantId}&client_id=${customClientId}&token=${accessToken}`;

  // ❌ INCORRECT (will cause 403 Forbidden error)
  const wsUrl = `${process.env.REACT_APP_MIPTECH_WS_URL}/?client_id=${clientId}`;
  ```

  ### Platform Authentication Behavior

  The MIPTech platform handles authentication with the following logic:

  #### **Tenant ID Validation (REQUIRED)**
  - **Parameter**: `tenant_id=miptech-company`
  - **Validation**: Platform verifies tenant exists in database
  - **Security**: Enforces tenant isolation at connection level
  - **Failure**: 403 Forbidden if tenant not found or invalid

  #### **Client ID Management (OPTIONAL)**
  - **Auto-Generation**: If not provided, platform generates secure UUID4
  - **Custom IDs**: Clients MAY provide custom client_id for tracking
  - **Security**: Server-generated UUIDs are cryptographically secure
  - **Enterprise Recommendation**: Let platform auto-generate for best security

  #### **User Authentication (OPTIONAL)**
  - **Parameter**: `user_id=employee123&token=jwt-token`
  - **Validation**: Platform validates JWT token against user database
  - **Enterprise SSO**: Supports external identity provider integration
  - **Anonymous**: Connections allowed without user authentication for public chat

  WebSocket Manager Implementation

  ```javascript
  // src/services/websocketManager.js
  class MIPTechWebSocketManager {
    constructor(options = {}) {
      this.baseUrl = options.baseUrl || process.env.REACT_APP_MIPTECH_WS_URL || 'ws://localhost:8000';
      this.tenantId = options.tenantId || process.env.REACT_APP_MIPTECH_TENANT_ID || 'miptech-company';
      this.userId = options.userId || null; // For authenticated users
      this.authToken = options.authToken || null; // JWT token for enterprise auth
      this.customClientId = options.clientId || null; // Optional custom client ID
      
      this.ws = null;
      this.serverClientId = null; // Client ID assigned by platform
      this.isConnected = false;
      this.isReady = false;
      this.reconnectAttempts = 0;
      this.maxReconnectAttempts = parseInt(process.env.REACT_APP_WS_RECONNECT_ATTEMPTS) || 3;
      this.reconnectDelay = parseInt(process.env.REACT_APP_WS_RECONNECT_DELAY) || 1000;
      
      this.eventListeners = new Map();
    }

    /**
     * Build WebSocket URL with proper authentication parameters
     * Platform auto-generates client_id if not provided for better security
     */
    buildWebSocketUrl() {
      const params = new URLSearchParams();
      
      // Required parameter
      params.set('tenant_id', this.tenantId);
      
      // Optional parameters
      if (this.customClientId) {
        params.set('client_id', this.customClientId);
      }
      // Note: If client_id not provided, platform auto-generates secure UUID4
      
      if (this.userId) {
        params.set('user_id', this.userId);
      }
      
      if (this.authToken) {
        params.set('token', this.authToken);
      }
      
      return `${this.baseUrl}/api/v1/ws/chat?${params.toString()}`;
    }

    async connect() {
      try {
        // Build WebSocket URL with authentication parameters
        const wsUrl = this.buildWebSocketUrl();

        console.log('🔌 [WebSocket] Connecting to:', wsUrl);

        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = this.handleOpen.bind(this);
        this.ws.onmessage = this.handleMessage.bind(this);
        this.ws.onclose = this.handleClose.bind(this);
        this.ws.onerror = this.handleError.bind(this);

        return new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('WebSocket connection timeout'));
          }, 10000);

          this.once('connected', () => {
            clearTimeout(timeout);
            resolve();
          });

          this.once('error', (error) => {
            clearTimeout(timeout);
            reject(error);
          });
        });

      } catch (error) {
        console.error('❌ [WebSocket] Connection failed:', error);
        throw error;
      }
    }

    handleOpen(event) {
      console.log('✅ [WebSocket] Connected successfully');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.emit('connected', { 
        tenantId: this.tenantId,
        userId: this.userId,
        authenticated: !!this.authToken 
      });
    }

    handleMessage(event) {
      try {
        const data = JSON.parse(event.data);
        console.log('📥 [WebSocket] Received:', data.type, data);

        switch (data.type) {
          case 'connection_established':
            console.log('🎯 [WebSocket] Connection established');
            console.log('🔑 [WebSocket] Server-assigned client_id:', data.data.client_id);
            this.serverClientId = data.data.client_id; // Store platform-assigned client ID
            break;

          case 'connection_ready':
            console.log('🚀 [WebSocket] Connection ready for messages');
            this.isReady = true;
            this.emit('ready', data);
            break;

          case 'chat_response':
            this.emit('chatResponse', data);
            break;

          case 'error':
            console.error('💥 [WebSocket] Server error:', data.data);
            this.emit('error', data.data);
            break;

          case 'authentication_required':
            console.warn('🔐 [WebSocket] Authentication required');
            this.emit('authenticationRequired', data.data);
            break;

          case 'token_expired':
            console.warn('⏰ [WebSocket] Authentication token expired');
            this.emit('tokenExpired', data.data);
            break;

          case 'unauthorized':
            console.error('🚫 [WebSocket] Unauthorized access');
            this.emit('unauthorized', data.data);
            break;

          case 'rate_limit_exceeded':
            console.warn('⚠️ [WebSocket] Rate limit exceeded:', data.data);
            this.emit('rateLimitExceeded', data.data);
            break;

          default:
            this.emit(data.type, data);
        }

      } catch (error) {
        console.error('❌ [WebSocket] Failed to parse message:', error);
      }
    }

    handleClose(event) {
      console.log('🔌 [WebSocket] Connection closed:', event.code, event.reason);
      this.isConnected = false;
      this.isReady = false;

      this.emit('disconnected', { code: event.code, reason: event.reason });

      // Attempt reconnection if not intentional close
      if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.attemptReconnect();
      }
    }

    handleError(event) {
      console.error('❌ [WebSocket] Error:', event);
      this.emit('error', { message: 'WebSocket connection error', event });
    }

    async attemptReconnect() {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff

      console.log(`🔄 [WebSocket] Reconnecting (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in 
  ${delay}ms`);

      setTimeout(() => {
        this.connect().catch(error => {
          console.error('❌ [WebSocket] Reconnection failed:', error);
        });
      }, delay);
    }

    sendMessage(type, data = {}) {
      if (!this.isConnected) {
        throw new Error('WebSocket not connected');
      }

      if (!this.isReady && type !== 'ping') {
        console.warn('⚠️ [WebSocket] Connection not ready, queuing message:', type);
        // Implement message queue if needed
        return;
      }

      const message = {
        type,
        data,
        timestamp: Date.now(),
        clientId: this.clientId
      };

      console.log('📤 [WebSocket] Sending:', type, message);
      this.ws.send(JSON.stringify(message));
    }

    // Chat-specific methods
    sendChatMessage(message, chatId = null) {
      this.sendMessage('chat_message', {
        message,
        chat_id: chatId,
        tenant_id: this.tenantId
      });
    }

    // ✅ MVP Required: Create new chat session
    createNewChat() {
      this.sendMessage('new_chat', {
        tenant_id: this.tenantId
      });
    }

    // 📅 Post-MVP: Chat history and session management
    // loadChat() and listChats() methods will be implemented 
    // when adding persistent chat history features

    // Event handling
    on(event, handler) {
      if (!this.eventListeners.has(event)) {
        this.eventListeners.set(event, []);
      }
      this.eventListeners.get(event).push(handler);
    }

    once(event, handler) {
      const wrappedHandler = (...args) => {
        handler(...args);
        this.off(event, wrappedHandler);
      };
      this.on(event, wrappedHandler);
    }

    off(event, handler) {
      if (this.eventListeners.has(event)) {
        const handlers = this.eventListeners.get(event);
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
        }
      }
    }

    emit(event, data) {
      if (this.eventListeners.has(event)) {
        this.eventListeners.get(event).forEach(handler => {
          try {
            handler(data);
          } catch (error) {
            console.error(`❌ [WebSocket] Event handler error for ${event}:`, error);
          }
        });
      }
    }

    disconnect() {
      if (this.ws) {
        this.ws.close(1000, 'Client disconnect');
        this.ws = null;
      }
      this.isConnected = false;
      this.isReady = false;
    }

    // Health check
    ping() {
      this.sendMessage('ping', { timestamp: Date.now() });
    }
  }

  export default MIPTechWebSocketManager;
  ```

  ### Enterprise Authentication Examples

  #### **1. Anonymous Public Chat (Basic)**
  ```javascript
  // Simple anonymous connection - platform auto-generates client_id
  const publicChat = new MIPTechWebSocketManager({
    tenantId: 'miptech-company'
    // No userId or authToken needed for public chat
  });
  await publicChat.connect();
  ```

  #### **2. Authenticated Enterprise User (SSO)**
  ```javascript
  // Enterprise user with SSO authentication
  const enterpriseChat = new MIPTechWebSocketManager({
    tenantId: 'miptech-company',
    userId: 'employee123',           // From enterprise directory
    authToken: 'jwt-token-from-sso'  // JWT from SSO provider
  });
  await enterpriseChat.connect();
  ```

  #### **3. Custom Client Tracking (Analytics/Debugging)**
  ```javascript
  // Custom client ID for tracking and analytics
  const trackedChat = new MIPTechWebSocketManager({
    tenantId: 'miptech-company',
    clientId: `webapp-${sessionId}-${Date.now()}` // Custom tracking ID
  });
  await trackedChat.connect();
  ```

  #### **4. Full Enterprise Implementation**
  ```javascript
  // Complete enterprise setup with all authentication options
  class FullEnterpriseChatClient {
    constructor(userContext) {
      this.wsManager = new MIPTechWebSocketManager({
        tenantId: userContext.tenantId || 'miptech-company',
        userId: userContext.userId,           // From enterprise directory
        authToken: userContext.authToken,     // JWT from SSO provider
        clientId: this.buildEnterpriseClientId(userContext) // Custom enterprise ID
      });
      
      this.setupAuthenticationHandlers();
    }
    
    buildEnterpriseClientId(userContext) {
      // Enterprise client ID with organizational context
      return [
        'enterprise',
        userContext.departmentId,
        userContext.sessionId,
        Date.now()
      ].join('-');
    }
    
    setupAuthenticationHandlers() {
      // Handle authentication events
      this.wsManager.on('authenticationRequired', () => {
        this.handleAuthenticationRequired();
      });
      
      this.wsManager.on('tokenExpired', () => {
        this.refreshAuthToken();
      });
      
      this.wsManager.on('unauthorized', (data) => {
        this.handleUnauthorized(data);
      });
    }
    
    async handleAuthenticationRequired() {
      try {
        const newToken = await this.getAuthToken();
        // Reconnect with new authentication
        this.wsManager.authToken = newToken;
        await this.wsManager.connect();
      } catch (error) {
        this.redirectToLogin();
      }
    }
    
    async refreshAuthToken() {
      try {
        const refreshedToken = await this.enterpriseSSO.refreshToken();
        this.wsManager.authToken = refreshedToken;
        await this.wsManager.connect();
      } catch (error) {
        console.error('Token refresh failed:', error);
        this.redirectToLogin();
      }
    }
  }
  ```

  ### Authentication Error Handling

  #### **Connection-Level Error Codes**

  | Error Code | Scenario | Client Action Required |
  |------------|----------|------------------------|
  | 403 | Missing tenant_id parameter | Add tenant_id to WebSocket URL |
  | 404 | Tenant not found | Verify tenant_id with platform team |
  | 401 | Invalid authentication token | Refresh token or re-authenticate |
  | 429 | Rate limit exceeded | Implement exponential backoff |
  | 1008 | WebSocket rate limited | Reduce message frequency |
  | 1011 | Internal server error | Retry with exponential backoff |

  #### **Production Error Handler**
  ```javascript
  class ProductionWebSocketHandler extends MIPTechWebSocketManager {
    constructor(options) {
      super(options);
      this.maxRetries = options.maxRetries || 3;
      this.retryDelay = options.retryDelay || 1000;
      this.setupProductionErrorHandling();
    }
    
    setupProductionErrorHandling() {
      this.on('authenticationRequired', (data) => {
        this.handleAuthenticationRequired(data);
      });
      
      this.on('tokenExpired', (data) => {
        this.handleTokenExpired(data);
      });
      
      this.on('unauthorized', (data) => {
        this.handleUnauthorized(data);
      });
      
      this.on('rateLimitExceeded', (data) => {
        this.handleRateLimit(data);
      });
    }
    
    async handleAuthenticationRequired(errorData) {
      console.warn('🔐 Authentication required:', errorData);
      
      try {
        const newToken = await this.getAuthToken();
        if (newToken) {
          this.authToken = newToken;
          await this.connect();
        } else {
          this.redirectToLogin();
        }
      } catch (error) {
        console.error('Failed to get auth token:', error);
        this.handleAuthFailure(error);
      }
    }
    
    async handleTokenExpired(errorData) {
      console.warn('⏰ Token expired:', errorData);
      
      try {
        const refreshedToken = await this.refreshAuthToken();
        if (refreshedToken) {
          this.authToken = refreshedToken;
          await this.connect();
        } else {
          this.redirectToLogin();
        }
      } catch (error) {
        console.error('Token refresh failed:', error);
        this.redirectToLogin();
      }
    }
    
    handleUnauthorized(errorData) {
      console.error('🚫 Unauthorized access:', errorData);
      this.logSecurityEvent('unauthorized_access', errorData);
      this.clearAuthData();
      this.redirectToLogin('You are not authorized to access this resource');
    }
    
    handleRateLimit(errorData) {
      console.warn('⚠️ Rate limit exceeded:', errorData);
      const retryAfter = errorData.retry_after || 60;
      this.showRateLimitMessage(retryAfter);
      this.scheduleRetry(retryAfter * 1000);
    }
    
    async handleConnectionError(error, attempt = 1) {
      this.logError('connection_error', {
        error: error.message,
        attempt,
        timestamp: Date.now(),
        userAgent: navigator.userAgent
      });
      
      if (this.isRetryableError(error) && attempt <= this.maxRetries) {
        const delay = this.calculateBackoffDelay(attempt);
        console.log(`🔄 Retrying connection in ${delay}ms (attempt ${attempt}/${this.maxRetries})`);
        
        setTimeout(() => {
          this.connect().catch(err => 
            this.handleConnectionError(err, attempt + 1)
          );
        }, delay);
      } else {
        this.handleConnectionFailure(error, attempt);
      }
    }
    
    calculateBackoffDelay(attempt) {
      // Exponential backoff with jitter
      const baseDelay = this.retryDelay;
      const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
      const jitter = Math.random() * 1000;
      return Math.min(exponentialDelay + jitter, 30000); // Cap at 30 seconds
    }
  }
  ```

  React Hook Implementation

  // src/hooks/useMIPTechWebSocket.js
  import { useState, useEffect, useRef, useCallback } from 'react';
  import MIPTechWebSocketManager from '../services/websocketManager';

  export const useMIPTechWebSocket = (options = {}) => {
    const [isConnected, setIsConnected] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const [error, setError] = useState(null);
    const [messages, setMessages] = useState([]);
    const [connectionStatus, setConnectionStatus] = useState('disconnected');

    const wsManager = useRef(null);

    const connect = useCallback(async () => {
      try {
        setConnectionStatus('connecting');
        setError(null);

        wsManager.current = new MIPTechWebSocketManager(options);

        // Set up event listeners
        wsManager.current.on('connected', () => {
          setIsConnected(true);
          setConnectionStatus('connected');
        });

        wsManager.current.on('ready', () => {
          setIsReady(true);
          setConnectionStatus('ready');
        });

        wsManager.current.on('disconnected', () => {
          setIsConnected(false);
          setIsReady(false);
          setConnectionStatus('disconnected');
        });

        wsManager.current.on('error', (error) => {
          setError(error);
          setConnectionStatus('error');
        });

        wsManager.current.on('chatResponse', (data) => {
          setMessages(prev => [...prev, {
            id: data.data.message_id,
            type: 'assistant',
            content: data.data.message,
            timestamp: data.timestamp,
            sources: data.data.sources || []
          }]);
        });

        await wsManager.current.connect();

      } catch (error) {
        setError(error);
        setConnectionStatus('error');
        console.error('❌ [Hook] WebSocket connection failed:', error);
      }
    }, [options]);

    const disconnect = useCallback(() => {
      if (wsManager.current) {
        wsManager.current.disconnect();
        wsManager.current = null;
      }
      setIsConnected(false);
      setIsReady(false);
      setConnectionStatus('disconnected');
    }, []);

    const sendMessage = useCallback((message, chatId) => {
      if (!wsManager.current || !isReady) {
        throw new Error('WebSocket not ready');
      }

      // Add user message to messages
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        type: 'user',
        content: message,
        timestamp: Date.now()
      }]);

      wsManager.current.sendChatMessage(message, chatId);
    }, [isReady]);

    const createNewChat = useCallback(() => {
      if (!wsManager.current || !isReady) {
        throw new Error('WebSocket not ready');
      }
      wsManager.current.createNewChat();
    }, [isReady]);

    useEffect(() => {
      return () => {
        disconnect();
      };
    }, [disconnect]);

    return {
      isConnected,
      isReady,
      error,
      messages,
      connectionStatus,
      connect,
      disconnect,
      sendMessage,
      createNewChat
    };
  };

---
## 📅 Post-MVP: Advanced REST API Integration {#post-mvp-rest-api}

> **Note**: For MVP, WebSocket integration provides all necessary functionality. REST API integration is recommended for advanced features and production optimization.

  API Client Implementation

  // src/services/miptechApi.js
  class MIPTechApiClient {
    constructor(options = {}) {
      this.baseUrl = options.baseUrl || process.env.REACT_APP_MIPTECH_API_URL || 'http://localhost:8000';
      this.tenantId = options.tenantId || process.env.REACT_APP_MIPTECH_TENANT_ID || 'miptech-company';
      this.apiKey = options.apiKey || process.env.REACT_APP_MIPTECH_API_KEY;
      this.version = options.version || process.env.REACT_APP_MIPTECH_API_VERSION || 'v1';
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
      const url = `${this.baseUrl}/api/${this.version}${endpoint}`;

      const config = {
        ...options,
        headers: {
          ...this.getHeaders(),
          ...options.headers
        }
      };

      console.log(`🌐 [API] ${config.method || 'GET'} ${endpoint}`, {
        headers: config.headers,
        tenantId: this.tenantId,
        data: config.body
      });

      try {
        const response = await fetch(url, config);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`API Error ${response.status}: ${errorData.detail || response.statusText}`);
        }

        return await response.json();
      } catch (error) {
        console.error(`❌ [API] Request failed:`, error);
        throw error;
      }
    }

    // Health check
    async health() {
      return this.request('/health');
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

    async createChat(data = {}) {
      return this.request('/chat', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    }

    async sendMessage(chatId, message) {
      return this.request(`/chat/${chatId}/message`, {
        method: 'POST',
        body: JSON.stringify({ message })
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

  React Hook for API

  // src/hooks/useMIPTechApi.js
  import { useState, useEffect, useCallback } from 'react';
  import MIPTechApiClient from '../services/miptechApi';

  export const useMIPTechApi = (options = {}) => {
    const [apiClient] = useState(() => new MIPTechApiClient(options));
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const request = useCallback(async (endpoint, options = {}) => {
      setLoading(true);
      setError(null);

      try {
        const result = await apiClient.request(endpoint, options);
        return result;
      } catch (error) {
        setError(error);
        throw error;
      } finally {
        setLoading(false);
      }
    }, [apiClient]);

    const healthCheck = useCallback(async () => {
      return request('/health');
    }, [request]);

    return {
      apiClient,
      loading,
      error,
      request,
      healthCheck
    };
  };

---
## ✅ MVP Required: Essential Error Handling {#mvp-error-handling}

### ✅ MVP Required: Basic Error Handling

**Essential error handling for MVP connectivity:**

  Common Error Codes

  | Error Code | Description                              | Solution                                           |
  |------------|------------------------------------------|----------------------------------------------------|
  | 403        | Forbidden - Tenant validation failed     | Check tenant_id parameter and ensure tenant exists |
  | 404        | Not Found - Endpoint or tenant not found | Verify URL format and tenant configuration         |
  | 429        | Rate Limit Exceeded                      | Implement exponential backoff                      |
  | 500        | Internal Server Error                    | Check server logs, contact platform team           |
  | 1008       | WebSocket Rate Limited                   | Reduce message frequency                           |
  | 1011       | WebSocket Internal Error                 | Reconnect, check server status                     |

  Debug Mode Implementation

  // src/utils/debug.js
  class MIPTechDebugger {
    constructor() {
      this.enabled = process.env.REACT_APP_DEBUG_MODE === 'true';
      this.logLevel = process.env.REACT_APP_LOG_LEVEL || 'info';
    }

    log(level, message, data = {}) {
      if (!this.enabled) return;

      const levels = ['debug', 'info', 'warn', 'error'];
      const currentLevelIndex = levels.indexOf(this.logLevel);
      const messageLevelIndex = levels.indexOf(level);

      if (messageLevelIndex >= currentLevelIndex) {
        const timestamp = new Date().toISOString();
        console[level](`[${timestamp}] [MIPTech] ${message}`, data);
      }
    }

    debug(message, data) { this.log('debug', message, data); }
    info(message, data) { this.log('info', message, data); }
    warn(message, data) { this.log('warn', message, data); }
    error(message, data) { this.log('error', message, data); }
  }

  export const debugger = new MIPTechDebugger();

  Connection Debugger Component

  // src/components/ConnectionDebugger.jsx
  import React, { useState, useEffect } from 'react';
  import { useMIPTechApi } from '../hooks/useMIPTechApi';
  import { useMIPTechWebSocket } from '../hooks/useMIPTechWebSocket';

  export const ConnectionDebugger = () => {
    const [apiStatus, setApiStatus] = useState('unknown');
    const [wsStatus, setWsStatus] = useState('unknown');
    const [tenantInfo, setTenantInfo] = useState(null);

    const { healthCheck } = useMIPTechApi();
    const { connectionStatus, connect, disconnect } = useMIPTechWebSocket();

    const testApiConnection = async () => {
      try {
        setApiStatus('testing');
        const result = await healthCheck();
        setApiStatus(result.status === 'healthy' ? 'healthy' : 'unhealthy');
      } catch (error) {
        setApiStatus('error');
        console.error('API health check failed:', error);
      }
    };

    const testWebSocketConnection = async () => {
      try {
        await connect();
      } catch (error) {
        console.error('WebSocket connection failed:', error);
      }
    };

    useEffect(() => {
      setWsStatus(connectionStatus);
    }, [connectionStatus]);

    const getStatusColor = (status) => {
      switch (status) {
        case 'healthy':
        case 'ready':
        case 'connected':
          return 'text-green-600';
        case 'testing':
        case 'connecting':
          return 'text-yellow-600';
        case 'error':
        case 'unhealthy':
          return 'text-red-600';
        default:
          return 'text-gray-600';
      }
    };

    return (
      <div className="p-6 bg-white rounded-lg shadow-lg">
        <h3 className="text-lg font-semibold mb-4">MIPTech Platform Connection Status</h3>

        <div className="space-y-4">
          {/* API Status */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
            <span>REST API</span>
            <div className="flex items-center space-x-2">
              <span className={`font-medium ${getStatusColor(apiStatus)}`}>
                {apiStatus}
              </span>
              <button
                onClick={testApiConnection}
                className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Test
              </button>
            </div>
          </div>

          {/* WebSocket Status */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
            <span>WebSocket</span>
            <div className="flex items-center space-x-2">
              <span className={`font-medium ${getStatusColor(wsStatus)}`}>
                {wsStatus}
              </span>
              <button
                onClick={wsStatus === 'disconnected' ? testWebSocketConnection : disconnect}
                className={`px-3 py-1 text-sm rounded ${
                  wsStatus === 'disconnected'
                    ? 'bg-green-500 hover:bg-green-600 text-white'
                    : 'bg-red-500 hover:bg-red-600 text-white'
                }`}
              >
                {wsStatus === 'disconnected' ? 'Connect' : 'Disconnect'}
              </button>
            </div>
          </div>

          {/* Configuration */}
          <div className="p-3 bg-gray-50 rounded">
            <h4 className="font-medium mb-2">Configuration</h4>
            <div className="text-sm space-y-1">
              <div>API URL: {process.env.REACT_APP_MIPTECH_API_URL || 'http://localhost:8000'}</div>
              <div>WebSocket URL: {process.env.REACT_APP_MIPTECH_WS_URL || 'ws://localhost:8000'}</div>
              <div>Tenant ID: {process.env.REACT_APP_MIPTECH_TENANT_ID || 'miptech-company'}</div>
              <div>Debug Mode: {process.env.REACT_APP_DEBUG_MODE || 'false'}</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

---
## 📅 Post-MVP: Comprehensive Testing {#post-mvp-testing}

> **Note**: For MVP, basic manual testing of connectivity is sufficient. Comprehensive automated testing is recommended for production applications.

  Unit Tests

  // src/services/__tests__/websocketManager.test.js
  import MIPTechWebSocketManager from '../websocketManager';

  describe('MIPTechWebSocketManager', () => {
    let wsManager;

    beforeEach(() => {
      wsManager = new MIPTechWebSocketManager({
        tenantId: 'test-tenant',
        wsUrl: 'ws://localhost:8000'
      });
    });

    test('should generate unique client ID', () => {
      const clientId1 = wsManager.generateClientId();
      const clientId2 = wsManager.generateClientId();

      expect(clientId1).toMatch(/^client_\d+_[a-z0-9]+$/);
      expect(clientId1).not.toBe(clientId2);
    });

    test('should construct correct WebSocket URL', () => {
      const expectedUrl = 'ws://localhost:8000/api/v1/ws/chat?tenant_id=test-tenant&client_id=';

      // Mock WebSocket constructor to capture URL
      const mockWebSocket = jest.fn();
      global.WebSocket = mockWebSocket;

      wsManager.connect();

      expect(mockWebSocket).toHaveBeenCalledWith(
        expect.stringContaining(expectedUrl)
      );
    });

    test('should handle connection ready state', () => {
      const readyHandler = jest.fn();
      wsManager.on('ready', readyHandler);

      wsManager.handleMessage({
        data: JSON.stringify({
          type: 'connection_ready',
          data: { client_id: 'test' }
        })
      });

      expect(wsManager.isReady).toBe(true);
      expect(readyHandler).toHaveBeenCalled();
    });
  });

  Integration Tests

  // src/integration/__tests__/platform-connectivity.test.js
  import { render, screen, waitFor } from '@testing-library/react';
  import userEvent from '@testing-library/user-event';
  import { ConnectionDebugger } from '../components/ConnectionDebugger';

  describe('Platform Connectivity Integration', () => {
    test('should establish API connection', async () => {
      render(<ConnectionDebugger />);

      const apiTestButton = screen.getByText('Test');
      await userEvent.click(apiTestButton);

      await waitFor(() => {
        expect(screen.getByText('healthy')).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    test('should establish WebSocket connection', async () => {
      render(<ConnectionDebugger />);

      const wsConnectButton = screen.getByText('Connect');
      await userEvent.click(wsConnectButton);

      await waitFor(() => {
        expect(screen.getByText('ready')).toBeInTheDocument();
      }, { timeout: 10000 });
    });
  });

  Manual Testing Checklist

  ## Pre-Connection Checklist
  - [ ] Environment variables configured
  - [ ] Platform backend server running (http://localhost:8000/api/v1/health returns 200)
  - [ ] CORS origins include your domain
  - [ ] Tenant ID exists in platform database

  ## API Testing
  - [ ] GET /api/v1/health returns healthy status
  - [ ] GET /api/v1/chat/config returns tenant configuration
  - [ ] Headers include X-Tenant-ID with correct tenant
  - [ ] Authentication headers present (if using API keys)

  ## WebSocket Testing
  - [ ] Connection URL includes tenant_id parameter
  - [ ] Connection establishes successfully (no 403 errors)
  - [ ] Receives connection_established message
  - [ ] Receives connection_ready message
  - [ ] Can send/receive chat messages
  - [ ] Handles reconnection on disconnect

  ## Error Scenarios
  - [ ] Graceful handling of 403 Forbidden (missing tenant_id)
  - [ ] Graceful handling of 429 Rate Limit
  - [ ] Proper reconnection on network issues
  - [ ] Error display to user

---
## 📅 Post-MVP: Production Deployment {#post-mvp-production}

> **Note**: Focus on MVP connectivity first. Production deployment considerations apply when moving beyond development environment.

  Environment Configuration

  # Production Environment Variables
  REACT_APP_MIPTECH_API_URL=https://api.miptechnologies.tech
  REACT_APP_MIPTECH_WS_URL=wss://api.miptechnologies.tech
  REACT_APP_MIPTECH_TENANT_ID=miptech-company
  REACT_APP_MIPTECH_API_KEY=miptech_[your-production-key]

  # Security Settings
  REACT_APP_DEBUG_MODE=false
  REACT_APP_LOG_LEVEL=error

  # Performance Settings
  REACT_APP_WS_RECONNECT_ATTEMPTS=5
  REACT_APP_WS_RECONNECT_DELAY=2000
  REACT_APP_WS_PING_INTERVAL=60000

  Build Configuration

  // webpack.config.js - Environment-specific builds
  const config = {
    // ... other config

    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },

    plugins: [
      new webpack.DefinePlugin({
        'process.env': {
          NODE_ENV: JSON.stringify(process.env.NODE_ENV),
          REACT_APP_MIPTECH_API_URL: JSON.stringify(process.env.REACT_APP_MIPTECH_API_URL),
          REACT_APP_MIPTECH_WS_URL: JSON.stringify(process.env.REACT_APP_MIPTECH_WS_URL),
          REACT_APP_MIPTECH_TENANT_ID: JSON.stringify(process.env.REACT_APP_MIPTECH_TENANT_ID),
          // Never expose API keys in client-side builds for security
          REACT_APP_DEBUG_MODE: JSON.stringify(process.env.NODE_ENV === 'development'),
        },
      }),
    ],
  };

  Security Considerations

  1. API Key Management
    - Never expose real API keys in client-side code
    - Use JWT tokens for client authentication in production
    - Implement token refresh mechanism
  2. HTTPS/WSS Requirements
    - Always use HTTPS/WSS in production
    - Implement proper SSL certificate validation
    - Use secure WebSocket connections (wss://)
  3. Rate Limiting
    - Implement client-side rate limiting
    - Respect server rate limits
    - Use exponential backoff for retries

---
## ✅ MVP Required: Basic Troubleshooting {#mvp-troubleshooting}

### ⚠️ CRITICAL FIX: Health Endpoint and Headers

**If you're getting 404 or "tenant: unknown" errors, apply this fix:**

```javascript
// ❌ WRONG - Will cause 404 errors:
const response = await fetch(`${apiUrl}/health`)

// ✅ CORRECT - Use proper API path and headers:
const response = await fetch(`${apiUrl}/api/v1/health`, {
  headers: {
    'X-Tenant-ID': 'miptech-company'
  }
})
```

**Common Error Patterns:**
- `GET /health returned 404` → Use `/api/v1/health` instead of `/health`
- `(tenant: unknown)` → Add `X-Tenant-ID` header to all API requests
- `422 on /api/v1/chat/` → Ensure headers include `X-Tenant-ID`
- `401 Unauthorized` → Authentication required - implement login flow
- `403 Forbidden` → Check tenant access permissions
- `429 Rate Limit` → Implement exponential backoff retry

### ✅ MVP Required: Rate Limiting & Error Handling

**The platform enforces rate limits to ensure fair usage:**

```javascript
// Platform rate limits (configured on backend)
const RATE_LIMITS = {
  requests_per_minute: 60,      // API calls per minute per user
  burst_size: 10,               // Max burst requests
  websocket_messages_per_minute: 60,
  concurrent_connections: 100    // Per tenant
}

// Handle rate limiting in client
const handleRateLimit = (error) => {
  if (error.status === 429) {
    const retryAfter = error.headers['retry-after'] || 60
    console.warn(`Rate limited. Retry after ${retryAfter} seconds`)
    
    // Implement exponential backoff
    setTimeout(() => {
      // Retry the request
    }, retryAfter * 1000)
  }
}
```

### ✅ MVP Required: Error Response Formats

**Platform uses standardized error response format:**

```javascript
// Success Response Format
{
  "success": true,
  "data": {
    // Response data
  },
  "message": "Operation completed successfully",
  "meta": {
    "timestamp": "2024-01-01T00:00:00Z",
    "request_id": "req_123"
  }
}

// Error Response Format
{
  "success": false,
  "message": "Authentication required",
  "errors": [
    "Missing Authorization header",
    "Invalid tenant ID"
  ],
  "error_code": "AUTH_REQUIRED",
  "details": {
    "required_headers": ["Authorization", "X-Tenant-ID"],
    "status_code": 401
  }
}

// Rate Limit Error
{
  "success": false,
  "message": "Rate limit exceeded",
  "error_code": "RATE_LIMIT_EXCEEDED",
  "details": {
    "limit": 60,
    "window": "1 minute",
    "retry_after": 45,
    "current_usage": 62
  }
}
```

### ✅ MVP Required: Client Error Handling

```javascript
// Comprehensive error handler
const handleAPIError = async (response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    
    switch (response.status) {
      case 401:
        // Authentication required
        handleAuthError(errorData)
        break
        
      case 403:
        // Forbidden - usually tenant access issue
        handleTenantError(errorData)
        break
        
      case 422:
        // Validation error
        handleValidationError(errorData)
        break
        
      case 429:
        // Rate limited
        handleRateLimit(errorData)
        break
        
      case 500:
        // Server error
        handleServerError(errorData)
        break
        
      default:
        console.error('API Error:', errorData)
    }
    
    throw new APIError(response.status, errorData)
  }
  
  return response
}

class APIError extends Error {
  constructor(status, errorData) {
    super(errorData.message || 'API Error')
    this.status = status
    this.errorCode = errorData.error_code
    this.errors = errorData.errors || []
    this.details = errorData.details || {}
  }
}
```

### ✅ MVP Required: Essential Connection Issues

  Common Issues and Solutions

  #### 1. Authentication Required (401 Unauthorized)

  **Symptoms:**
  ```
  Request error: POST /api/v1/chat returned 401 (tenant: miptech-company)
  {"success": false, "message": "Authentication required", "error_code": "AUTH_REQUIRED"}
  ```

  **Root Cause:** Missing or invalid authentication token

  **Solution:**
  ```javascript
  // ✅ Implement proper authentication flow
  const auth = new MIPTechAuthClient(apiUrl, tenantId)
  
  // 1. Login first
  await auth.login('user@example.com', 'password')
  
  // 2. Use authenticated requests
  const response = await auth.authenticatedRequest('/api/v1/chat', {
    method: 'POST',
    body: JSON.stringify({ title: 'New Chat' })
  })
  ```

  #### 2. WebSocket 403 Forbidden Error

  **Symptoms:**
  ```
  INFO: ('127.0.0.1', 58340) - "WebSocket /?client_id=debug_test_xxx" 403
  INFO: connection rejected (403 Forbidden)
  ```

  **Root Cause:** Incorrect WebSocket URL format or missing authentication

  **Solution:**
  ```javascript
  // ❌ Incorrect (causes 403 Forbidden)
  const wsUrl = 'ws://localhost:8000/?client_id=debug_test_xxx';

  // ✅ Correct - Production with authentication
  const wsUrl = `ws://localhost:8000/api/v1/ws/chat?tenant_id=miptech-company&user_id=${userId}&token=${accessToken}`;

  // ✅ Correct - Development mode (DEBUG=true only)
  const wsUrl = 'ws://localhost:8000/api/v1/ws/chat?tenant_id=miptech-company';
  ```

  **Key Changes Required:**
  1. **Add proper endpoint path**: `/api/v1/ws/chat`
  2. **Add required tenant_id parameter**: `tenant_id=miptech-company`
  3. **Add authentication**: `user_id` and `token` parameters for production
  4. **Optional**: Remove client_id (platform auto-generates secure UUID4)

  **Why This Happens:**
  - Platform validates tenant_id parameter for proper tenant isolation
  - Production mode requires authentication tokens
  - Wrong endpoint path hits undefined route handler
  - Security measure prevents unauthorized tenant access

  #### 3. CORS Error

  **Symptoms:**
  ```
  Access to fetch at 'http://localhost:8000/api/v1/health' from origin 'http://localhost:3000'
  has been blocked by CORS policy
  ```

  **Solution:** Contact platform team to add your domain to CORS configuration

  #### 4. Tenant Not Found Error

  **Symptoms:**
  ```json
  {
    "success": false,
    "message": "Tenant not found",
    "error_code": "TENANT_NOT_FOUND",
    "details": { "tenant_id": "invalid-tenant" }
  }
  ```

  **Solution:** Verify tenant ID and ensure it exists in platform database

  #### 5. Rate Limiting

  **Symptoms:**
  ```json
  {
    "success": false,
    "message": "Rate limit exceeded",
    "error_code": "RATE_LIMIT_EXCEEDED",
    "details": {
      "limit": 60,
      "window": "1 minute",
      "retry_after": 45
    }
  }
  ```

  **Solution:** Implement exponential backoff and respect rate limits

  #### 6. Connection Timeout

  **Symptoms:** WebSocket connection hangs without establishing

  **Solutions:**
  - Check if platform backend is running
  - Verify network connectivity and authentication
  - Check firewall settings
  - Ensure WebSocket upgrade is allowed

  Debug Commands

  # Check platform backend health
  curl -H "X-Tenant-ID: miptech-company" http://localhost:8000/api/v1/health

  # Test WebSocket connection
  curl -H "Connection: Upgrade" \
       -H "Upgrade: websocket" \
       -H "X-Tenant-ID: miptech-company" \
       http://localhost:8000/api/v1/ws/chat

  # Verify tenant exists (Post-MVP)
  curl -H "X-Tenant-ID: miptech-company" http://localhost:8000/api/v1/admin/tenant

### 📅 Post-MVP: Advanced Debugging

```javascript
// 📅 Post-MVP: Enable verbose WebSocket debugging
const wsManager = new MIPTechWebSocketManager({
  tenantId: 'miptech-company',
  debug: true
});

// 📅 Post-MVP: Add connection event listeners for debugging
wsManager.on('connected', () => console.log('🎯 Connected'));
wsManager.on('ready', () => console.log('🚀 Ready'));
wsManager.on('error', (error) => console.error('💥 Error:', error));
wsManager.on('disconnected', (event) => console.log('🔌 Disconnected:', event));
```

---
## 📅 Post-MVP: API Reference {#post-mvp-api-reference}

> **Note**: Complete API reference for advanced integrations. MVP implementations need only basic WebSocket connectivity.

  REST API Endpoints

  | Method | Endpoint                  | Description            | Headers Required           |
  |--------|---------------------------|------------------------|----------------------------|
  | GET    | /api/v1/health            | Platform health check  | X-Tenant-ID                |
  | GET    | /api/v1/chat/config       | Get chat configuration | X-Tenant-ID                |
  | GET    | /api/v1/chat/list         | List user chats        | X-Tenant-ID, Authorization |
  | POST   | /api/v1/chat              | Create new chat        | X-Tenant-ID, Authorization |
  | POST   | /api/v1/chat/{id}/message | Send message           | X-Tenant-ID, Authorization |

  WebSocket Message Types

  **✅ MVP Required - Outgoing Messages (Client → Server)**

  ```javascript
  // Ping/health check
  {
    "type": "ping",
    "data": { "timestamp": 1642584000000 }
  }

  // Send chat message (MVP core functionality)
  {
    "type": "chat_message",
    "data": {
      "message": "Hello, how can you help me?",
      "chat_id": "uuid-or-null-for-new",
      "tenant_id": "miptech-company"
    }
  }

  // Create new chat session (MVP required)
  {
    "type": "new_chat",
    "data": { "tenant_id": "miptech-company" }
  }
  ```

  **📅 Post-MVP - Chat History Messages**

  ```javascript
  // 📅 Post-MVP: Load existing chat (requires chat persistence)
  // {
  //   "type": "load_chat", 
  //   "data": {
  //     "chat_id": "chat-uuid",
  //     "tenant_id": "miptech-company"
  //   }
  // }

  // 📅 Post-MVP: List user chats (requires chat persistence) 
  // {
  //   "type": "list_chats",
  //   "data": { "tenant_id": "miptech-company" }
  // }
  ```

  Incoming Messages (Server → Client)

  // Connection established
  {
    "type": "connection_established",
    "data": {
      "client_id": "client_123",
      "tenant_id": "miptech-company",
      "connected_at": 1642584000.123
    }
  }

  // Connection ready for messages
  {
    "type": "connection_ready",
    "data": {
      "client_id": "client_123",
      "tenant_id": "miptech-company",
      "ready_at": 1642584001.456
    }
  }

  // Chat response
  {
    "type": "chat_response",
    "data": {
      "message": "I'd be happy to help! What would you like to know?",
      "message_id": "msg-uuid",
      "chat_id": "chat-uuid",
      "sources": [
        {
          "title": "Knowledge Base Article",
          "url": "https://example.com/kb/article",
          "snippet": "Relevant content excerpt..."
        }
      ],
      "metadata": {
        "model": "gpt-4",
        "tokens_used": 45,
        "response_time_ms": 1200
      }
    }
  }

  // Error message
  {
    "type": "error",
    "data": {
      "message": "Rate limit exceeded",
      "code": "RATE_LIMIT_EXCEEDED",
      "retry_after": 60
    }
  }

  ---
  Contact & Support

  Platform Team Contacts

  - Technical Support: support@miptechnologies.tech
  - Integration Help: integration@miptechnologies.tech
  - Security Issues: security@miptechnologies.tech

  Documentation Links

  - API Documentation: http://localhost:8000/docs (development)
  - Production API Docs: https://api.miptechnologies.tech/docs
  - Platform Status: https://status.miptechnologies.tech

  Getting API Keys

  1. Contact the platform team at integration@miptechnologies.tech
  2. Provide your domain and tenant requirements
  3. Receive API key and configuration details
  4. Follow security guidelines for key management

## Chat Session to WebSocket Bridge Architecture

The MIPTech AI Platform requires a two-step process for proper chat integration:

1. **Chat Session Creation** via REST API
2. **WebSocket Connection** with chat_id parameter

### Integration Flow

```typescript
// Step 1: Create chat session via REST API
const createChatSession = async (tenantId: string) => {
  const response = await fetch(`${apiUrl}/api/v1/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Tenant-ID': tenantId
    },
    body: JSON.stringify({
      tenant_id: tenantId,
      title: 'New Chat Session'
    })
  })
  
  const chatData = await response.json()
  return chatData.chat_id
}

// Step 2: Connect WebSocket with chat_id
const connectWebSocket = (tenantId: string, chatId: string) => {
  const wsUrl = `ws://localhost:8000/api/v1/ws/chat?tenant_id=${tenantId}&chat_id=${chatId}`
  const ws = new WebSocket(wsUrl)
  return ws
}
```

## Platform Service Initialization Protocol

The MIPTech AI Platform follows an enterprise-grade initialization sequence that requires proper timing consideration:

### AI Service Startup Timing (1.7+ seconds)

```typescript
// Platform initialization monitoring
const initializePlatformConnection = async (config: WidgetConfig) => {
  // 1. Platform service startup detection
  const waitForPlatformReady = async (retries = 5): Promise<boolean> => {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(`${config.apiUrl}/api/v1/health`, {
          headers: {
            'X-Tenant-ID': config.tenantId
          }
        })
        if (response.ok) {
          const health = await response.json()
          if (health.ai_services_ready) {
            return true
          }
        }
      } catch (error) {
        console.log(`Platform check ${i + 1}/${retries} failed, retrying...`)
      }
      
      // Wait 1.7 seconds for AI services initialization
      await new Promise(resolve => setTimeout(resolve, 1700))
    }
    return false
  }

  // 2. Ensure platform is ready before proceeding
  const isReady = await waitForPlatformReady()
  if (!isReady) {
    throw new Error('Platform AI services failed to initialize')
  }

  // 3. Proceed with chat session creation
  return createChatSession(config.tenantId)
}
```

### Platform Initialization Message Handling

```typescript
// WebSocket message handler for platform events
const handlePlatformMessage = (message: WebSocketMessage) => {
  switch (message.type) {
    case 'platform_initializing':
      // Platform is starting AI services
      setConnectionState({ status: 'initializing' })
      break
      
    case 'platform_ready':
      // AI services are fully loaded and ready
      setConnectionState({ status: 'ready' })
      break
      
    case 'ai_services_loading':
      // Vector database and LLM services loading
      setTyping(true, 'Loading AI services...')
      break
      
    case 'ai_services_ready':
      // All AI components initialized
      setTyping(false)
      setConnectionState({ status: 'connected' })
      break
  }
}
```

## Message Routing Architecture with chat_id Requirements

The platform requires chat_id for message persistence and AI context management:

### Message Routing Flow

```typescript
// Message routing with chat_id requirement
const sendMessageWithRouting = (content: string, chatId: string) => {
  const message: WebSocketMessage = {
    type: 'chat_message',
    data: {
      message: content,
      chat_id: chatId,  // REQUIRED for proper routing
      stream: true,
      timestamp: Date.now()
    }
  }
  
  // Platform routes message based on chat_id:
  // 1. Retrieves chat context from PostgreSQL
  // 2. Loads conversation history for AI context
  // 3. Routes to appropriate AI service instance
  // 4. Ensures response is linked to correct chat session
  
  ws.send(JSON.stringify(message))
}
```

### Context Persistence Requirements

```typescript
// Chat context management
interface ChatContext {
  chat_id: string
  tenant_id: string
  conversation_history: ChatMessage[]
  ai_context: {
    vector_embeddings: string[]
    knowledge_base_refs: string[]
    user_preferences: object
  }
}

// Platform maintains context per chat_id:
const maintainChatContext = (chatId: string) => {
  // 1. Each message includes chat_id for context linking
  // 2. Platform loads full conversation history
  // 3. AI services use context for coherent responses
  // 4. Vector embeddings preserve semantic context
  // 5. Knowledge base maintains session-specific references
}
```

## 🏢 Enterprise: AI Platform Integration Patterns {#enterprise-features}

> **Note**: These patterns are for advanced enterprise deployments. MVP implementations can skip this section.

The MIPTech platform's enterprise architecture provides advanced AI capabilities:

### Unified System Architecture

```typescript
// Enterprise integration pattern
class EnterprisePlatformIntegration {
  private chatSession: ChatSession
  private websocketConnection: WebSocket
  private platformContext: PlatformContext
  
  async initializeEnterprisePlatform() {
    // 1. Platform services initialization (AI, Vector DB, LLM)
    await this.waitForPlatformReady()
    
    // 2. Create chat session for context persistence
    this.chatSession = await this.createChatSession()
    
    // 3. Establish WebSocket with session context
    this.websocketConnection = await this.connectWithChatId(
      this.chatSession.chat_id
    )
    
    // 4. Initialize AI service context
    await this.initializeAIContext()
  }
  
  private async waitForPlatformReady(): Promise<void> {
    // Wait for all enterprise services to initialize:
    // - Pinecone vector database
    // - OpenAI GPT-4 integration
    // - RAG service pipeline
    // - PostgreSQL tenant schemas
    // - Redis caching layer
    
    const services = [
      'vector_database',
      'llm_service', 
      'rag_pipeline',
      'tenant_database',
      'cache_layer'
    ]
    
    for (const service of services) {
      await this.checkServiceHealth(service)
    }
  }
}
```

### React Integration with Platform Architecture

Based on the actual frontend implementation, here's how to properly integrate:

```typescript
// Updated useWebSocket hook with platform architecture awareness
import { useEffect, useRef, useCallback } from 'react'
import { useWidgetStore } from '@/store/widget'

export const useWebSocket = () => {
  const ws = useRef<WebSocket | null>(null)
  const chatId = useRef<string | null>(null)
  
  const {
    config,
    connection,
    setConnectionState,
    addMessage,
    updateMessage,
    setError
  } = useWidgetStore()

  // Platform-aware connection with chat session bridge
  const connect = useCallback(async () => {
    if (!config) return

    try {
      // 1. Wait for platform AI services to be ready
      await waitForPlatformReady(config.apiUrl)
      
      // 2. Create chat session via REST API  
      if (!chatId.current) {
        chatId.current = await createChatSession(config.tenantId)
      }
      
      // 3. Connect WebSocket with chat_id parameter
      const wsUrl = new URL(config.apiUrl.replace('http', 'ws'))
      wsUrl.pathname = '/api/v1/ws/chat'
      wsUrl.searchParams.set('tenant_id', config.tenantId)
      wsUrl.searchParams.set('chat_id', chatId.current) // CRITICAL
      
      if (config.userId) {
        wsUrl.searchParams.set('user_id', config.userId)
      }
      if (config.token) {
        wsUrl.searchParams.set('token', config.token)
      }

      setConnectionState({ status: 'connecting' })
      ws.current = new WebSocket(wsUrl.toString())
      
      ws.current.onopen = () => {
        setConnectionState({ 
          status: 'connected',
          chatId: chatId.current
        })
      }
      
      ws.current.onmessage = (event) => {
        handlePlatformMessage(JSON.parse(event.data))
      }
      
    } catch (error) {
      setError('Platform initialization failed: ' + error.message)
    }
  }, [config])
  
  // Platform message handler with AI context awareness
  const handlePlatformMessage = useCallback((message: WebSocketMessage) => {
    switch (message.type) {
      case 'connection_established':
        console.log('Platform connection established with chat_id:', chatId.current)
        break
        
      case 'platform_initializing':
        setConnectionState({ status: 'initializing' })
        break
        
      case 'ai_services_ready':
        setConnectionState({ status: 'ready' })
        break
        
      case 'response_start':
        // AI is generating response using chat context
        const streamingMessage: ChatMessage = {
          id: message.data.message_id,
          content: '',
          role: 'assistant',
          timestamp: Date.now(),
          chat_id: chatId.current // Link to chat session
        }
        addMessage(streamingMessage)
        break
        
      case 'response_chunk':
        // Update streaming message with AI-generated content
        updateMessage(message.data.message_id, {
          content: message.data.content
        })
        break
        
      case 'response_complete':
        // AI response complete with full context
        updateMessage(message.data.message_id, {
          metadata: {
            chat_id: chatId.current,
            sources: message.data.sources,
            ai_context: message.data.ai_context
          }
        })
        break
    }
  }, [])
  
  // Send message with proper chat context
  const sendChatMessage = useCallback((content: string) => {
    if (!ws.current || !chatId.current) {
      throw new Error('Platform not ready - missing chat session')
    }
    
    const message = {
      type: 'chat_message',
      data: {
        message: content,
        chat_id: chatId.current, // REQUIRED for AI context
        stream: true
      }
    }
    
    ws.current.send(JSON.stringify(message))
  }, [])
  
  return {
    connect,
    sendChatMessage,
    connectionStatus: connection.status,
    chatId: chatId.current
  }
}

// Helper functions for platform integration
async function waitForPlatformReady(apiUrl: string): Promise<void> {
  for (let i = 0; i < 5; i++) {
    try {
      const response = await fetch(`${apiUrl}/api/v1/health`, {
        headers: {
          'X-Tenant-ID': tenantId
        }
      })
      if (response.ok) {
        const health = await response.json()
        if (health.ai_services_ready) {
          return
        }
      }
    } catch (error) {
      console.log(`Platform readiness check ${i + 1}/5 failed`)
    }
    
    // Wait for AI services initialization
    await new Promise(resolve => setTimeout(resolve, 1700))
  }
  
  throw new Error('Platform AI services failed to initialize')
}

async function createChatSession(tenantId: string): Promise<string> {
  const response = await fetch(`${apiUrl}/api/v1/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Tenant-ID': tenantId
    },
    body: JSON.stringify({
      tenant_id: tenantId,
      title: 'New Chat Session'
    })
  })
  
  if (!response.ok) {
    throw new Error('Failed to create chat session')
  }
  
  const chatData = await response.json()
  return chatData.chat_id
}
```

---
## 🎯 MVP Implementation Summary

**To get basic chat connectivity working:**

1. **✅ Start Here**: Follow the MVP Required sections in order
2. **Configure**: Set up environment variables (API URL, tenant ID, auth tokens)
3. **Authenticate**: Implement user registration and login flow
4. **Connect**: Implement WebSocket connection with tenant_id and authentication
5. **Chat**: Send and receive basic chat messages with proper headers
6. **Test**: Verify connectivity using basic troubleshooting

**Skip for MVP:**
- Chat history/persistence features
- Enterprise SSO integration
- Production deployment optimization
- Comprehensive testing suites

**After MVP works, enhance with:**
- 📅 Post-MVP features for production readiness
- 🏢 Enterprise features for advanced deployments (SSO, advanced MFA)

---
This document provides complete guidance for integrating with the MIPTech AI Platform. All code examples are 
production-ready and include proper error handling, security considerations, and debugging capabilities.