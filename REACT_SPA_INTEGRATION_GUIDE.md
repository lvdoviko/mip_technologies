# MIPTech AI Platform - React SPA Integration Guide

**Version:** 2.0  
**Date:** July 15, 2025  
**Target:** Frontend Engineers (miptechnologies.tech Website Team)  
**Purpose:** Integrate MIPTech AI Platform chat with React SPA website

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Prerequisites](#prerequisites)
4. [React Components](#react-components)
5. [API Integration](#api-integration)
6. [WebSocket Integration](#websocket-integration)
7. [State Management](#state-management)
8. [UI/UX Integration](#ui-ux-integration)
9. [Performance Optimization](#performance-optimization)
10. [Error Handling](#error-handling)
11. [Testing](#testing)
12. [Deployment](#deployment)
13. [Production Configuration](#production-configuration)

---

## Overview

This guide shows how to integrate your **React SPA website** (miptechnologies.tech) with the MIPTech AI Platform. This is a **client-side only** integration for static hosting environments.

### Key Benefits:
- **No Backend Required**: Direct API integration from React
- **Real-time Chat**: WebSocket integration with React hooks
- **Static Hosting**: Compatible with Netlify, Vercel, S3, etc.
- **Performance Optimized**: Client-side caching and lazy loading
- **Existing Stack Integration**: Works with GSAP, Three.js, Tailwind CSS

### Integration Model:
```
React SPA (miptechnologies.tech) ←→ MIPTech AI Platform ←→ AI Services
```

---

## Architecture

### Client-Side Architecture:
```
┌─────────────────────────────────────────────────────────────────┐
│                    React SPA (miptechnologies.tech)            │
├─────────────────────────────────────────────────────────────────┤
│  React Components                                              │
│  ├── ChatWidget (AI Integration)                               │
│  ├── AnimatedBackground (GSAP)                                 │
│  ├── ThreeJSCanvas (Three.js)                                  │
│  └── Existing Components (Tailwind CSS)                        │
├─────────────────────────────────────────────────────────────────┤
│  Client Services                                               │
│  ├── MIPTech API Client                                        │
│  ├── WebSocket Manager                                         │
│  ├── Session Manager (localStorage)                            │
│  └── Performance Monitor                                       │
├─────────────────────────────────────────────────────────────────┤
│  State Management                                              │
│  ├── React Context (Chat State)                               │
│  ├── Custom Hooks (useChat, useWebSocket)                     │
│  └── Local Storage (Session Persistence)                      │
└─────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────┐
│                    MIPTech AI Platform                          │
│  ├── Multi-tenant API (miptech-company)                       │
│  ├── WebSocket Server                                         │
│  ├── Chat Processing                                          │
│  └── AI Services                                              │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow:
1. User interacts with React chat widget
2. React sends API request to MIPTech Platform
3. Platform processes with AI services
4. Response streams back through WebSocket
5. React updates UI with GSAP animations
6. Performance metrics tracked (FCP, LCP, etc.)

---

## Prerequisites

### Technical Requirements:
- React 18+ with hooks
- Modern browsers (ES6+ support)
- HTTPS for production (WebSocket wss://)
- Static hosting platform (Netlify, Vercel, etc.)

### Existing Stack Compatibility:
- ✅ **GSAP**: Animation library
- ✅ **Three.js**: 3D graphics
- ✅ **Tailwind CSS**: Utility-first styling
- ✅ **Framer Motion**: Animation library
- ✅ **Lucide React**: Icon library

### MIPTech Platform Setup:
- Platform running at `http://localhost:8000` (development)
- Company tenant configured (`miptech-company`)
- Domain resolution for `miptechnologies.tech`
- API endpoints accessible via CORS

---

## React Components

### Step 1: Install Dependencies

```bash
# Core dependencies
npm install axios uuid

# Optional: for enhanced features
npm install react-intersection-observer
npm install react-error-boundary
```

### Step 2: MIPTech API Client

**File**: `src/services/miptechApi.js`
```javascript
import axios from 'axios';

class MIPTechAPI {
  constructor() {
    this.baseURL = process.env.REACT_APP_MIPTECH_API_URL || 'http://localhost:8000';
    this.tenantId = 'miptech-company';
    this.client = this.createClient();
  }

  createClient() {
    const client = axios.create({
      baseURL: `${this.baseURL}/api/v1`,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': this.tenantId,
        'User-Agent': 'MIPTech-Website/1.0'
      }
    });

    // Request interceptor
    client.interceptors.request.use(
      (config) => {
        console.log(`[MIPTech API] ${config.method.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('[MIPTech API] Request error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    client.interceptors.response.use(
      (response) => {
        console.log(`[MIPTech API] ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        console.error('[MIPTech API] Response error:', error.response?.data || error.message);
        
        if (error.response?.status === 429) {
          console.warn('[MIPTech API] Rate limited, implementing backoff...');
        }
        
        return Promise.reject(error);
      }
    );

    return client;
  }

  // Chat operations
  async createChat(sessionId, visitorId) {
    try {
      const response = await this.client.post('/chat/', {
        session_id: sessionId,
        visitor_id: visitorId,
        title: 'Website Chat',
        context: {
          page_url: window.location.href,
          user_agent: navigator.userAgent,
          referrer: document.referrer
        }
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to create chat: ${error.message}`);
    }
  }

  async sendMessage(chatId, content) {
    try {
      const response = await this.client.post(`/chat/${chatId}/messages`, {
        content: content,
        role: 'user',
        metadata: {
          timestamp: new Date().toISOString(),
          page_url: window.location.href
        }
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to send message: ${error.message}`);
    }
  }

  async getChatHistory(chatId) {
    try {
      const response = await this.client.get(`/chat/${chatId}/messages`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get chat history: ${error.message}`);
    }
  }

  async getHealth() {
    try {
      const response = await this.client.get('/health');
      return response.data;
    } catch (error) {
      throw new Error(`Health check failed: ${error.message}`);
    }
  }

  // Stream message (for real-time responses)
  async streamMessage(chatId, content) {
    try {
      const response = await this.client.post(`/chat/${chatId}/messages/stream`, {
        content: content,
        role: 'user'
      }, {
        responseType: 'stream'
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to stream message: ${error.message}`);
    }
  }
}

export default new MIPTechAPI();
```

### Step 3: WebSocket Manager

**File**: `src/services/websocketManager.js`
```javascript
import { v4 as uuidv4 } from 'uuid';

class WebSocketManager {
  constructor() {
    this.ws = null;
    this.sessionId = null;
    this.tenantId = 'miptech-company';
    this.baseURL = process.env.REACT_APP_MIPTECH_WS_URL || 'ws://localhost:8000';
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  connect(sessionId) {
    this.sessionId = sessionId || uuidv4();
    const wsUrl = `${this.baseURL}/api/v1/ws?tenant_id=${this.tenantId}&session_id=${this.sessionId}`;
    
    console.log(`[WebSocket] Connecting to: ${wsUrl}`);
    
    this.ws = new WebSocket(wsUrl);
    
    this.ws.onopen = () => {
      console.log('[WebSocket] Connected to MIPTech Platform');
      this.reconnectAttempts = 0;
      
      // Send authentication
      this.send({
        type: 'auth',
        data: {
          tenant_id: this.tenantId,
          session_id: this.sessionId,
          user_agent: navigator.userAgent,
          page_url: window.location.href
        }
      });
      
      this.emit('connected', { sessionId: this.sessionId });
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[WebSocket] Received:', data);
        this.emit('message', data);
        
        // Handle specific message types
        if (data.type) {
          this.emit(data.type, data);
        }
      } catch (error) {
        console.error('[WebSocket] Failed to parse message:', error);
      }
    };

    this.ws.onclose = (event) => {
      console.log(`[WebSocket] Disconnected: ${event.code} ${event.reason}`);
      this.emit('disconnected', { code: event.code, reason: event.reason });
      
      // Attempt to reconnect
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        console.log(`[WebSocket] Reconnecting (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        setTimeout(() => this.connect(this.sessionId), 1000 * this.reconnectAttempts);
      }
    };

    this.ws.onerror = (error) => {
      console.error('[WebSocket] Error:', error);
      this.emit('error', error);
    };
  }

  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.warn('[WebSocket] Cannot send message, connection not open');
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  // Event listener management
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => callback(data));
    }
  }
}

export default new WebSocketManager();
```

### Step 4: Session Manager

**File**: `src/services/sessionManager.js`
```javascript
import { v4 as uuidv4 } from 'uuid';

class SessionManager {
  constructor() {
    this.sessionKey = 'miptech_session';
    this.session = this.loadSession();
  }

  loadSession() {
    try {
      const saved = localStorage.getItem(this.sessionKey);
      if (saved) {
        const session = JSON.parse(saved);
        // Check if session is still valid (24 hours)
        const now = Date.now();
        const sessionAge = now - session.createdAt;
        if (sessionAge < 24 * 60 * 60 * 1000) {
          return session;
        }
      }
    } catch (error) {
      console.error('[Session] Failed to load session:', error);
    }
    
    return this.createSession();
  }

  createSession() {
    const session = {
      id: uuidv4(),
      visitorId: uuidv4(),
      createdAt: Date.now(),
      lastActivity: Date.now(),
      chatHistory: [],
      preferences: {
        theme: 'light',
        notifications: true
      }
    };
    
    this.saveSession(session);
    return session;
  }

  saveSession(session = this.session) {
    try {
      session.lastActivity = Date.now();
      localStorage.setItem(this.sessionKey, JSON.stringify(session));
      this.session = session;
    } catch (error) {
      console.error('[Session] Failed to save session:', error);
    }
  }

  getSession() {
    return this.session;
  }

  updateSession(updates) {
    this.session = { ...this.session, ...updates };
    this.saveSession();
  }

  clearSession() {
    localStorage.removeItem(this.sessionKey);
    this.session = this.createSession();
  }

  // Chat-specific methods
  addChatMessage(message) {
    this.session.chatHistory.push({
      ...message,
      timestamp: Date.now()
    });
    this.saveSession();
  }

  getChatHistory() {
    return this.session.chatHistory;
  }

  clearChatHistory() {
    this.session.chatHistory = [];
    this.saveSession();
  }
}

export default new SessionManager();
```

### Step 5: Chat Hook

**File**: `src/hooks/useChat.js`
```javascript
import { useState, useEffect, useCallback } from 'react';
import miptechApi from '../services/miptechApi';
import websocketManager from '../services/websocketManager';
import sessionManager from '../services/sessionManager';

export const useChat = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [currentChat, setCurrentChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Initialize chat
  const initializeChat = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const session = sessionManager.getSession();
      
      // Create new chat
      const chat = await miptechApi.createChat(session.id, session.visitorId);
      setCurrentChat(chat);
      
      // Load chat history
      const history = await miptechApi.getChatHistory(chat.id);
      setMessages(history.items || []);
      
      // Connect WebSocket
      websocketManager.connect(session.id);
      
      return chat;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Send message
  const sendMessage = useCallback(async (content) => {
    if (!currentChat) {
      throw new Error('No active chat session');
    }

    try {
      setIsLoading(true);
      setError(null);

      // Add user message immediately
      const userMessage = {
        id: Date.now(),
        content,
        role: 'user',
        timestamp: new Date().toISOString(),
        status: 'sending'
      };
      
      setMessages(prev => [...prev, userMessage]);
      sessionManager.addChatMessage(userMessage);

      // Send to API
      const response = await miptechApi.sendMessage(currentChat.id, content);
      
      // Update user message status
      setMessages(prev => 
        prev.map(msg => 
          msg.id === userMessage.id 
            ? { ...msg, status: 'sent' }
            : msg
        )
      );

      // Add AI response
      if (response) {
        const aiMessage = {
          ...response,
          status: 'received'
        };
        setMessages(prev => [...prev, aiMessage]);
        sessionManager.addChatMessage(aiMessage);
      }

      return response;
    } catch (err) {
      setError(err.message);
      
      // Update user message status
      setMessages(prev => 
        prev.map(msg => 
          msg.id === userMessage.id 
            ? { ...msg, status: 'error' }
            : msg
        )
      );
      
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [currentChat]);

  // WebSocket event handlers
  useEffect(() => {
    const handleConnected = () => {
      setIsConnected(true);
      setError(null);
    };

    const handleDisconnected = () => {
      setIsConnected(false);
    };

    const handleMessage = (data) => {
      if (data.type === 'chat_message') {
        const message = {
          ...data.message,
          status: 'received'
        };
        setMessages(prev => [...prev, message]);
        sessionManager.addChatMessage(message);
      }
    };

    const handleError = (error) => {
      setError('WebSocket connection error');
      setIsConnected(false);
    };

    websocketManager.on('connected', handleConnected);
    websocketManager.on('disconnected', handleDisconnected);
    websocketManager.on('message', handleMessage);
    websocketManager.on('error', handleError);

    return () => {
      websocketManager.off('connected', handleConnected);
      websocketManager.off('disconnected', handleDisconnected);
      websocketManager.off('message', handleMessage);
      websocketManager.off('error', handleError);
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      websocketManager.disconnect();
    };
  }, []);

  return {
    isConnected,
    currentChat,
    messages,
    isLoading,
    error,
    initializeChat,
    sendMessage
  };
};
```

### Step 6: Chat Widget Component

**File**: `src/components/ChatWidget.js`
```javascript
import React, { useState, useEffect, useRef } from 'react';
import { useChat } from '../hooks/useChat';
import { MessageCircle, Send, X, Minimize2, Maximize2 } from 'lucide-react';
import { gsap } from 'gsap';

const ChatWidget = ({ 
  position = 'bottom-right',
  theme = 'light',
  primaryColor = '#2563eb',
  className = '' 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [inputValue, setInputValue] = useState('');
  
  const widgetRef = useRef(null);
  const chatRef = useRef(null);
  const messagesRef = useRef(null);
  
  const {
    isConnected,
    currentChat,
    messages,
    isLoading,
    error,
    initializeChat,
    sendMessage
  } = useChat();

  // Initialize chat when widget opens
  useEffect(() => {
    if (isOpen && !currentChat) {
      initializeChat().catch(console.error);
    }
  }, [isOpen, currentChat, initializeChat]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messages]);

  // GSAP Animations
  useEffect(() => {
    if (isOpen) {
      gsap.fromTo(chatRef.current, 
        { opacity: 0, scale: 0.8, y: 20 },
        { opacity: 1, scale: 1, y: 0, duration: 0.3, ease: 'back.out(1.7)' }
      );
    }
  }, [isOpen]);

  const handleToggle = () => {
    if (isOpen) {
      gsap.to(chatRef.current, {
        opacity: 0,
        scale: 0.8,
        y: 20,
        duration: 0.2,
        ease: 'power2.in',
        onComplete: () => setIsOpen(false)
      });
    } else {
      setIsOpen(true);
    }
  };

  const handleMinimize = () => {
    setIsMinimized(!isMinimized);
    gsap.to(chatRef.current, {
      height: isMinimized ? '400px' : '60px',
      duration: 0.3,
      ease: 'power2.inOut'
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const message = inputValue.trim();
    setInputValue('');

    try {
      await sendMessage(message);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const getPositionClasses = () => {
    const positions = {
      'bottom-right': 'bottom-4 right-4',
      'bottom-left': 'bottom-4 left-4',
      'top-right': 'top-4 right-4',
      'top-left': 'top-4 left-4'
    };
    return positions[position] || positions['bottom-right'];
  };

  return (
    <div 
      ref={widgetRef}
      className={`fixed ${getPositionClasses()} z-50 ${className}`}
      style={{ '--primary-color': primaryColor }}
    >
      {/* Chat Toggle Button */}
      {!isOpen && (
        <button
          onClick={handleToggle}
          className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg transition-all duration-300 hover:scale-110"
          style={{ backgroundColor: primaryColor }}
        >
          <MessageCircle size={24} />
        </button>
      )}

      {/* Chat Widget */}
      {isOpen && (
        <div
          ref={chatRef}
          className={`w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 ${
            isMinimized ? 'h-16' : 'h-96'
          } flex flex-col overflow-hidden`}
        >
          {/* Header */}
          <div className="bg-blue-600 text-white p-4 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-green-400' : 'bg-red-400'
              }`} />
              <span className="font-semibold">MIPTech AI Assistant</span>
            </div>
            <div className="flex items-center space-x-1">
              <button
                onClick={handleMinimize}
                className="p-1 hover:bg-blue-700 rounded"
              >
                {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
              </button>
              <button
                onClick={handleToggle}
                className="p-1 hover:bg-blue-700 rounded"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Messages */}
              <div
                ref={messagesRef}
                className="flex-1 p-4 overflow-y-auto space-y-3 bg-gray-50 dark:bg-gray-900"
              >
                {error && (
                  <div className="text-red-600 text-sm bg-red-100 p-2 rounded">
                    {error}
                  </div>
                )}
                
                {messages.map((message, index) => (
                  <div
                    key={message.id || index}
                    className={`flex ${
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-xs px-3 py-2 rounded-lg ${
                        message.role === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200'
                      } ${
                        message.status === 'sending' ? 'opacity-50' : ''
                      } ${
                        message.status === 'error' ? 'border-red-500' : ''
                      }`}
                    >
                      {message.content}
                      {message.status === 'sending' && (
                        <div className="text-xs mt-1 opacity-70">Sending...</div>
                      )}
                    </div>
                  </div>
                ))}
                
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white dark:bg-gray-800 px-3 py-2 rounded-lg">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Input */}
              <form onSubmit={handleSubmit} className="p-4 bg-white dark:bg-gray-800 border-t">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    disabled={isLoading}
                  />
                  <button
                    type="submit"
                    disabled={!inputValue.trim() || isLoading}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white p-2 rounded-lg transition-colors"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ChatWidget;
```

---

## API Integration

### Environment Variables

**File**: `.env` (for development)
```bash
# MIPTech Platform URLs
REACT_APP_MIPTECH_API_URL=http://localhost:8000
REACT_APP_MIPTECH_WS_URL=ws://localhost:8000

# Production URLs
# REACT_APP_MIPTECH_API_URL=https://api.miptechnologies.tech
# REACT_APP_MIPTECH_WS_URL=wss://api.miptechnologies.tech
```

### Integration with Existing Components

**File**: `src/App.js`
```javascript
import React from 'react';
import ChatWidget from './components/ChatWidget';
import { ErrorBoundary } from 'react-error-boundary';

// Your existing components
import AnimatedBackground from './components/AnimatedBackground';
import ThreeJSCanvas from './components/ThreeJSCanvas';
import Navigation from './components/Navigation';

function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div className="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded z-50">
      <h3 className="font-bold">Chat Error</h3>
      <p>{error.message}</p>
      <button
        onClick={resetErrorBoundary}
        className="mt-2 bg-red-500 text-white px-3 py-1 rounded text-sm"
      >
        Try Again
      </button>
    </div>
  );
}

function App() {
  return (
    <div className="App">
      {/* Your existing app structure */}
      <AnimatedBackground />
      <ThreeJSCanvas />
      <Navigation />
      
      {/* Your existing page content */}
      <main>
        {/* Your existing components */}
      </main>
      
      {/* MIPTech AI Chat Widget */}
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <ChatWidget 
          position="bottom-right"
          theme="light"
          primaryColor="#2563eb"
        />
      </ErrorBoundary>
    </div>
  );
}

export default App;
```

---

## WebSocket Integration

### Real-time Message Handling

The WebSocket integration is handled by the `websocketManager` service and the `useChat` hook. Here's how it works:

1. **Connection**: Automatically connects when chat initializes
2. **Authentication**: Sends tenant and session info
3. **Message Handling**: Receives real-time AI responses
4. **Reconnection**: Automatically reconnects on connection loss

### Message Types

```javascript
// Authentication message
{
  type: 'auth',
  data: {
    tenant_id: 'miptech-company',
    session_id: 'user-session-id'
  }
}

// Chat message
{
  type: 'chat_message',
  message: {
    id: 'message-id',
    content: 'AI response',
    role: 'assistant',
    timestamp: '2025-07-15T...'
  }
}

// Status updates
{
  type: 'status',
  data: {
    status: 'typing' | 'processing' | 'complete'
  }
}
```

---

## State Management

### Context Provider (Optional)

For complex applications, you might want to use React Context:

**File**: `src/contexts/ChatContext.js`
```javascript
import React, { createContext, useContext, useReducer } from 'react';

const ChatContext = createContext();

const chatReducer = (state, action) => {
  switch (action.type) {
    case 'SET_CONNECTED':
      return { ...state, isConnected: action.payload };
    case 'SET_CHAT':
      return { ...state, currentChat: action.payload };
    case 'ADD_MESSAGE':
      return { ...state, messages: [...state.messages, action.payload] };
    case 'UPDATE_MESSAGE':
      return {
        ...state,
        messages: state.messages.map(msg =>
          msg.id === action.payload.id ? { ...msg, ...action.payload } : msg
        )
      };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    default:
      return state;
  }
};

export const ChatProvider = ({ children }) => {
  const [state, dispatch] = useReducer(chatReducer, {
    isConnected: false,
    currentChat: null,
    messages: [],
    error: null
  });

  return (
    <ChatContext.Provider value={{ state, dispatch }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChatContext = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within ChatProvider');
  }
  return context;
};
```

---

## UI/UX Integration

### Integration with GSAP Animations

**File**: `src/components/AnimatedChatWidget.js`
```javascript
import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import ChatWidget from './ChatWidget';

const AnimatedChatWidget = (props) => {
  const containerRef = useRef(null);

  useEffect(() => {
    // Create a timeline for entrance animation
    const tl = gsap.timeline();
    
    // Animate in from bottom with bounce
    tl.fromTo(containerRef.current, 
      {
        y: 100,
        opacity: 0,
        scale: 0.8
      },
      {
        y: 0,
        opacity: 1,
        scale: 1,
        duration: 0.6,
        ease: 'back.out(1.7)'
      }
    );

    // Add floating animation
    gsap.to(containerRef.current, {
      y: -10,
      duration: 2,
      ease: 'power2.inOut',
      yoyo: true,
      repeat: -1
    });

    return () => {
      tl.kill();
    };
  }, []);

  return (
    <div ref={containerRef}>
      <ChatWidget {...props} />
    </div>
  );
};

export default AnimatedChatWidget;
```

### Integration with Three.js

**File**: `src/components/ThreeJSChatIntegration.js`
```javascript
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

const ThreeJSChatIntegration = ({ isActive, messageCount }) => {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);

  useEffect(() => {
    if (!mountRef.current) return;

    // Create scene
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true });
    
    renderer.setSize(50, 50);
    mountRef.current.appendChild(renderer.domElement);

    // Create a simple indicator sphere
    const geometry = new THREE.SphereGeometry(0.5, 32, 32);
    const material = new THREE.MeshBasicMaterial({ 
      color: isActive ? 0x00ff00 : 0x666666,
      transparent: true,
      opacity: 0.8
    });
    const sphere = new THREE.Mesh(geometry, material);
    scene.add(sphere);

    camera.position.z = 2;

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      
      // Rotate based on activity
      if (isActive) {
        sphere.rotation.y += 0.02;
        sphere.rotation.x += 0.01;
      }
      
      // Pulse based on message count
      const scale = 1 + Math.sin(Date.now() * 0.01) * 0.1;
      sphere.scale.setScalar(scale);
      
      renderer.render(scene, camera);
    };

    animate();

    sceneRef.current = scene;
    rendererRef.current = renderer;

    return () => {
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [isActive, messageCount]);

  return (
    <div 
      ref={mountRef} 
      className="absolute top-2 right-2 pointer-events-none"
      style={{ width: '50px', height: '50px' }}
    />
  );
};

export default ThreeJSChatIntegration;
```

---

## Performance Optimization

### Performance Monitoring

**File**: `src/services/performanceMonitor.js`
```javascript
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      chatLoadTime: 0,
      messageResponseTime: 0,
      webSocketConnectTime: 0,
      apiResponseTimes: []
    };
    this.observer = null;
    this.initWebVitals();
  }

  initWebVitals() {
    // Monitor Core Web Vitals
    if ('web-vitals' in window) {
      import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
        getCLS(this.logMetric);
        getFID(this.logMetric);
        getFCP(this.logMetric);
        getLCP(this.logMetric);
        getTTFB(this.logMetric);
      });
    }
  }

  logMetric = (metric) => {
    console.log(`[Performance] ${metric.name}: ${metric.value}`);
    
    // Send to analytics (optional)
    if (window.gtag) {
      window.gtag('event', metric.name, {
        event_category: 'Web Vitals',
        value: Math.round(metric.value),
        non_interaction: true
      });
    }
  };

  startTimer(name) {
    this.metrics[`${name}StartTime`] = performance.now();
  }

  endTimer(name) {
    const startTime = this.metrics[`${name}StartTime`];
    if (startTime) {
      const duration = performance.now() - startTime;
      this.metrics[`${name}Time`] = duration;
      console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`);
      return duration;
    }
  }

  trackApiCall(url, duration) {
    this.metrics.apiResponseTimes.push({
      url,
      duration,
      timestamp: Date.now()
    });
  }

  getMetrics() {
    return this.metrics;
  }
}

export default new PerformanceMonitor();
```

### Lazy Loading Components

**File**: `src/components/LazyChat.js`
```javascript
import React, { Suspense, lazy } from 'react';

const ChatWidget = lazy(() => import('./ChatWidget'));

const LazyChat = (props) => {
  return (
    <Suspense fallback={
      <div className="fixed bottom-4 right-4 z-50">
        <button className="bg-blue-600 text-white p-4 rounded-full shadow-lg animate-pulse">
          <div className="w-6 h-6 bg-white/20 rounded"></div>
        </button>
      </div>
    }>
      <ChatWidget {...props} />
    </Suspense>
  );
};

export default LazyChat;
```

### Bundle Size Optimization

**File**: `src/utils/optimizations.js`
```javascript
// Code splitting for WebSocket
export const loadWebSocketManager = () => {
  return import('../services/websocketManager').then(module => module.default);
};

// Lazy load GSAP animations
export const loadGSAP = () => {
  return import('gsap').then(module => module.gsap);
};

// Conditional loading based on features
export const loadChatFeatures = async (features) => {
  const modules = {};
  
  if (features.animations) {
    modules.gsap = await loadGSAP();
  }
  
  if (features.realtime) {
    modules.websocket = await loadWebSocketManager();
  }
  
  return modules;
};
```

---

## Error Handling

### Error Boundary

**File**: `src/components/ChatErrorBoundary.js`
```javascript
import React from 'react';

class ChatErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Chat widget error:', error, errorInfo);
    
    // Send to error reporting service
    if (window.Sentry) {
      window.Sentry.captureException(error, {
        contexts: {
          react: {
            componentStack: errorInfo.componentStack
          }
        }
      });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded z-50 max-w-sm">
          <h3 className="font-bold">Chat Unavailable</h3>
          <p className="text-sm">
            Our chat service is temporarily unavailable. Please try refreshing the page.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 bg-red-500 text-white px-3 py-1 rounded text-sm"
          >
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ChatErrorBoundary;
```

### API Error Handling

**File**: `src/utils/errorHandler.js`
```javascript
export const handleApiError = (error) => {
  console.error('API Error:', error);
  
  if (error.response) {
    // Server responded with error status
    const { status, data } = error.response;
    
    switch (status) {
      case 400:
        return 'Invalid request. Please check your input.';
      case 401:
        return 'Authentication required. Please refresh the page.';
      case 403:
        return 'Access denied. You may not have permission for this action.';
      case 404:
        return 'Service not found. Please try again later.';
      case 429:
        return 'Rate limit exceeded. Please wait a moment and try again.';
      case 500:
        return 'Server error. Please try again later.';
      default:
        return data?.message || 'An error occurred. Please try again.';
    }
  } else if (error.request) {
    // Request was made but no response received
    return 'Network error. Please check your connection and try again.';
  } else {
    // Something else happened
    return 'An unexpected error occurred. Please try again.';
  }
};

export const handleWebSocketError = (error) => {
  console.error('WebSocket Error:', error);
  
  if (error.code) {
    switch (error.code) {
      case 1000:
        return 'Connection closed normally.';
      case 1001:
        return 'Connection lost. Attempting to reconnect...';
      case 1006:
        return 'Connection closed unexpectedly. Attempting to reconnect...';
      default:
        return 'Connection error. Attempting to reconnect...';
    }
  }
  
  return 'WebSocket connection error. Please refresh the page if issues persist.';
};
```

---

## Testing

### Unit Tests

**File**: `src/components/__tests__/ChatWidget.test.js`
```javascript
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ChatWidget from '../ChatWidget';

// Mock services
jest.mock('../services/miptechApi', () => ({
  createChat: jest.fn(),
  sendMessage: jest.fn(),
  getChatHistory: jest.fn()
}));

jest.mock('../services/websocketManager', () => ({
  connect: jest.fn(),
  disconnect: jest.fn(),
  on: jest.fn(),
  off: jest.fn()
}));

describe('ChatWidget', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders chat toggle button', () => {
    render(<ChatWidget />);
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  test('opens chat when button is clicked', async () => {
    render(<ChatWidget />);
    const button = screen.getByRole('button');
    
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(screen.getByText('MIPTech AI Assistant')).toBeInTheDocument();
    });
  });

  test('sends message when form is submitted', async () => {
    const mockSendMessage = require('../services/miptechApi').sendMessage;
    mockSendMessage.mockResolvedValue({ id: 1, content: 'Test response' });
    
    render(<ChatWidget />);
    
    // Open chat
    fireEvent.click(screen.getByRole('button'));
    
    await waitFor(() => {
      expect(screen.getByText('MIPTech AI Assistant')).toBeInTheDocument();
    });
    
    // Type message
    const input = screen.getByPlaceholderText('Type your message...');
    fireEvent.change(input, { target: { value: 'Hello' } });
    
    // Submit form
    const sendButton = screen.getByRole('button', { name: /send/i });
    fireEvent.click(sendButton);
    
    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith(undefined, 'Hello');
    });
  });
});
```

### Integration Tests

**File**: `src/services/__tests__/miptechApi.test.js`
```javascript
import miptechApi from '../miptechApi';
import axios from 'axios';

jest.mock('axios');

describe('MIPTech API Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('creates chat successfully', async () => {
    const mockResponse = {
      data: { id: 'chat-123', session_id: 'session-456' }
    };
    axios.create.mockReturnValue({
      post: jest.fn().mockResolvedValue(mockResponse)
    });

    const result = await miptechApi.createChat('session-456', 'visitor-789');
    
    expect(result).toEqual(mockResponse.data);
  });

  test('handles API errors gracefully', async () => {
    const mockError = new Error('Network error');
    axios.create.mockReturnValue({
      post: jest.fn().mockRejectedValue(mockError)
    });

    await expect(miptechApi.createChat('session-456', 'visitor-789'))
      .rejects.toThrow('Failed to create chat: Network error');
  });
});
```

---

## Deployment

### Build Configuration

**File**: `package.json`
```json
{
  "name": "miptech-website",
  "version": "1.0.0",
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject",
    "build:analyze": "npm run build && npx webpack-bundle-analyzer build/static/js/*.js"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "axios": "^1.5.0",
    "uuid": "^9.0.0",
    "lucide-react": "^0.290.0",
    "gsap": "^3.12.2",
    "three": "^0.158.0",
    "framer-motion": "^10.16.4"
  },
  "devDependencies": {
    "@testing-library/react": "^13.4.0",
    "@testing-library/jest-dom": "^5.16.5",
    "@testing-library/user-event": "^14.4.3",
    "react-scripts": "5.0.1"
  }
}
```

### Netlify Configuration

**File**: `netlify.toml`
```toml
[build]
  command = "npm run build"
  publish = "build"

[build.environment]
  REACT_APP_MIPTECH_API_URL = "https://api.miptechnologies.tech"
  REACT_APP_MIPTECH_WS_URL = "wss://api.miptechnologies.tech"

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    X-XSS-Protection = "1; mode=block"
    Referrer-Policy = "strict-origin-when-cross-origin"

[[headers]]
  for = "/static/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### Vercel Configuration

**File**: `vercel.json`
```json
{
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "build"
      }
    }
  ],
  "routes": [
    {
      "src": "/static/(.*)",
      "headers": {
        "Cache-Control": "public, max-age=31536000"
      }
    },
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ],
  "env": {
    "REACT_APP_MIPTECH_API_URL": "https://api.miptechnologies.tech",
    "REACT_APP_MIPTECH_WS_URL": "wss://api.miptechnologies.tech"
  }
}
```

---

## Production Configuration

### Environment Variables

**Production**: `.env.production`
```bash
REACT_APP_MIPTECH_API_URL=https://api.miptechnologies.tech
REACT_APP_MIPTECH_WS_URL=wss://api.miptechnologies.tech
REACT_APP_ENVIRONMENT=production
REACT_APP_ANALYTICS_ID=GA_MEASUREMENT_ID
```

### Security Headers

**File**: `public/_headers` (for Netlify)
```
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  X-XSS-Protection: 1; mode=block
  Referrer-Policy: strict-origin-when-cross-origin
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://www.googletagmanager.com; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; img-src 'self' data: https:; font-src 'self' https:; connect-src 'self' https://api.miptechnologies.tech wss://api.miptechnologies.tech https://www.google-analytics.com; frame-ancestors 'none';
```

### Performance Optimizations

**File**: `src/utils/production.js`
```javascript
// Production-specific optimizations
export const initProductionOptimizations = () => {
  // Preload critical resources
  if (typeof window !== 'undefined') {
    // Preload WebSocket connection
    const wsUrl = process.env.REACT_APP_MIPTECH_WS_URL;
    if (wsUrl) {
      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = wsUrl.replace('wss://', 'https://').replace('ws://', 'http://');
      document.head.appendChild(link);
    }

    // Preload API endpoint
    const apiUrl = process.env.REACT_APP_MIPTECH_API_URL;
    if (apiUrl) {
      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = apiUrl;
      document.head.appendChild(link);
    }
  }

  // Service Worker registration
  if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  }
};
```

---

## Summary

This guide provides a complete integration solution for your React SPA website with the MIPTech AI Platform:

### ✅ **Implemented Features:**
- Direct API integration (no backend required)
- Real-time WebSocket communication
- Session management with localStorage
- GSAP animation integration
- Three.js compatibility
- Tailwind CSS styling
- Performance monitoring
- Error handling and recovery
- Production-ready deployment

### ✅ **Key Benefits:**
- **Static Hosting Compatible**: Works with Netlify, Vercel, S3
- **Performance Optimized**: Lazy loading, code splitting, caching
- **Existing Stack Integration**: GSAP, Three.js, Tailwind CSS
- **Production Ready**: Security headers, monitoring, error handling
- **Domain Configured**: Works with `miptechnologies.tech`

### ✅ **Next Steps:**
1. Add the `ChatWidget` component to your existing app
2. Configure environment variables
3. Test the integration in development
4. Deploy to production with your static hosting provider

The platform is now fully configured to support your static React SPA website with real-time AI chat capabilities.

---

**Document Version**: 2.0  
**Last Updated**: July 15, 2025