# MIPTech AI Integration - Testing & Deployment Guide

## 🧪 Testing Strategy

### Phase 1: Local Development Testing

#### 1. **Start Development Server**
```bash
# Start the React development server
npm start

# The app will run on http://localhost:3000
# Chat widget should appear in bottom-right corner
```

#### 2. **Mock API Testing (Without Backend)**
```bash
# Add to your .env file for testing without backend
REACT_APP_MOCK_API=true
REACT_APP_MIPTECH_API_URL=http://localhost:3000/mock-api
REACT_APP_MIPTECH_WS_URL=ws://localhost:3000/mock-ws
```

Create a simple mock API for testing:
```javascript
// public/mock-api/chat.json
{
  "id": "chat-123",
  "session_id": "session-456",
  "created_at": "2025-07-15T10:00:00Z",
  "status": "active"
}

// public/mock-api/messages.json
{
  "items": [
    {
      "id": "msg-1",
      "content": "Hello! How can I help you today?",
      "role": "assistant",
      "timestamp": "2025-07-15T10:00:00Z"
    }
  ]
}
```

#### 3. **Component Testing Checklist**

**Chat Widget UI Testing:**
- [ ] Widget appears in correct position (bottom-right)
- [ ] Toggle button works (open/close chat)
- [ ] Minimize/maximize functionality
- [ ] Responsive design on different screen sizes
- [ ] Dark/light mode switching
- [ ] GSAP animations work smoothly

**Input & Messaging Testing:**
- [ ] Message input accepts text
- [ ] Character counter works (4000 char limit)
- [ ] Send button enables/disables correctly
- [ ] Enter key sends messages
- [ ] Long messages wrap correctly
- [ ] Emoji and special characters handled

**Error Handling Testing:**
- [ ] Network disconnection simulation
- [ ] Invalid input handling
- [ ] Error boundary activation
- [ ] Retry mechanisms work
- [ ] Graceful degradation

**Performance Testing:**
- [ ] Widget loads within 1 second
- [ ] Smooth scrolling in message list
- [ ] No memory leaks during usage
- [ ] Performance indicators show correct metrics

### Phase 2: Backend Integration Testing

#### 1. **MIPTech Platform Setup**
```bash
# Assuming you have the MIPTech platform running
# Update .env for real backend testing
REACT_APP_MOCK_API=false
REACT_APP_MIPTECH_API_URL=http://localhost:8000
REACT_APP_MIPTECH_WS_URL=ws://localhost:8000
```

#### 2. **API Integration Testing**
- [ ] Chat session creation
- [ ] Message sending/receiving
- [ ] Chat history loading
- [ ] WebSocket connection
- [ ] Real-time message updates
- [ ] Error responses handling

#### 3. **End-to-End Testing**
```bash
# Install testing dependencies
npm install --save-dev @testing-library/react @testing-library/jest-dom @testing-library/user-event
npm install --save-dev cypress
```

Create test files:
```javascript
// src/__tests__/ChatWidget.test.js
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ChatWidget from '../components/ChatWidget';

describe('ChatWidget', () => {
  test('renders chat toggle button', () => {
    render(<ChatWidget />);
    expect(screen.getByLabelText('Open chat')).toBeInTheDocument();
  });
  
  test('opens chat when button clicked', async () => {
    render(<ChatWidget />);
    fireEvent.click(screen.getByLabelText('Open chat'));
    await waitFor(() => {
      expect(screen.getByText('MIPTech AI Assistant')).toBeInTheDocument();
    });
  });
});
```

### Phase 3: Production Testing

#### 1. **Build Testing**
```bash
# Test production build
npm run build
npm install -g serve
serve -s build

# Test on http://localhost:3000
```

#### 2. **Performance Testing**
```bash
# Install Lighthouse CLI
npm install -g lighthouse

# Run performance audit
lighthouse http://localhost:3000 --output html --output-path ./lighthouse-report.html

# Check Core Web Vitals
```

#### 3. **Security Testing**
```bash
# Install security audit tools
npm audit
npm install -g snyk
snyk test

# Check for vulnerabilities
```

## 🚀 Deployment Phase

### Phase 1: Staging Deployment

#### 1. **Netlify Staging Deployment**
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Deploy to staging
netlify deploy --dir=build --site=your-staging-site-id

# For production deployment
netlify deploy --prod --dir=build --site=your-production-site-id
```

#### 2. **Vercel Staging Deployment**
```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy to staging
vercel --env REACT_APP_ENVIRONMENT=staging

# Deploy to production
vercel --prod
```

#### 3. **Environment Configuration**
Ensure these environment variables are set in your deployment platform:

**Netlify:**
- Go to Site Settings > Environment Variables
- Add all REACT_APP_* variables from .env.production

**Vercel:**
- Go to Project Settings > Environment Variables
- Add all REACT_APP_* variables from .env.production

### Phase 2: Production Deployment

#### 1. **Pre-Deployment Checklist**
- [ ] All tests passing
- [ ] Performance benchmarks met
- [ ] Security audit clean
- [ ] Environment variables configured
- [ ] Domain DNS configured
- [ ] SSL certificates ready
- [ ] Monitoring tools configured

#### 2. **Deployment Steps**
```bash
# 1. Final build test
npm run build

# 2. Deploy to production
# (Use your chosen platform - Netlify or Vercel)

# 3. Verify deployment
curl -I https://your-domain.com

# 4. Test chat functionality
# Manual testing on live site
```

#### 3. **Post-Deployment Verification**
- [ ] Website loads correctly
- [ ] Chat widget appears and functions
- [ ] API connections work
- [ ] WebSocket connections stable
- [ ] Performance metrics within targets
- [ ] Error monitoring active
- [ ] Analytics tracking working

### Phase 3: Monitoring & Maintenance

#### 1. **Set Up Monitoring**
```javascript
// Add to your deployment environment
REACT_APP_GOOGLE_ANALYTICS_ID=GA_MEASUREMENT_ID
REACT_APP_SENTRY_DSN=YOUR_SENTRY_DSN
REACT_APP_HOTJAR_ID=YOUR_HOTJAR_ID
```

#### 2. **Performance Monitoring**
- Set up alerts for Core Web Vitals
- Monitor API response times
- Track error rates
- Monitor user engagement metrics

#### 3. **Maintenance Schedule**
- Weekly: Check error logs and performance
- Monthly: Security updates and dependency updates
- Quarterly: Feature updates and optimizations

## 🔧 Quick Testing Commands

### Local Testing
```bash
# Start development server
npm start

# Run unit tests
npm test

# Run build test
npm run build

# Serve production build locally
npx serve -s build
```

### Performance Testing
```bash
# Lighthouse audit
lighthouse http://localhost:3000

# Bundle analyzer
npm install --save-dev webpack-bundle-analyzer
npm run build
npx webpack-bundle-analyzer build/static/js/*.js
```

### Security Testing
```bash
# Dependency audit
npm audit

# Security scan
npx snyk test
```

## 📊 Testing Metrics to Monitor

### Performance Metrics
- **FCP (First Contentful Paint)**: < 1.8s
- **LCP (Largest Contentful Paint)**: < 2.5s
- **CLS (Cumulative Layout Shift)**: < 0.1
- **FID (First Input Delay)**: < 100ms
- **Bundle Size**: < 300KB gzipped

### Functional Metrics
- **Chat Load Time**: < 1s
- **Message Send Time**: < 300ms
- **WebSocket Connection**: < 2s
- **Error Rate**: < 1%
- **Success Rate**: > 99%

### User Experience Metrics
- **Chat Open Rate**: Track engagement
- **Message Success Rate**: Track delivery
- **User Session Duration**: Track engagement
- **Error Recovery Rate**: Track resilience

## 🚨 Common Issues & Solutions

### Issue: Chat Widget Not Appearing
**Symptoms**: No chat button visible
**Solutions**:
1. Check console for JavaScript errors
2. Verify environment variables are set
3. Check network connectivity
4. Verify CSS z-index conflicts

### Issue: API Connection Failures
**Symptoms**: Cannot send/receive messages
**Solutions**:
1. Check API endpoint configuration
2. Verify CORS settings
3. Check network connectivity
4. Verify tenant ID configuration

### Issue: WebSocket Connection Problems
**Symptoms**: No real-time updates
**Solutions**:
1. Check WebSocket URL configuration
2. Verify firewall/proxy settings
3. Check browser WebSocket support
4. Verify SSL certificate for WSS

### Issue: Performance Problems
**Symptoms**: Slow loading or interactions
**Solutions**:
1. Check bundle size
2. Verify lazy loading implementation
3. Check memory leaks
4. Optimize animations

## 📞 Support & Troubleshooting

### Debug Mode
```bash
# Enable debug mode
REACT_APP_DEBUG=true
REACT_APP_SHOW_DEBUG_INFO=true
REACT_APP_SHOW_PERFORMANCE_INDICATOR=true
```

### Console Commands for Testing
```javascript
// In browser console, test components
window.miptechDebug = {
  api: miptechApi,
  websocket: websocketManager,
  session: sessionManager,
  performance: performanceMonitor
};

// Test API connection
window.miptechDebug.api.getHealth();

// Test WebSocket
window.miptechDebug.websocket.connect();

// View session data
window.miptechDebug.session.getSession();

// View performance metrics
window.miptechDebug.performance.getMetrics();
```

This comprehensive testing and deployment guide ensures a smooth transition from development to production with proper validation at each step.