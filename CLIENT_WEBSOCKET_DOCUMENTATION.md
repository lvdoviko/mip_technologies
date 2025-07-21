# MIPTech Client-Side WebSocket Integration Documentation
## External Engineering Team Reference

**Document Version**: 1.0  
**Last Updated**: 2025-07-16  
**Platform Integration**: Phase 2 Ready State Implementation  

---

## 📋 Executive Summary

This document provides the complete client-side WebSocket implementation for connecting to the MIPTech AI Platform. The implementation includes enterprise-grade features such as automatic reconnection, circuit breaker patterns, endpoint discovery, and Phase 2 lifecycle management with timing requirements.

**Key Features:**
- ✅ Direct `/api/v1/ws/chat` endpoint connection
- ✅ 100ms authentication delay (Phase 2 requirement)
- ✅ Connection ready state management with timeout handling
- ✅ Enterprise-grade error handling and retry mechanisms
- ✅ Real-time connection testing and debugging tools

---

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────────┐
│   React App     │    │  WebSocket       │    │  MIPTech Platform   │
│                 │    │  Manager         │    │                     │
│ ┌─────────────┐ │    │                  │    │ ┌─────────────────┐ │
│ │ useChat     │◄┼────┼► Connection      │◄───┼─┤ /api/v1/ws/chat │ │
│ │ Hook        │ │    │  Lifecycle       │    │ │                 │ │
│ └─────────────┘ │    │                  │    │ └─────────────────┘ │
│                 │    │ ┌──────────────┐ │    │                     │
│ ┌─────────────┐ │    │ │ Phase 2      │ │    │ ┌─────────────────┐ │
│ │ConnectionTest│◄┼────┼► Timing &     │ │    │ │ Ready Signal    │ │
│ │ Component   │ │    │ │ Auth Delay   │ │    │ │ ~406ms init     │ │
│ └─────────────┘ │    │ └──────────────┘ │    │ └─────────────────┘ │
└─────────────────┘    └──────────────────┘    └─────────────────────┘
```

---

## ⚙️ Configuration Details

### Environment Variables (.env)

```bash
# ===========================================
# MIPTech AI Platform Configuration (Development)
# ===========================================

# API Configuration
REACT_APP_MIPTECH_API_URL=http://localhost:8000/api/v1
REACT_APP_MIPTECH_WS_URL=ws://localhost:8000
REACT_APP_MIPTECH_TENANT_ID=miptech-company

# Environment
REACT_APP_ENVIRONMENT=development
REACT_APP_DEBUG=true

# Enterprise Debugging Features
REACT_APP_DEBUG_WEBSOCKET=true
REACT_APP_ENABLE_ENDPOINT_DISCOVERY=false  # CRITICAL: Disabled for development
# Development optimization: Skip discovery and use direct endpoint
REACT_APP_ENABLE_MULTI_HEADER_AUTH=true
REACT_APP_ENABLE_CONNECTION_RETRY=true
REACT_APP_ENABLE_PERFORMANCE_TRACKING=true

# Chat Configuration
REACT_APP_CHAT_MAX_MESSAGE_LENGTH=4000
REACT_APP_CHAT_SESSION_TIMEOUT=86400000
REACT_APP_CHAT_MAX_RETRIES=3
REACT_APP_CHAT_RETRY_DELAY=1000

# Security Configuration
REACT_APP_ENABLE_ENCRYPTION=true
REACT_APP_RATE_LIMIT_REQUESTS=10
REACT_APP_RATE_LIMIT_WINDOW=60000
```

### Production Configuration (.env.production)

```bash
# MIPTech Platform Configuration - Production
REACT_APP_MIPTECH_API_URL=https://api.miptechnologies.tech
REACT_APP_MIPTECH_WS_URL=wss://api.miptechnologies.tech
REACT_APP_MIPTECH_TENANT_ID=miptech-company

# Production Configuration
REACT_APP_DEBUG_API=false
REACT_APP_ENVIRONMENT=production
REACT_APP_ENABLE_ENDPOINT_DISCOVERY=true  # Enabled for production flexibility
```

---

## 🔌 Core WebSocket Manager Implementation

### File: `src/services/websocketManager.js`

#### Connection States and Message Types

```javascript
/**
 * WebSocket connection states
 */
export const WS_STATES = {
  CONNECTING: 'CONNECTING',
  CONNECTED: 'CONNECTED',
  READY: 'READY',           // Phase 2: Platform ready state
  DISCONNECTING: 'DISCONNECTING',
  DISCONNECTED: 'DISCONNECTED',
  RECONNECTING: 'RECONNECTING',
  FAILED: 'FAILED'
};

/**
 * WebSocket message types
 */
export const WS_MESSAGE_TYPES = {
  AUTH: 'auth',
  CONNECTION_ESTABLISHED: 'connection_established',  // Phase 2
  CONNECTION_READY: 'connection_ready',             // Phase 2
  CHAT_MESSAGE: 'chat_message',
  STATUS: 'status',
  ERROR: 'error',
  PING: 'ping',
  PONG: 'pong',
  TYPING: 'typing',
  STOP_TYPING: 'stop_typing'
};
```

#### WebSocket Configuration Factory

```javascript
export const createWebSocketConfig = (options = {}) => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  return {
    baseURL: options.baseURL || process.env.REACT_APP_MIPTECH_WS_URL || 
             (isDevelopment ? 'ws://localhost:8000' : 'wss://api.miptechnologies.tech'),
    tenantId: options.tenantId || process.env.REACT_APP_MIPTECH_TENANT_ID || 'miptech-company',
    maxReconnectAttempts: options.maxReconnectAttempts || 5,
    reconnectDelay: options.reconnectDelay || 1000,
    maxReconnectDelay: options.maxReconnectDelay || 30000,
    heartbeatInterval: options.heartbeatInterval || 30000,
    connectionTimeout: options.connectionTimeout || 10000,
    messageQueueLimit: options.messageQueueLimit || 100,
    circuitBreakerThreshold: options.circuitBreakerThreshold || 3,
    circuitBreakerTimeout: options.circuitBreakerTimeout || 60000,
    ...options
  };
};
```

#### Endpoint Discovery (Enterprise Feature)

```javascript
/**
 * Discover available WebSocket endpoints with enterprise-grade testing
 */
async discoverWebSocketEndpoint() {
  if (process.env.REACT_APP_ENABLE_ENDPOINT_DISCOVERY !== 'true') {
    return '/api/v1/ws/chat'; // Default endpoint - fixed to match platform
  }
  
  // Prioritize correct endpoint first
  const endpoints = ['/api/v1/ws/chat', '/api/v1/ws', '/ws', '/api/ws'];
  const timeout = 5000; // 5 second timeout per endpoint
  const results = [];
  
  if (process.env.REACT_APP_DEBUG_WEBSOCKET === 'true') {
    this.console.log('🔍 [WebSocket] Starting endpoint discovery...');
  }
  
  // Test endpoints concurrently for speed
  const testPromises = endpoints.map(async (endpoint) => {
    const wsUrl = `${this.config.baseURL}${endpoint}?tenant_id=${this.config.tenantId}&session_id=${this.sessionId}`;
    
    return new Promise((resolve) => {
      try {
        if (process.env.REACT_APP_DEBUG_WEBSOCKET === 'true') {
          this.console.log(`🔍 [WebSocket] Testing endpoint: ${wsUrl}`);
        }
        
        const testWs = new this.WebSocket(wsUrl);
        const timeoutId = this.setTimeout(() => {
          testWs.close();
          resolve({ endpoint, success: false, error: 'Timeout' });
        }, timeout);
        
        testWs.onopen = () => {
          this.clearTimeout(timeoutId);
          testWs.close();
          if (process.env.REACT_APP_DEBUG_WEBSOCKET === 'true') {
            this.console.log(`✅ [WebSocket] Endpoint ${endpoint} available`);
          }
          resolve({ endpoint, success: true, message: 'Connection successful' });
        };
        
        testWs.onerror = (error) => {
          this.clearTimeout(timeoutId);
          if (process.env.REACT_APP_DEBUG_WEBSOCKET === 'true') {
            this.console.log(`❌ [WebSocket] Endpoint ${endpoint} failed: ${error.message || 'Connection error'}`);
          }
          resolve({ endpoint, success: false, error: error.message || 'Connection error' });
        };
        
      } catch (error) {
        resolve({ endpoint, success: false, error: error.message });
      }
    });
  });
  
  const testResults = await Promise.all(testPromises);
  results.push(...testResults);
  
  // Find first successful endpoint
  const successfulEndpoint = results.find(result => result.success);
  
  if (successfulEndpoint) {
    if (process.env.REACT_APP_DEBUG_WEBSOCKET === 'true') {
      this.console.log(`✅ [WebSocket] Discovered endpoint: ${successfulEndpoint.endpoint}`);
    }
    return successfulEndpoint.endpoint;
  }
  
  // Fallback to default
  console.warn('[WebSocket] No WebSocket endpoint discovered, using default /api/v1/ws/chat');
  return '/api/v1/ws/chat';
}
```

---

## 🔄 Connection Lifecycle Implementation

### Step 1: Connection Establishment

```javascript
/**
 * Establish WebSocket connection with enterprise endpoint discovery
 */
async establishConnection() {
  return new Promise(async (resolve, reject) => {
    try {
      this.setState(WS_STATES.CONNECTING);
      
      // Discover the best endpoint to use
      const wsEndpoint = await this.discoverWebSocketEndpoint();
      const wsUrl = `${this.config.baseURL}${wsEndpoint}?tenant_id=${this.config.tenantId}&session_id=${this.sessionId}`;
      
      if (process.env.REACT_APP_DEBUG_WEBSOCKET === 'true') {
        this.console.log('📨 [WebSocket] Connecting to discovered endpoint:', {
          url: wsUrl,
          endpoint: wsEndpoint,
          tenantId: this.config.tenantId,
          sessionId: this.sessionId
        });
      }
      
      this.ws = new this.WebSocket(wsUrl);
      
      // Set connection timeout
      this.connectionTimeoutId = this.setTimeout(() => {
        if (this.state === WS_STATES.CONNECTING) {
          this.ws.close();
          reject(new MIPTechError(
            'Connection timeout',
            ERROR_TYPES.WEBSOCKET,
            ERROR_SEVERITY.HIGH,
            { timeout: this.config.connectionTimeout }
          ));
        }
      }, this.config.connectionTimeout);
      
      this.ws.onopen = () => {
        this.clearTimeout(this.connectionTimeoutId);
        this.handleOpen();
        resolve();
      };
      
      this.ws.onmessage = this.handleMessage;
      this.ws.onclose = this.handleClose;
      this.ws.onerror = (error) => {
        this.clearTimeout(this.connectionTimeoutId);
        this.handleError(error);
        reject(error);
      };
      
    } catch (error) {
      reject(error);
    }
  });
}
```

### Step 2: Connection Open Handler with Phase 2 Timing

```javascript
/**
 * Handle WebSocket connection open
 */
handleOpen() {
  this.console.log('[WebSocket] Connected to MIPTech Platform');
  
  this.setState(WS_STATES.CONNECTED);
  this.reconnectAttempts = 0;
  this.metrics.connectionCount++;
  this.metrics.lastConnectedAt = Date.now();
  
  // Send authentication message with 100ms delay (Phase 2 requirement)
  this.scheduleAuthMessage();
  
  // Start heartbeat
  this.startHeartbeat();
  
  // Emit connected event
  this.emit('connected', { sessionId: this.sessionId });
}

/**
 * Schedule authentication message with 100ms delay (Phase 2 requirement)
 */
scheduleAuthMessage() {
  if (this.authTimeoutId) {
    this.clearTimeout(this.authTimeoutId);
  }
  
  this.authTimeoutId = this.setTimeout(() => {
    this.sendAuthMessage();
  }, 100); // 100ms delay as required by platform
}
```

### Step 3: Authentication Message Format

```javascript
/**
 * Send authentication message
 */
sendAuthMessage() {
  const authMessage = {
    type: WS_MESSAGE_TYPES.AUTH,
    data: {
      tenant_id: this.config.tenantId,
      session_id: this.sessionId,
      user_agent: navigator.userAgent,
      page_url: window.location.href,
      timestamp: new Date().toISOString()
    }
  };
  
  if (process.env.REACT_APP_DEBUG_API === 'true') {
    this.console.log('[WebSocket] Sending authentication after 100ms delay:', {
      tenantId: this.config.tenantId,
      sessionId: this.sessionId
    });
  }
  
  this.send(authMessage);
  
  // Set timeout for ready state (10 seconds)
  this.readyTimeoutId = this.setTimeout(() => {
    if (!this.isReady) {
      this.console.warn('[WebSocket] Ready timeout - platform did not send connection_ready');
      this.emit('ready_timeout', { sessionId: this.sessionId });
    }
  }, 10000);
}
```

### Step 4: Platform Ready Signal Handling

```javascript
/**
 * Handle connection ready message from platform
 */
handleConnectionReady(data) {
  this.console.log('[WebSocket] Connection ready signal received from platform');
  
  if (this.readyTimeoutId) {
    this.clearTimeout(this.readyTimeoutId);
    this.readyTimeoutId = null;
  }
  
  this.isReady = true;
  this.setState(WS_STATES.READY);
  
  // Process queued messages now that connection is ready
  this.processMessageQueue();
  
  // Emit ready event
  this.emit('ready', { sessionId: this.sessionId, data });
}
```

---

## 📨 Message Handling and Authentication

### Expected WebSocket URL Format

```
ws://localhost:8000/api/v1/ws/chat?tenant_id=miptech-company&session_id=[UUID]
```

### Authentication Message Structure

```json
{
  "type": "auth",
  "data": {
    "tenant_id": "miptech-company",
    "session_id": "12345678-1234-1234-1234-123456789abc",
    "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:140.0) Gecko/20100101 Firefox/140.0",
    "page_url": "http://localhost:3000/",
    "timestamp": "2025-07-16T16:37:27.888Z"
  }
}
```

### Platform Response Messages

```json
{
  "type": "connection_ready",
  "data": {
    "client_id": "418e162d-870a-4081-989e-7e222d6f188f",
    "tenant_id": "miptech-company",
    "ready_duration": 0.0001347064971923828
  }
}
```

### Enhanced Message Sending with Ready State Check

```javascript
/**
 * Send message to WebSocket server
 */
send(data) {
  if (!data) {
    this.console.warn('[WebSocket] Cannot send empty message');
    return false;
  }
  
  const message = typeof data === 'string' ? data : JSON.stringify(data);
  
  // For user messages, wait until connection is ready (Phase 2 requirement)
  const isUserMessage = data.type === WS_MESSAGE_TYPES.CHAT_MESSAGE;
  const isSystemMessage = data.type === WS_MESSAGE_TYPES.AUTH || data.type === WS_MESSAGE_TYPES.PING;
  
  if (this.ws && this.ws.readyState === WebSocket.OPEN) {
    // System messages can be sent immediately, user messages need ready state
    if (isSystemMessage || this.isReady) {
      try {
        this.ws.send(message);
        this.metrics.messagesSent++;
        this.console.log('[WebSocket] Sent:', data);
        return true;
      } catch (error) {
        this.console.error('[WebSocket] Failed to send message:', error);
        this.metrics.errors++;
        return false;
      }
    } else if (isUserMessage) {
      // Queue user messages until ready
      if (this.messageQueue.length < this.config.messageQueueLimit) {
        this.messageQueue.push(data);
        this.console.log('[WebSocket] Queued user message - waiting for ready state');
        return true;
      } else {
        this.console.warn('[WebSocket] Message queue full, dropping message');
        return false;
      }
    }
  } else {
    // Queue message for later delivery
    if (this.messageQueue.length < this.config.messageQueueLimit) {
      this.messageQueue.push(data);
      this.console.log('[WebSocket] Queued message for delivery when connected');
      return true;
    } else {
      this.console.warn('[WebSocket] Message queue full, dropping message');
      return false;
    }
  }
}
```

---

## ⚛️ React Hook Integration

### File: `src/hooks/useChat.js`

#### Chat States with Phase 2 Extensions

```javascript
/**
 * Chat connection states
 */
export const CHAT_STATES = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  READY: 'ready',        // Phase 2: Platform ready for messages
  RECONNECTING: 'reconnecting',
  FAILED: 'failed',
  ERROR: 'error'         // Phase 2: Connection/ready timeout errors
};
```

#### WebSocket Event Handlers in useChat Hook

```javascript
/**
 * WebSocket event handlers
 */
useEffect(() => {
  const wsManager = websocketRef.current;
  
  const handleConnected = () => {
    if (isUnmountedRef.current) return;
    setConnectionState(CHAT_STATES.CONNECTED);
    setError(null);
  };
  
  const handleReady = (data) => {
    if (isUnmountedRef.current) return;
    
    console.log('[Chat] Connection ready signal received from platform');
    
    // Clear connection timeout
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }
    
    setIsConnectionReady(true);
    setConnectionState(CHAT_STATES.READY);
    setError(null);
    
    // Track performance
    if (chatConfig.enablePerformanceTracking) {
      performanceRef.current.trackChatWidget('connection_ready');
    }
  };
  
  const handleReadyTimeout = () => {
    if (isUnmountedRef.current) return;
    
    console.warn('[Chat] Connection ready timeout from WebSocket manager');
    setError(new MIPTechError(
      'Platform initialization timeout',
      ERROR_TYPES.WEBSOCKET,
      ERROR_SEVERITY.MEDIUM,
      { timeout: 10000 }
    ));
    setConnectionState(CHAT_STATES.ERROR);
  };
  
  const handleDisconnected = () => {
    if (isUnmountedRef.current) return;
    setConnectionState(CHAT_STATES.DISCONNECTED);
    setIsConnectionReady(false);
    
    // Clear connection timeout
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }
  };
  
  // Register event handlers
  wsManager.on('connected', handleConnected);
  wsManager.on('ready', handleReady);
  wsManager.on('ready_timeout', handleReadyTimeout);
  wsManager.on('disconnected', handleDisconnected);
  wsManager.on('reconnecting', handleReconnecting);
  wsManager.on('message', handleMessage);
  wsManager.on('typing', handleTyping);
  wsManager.on('stop_typing', handleTyping);
  wsManager.on('error', handleError);
  wsManager.on('failed', handleFailed);
  
  return () => {
    if (wsManager && wsManager.off) {
      wsManager.off('connected', handleConnected);
      wsManager.off('ready', handleReady);
      wsManager.off('ready_timeout', handleReadyTimeout);
      wsManager.off('disconnected', handleDisconnected);
      wsManager.off('reconnecting', handleReconnecting);
      wsManager.off('message', handleMessage);
      wsManager.off('typing', handleTyping);
      wsManager.off('stop_typing', handleTyping);
      wsManager.off('error', handleError);
      wsManager.off('failed', handleFailed);
    }
  };
}, [chatConfig.enablePersistence, chatConfig.enablePerformanceTracking]);
```

#### Message Sending with Ready State Check

```javascript
const sendMessage = useCallback(async (content, options = {}) => {
  if (!currentChat) {
    throw new MIPTechError(
      'No active chat session',
      ERROR_TYPES.VALIDATION,
      ERROR_SEVERITY.MEDIUM
    );
  }
  
  // Phase 2 requirement: Wait for connection ready state
  if (!isConnectionReady) {
    throw new MIPTechError(
      'Connection not ready - please wait for platform to initialize',
      ERROR_TYPES.WEBSOCKET,
      ERROR_SEVERITY.MEDIUM,
      { connectionState, isConnectionReady }
    );
  }
  
  // ... rest of sendMessage implementation
}, [currentChat, chatConfig, isConnectionReady, connectionState]);
```

---

## 🧪 Connection Testing Component

### File: `src/components/ConnectionTest.jsx`

```javascript
const testWebSocketConnection = () => {
  const startTime = Date.now();
  setWsStatus('connecting');
  setWsReadyStatus('waiting');
  setConnectionMetrics({});
  
  // Clean up any existing event listeners first
  websocketManager.disconnect();
  
  // Track connection lifecycle (Phase 2 testing)
  const handleConnected = (data) => {
    const connectionTime = Date.now() - startTime;
    setWsStatus('connected');
    setConnectionMetrics(prev => ({ 
      ...prev, 
      connectionTime,
      sessionId: data.sessionId
    }));
    console.log('[ConnectionTest] WebSocket connected in', connectionTime, 'ms');
  };

  // Phase 2: Test ready state handling
  const handleReady = (data) => {
    const readyTime = Date.now() - startTime;
    setWsReadyStatus('ready');
    setConnectionMetrics(prev => ({ 
      ...prev, 
      readyTime,
      totalTime: readyTime
    }));
    setTestResults(prev => ({ 
      ...prev, 
      ws: { 
        connected: true,
        ready: true,
        sessionId: data.sessionId,
        connectionTime: prev.connectionTime,
        readyTime,
        authDelay: readyTime - (prev.connectionTime || 0),
        tenantId: process.env.REACT_APP_MIPTECH_TENANT_ID
      } 
    }));
    console.log('[ConnectionTest] Platform ready signal received in', readyTime, 'ms');
  };

  // Phase 2: Test timeout handling
  const handleReadyTimeout = () => {
    setWsReadyStatus('timeout');
    setTestResults(prev => ({ 
      ...prev, 
      ws: { 
        connected: true,
        ready: false,
        error: 'Ready timeout - platform did not signal ready state within 10 seconds',
        tenantId: process.env.REACT_APP_MIPTECH_TENANT_ID
      } 
    }));
    console.warn('[ConnectionTest] Platform ready timeout');
  };
  
  // Register event handlers
  websocketManager.on('connected', handleConnected);
  websocketManager.on('ready', handleReady);
  websocketManager.on('ready_timeout', handleReadyTimeout);
  websocketManager.on('error', handleError);
  websocketManager.on('disconnected', handleDisconnected);
  
  // Start connection with cleanup timeout
  websocketManager.connect();
  
  // Clean up event listeners after test (30 seconds timeout)
  setTimeout(() => {
    websocketManager.off('connected', handleConnected);
    websocketManager.off('ready', handleReady);
    websocketManager.off('ready_timeout', handleReadyTimeout);
    websocketManager.off('error', handleError);
    websocketManager.off('disconnected', handleDisconnected);
  }, 30000);
};
```

---

## 🐛 Debugging Guide

### Console Log Patterns

#### Successful Connection Sequence

```bash
[WebSocket] Connecting to discovered endpoint: {
  url: "ws://localhost:8000/api/v1/ws/chat?tenant_id=miptech-company&session_id=12345678-1234-1234-1234-123456789abc",
  endpoint: "/api/v1/ws/chat",
  tenantId: "miptech-company",
  sessionId: "12345678-1234-1234-1234-123456789abc"
}

[WebSocket] Connected to MIPTech Platform

[WebSocket] Sending authentication after 100ms delay: {
  tenantId: "miptech-company",
  sessionId: "12345678-1234-1234-1234-123456789abc"
}

[WebSocket] Sent: {
  type: "auth",
  data: {
    tenant_id: "miptech-company",
    session_id: "12345678-1234-1234-1234-123456789abc",
    user_agent: "Mozilla/5.0...",
    page_url: "http://localhost:3000/",
    timestamp: "2025-07-16T16:37:27.888Z"
  }
}

[WebSocket] Connection ready signal received from platform

[Chat] Connection ready signal received from platform

[ConnectionTest] WebSocket connected in 150 ms
[ConnectionTest] Platform ready signal received in 556 ms
```

#### Connection Error Patterns

```bash
# Endpoint Discovery Errors (when enabled)
🔍 [WebSocket] Testing endpoint: ws://localhost:8000/api/v1/ws?tenant_id=miptech-company&session_id=test-123
❌ [WebSocket] Endpoint /api/v1/ws failed: Connection error
NS_ERROR_WEBSOCKET_CONNECTION_REFUSED

# Ready Timeout (Platform initialization issue)
[WebSocket] Ready timeout - platform did not send connection_ready
[Chat] Connection ready timeout from WebSocket manager
[MIPTech Error] Platform initialization timeout

# Normal Disconnection
[WebSocket] Disconnected: 1000 Normal closure
```

### Timing Benchmarks

| Phase | Expected Time | Description |
|-------|---------------|-------------|
| **Connection** | 50-200ms | WebSocket handshake completion |
| **Auth Delay** | 100ms | Fixed delay before authentication |
| **Platform Init** | 300-500ms | Platform service initialization |
| **Ready Signal** | 400-600ms | Total time to ready state |
| **Timeout** | 10 seconds | Maximum wait for ready signal |

### Error Codes and Meanings

| Code | Meaning | Action Required |
|------|---------|-----------------|
| `1000` | Normal closure | None - expected behavior |
| `1011` | Server internal error | Platform configuration issue |
| `NS_ERROR_WEBSOCKET_CONNECTION_REFUSED` | Connection refused | Check platform availability |
| `Connection timeout` | No response within 10s | Check network/platform |
| `Ready timeout` | Platform didn't signal ready | Platform initialization issue |

---

## 📊 Performance Metrics and Monitoring

### WebSocket Manager Metrics

```javascript
// Get connection metrics
const metrics = websocketManager.getMetrics();

/*
Expected metrics object:
{
  connectionCount: 1,
  messagesSent: 5,
  messagesReceived: 3,
  reconnectCount: 0,
  errors: 0,
  averageLatency: 45,
  lastConnectedAt: 1642358247888,
  totalDowntime: 0,
  currentLatency: 42,
  circuitBreakerState: "CLOSED",
  connectionState: "READY",
  reconnectAttempts: 0,
  queuedMessages: 0,
  uptime: 15000
}
*/
```

### Connection Status Indicators

```javascript
// Check connection status
const status = websocketManager.getStatus();

/*
Expected status object:
{
  isConnected: true,
  readyState: 1,  // WebSocket.OPEN
  reconnectAttempts: 0,
  sessionId: "12345678-1234-1234-1234-123456789abc",
  tenantId: "miptech-company"
}
*/

// Check if ready for user messages
const canSendMessages = websocketManager.isConnectionReady();
// Returns: true only when state is READY and isReady is true
```

---

## 🔧 Recent Fixes and Known Issues

### ✅ Resolved Issues (July 16, 2025)

1. **Endpoint Mismatch**: Fixed default endpoint from `/api/v1/ws` to `/api/v1/ws/chat`
2. **Discovery Interference**: Disabled endpoint discovery in development to prevent multiple failed attempts
3. **Event Listener Leaks**: Implemented proper cleanup in ConnectionTest component
4. **Ready State Timing**: Added 100ms authentication delay and proper ready state waiting

### ⚠️ Current Considerations

1. **Development Configuration**: Endpoint discovery disabled for optimal local development
2. **Connection Testing**: Separate testing component with proper event cleanup
3. **Platform Dependencies**: Requires platform to send `connection_ready` signal after initialization

---

## 📞 External Engineering Team Support

### Quick Debugging Checklist

1. **Check Environment Variables**: Ensure `REACT_APP_MIPTECH_TENANT_ID` and WebSocket URL are correct
2. **Verify Platform Status**: Confirm platform is running and accepting connections on `/api/v1/ws/chat`
3. **Enable Debug Logging**: Set `REACT_APP_DEBUG_WEBSOCKET=true` for detailed connection logs
4. **Test Connection**: Use ConnectionTest component to verify Phase 2 lifecycle
5. **Monitor Timing**: Ensure platform sends ready signal within 10 seconds

### Integration Verification

```javascript
// Browser console test
const ws = new WebSocket('ws://localhost:8000/api/v1/ws/chat?tenant_id=miptech-company&session_id=test-123');
ws.onopen = () => console.log('✅ Direct connection successful');
ws.onclose = (e) => console.log('Connection closed:', e.code, e.reason);
ws.onerror = (e) => console.error('Connection error:', e);

// Send test auth message after 100ms
setTimeout(() => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'auth',
      data: {
        tenant_id: 'miptech-company',
        session_id: 'test-123',
        timestamp: new Date().toISOString()
      }
    }));
  }
}, 100);
```

---

**Document End**  
For additional support or clarification, reference the platform-side logs and timing requirements to ensure proper client-platform synchronization.