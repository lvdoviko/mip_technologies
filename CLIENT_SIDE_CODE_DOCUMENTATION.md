# MIPTech AI Platform - Client-Side Implementation Documentation

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Core Services](#core-services)
3. [React Components](#react-components)
4. [React Hooks](#react-hooks)
5. [Utilities](#utilities)
6. [Configuration](#configuration)
7. [Error Handling](#error-handling)
8. [Performance Monitoring](#performance-monitoring)
9. [Security Features](#security-features)
10. [Implementation Details](#implementation-details)

---

## Architecture Overview

The MIPTech AI Platform client-side implementation follows a modern React architecture with dependency injection, comprehensive error handling, and enterprise-grade patterns. The codebase is structured with clear separation of concerns:

```
src/
├── services/          # Core business logic and API clients
├── components/        # React UI components
├── hooks/            # Custom React hooks
├── utils/            # Shared utilities and helpers
└── .env              # Environment configuration
```

### Key Architectural Patterns

- **Dependency Injection**: All services support dependency injection for testability
- **Circuit Breaker Pattern**: Prevents cascading failures in API calls
- **Rate Limiting**: Controls API request frequency
- **Performance Monitoring**: Real-time tracking of Core Web Vitals
- **Error Boundaries**: Comprehensive error classification and recovery
- **Session Management**: Encrypted localStorage with automatic cleanup

---

## Core Services

### 1. MIPTech API Client (`src/services/miptechApi.js`)

The core API client provides communication with the MIPTech AI Platform backend.

#### Key Features
- Dependency injection pattern for testability
- Axios interceptors for request/response handling
- Tenant-based authentication with X-Tenant-ID headers
- Comprehensive error handling and retry mechanisms

#### Implementation Example
```javascript
export class MIPTechAPIClient {
  constructor(config, dependencies = {}) {
    this.config = createApiConfig(config);
    
    // Dependency injection for testing - MUST be set before createHttpClient()
    this.axios = dependencies.axios || axios;
    this.localStorage = dependencies.localStorage || localStorage;
    this.console = dependencies.console || console;
    
    // Create HTTP client after dependencies are set
    this.client = this.createHttpClient();
    this.setupInterceptors();
  }
```

#### Critical Fix Applied
The constructor was reordered to set dependencies before calling `createHttpClient()` to prevent the "can't access property 'create', this.axios is undefined" error.

#### API Methods
- `createChat(sessionId, visitorId, options)` - Initialize new chat session
- `sendMessage(chatId, content, options)` - Send message to chat
- `getChatHistory(chatId, options)` - Retrieve chat history
- `healthCheck()` - Check API health status

### 2. WebSocket Manager (`src/services/websocketManager.js`)

Manages real-time WebSocket connections with automatic reconnection and circuit breaker protection.

#### Key Features
- Circuit breaker pattern with configurable thresholds
- Exponential backoff retry strategy
- Event-driven architecture with EventEmitter
- Proper context binding for DOM APIs

#### Critical Fix Applied
Fixed setInterval brand-check error by binding to proper global scope:

```javascript
const globalScope = (typeof window !== 'undefined') 
                  ? window 
                  : (typeof global !== 'undefined') 
                    ? global 
                    : this;

this.setInterval = (deps.setInterval || globalScope.setInterval).bind(globalScope);
this.clearInterval = (deps.clearInterval || globalScope.clearInterval).bind(globalScope);
```

#### WebSocket Events
- `connected` - WebSocket connection established
- `disconnected` - WebSocket connection lost
- `message` - Incoming message received
- `typing` / `stop_typing` - Typing indicators
- `error` - Connection or protocol errors

### 3. Session Manager (`src/services/sessionManager.js`)

Manages user sessions with encrypted localStorage and automatic cleanup.

#### Key Features
- Basic encryption for session data (base64 + obfuscation)
- Automatic session expiration and cleanup
- Chat history persistence with size limits
- User preferences management

#### Session Structure
```javascript
{
  id: uuidv4(),
  visitorId: uuidv4(),
  createdAt: Date.now(),
  lastActivity: Date.now(),
  expiresAt: Date.now() + sessionTimeout,
  chatHistory: [],
  preferences: {
    theme: 'light',
    notifications: true,
    language: 'en',
    soundEnabled: true
  },
  metadata: {
    userAgent: string,
    initialUrl: string,
    referrer: string,
    timezone: string,
    screenResolution: string,
    colorDepth: number,
    language: string
  }
}
```

### 4. Performance Monitor (`src/services/performanceMonitor.js`)

Comprehensive performance monitoring with Web Vitals integration.

#### Key Features
- Core Web Vitals tracking (FCP, LCP, CLS, FID, TTFB)
- API response time monitoring
- WebSocket connection performance
- Memory usage tracking
- Network condition monitoring
- Bundle size analysis

#### Performance Thresholds
```javascript
export const PERFORMANCE_THRESHOLDS = {
  FCP: 1800,        // First Contentful Paint - 1.8s
  LCP: 2500,        // Largest Contentful Paint - 2.5s
  FID: 100,         // First Input Delay - 100ms
  CLS: 0.1,         // Cumulative Layout Shift - 0.1
  TTFB: 600,        // Time to First Byte - 600ms
  API_RESPONSE: 500,// API Response Time - 500ms
  WEBSOCKET_CONNECT: 2000, // WebSocket Connection - 2s
  CHAT_LOAD: 1000,  // Chat Widget Load - 1s
  MESSAGE_SEND: 300 // Message Send Time - 300ms
};
```

---

## React Components

### 1. ChatWidget (`src/components/ChatWidget.jsx`)

The main chat interface component with comprehensive UI features.

#### Key Features
- Responsive design with multiple size options
- GSAP animations with reduced motion support
- Real-time connection status indicator
- Message status tracking (sending, sent, failed)
- Typing indicators
- Error display with retry functionality
- Auto-scroll to latest messages

#### Component Structure
```jsx
const ChatWidget = ({ 
  position = 'bottom-right',
  size = 'medium',
  theme = 'auto',
  primaryColor = '#2563eb',
  title = 'MIPTech AI Assistant',
  placeholder = 'Type your message...',
  // ... other props
}) => {
  // Component implementation
};
```

#### Sub-components
- `MessageStatusIcon` - Shows message delivery status
- `ConnectionStatus` - Displays connection state with visual indicators
- `TypingIndicator` - Animated typing dots
- `Message` - Individual message bubble with metadata
- `ErrorDisplay` - Error messages with retry/dismiss actions
- `ChatInput` - Message input with character count and validation

### 2. Connection Test (`src/components/ConnectionTest.jsx`)

Debug component for testing API and WebSocket connections (only visible when `REACT_APP_DEBUG_API=true`).

#### Features
- API endpoint testing
- WebSocket connection testing
- Tenant configuration display
- Real-time connection status
- Performance metrics display

---

## React Hooks

### 1. useChat (`src/hooks/useChat.js`)

Core chat functionality hook with comprehensive state management.

#### Key Features
- Connection state management
- Message sending with optimistic updates
- Typing indicator support
- Performance tracking integration
- WebSocket event handling
- Automatic reconnection logic

#### Hook Configuration
```javascript
export const createChatConfig = (options = {}) => {
  return {
    autoConnect: options.autoConnect !== false,
    maxRetries: options.maxRetries || 3,
    retryDelay: options.retryDelay || 1000,
    messageTimeout: options.messageTimeout || 30000,
    typingTimeout: options.typingTimeout || 3000,
    maxMessageLength: options.maxMessageLength || 4000,
    enableTypingIndicator: options.enableTypingIndicator !== false,
    enablePersistence: options.enablePersistence !== false,
    enablePerformanceTracking: options.enablePerformanceTracking !== false
  };
};
```

#### Return Value Structure
```javascript
{
  // Connection state
  connectionState,
  isConnected,
  isConnecting,
  isReconnecting,
  
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
  messageCount,
  lastMessage,
  hasErrors,
  canSendMessage
}
```

### 2. useReducedMotion (`src/hooks/useReducedMotion.js`)

Accessibility hook that respects user's motion preferences.

```javascript
const useReducedMotion = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    
    const handleChange = (event) => setPrefersReducedMotion(event.matches);
    mediaQuery.addEventListener('change', handleChange);
    
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);
  
  return prefersReducedMotion;
};
```

---

## Utilities

### 1. Error Handler (`src/utils/errorHandler.js`)

Comprehensive error handling system with classification and sanitization.

#### Error Types
```javascript
export const ERROR_TYPES = {
  NETWORK: 'NETWORK',
  API: 'API',
  WEBSOCKET: 'WEBSOCKET',
  AUTHENTICATION: 'AUTHENTICATION',
  VALIDATION: 'VALIDATION',
  RATE_LIMIT: 'RATE_LIMIT',
  PERMISSION: 'PERMISSION',
  SYSTEM: 'SYSTEM',
  UNKNOWN: 'UNKNOWN'
};
```

#### Key Features
- XSS prevention with DOMPurify sanitization
- Custom `MIPTechError` class with structured data
- API error classification by HTTP status codes
- WebSocket error handling with close codes
- Circuit breaker pattern implementation
- Rate limiter with sliding window
- Retry mechanism with exponential backoff

#### Security Implementation
```javascript
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true
  });
};
```

---

## Configuration

### Environment Variables

#### Development (`.env`)
```bash
# API Configuration
REACT_APP_MIPTECH_API_URL=http://localhost:3001/api
REACT_APP_MIPTECH_WS_URL=ws://localhost:3001

# Authentication
REACT_APP_MIPTECH_TENANT_ID=miptech-company

# Debug Features
REACT_APP_DEBUG_API=true

# Performance
REACT_APP_ENABLE_PERFORMANCE_MONITORING=true
```

#### Production (`.env.production`)
```bash
# API Configuration
REACT_APP_MIPTECH_API_URL=https://api.miptechnologies.tech/api
REACT_APP_MIPTECH_WS_URL=wss://api.miptechnologies.tech

# Authentication
REACT_APP_MIPTECH_TENANT_ID=miptech-company

# Security
REACT_APP_DEBUG_API=false
REACT_APP_ENABLE_ANALYTICS=true

# Performance
REACT_APP_ENABLE_PERFORMANCE_MONITORING=true
```

---

## Error Handling

### 1. Error Classification System

Errors are automatically classified by type and severity:

```javascript
const handleApiError = (error, context = {}) => {
  let errorType = ERROR_TYPES.UNKNOWN;
  let severity = ERROR_SEVERITY.MEDIUM;
  let userMessage = 'An error occurred. Please try again.';
  
  if (error.response) {
    const { status } = error.response;
    
    switch (status) {
      case 401:
        errorType = ERROR_TYPES.AUTHENTICATION;
        severity = ERROR_SEVERITY.HIGH;
        userMessage = 'Authentication required. Please refresh the page.';
        break;
      case 429:
        errorType = ERROR_TYPES.RATE_LIMIT;
        severity = ERROR_SEVERITY.HIGH;
        userMessage = 'Rate limit exceeded. Please wait a moment and try again.';
        break;
      // ... other cases
    }
  }
  
  return new MIPTechError(sanitizeInput(userMessage), errorType, severity, details);
};
```

### 2. Recovery Mechanisms

- **Automatic Retry**: Exponential backoff for transient failures
- **Circuit Breaker**: Prevents cascading failures
- **Fallback UI**: Graceful degradation for connection issues
- **User Actions**: Manual retry options for failed operations

---

## Performance Monitoring

### 1. Web Vitals Integration

Real-time monitoring of Core Web Vitals with automatic reporting:

```javascript
// Initialize Web Vitals monitoring
import('web-vitals').then(({ onCLS, onFID, onFCP, onLCP, onTTFB }) => {
  const vitalsConfig = { reportAllChanges: true };
  
  onCLS(this.handleWebVitalMetric.bind(this, 'CLS'), vitalsConfig);
  onFID(this.handleWebVitalMetric.bind(this, 'FID'), vitalsConfig);
  onFCP(this.handleWebVitalMetric.bind(this, 'FCP'), vitalsConfig);
  onLCP(this.handleWebVitalMetric.bind(this, 'LCP'), vitalsConfig);
  onTTFB(this.handleWebVitalMetric.bind(this, 'TTFB'), vitalsConfig);
});
```

### 2. Custom Metrics

- API response times with detailed breakdowns
- WebSocket connection performance
- Chat widget load times
- Message send/receive latency
- Memory usage tracking
- Network condition monitoring

### 3. Performance Reporting

Automated reporting every 30 seconds with analytics integration:

```javascript
generateReport() {
  const report = {
    timestamp: Date.now(),
    webVitals: Object.fromEntries(this.metrics.webVitals),
    api: {
      total: this.metrics.api.length,
      successful: this.metrics.api.filter(m => m.success).length,
      averageResponseTime: this.getAverageResponseTime(this.metrics.api),
      slowest: this.getSlowestRequests(this.metrics.api, 5)
    },
    summary: this.getSummary()
  };
  
  // Send to analytics
  this.sendToAnalytics('performance_report', report);
  
  return report;
}
```

---

## Security Features

### 1. Input Sanitization

All user inputs are sanitized using DOMPurify to prevent XSS attacks:

```javascript
const sanitizedValue = sanitizeInput(inputValue);
```

### 2. Session Security

- Encrypted localStorage with basic obfuscation
- Automatic session expiration
- Secure token handling
- Sanitized session metadata

### 3. API Security

- Tenant-based authentication with X-Tenant-ID headers
- Request/response sanitization
- Rate limiting protection
- HTTPS enforcement in production

---

## Implementation Details

### 1. Dependency Injection Pattern

All services implement dependency injection for enhanced testability:

```javascript
export class MIPTechAPIClient {
  constructor(config, dependencies = {}) {
    // Inject dependencies or use defaults
    this.axios = dependencies.axios || axios;
    this.localStorage = dependencies.localStorage || localStorage;
    this.console = dependencies.console || console;
  }
}
```

### 2. Event-Driven Architecture

WebSocket manager uses EventEmitter pattern for decoupled communication:

```javascript
class WebSocketManager extends EventEmitter {
  handleMessage(event) {
    const data = JSON.parse(event.data);
    this.emit('message', data);
  }
}
```

### 3. Performance Optimization

- React.memo for component optimization
- useMemo and useCallback for expensive computations
- Virtual scrolling for large message lists
- Lazy loading for non-critical components
- Bundle splitting for optimal loading

### 4. Accessibility Features

- ARIA labels and roles
- Keyboard navigation support
- Screen reader compatibility
- Reduced motion preferences
- High contrast mode support

### 5. Error Boundaries

React error boundaries catch and handle component errors gracefully:

```javascript
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error, errorInfo) {
    logError(new MIPTechError(
      'React component error',
      ERROR_TYPES.SYSTEM,
      ERROR_SEVERITY.HIGH,
      { error: error.message, errorInfo }
    ));
  }
}
```

---

## Deployment Configuration

### 1. Production Build Optimization

```json
{
  "scripts": {
    "build": "react-scripts build",
    "build:analyze": "npm run build && npx source-map-explorer 'build/static/js/*.js'"
  }
}
```

### 2. Performance Monitoring

- Core Web Vitals tracking enabled
- Real User Monitoring (RUM) integration
- Error tracking with Sentry (if configured)
- Analytics integration with Google Analytics

### 3. Security Headers

Production deployment includes security headers:
- Content Security Policy (CSP)
- X-Frame-Options
- X-Content-Type-Options
- Referrer-Policy

---

## Testing Strategy

### 1. Unit Testing

All services and utilities include comprehensive unit tests with dependency injection:

```javascript
describe('MIPTechAPIClient', () => {
  it('should handle API errors gracefully', async () => {
    const mockAxios = {
      create: jest.fn(() => ({
        post: jest.fn().mockRejectedValue(new Error('Network error'))
      }))
    };
    
    const client = new MIPTechAPIClient({}, { axios: mockAxios });
    
    await expect(client.sendMessage('chat-id', 'test')).rejects.toThrow();
  });
});
```

### 2. Integration Testing

- API endpoint testing with mock servers
- WebSocket connection testing
- End-to-end chat flow testing
- Performance regression testing

### 3. Accessibility Testing

- Automated accessibility scanning
- Screen reader testing
- Keyboard navigation testing
- Color contrast validation

---

## Maintenance and Monitoring

### 1. Error Monitoring

- Automatic error classification and reporting
- Performance degradation alerts
- Connection failure notifications
- User experience metrics tracking

### 2. Performance Monitoring

- Real-time Web Vitals tracking
- API response time monitoring
- Memory usage alerts
- Bundle size monitoring

### 3. Security Monitoring

- Input sanitization validation
- Session security audits
- Dependency vulnerability scanning
- HTTPS certificate monitoring

---

This documentation provides a comprehensive overview of the MIPTech AI Platform client-side implementation, covering all aspects from architecture to security. The codebase follows enterprise-grade patterns and includes robust error handling, performance monitoring, and security features suitable for production deployment.