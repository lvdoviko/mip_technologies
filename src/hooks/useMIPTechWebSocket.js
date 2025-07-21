// src/hooks/useMIPTechWebSocket.js
import { useState, useEffect, useRef, useCallback } from 'react';
import MIPTechWebSocketManager from '../services/websocketManager';

export const useMIPTechWebSocket = (options = {}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState(null);
  const [messages, setMessages] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');

  const wsManager = useRef(null);

  const connect = useCallback(async () => {
    try {
      setConnectionStatus('connecting');
      setError(null);

      wsManager.current = new MIPTechWebSocketManager(options);

      // Set up event listeners
      wsManager.current.on('connected', () => {
        setIsConnected(true);
        setConnectionStatus('connected');
      });

      wsManager.current.on('ready', () => {
        setIsReady(true);
        setConnectionStatus('ready');
      });

      wsManager.current.on('disconnected', () => {
        setIsConnected(false);
        setIsReady(false);
        setConnectionStatus('disconnected');
      });

      wsManager.current.on('error', (error) => {
        setError(error);
        setConnectionStatus('error');
      });

      wsManager.current.on('chatResponse', (data) => {
        setMessages(prev => [...prev, {
          id: data.data.message_id,
          type: 'assistant',
          content: data.data.message,
          timestamp: data.timestamp,
          sources: data.data.sources || []
        }]);
      });

      await wsManager.current.connect();

    } catch (error) {
      setError(error);
      setConnectionStatus('error');
      console.error('❌ [Hook] WebSocket connection failed:', error);
    }
  }, [options]);

  const disconnect = useCallback(() => {
    if (wsManager.current) {
      wsManager.current.disconnect();
      wsManager.current = null;
    }
    setIsConnected(false);
    setIsReady(false);
    setConnectionStatus('disconnected');
  }, []);

  const sendMessage = useCallback((message, chatId) => {
    if (!wsManager.current || !isReady) {
      throw new Error('WebSocket not ready');
    }

    // Add user message to messages
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      type: 'user',
      content: message,
      timestamp: Date.now()
    }]);

    wsManager.current.sendChatMessage(message, chatId);
  }, [isReady]);

  const createNewChat = useCallback(() => {
    if (!wsManager.current || !isReady) {
      throw new Error('WebSocket not ready');
    }
    wsManager.current.createNewChat();
  }, [isReady]);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    isReady,
    error,
    messages,
    connectionStatus,
    connect,
    disconnect,
    sendMessage,
    createNewChat
  };
};