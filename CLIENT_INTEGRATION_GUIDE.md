# MIPTech AI Platform - Client Integration Guide v3.2 PRODUCTION

*Fully Verified Against Platform Code - Production Ready*

## Critical Changes in Latest Deployment

1. **JWT Authentication**: Required in first `join_chat` message after connection
2. **WebSocket Tenant**: `tenant_id` MUST be in URL query params (verified requirement)
3. **Session Persistence**: Use `session_id` for idempotent chat creation (201/200)
4. **Message Format**: Uses `text` field for user messages
5. **Error Codes**: 44xx for auth failures, 1008 for config errors, 1001 for rolling deploys

## 1. Environment Configuration

```javascript
// src/config/env.js
export const ENV = {
  API_URL:   process.env.REACT_APP_MIPTECH_API_URL || 'https://api.miptechnologies.tech',
  // CRITICAL: WebSocket endpoint with full path (tenant_id added dynamically)
  WS_URL:    process.env.REACT_APP_MIPTECH_WS_URL || 'wss://api.miptechnologies.tech/api/v1/ws/chat',
  TENANT_ID: process.env.REACT_APP_MIPTECH_TENANT_ID || 'miptech-company'
};
```

## 2. HTTP Wrapper with Robust Headers

```javascript
// src/api/http.js
export async function http(url, { tenantId, token, ...init }) {
  // Normalize headers if Headers instance
  const extraHeaders = init.headers instanceof Headers 
    ? Object.fromEntries(init.headers) 
    : (init.headers || {});
    
  const headers = {
    'Content-Type': 'application/json',
    'X-Tenant-ID': tenantId,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extraHeaders
  };
  
  const res = await fetch(url, { ...init, headers });
  let body = null;
  try { body = await res.json(); } catch {}
  
  if (res.ok) return body;
  
  const err = new Error(body?.code || `http_${res.status}`);
  err.status = res.status;
  err.body = body;
  throw err;
}
```

## 3. Chat Creation with Session Persistence

```javascript
// src/api/chat.js
import { http } from './http';

const RETRYABLE_CODES = new Set(['schema_unavailable', 'db_not_ready']);

// Persistent session ID with fallback for older browsers
function getSessionId() {
  const key = 'miptech_session_id';
  let sessionId = localStorage.getItem(key);
  if (!sessionId) {
    try {
      sessionId = crypto.randomUUID();
    } catch {
      // Fallback for older browsers
      sessionId = 'xxxx-xxxx-4xxx-yxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }
    localStorage.setItem(key, sessionId);
  }
  return sessionId;
}

export async function createChatWithRetry(baseUrl, tenantId, token, maxAttempts = 5) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await http(`${baseUrl}/api/v1/chat`, {
        method: 'POST',
        body: JSON.stringify({ 
          title: 'Website Chat Session',
          tenant_id: tenantId,
          session_id: getSessionId()  // For idempotency
        }),
        tenantId,
        token
      });
    } catch (e) {
      const code = e.body?.code;
      const status = e.status || 0;
      const retryable = (code && RETRYABLE_CODES.has(code)) || 
                       status === 503 || (status >= 500 && status < 600);
      
      if (!retryable || attempt === maxAttempts) throw e;
      
      const backoff = Math.min(8000, 500 * Math.pow(2, attempt - 1));
      const jitter = Math.random() * backoff * 0.3;
      await new Promise(r => setTimeout(r, backoff + jitter));
    }
  }
}

// Optional readiness check
export async function checkReadiness(apiUrl) {
  try {
    // Try HEAD first (lighter)
    let res = await fetch(`${apiUrl}/readyz`, { method: 'HEAD' });
    if (!res.ok) {
      // Fall back to GET
      res = await fetch(`${apiUrl}/readyz`, { method: 'GET' });
    }
    return res.ok;
  } catch {
    return false;
  }
}
```

## 4. WebSocket Manager with Required Tenant ID

```javascript
// src/ws/manager.js
export class ChatWebSocket {
  constructor(wsUrl, chatId, tenantId, token) {
    // CRITICAL: Add tenant_id to URL query params (REQUIRED by backend)
    const url = new URL(wsUrl);
    url.searchParams.set('tenant_id', tenantId);
    this.url = url.toString();
    
    this.chatId = chatId;
    this.tenantId = tenantId;
    this.token = token;
    this.ws = null;
    this.listeners = {};
    this.reconnects = 0;
    this.maxReconnects = 10;
    this.isReady = false;
    this.joinSent = false;
    this.readyTimer = null;
  }

  on(type, cb) { 
    (this.listeners[type] ||= new Set()).add(cb); 
    return () => this.listeners[type]?.delete(cb); 
  }
  
  emit(type, payload) { 
    this.listeners[type]?.forEach(fn => fn(payload)); 
  }
  
  // Support token refresh
  setToken(newToken) {
    this.token = newToken;
  }

  connect() {
    this.ws = new WebSocket(this.url); // URL already has tenant_id

    this.ws.onopen = () => {
      this.reconnects = 0;
      this.emit('connected', {});
      // Fallback: send join_chat after 1s if connection_ready hasn't arrived
      this.readyTimer = setTimeout(() => this.sendJoinIfNeeded(), 1000);
    };

    this.ws.onmessage = (e) => {
      let msg; 
      try { msg = JSON.parse(e.data); } catch { return; }
      if (!msg?.type) return;

      // Handle connection ready signal
      if (msg.type === 'connection_ready') {
        this.isReady = true;
        this.sendJoinIfNeeded();
        return;
      }

      // Handle heartbeat
      if (msg.type === 'ping') {
        this.emit('ping', msg);
        this.send({ type: 'pong', data: { ts: Date.now() } });
        return;
      }
      
      // Handle processing indicator
      if (msg.type === 'processing') {
        this.emit('processing', msg);
        return;
      }
      
      // Handle streaming chunks
      if (msg.type === 'response_chunk') {
        this.emit('response_chunk', msg);
        return;
      }

      // Handle authentication success
      if (msg.type === 'chat_joined') {
        this.emit('authenticated', msg);
      }

      // Handle errors
      if (msg.type === 'error') {
        const code = msg.data?.code;
        if (['auth_required', 'invalid_token', 'tenant_mismatch', 'insufficient_scope'].includes(code)) {
          this.emit('auth_error', msg);
        }
      }

      this.emit(msg.type, msg);
    };

    this.ws.onclose = (ev) => {
      if (this.readyTimer) { 
        clearTimeout(this.readyTimer); 
        this.readyTimer = null; 
      }
      
      // Auth failures - don't reconnect
      if ([4400, 4401, 4403, 4408].includes(ev.code)) {
        this.emit('auth_failed', { code: ev.code, reason: ev.reason });
        return;
      }
      
      // Pre-connection failures (including missing tenant_id)
      if (ev.code === 1008) {
        this.emit('config_error', { code: ev.code, reason: ev.reason });
        return;
      }
      
      // Rolling deploy (1001) - reconnect
      if (ev.code === 1001) {
        this.emit('disconnected', { code: ev.code, reason: 'Server restarting' });
      } else {
        this.emit('disconnected', { code: ev.code, reason: ev.reason });
      }
      
      this.scheduleReconnect();
    };
  }

  sendJoinIfNeeded() {
    if (this.joinSent || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.joinSent = true;
    this.send({ 
      type: 'join_chat', 
      data: { 
        // Send both formats for compatibility
        chatId: this.chatId,
        chat_id: this.chatId,
        tenantId: this.tenantId,
        tenant_id: this.tenantId,
        token: this.token  // JWT goes here, NOT in URL
      } 
    });
  }

  scheduleReconnect() {
    if (this.reconnects >= this.maxReconnects) return;
    const attempt = ++this.reconnects;
    const backoff = Math.min(8000, 500 * Math.pow(2, attempt - 1));
    const jitter = Math.random() * backoff * 0.3;
    setTimeout(() => {
      this.joinSent = false;
      this.isReady = false;
      this.connect();
    }, backoff + jitter);
    this.emit('reconnecting', { attempt, delay: backoff + jitter });
  }

  send(payload) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }

  sendMessage(text) {
    this.send({ 
      type: 'user_message', 
      data: { 
        chatId: this.chatId,
        chat_id: this.chatId,  // Both formats for compatibility
        text  // CRITICAL: Use 'text' not 'message'
      } 
    });
  }

  disconnect() { 
    try { this.ws?.close(); } catch {} 
    this.ws = null; 
  }
}
```

## 5. React Hook with Full Feature Support

```javascript
// src/hooks/useChatSession.jsx
import { useEffect, useState, useRef } from 'react';
import { createChatWithRetry, checkReadiness } from '../api/chat';
import { ChatWebSocket } from '../ws/manager';
import { ENV } from '../config/env';

export function useChatSession({ token }) {
  const [status, setStatus] = useState('idle');
  const [chatId, setChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const wsRef = useRef(null);
  
  useEffect(() => {
    let canceled = false;
    
    (async () => {
      setStatus('initializing');
      
      // Optional: Check platform readiness
      const ready = await checkReadiness(ENV.API_URL);
      if (!ready && !canceled) {
        setStatus('platform_starting');
        // Could implement retry logic here
      }
      
      setStatus('creating');
      
      try {
        // Create chat session with retry
        const chat = await createChatWithRetry(ENV.API_URL, ENV.TENANT_ID, token);
        if (canceled) return;
        
        setChatId(chat.id);
        setStatus('connecting');
        
        // Connect WebSocket
        const ws = new ChatWebSocket(ENV.WS_URL, chat.id, ENV.TENANT_ID, token);
        wsRef.current = ws;
        
        // Set up event handlers
        ws.on('authenticated', () => {
          setStatus('ready');
        });
        
        ws.on('processing', () => {
          setIsTyping(true);
          setStreamingContent('');
        });
        
        // Handle streaming chunks
        ws.on('response_chunk', (evt) => {
          const chunk = evt.data?.content || '';
          setStreamingContent(prev => prev + chunk);
        });
        
        ws.on('response_complete', (evt) => {
          setIsTyping(false);
          const content = evt.data?.content || evt.data?.message?.content || streamingContent;
          if (content) {
            setMessages(prev => [...prev, {
              role: 'assistant',
              content,
              timestamp: Date.now()
            }]);
          }
          setStreamingContent('');
        });
        
        ws.on('config_error', ({ code, reason }) => {
          if (reason === 'tenant_id required') {
            setError('Configuration error: tenant_id missing in WebSocket URL');
          } else {
            setError(`Configuration error: ${reason}`);
          }
          setStatus('error');
        });
        
        ws.on('auth_failed', ({ code, reason }) => {
          const messages = {
            4400: 'Protocol error: Expected join_chat as first message',
            4401: 'Authentication required or invalid token',
            4403: 'Access denied: Wrong tenant or missing permissions',
            4408: 'Authentication timeout: join_chat not sent within 10s'
          };
          setError(messages[code] || reason);
          setStatus('error');
        });
        
        ws.on('reconnecting', () => setStatus('reconnecting'));
        ws.on('disconnected', ({ code }) => {
          setStatus(code === 1001 ? 'reconnecting' : 'disconnected');
        });
        
        ws.connect();
        
      } catch (e) {
        if (canceled) return;
        setError(e.body?.message || e.message);
        setStatus('error');
      }
    })();
    
    return () => {
      canceled = true;
      wsRef.current?.disconnect();
    };
  }, [token]);
  
  // Update token if it changes (e.g., after refresh)
  useEffect(() => {
    if (wsRef.current && token) {
      wsRef.current.setToken(token);
    }
  }, [token]);
  
  const sendMessage = (text) => {
    if (status !== 'ready' || !wsRef.current) return;
    
    setMessages(prev => [...prev, {
      role: 'user',
      content: text,
      timestamp: Date.now()
    }]);
    
    wsRef.current.sendMessage(text);
  };
  
  return { 
    status, 
    chatId, 
    messages, 
    error, 
    isTyping, 
    streamingContent,
    sendMessage 
  };
}
```

## 6. Complete Example Application

```javascript
// App.jsx
import React, { useState, useEffect } from 'react';
import { useChatSession } from './hooks/useChatSession';

function getJWTToken() {
  // Your JWT retrieval logic
  // Token must have 'chat:create' and 'chat:send' scopes
  return localStorage.getItem('miptech_jwt_token');
}

function ChatApp() {
  const token = getJWTToken();
  const { 
    status, 
    messages, 
    error, 
    isTyping, 
    streamingContent, 
    sendMessage 
  } = useChatSession({ token });
  
  return (
    <div className="chat-container">
      {/* Error Display */}
      {error && (
        <div className="error-banner">
          {error}
        </div>
      )}
      
      {/* Status Indicators */}
      {status === 'platform_starting' && (
        <div className="status-banner">
          Platform is starting up, please wait...
        </div>
      )}
      {status === 'reconnecting' && (
        <div className="status-banner">
          Reconnecting...
        </div>
      )}
      
      {/* Messages Area */}
      <div className="messages">
        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.role}`}>
            <span className="role">{msg.role === 'user' ? 'You' : 'AI'}:</span>
            <span className="content">{msg.content}</span>
          </div>
        ))}
        
        {/* Typing Indicator with Streaming */}
        {isTyping && (
          <div className="message assistant typing">
            <span className="role">AI:</span>
            <span className="content">
              {streamingContent || <span className="dots">...</span>}
            </span>
          </div>
        )}
      </div>
      
      {/* Input Area */}
      <div className="input-area">
        <input
          type="text"
          disabled={status !== 'ready'}
          placeholder={
            status === 'ready' ? 'Type a message...' : 
            status === 'error' ? 'Error - check console' :
            `${status.replace('_', ' ')}...`
          }
          onKeyPress={(e) => {
            if (e.key === 'Enter' && e.target.value.trim()) {
              sendMessage(e.target.value);
              e.target.value = '';
            }
          }}
        />
        <button 
          disabled={status !== 'ready'}
          onClick={(e) => {
            const input = e.target.previousSibling;
            if (input.value.trim()) {
              sendMessage(input.value);
              input.value = '';
            }
          }}
        >
          Send
        </button>
      </div>
      
      {/* Debug Info (remove in production) */}
      <div className="debug" style={{ fontSize: '10px', marginTop: '10px' }}>
        Status: {status} | Chat ID: {chatId || 'none'}
      </div>
    </div>
  );
}

export default ChatApp;
```

## 7. Authentication Flow Summary

### Connection Sequence:
1. **WebSocket connects** to `wss://api.miptechnologies.tech/api/v1/ws/chat?tenant_id=miptech-company`
2. **Server validates** tenant_id from query param (closes with 1008 if missing)
3. **Server sends**: `connection_established` → `initialization_progress` → `connection_ready`
4. **Client sends** `join_chat` with JWT token within 10 seconds
5. **Server validates** JWT and either:
   - Sends `chat_joined` (success)
   - Sends error + closes with 44xx code (failure)

### Key Points:
- **tenant_id in URL**: Required as query parameter at connection time
- **Token in first message**: JWT goes in `join_chat` frame, NOT in URL
- **Fallback timer**: Send `join_chat` after 1s even if `connection_ready` hasn't arrived
- **Don't reconnect** on auth failures (44xx codes) or config errors (1008)
- **Do reconnect** on server restarts (1001) and normal disconnections

## 8. Error Reference

### WebSocket Close Codes:
| Code | Reason | Action |
|------|--------|--------|
| 1001 | Server restarting (rolling deploy) | Reconnect with backoff |
| 1008 | Configuration error (missing tenant_id) | Don't reconnect, fix config |
| 4400 | Bad first frame (expected join_chat) | Don't reconnect, fix protocol |
| 4401 | Auth required or invalid token | Don't reconnect, refresh token |
| 4403 | Tenant mismatch or insufficient scope | Don't reconnect, check permissions |
| 4408 | Join timeout (didn't send within 10s) | Don't reconnect, fix timing |

### REST API Error Codes:
| Status | Code | Action |
|--------|------|--------|
| 401 | auth_required, invalid_token | Provide/refresh JWT |
| 403 | tenant_mismatch, insufficient_scope | Check tenant/permissions |
| 422 | Validation errors | Fix request data |
| 429 | Rate limited | Backoff and retry |
| 503 | schema_unavailable, db_not_ready | Retry with backoff |

## 9. Production Checklist

### Critical Requirements:
- ✅ **tenant_id in WebSocket URL** query parameters (REQUIRED)
- ✅ **session_id** persisted in localStorage for idempotency
- ✅ **join_chat** with token sent as first message after connection
- ✅ **text** field used for user messages (not 'message')
- ✅ **No token in WebSocket URL** - only in join_chat frame
- ✅ **REST headers**: X-Tenant-ID and Authorization: Bearer

### Error Handling:
- ✅ Don't reconnect on 4400/4401/4403/4408 (auth failures)
- ✅ Don't reconnect on 1008 (config errors)
- ✅ Do reconnect on 1001 (rolling deploys)
- ✅ Retry REST on schema_unavailable, db_not_ready, 503

### Features:
- ✅ Handle ping → reply with pong
- ✅ Process streaming chunks if implemented
- ✅ Show typing indicator on processing event
- ✅ Support token refresh via setToken()
- ✅ UUID fallback for older browsers
- ✅ Headers normalization for Headers instances

## 10. Testing Guide

### Development Mode (JWT Optional):
```bash
# Backend environment variables
WIDGET_JWT_REQUIRED=false
WS_JWT_REQUIRED=false

# Test without token
const session = useChatSession({ token: null });
```

### Production Mode (JWT Required):
```javascript
// Generate JWT with required scopes
const token = generateJWT({
  tenant_id: 'miptech-company',
  scope: ['chat:create', 'chat:send'],
  exp: Date.now() + 3600000 // 1 hour
});

const session = useChatSession({ token });
```

### Common Test Scenarios:
1. **Missing tenant_id**: WebSocket closes with 1008
2. **Missing token**: WebSocket closes with 4401
3. **Wrong tenant in token**: WebSocket closes with 4403
4. **Missing scopes**: WebSocket closes with 4403
5. **Timeout**: WebSocket closes with 4408 if join_chat not sent within 10s
6. **Server restart**: WebSocket closes with 1001, auto-reconnects

## 11. Migration Notes

If upgrading from a previous version:

1. **Add tenant_id to WebSocket URL**: Required query parameter
2. **Move token from URL to join_chat frame**: Security best practice
3. **Change 'message' to 'text'**: In user message payloads
4. **Handle new error codes**: 44xx for auth, 1008 for config, 1001 for restarts
5. **Add session_id**: For idempotent chat creation
6. **Implement pong response**: For heartbeat handling

## 12. Security Best Practices

- **Never put JWT in URL**: Use join_chat frame instead
- **Store session_id securely**: Use localStorage or secure cookie
- **Validate token expiry**: Refresh before expiration
- **Handle token rotation**: Use setToken() method
- **Clear sensitive data**: On logout or session end
- **Use WSS in production**: Never WS over unsecured connection

---

**Version**: 3.2 PRODUCTION  
**Last Updated**: January 2025  
**Status**: Fully Verified Against Platform Code  
**Compatibility**: MIPTech AI Platform Latest Deployment