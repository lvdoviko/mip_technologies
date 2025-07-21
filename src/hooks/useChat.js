// src/hooks/useChat.js
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import MIPTechApiClient from '../services/miptechApi';
import MIPTechWebSocketManager from '../services/websocketManager';
import { sessionManager } from '../services/sessionManager';
import { performanceMonitor } from '../services/performanceMonitor';
import { 
  handleApiError, 
  handleWebSocketError, 
  sanitizeInput,
  ERROR_TYPES,
  ERROR_SEVERITY,
  MIPTechError 
} from '../utils/errorHandler';

/**
 * Chat message status types
 */
export const MESSAGE_STATUS = {
  SENDING: 'sending',
  SENT: 'sent',
  DELIVERED: 'delivered',
  FAILED: 'failed',
  RECEIVED: 'received'
};

/**
 * Chat connection states
 */
export const CHAT_STATES = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  RECONNECTING: 'reconnecting',
  FAILED: 'failed'
};

/**
 * Chat hook configuration
 */
export const createChatConfig = (options = {}) => {
  return {
    autoConnect: options.autoConnect !== false,
    maxRetries: options.maxRetries || 3,
    retryDelay: options.retryDelay || 1000,
    messageTimeout: options.messageTimeout || 30000,
    typingTimeout: options.typingTimeout || 3000,
    maxMessageLength: options.maxMessageLength || 4000,
    enableTypingIndicator: options.enableTypingIndicator !== false,
    enablePersistence: false, // MVP: Disabled for initial implementation (no login system)
    enablePerformanceTracking: options.enablePerformanceTracking !== false,
    ...options
  };
};

/**
 * Optimized useChat hook with comprehensive state management
 */
export const useChat = (config = {}) => {
  const chatConfig = useMemo(() => createChatConfig(config), [config]);
  
  // Core state
  const [connectionState, setConnectionState] = useState(CHAT_STATES.DISCONNECTED);
  const [isConnectionReady, setIsConnectionReady] = useState(false);
  const [currentChat, setCurrentChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [typingUsers, setTypingUsers] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  
  // Platform-specific state
  const [canSendMessages, setCanSendMessages] = useState(false);
  const [initializationStatus, setInitializationStatus] = useState(null);
  const [streamingResponse, setStreamingResponse] = useState({
    isStreaming: false,
    messageId: null,
    content: '',
    chunks: []
  });
  
  // Performance tracking
  const [performanceMetrics, setPerformanceMetrics] = useState({
    connectionTime: 0,
    averageResponseTime: 0,
    messagesCount: 0,
    errorCount: 0
  });
  
  // Refs for stable references  
  const apiRef = useRef(new MIPTechApiClient());
  const websocketRef = useRef(new MIPTechWebSocketManager());
  const sessionRef = useRef(sessionManager);
  const performanceRef = useRef(performanceMonitor);
  const typingTimeoutRef = useRef(null);
  const messageTimeoutRef = useRef(new Map());
  const connectionTimeoutRef = useRef(null);
  const retryCountRef = useRef(0);
  const isUnmountedRef = useRef(false);
  
  // ✅ Phase 4: React hook deduplication to prevent StrictMode duplicate connections
  const isInitializingRef = useRef(false);
  const initializationPromiseRef = useRef(null);
  
  // ✅ CRITICAL: React Strict Mode connection state management
  const connectionInstanceRef = useRef(null);
  const strictModeDebounceRef = useRef(null);
  const isStrictModeRef = useRef(false);
  const componentMountedRef = useRef(true);
  const wsCleanupTimeoutRef = useRef(null);
  const strictModeCleanupRef = useRef(false);
  
  // Memoized session data
  const sessionData = useMemo(() => {
    return sessionRef.current.getSession();
  }, []);
  
  // ✅ CRITICAL DEBUG: Check environment and WebSocket manager at startup
  useEffect(() => {
    console.log('🔍 [DEBUG] Environment variables check:');
    console.log('🔍 [ENV] REACT_APP_MIPTECH_WS_URL:', process.env.REACT_APP_MIPTECH_WS_URL);
    console.log('🔍 [ENV] REACT_APP_MIPTECH_TENANT_ID:', process.env.REACT_APP_MIPTECH_TENANT_ID);
    console.log('🔍 [ENV] NODE_ENV:', process.env.NODE_ENV);
    
    console.log('🔍 [DEBUG] WebSocket manager check:');
    console.log('🔍 [DEBUG] websocketRef.current:', websocketRef.current);
    console.log('🔍 [DEBUG] websocketRef.current constructor:', websocketRef.current?.constructor?.name);
    console.log('🔍 [DEBUG] connect method exists:', typeof websocketRef.current?.connect);
    
    if (!websocketRef.current) {
      console.error('❌ [CRITICAL] WebSocket manager is NULL at startup!');
    }
  }, []);

  // ✅ CRITICAL FIX: React Strict Mode connection management
  useEffect(() => {
    console.log('🔄 [StrictMode] Component mounted/remounted');
    console.log('🔍 [StrictMode] isUnmountedRef.current before reset:', isUnmountedRef.current);
    
    // Detect React Strict Mode by checking if component was previously unmounted
    if (isUnmountedRef.current === true) {
      console.log('⚠️ [StrictMode] React Strict Mode detected - component remounting after unmount');
      isStrictModeRef.current = true;
      strictModeCleanupRef.current = false;
    }
    
    // Reset all refs to clean state on mount
    isUnmountedRef.current = false;
    componentMountedRef.current = true;
    isInitializingRef.current = false;
    initializationPromiseRef.current = null;
    
    // Clear any pending strict mode cleanup
    if (wsCleanupTimeoutRef.current) {
      clearTimeout(wsCleanupTimeoutRef.current);
      wsCleanupTimeoutRef.current = null;
      console.log('✅ [StrictMode] Cancelled pending WebSocket cleanup');
    }
    
    console.log('✅ [StrictMode] Component state reset - isUnmountedRef:', isUnmountedRef.current);
    
    return () => {
      console.log('🧹 [StrictMode] Component cleanup triggered');
      componentMountedRef.current = false;
      
      // In React Strict Mode, delay actual cleanup to prevent premature disconnection
      if (process.env.NODE_ENV === 'development') {
        console.log('⏰ [StrictMode] Delaying cleanup for React Strict Mode (500ms)...');
        strictModeCleanupRef.current = true;
        
        wsCleanupTimeoutRef.current = setTimeout(() => {
          if (strictModeCleanupRef.current && !componentMountedRef.current) {
            console.log('🧹 [StrictMode] Executing delayed cleanup - component truly unmounting');
            isUnmountedRef.current = true;
          } else {
            console.log('✅ [StrictMode] Component remounted - skipping cleanup');
          }
        }, 500);
      } else {
        // In production, cleanup immediately
        console.log('🧹 [Production] Immediate cleanup');
        isUnmountedRef.current = true;
      }
    };
  }, []);
  
  /**
   * Load chat history
   */
  const mergeMessageHistory = useCallback((serverMessages, localMessages) => {
    const merged = [...serverMessages];
    const serverIds = new Set(serverMessages.map(msg => msg.id));
    
    localMessages.forEach(localMsg => {
      if (!serverIds.has(localMsg.id)) {
        merged.push(localMsg);
      }
    });
    
    return merged.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }, []);

  /**
   * Wait for platform AI services to be ready (MVP requirement)
   * Platform needs 1.7+ seconds for AI service initialization
   */
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

  /**
   * Create chat session via REST API (MVP requirement)
   * Platform requires chat session before WebSocket connection
   */
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

  const loadChatHistory = useCallback(async (chatId) => {
    try {
      const history = await apiRef.current.getChatHistory(chatId);
      
      if (isUnmountedRef.current) return;
      
      const sanitizedMessages = history.items?.map(msg => ({
        ...msg,
        content: sanitizeInput(msg.content),
        status: MESSAGE_STATUS.RECEIVED
      })) || [];
      
      setMessages(sanitizedMessages);
      
      // Also load from session storage for offline messages
      const localHistory = sessionRef.current.getChatHistory();
      if (localHistory.length > 0) {
        const mergedHistory = mergeMessageHistory(sanitizedMessages, localHistory);
        setMessages(mergedHistory);
      }
      
    } catch (error) {
      // Don't fail initialization if history loading fails
      console.warn('[Chat] Failed to load chat history:', error);
    }
  }, [mergeMessageHistory]);

  /**
   * Connect to WebSocket
   */
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


  /**
   * Initialize chat connection
   */
  const initializeChat = useCallback(async (options = {}) => {
    console.log('🚀 [DEBUG] initializeChat called with options:', options);
    console.log('🔍 [DEBUG] isUnmountedRef.current:', isUnmountedRef.current);
    console.log('🔍 [DEBUG] isInitializingRef.current:', isInitializingRef.current);
    console.log('🔍 [DEBUG] initializationPromiseRef.current:', initializationPromiseRef.current);
    
    if (isUnmountedRef.current) {
      console.log('❌ [DEBUG] Component unmounted in initializeChat - early return');
      return;
    }
    
    // ✅ Phase 4: Prevent multiple simultaneous initialization calls (React StrictMode fix)
    if (isInitializingRef.current) {
      console.log('🔄 [DEBUG] Initialization already in progress, waiting...');
      console.log('🔍 [DEBUG] Returning cached promise:', initializationPromiseRef.current);
      return initializationPromiseRef.current;
    }
    
    console.log('🚀 [DEBUG] Starting new initialization...');
    isInitializingRef.current = true;
    
    try {
      console.log('🔗 [DEBUG] About to call performInitializationInternal...');
      initializationPromiseRef.current = performInitializationInternal(options);
      console.log('🔗 [DEBUG] performInitializationInternal assigned to promise ref');
      
      const result = await initializationPromiseRef.current;
      console.log('✅ [DEBUG] performInitializationInternal completed successfully:', result);
      return result;
    } catch (error) {
      console.error('❌ [DEBUG] Error in initializeChat:', error);
      console.error('❌ [DEBUG] Error stack:', error.stack);
      throw error;
    } finally {
      console.log('🧹 [DEBUG] Resetting initialization flags');
      isInitializingRef.current = false;
      initializationPromiseRef.current = null;
    }
  }, []);
  
  /**
   * Internal initialization function
   */
  const performInitializationInternal = useCallback(async (options = {}) => {
    console.log('🚀 [DEBUG] performInitializationInternal START');
    
    if (isUnmountedRef.current) {
      console.log('❌ [DEBUG] Component unmounted - early return');
      return;
    }
    
    console.log('🚀 [DEBUG] Starting WebSocket connection process');
    
    try {
      setIsLoading(true);
      setError(null);
      setConnectionState(CHAT_STATES.CONNECTING);
      
      console.log('📊 [DEBUG] Connection state set to CONNECTING');
      
      // Start performance tracking
      if (chatConfig.enablePerformanceTracking) {
        performanceRef.current.startTimer('chat_initialization');
        console.log('📊 [DEBUG] Performance tracking started');
      }
      
      // MVP: Platform Architecture Implementation
      // Step 1: Wait for platform AI services to be ready
      console.log('🔍 [Platform] Step 1: Checking platform readiness...');
      await waitForPlatformReady();
      
      if (isUnmountedRef.current) {
        console.log('❌ [DEBUG] Component unmounted after platform check - early return');
        return;
      }
      
      // Step 2: Create chat session via REST API
      const tenantId = process.env.REACT_APP_MIPTECH_TENANT_ID || 'miptech-company';
      console.log('💬 [Platform] Step 2: Creating chat session...');
      const chatId = await createChatSession(tenantId);
      
      if (isUnmountedRef.current) {
        console.log('❌ [DEBUG] Component unmounted after chat creation - early return');
        return;
      }
      
      // Store chat info for WebSocket connection
      const chat = {
        id: chatId,
        tenant_id: tenantId,
        title: options.title || 'Website Chat',
        created_at: new Date().toISOString()
      };
      
      console.log('💬 [DEBUG] Chat session created successfully:', chat.id);
      
      if (isUnmountedRef.current) {
        console.log('❌ [DEBUG] Component unmounted after chat creation - early return');
        return;
      }
      
      setCurrentChat(chat);
      console.log('💾 [DEBUG] Chat stored in state');
      
      // MVP: Chat history loading disabled for initial implementation
      // Load chat history if persistence is enabled
      if (chatConfig.enablePersistence && false) { // MVP: Disabled for first implementation
        console.log('📚 [DEBUG] Loading chat history...');
        await loadChatHistory(chat.id);
        console.log('📚 [DEBUG] Chat history loaded');
      } else {
        console.log('📚 [DEBUG] Chat history loading disabled for MVP implementation');
      }
      
      // Step 3: Connect WebSocket with chat_id parameter (MVP requirement)
      console.log('🔗 [Platform] Step 3: Connecting WebSocket with chat_id...');
      await connectWebSocket(chat.id);
      console.log('✅ [DEBUG] connectWebSocket completed');
      
      // Track performance
      if (chatConfig.enablePerformanceTracking) {
        const duration = performanceRef.current.endTimer('chat_initialization');
        performanceRef.current.trackChatWidget('initialized', duration?.duration);
      }
      
      setConnectionState(CHAT_STATES.CONNECTED);
      
      // Set connection timeout (10 seconds for ready state)
      connectionTimeoutRef.current = setTimeout(() => {
        if (!isUnmountedRef.current && !isConnectionReady) {
          console.warn('[Chat] Connection ready timeout - platform did not signal ready state');
          setError(new MIPTechError(
            'Connection ready timeout',
            ERROR_TYPES.WEBSOCKET,
            ERROR_SEVERITY.MEDIUM,
            { timeout: 10000 }
          ));
          setConnectionState(CHAT_STATES.ERROR);
        }
      }, 10000);
      
      retryCountRef.current = 0;
      
      return chat;
      
    } catch (err) {
      console.error('❌ [DEBUG] Error in performInitializationInternal:', err);
      console.error('❌ [DEBUG] Error stack:', err.stack);
      
      if (isUnmountedRef.current) {
        console.log('[DEBUG] Component unmounted during error handling');
        return;
      }
      
      const chatError = handleApiError(err, { 
        action: 'initializeChat',
        options 
      });
      
      console.log('❌ [DEBUG] Setting error state:', chatError.message);
      setError(chatError);
      setConnectionState(CHAT_STATES.FAILED);
      
      // Retry logic
      if (retryCountRef.current < chatConfig.maxRetries) {
        retryCountRef.current++;
        setTimeout(() => {
          if (!isUnmountedRef.current) {
            initializeChat(options);
          }
        }, chatConfig.retryDelay * retryCountRef.current);
      }
      
      throw chatError;
    } finally {
      if (!isUnmountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [chatConfig, loadChatHistory, connectWebSocket]);
  
  /**
   * Send message
   */
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
    
    if (!content || typeof content !== 'string') {
      throw new MIPTechError(
        'Message content is required',
        ERROR_TYPES.VALIDATION,
        ERROR_SEVERITY.MEDIUM
      );
    }
    
    const trimmedContent = content.trim();
    if (trimmedContent.length === 0) {
      throw new MIPTechError(
        'Message cannot be empty',
        ERROR_TYPES.VALIDATION,
        ERROR_SEVERITY.LOW
      );
    }
    
    if (trimmedContent.length > chatConfig.maxMessageLength) {
      throw new MIPTechError(
        `Message too long (${trimmedContent.length}/${chatConfig.maxMessageLength} characters)`,
        ERROR_TYPES.VALIDATION,
        ERROR_SEVERITY.MEDIUM
      );
    }
    
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const sanitizedContent = sanitizeInput(trimmedContent);
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Start performance tracking
      if (chatConfig.enablePerformanceTracking) {
        performanceRef.current.startTimer(`message_${messageId}`);
      }
      
      // Create optimistic message
      const userMessage = {
        id: messageId,
        content: sanitizedContent,
        role: 'user',
        timestamp: new Date().toISOString(),
        status: MESSAGE_STATUS.SENDING,
        metadata: options.metadata || {}
      };
      
      // Add message to UI immediately
      setMessages(prev => [...prev, userMessage]);
      
      // Persist message locally
      if (chatConfig.enablePersistence) {
        sessionRef.current.addChatMessage(userMessage);
      }
      
      // Set message timeout
      const timeoutId = setTimeout(() => {
        setMessages(prev => prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, status: MESSAGE_STATUS.FAILED }
            : msg
        ));
      }, chatConfig.messageTimeout);
      
      messageTimeoutRef.current.set(messageId, timeoutId);
      
      // Send to API
      const response = await apiRef.current.sendMessage(currentChat.id, sanitizedContent, {
        metadata: {
          ...options.metadata,
          message_id: messageId,
          client_timestamp: userMessage.timestamp
        }
      });
      
      if (isUnmountedRef.current) return;
      
      // Clear timeout
      clearTimeout(timeoutId);
      messageTimeoutRef.current.delete(messageId);
      
      // Update message status
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, status: MESSAGE_STATUS.SENT, serverResponse: response }
          : msg
      ));
      
      // Track performance
      if (chatConfig.enablePerformanceTracking) {
        const duration = performanceRef.current.endTimer(`message_${messageId}`);
        performanceRef.current.trackChatWidget('message_sent', duration?.duration);
        
        // Update metrics
        setPerformanceMetrics(prev => ({
          ...prev,
          messagesCount: prev.messagesCount + 1,
          averageResponseTime: prev.averageResponseTime 
            ? (prev.averageResponseTime + (duration?.duration || 0)) / 2
            : duration?.duration || 0
        }));
      }
      
      // Update persistence
      if (chatConfig.enablePersistence) {
        sessionRef.current.addChatMessage({
          ...userMessage,
          status: MESSAGE_STATUS.SENT,
          serverResponse: response
        });
      }
      
      return response;
      
    } catch (err) {
      if (isUnmountedRef.current) return;
      
      // Clear timeout
      const timeoutId = messageTimeoutRef.current.get(messageId);
      if (timeoutId) {
        clearTimeout(timeoutId);
        messageTimeoutRef.current.delete(messageId);
      }
      
      const chatError = handleApiError(err, {
        action: 'sendMessage',
        messageId,
        content: sanitizedContent
      });
      
      setError(chatError);
      
      // Update message status
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, status: MESSAGE_STATUS.FAILED, error: chatError }
          : msg
      ));
      
      // Track error
      if (chatConfig.enablePerformanceTracking) {
        setPerformanceMetrics(prev => ({
          ...prev,
          errorCount: prev.errorCount + 1
        }));
      }
      
      throw chatError;
    } finally {
      if (!isUnmountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [currentChat, chatConfig, isConnectionReady, connectionState]);
  
  /**
   * Start typing indicator
   */
  const stopTyping = useCallback(() => {
    if (!currentChat || !chatConfig.enableTypingIndicator) return;
    
    setIsTyping(false);
    websocketRef.current.sendTyping(currentChat.id, false);
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, [currentChat, chatConfig.enableTypingIndicator]);

  const startTyping = useCallback(() => {
    if (!currentChat || !chatConfig.enableTypingIndicator) return;
    
    setIsTyping(true);
    websocketRef.current.sendTyping(currentChat.id, true);
    
    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set new timeout
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, chatConfig.typingTimeout);
  }, [currentChat, chatConfig.enableTypingIndicator, chatConfig.typingTimeout, stopTyping, connectionState, isConnectionReady]);
  
  
  /**
   * Clear chat history
   */
  const clearMessages = useCallback(() => {
    setMessages([]);
    if (chatConfig.enablePersistence) {
      sessionRef.current.clearChatHistory();
    }
  }, [chatConfig.enablePersistence]);
  
  /**
   * Retry failed message
   */
  const retryMessage = useCallback(async (messageId) => {
    const message = messages.find(msg => msg.id === messageId);
    if (!message || message.status !== MESSAGE_STATUS.FAILED) {
      return;
    }
    
    // Remove the failed message and resend
    setMessages(prev => prev.filter(msg => msg.id !== messageId));
    
    try {
      await sendMessage(message.content, message.metadata);
    } catch (error) {
      console.error('[Chat] Failed to retry message:', error);
    }
  }, [messages, sendMessage]);
  
  /**
   * Disconnect chat
   */
  const disconnect = useCallback(() => {
    setConnectionState(CHAT_STATES.DISCONNECTED);
    setIsConnectionReady(false);
    
    // Clear connection timeout
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }
    
    websocketRef.current.disconnect();
    setCurrentChat(null);
    setError(null);
    stopTyping();
  }, [stopTyping]);
  
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
      
      console.log(`⏳ [Chat] Platform initializing: ${data.phase || 'unknown'} - ${data.message || 'Initializing services'}`);
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
    
    const handleMessage = (data) => {
      if (isUnmountedRef.current) return;
      
      if (data.type === 'chat_message') {
        const message = {
          ...data.message,
          content: sanitizeInput(data.message.content),
          status: MESSAGE_STATUS.RECEIVED
        };
        
        setMessages(prev => [...prev, message]);
        
        // Persist message
        if (chatConfig.enablePersistence) {
          sessionRef.current.addChatMessage(message);
        }
        
        // Track performance
        if (chatConfig.enablePerformanceTracking) {
          performanceRef.current.trackChatWidget('message_received');
        }
      }
    };
    
    const handleTyping = (data) => {
      if (isUnmountedRef.current) return;
      
      if (data.type === 'typing') {
        setTypingUsers(prev => {
          const userId = data.data.user_id;
          return prev.includes(userId) ? prev : [...prev, userId];
        });
      } else if (data.type === 'stop_typing') {
        setTypingUsers(prev => prev.filter(id => id !== data.data.user_id));
      }
    };
    
    const handleError = (error) => {
      if (isUnmountedRef.current) return;
      
      // Guard against isolated errors (like health check failures) affecting WebSocket connection
      if (error.details?.skipGlobalErrorHandler || 
          error.details?.isolated || 
          error.message?.includes('Health endpoint') ||
          error.message?.includes('health circuit breaker')) {
        
        if (process.env.REACT_APP_DEBUG_API === 'true') {
          console.log('[Chat] Ignoring isolated health check error - not affecting WebSocket:', error.message);
        }
        return; // Don't handle health check errors in chat context
      }
      
      const wsError = handleWebSocketError(error);
      setError(wsError);
      
      // Track error
      if (chatConfig.enablePerformanceTracking) {
        setPerformanceMetrics(prev => ({
          ...prev,
          errorCount: prev.errorCount + 1
        }));
      }
    };
    
    const handleFailed = () => {
      if (isUnmountedRef.current) return;
      setConnectionState(CHAT_STATES.FAILED);
    };
    
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
    
    // Add event listeners
    wsManager.on('connected', handleConnected);
    wsManager.on('ready', handleReady);
    wsManager.on('connection_established', handleConnectionEstablished);
    wsManager.on('initialization_progress', handleInitializationProgress);
    wsManager.on('connection_ready', handleConnectionReady);
    wsManager.on('ready_timeout', handleReadyTimeout);
    wsManager.on('response_start', handleResponseStart);
    wsManager.on('response_chunk', handleResponseChunk);
    wsManager.on('response_complete', handleResponseComplete);
    wsManager.on('chatResponse', handleMessage); // ✅ CRITICAL: Add chat response handler
    wsManager.on('chat_response', handleMessage); // ✅ CRITICAL: Add platform event handler
    wsManager.on('chatResponseStreaming', handleResponseChunk); // ✅ CRITICAL: Add streaming handler
    wsManager.on('chat_response_streaming', handleResponseChunk); // ✅ CRITICAL: Add platform streaming handler
    wsManager.on('disconnected', handleDisconnected);
    wsManager.on('reconnecting', handleReconnecting);
    wsManager.on('message', handleMessage);
    wsManager.on('typing', handleTyping);
    wsManager.on('stop_typing', handleTyping);
    wsManager.on('typingIndicator', handleTyping); // ✅ CRITICAL: Add typing indicator handler
    wsManager.on('typing_indicator', handleTyping); // ✅ CRITICAL: Add platform typing handler
    wsManager.on('error', handleError);
    wsManager.on('failed', handleFailed);
    
    return () => {
      if (wsManager && wsManager.off) {
        wsManager.off('connected', handleConnected);
        wsManager.off('ready', handleReady);
        wsManager.off('connection_established', handleConnectionEstablished);
        wsManager.off('initialization_progress', handleInitializationProgress);
        wsManager.off('connection_ready', handleConnectionReady);
        wsManager.off('ready_timeout', handleReadyTimeout);
        wsManager.off('response_start', handleResponseStart);
        wsManager.off('response_chunk', handleResponseChunk);
        wsManager.off('response_complete', handleResponseComplete);
        wsManager.off('chatResponse', handleMessage); // ✅ CRITICAL: Remove chat response handler
        wsManager.off('chat_response', handleMessage); // ✅ CRITICAL: Remove platform event handler
        wsManager.off('chatResponseStreaming', handleResponseChunk); // ✅ CRITICAL: Remove streaming handler
        wsManager.off('chat_response_streaming', handleResponseChunk); // ✅ CRITICAL: Remove platform streaming handler
        wsManager.off('disconnected', handleDisconnected);
        wsManager.off('reconnecting', handleReconnecting);
        wsManager.off('message', handleMessage);
        wsManager.off('typing', handleTyping);
        wsManager.off('stop_typing', handleTyping);
        wsManager.off('typingIndicator', handleTyping); // ✅ CRITICAL: Remove typing indicator handler
        wsManager.off('typing_indicator', handleTyping); // ✅ CRITICAL: Remove platform typing handler
        wsManager.off('error', handleError);
        wsManager.off('failed', handleFailed);
      }
    };
  }, [chatConfig.enablePersistence, chatConfig.enablePerformanceTracking]);
  
  /**
   * Auto-initialize chat if enabled
   */
  useEffect(() => {
    if (chatConfig.autoConnect && !currentChat && connectionState === CHAT_STATES.DISCONNECTED) {
      console.log('🚀 [Chat] Auto-initializing chat connection');
      initializeChat().catch(console.error);
    }
  }, [chatConfig.autoConnect, currentChat, connectionState, initializeChat]);
  
  /**
   * Cleanup on unmount - Enhanced for React Strict Mode
   */
  useEffect(() => {
    return () => {
      console.log('🧹 [Chat] Enhanced cleanup function called');
      
      // Check if this is a React Strict Mode cleanup or real unmount
      if (process.env.NODE_ENV === 'development' && !wsCleanupTimeoutRef.current) {
        console.log('⏰ [StrictMode] Delaying WebSocket cleanup to handle React Strict Mode...');
        
        // Don't immediately disconnect in development - wait to see if component remounts
        wsCleanupTimeoutRef.current = setTimeout(() => {
          if (!componentMountedRef.current) {
            console.log('🧹 [StrictMode] Component truly unmounted - executing WebSocket cleanup');
            performCleanup();
          } else {
            console.log('✅ [StrictMode] Component remounted - skipping WebSocket cleanup');
          }
        }, 100); // Short delay to detect remounting
        
        return;
      }
      
      // In production or if already scheduled, cleanup immediately
      performCleanup();
    };
    
    function performCleanup() {
      console.log('🧹 [Chat] Performing actual cleanup');
      isUnmountedRef.current = true;
      
      // ✅ Phase 4: Reset initialization state on cleanup
      isInitializingRef.current = false;
      initializationPromiseRef.current = null;
      
      // Clear all timeouts
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
      }
      
      if (wsCleanupTimeoutRef.current) {
        clearTimeout(wsCleanupTimeoutRef.current);
        wsCleanupTimeoutRef.current = null;
      }
      
      // Clear message timeouts
      const messageTimeouts = messageTimeoutRef.current;
      messageTimeouts.forEach(timeoutId => {
        clearTimeout(timeoutId);
      });
      messageTimeouts.clear();
      
      // Stop typing
      try {
        stopTyping();
      } catch (error) {
        console.warn('[Chat] Error during typing cleanup:', error);
      }
      
      // Disconnect WebSocket only if not in strict mode transition
      const wsManager = websocketRef.current;
      if (wsManager && wsManager.disconnect && !strictModeCleanupRef.current) {
        console.log('🔌 [Chat] Disconnecting WebSocket due to component cleanup');
        wsManager.disconnect();
      } else if (strictModeCleanupRef.current) {
        console.log('⚠️ [StrictMode] Skipping WebSocket disconnect during strict mode cleanup');
      }
    }
  }, [stopTyping]);
  
  // Memoized return value
  return useMemo(() => ({
    // Connection state
    connectionState,
    isConnected: connectionState === CHAT_STATES.CONNECTED,
    isReady: connectionState === CHAT_STATES.READY && isConnectionReady,
    isConnecting: connectionState === CHAT_STATES.CONNECTING,
    isReconnecting: connectionState === CHAT_STATES.RECONNECTING,
    hasConnectionError: connectionState === CHAT_STATES.ERROR,
    
    // Chat data
    currentChat,
    messages,
    isLoading,
    error,
    
    // Typing indicators
    isTyping,
    typingUsers,
    
    // Performance metrics
    performanceMetrics,
    
    // Actions
    initializeChat,
    sendMessage,
    startTyping,
    stopTyping,
    clearMessages,
    retryMessage,
    disconnect,
    
    // Utilities
    sessionData,
    messageCount: messages.length,
    lastMessage: messages[messages.length - 1] || null,
    hasErrors: error !== null,
    canSendMessage: canSendMessages && !isLoading,
    
    // Platform state
    initializationStatus,
    canSendMessages,
    
    // Streaming state
    streamingResponse
  }), [
    connectionState,
    currentChat,
    messages,
    isLoading,
    error,
    isTyping,
    typingUsers,
    performanceMetrics,
    initializeChat,
    sendMessage,
    startTyping,
    stopTyping,
    clearMessages,
    retryMessage,
    disconnect,
    sessionData,
    isConnectionReady,
    canSendMessages,
    initializationStatus,
    streamingResponse
  ]);
};

export default useChat;