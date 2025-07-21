// src/services/__tests__/websocketManager.test.js
import { WebSocketManager, WS_STATES } from '../websocketManager';

// Mock WebSocket
class MockWebSocket {
  constructor(url) {
    this.url = url;
    this.readyState = WebSocket.CONNECTING;
    this.onopen = null;
    this.onmessage = null;
    this.onclose = null;
    this.onerror = null;
    
    // Simulate connection
    setTimeout(() => {
      this.readyState = WebSocket.OPEN;
      if (this.onopen) this.onopen();
    }, 10);
  }
  
  send(data) {
    this.lastSentData = data;
  }
  
  close() {
    this.readyState = WebSocket.CLOSED;
    if (this.onclose) this.onclose({ code: 1000, reason: 'Normal closure' });
  }
}

// Mock dependencies
const mockDependencies = {
  WebSocket: MockWebSocket,
  console: {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn()
  },
  setTimeout: global.setTimeout,
  clearTimeout: global.clearTimeout,
  setInterval: global.setInterval,
  clearInterval: global.clearInterval
};

describe('WebSocketManager', () => {
  let wsManager;
  let mockConfig;

  beforeEach(() => {
    mockConfig = {
      baseURL: 'ws://localhost:8000',
      tenantId: 'miptech-company',
      maxReconnectAttempts: 3,
      reconnectDelay: 1000,
      heartbeatInterval: 30000,
      connectionTimeout: 10000
    };
    
    wsManager = new WebSocketManager(mockConfig, mockDependencies);
  });

  afterEach(() => {
    if (wsManager) {
      wsManager.cleanup();
    }
  });

  describe('Connection', () => {
    test('should connect without sending auth message', async () => {
      await wsManager.connect();
      
      expect(wsManager.state).toBe(WS_STATES.CONNECTED);
      expect(wsManager.ws.lastSentData).toBeUndefined();
    });

    test('should include tenant_id and client_id in URL', async () => {
      await wsManager.connect();
      
      const url = new URL(wsManager.ws.url);
      expect(url.searchParams.get('tenant_id')).toBe('miptech-company');
      expect(url.searchParams.get('client_id')).toBeTruthy();
    });

    test('should handle connection_established message', () => {
      const mockMessage = {
        type: 'connection_established',
        data: { 
          client_id: 'test-123', 
          tenant_id: 'miptech-company' 
        }
      };
      
      wsManager.handlePlatformMessage(mockMessage);
      expect(wsManager.canSendMessages).toBe(false); // Should wait for connection_ready
    });

    test('should handle connection_ready message', () => {
      const mockMessage = {
        type: 'connection_ready',
        data: { 
          client_id: 'test-123', 
          tenant_id: 'miptech-company' 
        }
      };
      
      wsManager.handlePlatformMessage(mockMessage);
      expect(wsManager.canSendMessages).toBe(true); // Now should enable messages
    });
  });

  describe('Platform Message Handling', () => {
    test('should handle response_start message', () => {
      const mockMessage = {
        type: 'response_start',
        data: {
          message_id: 'msg-123',
          chat_id: 'chat-456'
        }
      };
      
      const emitSpy = jest.spyOn(wsManager, 'emit');
      wsManager.handlePlatformMessage(mockMessage);
      
      expect(emitSpy).toHaveBeenCalledWith('response_start', mockMessage.data);
    });

    test('should handle response_chunk message', () => {
      const mockMessage = {
        type: 'response_chunk',
        data: {
          message_id: 'msg-123',
          content: 'Hello, '
        }
      };
      
      const emitSpy = jest.spyOn(wsManager, 'emit');
      wsManager.handlePlatformMessage(mockMessage);
      
      expect(emitSpy).toHaveBeenCalledWith('response_chunk', mockMessage.data);
    });

    test('should handle response_complete message', () => {
      const mockMessage = {
        type: 'response_complete',
        data: {
          message_id: 'msg-123',
          total_tokens: 150,
          cost_estimate: 0.0045
        }
      };
      
      const emitSpy = jest.spyOn(wsManager, 'emit');
      wsManager.handlePlatformMessage(mockMessage);
      
      expect(emitSpy).toHaveBeenCalledWith('response_complete', mockMessage.data);
    });

    test('should handle rate_limit_exceeded message', () => {
      const mockMessage = {
        type: 'rate_limit_exceeded',
        data: {
          message: 'Rate limit exceeded',
          retry_after: 60
        }
      };
      
      const emitSpy = jest.spyOn(wsManager, 'emit');
      wsManager.handlePlatformMessage(mockMessage);
      
      expect(emitSpy).toHaveBeenCalledWith('rate_limit_exceeded', mockMessage.data);
    });

    test('should handle platform error message', () => {
      const mockMessage = {
        type: 'error',
        data: {
          message: 'Processing failed',
          error_code: 'PROCESSING_ERROR'
        }
      };
      
      const emitSpy = jest.spyOn(wsManager, 'emit');
      wsManager.handlePlatformMessage(mockMessage);
      
      expect(emitSpy).toHaveBeenCalledWith('platform_error', mockMessage.data);
    });

    test('should respond to ping with pong', () => {
      const mockMessage = {
        type: 'ping',
        timestamp: Date.now()
      };
      
      const sendSpy = jest.spyOn(wsManager, 'send');
      wsManager.handlePlatformMessage(mockMessage);
      
      expect(sendSpy).toHaveBeenCalledWith({
        type: 'pong',
        timestamp: mockMessage.timestamp
      });
    });
  });

  describe('URL Construction', () => {
    test('should construct correct WebSocket URL with parameters', async () => {
      process.env.REACT_APP_MIPTECH_API_KEY = 'test-token';
      
      await wsManager.connect();
      
      const url = new URL(wsManager.ws.url);
      expect(url.pathname).toBe('/api/v1/ws/chat');
      expect(url.searchParams.get('tenant_id')).toBe('miptech-company');
      expect(url.searchParams.get('client_id')).toBeTruthy();
      expect(url.searchParams.get('token')).toBe('test-token');
    });

    test('should not include token if not available', async () => {
      delete process.env.REACT_APP_MIPTECH_API_KEY;
      
      await wsManager.connect();
      
      const url = new URL(wsManager.ws.url);
      expect(url.searchParams.get('token')).toBeNull();
    });
  });
});