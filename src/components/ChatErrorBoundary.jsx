// src/components/ChatErrorBoundary.jsx
import React from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { AlertTriangle, RefreshCw, MessageCircle, X } from 'lucide-react';
import { logError, ERROR_TYPES, ERROR_SEVERITY, MIPTechError } from '../utils/errorHandler';

/**
 * Error fallback component for chat widget
 */
const ChatErrorFallback = ({ 
  error, 
  resetErrorBoundary,
  onClose,
  title = "Chat Unavailable",
  position = "bottom-right"
}) => {
  const handleRetry = () => {
    // Log retry attempt
    logError(new MIPTechError(
      'User attempted to retry after error boundary',
      ERROR_TYPES.SYSTEM,
      ERROR_SEVERITY.LOW,
      { originalError: error?.message }
    ));
    
    resetErrorBoundary();
  };
  
  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      // If no close handler, hide the error display
      const errorElement = document.getElementById('chat-error-boundary');
      if (errorElement) {
        errorElement.style.display = 'none';
      }
    }
  };
  
  const handleReportError = () => {
    const errorDetails = {
      message: error?.message,
      stack: error?.stack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    
    // Copy error details to clipboard
    navigator.clipboard?.writeText(JSON.stringify(errorDetails, null, 2))
      .then(() => {
        alert('Error details copied to clipboard. Please share this with our support team.');
      })
      .catch(() => {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = JSON.stringify(errorDetails, null, 2);
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        alert('Error details copied to clipboard. Please share this with our support team.');
      });
  };
  
  // Position classes
  const positionClasses = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4'
  };
  
  const positionClass = positionClasses[position] || positionClasses['bottom-right'];
  
  return (
    <div
      id="chat-error-boundary"
      className={`fixed ${positionClass} z-50 w-80 max-w-sm`}
      role="alert"
      aria-live="assertive"
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-red-200 dark:border-red-800 overflow-hidden">
        {/* Header */}
        <div className="bg-red-50 dark:bg-red-900/20 px-4 py-3 border-b border-red-200 dark:border-red-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <h3 className="text-sm font-semibold text-red-800 dark:text-red-200">
                {title}
              </h3>
            </div>
            <button
              onClick={handleClose}
              className="p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-800 transition-colors"
              aria-label="Close error message"
            >
              <X className="w-4 h-4 text-red-500" />
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="p-4">
          <div className="flex items-start space-x-3">
            <MessageCircle className="w-8 h-8 text-gray-400 mt-1 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                Our chat service is temporarily unavailable. This could be due to:
              </p>
              
              <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1 mb-4">
                <li>• Network connectivity issues</li>
                <li>• Temporary service maintenance</li>
                <li>• Browser compatibility problems</li>
              </ul>
              
              {process.env.NODE_ENV === 'development' && error && (
                <div className="bg-gray-100 dark:bg-gray-700 rounded p-2 mb-3">
                  <p className="text-xs text-gray-600 dark:text-gray-400 font-mono">
                    {error.message}
                  </p>
                </div>
              )}
              
              <div className="flex flex-col space-y-2">
                <button
                  onClick={handleRetry}
                  className="flex items-center justify-center space-x-2 w-full px-3 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Try Again</span>
                </button>
                
                <button
                  onClick={() => window.location.reload()}
                  className="w-full px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
                >
                  Refresh Page
                </button>
                
                <button
                  onClick={handleReportError}
                  className="w-full px-3 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                >
                  Report Error
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="bg-gray-50 dark:bg-gray-800 px-4 py-2 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Need help? Contact our support team
          </p>
        </div>
      </div>
    </div>
  );
};

/**
 * Error boundary configuration
 */
const createErrorBoundaryConfig = (options = {}) => {
  return {
    fallbackRender: ({ error, resetErrorBoundary }) => (
      <ChatErrorFallback
        error={error}
        resetErrorBoundary={resetErrorBoundary}
        onClose={options.onClose}
        title={options.title}
        position={options.position}
      />
    ),
    onError: (error, errorInfo) => {
      // Log error for monitoring
      const chatError = new MIPTechError(
        `Chat widget error: ${error.message}`,
        ERROR_TYPES.SYSTEM,
        ERROR_SEVERITY.HIGH,
        {
          originalError: error.message,
          componentStack: errorInfo.componentStack,
          errorBoundary: true,
          userAgent: navigator.userAgent,
          url: window.location.href
        }
      );
      
      logError(chatError);
      
      // Send to external error reporting service
      if (window.Sentry) {
        window.Sentry.captureException(error, {
          contexts: {
            react: {
              componentStack: errorInfo.componentStack
            }
          },
          tags: {
            component: 'ChatWidget',
            errorBoundary: true
          }
        });
      }
      
      // Send to analytics
      if (window.gtag) {
        window.gtag('event', 'exception', {
          description: error.message,
          fatal: true,
          custom_map: {
            component: 'ChatWidget',
            error_type: 'react_error_boundary'
          }
        });
      }
      
      // Call custom error handler if provided
      if (options.onError) {
        options.onError(error, errorInfo);
      }
    },
    onReset: (details) => {
      // Log recovery attempt
      logError(new MIPTechError(
        'Chat widget error boundary reset',
        ERROR_TYPES.SYSTEM,
        ERROR_SEVERITY.LOW,
        { resetReason: details.reason }
      ));
      
      // Call custom reset handler if provided
      if (options.onReset) {
        options.onReset(details);
      }
    }
  };
};

/**
 * Chat Error Boundary Component
 */
const ChatErrorBoundary = ({ 
  children, 
  onError,
  onReset,
  onClose,
  title = "Chat Unavailable",
  position = "bottom-right",
  resetOnPropsChange = true,
  resetKeys = [],
  ...props 
}) => {
  const config = createErrorBoundaryConfig({
    onError,
    onReset,
    onClose,
    title,
    position
  });
  
  return (
    <ErrorBoundary
      {...config}
      resetOnPropsChange={resetOnPropsChange}
      resetKeys={resetKeys}
      {...props}
    >
      {children}
    </ErrorBoundary>
  );
};

/**
 * Higher-order component for wrapping components with error boundary
 */
export const withChatErrorBoundary = (Component, errorBoundaryOptions = {}) => {
  const WrappedComponent = (props) => (
    <ChatErrorBoundary {...errorBoundaryOptions}>
      <Component {...props} />
    </ChatErrorBoundary>
  );
  
  WrappedComponent.displayName = `withChatErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
};

/**
 * Hook for handling errors in functional components
 */
export const useChatErrorHandler = () => {
  const [error, setError] = React.useState(null);
  
  const handleError = React.useCallback((error, errorInfo = {}) => {
    const chatError = new MIPTechError(
      error.message || 'An error occurred',
      ERROR_TYPES.SYSTEM,
      ERROR_SEVERITY.MEDIUM,
      {
        originalError: error.message,
        ...errorInfo
      }
    );
    
    logError(chatError);
    setError(chatError);
  }, []);
  
  const clearError = React.useCallback(() => {
    setError(null);
  }, []);
  
  const retryWithErrorHandling = React.useCallback(async (operation) => {
    try {
      clearError();
      return await operation();
    } catch (error) {
      handleError(error);
      throw error;
    }
  }, [handleError, clearError]);
  
  return {
    error,
    handleError,
    clearError,
    retryWithErrorHandling
  };
};

/**
 * Simplified error boundary for basic use cases
 */
export const SimpleChatErrorBoundary = ({ children, onError }) => {
  return (
    <ErrorBoundary
      fallbackRender={({ error, resetErrorBoundary }) => (
        <div className="fixed bottom-4 right-4 z-50 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded max-w-sm">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <div>
              <h3 className="font-bold text-sm">Chat Error</h3>
              <p className="text-xs mt-1">
                The chat service encountered an error. Please try refreshing the page.
              </p>
              <button
                onClick={resetErrorBoundary}
                className="mt-2 text-xs bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}
      onError={onError}
    >
      {children}
    </ErrorBoundary>
  );
};

export default ChatErrorBoundary;
export { ChatErrorFallback };