# Client-Side Implementation Guide - MIPTech AI Platform Integration

**Target**: React SPA Website (`miptechnologies.tech`)  
**Purpose**: Fix connection issues and ensure proper tenant resolution  
**Security**: No platform middleware changes - client adapts to existing secure server

---

## 🚨 **Current Issue Summary**

**Problem**: Website shows "not connected" because:
- ❌ Missing `X-Tenant-ID` header in API requests
- ❌ Incorrect WebSocket connection URL format
- ❌ Missing environment configuration

**Solution**: Client-side fixes only (platform already supports required functionality)

---

## 📋 **Quick Fix Checklist**

- [ ] Create proper environment variables
- [ ] Update API client to send tenant ID header
- [ ] Fix WebSocket connection parameters
- [ ] Test connection and verify functionality

---

## 🔧 **Implementation Steps**

### Step 1: Environment Configuration

**Create**: `.env` (for development)
```bash
# MIPTech Platform URLs - Development
REACT_APP_MIPTECH_API_URL=http://localhost:8000
REACT_APP_MIPTECH_WS_URL=ws://localhost:8000
REACT_APP_MIPTECH_TENANT_ID=miptech-company

# Environment
REACT_APP_ENVIRONMENT=development

# Optional: Debug logging
REACT_APP_DEBUG_API=true
```

**Create**: `.env.production` (for production deployment)
```bash
# MIPTech Platform URLs - Production
REACT_APP_MIPTECH_API_URL=https://api.miptechnologies.tech
REACT_APP_MIPTECH_WS_URL=wss://api.miptechnologies.tech
REACT_APP_MIPTECH_TENANT_ID=miptech-company

# Environment
REACT_APP_ENVIRONMENT=production

# Optional: Disable debug in production
REACT_APP_DEBUG_API=false
```

### Step 2: API Client Updates

**Update**: `src/services/miptechApi.js`

**CRITICAL CHANGE**: Add tenant ID header to all requests

```javascript
import axios from 'axios';

class MIPTechAPI {
  constructor() {
    this.baseURL = process.env.REACT_APP_MIPTECH_API_URL || 'http://localhost:8000';
    this.tenantId = process.env.REACT_APP_MIPTECH_TENANT_ID || 'miptech-company';
    this.client = this.createClient();
  }

  createClient() {
    const client = axios.create({
      baseURL: `${this.baseURL}/api/v1`,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': this.tenantId,  // 🔥 CRITICAL: This header is required
        'User-Agent': 'MIPTech-Website/1.0'
      }
    });

    // Request interceptor - ensure tenant ID is always sent
    client.interceptors.request.use(
      (config) => {
        // Ensure tenant ID header is always present
        if (!config.headers['X-Tenant-ID']) {
          config.headers['X-Tenant-ID'] = this.tenantId;
        }
        
        if (process.env.REACT_APP_DEBUG_API === 'true') {
          console.log(`[MIPTech API] ${config.method.toUpperCase()} ${config.url}`, {
            headers: config.headers,
            tenantId: config.headers['X-Tenant-ID']
          });
        }
        
        return config;
      },
      (error) => {
        console.error('[MIPTech API] Request error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor - handle tenant-specific errors
    client.interceptors.response.use(
      (response) => {
        if (process.env.REACT_APP_DEBUG_API === 'true') {
          console.log(`[MIPTech API] ${response.status} ${response.config.url}`, {
            tenantId: response.config.headers['X-Tenant-ID']
          });
        }
        return response;
      },
      (error) => {
        console.error('[MIPTech API] Response error:', error.response?.data || error.message);
        
        // Handle tenant-specific errors
        if (error.response?.status === 400 && 
            error.response?.data?.detail?.includes('Tenant')) {
          console.error('[MIPTech API] Tenant resolution error - check X-Tenant-ID header');
        }
        
        if (error.response?.status === 429) {
          console.warn('[MIPTech API] Rate limited, implementing backoff...');
        }
        
        return Promise.reject(error);
      }
    );

    return client;
  }

  // Test connection method
  async testConnection() {
    try {
      const response = await this.client.get('/health');
      console.log('[MIPTech API] Connection test successful:', response.data);
      return { connected: true, data: response.data };
    } catch (error) {
      console.error('[MIPTech API] Connection test failed:', error.message);
      return { connected: false, error: error.message };
    }
  }

  // Chat operations with enhanced error handling
  async createChat(sessionId, visitorId) {
    try {
      const response = await this.client.post('/chat/', {
        session_id: sessionId,
        visitor_id: visitorId,
        title: 'Website Chat',
        context: {
          page_url: window.location.href,
          user_agent: navigator.userAgent,
          referrer: document.referrer,
          tenant_id: this.tenantId  // Include tenant in context
        }
      });
      
      console.log('[MIPTech API] Chat created successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('[MIPTech API] Failed to create chat:', error.response?.data || error.message);
      throw new Error(`Failed to create chat: ${error.message}`);
    }
  }

  async sendMessage(chatId, content) {
    try {
      const response = await this.client.post(`/chat/${chatId}/messages`, {
        content: content,
        role: 'user',
        metadata: {
          timestamp: new Date().toISOString(),
          page_url: window.location.href,
          tenant_id: this.tenantId
        }
      });
      
      console.log('[MIPTech API] Message sent successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('[MIPTech API] Failed to send message:', error.response?.data || error.message);
      throw new Error(`Failed to send message: ${error.message}`);
    }
  }

  async getChatHistory(chatId) {
    try {
      const response = await this.client.get(`/chat/${chatId}/messages`);
      return response.data;
    } catch (error) {
      console.error('[MIPTech API] Failed to get chat history:', error.response?.data || error.message);
      throw new Error(`Failed to get chat history: ${error.message}`);
    }
  }

  async getHealth() {
    try {
      const response = await this.client.get('/health');
      return response.data;
    } catch (error) {
      console.error('[MIPTech API] Health check failed:', error.response?.data || error.message);
      throw new Error(`Health check failed: ${error.message}`);
    }
  }
}

export default new MIPTechAPI();
```

### Step 3: WebSocket Manager Updates

**Update**: `src/services/websocketManager.js`

**CRITICAL CHANGE**: Fix WebSocket URL and authentication

```javascript
import { v4 as uuidv4 } from 'uuid';

class WebSocketManager {
  constructor() {
    this.ws = null;
    this.sessionId = null;
    this.tenantId = process.env.REACT_APP_MIPTECH_TENANT_ID || 'miptech-company';
    this.baseURL = process.env.REACT_APP_MIPTECH_WS_URL || 'ws://localhost:8000';
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.isConnected = false;
  }

  connect(sessionId) {
    this.sessionId = sessionId || uuidv4();
    
    // 🔥 CRITICAL: Correct WebSocket URL format with tenant parameter
    const wsUrl = `${this.baseURL}/api/v1/ws?tenant_id=${this.tenantId}&session_id=${this.sessionId}`;
    
    console.log(`[WebSocket] Connecting to: ${wsUrl}`, {
      tenantId: this.tenantId,
      sessionId: this.sessionId
    });
    
    this.ws = new WebSocket(wsUrl);
    
    this.ws.onopen = () => {
      console.log('[WebSocket] Connected to MIPTech Platform');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      // 🔥 CRITICAL: Send authentication with tenant ID
      this.send({
        type: 'auth',
        data: {
          tenant_id: this.tenantId,
          session_id: this.sessionId,
          user_agent: navigator.userAgent,
          page_url: window.location.href
        }
      });
      
      this.emit('connected', { 
        sessionId: this.sessionId, 
        tenantId: this.tenantId 
      });
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[WebSocket] Received:', data);
        this.emit('message', data);
        
        // Handle specific message types
        if (data.type) {
          this.emit(data.type, data);
        }
      } catch (error) {
        console.error('[WebSocket] Failed to parse message:', error);
      }
    };

    this.ws.onclose = (event) => {
      console.log(`[WebSocket] Disconnected: ${event.code} ${event.reason}`);
      this.isConnected = false;
      this.emit('disconnected', { code: event.code, reason: event.reason });
      
      // Attempt to reconnect
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        console.log(`[WebSocket] Reconnecting (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        setTimeout(() => this.connect(this.sessionId), 1000 * this.reconnectAttempts);
      } else {
        console.error('[WebSocket] Max reconnection attempts reached');
        this.emit('max_reconnects_reached');
      }
    };

    this.ws.onerror = (error) => {
      console.error('[WebSocket] Error:', error);
      this.isConnected = false;
      this.emit('error', error);
    };
  }

  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const message = JSON.stringify(data);
      console.log('[WebSocket] Sending:', data);
      this.ws.send(message);
    } else {
      console.warn('[WebSocket] Cannot send message, connection not open:', {
        readyState: this.ws?.readyState,
        isConnected: this.isConnected
      });
    }
  }

  disconnect() {
    if (this.ws) {
      console.log('[WebSocket] Manually disconnecting');
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
    }
  }

  // Test connection method
  testConnection() {
    return {
      isConnected: this.isConnected,
      readyState: this.ws?.readyState,
      url: `${this.baseURL}/api/v1/ws?tenant_id=${this.tenantId}&session_id=${this.sessionId}`,
      tenantId: this.tenantId
    };
  }

  // Event listener management
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => callback(data));
    }
  }
}

export default new WebSocketManager();
```

### Step 4: Update Chat Hook

**Update**: `src/hooks/useChat.js`

**ENHANCEMENT**: Add connection testing and better error handling

```javascript
import { useState, useEffect, useCallback } from 'react';
import miptechApi from '../services/miptechApi';
import websocketManager from '../services/websocketManager';
import sessionManager from '../services/sessionManager';

export const useChat = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [currentChat, setCurrentChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');

  // Test API connection
  const testConnection = useCallback(async () => {
    try {
      const result = await miptechApi.testConnection();
      if (result.connected) {
        setConnectionStatus('api_connected');
        console.log('[useChat] API connection test successful');
      } else {
        setConnectionStatus('api_failed');
        setError(`API connection failed: ${result.error}`);
      }
      return result;
    } catch (err) {
      setConnectionStatus('api_failed');
      setError(`API connection test failed: ${err.message}`);
      return { connected: false, error: err.message };
    }
  }, []);

  // Initialize chat with connection testing
  const initializeChat = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // First test API connection
      const connectionTest = await testConnection();
      if (!connectionTest.connected) {
        throw new Error(`API connection failed: ${connectionTest.error}`);
      }
      
      const session = sessionManager.getSession();
      
      // Create new chat
      const chat = await miptechApi.createChat(session.id, session.visitorId);
      setCurrentChat(chat);
      
      // Load chat history
      const history = await miptechApi.getChatHistory(chat.id);
      setMessages(history.items || []);
      
      // Connect WebSocket
      websocketManager.connect(session.id);
      
      console.log('[useChat] Chat initialized successfully:', { 
        chatId: chat.id, 
        sessionId: session.id 
      });
      
      return chat;
    } catch (err) {
      console.error('[useChat] Failed to initialize chat:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [testConnection]);

  // Send message with enhanced error handling
  const sendMessage = useCallback(async (content) => {
    if (!currentChat) {
      throw new Error('No active chat session');
    }

    try {
      setIsLoading(true);
      setError(null);

      // Add user message immediately
      const userMessage = {
        id: Date.now(),
        content,
        role: 'user',
        timestamp: new Date().toISOString(),
        status: 'sending'
      };
      
      setMessages(prev => [...prev, userMessage]);
      sessionManager.addChatMessage(userMessage);

      // Send to API
      const response = await miptechApi.sendMessage(currentChat.id, content);
      
      // Update user message status
      setMessages(prev => 
        prev.map(msg => 
          msg.id === userMessage.id 
            ? { ...msg, status: 'sent' }
            : msg
        )
      );

      // Add AI response
      if (response) {
        const aiMessage = {
          ...response,
          status: 'received'
        };
        setMessages(prev => [...prev, aiMessage]);
        sessionManager.addChatMessage(aiMessage);
      }

      return response;
    } catch (err) {
      console.error('[useChat] Failed to send message:', err);
      setError(err.message);
      
      // Update user message status
      setMessages(prev => 
        prev.map(msg => 
          msg.id === userMessage.id 
            ? { ...msg, status: 'error' }
            : msg
        )
      );
      
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [currentChat]);

  // WebSocket event handlers
  useEffect(() => {
    const handleConnected = (data) => {
      console.log('[useChat] WebSocket connected:', data);
      setIsConnected(true);
      setConnectionStatus('fully_connected');
      setError(null);
    };

    const handleDisconnected = (data) => {
      console.log('[useChat] WebSocket disconnected:', data);
      setIsConnected(false);
      setConnectionStatus('websocket_disconnected');
    };

    const handleMessage = (data) => {
      if (data.type === 'chat_message') {
        const message = {
          ...data.message,
          status: 'received'
        };
        setMessages(prev => [...prev, message]);
        sessionManager.addChatMessage(message);
      }
    };

    const handleError = (error) => {
      console.error('[useChat] WebSocket error:', error);
      setError('WebSocket connection error');
      setIsConnected(false);
      setConnectionStatus('websocket_error');
    };

    const handleMaxReconnects = () => {
      console.error('[useChat] WebSocket max reconnects reached');
      setError('Connection lost. Please refresh the page.');
      setConnectionStatus('connection_lost');
    };

    websocketManager.on('connected', handleConnected);
    websocketManager.on('disconnected', handleDisconnected);
    websocketManager.on('message', handleMessage);
    websocketManager.on('error', handleError);
    websocketManager.on('max_reconnects_reached', handleMaxReconnects);

    return () => {
      websocketManager.off('connected', handleConnected);
      websocketManager.off('disconnected', handleDisconnected);
      websocketManager.off('message', handleMessage);
      websocketManager.off('error', handleError);
      websocketManager.off('max_reconnects_reached', handleMaxReconnects);
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      websocketManager.disconnect();
    };
  }, []);

  return {
    isConnected,
    currentChat,
    messages,
    isLoading,
    error,
    connectionStatus,
    initializeChat,
    sendMessage,
    testConnection
  };
};
```

---

## 🧪 **Testing & Validation**

### Step 5: Connection Testing Component

**Create**: `src/components/ConnectionTest.js` (for debugging)

```javascript
import React, { useState, useEffect } from 'react';
import miptechApi from '../services/miptechApi';
import websocketManager from '../services/websocketManager';

const ConnectionTest = () => {
  const [apiStatus, setApiStatus] = useState('testing');
  const [wsStatus, setWsStatus] = useState('disconnected');
  const [testResults, setTestResults] = useState({});

  const testAPIConnection = async () => {
    try {
      setApiStatus('testing');
      const result = await miptechApi.testConnection();
      setApiStatus(result.connected ? 'connected' : 'failed');
      setTestResults(prev => ({ ...prev, api: result }));
    } catch (error) {
      setApiStatus('failed');
      setTestResults(prev => ({ ...prev, api: { connected: false, error: error.message } }));
    }
  };

  const testWebSocketConnection = () => {
    websocketManager.on('connected', () => {
      setWsStatus('connected');
      setTestResults(prev => ({ ...prev, ws: { connected: true } }));
    });

    websocketManager.on('error', (error) => {
      setWsStatus('failed');
      setTestResults(prev => ({ ...prev, ws: { connected: false, error } }));
    });

    websocketManager.connect();
  };

  useEffect(() => {
    testAPIConnection();
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'connected': return 'text-green-600';
      case 'failed': return 'text-red-600';
      case 'testing': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="fixed top-4 left-4 bg-white p-4 rounded-lg shadow-lg border z-50 max-w-md">
      <h3 className="font-bold mb-3">MIPTech Platform Connection Test</h3>
      
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span>API Connection:</span>
          <span className={getStatusColor(apiStatus)}>{apiStatus}</span>
        </div>
        
        <div className="flex justify-between">
          <span>WebSocket:</span>
          <span className={getStatusColor(wsStatus)}>{wsStatus}</span>
        </div>
        
        <div className="text-xs text-gray-500 mt-2">
          <div>API URL: {process.env.REACT_APP_MIPTECH_API_URL}</div>
          <div>WS URL: {process.env.REACT_APP_MIPTECH_WS_URL}</div>
          <div>Tenant: {process.env.REACT_APP_MIPTECH_TENANT_ID}</div>
        </div>
      </div>
      
      <div className="mt-3 space-x-2">
        <button 
          onClick={testAPIConnection}
          className="px-3 py-1 bg-blue-500 text-white rounded text-xs"
        >
          Test API
        </button>
        <button 
          onClick={testWebSocketConnection}
          className="px-3 py-1 bg-green-500 text-white rounded text-xs"
        >
          Test WebSocket
        </button>
      </div>
      
      {Object.keys(testResults).length > 0 && (
        <div className="mt-3 text-xs bg-gray-100 p-2 rounded">
          <pre>{JSON.stringify(testResults, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

export default ConnectionTest;
```

### Step 6: Add Connection Test to App (Temporary)

**Update**: `src/App.js` (add temporarily for testing)

```javascript
import React from 'react';
import ChatWidget from './components/ChatWidget';
import ConnectionTest from './components/ConnectionTest'; // Add this for testing
import { ErrorBoundary } from 'react-error-boundary';

// Your existing components
import AnimatedBackground from './components/AnimatedBackground';
import ThreeJSCanvas from './components/ThreeJSCanvas';
import Navigation from './components/Navigation';

function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div className="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded z-50">
      <h3 className="font-bold">Chat Error</h3>
      <p>{error.message}</p>
      <button
        onClick={resetErrorBoundary}
        className="mt-2 bg-red-500 text-white px-3 py-1 rounded text-sm"
      >
        Try Again
      </button>
    </div>
  );
}

function App() {
  return (
    <div className="App">
      {/* Temporary: Connection Testing Component */}
      {process.env.REACT_APP_DEBUG_API === 'true' && <ConnectionTest />}
      
      {/* Your existing app structure */}
      <AnimatedBackground />
      <ThreeJSCanvas />
      <Navigation />
      
      {/* Your existing page content */}
      <main>
        {/* Your existing components */}
      </main>
      
      {/* MIPTech AI Chat Widget */}
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <ChatWidget 
          position="bottom-right"
          theme="light"
          primaryColor="#2563eb"
        />
      </ErrorBoundary>
    </div>
  );
}

export default App;
```

---

## ✅ **Validation Checklist**

### Pre-Deployment Checklist

**Environment Setup:**
- [ ] `.env` file created with localhost URLs
- [ ] `.env.production` file created with production URLs
- [ ] `REACT_APP_MIPTECH_TENANT_ID=miptech-company` in both files

**API Connection:**
- [ ] Connection test component shows "API Connection: connected"
- [ ] Browser Network tab shows requests with `X-Tenant-ID: miptech-company` header
- [ ] No "Tenant ID not found" errors in platform logs

**WebSocket Connection:**
- [ ] Connection test component shows "WebSocket: connected"  
- [ ] WebSocket URL includes tenant_id parameter
- [ ] Platform logs show successful WebSocket authentication

**Chat Functionality:**
- [ ] Chat widget shows "connected" status (green dot)
- [ ] Messages can be sent successfully
- [ ] AI responses are received
- [ ] No errors in browser console

### Common Issues & Solutions

**Issue**: API shows "401 Unauthorized"
**Solution**: Check that `X-Tenant-ID` header is being sent

**Issue**: WebSocket shows "403 Forbidden"  
**Solution**: Verify WebSocket URL includes `tenant_id` parameter

**Issue**: "CORS policy" errors
**Solution**: Confirm platform has `localhost:3000` in CORS origins (already configured)

**Issue**: "Tenant ID not found in request"
**Solution**: Ensure `X-Tenant-ID: miptech-company` header is present in all API calls

---

## 🚀 **Next Steps**

1. **Apply these changes** to your React application
2. **Test locally** using the connection test component
3. **Verify platform logs** show no tenant resolution errors
4. **Remove connection test component** after successful testing
5. **Deploy to production** with production environment variables

---

## 🔒 **Security Notes**

✅ **What we changed**: Client-side configuration only  
✅ **What we preserved**: All platform security logic unchanged  
✅ **Production impact**: Zero changes to production middleware  
✅ **Easy rollback**: Remove client-side changes if needed

The platform's tenant middleware security remains completely intact - we're simply using the existing `X-Tenant-ID` header functionality that was already implemented.

---

**Document Version**: 1.0  
**Last Updated**: July 15, 2025  
**Security Verified**: No platform modifications required