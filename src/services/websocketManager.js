// src/services/websocketManager.js
import eventNormalizer from '../utils/eventNormalizer';
import logger from '../utils/logger';

class MIPTechWebSocketManager {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || process.env.REACT_APP_MIPTECH_WS_URL || 'ws://localhost:8001';
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
    this.lastErrorType = null; // Track error types for intelligent reconnection
    this.reconnectTimeout = null; // Track reconnection timeout
    this.currentChatId = null; // Store current chat ID for reconnection
    this.currentJoinedChatId = null; // Track which chat we've sent join_chat for
    
    // ✅ Message queuing for reconnections
    this.messageQueue = []; // Queue for messages during disconnection
    this.maxQueueSize = 50; // Prevent memory issues
    this.isReconnecting = false; // Track reconnection state
    
    // ✅ ENHANCEMENT: Environment-specific configuration
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.isDebugMode = process.env.REACT_APP_DEBUG_MODE === 'true';
    this.enableVerboseLogging = false; // Use logger utility instead
    
    // Development-specific settings
    this.developmentConnectionTimeout = this.isDevelopment ? 15000 : 10000; // Longer timeout in dev
    this.developmentMaxRetries = this.isDevelopment ? 5 : this.maxReconnectAttempts; // More retries in dev
    this.developmentReconnectDelay = this.isDevelopment ? 2000 : this.reconnectDelay; // Longer delays in dev
    
    this.eventListeners = new Map();
    
    // ✅ FE-02: Single-listener guard and deduplication
    this.registeredListeners = new Map(); // Track registered listeners for dedup prevention
    this.processedEvents = new Set(); // Track processed events to prevent duplicates
    this.eventHistory = new Map(); // Track recent events for duplicate detection
    this.dedupWindowMs = 1000; // 1 second window for duplicate event detection

    // ✅ Heartbeat configuration for production reliability
    this.heartbeatInterval = null;
    this.heartbeatIntervalMs = 30000; // 30 seconds as specified in requirements
  }

  /**
   * Build WebSocket URL for MIPTech Realtime v1 protocol (no token required for native site)
   * Uses exact format: wss://api.miptechnologies.tech/api/v1/ws/chat?tenant_id=miptech-company
   */
  buildWebSocketUrl() {
    const params = new URLSearchParams();

    // CRITICAL: Only tenant_id required for native website
    params.set('tenant_id', this.tenantId);

    // For native website, no token, client_id, or user_id needed
    // The backend allows WebSocket connection without authentication for allowed origins

    // Always use the full production WebSocket URL for consistency
    const baseUrlToUse = this.baseUrl.includes('/api/v1/ws/chat')
      ? this.baseUrl
      : `${this.baseUrl}/api/v1/ws/chat`;

    return `${baseUrlToUse}?${params.toString()}`;
  }

  /**
   * Build WebSocket URL with chat_id parameter (MVP requirement)
   * ✅ ENHANCED: Handle null chatId gracefully for degraded mode
   * ✅ SECURITY: Never put JWT token in URL - it goes in join_chat message only
   */
  buildWebSocketUrlWithChatId(chatId) {
    const params = new URLSearchParams();
    
    // Required parameters
    params.set('tenant_id', this.tenantId);
    
    // ✅ CRITICAL FIX: Only add chat_id if it exists
    // Server will use tenant fallback mode when chat_id is missing
    if (chatId && chatId !== 'null') {
      params.set('chat_id', chatId);
      logger.debug('WebSocket: Using chat-specific connection', { chatId });
    } else {
      logger.debug('WebSocket: Using tenant fallback connection (no chat session)');
    }
    
    // Optional parameters
    if (this.customClientId) {
      params.set('client_id', this.customClientId);
    }
    
    if (this.userId) {
      params.set('user_id', this.userId);
    }
    
    // ✅ SECURITY: NEVER add token to URL - it goes in join_chat message only
    // if (this.authToken) {
    //   params.set('token', this.authToken); // ❌ NEVER DO THIS
    // }
    
    // Check if baseUrl already includes the path
    const hasPath = this.baseUrl.includes('/api/v1/ws/chat');
    const baseUrlToUse = hasPath ? this.baseUrl : `${this.baseUrl}/api/v1/ws/chat`;
    
    const url = `${baseUrlToUse}?${params.toString()}`;
    
    // ✅ SECURITY: Validate no token accidentally added
    if (url.includes('token=') || url.includes('jwt=') || url.includes('auth=')) {
      throw new Error('SECURITY VIOLATION: Token detected in WebSocket URL');
    }
    
    return url;
  }

  async connect(chatId = null) {
    try {
      // For WebSocket-only mode, we don't need chatId upfront
      // The chat will be created through join_chat message after connection
      this.currentChatId = null; // Will be set from chat_created event

      // Build WebSocket URL (no chatId parameter needed)
      const wsUrl = this.buildWebSocketUrl();

      // ✅ ENHANCEMENT: Environment-specific logging
      logger.debug('WebSocket: Connecting', {
        url: wsUrl,
        environment: this.isDevelopment ? 'development' : 'production',
        chatId,
        timeout: this.developmentConnectionTimeout
      });

      // Validate URL format before attempting connection
      try {
        const url = new URL(wsUrl);
        if (!url.searchParams.get('tenant_id')) {
          throw new Error('Missing tenant_id parameter - check environment configuration');
        }
        // ✅ ENHANCED: Handle optional chat_id for degraded mode
        if (chatId && chatId !== 'null' && !url.searchParams.get('chat_id')) {
          throw new Error('Missing chat_id parameter - required for platform message routing');
        }
        
        // Log connection mode for debugging
        if (url.searchParams.get('chat_id')) {
          logger.debug('WebSocket: Connecting in full-feature mode with chat session');
        } else {
          logger.debug('WebSocket: Connecting in tenant fallback mode (degraded)');
        }
      } catch (urlError) {
        logger.error('WebSocket: Invalid URL format', { error: urlError.message });
        throw new Error(`Invalid WebSocket URL: ${urlError.message}`);
      }

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
      this.ws.onerror = this.handleError.bind(this);

      return new Promise((resolve, reject) => {
        // ✅ ENHANCEMENT: Environment-specific timeout
        const connectionTimeout = this.developmentConnectionTimeout;
        const timeout = setTimeout(() => {
          const timeoutError = new Error(`WebSocket connection timeout (${connectionTimeout}ms) - platform may be starting`);
          timeoutError.type = 'timeout_error';
          timeoutError.environment = this.isDevelopment ? 'development' : 'production';
          reject(timeoutError);
        }, connectionTimeout);

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
      logger.error('WebSocket: Connection setup failed', { error: error.message });
      
      // Categorize setup errors
      if (error.message.includes('tenant_id')) {
        error.type = 'configuration_error';
        error.troubleshooting = 'Set REACT_APP_MIPTECH_TENANT_ID in your .env file';
      }
      
      throw error;
    }
  }

  handleOpen(event) {
    // ✅ ENHANCEMENT: Environment-specific connection logging
    if (this.enableVerboseLogging || process.env.NODE_ENV === 'development') {
      logger.debug('🟢 [WebSocket] Connection OPENED', {
        environment: this.isDevelopment ? 'development' : 'production',
        url: event.target?.url,
        readyState: event.target?.readyState,
        protocol: event.target?.protocol,
        timestamp: new Date().toISOString()
      });
    } else {
      logger.debug('🟢 [WebSocket] Connection OPENED');
    }

    this.isConnected = true;
    this.reconnectAttempts = 0;
    this.joinSent = false; // Track if join_chat was sent

    // ✅ CRITICAL: Send explicit join_chat immediately on connection open
    // This is required for MIPTech Realtime v1 protocol compliance
    logger.debug('🚀 [WebSocket] Sending explicit join_chat on connection open');
    this.sendJoinChatOnOpen();

    // ✅ Start heartbeat to maintain connection
    this.startHeartbeat();

    this.emit('connected', {
      tenantId: this.tenantId,
      userId: this.userId,
      authenticated: false // No authentication for native website
    });
  }

  /**
   * ✅ FE-02: Check if event is duplicate
   */
  isDuplicateEvent(eventData) {
    const eventId = this.generateEventId(eventData);
    const now = Date.now();
    
    // Check if we've seen this exact event recently
    if (this.eventHistory.has(eventId)) {
      const lastSeen = this.eventHistory.get(eventId);
      if (now - lastSeen < this.dedupWindowMs) {
        return true; // Duplicate within window
      }
    }
    
    // Update history
    this.eventHistory.set(eventId, now);
    
    // Clean up old entries (keep history manageable)
    if (this.eventHistory.size > 1000) {
      const cutoff = now - this.dedupWindowMs * 2;
      for (const [id, timestamp] of this.eventHistory.entries()) {
        if (timestamp < cutoff) {
          this.eventHistory.delete(id);
        }
      }
    }
    
    return false;
  }
  
  /**
   * ✅ FE-02: Generate unique event ID for duplicate detection
   */
  generateEventId(eventData) {
    const type = eventData.type;
    const messageId = eventData.messageId || eventData.data?.messageId || '';
    const chatId = eventData.chatId || eventData.data?.chatId || '';
    const timestamp = eventData.eventTs || eventData.timestamp || '';
    const content = typeof eventData.data?.content === 'string' ? 
      eventData.data.content.substring(0, 50) : ''; // First 50 chars
    
    return `${type}:${messageId}:${chatId}:${timestamp}:${content}`;
  }

  handleMessage(event) {
    try {
      const rawData = JSON.parse(event.data);
      
      // ✅ FE-01: Normalize incoming event with central event normalizer
      const data = eventNormalizer.normalizeIncomingEvent(rawData);
      
      // ✅ FE-02: Check for duplicate events
      if (this.isDuplicateEvent(data)) {
        if (this.enableVerboseLogging) {
          logger.debug('🔄 [EventDedup] Filtered duplicate event:', {
            type: data.type,
            messageId: data.messageId,
            eventTs: data.eventTs
          });
        }
        return; // Skip duplicate event
      }
      
      logger.debug('📥 [WebSocket] Received:', data.type, data);
      
      // Log normalization for debugging
      if (this.enableVerboseLogging && data.__normalized) {
        logger.debug('🔄 [EventNormalizer] Event normalized:', {
          originalType: rawData.type,
          normalizedType: data.type,
          hasMessageId: !!data.messageId,
          hasEventTs: !!data.eventTs,
          normalizedAt: data.__normalizedAt
        });
      }

      switch (data.type) {
        case 'connection_established':
          logger.debug('🎯 [WebSocket] Connection established');
          logger.debug('🔑 [WebSocket] Server-assigned client_id:', data.data.client_id);
          this.serverClientId = data.data.client_id; // Store platform-assigned client ID
          // TODO: P1 - Use this.serverClientId for analytics events
          this.emit('connection_established', data); // ✅ CRITICAL: Emit event for useChat hook
          break;

        case 'connection_ready':
          logger.debug('🚀 [WebSocket] Connection ready for messages');
          this.isReady = true;
          
          // ✅ CRITICAL: Clear fallback timer since we got connection_ready
          if (this.readyTimer) {
            clearTimeout(this.readyTimer);
            this.readyTimer = null;
            logger.debug('✅ [WebSocket] Cleared fallback timer (connection_ready received)');
          }
          
          // ✅ CRITICAL FIX: Send join_chat if not already sent (don't wait for currentChatId)
          if (!this.joinSent) {
            this.sendJoinChat();
          }
          
          // Process any queued messages when connection becomes ready
          if (this.messageQueue.length > 0) {
            logger.debug('📦 [WebSocket] Connection ready - processing queued messages');
            setTimeout(() => this.processMessageQueue(), 100); // Small delay to ensure stability
          }
          
          this.emit('ready', data);
          this.emit('connection_ready', data); // ✅ CRITICAL: Emit event for useChat hook
          break;

        case 'platform_initializing':
          logger.debug('🔄 [Platform] Platform is initializing AI services...');
          this.emit('platformInitializing', data);
          break;

        case 'platform_ready':
          logger.debug('✅ [Platform] AI services are fully loaded and ready');
          this.emit('platformReady', data);
          break;

        case 'ai_services_loading':
          logger.debug('⚙️ [Platform] Vector database and LLM services loading...');
          this.emit('aiServicesLoading', data);
          break;

        case 'ai_services_ready':
          logger.debug('🤖 [Platform] All AI components initialized');
          this.emit('aiServicesReady', data);
          break;

        case 'initialization_progress':
          logger.debug('📊 [Platform] Initialization progress:', data.data);
          this.emit('initializationProgress', data);
          break;

        case 'ping':
          // ✅ CRITICAL: Must respond with pong for heartbeat
          this.lastPingAt = Date.now(); // Track for health monitoring
          logger.debug('🏓 [WebSocket] Ping received, sending pong');
          this.sendMessage('pong', { 
            timestamp: Date.now(),
            ts: Date.now() // Both formats for compatibility
          });
          this.emit('ping', data);
          break;

        case 'chat_created':
          // ✅ CRITICAL: Capture chat_id from top-level (not data)
          const chatId = data.chat_id; // Top-level chat_id
          if (chatId) {
            // ✅ CRITICAL: Log the exact moment chat_created is received for debugging
            logger.debug('✅ [WebSocket] chat_created received', { chatId });
            logger.debug('🎯 [WebSocket] Chat created with ID:', chatId);
            this.currentChatId = chatId;

            // ✅ CRITICAL: Clear watchdog timer since we received chat_created
            if (this.chatCreatedWatchdog) {
              clearTimeout(this.chatCreatedWatchdog);
              this.chatCreatedWatchdog = null;
              logger.debug('✅ [WebSocket] Cleared chat_created watchdog - chat successfully created');
            }

            this.emit('chat_created', { ...data, chat_id: chatId });

            // Process any queued messages now that we have chat_id
            this.processMessageQueue();
          } else {
            logger.warn('⚠️ [WebSocket] chat_created event missing chat_id');
          }
          break;

        case 'chat_response':
          this.emit('chatResponse', data);
          this.emit('chat_response', data); // ✅ CRITICAL: Emit both event names for compatibility
          break;

        case 'chat_response_streaming':
          logger.debug('📡 [WebSocket] Streaming response chunk received');
          this.emit('chatResponseStreaming', data);
          this.emit('chat_response_streaming', data); // ✅ CRITICAL: Emit for streaming handlers
          break;

        case 'message_received':
          logger.debug('✅ [WebSocket] Message received confirmation', {
            messageId: data.data?.message_id,
            chatId: data.data?.chat_id,
            timestamp: data.data?.timestamp || Date.now()
          });
          
          // Enhanced data with confirmation context
          const receivedData = {
            ...data,
            receivedTime: Date.now(),
            source: 'backend_integration'
          };
          
          this.emit('messageReceived', receivedData);
          this.emit('message_received', receivedData);
          break;

        case 'processing':
          logger.debug('⚙️ [WebSocket] AI processing started', {
            messageId: data.data?.message_id,
            chatId: data.data?.chat_id,
            timestamp: data.data?.timestamp || Date.now()
          });
          
          // Enhanced data with processing context
          const processingData = {
            ...data,
            processingStartTime: Date.now(),
            source: 'backend_integration'
          };
          
          this.emit('processing', processingData);
          this.emit('aiProcessingStarted', processingData);
          this.emit('ai_processing_started', processingData); // Backend event name
          break;

        case 'response_complete':
          logger.debug('🎉 [WebSocket] AI response completed', {
            messageId: data.data?.message?.id,
            chatId: data.data?.chat_id,
            responseTime: data.data?.message?.response_time_ms,
            tokens: data.data?.message?.completion_tokens,
            timestamp: data.data?.timestamp || Date.now()
          });
          
          // Enhanced data with completion context
          const completionData = {
            ...data,
            completionTime: Date.now(),
            source: 'backend_integration'
          };
          
          logger.debug('🔥 [WebSocket] About to emit response_complete events with data:', {
            type: completionData.type,
            hasMessage: !!completionData.data?.message,
            messageId: completionData.data?.message?.id,
            content: completionData.data?.message?.content?.substring(0, 50) + '...',
            eventsToEmit: ['responseComplete', 'response_complete', 'aiResponseComplete', 'ai_response_complete']
          });
          
          this.emit('responseComplete', completionData);
          this.emit('response_complete', completionData);
          this.emit('aiResponseComplete', completionData); // Additional alias for clarity
          this.emit('ai_response_complete', completionData); // Backend event name
          
          logger.debug('✅ [WebSocket] All response_complete events emitted');
          break;

        case 'typing_indicator':
          this.emit('typingIndicator', data);
          this.emit('typing_indicator', data); // ✅ CRITICAL: Emit both event names
          break;

        case 'typing_start':
          this.emit('typing', { type: 'typing', data: data.data });
          this.emit('typingStart', data);
          break;

        case 'typing_stop':
          this.emit('stop_typing', { type: 'stop_typing', data: data.data });
          this.emit('typingStop', data);
          break;

        case 'error':
          logger.error('💥 [WebSocket] Server error:', data.data);
          // Enhanced error handling to distinguish between error types
          const errorData = {
            ...data.data,
            source: 'server',
            timestamp: Date.now(),
            errorType: data.data?.type || 'general_error'
          };
          
          // Emit specific error types for better frontend handling
          if (data.data?.type === 'ai_processing_error') {
            logger.error('🤖 [WebSocket] AI Processing Error:', data.data);
            this.emit('aiProcessingError', errorData);
            this.emit('ai_processing_error', errorData);
          } else if (data.data?.type === 'message_validation_error') {
            logger.error('📝 [WebSocket] Message Validation Error:', data.data);
            this.emit('messageValidationError', errorData);
            this.emit('message_validation_error', errorData);
          } else if (data.data?.type === 'rate_limit_error') {
            logger.error('🚦 [WebSocket] Rate Limit Error:', data.data);
            this.emit('rateLimitError', errorData);
            this.emit('rate_limit_error', errorData);
          }
          
          // Always emit generic error event for backward compatibility
          this.emit('error', errorData);
          this.emit('serverError', errorData);
          break;

        case 'authentication_required':
          logger.warn('🔐 [WebSocket] Authentication required');
          this.emit('authenticationRequired', data.data);
          break;

        case 'token_expired':
          logger.warn('⏰ [WebSocket] Authentication token expired');
          this.emit('tokenExpired', data.data);
          break;

        case 'unauthorized':
          logger.error('🚫 [WebSocket] Unauthorized access');
          this.emit('unauthorized', data.data);
          break;

        case 'rate_limit_exceeded':
          logger.warn('⚠️ [WebSocket] Rate limit exceeded:', data.data);
          this.emit('rateLimitExceeded', data.data);
          break;

        default:
          this.emit(data.type, data);
      }

    } catch (error) {
      logger.error('❌ [WebSocket] Failed to parse message:', error);
    }
  }

  handleClose(event) {
    logger.debug('🔌 [WebSocket] Connection closed:', event.code, event.reason);
    this.isConnected = false;
    this.isReady = false;
    this.isReconnecting = true;
    this.currentJoinedChatId = null; // Clear joined chat on disconnect

    // Stop heartbeat when connection closes
    this.stopHeartbeat();
    this.joinSent = false; // Reset join_chat tracking

    // Clear any pending timers
    if (this.readyTimer) {
      clearTimeout(this.readyTimer);
      this.readyTimer = null;
    }

    // ✅ CRITICAL: Clear chat_created watchdog on disconnect
    if (this.chatCreatedWatchdog) {
      clearTimeout(this.chatCreatedWatchdog);
      this.chatCreatedWatchdog = null;
      logger.debug('✅ [WebSocket] Cleared chat_created watchdog on disconnect');
    }

    // Enhanced close code analysis for platform debugging
    let closeType = 'normal_close';
    let shouldReconnect = true;
    
    switch (event.code) {
      case 1000:
        closeType = 'normal_close';
        shouldReconnect = false;
        logger.debug('✅ [WebSocket] Normal closure - no reconnection needed');
        break;
      case 1001:
        closeType = 'server_going_away';
        shouldReconnect = true;
        logger.debug('🔄 [WebSocket] Server restarting (rolling deploy) - will reconnect');
        this.lastErrorType = 'server_restart';
        // Reset reconnect attempts for server restarts - these should reconnect immediately
        this.reconnectAttempts = 0;
        break;
      case 1003:
        closeType = 'unsupported_data';
        logger.debug('❌ [WebSocket] Unsupported data format - check message structure');
        break;
      case 1006:
        closeType = 'abnormal_closure';
        logger.debug('⚠️ [WebSocket] Abnormal closure - likely platform restart or network issue');
        break;
      case 1008:
        closeType = 'config_error';
        shouldReconnect = false;
        logger.error('❌ [WebSocket] Configuration error - check tenant_id in URL');
        this.lastErrorType = 'configuration_error';
        break;
      case 1011:
        closeType = 'server_error';
        logger.debug('💥 [WebSocket] Server error - platform may be experiencing issues');
        break;
      case 1012:
        closeType = 'service_restart';
        logger.debug('🔄 [WebSocket] Service restarting - platform maintenance');
        this.lastErrorType = 'platform_initializing';
        break;
      // Auth failure codes (44xx)
      case 4400:
        closeType = 'bad_first_frame';
        shouldReconnect = false;
        logger.error('❌ [WebSocket] Expected join_chat as first message');
        this.lastErrorType = 'protocol_error';
        break;
      case 4401:
        closeType = 'auth_required';
        shouldReconnect = false;
        logger.error('❌ [WebSocket] Authentication required or invalid token');
        this.lastErrorType = 'authentication_error';
        break;
      case 4403:
        closeType = 'forbidden';
        shouldReconnect = false;
        logger.error('❌ [WebSocket] Tenant mismatch or insufficient scope');
        this.lastErrorType = 'authorization_error';
        break;
      case 4408:
        closeType = 'join_timeout';
        shouldReconnect = false;
        logger.error('❌ [WebSocket] join_chat not sent within 10 seconds');
        this.lastErrorType = 'timeout_error';
        break;
      // Legacy error codes (keeping for backward compatibility)
      case 4003:
        closeType = 'rate_limit_exceeded';
        logger.debug('🚦 [WebSocket] Rate limit exceeded - backing off');
        this.lastErrorType = 'rate_limit_error';
        break;
      case 4004:
        closeType = 'authentication_failed';
        logger.debug('🔐 [WebSocket] Authentication failed - check tenant configuration');
        this.lastErrorType = 'authentication_error';
        shouldReconnect = false;
        break;
      default:
        logger.debug(`🔍 [WebSocket] Unexpected close code: ${event.code} - ${event.reason}`);
    }

    this.emit('disconnected', { 
      code: event.code, 
      reason: event.reason, 
      type: closeType,
      shouldReconnect 
    });

    // ✅ ENHANCEMENT: Environment-specific reconnection logic
    const maxRetries = this.isDevelopment ? this.developmentMaxRetries : this.maxReconnectAttempts;
    
    // Attempt reconnection based on close code analysis
    if (shouldReconnect && event.code !== 1000 && this.reconnectAttempts < maxRetries) {
      if (this.enableVerboseLogging) {
        logger.debug(`🔄 [WebSocket] Attempting reconnection (${this.reconnectAttempts + 1}/${maxRetries}) in ${this.isDevelopment ? 'development' : 'production'} mode`);
      }
      // ✅ ENHANCEMENT: Pass chatId to maintain session context
      this.attemptReconnect(this.currentChatId);
    } else if (!shouldReconnect) {
      logger.debug('🛑 [WebSocket] Reconnection disabled for this error type');
      this.isReconnecting = false;
      this.clearMessageQueue();
      this.emit('reconnection_stopped', { reason: closeType, code: event.code });
    } else if (this.reconnectAttempts >= maxRetries) {
      logger.debug(`🛑 [WebSocket] Maximum reconnection attempts reached (${maxRetries} attempts)`);
      this.isReconnecting = false;
      this.clearMessageQueue();
      this.emit('reconnection_stopped', { 
        reason: 'max_attempts_reached', 
        attempts: this.reconnectAttempts,
        maxRetries,
        environment: this.isDevelopment ? 'development' : 'production',
        code: event.code 
      });
    }
  }

  handleError(event) {
    logger.error('❌ [WebSocket] Error:', event);
    
    // Enhanced error handling for platform-specific scenarios
    let errorMessage = 'WebSocket connection error';
    let errorType = 'connection_error';
    
    if (event.code) {
      switch (event.code) {
        case 403:
          errorMessage = 'Missing tenant_id parameter - check WebSocket URL format';
          errorType = 'authentication_error';
          break;
        case 422:
          errorMessage = 'Platform validation failed - check request structure';
          errorType = 'validation_error';
          break;
        case 429:
          errorMessage = 'Rate limit exceeded - implementing backoff strategy';
          errorType = 'rate_limit_error';
          break;
        case 1006:
          errorMessage = 'Connection closed abnormally - platform may be initializing';
          errorType = 'abnormal_closure';
          break;
        default:
          errorMessage = `WebSocket error (code: ${event.code})`;
      }
    }
    
    this.emit('error', { 
      message: errorMessage, 
      type: errorType,
      code: event.code,
      event 
    });
  }

  async attemptReconnect(chatId = null) {
    this.reconnectAttempts++;
    
    // ✅ ENHANCEMENT: Environment-specific backoff strategy with jitter
    const baseDelay = this.isDevelopment ? this.developmentReconnectDelay : this.reconnectDelay;
    let delay = baseDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    // Add jitter (±20%) to prevent synchronized reconnections
    const jitter = delay * 0.2 * (Math.random() - 0.5);
    delay = Math.round(delay + jitter);
    
    // Apply context-aware delay adjustments
    if (this.lastErrorType === 'server_restart') {
      // ECS deployments/server restarts - use shorter delays for faster reconnection
      delay = Math.min(delay, 2000); // Cap at 2s for server restarts
      delay = Math.max(delay, 500);  // Minimum 500ms to avoid overwhelming server
      logger.debug(`🚀 [WebSocket] Server restart detected - fast reconnection: ${delay}ms`);
    } else if (this.lastErrorType === 'rate_limit_error') {
      delay = Math.max(delay, 5000); // Minimum 5s for rate limits
      logger.debug(`⚠️ [WebSocket] Rate limit detected - using extended backoff: ${delay}ms`);
    } else if (this.lastErrorType === 'platform_initializing') {
      delay = Math.max(delay, 2000); // Minimum 2s for platform startup
      logger.debug(`🔄 [WebSocket] Platform initializing - waiting for readiness: ${delay}ms`);
    } else if (this.lastErrorType === 'network_error') {
      // Network issues might need more time
      delay = Math.max(delay, 3000);
      logger.debug(`🌐 [WebSocket] Network error detected - extended delay: ${delay}ms`);
    } else if (this.lastErrorType === 'server_error') {
      // Server errors might need time to resolve
      delay = Math.max(delay, 4000);
      logger.debug(`🔥 [WebSocket] Server error detected - extended delay: ${delay}ms`);
    }
    
    // Cap maximum delay at 30 seconds
    delay = Math.min(delay, 30000);

    // ✅ ENHANCEMENT: Server restarts get more attempts since they're likely to succeed
    let maxRetries = this.isDevelopment ? this.developmentMaxRetries : this.maxReconnectAttempts;
    if (this.lastErrorType === 'server_restart') {
      maxRetries = Math.max(maxRetries, 10); // Allow up to 10 attempts for server restarts
    }
    
    if (this.enableVerboseLogging) {
      logger.debug(`🔄 [WebSocket] Reconnecting (${this.reconnectAttempts}/${maxRetries}) in ${delay}ms`, {
        environment: this.isDevelopment ? 'development' : 'production',
        errorType: this.lastErrorType,
        chatId
      });
    } else {
      logger.debug(`🔄 [WebSocket] Reconnecting (${this.reconnectAttempts}/${maxRetries}) in ${delay}ms`);
    }
    
    this.emit('reconnecting', { 
      attempt: this.reconnectAttempts, 
      maxRetries,
      delay, 
      reason: this.lastErrorType,
      environment: this.isDevelopment ? 'development' : 'production'
    });

    this.reconnectTimeout = setTimeout(async () => {
      try {
        // ✅ ENHANCEMENT: Pass chatId to maintain session context
        await this.connect(chatId);
        logger.debug('✅ [WebSocket] Reconnection successful');
        
        // Reset error tracking and reconnection state
        this.lastErrorType = null;
        this.isReconnecting = false;
        
        // Process queued messages after successful reconnection
        this.processMessageQueue();
        
        this.emit('reconnection_success', { attempts: this.reconnectAttempts });
        
        // ✅ CRITICAL FIX: Re-send join_chat after reconnection for WebSocket-only mode
        // Note: sendJoinChatOnOpen() is already called in handleOpen() so we don't need
        // additional logic here for the WebSocket-only protocol. The join_chat will
        // create a new chat session and we'll get a new chat_id from chat_created event.
        
      } catch (error) {
        logger.error('❌ [WebSocket] Reconnection failed:', error);
        
        // Store error type for next reconnection attempt
        this.lastErrorType = error.type || 'unknown_error';
        
        // Stop reconnecting for unrecoverable error types
        const unrecoverableErrors = [
          'configuration_error', 
          'authentication_error',
          'forbidden_error',
          'invalid_tenant_error'
        ];
        
        if (unrecoverableErrors.includes(error.type)) {
          logger.error('🛑 [WebSocket] Stopping reconnection due to unrecoverable error:', error.type);
          this.isReconnecting = false;
          this.clearMessageQueue();
          this.emit('reconnection_stopped', { 
            reason: error.type, 
            error,
            attempts: this.reconnectAttempts 
          });
          return;
        }
        
        // If we've reached max attempts, stop trying
        const maxRetries = this.isDevelopment ? this.developmentMaxRetries : this.maxReconnectAttempts;
        if (this.reconnectAttempts >= maxRetries) {
          logger.error(`🛑 [WebSocket] Max reconnection attempts reached (${maxRetries})`);
          this.isReconnecting = false;
          this.clearMessageQueue();
          this.emit('reconnection_stopped', { 
            reason: 'max_attempts_reached', 
            error,
            attempts: this.reconnectAttempts,
            maxRetries,
            environment: this.isDevelopment ? 'development' : 'production'
          });
          return;
        }
        
        // Continue reconnecting
        this.attemptReconnect(chatId);
      }
    }, delay);
  }

  sendMessage(type, data = {}) {
    if (!this.isConnected || this.isReconnecting) {
      // Queue messages during disconnection/reconnection
      if (this.shouldQueueMessage(type)) {
        this.queueMessage(type, data);
        return;
      } else {
        throw new Error('WebSocket not connected and message cannot be queued');
      }
    }

    if (!this.isReady && type !== 'ping') {
      // Queue messages when connection exists but not ready
      if (this.shouldQueueMessage(type)) {
        logger.warn('⚠️ [WebSocket] Connection not ready, queuing message:', type);
        this.queueMessage(type, data);
        return;
      }
    }

    const message = {
      type,
      data,
      timestamp: Date.now(),
      clientId: this.serverClientId || this.customClientId
    };

    // ✅ FE-01: Normalize outgoing event with central event normalizer
    const normalizedMessage = eventNormalizer.normalizeOutgoingEvent(message);
    
    logger.debug('📤 [WebSocket] Sending:', type, normalizedMessage);
    
    // Log normalization for debugging
    if (this.enableVerboseLogging && normalizedMessage.__normalized) {
      logger.debug('🔄 [EventNormalizer] Outgoing event normalized:', {
        originalType: message.type,
        normalizedType: normalizedMessage.type,
        hasMessageId: !!normalizedMessage.message_id,
        hasEventTs: !!normalizedMessage.event_ts,
        normalizedAt: normalizedMessage.__normalizedAt
      });
    }
    
    this.ws.send(JSON.stringify(normalizedMessage));
  }

  // Chat-specific methods
  sendChatMessage(message, chatId = null) {
    // ✅ CRITICAL: Use 'message' field and 'chat_message' event type per MIPTech Realtime v1
    const messageData = {
      message: message, // CRITICAL: Use 'message' field (not 'text' or 'content')
      stream: true // Enable streaming responses
    };

    // ✅ CRITICAL FIX: Stronger guard - use current chat_id if available, otherwise queue
    const effectiveChatId = chatId || this.currentChatId;
    if (!effectiveChatId) {
      // ALWAYS queue if no chat_id - never send without it
      logger.debug('📦 [WebSocket] Queueing message - no chat_id available yet');
      return this.queueMessage('chat_message', messageData);
    }

    // Only proceed if we have a valid chat_id
    messageData.chat_id = effectiveChatId;
    logger.debug('📤 [WebSocket] Sending chat message to chat:', effectiveChatId);
    this.sendMessage('chat_message', messageData); // CRITICAL: Use 'chat_message' type
  }

  createNewChat() {
    this.sendMessage('new_chat', {
      tenant_id: this.tenantId
    });
  }

  loadChat(chatId) {
    this.sendMessage('load_chat', {
      chat_id: chatId,
      tenant_id: this.tenantId
    });
  }

  listChats() {
    this.sendMessage('list_chats', {
      tenant_id: this.tenantId
    });
  }

  // Typing indicator methods (required by useChat hook)
  sendTyping(chatId, isTyping) {
    const eventType = isTyping ? 'typing_start' : 'typing_stop';
    const typingData = { tenant_id: this.tenantId };
    
    // ✅ ENHANCED: Handle null chatId gracefully
    if (chatId && chatId !== 'null') {
      typingData.chat_id = chatId;
    }
    
    this.sendMessage(eventType, typingData);
  }

  // New dedicated methods for clarity
  sendTypingStart(chatId) {
    const typingData = { tenant_id: this.tenantId };
    
    // ✅ ENHANCED: Handle null chatId gracefully
    if (chatId && chatId !== 'null') {
      typingData.chat_id = chatId;
    }
    
    this.sendMessage('typing_start', typingData);
  }

  sendTypingStop(chatId) {
    const typingData = { tenant_id: this.tenantId };
    
    // ✅ ENHANCED: Handle null chatId gracefully
    if (chatId && chatId !== 'null') {
      typingData.chat_id = chatId;
    }
    
    this.sendMessage('typing_stop', typingData);
  }

  // ✅ FE-02: Event handling with single-listener guard
  on(event, handler) {
    // Generate listener ID for duplicate detection
    const listenerId = this.generateListenerId(event, handler);
    
    // ✅ DEBUG: Always log listener registration attempts
    logger.debug(`📝 [WebSocket] Attempting to register listener for event: ${event}`, {
      listenerId: listenerId.substring(0, 12),
      handlerType: typeof handler,
      isDuplicate: this.registeredListeners.has(listenerId),
      currentListenerCount: this.eventListeners.has(event) ? this.eventListeners.get(event).length : 0
    });
    
    // Check for duplicate registration
    if (this.registeredListeners.has(listenerId)) {
      logger.warn(`⚠️ [WebSocket] Duplicate listener registration detected for event '${event}'.`, {
        event,
        listenerId: listenerId.substring(0, 12),
        action: 'skipped'
      });
      return; // Skip duplicate registration
    }
    
    // Register listener
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    
    this.eventListeners.get(event).push(handler);
    this.registeredListeners.set(listenerId, { event, handler, registeredAt: Date.now() });
    
    logger.debug(`✅ [WebSocket] Successfully registered listener for '${event}'`, {
      listenerId: listenerId.substring(0, 12),
      totalListeners: this.eventListeners.get(event).length,
      registeredAt: Date.now()
    });
  }
  
  /**
   * ✅ FE-02: Generate unique listener ID
   */
  generateListenerId(event, handler) {
    const handlerString = handler.toString();
    const handlerHash = this.simpleHash(handlerString);
    return `${event}:${handlerHash}:${Date.now()}`;
  }
  
  /**
   * ✅ FE-02: Simple hash function for listener identification
   */
  simpleHash(str) {
    let hash = 0;
    if (str.length === 0) return hash;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
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
        
        // ✅ FE-02: Remove from registered listeners tracking
        for (const [listenerId, listenerInfo] of this.registeredListeners.entries()) {
          if (listenerInfo.event === event && listenerInfo.handler === handler) {
            this.registeredListeners.delete(listenerId);
            if (this.enableVerboseLogging) {
              logger.debug(`📝 [WebSocket] Unregistered listener for '${event}' (ID: ${listenerId.substring(0, 8)}...)`);
            }
            break;
          }
        }
      }
    }
  }

  emit(event, data) {
    // ✅ DEBUG: Log all event emissions
    logger.debug(`🚀 [WebSocket] Emitting event: ${event}`, {
      hasListeners: this.eventListeners.has(event),
      listenerCount: this.eventListeners.has(event) ? this.eventListeners.get(event).length : 0,
      eventData: data?.type || 'no-type',
      dataKeys: data ? Object.keys(data) : []
    });
    
    if (this.eventListeners.has(event)) {
      const handlers = this.eventListeners.get(event);
      handlers.forEach((handler, index) => {
        try {
          logger.debug(`📞 [WebSocket] Calling handler ${index + 1}/${handlers.length} for event: ${event}`);
          handler(data);
          logger.debug(`✅ [WebSocket] Handler ${index + 1} completed for event: ${event}`);
        } catch (error) {
          logger.error(`❌ [WebSocket] Event handler error for ${event} (handler ${index + 1}):`, error);
        }
      });
    } else {
      logger.warn(`⚠️ [WebSocket] No listeners registered for event: ${event}`);
    }
  }

  disconnect() {
    logger.debug('🔌 [WebSocket] Disconnecting...');

    // Clear any pending timers
    if (this.readyTimer) {
      clearTimeout(this.readyTimer);
      this.readyTimer = null;
    }

    // Stop heartbeat
    this.stopHeartbeat();

    // Clear any pending reconnection attempts
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
      logger.debug('✅ [WebSocket] Cancelled pending reconnection');
    }
    
    // Reset reconnection state
    this.reconnectAttempts = 0;
    this.lastErrorType = null;
    this.currentChatId = null;
    
    // ✅ FE-02: Clear deduplication structures
    this.registeredListeners.clear();
    this.processedEvents.clear();
    this.eventHistory.clear();
    
    if (this.enableVerboseLogging) {
      logger.debug('✅ [WebSocket] Cleared deduplication structures');
    }
    
    if (this.ws) {
      // Remove event listeners to prevent callbacks
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onclose = null;
      this.ws.onerror = null;
      
      // Send proper close frame
      try {
        this.ws.close(1000, 'Client disconnect');
      } catch (error) {
        logger.warn('⚠️ [WebSocket] Error during close:', error);
      }
      this.ws = null;
    }
    
    this.isConnected = false;
    this.isReady = false;
    this.isReconnecting = false;
    this.serverClientId = null;
    
    // Clear message queue on manual disconnect
    this.clearMessageQueue();
    
    logger.debug('✅ [WebSocket] Disconnected cleanly');
  }

  // Health check
  ping() {
    this.sendMessage('ping', { timestamp: Date.now() });
  }

  // ✅ CRITICAL: Heartbeat functionality for production reliability
  startHeartbeat() {
    this.stopHeartbeat(); // Clear any existing interval

    logger.debug(`🫀 [WebSocket] Starting heartbeat every ${this.heartbeatIntervalMs}ms`);
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        logger.debug('🏓 [WebSocket] Sending heartbeat ping');
        this.sendMessage('ping', { ts: Date.now() });
      } else {
        logger.warn('⚠️ [WebSocket] Heartbeat skipped - connection not open');
        this.stopHeartbeat();
      }
    }, this.heartbeatIntervalMs);
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      logger.debug('🛑 [WebSocket] Stopping heartbeat');
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * ✅ Message queuing methods for reconnection handling
   */
  
  shouldQueueMessage(type) {
    // Queue important message types during reconnection or while waiting for chat_id
    const queueableTypes = [
      'chat_message', // CRITICAL: Use 'chat_message' for MIPTech Realtime v1
      'typing_start',
      'typing_stop'
    ];
    return queueableTypes.includes(type);
  }

  queueMessage(type, data) {
    if (this.messageQueue.length >= this.maxQueueSize) {
      logger.warn('⚠️ [WebSocket] Message queue full, dropping oldest message');
      this.messageQueue.shift(); // Remove oldest message
    }

    const queuedMessage = {
      type,
      data,
      timestamp: Date.now(),
      id: `queued_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
    };

    this.messageQueue.push(queuedMessage);
    
    logger.debug(`📦 [WebSocket] Message queued: ${type}`, {
      queueSize: this.messageQueue.length,
      messageId: queuedMessage.id,
      isReconnecting: this.isReconnecting
    });
  }

  processMessageQueue() {
    if (this.messageQueue.length === 0) {
      logger.debug('📦 [WebSocket] No queued messages to process');
      return;
    }

    logger.debug(`📦 [WebSocket] Processing ${this.messageQueue.length} queued messages`);
    
    // Create a copy of the queue and clear the original
    const messagesToProcess = [...this.messageQueue];
    this.messageQueue = [];

    // Process each queued message
    messagesToProcess.forEach((queuedMessage, index) => {
      try {
        logger.debug(`📤 [WebSocket] Sending queued message ${index + 1}/${messagesToProcess.length}: ${queuedMessage.type}`);
        
        // Send the message directly (bypass queue check)
        this.sendMessageDirectly(queuedMessage.type, queuedMessage.data);
        
      } catch (error) {
        logger.error(`❌ [WebSocket] Failed to send queued message ${queuedMessage.id}:`, error);
        
        // Re-queue the message if it's still valid and we have space
        if (this.messageQueue.length < this.maxQueueSize) {
          logger.debug(`🔄 [WebSocket] Re-queueing failed message: ${queuedMessage.id}`);
          this.messageQueue.push(queuedMessage);
        }
      }
    });

    logger.debug(`✅ [WebSocket] Finished processing queued messages. Remaining in queue: ${this.messageQueue.length}`);
  }

  sendMessageDirectly(type, data = {}) {
    // Direct message sending without queue checks (for processing queued messages)
    if (!this.isConnected) {
      throw new Error('WebSocket not connected');
    }

    if (!this.isReady && type !== 'ping') {
      throw new Error('WebSocket connection not ready');
    }

    const message = {
      type,
      data,
      timestamp: Date.now(),
      clientId: this.serverClientId || this.customClientId
    };

    // ✅ FE-01: Normalize outgoing event with central event normalizer
    const normalizedMessage = eventNormalizer.normalizeOutgoingEvent(message);
    
    logger.debug('📤 [WebSocket] Sending (direct):', type, normalizedMessage);
    
    this.ws.send(JSON.stringify(normalizedMessage));
  }

  clearMessageQueue() {
    if (this.messageQueue.length > 0) {
      logger.debug(`🗑️ [WebSocket] Clearing message queue (${this.messageQueue.length} messages)`);
      this.messageQueue = [];
    }
  }

  getQueueStatus() {
    return {
      queueSize: this.messageQueue.length,
      maxQueueSize: this.maxQueueSize,
      isReconnecting: this.isReconnecting,
      oldestMessage: this.messageQueue.length > 0 ? {
        type: this.messageQueue[0].type,
        age: Date.now() - this.messageQueue[0].timestamp
      } : null
    };
  }
  
  /**
   * ✅ FE-02: Get deduplication statistics for debugging
   */
  getDedupStats() {
    return {
      registeredListeners: this.registeredListeners.size,
      eventHistorySize: this.eventHistory.size,
      processedEventsSize: this.processedEvents.size,
      dedupWindowMs: this.dedupWindowMs,
      listenersByEvent: this.getListenerCountByEvent(),
      oldestEventInHistory: this.getOldestEventInHistory(),
      newestEventInHistory: this.getNewestEventInHistory()
    };
  }
  
  /**
   * ✅ FE-02: Get listener count by event type
   */
  getListenerCountByEvent() {
    const counts = {};
    for (const [event, handlers] of this.eventListeners.entries()) {
      counts[event] = handlers.length;
    }
    return counts;
  }
  
  /**
   * ✅ FE-02: Get oldest event in history
   */
  getOldestEventInHistory() {
    if (this.eventHistory.size === 0) return null;
    let oldest = null;
    let oldestTime = Infinity;
    for (const [id, timestamp] of this.eventHistory.entries()) {
      if (timestamp < oldestTime) {
        oldestTime = timestamp;
        oldest = { id: id.substring(0, 30) + '...', timestamp };
      }
    }
    return oldest;
  }
  
  /**
   * ✅ FE-02: Get newest event in history
   */
  getNewestEventInHistory() {
    if (this.eventHistory.size === 0) return null;
    let newest = null;
    let newestTime = 0;
    for (const [id, timestamp] of this.eventHistory.entries()) {
      if (timestamp > newestTime) {
        newestTime = timestamp;
        newest = { id: id.substring(0, 30) + '...', timestamp };
      }
    }
    return newest;
  }

  // ✅ CRITICAL: Send join_chat on connection open (no JWT token required for native site)
  sendJoinChatOnOpen() {
    if (this.joinSent) return;
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    // ✅ CRITICAL: Log the exact moment join_chat is sent for debugging
    logger.debug('➡️ [WebSocket] Sending join_chat (create=true)');
    logger.debug('🚀 [WebSocket] Sending join_chat on connection open (MIPTech Realtime v1)');

    // Send explicit join_chat as required by the protocol
    this.sendMessage('join_chat', {
      channel: 'website',
      create: true // Request chat creation
    });

    this.joinSent = true;

    // Add watchdog timer - if no chat_created within 2s, send fallback new_chat
    this.chatCreatedWatchdog = setTimeout(() => {
      if (!this.currentChatId) {
        logger.warn('🕒 [WebSocket] No chat_created received within 2s, sending new_chat fallback');
        this.sendMessage('new_chat', {
          title: 'Website Chat',
          channel: 'website'
        });
      }
    }, 2000);
  }

  // ✅ CRITICAL FIX: Add missing sendJoinChat method (called from connection_ready and joinChat)
  sendJoinChat() {
    // Delegate to existing method
    this.sendJoinChatOnOpen();
  }

  // ✅ CRITICAL FIX: Join chat method for production unblocking
  joinChat(chatId) {
    if (!chatId || chatId === this.currentJoinedChatId) return; // Prevent duplicates
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    
    logger.debug('🚀 [WebSocket] Joining chat:', chatId);
    this.currentChatId = chatId;
    this.sendJoinChat(); // Use new centralized method
  }

  // ✅ CRITICAL FIX: Leave chat method for chat switching
  leaveChat(chatId) {
    if (!chatId || chatId !== this.currentJoinedChatId) return;
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    
    logger.debug('👋 [WebSocket] Leaving chat:', chatId);
    this.sendMessage('leave_chat', { chat_id: chatId });
    this.currentJoinedChatId = null;
  }
}

export default MIPTechWebSocketManager;