// src/hooks/useChat.js
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import MIPTechApiClient from '../services/miptechApi';
import MIPTechWebSocketManager from '../services/websocketManager';
import { sessionManager } from '../services/sessionManager';
import { performanceMonitor } from '../services/performanceMonitor';
import useDebouncedTyping from './useDebouncedTyping';
import { getMessageRegistry } from '../utils/MessageRegistry';
import eventNormalizer from '../utils/eventNormalizer';
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
  
  // ✅ DEBUG: Track state changes for troubleshooting
  const debugSetConnectionState = useCallback((newState) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔄 [STATE] connectionState change:', {
        from: connectionState,
        to: newState,
        timestamp: new Date().toISOString()
      });
    }
    setConnectionState(newState);
  }, [connectionState]);
  
  const debugSetIsConnectionReady = useCallback((newValue) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔄 [STATE] isConnectionReady change:', {
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
    
    console.log('🔍 [DEBUG] Enhanced startup check:', debugInfo);
    console.log('🔍 [ENV] Environment variables:');
    console.log('  - REACT_APP_MIPTECH_WS_URL:', process.env.REACT_APP_MIPTECH_WS_URL);
    console.log('  - REACT_APP_MIPTECH_TENANT_ID:', process.env.REACT_APP_MIPTECH_TENANT_ID);
    console.log('  - NODE_ENV:', process.env.NODE_ENV);
    console.log('  - React StrictMode likely active:', process.env.NODE_ENV === 'development');
    
    console.log('🔍 [DEBUG] WebSocket manager status:');
    console.log('  - websocketRef exists:', !!websocketRef.current);
    console.log('  - constructor name:', websocketRef.current?.constructor?.name);
    console.log('  - connect method type:', typeof websocketRef.current?.connect);
    console.log('  - disconnect method type:', typeof websocketRef.current?.disconnect);
    
    if (!websocketRef.current) {
      console.error('❌ [CRITICAL] WebSocket manager is NULL at startup!', {
        ...debugInfo,
        potentialCause: 'Initialization order issue or import failure'
      });
    } else {
      console.log('✅ [DEBUG] WebSocket manager properly initialized');
    }
  }, []);

  // ✅ CRITICAL FIX: React Strict Mode connection management
  useEffect(() => {
    mountCountRef.current += 1;
    console.log(`🔄 [StrictMode] Component mounted/remounted (count: ${mountCountRef.current})`);
    console.log('🔍 [StrictMode] isUnmountedRef.current before reset:', isUnmountedRef.current);
    
    // Enhanced React Strict Mode detection
    if (isUnmountedRef.current === true) {
      console.log('⚠️ [StrictMode] React Strict Mode detected - component remounting after unmount');
      isStrictModeRef.current = true;
      strictModeCleanupRef.current = false;
      
      // Additional validation for StrictMode detection
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔍 [StrictMode] Development mode confirmed - StrictMode handling enabled (mount #${mountCountRef.current})`);
      }
    }
    
    // In development, multiple rapid mounts suggest StrictMode
    if (process.env.NODE_ENV === 'development' && mountCountRef.current > 1) {
      isStrictModeRef.current = true;
      console.log(`🔍 [StrictMode] Multiple mounts detected (${mountCountRef.current}) - StrictMode likely active`);
    }
    
    // Reset all refs to clean state on mount
    isUnmountedRef.current = false;
    componentMountedRef.current = true;
    isInitializingRef.current = false;
    initializationPromiseRef.current = null;
    
    console.log('✅ [StrictMode] Component mount state reset complete:', {
      isUnmounted: isUnmountedRef.current,
      componentMounted: componentMountedRef.current,
      mountCount: mountCountRef.current
    });
    
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
        console.log('⏰ [StrictMode] Delaying cleanup for React Strict Mode (1500ms)...');
        strictModeCleanupRef.current = true;
        
        wsCleanupTimeoutRef.current = setTimeout(() => {
          if (strictModeCleanupRef.current && !componentMountedRef.current) {
            console.log('🧹 [StrictMode] Executing delayed cleanup - component truly unmounting');
            isUnmountedRef.current = true;
          } else {
            console.log('✅ [StrictMode] Component remounted - skipping cleanup');
          }
        }, 1500);
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
    for (let i = 0; i < retries; i++) {
      try {
        // ✅ FIX: Reset unmount state during platform checks to prevent early returns
        if (isUnmountedRef && isUnmountedRef.current) {
          console.log('🔄 [Platform] Resetting unmount state during platform check');
          isUnmountedRef.current = false;
        }
        
        console.log(`🔍 [Platform] Checking readiness (${i + 1}/${retries})...`);
        
        // ✅ FIX: Use API client instead of direct fetch to avoid double path issue
        const health = await apiRef.current.health();
        
        if (health && (health.ai_services_ready || health.status === 'healthy')) {
          console.log('✅ [Platform] AI services ready');
          return true;
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
    console.log('🔍 [DEBUG] isUnmountedRef.current (before reset):', isUnmountedRef.current);
    console.log('🔍 [DEBUG] isInitializingRef.current:', isInitializingRef.current);
    console.log('🔍 [DEBUG] initializationPromiseRef.current:', initializationPromiseRef.current);
    
    // ✅ CRITICAL FIX: Reset unmounted state when explicitly initializing
    // This handles the case where React cleanup runs but component remounts
    isUnmountedRef.current = false;
    console.log('🔧 [DEBUG] FORCED isUnmountedRef.current to false');
    
    // Enhanced unmount checking with StrictMode awareness
    if (isUnmountedRef.current && !isStrictModeRef.current && process.env.NODE_ENV !== 'development') {
      console.log('❌ [DEBUG] Component unmounted in initializeChat - early return (production)');
      return;
    }
    
    // Allow connection if StrictMode detected or in development (component remounting)
    if (isUnmountedRef.current && (isStrictModeRef.current || process.env.NODE_ENV === 'development')) {
      console.log('🔄 [StrictMode/Dev] Allowing connection despite unmounted state (StrictMode/development remount)');
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
    const startTime = Date.now();
    console.log('🚀 [DEBUG] performInitializationInternal START', new Date().toISOString());
    console.log('🔍 [DEBUG] isUnmountedRef.current at START:', isUnmountedRef.current);
    console.log('🔍 [DEBUG] isStrictModeRef.current at START:', isStrictModeRef.current);
    
    // Enhanced unmount checking with development mode awareness  
    if (isUnmountedRef.current && !isStrictModeRef.current && process.env.NODE_ENV !== 'development') {
      console.log('❌ [DEBUG] Component unmounted - early return (production only)');
      return;
    }
    
    if (isUnmountedRef.current && (isStrictModeRef.current || process.env.NODE_ENV === 'development')) {
      console.log('🔄 [StrictMode/Dev] Component unmounted but allowing due to StrictMode/development mode');
    }
    
    console.log('🚀 [DEBUG] Starting WebSocket connection process');
    
    try {
      setIsLoading(true);
      setError(null);
      debugSetConnectionState(CHAT_STATES.CONNECTING);
      
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
      
      // Small delay to let React refs stabilize after async operation
      await new Promise(resolve => setTimeout(resolve, 10));
      
      console.log('🔍 [DEBUG] isUnmountedRef.current AFTER platform check:', isUnmountedRef.current, 'at', new Date().toISOString());
      if (isUnmountedRef.current && !isStrictModeRef.current && process.env.NODE_ENV !== 'development') {
        console.log('❌ [DEBUG] Component unmounted after platform check - early return (production only)');
        return;
      }
      if (isUnmountedRef.current && (isStrictModeRef.current || process.env.NODE_ENV === 'development')) {
        console.log('🔄 [StrictMode/Dev] Component unmounted after platform check but allowing due to StrictMode/development');
      }
      
      // Step 2: Create chat session via REST API
      const tenantId = process.env.REACT_APP_MIPTECH_TENANT_ID || 'miptech-company';
      console.log('💬 [Platform] Step 2: Creating chat session...');
      const chatId = await createChatSession(tenantId);
      
      // Small delay to let React refs stabilize after async operation
      await new Promise(resolve => setTimeout(resolve, 10));
      
      console.log('🔍 [DEBUG] isUnmountedRef.current AFTER chat creation:', isUnmountedRef.current, 'at', new Date().toISOString());
      if (isUnmountedRef.current && !isStrictModeRef.current && process.env.NODE_ENV !== 'development') {
        console.log('❌ [DEBUG] Component unmounted after chat creation - early return (production only)');
        return;
      }
      if (isUnmountedRef.current && (isStrictModeRef.current || process.env.NODE_ENV === 'development')) {
        console.log('🔄 [StrictMode/Dev] Component unmounted after chat creation but allowing due to StrictMode/development');
      }
      
      // Store chat info for WebSocket connection
      const chat = {
        id: chatId,
        tenant_id: tenantId,
        title: options.title || 'Website Chat',
        created_at: new Date().toISOString()
      };
      
      console.log('💬 [DEBUG] Chat session created successfully:', chat.id);
      
      console.log('🔍 [DEBUG] isUnmountedRef.current BEFORE WebSocket setup:', isUnmountedRef.current, 'at', new Date().toISOString());
      if (isUnmountedRef.current && !isStrictModeRef.current && process.env.NODE_ENV !== 'development') {
        console.log('❌ [DEBUG] Component unmounted before WebSocket setup - early return (production only)');
        return;
      }
      if (isUnmountedRef.current && (isStrictModeRef.current || process.env.NODE_ENV === 'development')) {
        console.log('🔄 [StrictMode/Dev] Component unmounted before WebSocket setup but allowing due to StrictMode/development');
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
      
      debugSetConnectionState(CHAT_STATES.CONNECTED);
      
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
      
      // Send to API
      const response = await apiRef.current.sendMessage(currentChat.id, sanitizedContent, {
        metadata: {
          ...options.metadata,
          message_id: messageId, // This might be temp ID
          temp_id: messageRecord.tempId, // Always include temp ID for reconciliation
          client_timestamp: trackedMessage.timestamp
        }
      });
      
      if (isUnmountedRef.current) return;
      
      // Clear timeout
      clearTimeout(timeoutId);
      messageTimeoutRef.current.delete(messageId);
      
      // ✅ FE-04: Try to reconcile with server response
      if (response && response.message_id && messageRecord.tempId) {
        const reconciled = messageRegistryRef.current.reconcileMessage(
          messageRecord.tempId,
          response.message_id,
          response
        );
        
        if (reconciled) {
          // Update UI with reconciled message
          setMessages(prev => prev.map(msg => 
            msg.id === messageId 
              ? { ...reconciled.message, status: MESSAGE_STATUS.SENT }
              : msg
          ));
        }
      } else {
        // Standard update if no reconciliation needed
        messageRegistryRef.current.updateMessageState(messageId, 'sent');
        
        // Update UI for non-reconciled messages
        setMessages(prev => prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, status: MESSAGE_STATUS.SENT, serverResponse: response }
            : msg
        ));
      }
      
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
      console.error('[Chat] Error sending typing_start:', error);
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
      console.error('[Chat] Error sending typing_stop:', error);
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
  console.log('🔧 [Chat] About to register WebSocket event handlers useEffect');
  
  // ✅ CRITICAL: Register essential WebSocket handlers 
  useEffect(() => {
    console.log('🚀 [Chat] Registering essential WebSocket handlers');
    
    const wsManager = websocketRef.current;
    
    if (!wsManager) {
      console.error('❌ [Chat] WebSocket manager is null/undefined, cannot register handlers');
      return;
    }
    
    console.log('✅ [Chat] WebSocket manager exists, registering critical handlers');
    
    // ✅ CRITICAL: connected handler - sets isConnected correctly  
    const handleConnected = () => {
      // ✅ CRITICAL FIX: Less aggressive guard for connected - this sets connection state
      if (isUnmountedRef.current && !isStrictModeRef.current && process.env.NODE_ENV !== 'development') {
        console.warn('⚠️ [Chat] Skipping connected due to component unmount (production only)');
        return;
      }
      
      // Allow connected in development and StrictMode scenarios
      if (isUnmountedRef.current && (isStrictModeRef.current || process.env.NODE_ENV === 'development')) {
        console.log('🔄 [Chat] Processing connected despite unmount (StrictMode/Development)');
      }
      console.log('✅ [Chat] Connected handler - WebSocket connection established');
      debugSetConnectionState(CHAT_STATES.CONNECTED);
      setError(null);
    };
    
    // ✅ CRITICAL: connection_ready handler - makes chat go from "connected" to "ready"
    const handleConnectionReady = (data) => {
      // ✅ CRITICAL FIX: Less aggressive guard for connection_ready - this is essential for chat functionality
      if (isUnmountedRef.current && !isStrictModeRef.current && process.env.NODE_ENV !== 'development') {
        console.warn('⚠️ [Chat] Skipping connection_ready due to component unmount (production only)');
        return;
      }
      
      // Allow connection_ready in development and StrictMode scenarios
      if (isUnmountedRef.current && (isStrictModeRef.current || process.env.NODE_ENV === 'development')) {
        console.log('🔄 [Chat] Processing connection_ready despite unmount (StrictMode/Development)');
      }
      
      console.log('✅ [Chat] Connection ready handler - Platform ready for messages', data);
      debugSetIsConnectionReady(true);
      setCanSendMessages(true);
      debugSetConnectionState(CHAT_STATES.READY);
      setIsLoading(false); // ✅ CRITICAL: Stop loading so textarea gets enabled
      setError(null);
      
      console.log('🔧 [Chat] State after connection_ready:', {
        isConnectionReady: true,
        canSendMessages: true,
        connectionState: 'ready',
        isLoading: false,
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
        console.warn('⚠️ [Chat] Skipping ready due to component unmount (production only)');
        return;
      }
      
      // Allow ready in development and StrictMode scenarios
      if (isUnmountedRef.current && (isStrictModeRef.current || process.env.NODE_ENV === 'development')) {
        console.log('🔄 [Chat] Processing ready despite unmount (StrictMode/Development)');
      }
      console.log('[Chat] Legacy ready signal received - delegating to unified handler');
      handleConnectionReady(data);
    };
    
    // ✅ CRITICAL: initialization progress handler
    const handleInitializationProgress = (data) => {
      // ✅ CRITICAL FIX: Less aggressive guard for initialization progress
      if (isUnmountedRef.current && !isStrictModeRef.current && process.env.NODE_ENV !== 'development') {
        console.warn('⚠️ [Chat] Skipping initializationProgress due to component unmount (production only)');
        return;
      }
      
      // Allow initializationProgress in development and StrictMode scenarios
      if (isUnmountedRef.current && (isStrictModeRef.current || process.env.NODE_ENV === 'development')) {
        console.log('🔄 [Chat] Processing initializationProgress despite unmount (StrictMode/Development)');
      }
      console.log(`⏳ [Chat] Platform initializing: ${data.phase || 'unknown'} - ${data.message || 'Initializing services'}`);
      setInitializationStatus(data);
    };
    
    // ✅ CRITICAL: response_complete handler - displays AI responses
    const handleResponseComplete = (data) => {
      // ✅ DEBUG: FIRST LOG - Handler entry point
      console.log('🔥 [DEBUG] handleResponseComplete ENTRY POINT - Handler called!', {
        timestamp: Date.now(),
        hasData: !!data,
        handlerConfirmation: 'HANDLER_DEFINITELY_CALLED'
      });
      
      // ✅ DEBUG: Check unmount state
      console.log('🔍 [DEBUG] Checking unmount state:', {
        isUnmountedRef: isUnmountedRef.current,
        willReturn: !!isUnmountedRef.current,
        timestamp: Date.now()
      });
      
      // ✅ TEMPORARILY DISABLE GUARD to debug
      // if (isUnmountedRef.current) return;
      
      console.log('🎉 [Chat] AI response completed - displaying message:', {
        messageId: data.messageId || data.data?.message_id,
        content: data.data?.content?.substring(0, 100) + '...',
        hasContent: !!data.data?.content,
        timestamp: new Date().toISOString()
      });
      
      try {
        console.log('🔧 [DEBUG] Entering try block - extracting data');
        
        // Extract message data from the response
        const messageId = data.messageId || data.data?.message_id;
        const content = data.data?.content || data.data?.message || '';
        
        console.log('🔍 [DEBUG] Extracted data:', {
          messageId,
          content: content.substring(0, 50) + '...',
          hasMessageId: !!messageId,
          hasContent: !!content,
          dataStructure: Object.keys(data),
          dataDataStructure: data.data ? Object.keys(data.data) : null
        });
        
        if (!messageId || !content) {
          console.warn('⚠️ [Chat] Missing messageId or content in response_complete:', {
            messageId, 
            hasContent: !!content,
            data: data.data
          });
          return;
        }
        
        console.log('✅ [DEBUG] Data validation passed - proceeding with message update');
        
        // Update the message in state from loading to completed
        setMessages(currentMessages => {
          const updatedMessages = currentMessages.map(msg => {
            // Find the temporary message and replace it with the AI response
            if (msg.role === 'assistant' && (msg.id === messageId || msg.status === MESSAGE_STATUS.SENDING)) {
              return {
                ...msg,
                id: messageId,
                content: sanitizeInput(content),
                status: MESSAGE_STATUS.RECEIVED,
                timestamp: data.data?.created_at ? new Date(data.data.created_at * 1000).toISOString() : new Date().toISOString(),
                metadata: {
                  ...msg.metadata,
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
              content: sanitizeInput(content),
              role: 'assistant',
              status: MESSAGE_STATUS.RECEIVED,
              timestamp: data.data?.created_at ? new Date(data.data.created_at * 1000).toISOString() : new Date().toISOString(),
              metadata: {
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
        
        console.log('✅ [Chat] AI response successfully displayed');
        
      } catch (error) {
        console.error('❌ [DEBUG] CRITICAL ERROR in handleResponseComplete:', {
          error: error.message,
          stack: error.stack,
          timestamp: Date.now(),
          handlerPhase: 'response_complete_processing'
        });
        setIsLoading(false);
        setCanSendMessages(true);
      }
      
      console.log('🏁 [DEBUG] handleResponseComplete COMPLETED - End of handler');
    };
    
    // ✅ CRITICAL: message_received handler - confirms message receipt  
    const handleMessageReceived = (data) => {
      // ✅ CRITICAL FIX: Less aggressive guard for message_received - this is essential for user message confirmation
      if (isUnmountedRef.current && !isStrictModeRef.current && process.env.NODE_ENV !== 'development') {
        console.warn('⚠️ [Chat] Skipping message_received due to component unmount (production only)');
        return;
      }
      
      // Allow message_received in development and StrictMode scenarios
      if (isUnmountedRef.current && (isStrictModeRef.current || process.env.NODE_ENV === 'development')) {
        console.log('🔄 [Chat] Processing message_received despite unmount (StrictMode/Development)');
      }
      
      console.log('📝 [DEBUG] handleMessageReceived ENTRY POINT:', {
        messageId: data.messageId,
        hasData: !!data,
        dataStructure: Object.keys(data),
        timestamp: new Date().toISOString()
      });
      
      try {
        const serverMessageId = data.messageId;
        
        console.log('🔍 [DEBUG] Looking for user message to update:', {
          serverMessageId,
          searchingForStatus: 'SENDING',
          timestamp: Date.now()
        });
        
        // Update the user message from SENDING to RECEIVED
        setMessages(currentMessages => {
          console.log('📋 [DEBUG] Current messages before update:', {
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
              console.log('✅ [DEBUG] Found user message to update:', {
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
          
          console.log('🎯 [DEBUG] Message update result:', {
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
        
        console.log('✅ [DEBUG] User message confirmed successfully');
        
      } catch (error) {
        console.error('❌ [DEBUG] Error in handleMessageReceived:', {
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
        console.warn('⚠️ [Chat] Skipping processing due to component unmount (production only)');
        return;
      }
      
      // Allow processing in development and StrictMode scenarios
      if (isUnmountedRef.current && (isStrictModeRef.current || process.env.NODE_ENV === 'development')) {
        console.log('🔄 [Chat] Processing processing despite unmount (StrictMode/Development)');
      }
      console.log('⚙️ [Chat] AI processing started - adding typing indicator');
      
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
    
    // Register the handlers
    console.log('📝 [Chat] Registering connected handler');
    wsManager.on('connected', handleConnected);
    
    console.log('📝 [Chat] Registering connection_ready handler');
    wsManager.on('connection_ready', handleConnectionReady);
    
    console.log('📝 [Chat] Registering ready handler (legacy)');
    wsManager.on('ready', handleReady);
    
    console.log('📝 [Chat] Registering initializationProgress handler');
    wsManager.on('initializationProgress', handleInitializationProgress);
    
    console.log('📝 [Chat] Registering response_complete handler');
    wsManager.on('response_complete', handleResponseComplete);
    
    console.log('📝 [Chat] Registering message_received handler');
    wsManager.on('message_received', handleMessageReceived);
    wsManager.on('messageReceived', handleMessageReceived); // Alternative name
    
    console.log('📝 [Chat] Registering processing handler');
    wsManager.on('processing', handleProcessing);
    wsManager.on('aiProcessingStarted', handleProcessing); // Alternative name
    wsManager.on('ai_processing_started', handleProcessing); // Backend name
    
    console.log('✅ [Chat] All essential handlers registered successfully');
    
    // Cleanup function
    return () => {
      console.log('🧹 [Chat] Cleaning up essential WebSocket handlers');
      if (wsManager) {
        wsManager.off('connected', handleConnected);
        wsManager.off('connection_ready', handleConnectionReady);
        wsManager.off('ready', handleReady);
        wsManager.off('initializationProgress', handleInitializationProgress);
        wsManager.off('response_complete', handleResponseComplete);
        wsManager.off('message_received', handleMessageReceived);
        wsManager.off('messageReceived', handleMessageReceived);
        wsManager.off('processing', handleProcessing);
        wsManager.off('aiProcessingStarted', handleProcessing);
        wsManager.off('ai_processing_started', handleProcessing);
      }
    };
  }, []); // No dependencies to ensure it runs once
  
  /* TEMPORARILY COMMENTED OUT FOR SYNTAX ERROR DEBUGGING
  useEffect(() => {
    try {
      // ✅ DEBUG: Critical - log useEffect execution
      console.log('🚀 [Chat] WebSocket event handlers useEffect EXECUTING', {
        timestamp: Date.now(),
        mountCount: mountCountRef.current,
        isUnmounted: isUnmountedRef.current,
        wsManagerExists: !!websocketRef.current
      });
      
      const wsManager = websocketRef.current;
      
      // ✅ DEBUG: Check if wsManager exists
      if (!wsManager) {
        console.error('❌ [Chat] WebSocket manager is null/undefined, cannot register handlers');
        return;
      }
      
      console.log('✅ [Chat] WebSocket manager exists, proceeding with handler registration');
    
    const handleConnected = () => {
      if (isUnmountedRef.current) return;
      debugSetConnectionState(CHAT_STATES.CONNECTED);
      setError(null);
    };
    
    const handleDisconnected = () => {
      if (isUnmountedRef.current) return;
      debugSetConnectionState(CHAT_STATES.DISCONNECTED);
      debugSetIsConnectionReady(false);
      
      // Clear connection timeout
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
    };
    
    const handleReconnecting = () => {
      if (isUnmountedRef.current) return;
      debugSetConnectionState(CHAT_STATES.RECONNECTING);
    };
    
    const handleReady = (data) => {
      if (isUnmountedRef.current) return;
      
      console.log('[Chat] Legacy ready signal received - using unified handler');
      // Delegate to unified connection ready handler
      handleConnectionReady(data);
    };
    
    const handleConnectionEstablished = (data) => {
      if (isUnmountedRef.current) return;
      
      console.log('✅ [Chat] Platform connection established, waiting for ready signal');
      setCanSendMessages(false);  // Wait for connection_ready
      debugSetConnectionState(CHAT_STATES.CONNECTED);
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
      // ✅ CRITICAL FIX: Less aggressive guard for connection_ready - this is essential for chat functionality
      if (isUnmountedRef.current && !isStrictModeRef.current && process.env.NODE_ENV !== 'development') {
        console.warn('⚠️ [Chat] Skipping connection_ready due to component unmount (production only)');
        return;
      }
      
      // Allow connection_ready in development and StrictMode scenarios
      if (isUnmountedRef.current && (isStrictModeRef.current || process.env.NODE_ENV === 'development')) {
        console.log('🔄 [Chat] Processing connection_ready despite unmount (StrictMode/Development)');
      }
      
      try {
        console.log('✅ [Chat] Unified connection ready handler - Platform ready for messages');
        console.log('🔍 [DEBUG] connection_ready data:', data);
        console.log('🔍 [DEBUG] Current states:', {
          connectionState,
          isConnectionReady,
          isUnmountedRef: isUnmountedRef.current,
          isStrictMode: isStrictModeRef.current,
          componentMounted: componentMountedRef.current
        });
        
        // Clear connection timeout
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
          connectionTimeoutRef.current = null;
          console.log('✅ [Chat] Connection timeout cleared');
        }
        
        // ✅ CRITICAL: Update all connection ready states
        setCanSendMessages(true);  // Enable message sending
        debugSetIsConnectionReady(true); // Critical for isReady calculation
        debugSetConnectionState(CHAT_STATES.READY); // Transition to READY state
        setIsLoading(false); // ✅ FIX: Clear loading state when connection is ready
        setError(null);
        
        console.log('✅ [Chat] State updated - Chat should now be READY');
        
        if (chatConfig.enablePerformanceTracking) {
          performanceRef.current.trackChatWidget('connection_ready');
        }
      } catch (error) {
        console.error('❌ [Chat] Critical error in handleConnectionReady:', error);
        console.error('❌ [Chat] Error stack:', error.stack);
        // Don't crash the application but ensure we know about this
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
      debugSetConnectionState(CHAT_STATES.ERROR);
    };
    
    const handleMessage = (data) => {
      if (isUnmountedRef.current) return;
      
      // Handle both chat_message and chat_response types
      if (data.type === 'chat_message' || data.type === 'chat_response') {
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
      
      // Set connection error
      setErrorState(prev => ({
        ...prev,
        connectionError: wsError
      }));
      
      // Track error
      if (chatConfig.enablePerformanceTracking) {
        setPerformanceMetrics(prev => ({
          ...prev,
          errorCount: prev.errorCount + 1
        }));
      }
    };
    
    // ✅ NEW: Handle specific AI processing errors
    const handleAiProcessingError = (data) => {
      if (isUnmountedRef.current) return;
      
      console.error('🤖 [Chat] AI Processing Error:', data);
      
      // Clear processing timeout
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
        processingTimeoutRef.current = null;
      }
      
      // Reset processing state
      setAiProcessingState({
        isProcessing: false,
        messageId: null,
        startTime: null,
        processingTimeout: null
      });
      
      setIsLoading(false);
      
      // Set processing error
      setErrorState(prev => ({
        ...prev,
        processingError: {
          type: 'ai_processing_error',
          message: data.message || 'AI processing failed',
          details: data.details,
          messageId: data.messageId,
          timestamp: data.timestamp
        }
      }));
      
      // Update message status if we have the message ID
      if (data.messageId) {
        setMessages(prev => prev.map(msg => 
          msg.id === data.messageId 
            ? { ...msg, status: MESSAGE_STATUS.FAILED, error: data }
            : msg
        ));
      }
    };
    
    // ✅ NEW: Handle rate limit errors
    const handleRateLimitError = (data) => {
      if (isUnmountedRef.current) return;
      
      console.error('🚦 [Chat] Rate Limit Error:', data);
      
      setErrorState(prev => ({
        ...prev,
        rateLimitError: {
          type: 'rate_limit_error',
          message: data.message || 'Rate limit exceeded',
          retryAfter: data.retry_after,
          timestamp: data.timestamp
        }
      }));
    };
    
    // ✅ NEW: Handle message validation errors
    const handleMessageValidationError = (data) => {
      if (isUnmountedRef.current) return;
      
      console.error('📝 [Chat] Message Validation Error:', data);
      
      setErrorState(prev => ({
        ...prev,
        validationError: {
          type: 'message_validation_error',
          message: data.message || 'Message validation failed',
          details: data.details,
          messageId: data.messageId,
          timestamp: data.timestamp
        }
      }));
      
      // Update message status if we have the message ID
      if (data.messageId) {
        setMessages(prev => prev.map(msg => 
          msg.id === data.messageId 
            ? { ...msg, status: MESSAGE_STATUS.FAILED, error: data }
            : msg
        ));
      }
    };
    
    const handleFailed = () => {
      if (isUnmountedRef.current) return;
      setConnectionState(CHAT_STATES.FAILED);
    };
    
    const handleResponseStart = (data) => {
      if (isUnmountedRef.current) return;
      
      // ✅ FE-01: Normalize event data
      const normalizedData = eventNormalizerRef.current.normalize(data);
      const messageId = normalizedData.messageId || normalizedData.message_id;
      
      if (!messageId) {
        console.warn('⚠️ [Chat] response_start missing messageId, skipping', normalizedData);
        return;
      }

      // ✅ FE-02: Check for duplicate events
      const eventKey = `response_start_${messageId}_${normalizedData.__normalizedAt || Date.now()}`;
      if (wsEventsRef.current.has(eventKey)) {
        console.log('🔄 [Chat] Skipping duplicate response_start event:', eventKey);
        return;
      }
      wsEventsRef.current.add(eventKey);
      
      console.log('🎬 [Chat] Response streaming started for:', messageId);
      
      // ✅ FE-04: Check if we have this message in registry (for reconciliation)
      let assistantMessage;
      const existingRecord = messageRegistryRef.current.getMessage(messageId);
      
      if (existingRecord) {
        // Update existing registered message
        messageRegistryRef.current.updateMessageState(messageId, 'processing', {
          streaming: true,
          streamStartTime: Date.now()
        });
        assistantMessage = {
          ...existingRecord.message,
          content: '',
          role: 'assistant',
          status: MESSAGE_STATUS.STREAMING,
          metadata: { ...existingRecord.message.metadata, streaming: true, streamStarted: true }
        };
      } else {
        // Create new message for assistant response
        assistantMessage = {
          id: messageId,
          content: '',
          role: 'assistant', 
          timestamp: new Date().toISOString(),
          status: MESSAGE_STATUS.STREAMING,
          metadata: { streaming: true, streamStarted: true }
        };
        
        // Register new assistant message
        messageRegistryRef.current.registerMessage(assistantMessage, {
          streaming: true,
          streamStartTime: Date.now(),
          assistantResponse: true
        });
      }
      
      // ✅ FE-05: Set up streaming state with live typing
      setStreamingResponse({
        isStreaming: true,
        messageId: messageId,
        content: '',
        chunks: [],
        startTime: Date.now(),
        metadata: normalizedData
      });
      
      // ✅ FE-03: Show AI typing indicator during streaming
      if (typingHandlerRef.current) {
        typingHandlerRef.current.startTyping();
      }
      
      // Add/update message in UI
      setMessages(prev => {
        const existingIndex = prev.findIndex(msg => msg.id === messageId);
        if (existingIndex >= 0) {
          // Update existing message
          const updatedMessages = [...prev];
          updatedMessages[existingIndex] = assistantMessage;
          return updatedMessages;
        } else {
          // Add new streaming message
          return [...prev, assistantMessage];
        }
      });
      
      // Performance tracking
      if (chatConfig.enablePerformanceTracking) {
        performanceRef.current.startTimer(`streaming_${messageId}`);
      }
    };
    
    const handleResponseChunk = (data) => {
      if (isUnmountedRef.current) return;
      
      // ✅ FE-01: Normalize event data
      const normalizedData = eventNormalizerRef.current.normalize(data);
      const messageId = normalizedData.messageId || normalizedData.message_id;
      const content = normalizedData.content || normalizedData.chunk || '';
      
      if (!messageId) {
        console.warn('⚠️ [Chat] response_chunk missing messageId, skipping', normalizedData);
        return;
      }
      
      // ✅ FE-02: Generate event key for deduplication (include content hash for chunks)
      const contentHash = btoa(content).substring(0, 8); // Short content hash
      const eventKey = `response_chunk_${messageId}_${contentHash}_${normalizedData.__normalizedAt || Date.now()}`;
      
      if (wsEventsRef.current.has(eventKey)) {
        console.log('🔄 [Chat] Skipping duplicate response_chunk event:', eventKey);
        return;
      }
      wsEventsRef.current.add(eventKey);
      
      console.log('📝 [Chat] Response chunk received for:', messageId, `(${content.length} chars)`);
      
      // ✅ FE-04: Update message registry state
      const messageRecord = messageRegistryRef.current.getMessage(messageId);
      if (messageRecord) {
        messageRegistryRef.current.updateMessageState(messageId, 'processing', {
          streaming: true,
          lastChunkTime: Date.now(),
          chunksReceived: (messageRecord.metadata.chunksReceived || 0) + 1,
          contentLength: (messageRecord.message.content?.length || 0) + content.length
        });
      }
      
      // ✅ FE-05: Update streaming state with live chunk tracking
      setStreamingResponse(prev => {
        if (!prev.isStreaming || prev.messageId !== messageId) {
          console.warn('⚠️ [Chat] Received chunk for non-streaming message:', messageId);
          return prev;
        }
        
        return {
          ...prev,
          content: prev.content + content,
          chunks: [...prev.chunks, {
            content,
            timestamp: Date.now(),
            size: content.length,
            sequence: prev.chunks.length + 1
          }],
          lastChunkTime: Date.now(),
          totalChunks: prev.chunks.length + 1,
          totalSize: (prev.content?.length || 0) + content.length
        };
      });
      
      // ✅ FE-03: Keep AI typing indicator alive during chunking
      if (typingHandlerRef.current) {
        typingHandlerRef.current.startTyping(); // Reset timeout
      }
      
      // Update streaming message content incrementally
      setMessages(prev => prev.map(msg => {
        if (msg.id === messageId && msg.metadata?.streaming) {
          return {
            ...msg,
            content: msg.content + content,
            status: MESSAGE_STATUS.STREAMING,
            metadata: {
              ...msg.metadata,
              lastUpdate: Date.now(),
              chunksReceived: (msg.metadata.chunksReceived || 0) + 1,
              streamingActive: true
            }
          };
        }
        return msg;
      }));
      
      // Performance tracking for chunk processing
      if (chatConfig.enablePerformanceTracking && content.length > 0) {
        performanceRef.current.trackChatWidget('streaming_chunk_processed', {
          messageId,
          chunkSize: content.length,
          totalSize: (messageRecord?.message?.content?.length || 0) + content.length
        });
      }
    };
    
    const handleResponseComplete = (data) => {
      if (isUnmountedRef.current) return;
      
      // ✅ DEBUG: Unique identifier to confirm this is the right handler
      console.log('🎯 [Chat] MY HANDLER CALLED - handleResponseComplete (UNIQUE ID: useChat_v2)', {
        handlerConfirmation: 'THIS_IS_THE_CORRECT_HANDLER',
        timestamp: Date.now()
      });
      
      // ✅ DEBUG: Log complete event structure for analysis
      console.log('🎉 [Chat] handleResponseComplete called with FULL DATA:', {
        completeEventData: data,
        dataStructure: JSON.stringify(data, null, 2),
        type: data.type,
        hasData: !!data.data,
        dataKeys: data.data ? Object.keys(data.data) : [],
        dataPath: {
          'data.data': data.data,
          'data.data.message': data.data?.message,
          'data.data.content': data.data?.content,
          'data.message': data.message,
          'data.content': data.content
        },
        timestamp: data.timestamp
      });
      
      // ✅ FE-01: Normalize event data
      const normalizedData = eventNormalizerRef.current.normalize(data);
      const messageId = normalizedData.messageId || normalizedData.message_id || data.data?.message_id;
      
      if (!messageId) {
        console.warn('⚠️ [Chat] response_complete missing messageId, skipping', {
          normalizedData,
          originalData: data
        });
        return;
      }
      
      // ✅ FIX: Improved deduplication with content-based key
      const contentSnippet = data.data?.content ? data.data.content.substring(0, 50) : '';
      const eventKey = `response_complete_${messageId}_${contentSnippet}_${data.data?.created_at || normalizedData.__normalizedAt || Date.now()}`;
      
      if (wsEventsRef.current.has(eventKey)) {
        console.log('🔄 [Chat] Skipping duplicate response_complete event:', {
          eventKey: eventKey.substring(0, 80) + '...',
          messageId,
          reason: 'identical_event_signature'
        });
        return;
      }
      wsEventsRef.current.add(eventKey);
      
      // ✅ DETECTION: Check if this is streaming or non-streaming response
      const isStreamingResponse = !!messages.find(msg => msg.id === messageId && msg.metadata?.streaming);
      const hasBackendData = !!(data.data && (data.data.content || data.data.message));
      
      console.log('🏁 [Chat] Response complete analysis:', {
        messageId,
        isStreamingResponse,
        hasBackendData,
        contentLength: data.data?.content?.length || 0,
        processingType: isStreamingResponse ? 'streaming' : 'non-streaming'
      });
      
      // ✅ FE-03: Stop AI typing indicator
      if (typingHandlerRef.current) {
        typingHandlerRef.current.stopTyping();
      }
      
      // ✅ UNIFIED HANDLER: Process non-streaming backend responses
      if (!isStreamingResponse && hasBackendData) {
        console.log('📝 [Chat] Processing non-streaming response from backend');
        
        // Clear any processing states
        setAiProcessingState({
          isProcessing: false,
          messageId: null,
          startTime: null,
          processingTimeout: null
        });
        setIsLoading(false);
        
        // Extract message data
        const serverMessageId = data.data?.message_id || data.data?.id;
        const messageContent = data.data?.content || data.data?.message?.content || data.data?.message;
        
        if (serverMessageId && messageContent) {
          // Check if message already exists
          const existingMessage = messages.find(msg => msg.id === serverMessageId);
          
          console.log('📝 [Chat] Creating/updating non-streaming AI message:', {
            messageId: serverMessageId,
            existingMessage: !!existingMessage,
            action: existingMessage ? 'update' : 'create',
            contentLength: messageContent.length
          });
          
          if (existingMessage) {
            // Update existing message
            setMessages(prev => prev.map(msg => 
              msg.id === serverMessageId 
                ? { 
                    ...msg, 
                    status: MESSAGE_STATUS.RECEIVED,
                    content: messageContent,
                    metadata: {
                      ...msg.metadata,
                      streaming: false,
                      totalTokens: data.data.total_tokens || (data.data.prompt_tokens + data.data.completion_tokens),
                      responseTime: data.data.response_time_ms,
                      model: data.data.llm_model,
                      costEstimate: data.data.cost_estimate || 0,
                      sources: data.data.sources || [],
                      promptTokens: data.data.prompt_tokens,
                      completionTokens: data.data.completion_tokens
                    }
                  }
                : msg
            ));
          } else {
            // Create new message
            const aiMessage = {
              id: serverMessageId,
              content: messageContent,
              role: 'assistant',
              timestamp: data.data.created_at ? new Date(data.data.created_at * 1000).toISOString() : new Date().toISOString(),
              status: MESSAGE_STATUS.RECEIVED,
              metadata: {
                streaming: false,
                totalTokens: data.data.total_tokens || (data.data.prompt_tokens + data.data.completion_tokens),
                responseTime: data.data.response_time_ms,
                model: data.data.llm_model,
                costEstimate: data.data.cost_estimate || 0,
                sources: data.data.sources || [],
                promptTokens: data.data.prompt_tokens,
                completionTokens: data.data.completion_tokens
              }
            };
            
            console.log('📝 [Chat] Adding NEW non-streaming AI message to UI:', {
              messageId: aiMessage.id,
              contentLength: aiMessage.content.length,
              role: aiMessage.role,
              status: aiMessage.status,
              totalMessagesAfter: messages.length + 1
            });
            
            setMessages(prev => {
              const newMessages = [...prev, aiMessage];
              console.log('✅ [Chat] Messages updated - total count:', newMessages.length);
              return newMessages;
            });
          }
          
          // Performance tracking
          if (chatConfig.enablePerformanceTracking) {
            performanceRef.current.trackChatWidget('ai_response_received', data.data.response_time_ms);
          }
          
          // Early return for non-streaming responses
          return;
        } else {
          console.error('❌ [Chat] Missing data in non-streaming response:', {
            hasMessageId: !!serverMessageId,
            hasContent: !!messageContent,
            dataStructure: Object.keys(data.data || {})
          });
        }
      }
      
      // ✅ STREAMING HANDLER: Process streaming response completion (original logic)
      console.log('📝 [Chat] Processing streaming response completion');
      
      // ✅ FE-04: Update message registry with completion
      const messageRecord = messageRegistryRef.current.getMessage(messageId);
      if (messageRecord) {
        messageRegistryRef.current.updateMessageState(messageId, 'reconciled', {
          streaming: false,
          completedAt: Date.now(),
          streamDuration: Date.now() - (messageRecord.metadata.streamStartTime || Date.now()),
          totalTokens: normalizedData.totalTokens || normalizedData.total_tokens,
          costEstimate: normalizedData.costEstimate || normalizedData.cost_estimate,
          finalContent: normalizedData.content || messageRecord.message.content
        });
      }
      
      // ✅ FE-05: Finalize streaming state
      setStreamingResponse(prev => {
        if (prev.messageId === messageId) {
          const streamDuration = Date.now() - prev.startTime;
          
          return {
            ...prev,
            isStreaming: false,
            completed: true,
            endTime: Date.now(),
            streamDuration,
            finalMetadata: normalizedData
          };
        }
        return prev;
      });
      
      // Update final message with complete metadata and status
      setMessages(prev => prev.map(msg => {
        if (msg.id === messageId) {
          return {
            ...msg,
            status: MESSAGE_STATUS.RECEIVED,
            metadata: {
              ...msg.metadata,
              streaming: false,
              streamCompleted: true,
              completedAt: Date.now(),
              totalTokens: normalizedData.totalTokens || normalizedData.total_tokens,
              costEstimate: normalizedData.costEstimate || normalizedData.cost_estimate,
              sources: normalizedData.sources,
              finalContent: normalizedData.content || msg.content,
              streamingStats: {
                chunksReceived: msg.metadata?.chunksReceived || 0,
                finalSize: msg.content?.length || 0,
                streamDuration: Date.now() - (msg.metadata?.streamStartTime || Date.now())
              }
            }
          };
        }
        return msg;
      }));
      
      // Performance tracking for completed stream
      if (chatConfig.enablePerformanceTracking) {
        const streamDuration = performanceRef.current.endTimer(`streaming_${messageId}`);
        performanceRef.current.trackChatWidget('streaming_completed', {
          messageId,
          duration: streamDuration?.duration,
          totalTokens: normalizedData.totalTokens || normalizedData.total_tokens,
          chunksProcessed: messageRecord?.metadata?.chunksReceived || 0,
          contentSize: messageRecord?.message?.content?.length || 0
        });
      }
      
      // Clear old streaming state after a delay (cleanup)
      setTimeout(() => {
        setStreamingResponse(prev => 
          prev.messageId === messageId 
            ? { isStreaming: false, messageId: null, content: '', chunks: [] }
            : prev
        );
      }, 2000); // Keep state briefly for any UI animations
    };

    // ✅ NEW: Handle AI response complete from backend REST-WebSocket integration
    const handleAiResponseComplete = (data) => {
      if (isUnmountedRef.current) return;
      
      // ✅ DEBUG: Log received response data for troubleshooting
      console.log('🎉 [Chat] AI response complete received:', {
        type: data.type,
        hasData: !!data.data,
        messageId: data.data?.message_id,
        hasContent: !!data.data?.content,
        contentLength: data.data?.content?.length,
        timestamp: data.timestamp
      });
      
      // ✅ FIX: Improved deduplication with content-based key to prevent blocking valid messages
      const messageId = data.data?.message_id;
      const contentSnippet = data.data?.content ? data.data.content.substring(0, 50) : '';
      const eventKey = `${data.type}_${messageId}_${contentSnippet}_${data.data?.created_at || data.timestamp || Date.now()}`;
      
      if (processedEventsRef.current.has(eventKey)) {
        console.log('🔄 [Chat] Skipping duplicate response_complete event:', {
          eventKey: eventKey.substring(0, 80) + '...',
          messageId,
          reason: 'identical_event_signature'
        });
        return;
      }
      processedEventsRef.current.add(eventKey);
      
      // ✅ CLEANUP: Limit cache size to prevent memory issues
      if (processedEventsRef.current.size > 500) {
        const cacheArray = Array.from(processedEventsRef.current);
        processedEventsRef.current.clear();
        // Keep only the most recent 250 entries
        cacheArray.slice(-250).forEach(key => processedEventsRef.current.add(key));
        console.log('🧹 [Chat] Trimmed deduplication cache to prevent memory issues');
      }
      
      // ✅ FIX: More sophisticated duplicate detection for React double processing
      const dataSignature = JSON.stringify({
        message_id: data.data?.message_id,
        content: data.data?.content,
        created_at: data.data?.created_at
      });
      if (lastResponseDataRef.current === dataSignature) {
        console.log('🔄 [Chat] Skipping identical response data (React double render):', {
          messageId,
          reason: 'react_double_processing'
        });
        return;
      }
      lastResponseDataRef.current = dataSignature;
      
      console.log('✅ [Chat] Processing AI response complete:', {
        messageId,
        contentPreview: contentSnippet || 'no_content',
        eventProcessed: true
      });
      
      // ✅ VALIDATION: Check if response data has required fields
      if (!data.data) {
        console.error('❌ [Chat] Missing data in response_complete event:', data);
        return;
      }
      
      // ✅ IMPROVED: Check for content in multiple possible locations
      const hasContent = !!(data.data.content || 
                            data.data.message?.content || 
                            data.data.message ||
                            (typeof data.data.message === 'string' && data.data.message.length > 0));
      
      if (!hasContent) {
        console.error('❌ [Chat] Missing content in response_complete (checked multiple locations):', {
          dataKeys: Object.keys(data.data),
          hasDirectContent: !!data.data.content,
          hasMessageContent: !!data.data.message?.content,
          hasMessageString: typeof data.data.message === 'string',
          messageValue: data.data.message,
          fullData: data.data
        });
        return;
      }
      
      console.log('🔍 [DEBUG] Response complete data structure validation passed:', {
        type: data.type,
        timestamp: data.timestamp,
        dataKeys: Object.keys(data.data || {}),
        messageIdPresent: !!messageId,
        contentPresent: !!data.data.content,
        contentLength: data.data.content?.length
      });
      
      // Clear processing timeout
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
        processingTimeoutRef.current = null;
      }
      
      // Reset AI processing state
      const processingDuration = aiProcessingState.startTime 
        ? Date.now() - aiProcessingState.startTime 
        : null;
      
      setAiProcessingState({
        isProcessing: false,
        messageId: null,
        startTime: null,
        processingTimeout: null
      });
      
      setIsLoading(false);
      
      // Clear any processing errors
      setErrorState(prev => ({
        ...prev,
        processingError: null
      }));
      
      // ✅ FE-04: Try to reconcile with temporary message if available  
      // ✅ COMPATIBILITY: Handle different backend response structures
      const serverMessageId = data.data?.message_id || data.data?.id;
      const messageContent = data.data?.content || data.data?.message?.content || data.data?.message;
      
      console.log('🔍 [Chat] Extracting message data:', {
        serverMessageId,
        hasContent: !!messageContent,
        contentType: typeof messageContent,
        dataStructure: Object.keys(data.data || {}),
        rawDataSample: data.data
      });
      
      // Try to find and reconcile temporary message
      if (serverMessageId && messageContent) {
        const reconciled = messageRegistryRef.current.reconcileByContent(
          messageContent,
          serverMessageId,
          data.data,
          0.7 // 70% similarity threshold
        );
        
        if (reconciled) {
          console.log(`🔄 [Chat] Reconciled temp message with server response: ${reconciled.tempId} -> ${serverMessageId}`);
          
          // Update existing temporary message in UI
          setMessages(prev => prev.map(msg => 
            msg.id === reconciled.tempId 
              ? { 
                  ...reconciled.message,
                  status: MESSAGE_STATUS.RECEIVED,
                  content: sanitizeInput(messageContent),
                  metadata: {
                    ...msg.metadata,
                    totalTokens: data.data.total_tokens || (data.data.prompt_tokens + data.data.completion_tokens),
                    responseTime: data.data.response_time_ms,
                    model: data.data.llm_model,
                    costEstimate: data.data.cost_estimate || 0,
                    sources: data.data.sources || [],
                    totalChunks: data.data.total_chunks || 0,
                    processingDuration: processingDuration,
                    promptTokens: data.data.prompt_tokens,
                    completionTokens: data.data.completion_tokens,
                    reconciled: true
                  }
                }
              : msg
          ));
          
          // Skip creating new message since we reconciled
          return;
        }
      }
      
      // Create AI response message from backend data (flexible structure handling)
      if (data.data && messageContent) {
        // Check if message already exists (streaming case)
        const existingMessage = messages.find(msg => msg.id === serverMessageId);
        
        console.log('📝 [Chat] Creating/updating AI message:', {
          messageId: serverMessageId,
          existingMessage: !!existingMessage,
          action: existingMessage ? 'update' : 'create',
          contentLength: messageContent.length
        });
        
        if (existingMessage) {
          console.log('📝 [Chat] Updating existing message (streaming case)');
          // Update existing message metadata for streaming case
          setMessages(prev => prev.map(msg => 
            msg.id === serverMessageId 
              ? { 
                  ...msg, 
                  status: MESSAGE_STATUS.RECEIVED,
                  metadata: {
                    ...msg.metadata,
                    streaming: false,
                    totalTokens: data.data.total_tokens || (data.data.prompt_tokens + data.data.completion_tokens),
                    responseTime: data.data.response_time_ms,
                    model: data.data.llm_model,
                    costEstimate: data.data.cost_estimate || 0, // Default if missing
                    sources: data.data.sources || [], // Default if missing
                    totalChunks: data.data.total_chunks || 0, // Default if missing
                    processingDuration: processingDuration,
                    promptTokens: data.data.prompt_tokens,
                    completionTokens: data.data.completion_tokens
                  }
                }
              : msg
          ));
        } else {
          console.log('📝 [Chat] Creating new message (non-streaming case)');
          // Create new message for non-streaming case
          const aiMessage = {
            id: serverMessageId,
            content: sanitizeInput(messageContent),
            role: 'assistant',
            timestamp: data.data.created_at ? new Date(data.data.created_at * 1000).toISOString() : new Date().toISOString(),
            status: MESSAGE_STATUS.RECEIVED,
            metadata: {
              streaming: false,
              totalTokens: data.data.total_tokens || (data.data.prompt_tokens + data.data.completion_tokens),
              responseTime: data.data.response_time_ms,
              model: data.data.llm_model,
              costEstimate: data.data.cost_estimate || 0, // Default if missing
              sources: data.data.sources || [], // Default if missing
              totalChunks: data.data.total_chunks || 0, // Default if missing  
              processingDuration: processingDuration,
              promptTokens: data.data.prompt_tokens,
              completionTokens: data.data.completion_tokens
            }
          };
          
          console.log('📝 [Chat] Adding NEW AI message to UI:', {
            messageId: aiMessage.id,
            contentLength: aiMessage.content.length,
            role: aiMessage.role,
            status: aiMessage.status,
            totalMessagesAfter: messages.length + 1
          });
          
          setMessages(prev => {
            const newMessages = [...prev, aiMessage];
            console.log('✅ [Chat] Messages updated - total count:', newMessages.length);
            return newMessages;
          });
          
          // Persist message if enabled
          if (chatConfig.enablePersistence) {
            sessionRef.current.addChatMessage(aiMessage);
          }
        }
        
        // Track performance
        if (chatConfig.enablePerformanceTracking) {
          performanceRef.current.trackChatWidget('ai_response_received', data.data.response_time_ms);
        }
      } else {
        console.warn('⚠️ [Chat] Invalid response_complete data structure:', data);
      }
    };

    // ✅ NEW: Handle processing started
    const handleProcessingStarted = (data) => {
      if (isUnmountedRef.current) return;
      
      console.log('⚙️ [Chat] AI processing started', data);
      
      // ✅ FIX: Get messageId from correct location in backend data structure
      const messageId = data.data?.message_id || data.messageId;
      
      // ✅ FIX: Don't start timeout if messageId is undefined
      if (!messageId) {
        console.warn('⚠️ [Chat] Processing event missing messageId, cannot track timeout');
        console.warn('⚠️ [DEBUG] Processing data structure:', data);
        return;
      }
      
      const processingStartTime = data.processingStartTime || Date.now();
      
      // Set AI processing state
      setAiProcessingState({
        isProcessing: true,
        messageId: messageId,
        startTime: processingStartTime,
        processingTimeout: null
      });
      
      setIsLoading(true);
      
      // Set processing timeout (30 seconds)
      processingTimeoutRef.current = setTimeout(() => {
        if (!isUnmountedRef.current) {
          console.warn('⏰ [Chat] AI processing timeout for messageId:', messageId);
          setErrorState(prev => ({
            ...prev,
            processingError: {
              type: 'processing_timeout',
              message: 'AI processing is taking longer than expected',
              messageId: messageId,
              timeout: 30000
            }
          }));
          setAiProcessingState(prev => ({ ...prev, isProcessing: false }));
          setIsLoading(false);
        }
      }, 30000); // 30 second timeout
      
      // Update message status if we have the message
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, status: 'processing', processingStarted: processingStartTime }
          : msg
      ));
    };

    // ✅ NEW: Handle message received confirmation
    const handleMessageReceived = (data) => {
      if (isUnmountedRef.current) return;
      
      console.log('✅ [Chat] Message received confirmation', data);
      
      // Update message status to confirmed/delivered if we have the message ID
      if (data.data && data.data.message_id) {
        setMessages(prev => prev.map(msg => 
          msg.id === data.data.message_id 
            ? { ...msg, status: MESSAGE_STATUS.DELIVERED }
            : msg
        ));
      }
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
    // ✅ DEBUG: Add identification to handler registration
    console.log('🔗 [Chat] Registering handleResponseComplete for response_complete event', {
      handlerName: 'handleResponseComplete',
      handlerType: typeof handleResponseComplete,
      timestamp: Date.now()
    });
    wsManager.on('response_complete', handleResponseComplete);
    wsManager.on('chatResponse', handleMessage); // ✅ CRITICAL: Add chat response handler
    wsManager.on('chat_response', handleMessage); // ✅ CRITICAL: Add platform event handler
    wsManager.on('chatResponseStreaming', handleResponseChunk); // ✅ CRITICAL: Add streaming handler
    wsManager.on('chat_response_streaming', handleResponseChunk); // ✅ CRITICAL: Add platform streaming handler
    // ✅ REMOVED: Duplicate handler - now handled by unified handleResponseComplete
    // wsManager.on('response_complete', handleAiResponseComplete); // REMOVED: Causing conflicts
    wsManager.on('processing', handleProcessingStarted); // AI processing started
    wsManager.on('aiProcessingStarted', handleProcessingStarted); // Alternative name
    wsManager.on('ai_processing_started', handleProcessingStarted); // Backend event name
    wsManager.on('messageReceived', handleMessageReceived); // Message received confirmation
    wsManager.on('message_received', handleMessageReceived); // Alternative name
    // ✅ NEW: Enhanced error handling
    wsManager.on('aiProcessingError', handleAiProcessingError); // AI processing errors
    wsManager.on('ai_processing_error', handleAiProcessingError); // Backend event name
    wsManager.on('rateLimitError', handleRateLimitError); // Rate limit errors
    wsManager.on('rate_limit_error', handleRateLimitError); // Backend event name
    wsManager.on('messageValidationError', handleMessageValidationError); // Validation errors
    wsManager.on('message_validation_error', handleMessageValidationError); // Backend event name
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
        // ✅ REMOVED: Duplicate handler removal - now handled by unified handleResponseComplete
        // wsManager.off('response_complete', handleAiResponseComplete); // REMOVED: Causing conflicts
        wsManager.off('processing', handleProcessingStarted);
        wsManager.off('aiProcessingStarted', handleProcessingStarted);
        wsManager.off('ai_processing_started', handleProcessingStarted);
        wsManager.off('messageReceived', handleMessageReceived);
        wsManager.off('message_received', handleMessageReceived);
        // ✅ NEW: Remove enhanced error handling events
        wsManager.off('aiProcessingError', handleAiProcessingError);
        wsManager.off('ai_processing_error', handleAiProcessingError);
        wsManager.off('rateLimitError', handleRateLimitError);
        wsManager.off('rate_limit_error', handleRateLimitError);
        wsManager.off('messageValidationError', handleMessageValidationError);
        wsManager.off('message_validation_error', handleMessageValidationError);
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
    
    } catch (error) {
      console.error('❌ [Chat] Error in WebSocket event handlers useEffect:', error);
      console.error('❌ [Chat] Error stack:', error.stack);
    }
  }); // ✅ DEBUG: Remove all dependencies to force re-execution on every mount
  */
  
  // ✅ DEBUG: Log when no-dependency useEffect runs  
  useEffect(() => {
    console.log('🔍 [Chat] No-dependency useEffect executed (should run on every render):', {
      mountCount: mountCountRef.current,
      timestamp: Date.now()
    });
  }); // No dependencies - runs on every render
  
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
      
      console.log('🧹 [Chat] Performing actual cleanup with context:', cleanupInfo);
      isUnmountedRef.current = true;
      
      // ✅ Phase 4: Reset initialization state on cleanup
      isInitializingRef.current = false;
      initializationPromiseRef.current = null;
      
      // ✅ FIX: Clear deduplication caches on cleanup
      console.log('🧹 [Chat] Clearing deduplication caches:', {
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
        console.warn('[Chat] Error during typing cleanup:', error);
      }
      
      // Enhanced WebSocket disconnect logic for StrictMode handling
      const wsManager = websocketRef.current;
      const shouldDisconnectWebSocket = wsManager && wsManager.disconnect && 
        !strictModeCleanupRef.current && 
        !isStrictModeRef.current && 
        process.env.NODE_ENV !== 'development';
      
      if (shouldDisconnectWebSocket) {
        console.log('🔌 [Chat] Disconnecting WebSocket due to component cleanup');
        wsManager.disconnect();
      } else {
        if (strictModeCleanupRef.current) {
          console.log('⚠️ [StrictMode] Skipping WebSocket disconnect - strict mode cleanup active');
        } else if (isStrictModeRef.current) {
          console.log('⚠️ [StrictMode] Skipping WebSocket disconnect - StrictMode detected');
        } else if (process.env.NODE_ENV === 'development') {
          console.log('⚠️ [Development] Preserving WebSocket connection in development mode');
        }
      }
    }
  }, [forceStopTyping]);
  
  // ✅ CRITICAL DEBUG: Calculate isReady with detailed logging
  const calculatedIsReady = connectionState === CHAT_STATES.READY && isConnectionReady;
  
  // Debug logging for isReady calculation (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 [DEBUG] isReady calculation:', {
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