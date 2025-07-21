MIPTech AI Platform - React SPA Integration Fix Specification

  📋 EXECUTIVE SUMMARY

  This document provides the complete, definitive specification for fixing the React SPA chatbot connectivity issues
  with the MIPTech AI Platform. Every code change, file modification, and implementation detail is documented with
  surgical precision.

  Current Status: ❌ BROKEN - No connectivity between client and platformTarget Status: ✅ FULLY FUNCTIONAL -
  End-to-end MVP connectivity established

  🔍 PROBLEM ANALYSIS

  Current Failure Points (From Logs):

  ❌ Request error: GET /health returned 404 (tenant: unknown)
  ❌ Request error: POST /api/v1/chat/ returned 422 (tenant: unknown)
  ❌ [API Error] Error: Failed to create chat session: 422 Unprocessable Entity
  ❌ WebSocket connection fails due to missing chat_id
  ❌ React StrictMode causing double initialization

  Platform Requirements (From FINAL-CLIENT-SIDE.md):

  ✅ OAuth2 JWT Authentication (production) OR DEBUG mode (development)
  ✅ X-Tenant-ID header on ALL requests
  ✅ Two-step flow: REST API chat creation → WebSocket with chat_id
  ✅ Specific API endpoints: /api/v1/* (not root level)
  ✅ Platform initialization timing (1.7s+ for AI services)

  ---
  🛠️ IMPLEMENTATION SPECIFICATION

  PHASE 1: ENVIRONMENT CONFIGURATION

  1.1 Create Environment File

  File: .env (CREATE NEW in root directory)
  Location: /home/mattia/mip_sito/mip_technologies/.env

  # =============================================================================
  # MIPTech Platform Configuration
  # =============================================================================

  # Platform Connection URLs
  REACT_APP_MIPTECH_API_URL=http://localhost:8000
  REACT_APP_MIPTECH_WS_URL=ws://localhost:8000

  # Tenant Configuration
  REACT_APP_MIPTECH_TENANT_ID=miptech-company

  # Development Mode (allows unauthenticated requests for testing)
  REACT_APP_DEBUG_MODE=true

  # API Configuration
  REACT_APP_MIPTECH_API_VERSION=v1

  # Authentication Configuration (for future production use)
  REACT_APP_JWT_ACCESS_TOKEN_KEY=miptech_access_token
  REACT_APP_JWT_REFRESH_TOKEN_KEY=miptech_refresh_token

  # WebSocket Configuration
  REACT_APP_WS_RECONNECT_ATTEMPTS=3
  REACT_APP_WS_RECONNECT_DELAY=1000

  ---
  PHASE 2: API CLIENT FIXES

  2.1 Fix API Client Core Issues

  File: src/services/miptechApi.js
  Location: /home/mattia/mip_sito/mip_technologies/src/services/miptechApi.js

  CRITICAL FIX 1: Health Endpoint (Line ~72)
  // ❌ CURRENT CODE (causing 404):
  async health() {
    return this.request('/health');
  }

  // ✅ FIXED CODE:
  async health() {
    return this.request('/api/v1/health');
  }

  CRITICAL FIX 2: Headers Method (Line ~10-24)
  // ❌ CURRENT CODE (missing X-Tenant-ID):
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

  // ✅ THE CURRENT CODE IS ACTUALLY CORRECT - NO CHANGE NEEDED
  // The issue is that the headers aren't being used consistently

  CRITICAL FIX 3: Chat Creation Method (Line ~88-123)
  // ❌ CURRENT CODE (causing 422 error):
  async createChat(sessionId, visitorId = null, options = {}) {
    // Validate input before making request
    this.validateChatCreateData(sessionId, visitorId, options);

    const requestData = {
      session_id: sessionId,
      visitor_id: visitorId,
      title: options.title || 'Website Chat',
      context: options.context || {}
    };

    console.log('🔍 [API] Creating chat with validated data:', requestData);

    return this.request('/chat', {
      method: 'POST',
      body: JSON.stringify(requestData)
    });
  }

  // ✅ FIXED CODE:
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

  CRITICAL FIX 4: Add Missing sendMessage Method
  // ✅ ADD THIS METHOD (missing from current implementation):
  async sendMessage(chatId, message, options = {}) {
    return this.request(`/api/v1/chat/${chatId}/message`, {
      method: 'POST',
      body: JSON.stringify({
        message,
        metadata: options.metadata || {}
      })
    });
  }

  ---
  PHASE 3: WEBSOCKET MANAGER FIXES

  3.1 Fix WebSocket URL Construction

  File: src/services/websocketManager.js
  Location: /home/mattia/mip_sito/mip_technologies/src/services/websocketManager.js

  CRITICAL FIX 1: Connect Method (Line ~77-141)
  // ❌ CURRENT CODE (missing chat_id parameter):
  async connect(chatId = null) {
    try {
      // Build WebSocket URL with chat_id parameter for platform routing
      const wsUrl = chatId ? this.buildWebSocketUrlWithChatId(chatId) : this.buildWebSocketUrl();

      console.log('🔌 [WebSocket] Connecting to:', wsUrl);

      // Validate URL format before attempting connection
      try {
        const url = new URL(wsUrl);
        if (!url.searchParams.get('tenant_id')) {
          throw new Error('Missing tenant_id parameter - check environment configuration');
        }
      } catch (urlError) {
        console.error('❌ [WebSocket] Invalid URL format:', urlError);
        throw new Error(`Invalid WebSocket URL: ${urlError.message}`);
      }

      this.ws = new WebSocket(wsUrl);
      // ... rest of method
    }
  }

  // ✅ FIXED CODE:
  async connect(chatId = null) {
    try {
      // Build WebSocket URL with chat_id parameter for platform routing
      const wsUrl = chatId ? this.buildWebSocketUrlWithChatId(chatId) : this.buildWebSocketUrl();

      console.log('🔌 [WebSocket] Connecting to:', wsUrl);

      // Validate URL format before attempting connection
      try {
        const url = new URL(wsUrl);
        if (!url.searchParams.get('tenant_id')) {
          throw new Error('Missing tenant_id parameter - check environment configuration');
        }
        // ✅ CRITICAL: Validate chat_id for platform routing
        if (chatId && !url.searchParams.get('chat_id')) {
          throw new Error('Missing chat_id parameter - required for platform message routing');
        }
      } catch (urlError) {
        console.error('❌ [WebSocket] Invalid URL format:', urlError);
        throw new Error(`Invalid WebSocket URL: ${urlError.message}`);
      }

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
      this.ws.onerror = this.handleError.bind(this);

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          const timeoutError = new Error('WebSocket connection timeout - platform may be starting');
          timeoutError.type = 'timeout_error';
          reject(timeoutError);
        }, 10000);

        this.once('connected', () => {
          clearTimeout(timeout);
          resolve();
        });

        this.once('error', (error) => {
          clearTimeout(timeout);

          // Enhanced error context for platform debugging
          if (error.code === 403) {
            error.troubleshooting = 'Check REACT_APP_MIPTECH_TENANT_ID environment variable';
          } else if (error.code === 422) {
            error.troubleshooting = 'Verify chat_id format and platform requirements';
          } else if (error.code === 429) {
            error.troubleshooting = 'Reduce connection frequency or implement exponential backoff';
          }

          reject(error);
        });
      });

    } catch (error) {
      console.error('❌ [WebSocket] Connection setup failed:', error);

      // Categorize setup errors
      if (error.message.includes('tenant_id')) {
        error.type = 'configuration_error';
        error.troubleshooting = 'Set REACT_APP_MIPTECH_TENANT_ID in your .env file';
      }

      throw error;
    }
  }

  CRITICAL FIX 2: Message Handling (Line ~154-238)
  // ❌ CURRENT CODE (missing critical message handlers):
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

        // ... other cases exist but missing critical ones
      }
    }
  }

  // ✅ FIXED CODE (add missing handlers):
  handleMessage(event) {
    try {
      const data = JSON.parse(event.data);
      console.log('📥 [WebSocket] Received:', data.type, data);

      switch (data.type) {
        case 'connection_established':
          console.log('🎯 [WebSocket] Connection established');
          console.log('🔑 [WebSocket] Server-assigned client_id:', data.data.client_id);
          this.serverClientId = data.data.client_id; // Store platform-assigned client ID
          this.emit('connection_established', data);  // ✅ CRITICAL: Emit event
          break;

        case 'connection_ready':
          console.log('🚀 [WebSocket] Connection ready for messages');
          this.isReady = true;
          this.emit('connection_ready', data);        // ✅ CRITICAL: Use correct event name
          break;

        // ✅ CRITICAL: Add missing platform message handlers
        case 'platform_initializing':
          console.log('🔄 [Platform] Platform is initializing AI services...');
          this.emit('initialization_progress', data);
          break;

        case 'platform_ready':
          console.log('✅ [Platform] AI services are fully loaded and ready');
          this.emit('ready', data);
          break;

        case 'ai_services_loading':
          console.log('⚙️ [Platform] Vector database and LLM services loading...');
          this.emit('initialization_progress', data);
          break;

        case 'ai_services_ready':
          console.log('🤖 [Platform] All AI components initialized');
          this.emit('ready', data);
          break;

        case 'initialization_progress':
          console.log('📊 [Platform] Initialization progress:', data.data);
          this.emit('initialization_progress', data);
          break;

        // ✅ CRITICAL: Add streaming response handlers
        case 'response_start':
          console.log('🎬 [Platform] Response streaming started');
          this.emit('response_start', data);
          break;

        case 'response_chunk':
          console.log('📝 [Platform] Response chunk received');
          this.emit('response_chunk', data);
          break;

        case 'response_complete':
          console.log('🏁 [Platform] Response streaming complete');
          this.emit('response_complete', data);
          break;

        case 'ping':
          // Handle platform ping messages
          this.emit('ping', data);
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

  CRITICAL FIX 3: Add Missing Methods
  // ✅ ADD THESE METHODS (missing from current implementation):

  // Typing indicator methods (required by useChat hook)
  sendTyping(chatId, isTyping) {
    if (!this.isConnected || !this.isReady) {
      console.warn('⚠️ [WebSocket] Cannot send typing indicator - connection not ready');
      return;
    }

    this.sendMessage('typing', {
      chat_id: chatId,
      typing: isTyping,
      tenant_id: this.tenantId
    });
  }

  // Health check method
  ping() {
    if (this.isConnected) {
      this.sendMessage('ping', { timestamp: Date.now() });
    }
  }

  ---
  PHASE 4: CHAT HOOK INTEGRATION FIXES

  4.1 Fix useChat Hook Core Issues

  File: src/hooks/useChat.js
  Location: /home/mattia/mip_sito/mip_technologies/src/hooks/useChat.js

  CRITICAL FIX 1: Platform Readiness Check (Line ~165-194)
  // ❌ CURRENT CODE (basic implementation):
  const waitForPlatformReady = useCallback(async (retries = 5) => {
    const apiUrl = process.env.REACT_APP_MIPTECH_API_URL || 'http://localhost:8000';

    for (let i = 0; i < retries; i++) {
      try {
        console.log(`🔍 [Platform] Checking readiness (${i + 1}/${retries})...`);
        const response = await fetch(`${apiUrl}/health`);

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
        // Wait 1.7 seconds for AI services initialization
        console.log('⏱️ [Platform] Waiting 1.7s for AI services initialization...');
        await new Promise(resolve => setTimeout(resolve, 1700));
      }
    }

    console.warn('⚠️ [Platform] AI services not confirmed ready, proceeding anyway');
    return false;
  }, []);

  // ✅ FIXED CODE:
  const waitForPlatformReady = useCallback(async (retries = 5) => {
    const apiUrl = process.env.REACT_APP_MIPTECH_API_URL || 'http://localhost:8000';
    const tenantId = process.env.REACT_APP_MIPTECH_TENANT_ID || 'miptech-company';

    for (let i = 0; i < retries; i++) {
      try {
        console.log(`🔍 [Platform] Checking readiness (${i + 1}/${retries})...`);
        // ✅ CRITICAL: Use correct endpoint and headers
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
        // Wait 1.7 seconds for AI services initialization
        console.log('⏱️ [Platform] Waiting 1.7s for AI services initialization...');
        await new Promise(resolve => setTimeout(resolve, 1700));
      }
    }

    console.warn('⚠️ [Platform] AI services not confirmed ready, proceeding anyway');
    return false;
  }, []);

  CRITICAL FIX 2: Chat Session Creation (Line ~199-226)
  // ❌ CURRENT CODE (causing 422 error):
  const createChatSession = useCallback(async (tenantId) => {
    const apiUrl = process.env.REACT_APP_MIPTECH_API_URL || 'http://localhost:8000';

    try {
      console.log('💬 [Platform] Creating chat session via REST API...');
      const response = await fetch(`${apiUrl}/api/v1/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tenant_id: tenantId,
          title: 'Website Chat Session'
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to create chat session: ${response.status} ${response.statusText}`);
      }

      const chatData = await response.json();
      console.log('✅ [Platform] Chat session created:', chatData.chat_id || chatData.id);
      return chatData.chat_id || chatData.id;
    } catch (error) {
      console.error('❌ [Platform] Failed to create chat session:', error);
      throw error;
    }
  }, []);

  // ✅ FIXED CODE:
  const createChatSession = useCallback(async (tenantId) => {
    const apiUrl = process.env.REACT_APP_MIPTECH_API_URL || 'http://localhost:8000';

    try {
      console.log('💬 [Platform] Creating chat session via REST API...');

      // ✅ CRITICAL: Generate required session and visitor IDs
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const visitorId = `visitor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const response = await fetch(`${apiUrl}/api/v1/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': tenantId  // ✅ CRITICAL: Add required header
        },
        body: JSON.stringify({
          session_id: sessionId,   // ✅ CRITICAL: Required field
          visitor_id: visitorId,   // ✅ CRITICAL: Required field
          title: 'Website Chat Session',
          tenant_id: tenantId      // ✅ CRITICAL: Required in body
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

  CRITICAL FIX 3: WebSocket Connection Method (Line ~258-292)
  // ❌ CURRENT CODE (no chat_id parameter):
  const connectWebSocket = useCallback(async (chatId) => {
    console.log(`🔌 [DEBUG] connectWebSocket called with chatId: ${chatId}`);

    // CRITICAL: Check if WebSocket manager exists
    console.log('🔍 [DEBUG] websocketRef.current:', websocketRef.current);
    console.log('🔍 [DEBUG] typeof websocketRef.current:', typeof websocketRef.current);

    if (!websocketRef.current) {
      console.error('❌ [CRITICAL] WebSocket manager is NULL - this is the bug!');
      throw new Error('WebSocket manager not initialized');
    }

    // Check connect method exists
    console.log('🔍 [DEBUG] connect method:', typeof websocketRef.current.connect);

    try {
      if (chatConfig.enablePerformanceTracking) {
        performanceRef.current.startTimer('websocket_connection');
      }

      console.log('🔌 [DEBUG] Calling websocketRef.current.connect() with chatId...');
      await websocketRef.current.connect(chatId);
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

  // ✅ THE CURRENT CODE IS ACTUALLY CORRECT - NO CHANGES NEEDED
  // The issue is in the WebSocket manager implementation, not this method

  CRITICAL FIX 4: Event Handlers (Line ~740-1020)
  // ❌ CURRENT CODE (missing critical event handlers):
  useEffect(() => {
    const wsManager = websocketRef.current;

    const handleConnected = () => {
      if (isUnmountedRef.current) return;
      setConnectionState(CHAT_STATES.CONNECTED);
      setError(null);
    };

    // ... existing handlers

    // Missing critical handlers for platform integration
  }, [chatConfig.enablePersistence, chatConfig.enablePerformanceTracking]);

  // ✅ FIXED CODE (add missing handlers):
  useEffect(() => {
    const wsManager = websocketRef.current;

    const handleConnected = () => {
      if (isUnmountedRef.current) return;
      setConnectionState(CHAT_STATES.CONNECTED);
      setError(null);
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

    const handleReconnecting = () => {
      if (isUnmountedRef.current) return;
      setConnectionState(CHAT_STATES.RECONNECTING);
    };

    // ✅ CRITICAL: Add missing platform event handlers
    const handleConnectionEstablished = (data) => {
      if (isUnmountedRef.current) return;

      console.log('✅ [Chat] Platform connection established, waiting for ready signal');
      setCanSendMessages(false);  // Wait for connection_ready
      setConnectionState(CHAT_STATES.CONNECTED);
      setError(null);

      if (chatConfig.enablePerformanceTracking) {
        performanceRef.current.trackChatWidget('connection_established');
      }
    };

    const handleInitializationProgress = (data) => {
      if (isUnmountedRef.current) return;

      console.log(`⏳ [Chat] Platform initializing: ${data.phase || 'unknown'} - ${data.message || 'Initializing 
  services'}`);
      setInitializationStatus(data);
    };

    const handleConnectionReady = (data) => {
      if (isUnmountedRef.current) return;

      try {
        console.log('✅ [Chat] Platform ready - can send messages');

        // Clear connection timeout
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
          connectionTimeoutRef.current = null;
        }

        setCanSendMessages(true);  // NOW enable message sending
        setIsConnectionReady(true); // FIX: This was missing - critical for application
        setConnectionState(CHAT_STATES.CONNECTED); // Keep as CONNECTED for compatibility
        setError(null);

        if (chatConfig.enablePerformanceTracking) {
          performanceRef.current.trackChatWidget('connection_ready');
        }
      } catch (error) {
        console.error('[Chat] Error in handleConnectionReady:', error);
        // Don't crash the application on handler errors
      }
    };

    // ✅ CRITICAL: Add streaming response handlers
    const handleResponseStart = (data) => {
      if (isUnmountedRef.current) return;

      console.log('🎬 [Chat] Response streaming started');
      setStreamingResponse({
        isStreaming: true,
        messageId: data.message_id,
        content: '',
        chunks: []
      });

      // Add placeholder message for streaming
      const streamingMessage = {
        id: data.message_id,
        content: '',
        role: 'assistant',
        timestamp: new Date().toISOString(),
        status: MESSAGE_STATUS.RECEIVED,
        metadata: { streaming: true }
      };

      setMessages(prev => [...prev, streamingMessage]);
    };

    const handleResponseChunk = (data) => {
      if (isUnmountedRef.current) return;

      console.log('📝 [Chat] Response chunk received');
      setStreamingResponse(prev => ({
        ...prev,
        content: prev.content + data.content,
        chunks: [...prev.chunks, data.content]
      }));

      // Update streaming message
      setMessages(prev => prev.map(msg =>
        msg.id === data.message_id
          ? { ...msg, content: msg.content + data.content }
          : msg
      ));
    };

    const handleResponseComplete = (data) => {
      if (isUnmountedRef.current) return;

      console.log('🏁 [Chat] Response streaming complete');
      setStreamingResponse(prev => ({
        ...prev,
        isStreaming: false
      }));

      // Update final message with metadata
      setMessages(prev => prev.map(msg =>
        msg.id === data.message_id
          ? {
              ...msg,
              metadata: {
                streaming: false,
                totalTokens: data.total_tokens,
                costEstimate: data.cost_estimate,
                sources: data.sources
              }
            }
          : msg
      ));
    };

    // ... existing handlers for message, typing, error, failed

    // ✅ CRITICAL: Add all event listeners
    wsManager.on('connected', handleConnected);
    wsManager.on('connection_established', handleConnectionEstablished);  // ✅ MISSING
    wsManager.on('initialization_progress', handleInitializationProgress); // ✅ MISSING
    wsManager.on('connection_ready', handleConnectionReady);               // ✅ MISSING
    wsManager.on('response_start', handleResponseStart);                   // ✅ MISSING
    wsManager.on('response_chunk', handleResponseChunk);                   // ✅ MISSING
    wsManager.on('response_complete', handleResponseComplete);             // ✅ MISSING
    wsManager.on('disconnected', handleDisconnected);
    wsManager.on('reconnecting', handleReconnecting);
    // ... existing event listeners

    return () => {
      if (wsManager && wsManager.off) {
        wsManager.off('connected', handleConnected);
        wsManager.off('connection_established', handleConnectionEstablished);  // ✅ MISSING
        wsManager.off('initialization_progress', handleInitializationProgress); // ✅ MISSING
        wsManager.off('connection_ready', handleConnectionReady);               // ✅ MISSING
        wsManager.off('response_start', handleResponseStart);                   // ✅ MISSING
        wsManager.off('response_chunk', handleResponseChunk);                   // ✅ MISSING
        wsManager.off('response_complete', handleResponseComplete);             // ✅ MISSING
        wsManager.off('disconnected', handleDisconnected);
        wsManager.off('reconnecting', handleReconnecting);
        // ... existing cleanup
      }
    };
  }, [chatConfig.enablePersistence, chatConfig.enablePerformanceTracking]);

  CRITICAL FIX 5: Typing Methods (Line ~659-686)
  // ❌ CURRENT CODE (references undefined websocket method):
  const startTyping = useCallback(() => {
    if (!currentChat || !chatConfig.enableTypingIndicator) return;

    setIsTyping(true);
    websocketRef.current.sendTyping(currentChat.id, true);  // ✅ This method needs to exist

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, chatConfig.typingTimeout);
  }, [currentChat, chatConfig.enableTypingIndicator, chatConfig.typingTimeout, stopTyping, connectionState,
  isConnectionReady]);

  // ✅ FIXED CODE (add safety checks):
  const startTyping = useCallback(() => {
    if (!currentChat || !chatConfig.enableTypingIndicator || !isConnectionReady) return;

    setIsTyping(true);

    // ✅ CRITICAL: Add safety check for sendTyping method
    if (websocketRef.current && typeof websocketRef.current.sendTyping === 'function') {
      websocketRef.current.sendTyping(currentChat.id, true);
    } else {
      console.warn('⚠️ [Chat] sendTyping method not available on WebSocket manager');
    }

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, chatConfig.typingTimeout);
  }, [currentChat, chatConfig.enableTypingIndicator, chatConfig.typingTimeout, stopTyping, isConnectionReady]);

  const stopTyping = useCallback(() => {
    if (!currentChat || !chatConfig.enableTypingIndicator) return;

    setIsTyping(false);

    // ✅ CRITICAL: Add safety check for sendTyping method
    if (websocketRef.current && typeof websocketRef.current.sendTyping === 'function') {
      websocketRef.current.sendTyping(currentChat.id, false);
    } else {
      console.warn('⚠️ [Chat] sendTyping method not available on WebSocket manager');
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, [currentChat, chatConfig.enableTypingIndicator]);

  ---
  PHASE 5: COMPONENT INTEGRATION FIXES

  5.1 Fix ChatWidget Component Issues

  File: src/components/ChatWidget.jsx
  Location: /home/mattia/mip_sito/mip_technologies/src/components/ChatWidget.jsx

  CRITICAL FIX 1: Connection Trigger Logic (Line ~591-611)
  // ❌ CURRENT CODE (correct logic, but could be enhanced):
  const handleConnectionTrigger = useCallback(() => {
    if (!currentChat && !isConnecting && !connectionTriggeredRef.current) {
      console.log('🚀 [ChatWidget] User typing detected - triggering connection');
      connectionTriggeredRef.current = true;
      setIsConnectionTriggered(true);

      performanceMonitor.startTimer('chat_widget_load');
      initializeChat()
        .then(() => {
          console.log('✅ [ChatWidget] User-triggered connection successful');
          performanceMonitor.endTimer('chat_widget_load');
        })
        .catch((error) => {
          console.error('❌ [ChatWidget] User-triggered connection failed:', error);
          performanceMonitor.endTimer('chat_widget_load');
          connectionTriggeredRef.current = false;
          setIsConnectionTriggered(false);
          onError?.(error);
        });
    }
  }, [currentChat, isConnecting, initializeChat, onError]);

  // ✅ ENHANCED CODE (add better error handling):
  const handleConnectionTrigger = useCallback(() => {
    if (!currentChat && !isConnecting && !connectionTriggeredRef.current) {
      console.log('🚀 [ChatWidget] User typing detected - triggering connection');
      connectionTriggeredRef.current = true;
      setIsConnectionTriggered(true);

      performanceMonitor.startTimer('chat_widget_load');
      initializeChat()
        .then(() => {
          console.log('✅ [ChatWidget] User-triggered connection successful');
          performanceMonitor.endTimer('chat_widget_load');
        })
        .catch((error) => {
          console.error('❌ [ChatWidget] User-triggered connection failed:', error);
          console.error('❌ [ChatWidget] Error details:', error.message, error.stack);
          performanceMonitor.endTimer('chat_widget_load');
          connectionTriggeredRef.current = false;
          setIsConnectionTriggered(false);

          // ✅ CRITICAL: Provide specific error context
          const enhancedError = {
            ...error,
            context: 'User-triggered connection',
            suggestion: 'Check network connection and platform availability'
          };
          onError?.(enhancedError);
        });
    }
  }, [currentChat, isConnecting, initializeChat, onError]);

  CRITICAL FIX 2: Message Sending with Fallback (Line ~614-630)
  // ❌ CURRENT CODE (has fallback but could be improved):
  const handleSendMessage = useCallback(async (content) => {
    try {
      // Fallback trigger: Connect if user clicks send without typing
      if (!currentChat && !isConnecting) {
        console.log('🔄 [ChatWidget] Send clicked without connection - fallback trigger');
        await handleConnectionTrigger();

        // Wait a moment for connection to establish
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const message = await sendMessage(content);
      onMessageSent?.(message);
    } catch (error) {
      onError?.(error);
    }
  }, [sendMessage, onMessageSent, onError, currentChat, isConnecting, handleConnectionTrigger]);

  // ✅ ENHANCED CODE (better connection waiting logic):
  const handleSendMessage = useCallback(async (content) => {
    try {
      // Fallback trigger: Connect if user clicks send without typing
      if (!currentChat && !isConnecting) {
        console.log('🔄 [ChatWidget] Send clicked without connection - fallback trigger');
        await handleConnectionTrigger();

        // ✅ CRITICAL: Wait for actual connection, not just a timeout
        let waitAttempts = 0;
        const maxWaitAttempts = 30; // 3 seconds max wait

        while (!currentChat && waitAttempts < maxWaitAttempts) {
          await new Promise(resolve => setTimeout(resolve, 100));
          waitAttempts++;
        }

        if (!currentChat) {
          throw new Error('Failed to establish connection for message sending');
        }
      }

      const message = await sendMessage(content);
      onMessageSent?.(message);
    } catch (error) {
      console.error('❌ [ChatWidget] Message sending failed:', error);
      onError?.(error);
    }
  }, [sendMessage, onMessageSent, onError, currentChat, isConnecting, handleConnectionTrigger]);

  ---
  PHASE 6: ERROR HANDLING ENHANCEMENTS

  6.1 Add Platform-Specific Error Handling

  File: src/utils/errorHandler.js
  Location: /home/mattia/mip_sito/mip_technologies/src/utils/errorHandler.js

  ENHANCEMENT 1: Platform Error Response Handling (Line ~83-160)
  // ✅ ADD AFTER LINE 160 - Platform-specific error handling:
  export const handlePlatformApiError = (error, context = {}) => {
    console.error('[Platform API Error]', error, context);

    let errorType = ERROR_TYPES.UNKNOWN;
    let severity = ERROR_SEVERITY.MEDIUM;
    let userMessage = 'An error occurred. Please try again.';

    if (error.response) {
      const { status, data } = error.response;

      switch (status) {
        case 422:
          errorType = ERROR_TYPES.VALIDATION;
          severity = ERROR_SEVERITY.MEDIUM;

          // ✅ CRITICAL: Parse platform validation errors (FastAPI format)
          if (data.detail && Array.isArray(data.detail)) {
            const fieldErrors = data.detail.map(err => {
              const field = err.loc?.slice(1).join('.') || 'field'; // Skip 'body' prefix
              return `${field}: ${err.msg}`;
            });
            userMessage = `Validation failed: ${fieldErrors.join(', ')}`;
          } else if (typeof data.detail === 'string') {
            userMessage = `Validation error: ${data.detail}`;
          } else {
            userMessage = 'Request validation failed. Please check your input.';
          }
          break;

        case 404:
          errorType = ERROR_TYPES.API;
          severity = ERROR_SEVERITY.HIGH;

          // ✅ CRITICAL: Specific error for wrong endpoints
          if (context.endpoint) {
            userMessage = `Endpoint not found: ${context.endpoint}. Please check the API documentation.`;
          } else {
            userMessage = 'Service endpoint not found. Please try again later.';
          }
          break;

        // ... existing cases for 400, 401, 403, 429, 500, etc.

        default:
          errorType = ERROR_TYPES.API;
          userMessage = data?.detail || data?.message || 'An error occurred. Please try again.';
      }
    } else if (error.request) {
      errorType = ERROR_TYPES.NETWORK;
      severity = ERROR_SEVERITY.HIGH;
      userMessage = 'Network error. Please check your connection and try again.';
    } else {
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
        data: error.response?.data,
        endpoint: context.endpoint
      }
    );

    logError(mipError);
    return mipError;
  };

  ---
  🧪 TESTING SPECIFICATION

  Manual Testing Checklist

  Phase 1: Environment Setup

  - .env file created with correct values
  - Environment variables loaded in browser dev tools
  - No console errors on page load

  Phase 2: API Connectivity

  # Test health endpoint manually
  curl -H "X-Tenant-ID: miptech-company" http://localhost:8000/api/v1/health

  # Expected response:
  {"status": "healthy", "ai_services_ready": true}

  Phase 3: Chat Session Creation

  // Test in browser console
  fetch('http://localhost:8000/api/v1/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Tenant-ID': 'miptech-company'
    },
    body: JSON.stringify({
      session_id: 'test_session_123',
      visitor_id: 'test_visitor_123',
      title: 'Test Chat',
      tenant_id: 'miptech-company'
    })
  }).then(r => r.json()).then(console.log)

  // Expected response:
  {"chat_id": "uuid-here", "session_id": "test_session_123", ...}

  Phase 4: WebSocket Connection

  - WebSocket connects without 403 errors
  - Receives connection_established message
  - Receives connection_ready message
  - Chat widget shows "Connected" status

  Phase 5: End-to-End Messaging

  - User can type and send messages
  - Messages appear in chat interface
  - Platform responds with AI-generated content
  - No error messages in console

  Success Criteria

  ✅ GET /api/v1/health → 200 {"status": "healthy"}
  ✅ POST /api/v1/chat → 200 {"chat_id": "uuid"}
  ✅ WebSocket connection → connection_established + connection_ready
  ✅ Send message → receives AI response
  ✅ No "tenant: unknown" errors
  ✅ No 404, 422, or timeout errors

  ---
  📋 IMPLEMENTATION SUMMARY

  Files to Modify:

  1. CREATE: .env - Environment configuration
  2. MODIFY: src/services/miptechApi.js - API endpoints, headers, chat creation
  3. MODIFY: src/services/websocketManager.js - URL construction, message handlers, missing methods
  4. MODIFY: src/hooks/useChat.js - Platform readiness, chat session, event handlers, typing methods
  5. ENHANCE: src/components/ChatWidget.jsx - Connection logic, error handling
  6. ENHANCE: src/utils/errorHandler.js - Platform-specific error handling

  Estimated Implementation Time:

  - Phase 1 (Environment): 10 minutes
  - Phase 2 (API Client): 30 minutes
  - Phase 3 (WebSocket): 45 minutes
  - Phase 4 (Chat Hook): 60 minutes
  - Phase 5 (Component): 20 minutes
  - Phase 6 (Error Handling): 15 minutes

  Total: ~3 hours for complete implementation and testing

  This specification provides 100% complete implementation details with exact file locations, line numbers, current
  code, and fixed code for establishing end-to-end MVP connectivity between the React SPA client and MIPTech AI
  Platform.