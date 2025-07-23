// src/services/websocketManager.js
import eventNormalizer from '../utils/eventNormalizer';

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
    
    // ✅ ENHANCEMENT: Environment-specific configuration
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.isDebugMode = process.env.REACT_APP_DEBUG_MODE === 'true';
    this.enableVerboseLogging = this.isDevelopment || process.env.REACT_APP_DEBUG_WEBSOCKET === 'true';
    
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

  /**
   * Build WebSocket URL with chat_id parameter (MVP requirement)
   */
  buildWebSocketUrlWithChatId(chatId) {
    const params = new URLSearchParams();
    
    // Required parameters
    params.set('tenant_id', this.tenantId);
    if (chatId) {
      params.set('chat_id', chatId);
    }
    
    // Optional parameters
    if (this.customClientId) {
      params.set('client_id', this.customClientId);
    }
    
    if (this.userId) {
      params.set('user_id', this.userId);
    }
    
    if (this.authToken) {
      params.set('token', this.authToken);
    }
    
    return `${this.baseUrl}/api/v1/ws/chat?${params.toString()}`;
  }

  async connect(chatId = null) {
    try {
      // Store chatId for potential reconnections
      this.currentChatId = chatId;
      
      // Build WebSocket URL with chat_id parameter for platform routing
      const wsUrl = chatId ? this.buildWebSocketUrlWithChatId(chatId) : this.buildWebSocketUrl();

      // ✅ ENHANCEMENT: Environment-specific logging
      if (this.enableVerboseLogging) {
        console.log('🔌 [WebSocket] Connecting to:', wsUrl, {
          environment: this.isDevelopment ? 'development' : 'production',
          chatId,
          timeout: this.developmentConnectionTimeout
        });
      } else {
        console.log('🔌 [WebSocket] Connecting...');
      }

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
      console.error('❌ [WebSocket] Connection setup failed:', error);
      
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
    if (this.enableVerboseLogging) {
      console.log('✅ [WebSocket] Connected successfully', {
        environment: this.isDevelopment ? 'development' : 'production',
        url: event.target?.url,
        readyState: event.target?.readyState
      });
    } else {
      console.log('✅ [WebSocket] Connected successfully');
    }
    
    this.isConnected = true;
    this.reconnectAttempts = 0;
    this.emit('connected', { 
      tenantId: this.tenantId,
      userId: this.userId,
      authenticated: !!this.authToken 
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
          console.log('🔄 [EventDedup] Filtered duplicate event:', {
            type: data.type,
            messageId: data.messageId,
            eventTs: data.eventTs
          });
        }
        return; // Skip duplicate event
      }
      
      console.log('📥 [WebSocket] Received:', data.type, data);
      
      // Log normalization for debugging
      if (this.enableVerboseLogging && data.__normalized) {
        console.log('🔄 [EventNormalizer] Event normalized:', {
          originalType: rawData.type,
          normalizedType: data.type,
          hasMessageId: !!data.messageId,
          hasEventTs: !!data.eventTs,
          normalizedAt: data.__normalizedAt
        });
      }

      switch (data.type) {
        case 'connection_established':
          console.log('🎯 [WebSocket] Connection established');
          console.log('🔑 [WebSocket] Server-assigned client_id:', data.data.client_id);
          this.serverClientId = data.data.client_id; // Store platform-assigned client ID
          this.emit('connection_established', data); // ✅ CRITICAL: Emit event for useChat hook
          break;

        case 'connection_ready':
          console.log('🚀 [WebSocket] Connection ready for messages');
          this.isReady = true;
          this.emit('ready', data);
          this.emit('connection_ready', data); // ✅ CRITICAL: Emit event for useChat hook
          break;

        case 'platform_initializing':
          console.log('🔄 [Platform] Platform is initializing AI services...');
          this.emit('platformInitializing', data);
          break;

        case 'platform_ready':
          console.log('✅ [Platform] AI services are fully loaded and ready');
          this.emit('platformReady', data);
          break;

        case 'ai_services_loading':
          console.log('⚙️ [Platform] Vector database and LLM services loading...');
          this.emit('aiServicesLoading', data);
          break;

        case 'ai_services_ready':
          console.log('🤖 [Platform] All AI components initialized');
          this.emit('aiServicesReady', data);
          break;

        case 'initialization_progress':
          console.log('📊 [Platform] Initialization progress:', data.data);
          this.emit('initializationProgress', data);
          break;

        case 'ping':
          // Handle platform ping messages
          this.emit('ping', data);
          break;

        case 'chat_response':
          this.emit('chatResponse', data);
          this.emit('chat_response', data); // ✅ CRITICAL: Emit both event names for compatibility
          break;

        case 'chat_response_streaming':
          console.log('📡 [WebSocket] Streaming response chunk received');
          this.emit('chatResponseStreaming', data);
          this.emit('chat_response_streaming', data); // ✅ CRITICAL: Emit for streaming handlers
          break;

        case 'message_received':
          console.log('✅ [WebSocket] Message received confirmation', {
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
          console.log('⚙️ [WebSocket] AI processing started', {
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
          console.log('🎉 [WebSocket] AI response completed', {
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
          
          console.log('🔥 [WebSocket] About to emit response_complete events with data:', {
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
          
          console.log('✅ [WebSocket] All response_complete events emitted');
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
          console.error('💥 [WebSocket] Server error:', data.data);
          // Enhanced error handling to distinguish between error types
          const errorData = {
            ...data.data,
            source: 'server',
            timestamp: Date.now(),
            errorType: data.data?.type || 'general_error'
          };
          
          // Emit specific error types for better frontend handling
          if (data.data?.type === 'ai_processing_error') {
            console.error('🤖 [WebSocket] AI Processing Error:', data.data);
            this.emit('aiProcessingError', errorData);
            this.emit('ai_processing_error', errorData);
          } else if (data.data?.type === 'message_validation_error') {
            console.error('📝 [WebSocket] Message Validation Error:', data.data);
            this.emit('messageValidationError', errorData);
            this.emit('message_validation_error', errorData);
          } else if (data.data?.type === 'rate_limit_error') {
            console.error('🚦 [WebSocket] Rate Limit Error:', data.data);
            this.emit('rateLimitError', errorData);
            this.emit('rate_limit_error', errorData);
          }
          
          // Always emit generic error event for backward compatibility
          this.emit('error', errorData);
          this.emit('serverError', errorData);
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

    // Enhanced close code analysis for platform debugging
    let closeType = 'normal_close';
    let shouldReconnect = true;
    
    switch (event.code) {
      case 1000:
        closeType = 'normal_close';
        shouldReconnect = false;
        console.log('✅ [WebSocket] Normal closure - no reconnection needed');
        break;
      case 1003:
        closeType = 'unsupported_data';
        console.log('❌ [WebSocket] Unsupported data format - check message structure');
        break;
      case 1006:
        closeType = 'abnormal_closure';
        console.log('⚠️ [WebSocket] Abnormal closure - likely platform restart or network issue');
        break;
      case 1011:
        closeType = 'server_error';
        console.log('💥 [WebSocket] Server error - platform may be experiencing issues');
        break;
      case 1012:
        closeType = 'service_restart';
        console.log('🔄 [WebSocket] Service restarting - platform maintenance');
        this.lastErrorType = 'platform_initializing';
        break;
      case 4003:
        closeType = 'rate_limit_exceeded';
        console.log('🚦 [WebSocket] Rate limit exceeded - backing off');
        this.lastErrorType = 'rate_limit_error';
        break;
      case 4004:
        closeType = 'authentication_failed';
        console.log('🔐 [WebSocket] Authentication failed - check tenant configuration');
        this.lastErrorType = 'authentication_error';
        shouldReconnect = false;
        break;
      default:
        console.log(`🔍 [WebSocket] Unexpected close code: ${event.code} - ${event.reason}`);
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
        console.log(`🔄 [WebSocket] Attempting reconnection (${this.reconnectAttempts + 1}/${maxRetries}) in ${this.isDevelopment ? 'development' : 'production'} mode`);
      }
      // ✅ ENHANCEMENT: Pass chatId to maintain session context
      this.attemptReconnect(this.currentChatId);
    } else if (!shouldReconnect) {
      console.log('🛑 [WebSocket] Reconnection disabled for this error type');
      this.emit('reconnection_stopped', { reason: closeType, code: event.code });
    } else if (this.reconnectAttempts >= maxRetries) {
      console.log(`🛑 [WebSocket] Maximum reconnection attempts reached (${maxRetries} attempts)`);
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
    console.error('❌ [WebSocket] Error:', event);
    
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
    if (this.lastErrorType === 'rate_limit_error') {
      delay = Math.max(delay, 5000); // Minimum 5s for rate limits
      console.log(`⚠️ [WebSocket] Rate limit detected - using extended backoff: ${delay}ms`);
    } else if (this.lastErrorType === 'platform_initializing') {
      delay = Math.max(delay, 2000); // Minimum 2s for platform startup
      console.log(`🔄 [WebSocket] Platform initializing - waiting for readiness: ${delay}ms`);
    } else if (this.lastErrorType === 'network_error') {
      // Network issues might need more time
      delay = Math.max(delay, 3000);
      console.log(`🌐 [WebSocket] Network error detected - extended delay: ${delay}ms`);
    } else if (this.lastErrorType === 'server_error') {
      // Server errors might need time to resolve
      delay = Math.max(delay, 4000);
      console.log(`🔥 [WebSocket] Server error detected - extended delay: ${delay}ms`);
    }
    
    // Cap maximum delay at 30 seconds
    delay = Math.min(delay, 30000);

    const maxRetries = this.isDevelopment ? this.developmentMaxRetries : this.maxReconnectAttempts;
    
    if (this.enableVerboseLogging) {
      console.log(`🔄 [WebSocket] Reconnecting (${this.reconnectAttempts}/${maxRetries}) in ${delay}ms`, {
        environment: this.isDevelopment ? 'development' : 'production',
        errorType: this.lastErrorType,
        chatId
      });
    } else {
      console.log(`🔄 [WebSocket] Reconnecting (${this.reconnectAttempts}/${maxRetries}) in ${delay}ms`);
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
        console.log('✅ [WebSocket] Reconnection successful');
        
        // Reset error tracking on successful reconnection
        this.lastErrorType = null;
        this.emit('reconnection_success', { attempts: this.reconnectAttempts });
        
      } catch (error) {
        console.error('❌ [WebSocket] Reconnection failed:', error);
        
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
          console.error('🛑 [WebSocket] Stopping reconnection due to unrecoverable error:', error.type);
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
          console.error(`🛑 [WebSocket] Max reconnection attempts reached (${maxRetries})`);
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
      clientId: this.serverClientId || this.customClientId
    };

    // ✅ FE-01: Normalize outgoing event with central event normalizer
    const normalizedMessage = eventNormalizer.normalizeOutgoingEvent(message);
    
    console.log('📤 [WebSocket] Sending:', type, normalizedMessage);
    
    // Log normalization for debugging
    if (this.enableVerboseLogging && normalizedMessage.__normalized) {
      console.log('🔄 [EventNormalizer] Outgoing event normalized:', {
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
    this.sendMessage('chat_message', {
      message,
      chat_id: chatId,
      tenant_id: this.tenantId
    });
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
    this.sendMessage(eventType, {
      chat_id: chatId,
      tenant_id: this.tenantId
    });
  }

  // New dedicated methods for clarity
  sendTypingStart(chatId) {
    this.sendMessage('typing_start', {
      chat_id: chatId,
      tenant_id: this.tenantId
    });
  }

  sendTypingStop(chatId) {
    this.sendMessage('typing_stop', {
      chat_id: chatId,
      tenant_id: this.tenantId
    });
  }

  // ✅ FE-02: Event handling with single-listener guard
  on(event, handler) {
    // Generate listener ID for duplicate detection
    const listenerId = this.generateListenerId(event, handler);
    
    // ✅ DEBUG: Always log listener registration attempts
    console.log(`📝 [WebSocket] Attempting to register listener for event: ${event}`, {
      listenerId: listenerId.substring(0, 12),
      handlerType: typeof handler,
      isDuplicate: this.registeredListeners.has(listenerId),
      currentListenerCount: this.eventListeners.has(event) ? this.eventListeners.get(event).length : 0
    });
    
    // Check for duplicate registration
    if (this.registeredListeners.has(listenerId)) {
      console.warn(`⚠️ [WebSocket] Duplicate listener registration detected for event '${event}'.`, {
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
    
    console.log(`✅ [WebSocket] Successfully registered listener for '${event}'`, {
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
              console.log(`📝 [WebSocket] Unregistered listener for '${event}' (ID: ${listenerId.substring(0, 8)}...)`);
            }
            break;
          }
        }
      }
    }
  }

  emit(event, data) {
    // ✅ DEBUG: Log all event emissions
    console.log(`🚀 [WebSocket] Emitting event: ${event}`, {
      hasListeners: this.eventListeners.has(event),
      listenerCount: this.eventListeners.has(event) ? this.eventListeners.get(event).length : 0,
      eventData: data?.type || 'no-type',
      dataKeys: data ? Object.keys(data) : []
    });
    
    if (this.eventListeners.has(event)) {
      const handlers = this.eventListeners.get(event);
      handlers.forEach((handler, index) => {
        try {
          console.log(`📞 [WebSocket] Calling handler ${index + 1}/${handlers.length} for event: ${event}`);
          handler(data);
          console.log(`✅ [WebSocket] Handler ${index + 1} completed for event: ${event}`);
        } catch (error) {
          console.error(`❌ [WebSocket] Event handler error for ${event} (handler ${index + 1}):`, error);
        }
      });
    } else {
      console.warn(`⚠️ [WebSocket] No listeners registered for event: ${event}`);
    }
  }

  disconnect() {
    console.log('🔌 [WebSocket] Disconnecting...');
    
    // Clear any pending reconnection attempts
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
      console.log('✅ [WebSocket] Cancelled pending reconnection');
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
      console.log('✅ [WebSocket] Cleared deduplication structures');
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
        console.warn('⚠️ [WebSocket] Error during close:', error);
      }
      this.ws = null;
    }
    
    this.isConnected = false;
    this.isReady = false;
    this.serverClientId = null;
    
    console.log('✅ [WebSocket] Disconnected cleanly');
  }

  // Health check
  ping() {
    this.sendMessage('ping', { timestamp: Date.now() });
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
}

export default MIPTechWebSocketManager;