#!/usr/bin/env node

/**
 * Test script per verificare l'integrazione degli eventi WebSocket
 * Simula l'invio dei nuovi eventi dal backend
 */

const WebSocket = require('ws');

// Configurazione di test
const WS_URL = 'ws://localhost:8000/api/v1/ws/chat?tenant_id=miptech-company&chat_id=test-123';
const TEST_EVENTS = [
  {
    type: 'message_received',
    data: {
      message_id: 'msg-123',
      chat_id: 'test-123',
      timestamp: Date.now()
    }
  },
  {
    type: 'processing',
    data: {
      message_id: 'msg-123',
      chat_id: 'test-123',
      timestamp: Date.now()
    }
  },
  {
    type: 'response_complete',
    data: {
      chat_id: 'test-123',
      message: {
        id: 'ai-msg-123',
        content: 'Test AI response',
        prompt_tokens: 25,
        completion_tokens: 15,
        response_time_ms: 1500,
        llm_model: 'gpt-4',
        created_at: new Date().toISOString(),
        sequence_number: 1
      },
      cost_estimate_usd: 0.0025,
      timestamp: Date.now()
    }
  },
  {
    type: 'error',
    data: {
      type: 'ai_processing_error',
      message: 'Test processing error',
      details: 'Simulated error for testing',
      messageId: 'msg-123',
      timestamp: Date.now()
    }
  }
];

async function testWebSocketEvents() {
  console.log('🧪 Starting WebSocket Events Test...');
  console.log(`📡 Connecting to: ${WS_URL}`);
  
  try {
    const ws = new WebSocket(WS_URL);
    
    ws.on('open', () => {
      console.log('✅ WebSocket connection established');
      
      // Aspetta un momento per il setup della connessione
      setTimeout(() => {
        console.log('📤 Sending test events...');
        
        TEST_EVENTS.forEach((event, index) => {
          setTimeout(() => {
            console.log(`🔄 Sending: ${event.type}`);
            ws.send(JSON.stringify(event));
          }, index * 1000);
        });
        
        // Chiudi la connessione dopo tutti gli eventi
        setTimeout(() => {
          console.log('🔌 Closing connection...');
          ws.close();
        }, TEST_EVENTS.length * 1000 + 1000);
        
      }, 1000);
    });
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log('📥 Received:', message.type, message);
      } catch (error) {
        console.log('📥 Received (raw):', data.toString());
      }
    });
    
    ws.on('error', (error) => {
      console.error('❌ WebSocket Error:', error.message);
    });
    
    ws.on('close', (code, reason) => {
      console.log(`🔌 Connection closed: ${code} ${reason}`);
      console.log('✨ Test completed');
    });
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('💡 Make sure the backend server is running at ws://localhost:8000');
    process.exit(1);
  }
}

// Esegui il test se chiamato direttamente
if (require.main === module) {
  testWebSocketEvents();
}

module.exports = { testWebSocketEvents, TEST_EVENTS };