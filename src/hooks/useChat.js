// src/hooks/useChat.js
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import MIPTechApiClient from '../services/miptechApi';
import MIPTechWebSocketManager from '../services/websocketManager';
import { sessionManager } from '../services/sessionManager';
import { performanceMonitor } from '../services/performanceMonitor';
import useDebouncedTyping from './useDebouncedTyping';
import { getMessageRegistry } from '../utils/MessageRegistry';
import eventNormalizer from '../utils/eventNormalizer';
import logger from '../utils/logger';
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
  RECEIVED: 'received',
  STREAMING: 'streaming'  // ✅ FE-05: Add streaming status for live responses
};

/**
 * Chat connection states
 */
export const CHAT_STATES = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  READY: 'ready',
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
  
  // Core state with debug logging
  const [connectionState, setConnectionState] = useState(CHAT_STATES.DISCONNECTED);
  const [isConnectionReady, setIsConnectionReady] = useState(false);

  // ✅ CRITICAL FIX: Handler registration readiness flag
  const [handlersRegistered, setHandlersRegistered] = useState(false);
  
  // ✅ DEBUG: Track state changes for troubleshooting
  const debugSetConnectionState = useCallback((newState) => {
    if (process.env.NODE_ENV === 'development') {
      logger.debug('STATE: connectionState change:', {
        from: connectionState,
        to: newState,
        timestamp: new Date().toISOString()
      });
    }
    setConnectionState(newState);
  }, [connectionState]);
  
  const debugSetIsConnectionReady = useCallback((newValue) => {
    if (process.env.NODE_ENV === 'development') {
      logger.debug('STATE: isConnectionReady change:', {
        from: isConnectionReady,
        to: newValue,
        timestamp: new Date().toISOString()
      });
    }
    setIsConnectionReady(newValue);
  }, [isConnectionReady]);
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
  
  // AI Processing state
  const [aiProcessingState, setAiProcessingState] = useState({
    isProcessing: false,
    messageId: null,
    startTime: null,
    processingTimeout: null
  });
  
  // Enhanced error state
  const [errorState, setErrorState] = useState({
    connectionError: null,
    processingError: null,
    validationError: null,
    rateLimitError: null
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
  
  // ✅ FE-04: Message registry for graceful missing-ID fallback
  const messageRegistryRef = useRef(getMessageRegistry({
    enablePerformanceTracking: chatConfig.enablePerformanceTracking,
    debug: process.env.NODE_ENV === 'development' && process.env.REACT_APP_DEBUG_MESSAGES === 'true'
  }));
  const typingTimeoutRef = useRef(null);
  const messageTimeoutRef = useRef(new Map());
  const connectionTimeoutRef = useRef(null);
  const processingTimeoutRef = useRef(null);
  const retryCountRef = useRef(0);
  const isUnmountedRef = useRef(false);
  
  // ✅ FIX: Deduplication refs to prevent duplicate message handling
  const processedEventsRef = useRef(new Set());
  const lastResponseDataRef = useRef(null);
  
  // ✅ FE-01: Event normalization
  const eventNormalizerRef = useRef(eventNormalizer);
  
  // ✅ FE-02: WebSocket event deduplication
  const wsEventsRef = useRef(new Set());
  
  // ✅ FE-03: Typing handler reference
  const typingHandlerRef = useRef(null);
  
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
  const mountCountRef = useRef(0);  // Track mount count for StrictMode detection
  
  // Streaming buffer management refs
  const chunkBufferRef = useRef({});
  const chunkTimeoutRef = useRef({});
  const bufferExpiryRef = useRef({});
  
  // Memoized session data
  const sessionData = useMemo(() => {
    return sessionRef.current.getSession();
  }, []);
  
  // ✅ CRITICAL DEBUG: Enhanced environment and WebSocket manager startup logging
  useEffect(() => {
    const debugInfo = {
      environment: process.env.NODE_ENV,
      strictModeActive: isStrictModeRef.current,
      mountCount: mountCountRef.current,
      timestamp: new Date().toISOString()
    };
    
    logger.debug('DEBUG: Enhanced startup check:', debugInfo);
    logger.debug('ENV: Environment variables:');
    logger.debug('  - REACT_APP_MIPTECH_WS_URL:', process.env.REACT_APP_MIPTECH_WS_URL);
    logger.debug('  - REACT_APP_MIPTECH_TENANT_ID:', process.env.REACT_APP_MIPTECH_TENANT_ID);
    logger.debug('  - NODE_ENV:', process.env.NODE_ENV);
    logger.debug('  - React StrictMode likely active:', process.env.NODE_ENV === 'development');
    
    logger.debug('DEBUG: WebSocket manager status:');
    logger.debug('  - websocketRef exists:', !!websocketRef.current);
    logger.debug('  - constructor name:', websocketRef.current?.constructor?.name);
    logger.debug('  - connect method type:', typeof websocketRef.current?.connect);
    logger.debug('  - disconnect method type:', typeof websocketRef.current?.disconnect);
    
    if (!websocketRef.current) {
      logger.error('CRITICAL: WebSocket manager is NULL at startup!', {
        ...debugInfo,
        potentialCause: 'Initialization order issue or import failure'
      });
    } else {
      logger.debug('DEBUG: WebSocket manager properly initialized');
    }
  }, []);

  // ✅ CRITICAL FIX: React Strict Mode connection management
  useEffect(() => {
    mountCountRef.current += 1;
    logger.debug(`🔄 [StrictMode] Component mounted/remounted (count: ${mountCountRef.current})`);
    logger.debug('StrictMode: isUnmountedRef.current before reset:', isUnmountedRef.current);
    
    // Enhanced React Strict Mode detection
    if (isUnmountedRef.current === true) {
      logger.debug('StrictMode: React Strict Mode detected - component remounting after unmount');
      isStrictModeRef.current = true;
      strictModeCleanupRef.current = false;
      
      // Additional validation for StrictMode detection
      if (process.env.NODE_ENV === 'development') {
        logger.debug(`🔍 [StrictMode] Development mode confirmed - StrictMode handling enabled (mount #${mountCountRef.current})`);
      }
    }
    
    // In development, multiple rapid mounts suggest StrictMode
    if (process.env.NODE_ENV === 'development' && mountCountRef.current > 1) {
      isStrictModeRef.current = true;
      logger.debug(`🔍 [StrictMode] Multiple mounts detected (${mountCountRef.current}) - StrictMode likely active`);
    }
    
    // Reset all refs to clean state on mount
    isUnmountedRef.current = false;
    componentMountedRef.current = true;
    isInitializingRef.current = false;
    initializationPromiseRef.current = null;
    
    logger.debug('StrictMode: Component mount state reset complete:', {
      isUnmounted: isUnmountedRef.current,
      componentMounted: componentMountedRef.current,
      mountCount: mountCountRef.current
    });
    
    // Clear any pending strict mode cleanup
    if (wsCleanupTimeoutRef.current) {
      clearTimeout(wsCleanupTimeoutRef.current);
      wsCleanupTimeoutRef.current = null;
      logger.debug('StrictMode: Cancelled pending WebSocket cleanup');
    }
    
    logger.debug('StrictMode: Component state reset - isUnmountedRef:', isUnmountedRef.current);
    
    return () => {
      logger.debug('StrictMode: Component cleanup triggered');
      componentMountedRef.current = false;
      
      // In React Strict Mode, delay actual cleanup to prevent premature disconnection
      if (process.env.NODE_ENV === 'development') {
        logger.debug('StrictMode: Delaying cleanup for React Strict Mode (1500ms)...');
        strictModeCleanupRef.current = true;
        
        wsCleanupTimeoutRef.current = setTimeout(() => {
          if (strictModeCleanupRef.current && !componentMountedRef.current) {
            logger.debug('StrictMode: Executing delayed cleanup - component truly unmounting');
            isUnmountedRef.current = true;
          } else {
            logger.debug('StrictMode: Component remounted - skipping cleanup');
          }
        }, 1500);
      } else {
        // In production, cleanup immediately
        logger.debug('Production: Immediate cleanup');
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

  // ✅ REMOVED: waitForPlatformReady function - not needed for WebSocket-only mode
  // Platform readiness will be handled through WebSocket events

  // ✅ REMOVED: createChatSession function - no longer needed for WebSocket-only mode
  // Chat creation now happens through WebSocket join_chat message

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
      logger.warn('[Chat] Failed to load chat history:', error);
    }
  }, [mergeMessageHistory]);

  /**
   * Connect to WebSocket
   */
  const connectWebSocket = useCallback(async (chatId) => {
    logger.debug(`🔌 [WebSocket] === connectWebSocket START with chatId: ${chatId} ===`);
    
    // CRITICAL: Check if WebSocket manager exists
    logger.debug('WebSocket: websocketRef.current:', websocketRef.current);
    logger.debug('WebSocket: typeof websocketRef.current:', typeof websocketRef.current);
    
    if (!websocketRef.current) {
      logger.error('WebSocket: CRITICAL ERROR: WebSocket manager is NULL!');
      throw new Error('WebSocket manager not initialized');
    }
    
    // Check connect method exists
    logger.debug('WebSocket: connect method type:', typeof websocketRef.current.connect);
    
    try {
      if (chatConfig.enablePerformanceTracking) {
        performanceRef.current.startTimer('websocket_connection');
        logger.debug('WebSocket: Performance tracking started');
      }
      
      logger.debug('WebSocket: Calling websocketRef.current.connect() with chatId...');
      await websocketRef.current.connect(chatId);
      logger.debug('WebSocket: WebSocket connection established successfully');
      
      if (chatConfig.enablePerformanceTracking) {
        const duration = performanceRef.current.endTimer('websocket_connection');
        performanceRef.current.trackWebSocketConnection('connected', duration?.duration);
        logger.debug('WebSocket: Performance tracking completed:', duration);
      }
      
      logger.debug('WebSocket: === connectWebSocket SUCCESS ===');
      
    } catch (error) {
      logger.error('WebSocket: === connectWebSocket ERROR ===');
      logger.error('WebSocket: WebSocket connection failed:', error);
      logger.error('WebSocket: Error details:', {
        message: error.message,
        name: error.name,
        type: error.type,
        chatId
      });
      const wsError = handleWebSocketError(error, { chatId });
      setError(wsError);
      throw wsError;
    }
  }, [chatConfig.enablePerformanceTracking]);


  // ✅ REMOVED: fetchChatToken function - no JWT tokens needed for WebSocket-only mode

  /**
   * Initialize chat connection
   */
  const initializeChat = useCallback(async (options = {}) => {
    logger.debug('DEBUG: === initializeChat START ===');
    logger.debug('DEBUG: initializeChat called with options:', options);
    logger.debug('DEBUG: isUnmountedRef.current (before reset):', isUnmountedRef.current);
    logger.debug('DEBUG: isInitializingRef.current:', isInitializingRef.current);
    logger.debug('DEBUG: initializationPromiseRef.current:', initializationPromiseRef.current);
    
    // ✅ CRITICAL FIX: Reset unmounted state when explicitly initializing
    // This handles the case where React cleanup runs but component remounts
    isUnmountedRef.current = false;
    logger.debug('DEBUG: FORCED isUnmountedRef.current to false');
    
    // Enhanced unmount checking with StrictMode awareness
    if (isUnmountedRef.current && !isStrictModeRef.current && process.env.NODE_ENV !== 'development') {
      logger.debug('DEBUG: Component unmounted in initializeChat - early return (production)');
      return;
    }
    
    // Allow connection if StrictMode detected or in development (component remounting)
    if (isUnmountedRef.current && (isStrictModeRef.current || process.env.NODE_ENV === 'development')) {
      logger.debug('StrictMode/Dev: Allowing connection despite unmounted state (StrictMode/development remount)');
    }
    
    // ✅ Phase 4: Prevent multiple simultaneous initialization calls (React StrictMode fix)
    if (isInitializingRef.current) {
      logger.debug('DEBUG: Initialization already in progress, waiting...');
      logger.debug('DEBUG: Returning cached promise:', initializationPromiseRef.current);
      return initializationPromiseRef.current;
    }
    
    logger.debug('DEBUG: Starting new initialization...');
    isInitializingRef.current = true;
    
    try {
      logger.debug('DEBUG: About to call performInitializationInternal...');
      try {
        initializationPromiseRef.current = performInitializationInternal(options);
        logger.debug('DEBUG: performInitializationInternal assigned to promise ref');
      } catch (syncError) {
        logger.error('TRACE: Synchronous error creating promise:', syncError);
        throw syncError;
      }
      
      const result = await initializationPromiseRef.current;
      logger.debug('DEBUG: performInitializationInternal completed successfully:', result);
      logger.debug('DEBUG: === initializeChat SUCCESS ===');
      return result;
    } catch (error) {
      logger.error('DEBUG: === initializeChat ERROR ===');
      logger.error('DEBUG: Error in initializeChat:', error);
      logger.error('DEBUG: Error name:', error.name);
      logger.error('DEBUG: Error message:', error.message);
      logger.error('DEBUG: Error type:', error.type);
      logger.error('DEBUG: Error status:', error.status);
      logger.error('DEBUG: Error endpoint:', error.endpoint);
      logger.error('DEBUG: Error stack:', error.stack);
      throw error;
    } finally {
      logger.debug('DEBUG: === initializeChat FINALLY - Resetting initialization flags ===');
      isInitializingRef.current = false;
      initializationPromiseRef.current = null;
    }
  }, []);
  
  /**
   * Internal initialization function
   */
  const performInitializationInternal = useCallback(async (options = {}) => {
    logger.debug('TRACE: performInitializationInternal ENTERED');
    const startTime = Date.now();
    logger.debug('INIT: === performInitializationInternal START ===', new Date().toISOString());
    logger.debug('INIT: Environment:', {
      NODE_ENV: process.env.NODE_ENV,
      isUnmountedRef: isUnmountedRef.current,
      isStrictModeRef: isStrictModeRef.current,
      componentMounted: componentMountedRef.current,
      options,
      timestamp: new Date().toISOString()
    });
    
    // Enhanced unmount checking with development mode awareness  
    if (isUnmountedRef.current && !isStrictModeRef.current && process.env.NODE_ENV !== 'development') {
      logger.debug('INIT: Component unmounted - early return (production only)');
      return;
    }
    
    if (isUnmountedRef.current && (isStrictModeRef.current || process.env.NODE_ENV === 'development')) {
      logger.debug('INIT: Component unmounted but allowing due to StrictMode/development mode');
    }
    
    logger.debug('INIT: Starting WebSocket connection process');
    
    try {
      logger.debug('INIT: Step 0: Setting initial state');
      setIsLoading(true);
      setError(null);
      debugSetConnectionState(CHAT_STATES.CONNECTING);
      
      logger.debug('INIT: Connection state set to CONNECTING');
      
      // Start performance tracking
      if (chatConfig.enablePerformanceTracking) {
        performanceRef.current.startTimer('chat_initialization');
        logger.debug('INIT: Performance tracking started');
      }
      
      // WebSocket-Only Mode: Direct connection without REST API
      logger.debug('INIT: STEP 1: Direct WebSocket connection (no REST API needed)');

      // Create minimal chat placeholder that will be replaced when chat_created is received
      const tenantId = process.env.REACT_APP_MIPTECH_TENANT_ID || 'miptech-company';
      const chat = {
        id: null, // Will be set from chat_created event
        tenant_id: tenantId,
        title: options.title || 'Website Chat',
        created_at: new Date().toISOString()
      };

      logger.debug('INIT: Chat placeholder prepared:', {
        tenantId: chat.tenant_id,
        title: chat.title,
        timestamp: chat.created_at
      });

      // Check if component is still mounted before proceeding
      if (isUnmountedRef.current && !isStrictModeRef.current && process.env.NODE_ENV !== 'development') {
        logger.debug('INIT: Component unmounted before WebSocket setup - early return (production only)');
        return;
      }
      if (isUnmountedRef.current && (isStrictModeRef.current || process.env.NODE_ENV === 'development')) {
        logger.debug('INIT: Component unmounted before WebSocket setup but allowing due to StrictMode/development');
      }

      setCurrentChat(chat);
      logger.debug('INIT: Chat placeholder stored in state');

      // Connect WebSocket directly - no chat_id needed upfront
      logger.debug('INIT: STEP 2: connectWebSocket() - Direct WebSocket connection');

      try {
        await connectWebSocket(); // No chatId parameter needed
        logger.debug('INIT: STEP 2 COMPLETED: WebSocket connection successful');
        setError(null); // Clear any previous errors
      } catch (wsError) {
        logger.error('INIT: WebSocket connection failed:', wsError);
        setError(new Error(`WebSocket connection failed: ${wsError.message}`));
        // Don't throw - let user see the error but don't crash
      }
      
      // Track performance
      if (chatConfig.enablePerformanceTracking) {
        const duration = performanceRef.current.endTimer('chat_initialization');
        performanceRef.current.trackChatWidget('initialized', duration?.duration);
        logger.debug('INIT: Performance tracking completed:', duration);
      }
      
      debugSetConnectionState(CHAT_STATES.CONNECTED);
      logger.debug('INIT: Connection state set to CONNECTED');
      
      // Set connection timeout (10 seconds for ready state)
      connectionTimeoutRef.current = setTimeout(() => {
        // ✅ FIX: Check if timeout was cleared (meaning connection_ready was received)
        if (connectionTimeoutRef.current === null) {
          logger.debug('INIT: Connection timeout was cleared - connection_ready received');
          return;
        }
        
        if (!isUnmountedRef.current) {
          logger.warn('INIT: Connection ready timeout - platform did not signal ready state within 10 seconds');
          setError(new MIPTechError(
            'Connection ready timeout - platform may be overloaded',
            ERROR_TYPES.WEBSOCKET,
            ERROR_SEVERITY.MEDIUM,
            { timeout: 10000 }
          ));
          debugSetConnectionState(CHAT_STATES.FAILED);
          
          // Clear the timeout ref since we're handling the timeout
          connectionTimeoutRef.current = null;
        }
      }, 10000);
      
      retryCountRef.current = 0;
      
      const totalDuration = Date.now() - startTime;
      logger.debug(`✅ [INIT] === Initialization COMPLETED in ${totalDuration}ms ===`);
      
      return chat;
      
    } catch (err) {
      const totalDuration = Date.now() - startTime;
      logger.error(`❌ [INIT] Error in performInitializationInternal after ${totalDuration}ms:`, err);
      logger.error('INIT: Error stack:', err.stack);
      logger.error('INIT: Error details:', {
        message: err.message,
        name: err.name,
        type: err.type,
        status: err.status,
        endpoint: err.endpoint
      });
      
      if (isUnmountedRef.current) {
        logger.debug('INIT: Component unmounted during error handling');
        return;
      }
      
      const chatError = handleApiError(err, { 
        action: 'initializeChat',
        options 
      });
      
      logger.debug('INIT: Setting error state:', chatError.message);
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
    
    // ✅ FE-04: Let MessageRegistry handle ID generation and tracking
    const sanitizedContent = sanitizeInput(trimmedContent);
    let messageId = null; // Declare outside try block for catch block access
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Create message without ID - let MessageRegistry generate temp ID
      const userMessage = {
        content: sanitizedContent,
        role: 'user',
        timestamp: new Date().toISOString(),
        status: MESSAGE_STATUS.SENDING,
        metadata: options.metadata || {}
      };
      
      // ✅ FE-04: Register message with fallback ID handling
      const messageRecord = messageRegistryRef.current.registerMessage(userMessage, {
        chatId: currentChat.id,
        originalContent: trimmedContent,
        clientSide: true
      });
      
      // Use the record's message with assigned ID
      const trackedMessage = messageRecord.message;
      messageId = trackedMessage.id; // Assign to pre-declared variable
      
      // Start performance tracking with actual message ID
      if (chatConfig.enablePerformanceTracking) {
        performanceRef.current.startTimer(`message_${messageId}`);
      }
      
      // Update registry state to SENDING
      messageRegistryRef.current.updateMessageState(messageId, 'sending');
      
      // Add message to UI immediately
      setMessages(prev => [...prev, trackedMessage]);
      
      // Persist message locally
      if (chatConfig.enablePersistence) {
        sessionRef.current.addChatMessage(userMessage);
      }
      
      // Set message timeout with registry integration
      const timeoutId = setTimeout(() => {
        // ✅ FE-04: Update registry state on timeout
        messageRegistryRef.current.updateMessageState(messageId, 'failed', {
          reason: 'timeout',
          timeoutMs: chatConfig.messageTimeout
        });
        
        setMessages(prev => prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, status: MESSAGE_STATUS.FAILED }
            : msg
        ));
      }, chatConfig.messageTimeout);
      
      messageTimeoutRef.current.set(messageId, timeoutId);
      
      // Send via WebSocket only - no REST API (stream: true is set by default in WebSocket manager)
      websocketRef.current.sendChatMessage(sanitizedContent);

      if (isUnmountedRef.current) return;

      // Clear timeout when message is queued/sent via WebSocket
      clearTimeout(timeoutId);
      messageTimeoutRef.current.delete(messageId);

      // Update message registry state to 'sent' (will be updated to 'received' when message_received event arrives)
      messageRegistryRef.current.updateMessageState(messageId, 'sent');

      // Update UI to show message as sent
      setMessages(prev => prev.map(msg =>
        msg.id === messageId
          ? { ...msg, status: MESSAGE_STATUS.SENT }
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
          status: MESSAGE_STATUS.SENT
        });
      }

      return { success: true, messageId };
      
    } catch (err) {
      if (isUnmountedRef.current) return;
      
      // Clear timeout (only if messageId was set)
      if (messageId) {
        const timeoutId = messageTimeoutRef.current.get(messageId);
        if (timeoutId) {
          clearTimeout(timeoutId);
          messageTimeoutRef.current.delete(messageId);
        }
      }
      
      const chatError = handleApiError(err, {
        action: 'sendMessage',
        messageId,
        content: sanitizedContent
      });
      
      setError(chatError);
      
      // Update message status (only if messageId was set)
      if (messageId) {
        setMessages(prev => prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, status: MESSAGE_STATUS.FAILED, error: chatError }
            : msg
        ));
      }
      
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
   * ✅ FE-03: Throttled typing indicators with useDebouncedTyping hook
   * Reduces typing events by >90% while maintaining responsive UX
   */
  
  // Raw typing handlers (without throttling)
  const handleRawTypingStart = useCallback(() => {
    if (!currentChat || !chatConfig.enableTypingIndicator || !isConnectionReady) return;
    
    try {
      websocketRef.current.sendTypingStart(currentChat.id);
      if (chatConfig.enablePerformanceTracking) {
        performanceRef.current.trackChatWidget('typing_start');
      }
    } catch (error) {
      logger.error('[Chat] Error sending typing_start:', error);
    }
  }, [currentChat, chatConfig.enableTypingIndicator, isConnectionReady, chatConfig.enablePerformanceTracking]);

  const handleRawTypingStop = useCallback(() => {
    if (!currentChat || !chatConfig.enableTypingIndicator || !isConnectionReady) return;
    
    try {
      websocketRef.current.sendTypingStop(currentChat.id);
      if (chatConfig.enablePerformanceTracking) {
        performanceRef.current.trackChatWidget('typing_stop');
      }
    } catch (error) {
      logger.error('[Chat] Error sending typing_stop:', error);
    }
  }, [currentChat, chatConfig.enableTypingIndicator, isConnectionReady, chatConfig.enablePerformanceTracking]);

  // Throttled typing hook
  const debouncedTyping = useDebouncedTyping({
    onTypingStart: handleRawTypingStart,
    onTypingStop: handleRawTypingStop,
    throttleMs: 2000, // Max 1 event per 2 seconds
    stopDelayMs: chatConfig.typingTimeout || 3000,
    enabled: chatConfig.enableTypingIndicator && !!currentChat && isConnectionReady,
    debug: process.env.NODE_ENV === 'development' && process.env.REACT_APP_DEBUG_TYPING === 'true'
  });

  // ✅ FE-03: Set typing handler reference for streaming handlers to use
  typingHandlerRef.current = debouncedTyping;

  // Public interface - uses throttled version
  const startTyping = useCallback(() => {
    setIsTyping(true);
    debouncedTyping.startTyping();
  }, [debouncedTyping]);

  const stopTyping = useCallback(() => {
    setIsTyping(false);
    debouncedTyping.stopTyping();
  }, [debouncedTyping]);

  // Force stop for cleanup scenarios
  const forceStopTyping = useCallback(() => {
    setIsTyping(false);
    debouncedTyping.forceStopTyping();
  }, [debouncedTyping]);
  
  
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
      logger.error('[Chat] Failed to retry message:', error);
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

  // ✅ REMOVED: retryChatCreation function - not needed for WebSocket-only mode
  // Chat creation is handled automatically through WebSocket protocol
  
  /**
   * WebSocket event handlers
   */
  
  // ✅ CRITICAL: Register essential WebSocket handlers
  useEffect(() => {
    // ✅ CRITICAL FIX: Register ALL handlers BEFORE any connection attempt
    logger.debug('🎯 [Chat] Registering WebSocket handlers BEFORE connect()');

    const wsManager = websocketRef.current;

    if (!wsManager) {
      logger.error('Chat: WebSocket manager is null/undefined, cannot register handlers');
      return;
    }

    logger.debug('Chat: WebSocket manager exists, registering critical handlers');
    
    // ✅ CRITICAL: connected handler - sets isConnected correctly  
    const handleConnected = () => {
      // ✅ CRITICAL FIX: Less aggressive guard for connected - this sets connection state
      if (isUnmountedRef.current && !isStrictModeRef.current && process.env.NODE_ENV !== 'development') {
        logger.warn('Chat: Skipping connected due to component unmount (production only)');
        return;
      }

      // Allow connected in development and StrictMode scenarios
      if (isUnmountedRef.current && (isStrictModeRef.current || process.env.NODE_ENV === 'development')) {
        logger.debug('Chat: Processing connected despite unmount (StrictMode/Development)');
      }
      logger.debug('Chat: Connected handler - WebSocket connection established');
      debugSetConnectionState(CHAT_STATES.CONNECTED);
      setError(null);
    };

    // ✅ CRITICAL FIX: connection_established handler - eliminates warning and handles client_id
    const handleConnectionEstablished = (data) => {
      // ✅ CRITICAL FIX: Less aggressive guard for connection_established
      if (isUnmountedRef.current && !isStrictModeRef.current && process.env.NODE_ENV !== 'development') {
        logger.warn('Chat: Skipping connection_established due to component unmount (production only)');
        return;
      }

      // Allow connection_established in development and StrictMode scenarios
      if (isUnmountedRef.current && (isStrictModeRef.current || process.env.NODE_ENV === 'development')) {
        logger.debug('Chat: Processing connection_established despite unmount (StrictMode/Development)');
      }

      logger.debug('Chat: Connection established - WebSocket ready', {
        clientId: data.data?.client_id,
        hasData: !!data.data,
        timestamp: new Date().toISOString()
      });

      // Store server-assigned client ID if provided
      if (data.data?.client_id && websocketRef.current) {
        websocketRef.current.serverClientId = data.data.client_id;
        logger.debug('Chat: Stored server client ID:', data.data.client_id);
      }

      if (chatConfig.enablePerformanceTracking) {
        performanceRef.current.trackChatWidget('connection_established');
      }
    };
    
    // ✅ CRITICAL: connection_ready handler - makes chat go from "connected" to "ready"
    const handleConnectionReady = (data) => {
      // ✅ CRITICAL FIX: Less aggressive guard for connection_ready - this is essential for chat functionality
      if (isUnmountedRef.current && !isStrictModeRef.current && process.env.NODE_ENV !== 'development') {
        logger.warn('Chat: Skipping connection_ready due to component unmount (production only)');
        return;
      }
      
      // Allow connection_ready in development and StrictMode scenarios
      if (isUnmountedRef.current && (isStrictModeRef.current || process.env.NODE_ENV === 'development')) {
        logger.debug('Chat: Processing connection_ready despite unmount (StrictMode/Development)');
      }
      
      logger.debug('Chat: Connection ready handler - Platform ready for messages', data);
      debugSetIsConnectionReady(true);
      setCanSendMessages(true);
      debugSetConnectionState(CHAT_STATES.READY);
      setIsLoading(false); // ✅ CRITICAL: Stop loading so textarea gets enabled
      setError(null);
      
      // ✅ CRITICAL FIX: Clear connection timeout since we received connection_ready
      if (connectionTimeoutRef.current) {
        logger.debug('Chat: Clearing connection timeout - platform is ready');
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
      
      logger.debug('Chat: State after connection_ready:', {
        isConnectionReady: true,
        canSendMessages: true,
        connectionState: 'ready',
        isLoading: false,
        timeoutCleared: true,
        timestamp: new Date().toISOString()
      });
      
      if (chatConfig.enablePerformanceTracking) {
        performanceRef.current.trackChatWidget('connection_ready');
      }
    };
    
    // ✅ CRITICAL: ready handler (legacy compatibility) 
    const handleReady = (data) => {
      // ✅ CRITICAL FIX: Less aggressive guard for ready - this is essential for legacy compatibility
      if (isUnmountedRef.current && !isStrictModeRef.current && process.env.NODE_ENV !== 'development') {
        logger.warn('Chat: Skipping ready due to component unmount (production only)');
        return;
      }
      
      // Allow ready in development and StrictMode scenarios
      if (isUnmountedRef.current && (isStrictModeRef.current || process.env.NODE_ENV === 'development')) {
        logger.debug('Chat: Processing ready despite unmount (StrictMode/Development)');
      }
      logger.debug('[Chat] Legacy ready signal received - delegating to unified handler');
      handleConnectionReady(data);
    };
    
    // ✅ CRITICAL: initialization progress handler
    const handleInitializationProgress = (data) => {
      // ✅ CRITICAL FIX: Less aggressive guard for initialization progress
      if (isUnmountedRef.current && !isStrictModeRef.current && process.env.NODE_ENV !== 'development') {
        logger.warn('Chat: Skipping initializationProgress due to component unmount (production only)');
        return;
      }
      
      // Allow initializationProgress in development and StrictMode scenarios
      if (isUnmountedRef.current && (isStrictModeRef.current || process.env.NODE_ENV === 'development')) {
        logger.debug('Chat: Processing initializationProgress despite unmount (StrictMode/Development)');
      }
      logger.debug(`⏳ [Chat] Platform initializing: ${data.phase || 'unknown'} - ${data.message || 'Initializing services'}`);
      setInitializationStatus(data);
    };
    
    // ✅ CRITICAL: response_complete handler - displays AI responses
    const handleResponseComplete = (data) => {
      // ✅ DEBUG: FIRST LOG - Handler entry point
      logger.debug('DEBUG: handleResponseComplete ENTRY POINT - Handler called!', {
        timestamp: Date.now(),
        hasData: !!data,
        handlerConfirmation: 'HANDLER_DEFINITELY_CALLED'
      });
      
      // ✅ DEBUG: Check unmount state
      logger.debug('DEBUG: Checking unmount state:', {
        isUnmountedRef: isUnmountedRef.current,
        willReturn: !!isUnmountedRef.current,
        timestamp: Date.now()
      });
      
      // ✅ TEMPORARILY DISABLE GUARD to debug
      // if (isUnmountedRef.current) return;
      
      logger.debug('Chat: AI response completed - displaying message:', {
        messageId: data.messageId || data.data?.message_id,
        content: data.data?.content?.substring(0, 100) + '...',
        hasContent: !!data.data?.content,
        timestamp: new Date().toISOString()
      });
      
      try {
        logger.debug('DEBUG: Entering try block - extracting data');
        
        // Extract message data from the response
        const messageId = data.messageId || data.data?.message_id;
        // Use buffered content if available, otherwise use content from the message
        const finalContent = data.data?.content || data.data?.message || chunkBufferRef.current?.[messageId] || '';
        
        logger.debug('DEBUG: Extracted data:', {
          messageId,
          content: finalContent.substring(0, 50) + '...',
          hasMessageId: !!messageId,
          hasContent: !!finalContent,
          hadBufferedContent: !!chunkBufferRef.current?.[messageId],
          dataStructure: Object.keys(data),
          dataDataStructure: data.data ? Object.keys(data.data) : null
        });
        
        if (!messageId || !finalContent) {
          logger.warn('Chat: Missing messageId or content in response_complete:', {
            messageId, 
            hasContent: !!finalContent,
            data: data.data
          });
          return;
        }
        
        // Clear all timers and buffers for this message
        clearTimeout(bufferExpiryRef.current?.[messageId]);
        clearTimeout(chunkTimeoutRef.current?.[messageId]);
        delete chunkBufferRef.current?.[messageId];
        delete chunkTimeoutRef.current?.[messageId];
        delete bufferExpiryRef.current?.[messageId];
        
        logger.debug('DEBUG: Data validation passed - proceeding with message update');
        
        // Update the message in state from loading to completed
        setMessages(currentMessages => {
          const updatedMessages = currentMessages.map(msg => {
            // Find the temporary message and replace it with the AI response
            if (msg.role === 'assistant' && (msg.id === messageId || msg.status === MESSAGE_STATUS.SENDING)) {
              return {
                ...msg,
                id: messageId,
                content: sanitizeInput(finalContent),
                status: MESSAGE_STATUS.RECEIVED,
                timestamp: data.data?.created_at ? new Date(data.data.created_at * 1000).toISOString() : new Date().toISOString(),
                metadata: {
                  ...msg.metadata,
                  streaming: false,
                  llm_model: data.data?.llm_model,
                  response_time_ms: data.data?.response_time_ms,
                  total_tokens: data.data?.total_tokens
                }
              };
            }
            return msg;
          });
          
          // If we didn't find an existing message, add the AI response
          const hasAiMessage = updatedMessages.some(msg => msg.id === messageId);
          if (!hasAiMessage) {
            updatedMessages.push({
              id: messageId,
              content: sanitizeInput(finalContent),
              role: 'assistant',
              status: MESSAGE_STATUS.RECEIVED,
              timestamp: data.data?.created_at ? new Date(data.data.created_at * 1000).toISOString() : new Date().toISOString(),
              metadata: {
                streaming: false,
                llm_model: data.data?.llm_model,
                response_time_ms: data.data?.response_time_ms,
                total_tokens: data.data?.total_tokens
              }
            });
          }
          
          return updatedMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        });
        
        // Stop loading and re-enable input
        setIsLoading(false);
        setCanSendMessages(true);
        
        logger.debug('Chat: AI response successfully displayed');
        
      } catch (error) {
        logger.error('DEBUG: CRITICAL ERROR in handleResponseComplete:', {
          error: error.message,
          stack: error.stack,
          timestamp: Date.now(),
          handlerPhase: 'response_complete_processing'
        });
        setIsLoading(false);
        setCanSendMessages(true);
      }
      
      logger.debug('DEBUG: handleResponseComplete COMPLETED - End of handler');
    };
    
    // ✅ CRITICAL: message_received handler - confirms message receipt  
    const handleMessageReceived = (data) => {
      // ✅ CRITICAL FIX: Less aggressive guard for message_received - this is essential for user message confirmation
      if (isUnmountedRef.current && !isStrictModeRef.current && process.env.NODE_ENV !== 'development') {
        logger.warn('Chat: Skipping message_received due to component unmount (production only)');
        return;
      }
      
      // Allow message_received in development and StrictMode scenarios
      if (isUnmountedRef.current && (isStrictModeRef.current || process.env.NODE_ENV === 'development')) {
        logger.debug('Chat: Processing message_received despite unmount (StrictMode/Development)');
      }
      
      logger.debug('DEBUG: handleMessageReceived ENTRY POINT:', {
        messageId: data.messageId,
        hasData: !!data,
        dataStructure: Object.keys(data),
        timestamp: new Date().toISOString()
      });
      
      try {
        const serverMessageId = data.messageId;
        
        logger.debug('DEBUG: Looking for user message to update:', {
          serverMessageId,
          searchingForStatus: 'SENDING',
          timestamp: Date.now()
        });
        
        // Update the user message from SENDING to RECEIVED
        setMessages(currentMessages => {
          logger.debug('DEBUG: Current messages before update:', {
            totalMessages: currentMessages.length,
            messageStatuses: currentMessages.map(msg => ({
              id: msg.id,
              role: msg.role,
              status: msg.status,
              tempId: msg.metadata?.temp_id
            }))
          });
          
          const updatedMessages = currentMessages.map(msg => {
            // Find the user message that's still in SENDING status
            if (msg.role === 'user' && msg.status === MESSAGE_STATUS.SENDING) {
              logger.debug('DEBUG: Found user message to update:', {
                oldId: msg.id,
                newId: serverMessageId,
                tempId: msg.metadata?.temp_id,
                status: 'SENDING -> RECEIVED'
              });
              
              return {
                ...msg,
                id: serverMessageId, // Update to server ID
                status: MESSAGE_STATUS.RECEIVED,
                metadata: {
                  ...msg.metadata,
                  server_id: serverMessageId,
                  confirmed_at: new Date().toISOString()
                }
              };
            }
            return msg;
          });
          
          const wasUpdated = updatedMessages.some(msg => 
            msg.id === serverMessageId && msg.role === 'user' && msg.status === MESSAGE_STATUS.RECEIVED
          );
          
          logger.debug('DEBUG: Message update result:', {
            wasUpdated,
            totalMessages: updatedMessages.length,
            updatedStatuses: updatedMessages.map(msg => ({
              id: msg.id,
              role: msg.role,
              status: msg.status
            }))
          });
          
          return updatedMessages;
        });
        
        logger.debug('DEBUG: User message confirmed successfully');
        
      } catch (error) {
        logger.error('DEBUG: Error in handleMessageReceived:', {
          error: error.message,
          stack: error.stack,
          timestamp: Date.now()
        });
      }
    };
    
    // ✅ CRITICAL: processing handler - shows "AI is writing..."
    const handleProcessing = (data) => {
      // ✅ CRITICAL FIX: Less aggressive guard for processing - this shows AI typing indicator
      if (isUnmountedRef.current && !isStrictModeRef.current && process.env.NODE_ENV !== 'development') {
        logger.warn('Chat: Skipping processing due to component unmount (production only)');
        return;
      }
      
      // Allow processing in development and StrictMode scenarios
      if (isUnmountedRef.current && (isStrictModeRef.current || process.env.NODE_ENV === 'development')) {
        logger.debug('Chat: Processing processing despite unmount (StrictMode/Development)');
      }
      logger.debug('Chat: AI processing started - adding typing indicator');
      
      // Add a temporary AI message to show loading state
      const tempMessageId = `ai_temp_${Date.now()}`;
      setMessages(currentMessages => {
        // Don't add if we already have a temporary AI message
        const hasLoadingMessage = currentMessages.some(msg => 
          msg.role === 'assistant' && msg.status === MESSAGE_STATUS.SENDING
        );
        
        if (!hasLoadingMessage) {
          return [...currentMessages, {
            id: tempMessageId,
            content: '',
            role: 'assistant', 
            status: MESSAGE_STATUS.SENDING,
            timestamp: new Date().toISOString(),
            metadata: { temp: true }
          }];
        }
        return currentMessages;
      });
    };

    // ✅ NEW: Reconnection event handlers
    const handleReconnecting = (data) => {
      logger.debug('Chat: WebSocket reconnecting:', data);
      debugSetConnectionState(CHAT_STATES.RECONNECTING);
      
      // Show reconnection status to user
      setError(null); // Clear any previous errors during reconnection
    };

    const handleReconnectionSuccess = (data) => {
      logger.debug('Chat: WebSocket reconnection successful:', data);
      debugSetConnectionState(CHAT_STATES.CONNECTED);
      
      // Clear any reconnection-related errors
      setError(null);
    };

    const handleReconnectionStopped = (data) => {
      logger.debug('Chat: WebSocket reconnection stopped:', data);
      debugSetConnectionState(CHAT_STATES.FAILED);
      
      // Set appropriate error message based on reason
      if (data.reason === 'max_attempts_reached') {
        setError(new Error('Connection lost. Please refresh the page to reconnect.'));
      } else if (data.reason === 'server_going_away') {
        setError(new Error('Server is restarting. Reconnection will resume shortly.'));
      } else {
        setError(new Error(`Connection failed: ${data.reason}`));
      }
    };

    const handleDisconnected = (data) => {
      logger.debug('Chat: WebSocket disconnected:', data);

      // Only set disconnected state if we're not already reconnecting
      if (connectionState !== CHAT_STATES.RECONNECTING) {
        debugSetConnectionState(CHAT_STATES.DISCONNECTED);
      }
    };

    // ✅ CRITICAL: chat_created handler - captures chat_id from WebSocket events
    const handleChatCreated = (data) => {
      // ✅ CRITICAL FIX: Less aggressive guard for chat_created - this is essential for chat functionality
      if (isUnmountedRef.current && !isStrictModeRef.current && process.env.NODE_ENV !== 'development') {
        logger.warn('Chat: Skipping chat_created due to component unmount (production only)');
        return;
      }

      // Allow chat_created in development and StrictMode scenarios
      if (isUnmountedRef.current && (isStrictModeRef.current || process.env.NODE_ENV === 'development')) {
        logger.debug('Chat: Processing chat_created despite unmount (StrictMode/Development)');
      }

      logger.debug('Chat: Chat created - updating chat_id:', {
        chatId: data.chat_id,
        hasTopLevelChatId: !!data.chat_id,
        dataStructure: Object.keys(data),
        timestamp: new Date().toISOString()
      });

      // Extract chat_id from top-level field (not data.chat_id)
      const chatId = data.chat_id;

      if (!chatId) {
        logger.warn('Chat: chat_created event missing top-level chat_id:', data);
        return;
      }

      // Update current chat with the actual chat_id from server
      setCurrentChat(prev => {
        if (!prev) {
          logger.warn('Chat: No current chat to update with chat_id');
          return prev;
        }

        const updatedChat = { ...prev, id: chatId };
        logger.debug('Chat: Updated current chat with server chat_id:', {
          previousId: prev.id,
          newId: chatId,
          updatedChat
        });

        return updatedChat;
      });

      // WebSocket manager will handle its own chatId storage and message queue flushing
      // This is handled automatically when the websocketManager receives chat_created

      if (chatConfig.enablePerformanceTracking) {
        performanceRef.current.trackChatWidget('chat_created');
      }
    };

    // ✅ CRITICAL: Streaming handlers for response_start, response_chunk, response_complete
    const handleResponseStart = (data) => {
      if (isUnmountedRef.current && !isStrictModeRef.current && process.env.NODE_ENV !== 'development') {
        logger.warn('Chat: Skipping response_start due to component unmount (production only)');
        return;
      }
      
      if (isUnmountedRef.current && (isStrictModeRef.current || process.env.NODE_ENV === 'development')) {
        logger.debug('Chat: Processing response_start despite unmount (StrictMode/Development)');
      }
      
      const messageId = data.data?.message_id || `streaming_${Date.now()}`;
      
      logger.debug('Chat: Response streaming started:', messageId);
      
      // Clear any existing buffer for this message
      delete chunkBufferRef.current[messageId];
      clearTimeout(chunkTimeoutRef.current[messageId]);
      clearTimeout(bufferExpiryRef.current[messageId]);
      
      // Set buffer expiry timeout (20 seconds)
      bufferExpiryRef.current[messageId] = setTimeout(() => {
        logger.warn(`[Chat] Response timeout for message ${messageId}`);
        delete chunkBufferRef.current[messageId];
        delete chunkTimeoutRef.current[messageId];
        delete bufferExpiryRef.current[messageId];
        
        // Mark message as failed
        setMessages(prev => prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, status: MESSAGE_STATUS.FAILED, error: 'Response timeout' }
            : msg
        ));
      }, 20000);
      
      const tempMessage = {
        id: messageId,
        content: '',
        role: 'assistant',
        status: MESSAGE_STATUS.STREAMING,
        timestamp: new Date().toISOString(),
        metadata: { streaming: true }
      };
      
      setMessages(prev => [...prev, tempMessage]);
    };
    
    const handleResponseChunk = (data) => {
      if (isUnmountedRef.current && !isStrictModeRef.current && process.env.NODE_ENV !== 'development') {
        return;
      }
      
      const messageId = data.data?.message_id;
      const chunk = data.data?.chunk || '';
      
      if (!messageId) return;
      
      // Initialize buffer if needed
      if (!chunkBufferRef.current[messageId]) {
        chunkBufferRef.current[messageId] = '';
      }
      chunkBufferRef.current[messageId] += chunk;
      
      // Debounce updates (30ms)
      clearTimeout(chunkTimeoutRef.current[messageId]);
      chunkTimeoutRef.current[messageId] = setTimeout(() => {
        const bufferedContent = chunkBufferRef.current[messageId];
        setMessages(prev => prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, content: bufferedContent }
            : msg
        ));
      }, 30);
    };
    
    // Note: handleResponseComplete is already defined above, we'll just enhance it
    
    // Register the handlers
    logger.debug('Chat: Registering connected handler');
    wsManager.on('connected', handleConnected);

    logger.debug('Chat: Registering connection_established handler');
    wsManager.on('connection_established', handleConnectionEstablished);

    logger.debug('Chat: Registering connection_ready handler');
    wsManager.on('connection_ready', handleConnectionReady);
    
    logger.debug('Chat: Registering ready handler (legacy)');
    wsManager.on('ready', handleReady);
    
    logger.debug('Chat: Registering initializationProgress handler');
    wsManager.on('initializationProgress', handleInitializationProgress);

    logger.debug('Chat: Registering chat_created handler');
    wsManager.on('chat_created', handleChatCreated);

    logger.debug('Chat: Registering response_complete handler');
    wsManager.on('response_complete', handleResponseComplete);
    
    logger.debug('Chat: Registering message_received handler');
    wsManager.on('message_received', handleMessageReceived);
    wsManager.on('messageReceived', handleMessageReceived); // Alternative name
    
    logger.debug('Chat: Registering processing handler');
    wsManager.on('processing', handleProcessing);
    wsManager.on('aiProcessingStarted', handleProcessing); // Alternative name
    wsManager.on('ai_processing_started', handleProcessing); // Backend name
    
    logger.debug('Chat: Registering reconnection handlers');
    wsManager.on('reconnecting', handleReconnecting);
    wsManager.on('reconnection_success', handleReconnectionSuccess);
    wsManager.on('reconnection_stopped', handleReconnectionStopped);
    wsManager.on('disconnected', handleDisconnected);
    
    logger.debug('Chat: Registering streaming handlers');
    wsManager.on('response_start', handleResponseStart);
    wsManager.on('response_chunk', handleResponseChunk);
    // response_complete is already registered above
    
    logger.debug('Chat: All essential handlers registered successfully');

    // ✅ CRITICAL FIX: Signal that handlers are ready for connections
    setHandlersRegistered(true);
    logger.debug('🎯 [Chat] Handler registration complete - ready for connections');

    // Cleanup function
    return () => {
      logger.debug('Chat: Cleaning up essential WebSocket handlers');
      if (wsManager) {
        wsManager.off('connected', handleConnected);
        wsManager.off('connection_established', handleConnectionEstablished);
        wsManager.off('connection_ready', handleConnectionReady);
        wsManager.off('ready', handleReady);
        wsManager.off('initializationProgress', handleInitializationProgress);
        wsManager.off('chat_created', handleChatCreated);
        wsManager.off('response_complete', handleResponseComplete);
        wsManager.off('message_received', handleMessageReceived);
        wsManager.off('messageReceived', handleMessageReceived);
        wsManager.off('processing', handleProcessing);
        wsManager.off('aiProcessingStarted', handleProcessing);
        wsManager.off('ai_processing_started', handleProcessing);
        wsManager.off('reconnecting', handleReconnecting);
        wsManager.off('reconnection_success', handleReconnectionSuccess);
        wsManager.off('reconnection_stopped', handleReconnectionStopped);
        wsManager.off('disconnected', handleDisconnected);
        wsManager.off('response_start', handleResponseStart);
        wsManager.off('response_chunk', handleResponseChunk);
        
        // Clear all streaming buffers and timers
        Object.keys(bufferExpiryRef.current || {}).forEach(messageId => {
          clearTimeout(bufferExpiryRef.current[messageId]);
        });
        Object.keys(chunkTimeoutRef.current || {}).forEach(messageId => {
          clearTimeout(chunkTimeoutRef.current[messageId]);
        });
      }
    };
  }, []); // No dependencies to ensure it runs once
  
  /**
   * ✅ CRITICAL FIX: Chat switching logic with leave/join
   */
  const previousChatIdRef = useRef(null);
  
  useEffect(() => {
    const wsManager = websocketRef.current;
    if (!wsManager || !currentChat) return;
    
    const newChatId = currentChat.id;
    const prevChatId = previousChatIdRef.current;
    
    // Leave previous chat if switching
    if (prevChatId && prevChatId !== newChatId) {
      logger.debug('Chat: Switching from chat', prevChatId, 'to', newChatId);
      wsManager.leaveChat(prevChatId);
      
      // Clear streaming buffers when switching chats
      Object.keys(chunkBufferRef.current).forEach(messageId => {
        clearTimeout(chunkTimeoutRef.current[messageId]);
        clearTimeout(bufferExpiryRef.current[messageId]);
        delete chunkBufferRef.current[messageId];
        delete chunkTimeoutRef.current[messageId];
        delete bufferExpiryRef.current[messageId];
      });
    }
    
    // Join new chat if different from previous
    if (newChatId && newChatId !== prevChatId) {
      logger.debug('Chat: Joining new chat:', newChatId);
      wsManager.joinChat(newChatId);
      previousChatIdRef.current = newChatId;
    }
    
    // Cleanup on unmount or when chat is cleared
    return () => {
      if (newChatId) {
        logger.debug('Chat: Leaving chat on cleanup:', newChatId);
        wsManager.leaveChat(newChatId);
        previousChatIdRef.current = null;
      }
    };
  }, [currentChat?.id]);

  /**
   * Auto-initialize chat if enabled
   */
  useEffect(() => {
    // ✅ CRITICAL FIX: Wait for handlers to be registered before any connection attempt
    if (!handlersRegistered) {
      logger.debug('🎯 [Chat] Waiting for handlers to be registered before auto-init');
      return;
    }

    if (chatConfig.autoConnect && !currentChat && connectionState === CHAT_STATES.DISCONNECTED) {
      logger.debug('🚀 [Chat] Handlers ready, starting auto-initialization');
      initializeChat().catch(console.error);
    }
  }, [handlersRegistered, chatConfig.autoConnect, currentChat, connectionState, initializeChat]);
  
  /**
   * Cleanup on unmount - Enhanced for React Strict Mode
   */
  useEffect(() => {
    return () => {
      logger.debug('Chat: Enhanced cleanup function called');
      
      // Check if this is a React Strict Mode cleanup or real unmount
      if (process.env.NODE_ENV === 'development' && !wsCleanupTimeoutRef.current) {
        logger.debug('StrictMode: Delaying WebSocket cleanup to handle React Strict Mode...');
        
        // Don't immediately disconnect in development - wait to see if component remounts
        wsCleanupTimeoutRef.current = setTimeout(() => {
          if (!componentMountedRef.current) {
            logger.debug('StrictMode: Component truly unmounted - executing WebSocket cleanup');
            performCleanup();
          } else {
            logger.debug('StrictMode: Component remounted - skipping WebSocket cleanup');
          }
        }, 300); // Extended delay to properly handle React StrictMode remounting
        
        return;
      }
      
      // In production or if already scheduled, cleanup immediately
      performCleanup();
    };
    
    function performCleanup() {
      const cleanupInfo = {
        isStrictMode: isStrictModeRef.current,
        strictModeCleanup: strictModeCleanupRef.current,
        componentMounted: componentMountedRef.current,
        mountCount: mountCountRef.current,
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
      };
      
      logger.debug('Chat: Performing actual cleanup with context:', cleanupInfo);
      isUnmountedRef.current = true;
      
      // ✅ Phase 4: Reset initialization state on cleanup
      isInitializingRef.current = false;
      initializationPromiseRef.current = null;
      
      // ✅ FIX: Clear deduplication caches on cleanup
      logger.debug('Chat: Clearing deduplication caches:', {
        processedEvents: processedEventsRef.current.size,
        hasLastResponseData: !!lastResponseDataRef.current
      });
      processedEventsRef.current.clear();
      lastResponseDataRef.current = null;
      
      // Clear all timeouts
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
      }
      
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
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
      
      // ✅ FE-03: Force stop typing for immediate cleanup
      try {
        forceStopTyping();
      } catch (error) {
        logger.warn('[Chat] Error during typing cleanup:', error);
      }
      
      // Enhanced WebSocket disconnect logic for StrictMode handling
      const wsManager = websocketRef.current;
      const shouldDisconnectWebSocket = wsManager && wsManager.disconnect && 
        isUnmountedRef.current;  // Only disconnect when truly unmounting
      
      if (shouldDisconnectWebSocket) {
        logger.debug('Chat: Disconnecting WebSocket due to component cleanup');
        wsManager.disconnect();
      } else {
        if (strictModeCleanupRef.current) {
          logger.debug('StrictMode: Skipping WebSocket disconnect - strict mode cleanup active');
        } else if (isStrictModeRef.current) {
          logger.debug('StrictMode: Skipping WebSocket disconnect - StrictMode detected');
        } else if (process.env.NODE_ENV === 'development') {
          logger.debug('Development: Preserving WebSocket connection in development mode');
        }
      }
    }
  }, []);  // Only run cleanup on true unmount
  
  // ✅ CRITICAL DEBUG: Calculate isReady with detailed logging
  const calculatedIsReady = connectionState === CHAT_STATES.READY && isConnectionReady;
  
  // Debug logging for isReady calculation (only in development)
  if (process.env.NODE_ENV === 'development') {
    logger.debug('DEBUG: isReady calculation:', {
      connectionState,
      isConnectionReady,
      calculatedIsReady,
      chatStatesReady: CHAT_STATES.READY,
      equation: `${connectionState} === ${CHAT_STATES.READY} && ${isConnectionReady} = ${calculatedIsReady}`
    });
  }
  
  // Memoized return value
  return useMemo(() => ({
      // Connection state
      connectionState,
      isConnected: connectionState === CHAT_STATES.CONNECTED || connectionState === CHAT_STATES.READY,
      isReady: calculatedIsReady,
      isConnecting: connectionState === CHAT_STATES.CONNECTING,
      isReconnecting: connectionState === CHAT_STATES.RECONNECTING,
    
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
    
    // AI Processing state
    aiProcessingState,
    isAiProcessing: aiProcessingState.isProcessing,
    
    // Enhanced error state
    errorState,
    hasConnectionError: errorState.connectionError !== null,
    hasProcessingError: errorState.processingError !== null,
    hasValidationError: errorState.validationError !== null,
    hasRateLimitError: errorState.rateLimitError !== null,
    
    // Streaming state
    streamingResponse,
    
    // ✅ FE-03: Typing throttle statistics
    typingStats: debouncedTyping.getTypingStats(),
    isTypingThrottled: debouncedTyping.isThrottled(),
    
    // Advanced typing controls
    forceStopTyping,
    
    // ✅ FE-04: Message registry statistics and controls
    messageRegistryStats: messageRegistryRef.current.getStats(),
    getMessageRegistry: () => messageRegistryRef.current
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
    aiProcessingState,
    errorState,
    streamingResponse,
    debouncedTyping,
    forceStopTyping
  ]);
};

export default useChat;