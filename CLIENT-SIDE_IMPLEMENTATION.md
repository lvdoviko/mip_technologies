Client-Side Engineering Team - Code Documentation

  WebSocket Integration Implementation Guide

  🔗 Complete WebSocket Manager Implementation

  File: src/services/websocketManager.js

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
      this.reconnectTimeout = null;

      // Debug configuration
      this.debugMode = process.env.REACT_APP_DEBUG_API === 'true';
    }

    connect(sessionId) {
      this.sessionId = sessionId || uuidv4();

      // 🔥 CRITICAL: Correct WebSocket URL with tenant parameter
      const wsUrl = `${this.baseURL}/api/v1/ws/chat?tenant_id=${this.tenantId}&session_id=${this.sessionId}`;

      if (this.debugMode) {
        console.log(`[WebSocket] Connecting to: ${wsUrl}`, {
          tenantId: this.tenantId,
          sessionId: this.sessionId,
          attempt: this.reconnectAttempts + 1
        });
      }

      try {
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('[WebSocket] Connected to MIPTech Platform');
          this.isConnected = true;
          this.reconnectAttempts = 0;

          // Clear reconnection timeout
          if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
          }

          // 🔥 CRITICAL: Send authentication immediately
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
            if (this.debugMode) {
              console.log('[WebSocket] Received:', data);
            }

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

          // Handle specific close codes
          if (event.code === 1011) {
            console.error('[WebSocket] Server internal error - likely Pinecone initialization issue');
            this.emit('server_error', { message: 'Server configuration error' });
          }

          // Attempt to reconnect with exponential backoff
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

            console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt 
  ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

            this.reconnectTimeout = setTimeout(() => {
              this.connect(this.sessionId);
            }, delay);
          } else {
            console.error('[WebSocket] Max reconnection attempts reached');
            this.emit('max_reconnects_reached');
          }
        };

        this.ws.onerror = (error) => {
          console.error('[WebSocket] Connection error:', error);
          this.isConnected = false;
          this.emit('error', error);
        };

      } catch (error) {
        console.error('[WebSocket] Failed to create WebSocket:', error);
        this.emit('error', error);
      }
    }

    send(data) {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        const message = JSON.stringify(data);
        if (this.debugMode) {
          console.log('[WebSocket] Sending:', data);
        }
        this.ws.send(message);
        return true;
      } else {
        console.warn('[WebSocket] Cannot send message - connection not open:', {
          readyState: this.ws?.readyState,
          isConnected: this.isConnected
        });
        return false;
      }
    }

    disconnect() {
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = null;
      }

      if (this.ws) {
        console.log('[WebSocket] Manually disconnecting');
        this.ws.close(1000, 'Manual disconnect');
        this.ws = null;
        this.isConnected = false;
      }
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
        this.listeners.get(event).forEach(callback => {
          try {
            callback(data);
          } catch (error) {
            console.error(`[WebSocket] Error in ${event} callback:`, error);
          }
        });
      }
    }

    // Health check method
    ping() {
      return this.send({ type: 'ping', timestamp: Date.now() });
    }

    // Get connection status
    getStatus() {
      return {
        isConnected: this.isConnected,
        readyState: this.ws?.readyState,
        reconnectAttempts: this.reconnectAttempts,
        sessionId: this.sessionId,
        tenantId: this.tenantId
      };
    }
  }

  export default new WebSocketManager();

  🔧 API Client with Proper Headers

  File: src/services/miptechApi.js

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
          'X-Tenant-ID': this.tenantId,  // 🔥 CRITICAL: Required for all requests
          'User-Agent': 'MIPTech-Website/1.0'
        }
      });

      // Request interceptor - ensure tenant header is always present
      client.interceptors.request.use(
        (config) => {
          // Always ensure X-Tenant-ID header is present
          if (!config.headers['X-Tenant-ID']) {
            config.headers['X-Tenant-ID'] = this.tenantId;
          }

          if (process.env.REACT_APP_DEBUG_API === 'true') {
            console.log(`[API] ${config.method.toUpperCase()} ${config.url}`, {
              headers: config.headers,
              tenantId: config.headers['X-Tenant-ID']
            });
          }

          return config;
        },
        (error) => {
          console.error('[API] Request error:', error);
          return Promise.reject(error);
        }
      );

      // Response interceptor
      client.interceptors.response.use(
        (response) => {
          if (process.env.REACT_APP_DEBUG_API === 'true') {
            console.log(`[API] ${response.status} ${response.config.url}`);
          }
          return response;
        },
        (error) => {
          console.error('[API] Response error:', error.response?.data || error.message);

          // Handle specific error cases
          if (error.response?.status === 404 && error.config.url.includes('/health')) {
            console.warn('[API] Health endpoint not found - trying fallback');
          }

          return Promise.reject(error);
        }
      );

      return client;
    }

    // Connection test method
    async testConnection() {
      try {
        const response = await this.client.get('/health');
        console.log('[API] Connection test successful:', response.data);
        return { connected: true, data: response.data };
      } catch (error) {
        // Try fallback health endpoint
        try {
          const response = await axios.get(`${this.baseURL}/healthz`, {
            headers: { 'X-Tenant-ID': this.tenantId }
          });
          console.log('[API] Fallback health check successful:', response.data);
          return { connected: true, data: response.data };
        } catch (fallbackError) {
          console.error('[API] Connection test failed:', error.message);
          return { connected: false, error: error.message };
        }
      }
    }

    // Chat operations
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
            tenant_id: this.tenantId
          }
        });

        console.log('[API] Chat created successfully:', response.data);
        return response.data;
      } catch (error) {
        console.error('[API] Failed to create chat:', error.response?.data || error.message);
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

        console.log('[API] Message sent successfully:', response.data);
        return response.data;
      } catch (error) {
        console.error('[API] Failed to send message:', error.response?.data || error.message);
        throw new Error(`Failed to send message: ${error.message}`);
      }
    }

    async getChatHistory(chatId) {
      try {
        const response = await this.client.get(`/chat/${chatId}/messages`);
        return response.data;
      } catch (error) {
        console.error('[API] Failed to get chat history:', error.response?.data || error.message);
        throw new Error(`Failed to get chat history: ${error.message}`);
      }
    }
  }

  export default new MIPTechAPI();

  ⚙️ Environment Configuration

  File: .env (development)
  # MIPTech Platform Configuration
  REACT_APP_MIPTECH_API_URL=http://localhost:8000
  REACT_APP_MIPTECH_WS_URL=ws://localhost:8000
  REACT_APP_MIPTECH_TENANT_ID=miptech-company

  # Debug Configuration
  REACT_APP_DEBUG_API=true
  REACT_APP_ENVIRONMENT=development

  File: .env.production
  # MIPTech Platform Configuration - Production
  REACT_APP_MIPTECH_API_URL=https://api.miptechnologies.tech
  REACT_APP_MIPTECH_WS_URL=wss://api.miptechnologies.tech
  REACT_APP_MIPTECH_TENANT_ID=miptech-company

  # Production Configuration
  REACT_APP_DEBUG_API=false
  REACT_APP_ENVIRONMENT=production

  🧪 Connection Testing Component

  File: src/components/ConnectionTest.js

  import React, { useState, useEffect } from 'react';
  import miptechApi from '../services/miptechApi';
  import websocketManager from '../services/websocketManager';

  const ConnectionTest = () => {
    const [apiStatus, setApiStatus] = useState('idle');
    const [wsStatus, setWsStatus] = useState('idle');
    const [testResults, setTestResults] = useState({});

    const testConnections = async () => {
      setApiStatus('testing');
      setWsStatus('testing');

      // Test API
      try {
        const apiResult = await miptechApi.testConnection();
        setApiStatus(apiResult.connected ? 'success' : 'failed');
        setTestResults(prev => ({ ...prev, api: apiResult }));
      } catch (error) {
        setApiStatus('failed');
        setTestResults(prev => ({ ...prev, api: { connected: false, error: error.message } }));
      }

      // Test WebSocket
      const wsPromise = new Promise((resolve) => {
        const timeout = setTimeout(() => {
          setWsStatus('failed');
          resolve({ connected: false, error: 'Connection timeout' });
        }, 5000);

        websocketManager.on('connected', (data) => {
          clearTimeout(timeout);
          setWsStatus('success');
          resolve({ connected: true, data });
          websocketManager.disconnect();
        });

        websocketManager.on('server_error', (error) => {
          clearTimeout(timeout);
          setWsStatus('failed');
          resolve({ connected: false, error: 'Server configuration error (Pinecone)' });
        });

        websocketManager.on('error', (error) => {
          clearTimeout(timeout);
          setWsStatus('failed');
          resolve({ connected: false, error: error.message });
        });

        websocketManager.connect();
      });

      const wsResult = await wsPromise;
      setTestResults(prev => ({ ...prev, ws: wsResult }));
    };

    // Auto-run tests in debug mode
    useEffect(() => {
      if (process.env.REACT_APP_DEBUG_API === 'true') {
        testConnections();
      }
    }, []);

    if (process.env.REACT_APP_DEBUG_API !== 'true') {
      return null;
    }

    return (
      <div style={{
        position: 'fixed',
        top: '10px',
        right: '10px',
        background: '#000',
        color: '#00ff00',
        padding: '15px',
        borderRadius: '8px',
        fontSize: '12px',
        fontFamily: 'monospace',
        maxWidth: '400px',
        zIndex: 10000
      }}>
        <div style={{ marginBottom: '10px', fontWeight: 'bold' }}>
          🔧 MIPTech Connection Test
        </div>

        <div style={{ marginBottom: '10px' }}>
          <strong>API:</strong>
          <span style={{ color: apiStatus === 'success' ? '#00ff00' : apiStatus === 'failed' ? '#ff0000' : '#ffff00' 
  }}>
            {apiStatus}
          </span>
        </div>

        <div style={{ marginBottom: '10px' }}>
          <strong>WebSocket:</strong>
          <span style={{ color: wsStatus === 'success' ? '#00ff00' : wsStatus === 'failed' ? '#ff0000' : '#ffff00' }}>
            {wsStatus}
          </span>
        </div>

        <button 
          onClick={testConnections}
          style={{
            background: '#007700',
            color: 'white',
            border: 'none',
            padding: '5px 10px',
            borderRadius: '4px',
            cursor: 'pointer',
            marginBottom: '10px'
          }}
        >
          🔄 Retest
        </button>

        {/* Configuration Display */}
        <div style={{ fontSize: '10px', color: '#ccc', marginTop: '10px' }}>
          <div>API: {process.env.REACT_APP_MIPTECH_API_URL}</div>
          <div>WS: {process.env.REACT_APP_MIPTECH_WS_URL}</div>
          <div>Tenant: {process.env.REACT_APP_MIPTECH_TENANT_ID}</div>
        </div>

        {/* Test Results */}
        {Object.keys(testResults).length > 0 && (
          <div style={{ fontSize: '10px', marginTop: '10px', maxHeight: '150px', overflow: 'auto' }}>
            <strong>Results:</strong>
            <pre>{JSON.stringify(testResults, null, 2)}</pre>
          </div>
        )}
      </div>
    );
  };

  export default ConnectionTest;

  🔧 Integration in App.js

  File: src/App.js

  import React from 'react';
  import ChatWidget from './components/ChatWidget';
  import ConnectionTest from './components/ConnectionTest';
  import { ErrorBoundary } from 'react-error-boundary';

  function ChatErrorFallback({ error, resetErrorBoundary }) {
    return (
      <div style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        background: '#fee',
        border: '1px solid #fcc',
        padding: '15px',
        borderRadius: '8px',
        maxWidth: '300px',
        zIndex: 10000
      }}>
        <h3 style={{ color: '#c33', margin: '0 0 10px 0' }}>Chat Connection Error</h3>
        <p style={{ margin: '0 0 10px 0', fontSize: '14px' }}>{error.message}</p>
        <button
          onClick={resetErrorBoundary}
          style={{
            background: '#c33',
            color: 'white',
            border: 'none',
            padding: '8px 12px',
            borderRadius: '4px',
            cursor: 'pointer',
            marginRight: '10px'
          }}
        >
          Retry
        </button>
        <button
          onClick={() => window.location.reload()}
          style={{
            background: '#666',
            color: 'white',
            border: 'none',
            padding: '8px 12px',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Reload Page
        </button>
      </div>
    );
  }

  function App() {
    return (
      <div className="App">
        {/* Debug Connection Test - only shows in development */}
        <ConnectionTest />

        {/* Your existing app content */}
        <main>
          {/* Your existing components */}
        </main>

        {/* MIPTech Chat Widget */}
        <ErrorBoundary FallbackComponent={ChatErrorFallback}>
          <ChatWidget 
            position="bottom-right"
            theme="light"
            primaryColor="#2563eb"
            title="MIPTech AI Assistant"
          />
        </ErrorBoundary>
      </div>
    );
  }

  export default App;

  🧪 Testing & Debugging

  Browser Console Tests:
  // Test API connection
  fetch('http://localhost:8000/api/v1/health', {
    headers: { 'X-Tenant-ID': 'miptech-company' }
  })
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);

  // Test WebSocket connection
  const ws = new WebSocket('ws://localhost:8000/api/v1/ws/chat?tenant_id=miptech-company&session_id=test-123');
  ws.onopen = () => console.log('✅ WebSocket connected');
  ws.onclose = (e) => console.log('❌ WebSocket closed:', e.code, e.reason);
  ws.onerror = (e) => console.error('❌ WebSocket error:', e);

  Expected Success Indicators:
  - API: Returns {"status": "healthy", "version": "0.1.0"}
  - WebSocket: Connection remains open, no immediate close with code 1011
  - Console: No Pinecone initialization errors

  📋 Deployment Checklist

  1. Environment Variables: Configured correctly for target environment
  2. Dependencies: npm install completed successfully
  3. Build Process: npm run build completes without errors
  4. Connection Test: Shows green status for both API and WebSocket
  5. Error Handling: Graceful degradation when platform is unavailable
  6. Debug Mode: Disabled in production (REACT_APP_DEBUG_API=false)

  🚨 Known Issues & Status

  Current Blocker: Platform Pinecone initialization error causes WebSocket to close immediately with code 1011

  Client-Side Status: ✅ Ready and waiting for platform fix

  Next Steps: Once platform deploys Pinecone fix, test full integration immediately

  This implementation provides robust connection handling, comprehensive error handling, and detailed debugging
  capabilities for the client-side integration.