# Technical Architecture & Operations Guide (TAOG)
# MIPTech AI Platform Client-Side Implementation

**Version**: 1.0  
**Date**: July 15, 2025  
**Author**: Senior Staff Engineer & SRE Lead  
**Classification**: Technical Documentation  

---

## 📋 **Executive Summary**

This Technical Architecture & Operations Guide provides comprehensive documentation for the MIPTech AI Platform client-side implementation. The system demonstrates enterprise-grade patterns including circuit breakers, rate limiting, WebSocket management, and comprehensive error handling. However, current test failures indicate specific issues requiring immediate attention.

### **Critical Issues Identified**
1. **API Circuit Breaker Open**: No backend server available at `http://localhost:8000`
2. **WebSocket setTimeout Context Error**: Dependency injection issue with timer functions
3. **Missing Backend Infrastructure**: Client implementation complete but no server to connect to

---

## 🏗️ **System Architecture Overview**

### **High-Level Architecture**

```
┌─────────────────────────────────────────────────────────────────┐
│                    React SPA Frontend                          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  Presentation   │  │   Service       │  │   Utility       │ │
│  │     Layer       │  │    Layer        │  │    Layer        │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                │
                    ┌───────────┼───────────┐
                    │           │           │
              ┌─────▼─────┐ ┌───▼────┐ ┌───▼────┐
              │   HTTP    │ │WebSocket│ │ Events │
              │    API    │ │   API   │ │ Stream │
              └───────────┘ └─────────┘ └────────┘
                                │
┌─────────────────────────────────────────────────────────────────┐
│                 MIPTech AI Platform Backend                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   API Gateway   │  │  WebSocket      │  │   AI Engine     │ │
│  │  (Port 8000)    │  │   Server        │  │                 │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### **Component Architecture**

#### **1. Presentation Layer**
- **ChatWidget.jsx**: Main UI component with GSAP animations
- **ConnectionTest.jsx**: Debug component for connection validation  
- **ChatErrorBoundary.jsx**: Error recovery and user feedback

#### **2. Service Layer**
- **MIPTechAPIClient**: HTTP client with circuit breaker, rate limiting, retry logic
- **WebSocketManager**: Real-time communication with auto-reconnection
- **SessionManager**: Encrypted localStorage with lifecycle management
- **PerformanceMonitor**: Web Vitals and custom metrics tracking

#### **3. Utility Layer**
- **ErrorHandler**: Comprehensive error classification and recovery
- **CircuitBreaker**: Service availability protection
- **RateLimiter**: Request throttling and burst protection

---

## 🚨 **Current Failure Analysis**

### **Issue 1: API Circuit Breaker Open**

**Error**: `"Circuit breaker is open. Service temporarily unavailable."`

**Root Cause Analysis**:
```javascript
// src/utils/errorHandler.js:299-306
if (this.state === 'OPEN') {
  if (Date.now() < this.nextAttemptTime) {
    throw new MIPTechError(
      'Circuit breaker is open. Service temporarily unavailable.',
      ERROR_TYPES.SYSTEM,
      ERROR_SEVERITY.HIGH,
      { circuitBreakerState: this.state }
    );
  }
}
```

**Failure Sequence**:
1. Client attempts to connect to `http://localhost:8000/api/v1/health`
2. Connection fails (ECONNREFUSED - no server running)
3. Circuit breaker counts failures (threshold: 5 failures)
4. After 5 consecutive failures, circuit breaker opens
5. All subsequent requests blocked for timeout period (60 seconds default)

**Impact**: Complete API functionality unavailable

### **Issue 2: WebSocket setTimeout Context Error**

**Error**: `"'setTimeout' called on an object that does not implement interface Window."`

**Root Cause Analysis**:
```javascript
// src/services/websocketManager.js:88-89
this.setTimeout = dependencies.setTimeout || setTimeout;
this.clearTimeout = dependencies.clearTimeout || clearTimeout;
```

**Failure Sequence**:
1. WebSocketManager instantiated with dependency injection
2. `setTimeout` function loses its `window` context when assigned to `this.setTimeout`
3. When called as `this.setTimeout()`, the function executes with wrong context
4. Browser's DOM API brand-check fails because `this !== window`
5. WebSocket connection timeout logic fails

**Impact**: WebSocket connections cannot establish timeouts, affecting reliability

### **Issue 3: Missing Backend Infrastructure**

**Analysis**: Client implementation is complete and architecturally sound, but requires backend server for functional testing.

---

## 🔧 **Technical Implementation Details**

### **Circuit Breaker Pattern**

**Implementation**: `src/utils/errorHandler.js:287-350`

```javascript
export class CircuitBreaker {
  constructor(threshold = 5, timeout = 60000, monitoringPeriod = 10000) {
    this.failureThreshold = threshold;    // 5 failures trigger open
    this.timeout = timeout;               // 60s until half-open retry
    this.monitoringPeriod = monitoringPeriod; // 10s monitoring window
    this.state = 'CLOSED';               // CLOSED, OPEN, HALF_OPEN
  }
}
```

**States & Transitions**:
- **CLOSED**: Normal operation, requests pass through
- **OPEN**: Service unavailable, requests immediately fail
- **HALF_OPEN**: Testing phase, single request allowed

**Configuration**:
```javascript
// API Client Circuit Breaker
circuitBreakerThreshold: 5,     // failures before opening
circuitBreakerTimeout: 60000    // milliseconds until retry
```

### **Rate Limiting Implementation**

**Implementation**: `src/utils/errorHandler.js:215-285`

```javascript
export class RateLimiter {
  constructor(maxRequests = 10, windowMs = 60000) {
    this.maxRequests = maxRequests;   // 10 requests per window
    this.windowMs = windowMs;         // 60 second window
    this.requests = [];               // Sliding window tracking
  }
}
```

**Algorithm**: Sliding window with timestamp-based request tracking

### **WebSocket Management**

**Features**:
- **Auto-reconnection**: Exponential backoff strategy
- **Heartbeat monitoring**: 30-second ping/pong cycle  
- **Message queuing**: Offline message storage
- **Circuit breaker integration**: Service protection

**Connection URL Format**:
```
ws://localhost:8000/api/v1/ws?tenant_id=miptech-company&session_id={uuid}
```

**Authentication Flow**:
```javascript
// WebSocket authentication message
{
  type: 'auth',
  data: {
    tenant_id: 'miptech-company',
    session_id: sessionId,
    user_agent: navigator.userAgent,
    page_url: window.location.href,
    timestamp: new Date().toISOString()
  }
}
```

### **Error Classification System**

**Error Types**:
```javascript
export const ERROR_TYPES = {
  NETWORK: 'NETWORK',           // Connection failures
  API: 'API',                   // Server-side errors  
  WEBSOCKET: 'WEBSOCKET',       // Real-time communication
  AUTHENTICATION: 'AUTHENTICATION', // Auth failures
  VALIDATION: 'VALIDATION',     // Input validation
  RATE_LIMIT: 'RATE_LIMIT',    // Throttling
  PERMISSION: 'PERMISSION',     // Authorization
  SYSTEM: 'SYSTEM',            // Infrastructure
  UNKNOWN: 'UNKNOWN'           // Unclassified
};
```

**Severity Levels**:
- **LOW**: Non-critical, user can continue
- **MEDIUM**: Affects functionality, user should be notified  
- **HIGH**: Major functionality impacted
- **CRITICAL**: System unusable

---

## 🚀 **Operations Guide**

### **Environment Configuration**

#### **Development Environment**
```bash
# .env
REACT_APP_MIPTECH_API_URL=http://localhost:8000
REACT_APP_MIPTECH_WS_URL=ws://localhost:8000
REACT_APP_MIPTECH_TENANT_ID=miptech-company
REACT_APP_DEBUG_API=true
```

#### **Production Environment**  
```bash
# .env.production
REACT_APP_MIPTECH_API_URL=https://api.miptechnologies.tech
REACT_APP_MIPTECH_WS_URL=wss://api.miptechnologies.tech
REACT_APP_MIPTECH_TENANT_ID=miptech-company
REACT_APP_DEBUG_API=false
```

### **Deployment Strategy**

#### **Development Deployment**
1. **Prerequisites**: 
   - Node.js 18+
   - MIPTech Platform backend running on port 8000
   - Environment variables configured

2. **Startup Sequence**:
   ```bash
   npm install
   npm start
   # Verify at http://localhost:3000
   ```

3. **Health Checks**:
   - Connection Test component shows green status
   - Browser console shows successful API/WebSocket connections
   - Chat widget displays "Connected" status

#### **Production Deployment**

**Platform Support**:
- **Netlify**: Static hosting with environment variable support
- **Vercel**: Edge deployment with serverless functions
- **AWS S3/CloudFront**: Enterprise CDN distribution

**Build Process**:
```bash
npm run build
# Output: optimized static files in /build directory
```

**Security Headers** (Required for production):
```
Content-Security-Policy: default-src 'self'; connect-src 'self' wss://api.miptechnologies.tech https://api.miptechnologies.tech
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
```

### **Monitoring & Observability**

#### **Key Performance Indicators (KPIs)**

**System Health**:
- **API Response Time**: < 500ms (P95)
- **WebSocket Connection Time**: < 2 seconds
- **Circuit Breaker State**: Monitor OPEN state frequency
- **Error Rate**: < 1% of total requests

**User Experience**:
- **Chat Load Time**: < 1 second
- **Message Send Time**: < 300ms  
- **Connection Success Rate**: > 99%
- **Auto-reconnection Success**: > 95%

#### **Alerting Strategy**

**Critical Alerts** (Immediate Response):
- Circuit breaker open for > 5 minutes
- WebSocket connection failure rate > 5%
- API error rate > 5%
- Chat widget load failure > 2%

**Warning Alerts** (Business Hours Response):
- Response time degradation > 1000ms
- Memory usage > 100MB
- Connection retry rate > 10%

#### **Logging Strategy**

**Development Logging**:
```javascript
// Enabled when REACT_APP_DEBUG_API=true
[MIPTech API] GET /api/v1/health {tenantId: "miptech-company"}
[WebSocket] Connecting to: ws://localhost:8000/api/v1/ws?tenant_id=miptech-company
[WebSocket] Sending authentication: {tenantId: "miptech-company"}
```

**Production Logging**:
- Error events only (no sensitive data)
- Performance metrics aggregation
- User action telemetry (opt-in)

---

## 🔍 **Troubleshooting Guide**

### **API Connection Issues**

#### **Symptom**: "Circuit breaker is open"
**Diagnosis Steps**:
1. Check backend server availability:
   ```bash
   curl -I http://localhost:8000/api/v1/health
   ```
2. Verify environment variables:
   ```bash
   echo $REACT_APP_MIPTECH_API_URL
   ```
3. Check circuit breaker state in browser console
4. Monitor network requests in Developer Tools

**Resolution**:
- **Immediate**: Start backend server or update API URL
- **Long-term**: Implement graceful degradation mode

#### **Symptom**: "Tenant ID not found"
**Diagnosis Steps**:
1. Verify `X-Tenant-ID` header in network requests
2. Check environment variable `REACT_APP_MIPTECH_TENANT_ID`
3. Validate backend tenant configuration

**Resolution**:
- Ensure `X-Tenant-ID: miptech-company` header present
- Verify tenant exists in backend configuration

### **WebSocket Connection Issues**

#### **Symptom**: "setTimeout context error"
**Diagnosis Steps**:
1. Check browser console for timer-related errors
2. Verify WebSocket manager initialization
3. Test in different browsers (Chrome, Firefox, Safari)

**Resolution**:
```javascript
// Fix dependency injection context binding
this.setTimeout = (deps.setTimeout || setTimeout).bind(window);
this.clearTimeout = (deps.clearTimeout || clearTimeout).bind(window);
```

#### **Symptom**: WebSocket connection refused
**Diagnosis Steps**:
1. Verify WebSocket server running on port 8000
2. Check URL format includes tenant_id parameter
3. Test WebSocket endpoint manually:
   ```bash
   wscat -c "ws://localhost:8000/api/v1/ws?tenant_id=miptech-company"
   ```

### **Performance Issues**

#### **Symptom**: Slow chat widget loading
**Diagnosis Steps**:
1. Check bundle size: `npm run build && ls -lh build/static/js/`
2. Analyze with Lighthouse performance audit
3. Monitor memory usage in DevTools

**Resolution**:
- Implement code splitting for chat components
- Optimize GSAP animation performance
- Add lazy loading for non-critical features

---

## 📊 **Performance Optimization**

### **Bundle Optimization**

**Current Bundle Analysis**:
```bash
# Check built bundle size
npx webpack-bundle-analyzer build/static/js/*.js
```

**Optimization Strategies**:
1. **Code Splitting**: Split chat functionality into separate chunks
2. **Tree Shaking**: Remove unused code from dependencies
3. **Dynamic Imports**: Load chat components on-demand

**Target Metrics**:
- Main bundle: < 200KB gzipped
- Chat bundle: < 100KB gzipped  
- Total initial load: < 300KB gzipped

### **Runtime Performance**

**Memory Management**:
- WebSocket connection cleanup on unmount
- Message history trimming (max 100 messages)
- Timer cleanup in useEffect hooks

**Rendering Optimization**:
- React.memo for chat message components
- Virtualized scrolling for long conversations
- Debounced input handling

### **Network Optimization**

**Request Optimization**:
- HTTP/2 server push for critical resources
- Aggressive caching for static assets
- Compression for API responses

**WebSocket Optimization**:
- Message batching for high-frequency updates
- Binary message format for large payloads
- Connection pooling for multiple tenants

---

## 🛡️ **Security Considerations**

### **Input Sanitization**

**Implementation**: `src/utils/errorHandler.js:92-124`
```javascript
export const sanitizeInput = (input) => {
  if (!input || typeof input !== 'string') return '';
  
  // Remove dangerous HTML/JS
  const sanitized = DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],      // No HTML tags allowed
    ALLOWED_ATTR: []       // No attributes allowed
  });
  
  return sanitized.trim();
};
```

**Protection Against**:
- XSS (Cross-Site Scripting)
- HTML injection
- Script injection
- SQL injection patterns

### **Session Security**

**Encrypted Storage**: `src/services/sessionManager.js`
- AES-256 encryption for localStorage data
- Session expiration and automatic cleanup
- Secure session ID generation (UUID v4)

**Transport Security**:
- HTTPS enforcement in production
- WSS (WebSocket Secure) for real-time communication
- CSRF token validation

### **Error Information Disclosure**

**Development Mode**:
- Detailed error logging for debugging
- Full stack traces and context

**Production Mode**:
- Generic error messages to users
- Detailed logging to secure monitoring systems
- No sensitive data in client-side logs

---

## 🔮 **Future Scalability & Evolution**

### **Architecture Evolution Roadmap**

#### **Phase 1: Immediate Fixes (Week 1)**
- Fix WebSocket setTimeout context issue
- Implement mock backend for development testing
- Add circuit breaker reset mechanisms

#### **Phase 2: Enhanced Resilience (Month 1)**
- Implement offline mode with message queuing  
- Add WebSocket connection health monitoring
- Enhance error recovery automation

#### **Phase 3: Advanced Features (Quarter 1)**
- Multi-tenant UI customization
- Real-time typing indicators
- File upload/sharing capabilities
- Voice message support

#### **Phase 4: Enterprise Scale (Quarter 2)**
- Horizontal WebSocket scaling
- CDN-based asset delivery
- Advanced analytics dashboard
- A/B testing framework

### **Monitoring Evolution**

#### **Current State**: Basic connection testing
#### **Target State**: Comprehensive observability

**Planned Enhancements**:
1. **Real User Monitoring (RUM)**:
   - Core Web Vitals tracking
   - User journey analytics
   - Performance regression detection

2. **Synthetic Monitoring**:
   - Automated uptime checks
   - Cross-browser compatibility testing
   - Geographic performance testing

3. **Business Intelligence**:
   - Chat engagement metrics
   - User satisfaction scoring
   - Feature usage analytics

### **Technical Debt Management**

**Identified Technical Debt**:
1. WebSocket manager complexity (multiple responsibilities)
2. Circuit breaker configuration coupling
3. Error handling inconsistency across components

**Remediation Plan**:
1. **Q1**: Refactor WebSocket manager into focused services
2. **Q2**: Implement configuration-driven circuit breakers  
3. **Q3**: Standardize error handling patterns

---

## 📋 **Immediate Action Items**

### **Critical Priority (24 hours)**

1. **Fix WebSocket setTimeout Context Issue**:
   ```javascript
   // src/services/websocketManager.js
   const globalScope = typeof window !== 'undefined' ? window : global;
   this.setTimeout = (deps.setTimeout || globalScope.setTimeout).bind(globalScope);
   this.clearTimeout = (deps.clearTimeout || globalScope.clearTimeout).bind(globalScope);
   ```

2. **Implement Circuit Breaker Reset**:
   ```javascript
   // Add manual reset capability
   resetCircuitBreaker() {
     this.state = 'CLOSED';
     this.failureCount = 0;
     this.nextAttemptTime = null;
   }
   ```

### **High Priority (1 week)**

3. **Create Mock Backend Server**:
   ```javascript
   // mock-server/server.js
   const express = require('express');
   const WebSocket = require('ws');
   
   // Implement basic API endpoints and WebSocket server
   ```

4. **Add Connection Recovery Automation**:
   - Exponential backoff with jitter
   - Max retry limits with user notification
   - Graceful degradation modes

### **Medium Priority (1 month)**

5. **Implement Health Check Dashboard**
6. **Add Performance Monitoring Integration**  
7. **Create Automated Testing Suite**

---

## 📞 **Support & Escalation**

### **Support Tiers**

**Tier 1: Self-Service** (Documentation & Guides)
- This TAOG document
- Client-side implementation guide
- FAQ and common issues

**Tier 2: Engineering Support** (Business Hours)
- Implementation questions
- Configuration assistance
- Performance optimization

**Tier 3: SRE Escalation** (24/7 for Critical Issues)
- Production incidents
- Security vulnerabilities
- Data integrity issues

### **Escalation Criteria**

**Immediate Escalation**:
- Chat functionality completely unavailable
- Security vulnerability discovered
- Data loss or corruption

**Same-Day Escalation**:
- Performance degradation > 50%
- Error rate > 10%
- New deployment failures

### **Contact Information**

- **Engineering Team**: engineering@miptechnologies.tech
- **SRE On-Call**: sre-oncall@miptechnologies.tech  
- **Security Issues**: security@miptechnologies.tech

---

## 📝 **Document Maintenance**

**Review Schedule**:
- **Monthly**: Update troubleshooting procedures based on incidents
- **Quarterly**: Review architecture decisions and technical debt
- **Semi-Annually**: Complete document revision and update

**Version Control**:
- Document stored in Git repository with implementation code
- Changes tracked with detailed commit messages
- Major revisions tagged with semantic versioning

**Stakeholder Review**:
- Engineering team review for technical accuracy
- Operations team review for procedural completeness
- Security team review for compliance requirements

---

**Document Version**: 1.0  
**Last Updated**: July 15, 2025  
**Next Review**: August 15, 2025  
**Approved By**: Senior Staff Engineer & SRE Lead