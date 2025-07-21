MIPTech AI Platform - Complete Client-Server Connection Documentation

  📋 Table of Contents

  1. #executive-overview
  2. #enterprise-security-model
  3. #connection-architecture
  4. #database--tenant-setup
  5. #api-endpoints-documentation
  6. #websocket-implementation
  7. #client-side-integration
  8. #testing--validation
  9. #production-configuration
  10. #troubleshooting-guide

  ---
  🎯 Executive Overview

  The MipTech AI Platform is an enterprise-grade, multi-tenant SaaS platform that provides AI-powered chat assistants
  with RAG (Retrieval-Augmented Generation) capabilities. This documentation provides complete requirements for
  establishing secure connections between the platform server (localhost:8000) and client applications
  (localhost:3000) while maintaining all security standards.

  Key Architecture Components:

  - Multi-tenant isolation with PostgreSQL schema-based segregation
  - Enterprise security with JWT tokens, API keys, and rate limiting
  - Real-time WebSocket communication with streaming responses
  - RESTful API for chat management and configuration
  - React-based frontend widgets with TypeScript

  ---
  🔒 Enterprise Security Model

  1. Multi-Tenant Architecture

  The platform uses tenant-based isolation where each client organization has:
  - Unique tenant ID (e.g., miptech-company)
  - Dedicated database schema for data isolation
  - Separate vector namespace for embeddings
  - Individual rate limiting and usage quotas
  - Custom configuration and branding

  2. Authentication Flow

  graph TD
      A[Client Application] --> B[Extract Tenant ID]
      B --> C[Validate Tenant Exists]
      C --> D[Check API Key/Token]
      D --> E[Establish WebSocket Connection]
      E --> F[Send Chat Messages]
      F --> G[Receive Streaming Responses]

  3. Security Components

  Required Authentication:
  - Tenant ID: Identifies the client organization
  - API Key/Token: Optional but recommended for production
  - User ID: Optional for user-specific sessions
  - Client ID: Auto-generated for session tracking

  Security Middleware Stack:
  # Execution order (last added = first executed)
  1. GZipMiddleware
  2. ErrorHandlerMiddleware
  3. RequestIDMiddleware
  4. TenantContextMiddleware    # 🔐 Tenant validation
  5. MonitoringMiddleware
  6. CORSMiddleware           # ✅ localhost:3000 already allowed

  ---
  🏗️ Connection Architecture

  1. Server Configuration

  Platform Server (localhost:8000)
  - FastAPI backend with async WebSocket support
  - PostgreSQL database with multi-tenant schemas
  - Redis for caching and session management
  - Celery for background tasks
  - Comprehensive monitoring and logging

  CORS Configuration:
  CORS_ORIGINS = ["http://localhost:3000", "http://localhost:8080"]
  CORS_ALLOW_CREDENTIALS = True

  2. Available Endpoints

  WebSocket Endpoints:
  - /api/v1/ws/chat (Primary)
  - /api/v1/ws/ (Root alias)
  - /ws/ (Compatibility alias)
  - /api/ws/ (Compatibility alias)

  REST API Endpoints:
  - /api/v1/chat/ - Chat management
  - /api/v1/auth/ - Authentication
  - /api/v1/admin/ - Administrative functions
  - /api/v1/health - Health checks

  3. Connection Parameters

  Required WebSocket Parameters:
  const wsUrl = new URL('ws://localhost:8000/api/v1/ws/chat')
  wsUrl.searchParams.set('tenant_id', 'miptech-company')  // Required
  wsUrl.searchParams.set('client_id', 'client-123')       // Optional
  wsUrl.searchParams.set('user_id', 'user-456')           // Optional
  wsUrl.searchParams.set('token', 'jwt-token')            // Optional

  ---
  🗄️ Database & Tenant Setup

  1. Tenant Creation

  Step 1: Create Tenant Record
  -- Execute: psql -U miptech -d miptech -f scripts/create_company_tenant.sql
  INSERT INTO tenants (
      id, name, domain, status, settings
  ) VALUES (
      'miptech-company',
      'MIPTech Company Website',
      'miptech.ai',
      'active',
      '{
          "plan": "enterprise",
          "features": {
              "chat": true,
              "rag": true,
              "analytics": true
          },
          "limits": {
              "messages_per_day": 10000,
              "concurrent_connections": 100,
              "messages_per_minute": 60
          }
      }'::jsonb
  );

  Step 2: Verify Tenant Creation
  SELECT id, name, status, settings->'limits' as limits
  FROM tenants WHERE id = 'miptech-company';

  2. Database Schema

  Multi-Tenant Schema Structure:
  public:
  ├── tenants (tenant configuration)
  ├── users (user accounts)
  └── external_user_mapping

  tenant_miptech_company:
  ├── chats (chat sessions)
  ├── chat_messages (conversation history)
  ├── documents (uploaded files)
  └── analytics (usage metrics)

  3. Required Environment Variables

  # Database
  POSTGRES_USER=miptech
  POSTGRES_PASSWORD=miptech123
  POSTGRES_DB=miptech
  POSTGRES_HOST=localhost
  POSTGRES_PORT=5432

  # Redis
  REDIS_HOST=localhost
  REDIS_PORT=6379

  # Security
  SECRET_KEY=your-secret-key-here
  JWT_SECRET_KEY=your-jwt-secret-here

  # OpenAI (Required for AI features)
  OPENAI_API_KEY=your-openai-api-key
  OPENAI_MODEL=gpt-4

  # Pinecone (Required for RAG)
  PINECONE_API_KEY=your-pinecone-api-key
  PINECONE_ENV=your-pinecone-environment

  ---
  📡 API Endpoints Documentation

  1. Chat Management API

  Create Chat Session:
  POST /api/v1/chat/
  Headers: X-Tenant-ID: miptech-company
  Content-Type: application/json

  {
      "title": "Customer Support Chat",
      "user_id": "user-123",
      "visitor_id": "visitor-456",
      "context": {"page_url": "https://example.com/pricing"}
  }

  Send Chat Message:
  POST /api/v1/chat/{chat_id}/messages
  Headers: X-Tenant-ID: miptech-company

  {
      "content": "Hello, I need help with pricing",
      "role": "user",
      "message_type": "text"
  }

  Get Chat History:
  GET /api/v1/chat/{chat_id}/messages
  Headers: X-Tenant-ID: miptech-company

  2. Authentication API

  Tenant Validation:
  GET /api/v1/auth/tenant/{tenant_id}

  Health Check:
  GET /api/v1/health
  # Returns: {"status": "healthy", "timestamp": "2025-07-18T..."}

  3. Rate Limiting

  Default Limits:
  - 60 requests/minute per tenant
  - 10 burst requests allowed
  - WebSocket connection limits based on tenant plan

  Rate Limit Headers:
  X-RateLimit-Limit: 60
  X-RateLimit-Remaining: 59
  X-RateLimit-Reset: 1642694400

  ---
  🔌 WebSocket Implementation

  1. Connection Protocol

  Client Connection:
  const wsUrl = 'ws://localhost:8000/api/v1/ws/chat'
  const params = new URLSearchParams({
      tenant_id: 'miptech-company',
      client_id: 'client-123'
  })

  const ws = new WebSocket(`${wsUrl}?${params}`)

  Server Response Messages:
  // Connection established
  {
      "type": "connection_established",
      "data": {
          "client_id": "client-123",
          "tenant_id": "miptech-company",
          "timestamp": "2025-07-18T..."
      }
  }

  2. Message Protocol

  Send Chat Message:
  ws.send(JSON.stringify({
      type: 'chat_message',
      data: {
          message: 'Hello, I need help',
          chat_id: 'chat-456',  // Optional
          stream: true
      }
  }))

  Streaming Response Flow:
  // 1. Processing indication
  {
      "type": "processing",
      "data": {"message": "Processing your request..."}
  }

  // 2. Response start
  {
      "type": "response_start",
      "data": {
          "message_id": "msg_123",
          "chat_id": "chat_456"
      }
  }

  // 3. Streaming chunks
  {
      "type": "response_chunk",
      "data": {
          "message_id": "msg_123",
          "content": "Hello! I'd be happy to help..."
      }
  }

  // 4. Response complete
  {
      "type": "response_complete",
      "data": {
          "message_id": "msg_123",
          "total_tokens": 150,
          "cost_estimate": 0.0045,
          "sources": [...],
          "total_chunks": 12
      }
  }

  3. Error Handling

  Connection Errors:
  // Rate limit exceeded
  {
      "type": "rate_limit_exceeded",
      "data": {
          "message": "Rate limit exceeded",
          "retry_after": 60
      }
  }

  // General error
  {
      "type": "error",
      "data": {
          "message": "Failed to process message",
          "error_code": "PROCESSING_ERROR"
      }
  }

  Client-Side Error Handling:
  ws.onerror = (error) => {
      console.error('WebSocket error:', error)
      // Implement exponential backoff retry
  }

  ws.onclose = (event) => {
      if (event.code !== 1000) {
          // Unexpected close - attempt reconnection
          setTimeout(() => reconnect(), 1000)
      }
  }

  ---
  💻 Client-Side Integration

  1. React Integration Example

  Basic Setup:
  import { useWebSocket } from '@/hooks/useWebSocket'

  export const ChatWidget = () => {
      const {
          connect,
          sendChatMessage,
          isConnected,
          connectionStatus
      } = useWebSocket()

      useEffect(() => {
          // Configure the widget
          useWidgetStore.getState().setConfig({
              apiUrl: 'http://localhost:8000',
              tenantId: 'miptech-company',
              theme: 'auto',
              autoConnect: true
          })
      }, [])

      const handleSendMessage = (message: string) => {
          sendChatMessage(message)
      }

      return (
          <div className="chat-widget">
              <ConnectionStatus status={connectionStatus} />
              {/* Chat interface components */}
          </div>
      )
  }

  2. Configuration Object

  Widget Configuration:
  interface WidgetConfig {
      apiUrl: string              // 'http://localhost:8000'
      tenantId: string           // 'miptech-company'
      userId?: string            // Optional user identifier
      token?: string             // Optional JWT token
      theme?: 'light' | 'dark' | 'auto'
      autoConnect?: boolean      // Default: true
      maxReconnectAttempts?: number  // Default: 5
      reconnectInterval?: number     // Default: 3000ms

      // Callbacks
      onConnect?: () => void
      onDisconnect?: () => void
      onMessage?: (message: ChatMessage) => void
      onError?: (error: Error) => void
  }

  3. State Management

  Widget Store (Zustand):
  interface WidgetState {
      config: WidgetConfig | null
      connection: {
          status: 'disconnected' | 'connecting' | 'connected' | 'error'
          error?: string
          reconnectAttempts: number
      }
      messages: ChatMessage[]
      chats: Chat[]
      currentChat: Chat | null
      streaming: {
          isStreaming: boolean
          currentMessageId: string | null
          chunks: string[]
      }
  }

  4. Message Handling

  Message Types:
  interface ChatMessage {
      id: string
      content: string
      role: 'user' | 'assistant' | 'system'
      timestamp: number
      status: 'sending' | 'sent' | 'error'
      metadata?: {
          streaming?: boolean
          total_tokens?: number
          cost_estimate?: number
          sources?: any[]
      }
  }

  ---
  🧪 Testing & Validation

  1. Connection Testing Script

  WebSocket Test (test_websocket.py):
  #!/usr/bin/env python3
  import asyncio
  import websockets
  import json

  async def test_connection():
      url = "ws://localhost:8000/api/v1/ws/chat"
      params = "tenant_id=miptech-company&client_id=test-client"

      async with websockets.connect(f"{url}?{params}") as ws:
          # Send ping
          await ws.send(json.dumps({
              "type": "ping",
              "data": {}
          }))

          # Wait for pong
          response = await ws.recv()
          print(f"Received: {response}")

  if __name__ == "__main__":
      asyncio.run(test_connection())

  Run the test:
  python test_websocket.py

  2. API Testing with curl

  Test tenant validation:
  curl -H "X-Tenant-ID: miptech-company" \
       http://localhost:8000/api/v1/health

  Test chat creation:
  curl -X POST \
       -H "Content-Type: application/json" \
       -H "X-Tenant-ID: miptech-company" \
       -d '{"title": "Test Chat"}' \
       http://localhost:8000/api/v1/chat/

  3. Frontend Testing

  Install and run frontend:
  cd frontend
  npm install
  npm run dev
  # Server starts on localhost:3000

  Test configuration:
  // In browser console
  window.MIPTechChatWidget.init({
      apiUrl: 'http://localhost:8000',
      tenantId: 'miptech-company',
      theme: 'auto'
  })

  ---
  🚀 Production Configuration

  1. Environment Setup

  Backend Environment (.env):
  # Application
  ENVIRONMENT=development
  DEBUG=true
  SECRET_KEY=your-secret-key-here
  API_V1_STR=/api/v1

  # Database
  POSTGRES_USER=miptech
  POSTGRES_PASSWORD=miptech123
  POSTGRES_DB=miptech
  POSTGRES_HOST=localhost
  POSTGRES_PORT=5432

  # Redis
  REDIS_HOST=localhost
  REDIS_PORT=6379

  # Security
  JWT_SECRET_KEY=your-jwt-secret-here
  CORS_ORIGINS=["http://localhost:3000", "http://localhost:8080"]
  CORS_ALLOW_CREDENTIALS=true

  # AI Services
  OPENAI_API_KEY=your-openai-api-key
  OPENAI_MODEL=gpt-4
  PINECONE_API_KEY=your-pinecone-api-key
  PINECONE_ENV=your-pinecone-environment

  # Rate Limiting
  RATE_LIMIT_ENABLED=true
  RATE_LIMIT_REQUESTS_PER_MINUTE=60

  # Multi-tenant
  DEFAULT_TENANT_ID=demo
  TENANT_ISOLATION_ENABLED=true

  2. Startup Procedures

  Database Setup:
  # 1. Start PostgreSQL and Redis
  sudo systemctl start postgresql redis

  # 2. Create database
  createdb -U postgres miptech

  # 3. Run migrations
  source venv/bin/activate
  python -m alembic upgrade head

  # 4. Create tenant
  psql -U miptech -d miptech -f scripts/create_company_tenant.sql

  Server Startup:
  # Start platform server
  ./start-dev-server.sh

  # Expected output:
  # ✅ Database connected
  # ✅ Redis connection established  
  # 🚀 Starting FastAPI server on http://localhost:8000

  3. Security Checklist

  Before Production:
  - Environment variables properly configured
  - Database credentials secured
  - API keys configured for OpenAI/Pinecone
  - CORS origins updated for production domains
  - Rate limiting configured per tenant
  - SSL/TLS enabled for WebSocket connections
  - JWT tokens properly validated
  - Tenant isolation verified
  - Monitoring and logging enabled

  ---
  🔍 Troubleshooting Guide

  1. Common Connection Issues

  Issue: WebSocket connection fails
  Solution checklist:
  1. ✅ Server running on localhost:8000
  2. ✅ Tenant ID 'miptech-company' exists in database
  3. ✅ CORS configured for localhost:3000
  4. ✅ No firewall blocking WebSocket connections
  5. ✅ Correct endpoint: /api/v1/ws/chat

  Issue: Authentication errors
  Error: "Tenant not found"
  Solution: Verify tenant exists:
    SELECT * FROM tenants WHERE id = 'miptech-company';

  Error: "Rate limit exceeded"  
  Solution: Check rate limiting settings and wait for reset

  2. Database Connection Issues

  Issue: Database connection fails
  # Check PostgreSQL status
  sudo systemctl status postgresql

  # Test connection
  psql -U miptech -d miptech -c "SELECT 1"

  # Check migrations
  python -m alembic current

  Issue: Tenant schema not found
  -- Check tenant schemas
  SELECT schema_name FROM information_schema.schemata
  WHERE schema_name LIKE 'tenant_%';

  -- Create missing schema
  CREATE SCHEMA tenant_miptech_company;

  3. WebSocket Debugging

  Enable verbose logging:
  # In backend/.env
  LOG_LEVEL=DEBUG
  ENABLE_STRUCTURED_LOGGING=true

  Browser debugging:
  // Enable WebSocket logging
  localStorage.setItem('debug', 'websocket')

  // Check connection state
  console.log(ws.readyState)
  // 0: CONNECTING, 1: OPEN, 2: CLOSING, 3: CLOSED

  4. Performance Monitoring

  Check server metrics:
  # Memory usage
  free -h

  # CPU usage  
  htop

  # Network connections
  netstat -an | grep :8000

  # PostgreSQL connections
  psql -U miptech -d miptech -c "SELECT * FROM pg_stat_activity"

  ---
  📚 Additional Resources

  1. API Documentation

  - Interactive API docs: http://localhost:8000/docs
  - OpenAPI specification: http://localhost:8000/openapi.json
  - Health check: http://localhost:8000/health

  2. Code Examples

  - Frontend integration: /frontend/src/hooks/useWebSocket.ts
  - WebSocket testing: /test_websocket.py
  - Tenant creation: /scripts/create_company_tenant.sql

  3. Configuration Files

  - Main configuration: /backend/app/core/config.py
  - Database models: /backend/app/models/
  - WebSocket handlers: /backend/app/websocket/

  ---
  ✅ Quick Start Checklist

  For immediate testing:

  1. ✅ Start Services
  # PostgreSQL and Redis running
  sudo systemctl start postgresql redis
  2. ✅ Start Platform
  ./start-dev-server.sh
  # Verify: Server running on localhost:8000
  3. ✅ Create Tenant
  psql -U miptech -d miptech -f scripts/create_company_tenant.sql
  4. ✅ Test WebSocket
  python test_websocket.py
  5. ✅ Start Frontend
  cd frontend && npm run dev
  # Verify: Client running on localhost:3000
  6. ✅ Test Integration
  // In browser console at localhost:3000
  window.MIPTechChatWidget.init({
      apiUrl: 'http://localhost:8000',
      tenantId: 'miptech-company'
  })

  Expected Result: Successful WebSocket connection with real-time chat functionality maintaining all enterprise
  security features.