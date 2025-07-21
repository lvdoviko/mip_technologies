// src/components/ChatWidget.jsx
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { gsap } from 'gsap';
import { 
  MessageCircle, 
  Send, 
  X, 
  Minimize2, 
  Maximize2, 
  AlertCircle, 
  RefreshCw,
  Loader2,
  Shield,
  CheckCircle,
  XCircle,
  Clock,
  Zap,
  AlertTriangle
} from 'lucide-react';
import useChat, { MESSAGE_STATUS, CHAT_STATES } from '../hooks/useChat';
import useReducedMotion from '../hooks/useReducedMotion';
import { performanceMonitor } from '../services/performanceMonitor';
import { sanitizeInput } from '../utils/errorHandler';

/**
 * Widget positions
 */
const WIDGET_POSITIONS = {
  'bottom-right': 'bottom-4 right-4',
  'bottom-left': 'bottom-4 left-4',
  'top-right': 'top-4 right-4',
  'top-left': 'top-4 left-4'
};

/**
 * Widget sizes
 */
const WIDGET_SIZES = {
  compact: { width: 'w-72', height: 'h-80' },
  medium: { width: 'w-80', height: 'h-96' },
  large: { width: 'w-96', height: 'h-[32rem]' }
};

/**
 * Message status icons
 */
const MessageStatusIcon = ({ status }) => {
  switch (status) {
    case MESSAGE_STATUS.SENDING:
      return <Loader2 className="w-3 h-3 animate-spin text-blue-400" />;
    case MESSAGE_STATUS.SENT:
      return <CheckCircle className="w-3 h-3 text-green-400" />;
    case MESSAGE_STATUS.DELIVERED:
      return <CheckCircle className="w-3 h-3 text-green-500" />;
    case 'processing':
      return <Clock className="w-3 h-3 text-orange-400 animate-pulse" />;
    case MESSAGE_STATUS.FAILED:
      return <XCircle className="w-3 h-3 text-red-400" />;
    default:
      return null;
  }
};

/**
 * Connection status indicator
 */
const ConnectionStatus = ({ connectionState, isConnected }) => {
  const statusConfig = useMemo(() => {
    switch (connectionState) {
      case CHAT_STATES.CONNECTED:
        return { color: 'bg-green-400', text: 'Connected', pulse: false };
      case CHAT_STATES.READY:
        return { color: 'bg-green-500', text: 'Ready', pulse: false };
      case CHAT_STATES.CONNECTING:
        return { color: 'bg-yellow-400', text: 'Connecting...', pulse: true };
      case CHAT_STATES.RECONNECTING:
        return { color: 'bg-orange-400', text: 'Reconnecting...', pulse: true };
      case CHAT_STATES.FAILED:
        return { color: 'bg-red-400', text: 'Connection failed', pulse: false };
      default:
        return { color: 'bg-gray-400', text: 'Disconnected', pulse: false };
    }
  }, [connectionState]);

  return (
    <div className="flex items-center space-x-2">
      <div className={`w-2 h-2 rounded-full ${statusConfig.color} ${statusConfig.pulse ? 'animate-pulse' : ''}`} />
      <span className="text-xs font-medium">{statusConfig.text}</span>
    </div>
  );
};

/**
 * Typing indicator component
 */
const TypingIndicator = ({ isVisible, prefersReducedMotion }) => {
  if (!isVisible) return null;
  
  return (
    <div className="flex justify-start mb-2">
      <div className="bg-gray-200 dark:bg-gray-700 px-4 py-2 rounded-2xl max-w-xs">
        <div className="flex space-x-1">
          <div 
            className={`w-2 h-2 bg-gray-400 rounded-full ${prefersReducedMotion ? '' : 'animate-bounce'}`}
            style={{ animationDelay: '0ms' }}
          />
          <div 
            className={`w-2 h-2 bg-gray-400 rounded-full ${prefersReducedMotion ? '' : 'animate-bounce'}`}
            style={{ animationDelay: '150ms' }}
          />
          <div 
            className={`w-2 h-2 bg-gray-400 rounded-full ${prefersReducedMotion ? '' : 'animate-bounce'}`}
            style={{ animationDelay: '300ms' }}
          />
        </div>
      </div>
    </div>
  );
};

/**
 * AI Processing indicator component
 */
const AiProcessingIndicator = ({ isVisible, startTime, prefersReducedMotion }) => {
  const [elapsed, setElapsed] = useState(0);
  
  useEffect(() => {
    if (!isVisible || !startTime) return;
    
    const interval = setInterval(() => {
      setElapsed(Date.now() - startTime);
    }, 100);
    
    return () => clearInterval(interval);
  }, [isVisible, startTime]);
  
  if (!isVisible) return null;
  
  const seconds = Math.floor(elapsed / 1000);
  
  return (
    <div className="flex justify-center mb-2">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 px-3 py-2 rounded-full">
        <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400">
          <Zap className={`w-4 h-4 ${prefersReducedMotion ? '' : 'animate-pulse'}`} />
          <span className="text-xs font-medium">
            AI is processing{seconds > 0 ? ` (${seconds}s)` : '...'}
          </span>
        </div>
      </div>
    </div>
  );
};

/**
 * Message component
 */
const Message = ({ message, onRetry, prefersReducedMotion, showPerformanceInfo = false }) => {
  const messageRef = useRef(null);
  const isUser = message.role === 'user';
  
  // Animate message entrance
  useEffect(() => {
    if (messageRef.current && !prefersReducedMotion) {
      gsap.fromTo(messageRef.current, 
        { opacity: 0, y: 20, scale: 0.8 },
        { opacity: 1, y: 0, scale: 1, duration: 0.3, ease: 'back.out(1.7)' }
      );
    }
  }, [prefersReducedMotion]);
  
  const handleRetry = useCallback(() => {
    if (onRetry && message.status === MESSAGE_STATUS.FAILED) {
      onRetry(message.id);
    }
  }, [onRetry, message.id, message.status]);
  
  return (
    <div 
      ref={messageRef}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}
    >
      <div className={`max-w-[85%] ${isUser ? 'order-2' : 'order-1'}`}>
        <div
          className={`
            px-4 py-2 rounded-2xl shadow-sm
            ${isUser 
              ? 'bg-blue-600 text-white rounded-br-sm' 
              : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-sm'
            }
            ${message.status === MESSAGE_STATUS.SENDING ? 'opacity-70' : ''}
            ${message.status === MESSAGE_STATUS.FAILED ? 'border-2 border-red-300' : ''}
          `}
        >
          <p className="text-sm leading-relaxed break-words">{message.content}</p>
          
          {/* Message metadata */}
          <div className={`flex items-center justify-between mt-1 ${isUser ? 'text-blue-100' : 'text-gray-500'}`}>
            <span className="text-xs">
              {new Date(message.timestamp).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </span>
            
            <div className="flex items-center space-x-1">
              <MessageStatusIcon status={message.status} />
              
              {message.status === MESSAGE_STATUS.FAILED && (
                <button
                  onClick={handleRetry}
                  className="ml-1 p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900 transition-colors"
                  title="Retry message"
                >
                  <RefreshCw className="w-3 h-3 text-red-500" />
                </button>
              )}
            </div>
          </div>
          
          {/* Performance info for AI responses */}
          {showPerformanceInfo && message.metadata && !isUser && (
            <div className="mt-1 pt-1 border-t border-gray-200 dark:border-gray-700">
              <div className="text-xs text-gray-400 dark:text-gray-500 space-y-1">
                {message.metadata.responseTime && (
                  <div>Response: {message.metadata.responseTime}ms</div>
                )}
                {message.metadata.processingDuration && (
                  <div>Processing: {Math.floor(message.metadata.processingDuration / 1000)}s</div>
                )}
                {message.metadata.totalTokens && (
                  <div>Tokens: {message.metadata.totalTokens}</div>
                )}
                {message.metadata.model && (
                  <div>Model: {message.metadata.model}</div>
                )}
                {message.metadata.costEstimate && (
                  <div>Cost: ${message.metadata.costEstimate.toFixed(4)}</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Enhanced error display component
 */
const ErrorDisplay = ({ error, errorState, onRetry, onDismiss }) => {
  // Display different error types with different styling
  const renderError = (errorData, type, bgColor, borderColor, textColor, icon) => {
    if (!errorData) return null;
    
    return (
      <div className={`${bgColor} border ${borderColor} rounded-lg p-3 mb-2`}>
        <div className="flex items-start space-x-2">
          {icon}
          <div className="flex-1">
            <p className={`text-sm ${textColor}`}>
              {errorData.message || 'An error occurred'}
            </p>
            {errorData.type && (
              <p className={`text-xs ${textColor} opacity-70 mt-1`}>
                Type: {errorData.type}
              </p>
            )}
            {errorData.retryAfter && (
              <p className={`text-xs ${textColor} opacity-70 mt-1`}>
                Retry after: {errorData.retryAfter}s
              </p>
            )}
          </div>
          <div className="flex items-center space-x-1">
            {onRetry && (
              <button
                onClick={() => onRetry(errorData)}
                className={`p-1 rounded-full hover:bg-opacity-20 hover:bg-gray-500 transition-colors`}
                title="Retry"
              >
                <RefreshCw className="w-3 h-3" />
              </button>
            )}
            {onDismiss && (
              <button
                onClick={() => onDismiss(type)}
                className={`p-1 rounded-full hover:bg-opacity-20 hover:bg-gray-500 transition-colors`}
                title="Dismiss"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // If we have the new enhanced error state, use that
  if (errorState) {
    return (
      <div>
        {/* Connection errors */}
        {renderError(
          errorState.connectionError,
          'connection',
          'bg-red-50 dark:bg-red-900/20',
          'border-red-200 dark:border-red-800',
          'text-red-800 dark:text-red-200',
          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
        )}
        
        {/* AI Processing errors */}
        {renderError(
          errorState.processingError,
          'processing',
          'bg-orange-50 dark:bg-orange-900/20',
          'border-orange-200 dark:border-orange-800',
          'text-orange-800 dark:text-orange-200',
          <Zap className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
        )}
        
        {/* Rate limit errors */}
        {renderError(
          errorState.rateLimitError,
          'rate_limit',
          'bg-yellow-50 dark:bg-yellow-900/20',
          'border-yellow-200 dark:border-yellow-800',
          'text-yellow-800 dark:text-yellow-200',
          <Clock className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
        )}
        
        {/* Validation errors */}
        {renderError(
          errorState.validationError,
          'validation',
          'bg-purple-50 dark:bg-purple-900/20',
          'border-purple-200 dark:border-purple-800',
          'text-purple-800 dark:text-purple-200',
          <AlertTriangle className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
        )}
      </div>
    );
  }
  
  // Fallback to old error display for backward compatibility
  if (!error) return null;
  
  return (
    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-3">
      <div className="flex items-start space-x-2">
        <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm text-red-800 dark:text-red-200">
            {error.message || 'An error occurred'}
          </p>
          {error.type && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
              Error type: {error.type}
            </p>
          )}
        </div>
        <div className="flex space-x-1">
          {onRetry && (
            <button
              onClick={onRetry}
              className="p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-800 transition-colors"
              title="Retry"
            >
              <RefreshCw className="w-3 h-3 text-red-500" />
            </button>
          )}
          <button
            onClick={onDismiss}
            className="p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-800 transition-colors"
            title="Dismiss"
          >
            <X className="w-3 h-3 text-red-500" />
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Chat input component
 */
const ChatInput = ({ 
  onSendMessage, 
  isDisabled, 
  onTyping, 
  onStopTyping,
  onConnectionTrigger,
  maxLength = 4000,
  placeholder = "Type your message...",
  connectionState,
  isConnected,
  isReady,
  isConnecting
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const inputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  
  // Auto-focus input when chat opens
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);
  
  const handleInputChange = useCallback((e) => {
    const value = e.target.value;
    const prevValue = inputValue;
    setInputValue(value);
    
    // ✅ PRIMARY TRIGGER: Connection on first keystroke
    if (value.length === 1 && prevValue.length === 0 && onConnectionTrigger) {
      console.log('🚀 [ChatInput] First keystroke detected - triggering connection');
      onConnectionTrigger();
    }
    
    // Handle typing indicator
    if (value && !isComposing) {
      onTyping?.();
      
      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Set new timeout to stop typing
      typingTimeoutRef.current = setTimeout(() => {
        onStopTyping?.();
      }, 1000);
    } else if (!value) {
      onStopTyping?.();
    }
  }, [inputValue, isComposing, onTyping, onStopTyping, onConnectionTrigger]);
  
  const handleSubmit = useCallback(() => {
    const trimmedValue = inputValue.trim();
    
    if (!trimmedValue || isDisabled) return;
    
    const sanitizedValue = sanitizeInput(trimmedValue);
    
    // Clear input immediately for better UX
    setInputValue('');
    onStopTyping?.();
    
    // Clear typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    onSendMessage?.(sanitizedValue);
  }, [inputValue, isDisabled, onSendMessage, onStopTyping]);
  
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);
  
  const handleCompositionStart = useCallback(() => {
    setIsComposing(true);
  }, []);
  
  const handleCompositionEnd = useCallback(() => {
    setIsComposing(false);
  }, []);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);
  
  const characterCount = inputValue.length;
  const isOverLimit = characterCount > maxLength;
  
  // Smart placeholder based on connection state
  const getSmartPlaceholder = () => {
    if (isConnecting) {
      return "Connecting...";
    }
    if (!isConnected && connectionState === 'disconnected') {
      return "Start typing to connect...";
    }
    if (isConnected && !isReady) {
      return "Platform initializing...";
    }
    if (isConnected && isReady) {
      return placeholder;
    }
    return placeholder;
  };
  
  return (
    <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
      <div className="flex items-end space-x-2">
        <div className="flex-1 relative">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
            placeholder={getSmartPlaceholder()}
            disabled={isDisabled}
            rows={1}
            className={`
              w-full px-3 py-2 pr-16 text-sm border rounded-lg resize-none
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
              disabled:opacity-50 disabled:cursor-not-allowed
              dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400
              ${isOverLimit ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'}
            `}
            style={{ 
              minHeight: '40px',
              maxHeight: '120px',
              overflowY: inputValue.length > 100 ? 'auto' : 'hidden'
            }}
          />
          
          {/* Character count */}
          <div className={`
            absolute bottom-1 right-1 text-xs
            ${isOverLimit ? 'text-red-500' : 'text-gray-400'}
          `}>
            {characterCount}/{maxLength}
          </div>
        </div>
        
        <button
          onClick={handleSubmit}
          disabled={!inputValue.trim() || isDisabled || isOverLimit}
          className={`
            p-2 rounded-lg transition-all duration-200
            ${(!inputValue.trim() || isDisabled || isOverLimit)
              ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md'
            }
          `}
          aria-label="Send message"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

/**
 * Main ChatWidget component
 */
const ChatWidget = ({ 
  position = 'bottom-right',
  size = 'medium',
  theme = 'auto',
  primaryColor = '#2563eb',
  title = 'MIPTech AI Assistant',
  placeholder = 'Type your message...',
  className = '',
  enableSounds = false,
  enableNotifications = false,
  maxMessageLength = 4000,
  showPerformanceIndicator = false,
  onChatOpen,
  onChatClose,
  onMessageSent,
  onMessageReceived,
  onError,
  ...props
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  const prefersReducedMotion = useReducedMotion();
  
  // Widget refs
  const widgetRef = useRef(null);
  const chatRef = useRef(null);
  const messagesRef = useRef(null);
  const toggleButtonRef = useRef(null);
  
  // Chat hook
  const {
    connectionState,
    isConnected,
    isReady,
    isConnecting,
    currentChat,
    messages,
    isLoading,
    error,
    // isTyping: isUserTyping, // Available but not used in current UI
    typingUsers,
    performanceMetrics,
    initializeChat,
    sendMessage,
    startTyping,
    stopTyping,
    retryMessage,
    canSendMessage,
    // ✅ NEW: Enhanced states from updated hook
    aiProcessingState,
    isAiProcessing,
    errorState,
    hasProcessingError
  } = useChat({
    autoConnect: false,
    enablePerformanceTracking: showPerformanceIndicator,
    enableTypingIndicator: true,
    maxMessageLength
  });
  
  // Detect dark mode
  useEffect(() => {
    if (theme === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      setIsDarkMode(mediaQuery.matches);
      
      const handleChange = (e) => setIsDarkMode(e.matches);
      mediaQuery.addEventListener('change', handleChange);
      
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      setIsDarkMode(theme === 'dark');
    }
  }, [theme]);
  
  // Handle AI processing timeout notifications
  useEffect(() => {
    if (hasProcessingError && errorState.processingError?.type === 'processing_timeout') {
      console.log('⚠️ [ChatWidget] AI processing timeout detected');
      
      if (enableNotifications && 'Notification' in window) {
        new Notification('AI Processing Timeout', {
          body: 'AI is taking longer than expected to respond.',
          icon: '/icon-192x192.png' // Assumes you have an icon
        });
      }
    }
  }, [hasProcessingError, errorState.processingError, enableNotifications]);
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesRef.current) {
      const scrollContainer = messagesRef.current;
      const isNearBottom = scrollContainer.scrollHeight - scrollContainer.scrollTop <= scrollContainer.clientHeight + 100;
      
      if (isNearBottom) {
        if (prefersReducedMotion) {
          scrollContainer.scrollTop = scrollContainer.scrollHeight;
        } else {
          gsap.to(scrollContainer, {
            scrollTop: scrollContainer.scrollHeight,
            duration: 0.3,
            ease: 'power2.out'
          });
        }
      }
    }
  }, [messages, prefersReducedMotion]);
  
  // Initialize chat when user demonstrates intent (lazy connection strategy)
  useEffect(() => {
    console.log(`🔍 [ChatWidget] useEffect triggered - isOpen: ${isOpen}, currentChat: ${!!currentChat}`);
    
    // ✅ LAZY CONNECTION: Only connect when user actually wants to chat
    // Connection will be triggered by:
    // 1. User starts typing (primary trigger)
    // 2. User clicks send (fallback trigger)
    // 3. Chat open + 3 second delay (safety trigger)
    
    if (isOpen && !currentChat && !isConnecting) {
      console.log('🔄 [ChatWidget] Chat opened - ready for user interaction (no auto-connect)');
      onChatOpen?.();
      
      // Safety trigger: Auto-connect after 3 seconds if user hasn't interacted
      const safetyConnectTimer = setTimeout(() => {
        if (!currentChat && !isConnecting && isOpen) {
          console.log('🔄 [ChatWidget] Safety trigger - connecting after 3s delay');
          performanceMonitor.startTimer('chat_widget_load');
          initializeChat()
            .then(() => {
              console.log('✅ [ChatWidget] Safety connection successful');
              performanceMonitor.endTimer('chat_widget_load');
            })
            .catch((error) => {
              console.error('❌ [ChatWidget] Safety connection failed:', error);
              performanceMonitor.endTimer('chat_widget_load');
              onError?.(error);
            });
        }
      }, 3000);
      
      return () => clearTimeout(safetyConnectTimer);
    }
  }, [isOpen, currentChat, initializeChat, onChatOpen, onError, isConnecting]);
  
  // Debug: Track ChatWidget mount
  useEffect(() => {
    console.log('🔧 [ChatWidget] Component mounted');
    return () => {
      console.log('🔧 [ChatWidget] Component unmounting');
    };
  }, []);

  // Handle chat open/close animations
  const handleToggle = useCallback(() => {
    console.log(`🎯 [ChatWidget] Toggle clicked - current state: isOpen=${isOpen}`);
    if (isOpen) {
      if (!prefersReducedMotion && chatRef.current) {
        gsap.to(chatRef.current, {
          opacity: 0,
          scale: 0.8,
          y: 20,
          duration: 0.2,
          ease: 'power2.in',
          onComplete: () => {
            setIsOpen(false);
            onChatClose?.();
          }
        });
      } else {
        setIsOpen(false);
        onChatClose?.();
      }
    } else {
      setIsOpen(true);
      setIsMinimized(false);
    }
  }, [isOpen, prefersReducedMotion, onChatClose]);
  
  // Handle minimize/maximize
  const handleMinimize = useCallback(() => {
    const newMinimized = !isMinimized;
    setIsMinimized(newMinimized);
    
    if (!prefersReducedMotion && chatRef.current) {
      gsap.to(chatRef.current, {
        height: newMinimized ? '60px' : 'auto',
        duration: 0.3,
        ease: 'power2.inOut'
      });
    }
  }, [isMinimized, prefersReducedMotion]);
  
  // Handle entrance animation
  useEffect(() => {
    if (isOpen && !prefersReducedMotion && chatRef.current) {
      gsap.fromTo(chatRef.current, 
        { opacity: 0, scale: 0.8, y: 20 },
        { opacity: 1, scale: 1, y: 0, duration: 0.3, ease: 'back.out(1.7)' }
      );
    }
  }, [isOpen, prefersReducedMotion]);
  
  // State for lazy connection management
  const [isConnectionTriggered, setIsConnectionTriggered] = useState(false);
  const connectionTriggeredRef = useRef(false);

  // Handle connection trigger on user typing (primary trigger)
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

  // Handle message sending with fallback connection trigger
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
  
  // Handle message retry
  const handleRetryMessage = useCallback(async (messageId) => {
    try {
      await retryMessage(messageId);
    } catch (error) {
      onError?.(error);
    }
  }, [retryMessage, onError]);
  
  // Handle error dismissal
  const handleDismissError = useCallback((errorType) => {
    // Note: We can't directly clear errorState from the hook here since it's managed internally
    // The errors will be cleared when the conditions that caused them are resolved
    // This is just for UI feedback purposes
    console.log(`Dismissing error type: ${errorType}`);
    
    // For now, we'll rely on the hook's internal error clearing logic
    // Future enhancement: Add a clearError function to the useChat hook if needed
  }, []);
  
  // Handle retry connection
  const handleRetryConnection = useCallback(() => {
    initializeChat().catch(onError);
  }, [initializeChat, onError]);
  
  // Get position classes
  const positionClasses = useMemo(() => {
    return WIDGET_POSITIONS[position] || WIDGET_POSITIONS['bottom-right'];
  }, [position]);
  
  // Get size classes
  const sizeClasses = useMemo(() => {
    return WIDGET_SIZES[size] || WIDGET_SIZES.medium;
  }, [size]);
  
  // Get theme classes
  const themeClasses = useMemo(() => {
    return isDarkMode ? 'dark' : '';
  }, [isDarkMode]);
  
  return (
    <div 
      ref={widgetRef}
      className={`fixed ${positionClasses} z-50 ${themeClasses} ${className}`}
      style={{ '--primary-color': primaryColor }}
      {...props}
    >
      {/* Chat Toggle Button */}
      {!isOpen && (
        <button
          ref={toggleButtonRef}
          onClick={handleToggle}
          className={`
            group relative p-4 rounded-full shadow-lg transition-all duration-300
            bg-blue-600 hover:bg-blue-700 text-white
            ${prefersReducedMotion ? '' : 'hover:scale-110 active:scale-95'}
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          `}
          style={{ backgroundColor: primaryColor }}
          aria-label="Open chat"
        >
          <MessageCircle className="w-6 h-6" />
          
          {/* Notification badge */}
          {!isConnected && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
          )}
          
          {/* Ripple effect */}
          {!prefersReducedMotion && (
            <div className="absolute inset-0 rounded-full bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-300" />
          )}
        </button>
      )}
      
      {/* Chat Widget */}
      {isOpen && (
        <div
          ref={chatRef}
          className={`
            ${sizeClasses.width} ${isMinimized ? 'h-16' : sizeClasses.height}
            bg-white dark:bg-gray-900 rounded-xl shadow-2xl
            border border-gray-200 dark:border-gray-700
            flex flex-col overflow-hidden
            ${prefersReducedMotion ? '' : 'transition-all duration-300'}
          `}
        >
          {/* Header */}
          <div className="bg-blue-600 text-white p-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Shield className="w-5 h-5" />
              <div>
                <h3 className="font-semibold text-sm">{title}</h3>
                <ConnectionStatus 
                  connectionState={connectionState} 
                  isConnected={isConnected} 
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-1">
              {/* Performance indicator */}
              {showPerformanceIndicator && (
                <div className="text-xs bg-blue-700 px-2 py-1 rounded">
                  {Math.round(performanceMetrics.averageResponseTime)}ms
                </div>
              )}
              
              <button
                onClick={handleMinimize}
                className="p-1 hover:bg-blue-700 rounded transition-colors"
                aria-label={isMinimized ? "Maximize chat" : "Minimize chat"}
              >
                {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
              </button>
              
              <button
                onClick={handleToggle}
                className="p-1 hover:bg-blue-700 rounded transition-colors"
                aria-label="Close chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {!isMinimized && (
            <>
              {/* Messages */}
              <div
                ref={messagesRef}
                className="flex-1 p-4 overflow-y-auto bg-gray-50 dark:bg-gray-800 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600"
              >
                {/* Error display */}
                <ErrorDisplay
                  error={error}
                  errorState={errorState}
                  onRetry={handleRetryConnection}
                  onDismiss={handleDismissError}
                />
                
                {/* Connection status */}
                {!isConnected && !error && (
                  <div className="text-center py-4">
                    <div className="text-gray-500 dark:text-gray-400 text-sm">
                      {isConnecting ? 
                        'Connecting to chat...' : 
                        isConnectionTriggered ? 'Initializing connection...' :
                        'Ready to chat'
                      }
                    </div>
                    {!isConnecting && !isConnectionTriggered && (
                      <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        Start typing to connect
                      </div>
                    )}
                  </div>
                )}
                
                {/* Messages */}
                {messages.map((message) => (
                  <Message
                    key={message.id}
                    message={message}
                    onRetry={handleRetryMessage}
                    prefersReducedMotion={prefersReducedMotion}
                    showPerformanceInfo={showPerformanceIndicator}
                  />
                ))}
                
                {/* Typing indicator */}
                <TypingIndicator
                  isVisible={typingUsers.length > 0}
                  prefersReducedMotion={prefersReducedMotion}
                />
                
                {/* AI Processing indicator */}
                <AiProcessingIndicator
                  isVisible={isAiProcessing}
                  startTime={aiProcessingState.startTime}
                  prefersReducedMotion={prefersReducedMotion}
                />
                
                {/* Loading indicator */}
                {isLoading && (
                  <div className="flex justify-center py-2">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                  </div>
                )}
              </div>
              
              {/* Input */}
              <ChatInput
                onSendMessage={handleSendMessage}
                isDisabled={!isReady || !canSendMessage}
                onTyping={startTyping} // Re-enabled: Backend now supports typing_start/typing_stop
                onStopTyping={stopTyping} // Re-enabled: Backend now supports typing_start/typing_stop
                onConnectionTrigger={handleConnectionTrigger}
                maxLength={maxMessageLength}
                placeholder={placeholder}
                connectionState={connectionState}
                isConnected={isConnected}
                isReady={isReady}
                isConnecting={isConnecting}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ChatWidget;