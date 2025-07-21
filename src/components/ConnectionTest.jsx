import React, { useState, useEffect } from 'react';
import MIPTechApiClient from '../services/miptechApi';
import MIPTechWebSocketManager from '../services/websocketManager';

const ConnectionTest = () => {
  const [apiStatus, setApiStatus] = useState('testing');
  const [wsStatus, setWsStatus] = useState('disconnected');
  const [wsReadyStatus, setWsReadyStatus] = useState('waiting');
  const [connectionMetrics, setConnectionMetrics] = useState({});
  const [testResults, setTestResults] = useState({});
  const [wsManager, setWsManager] = useState(null);

  const testAPIConnection = async () => {
    try {
      setApiStatus('testing');
      const apiClient = new MIPTechApiClient();
      const response = await apiClient.health();
      setApiStatus('connected');
      setTestResults(prev => ({ 
        ...prev, 
        api: { 
          connected: true, 
          data: response,
          tenantId: process.env.REACT_APP_MIPTECH_TENANT_ID
        } 
      }));
    } catch (error) {
      setApiStatus('failed');
      setTestResults(prev => ({ 
        ...prev, 
        api: { 
          connected: false, 
          error: error.message,
          tenantId: process.env.REACT_APP_MIPTECH_TENANT_ID
        } 
      }));
    }
  };

  const testWebSocketConnection = () => {
    const startTime = Date.now();
    setWsStatus('connecting');
    setWsReadyStatus('waiting');
    setConnectionMetrics({});
    
    // Clean up any existing event listeners first
    websocketManager.disconnect();
    
    // Track connection lifecycle (Phase 2 testing)
    const handleConnected = (data) => {
      const connectionTime = Date.now() - startTime;
      setWsStatus('connected');
      setConnectionMetrics(prev => ({ 
        ...prev, 
        connectionTime,
        clientId: data.clientId
      }));
      console.log('[ConnectionTest] WebSocket connected in', connectionTime, 'ms');
    };

    // Phase 2: Test ready state handling
    const handleReady = (data) => {
      const readyTime = Date.now() - startTime;
      setWsReadyStatus('ready');
      setConnectionMetrics(prev => ({ 
        ...prev, 
        readyTime,
        totalTime: readyTime
      }));
      setTestResults(prev => ({ 
        ...prev, 
        ws: { 
          connected: true,
          ready: true,
          clientId: data.clientId,
          connectionTime: prev.connectionTime,
          readyTime,
          authDelay: readyTime - (prev.connectionTime || 0),
          tenantId: process.env.REACT_APP_MIPTECH_TENANT_ID
        } 
      }));
      console.log('[ConnectionTest] Platform ready signal received in', readyTime, 'ms');
    };

    // Phase 2: Test timeout handling
    const handleReadyTimeout = () => {
      setWsReadyStatus('timeout');
      setTestResults(prev => ({ 
        ...prev, 
        ws: { 
          connected: true,
          ready: false,
          error: 'Ready timeout - platform did not signal ready state within 10 seconds',
          tenantId: process.env.REACT_APP_MIPTECH_TENANT_ID
        } 
      }));
      console.warn('[ConnectionTest] Platform ready timeout');
    };

    const handleError = (error) => {
      setWsStatus('failed');
      setWsReadyStatus('failed');
      setTestResults(prev => ({ 
        ...prev, 
        ws: { 
          connected: false, 
          ready: false,
          error: error.message || 'WebSocket connection failed',
          tenantId: process.env.REACT_APP_MIPTECH_TENANT_ID
        } 
      }));
    };

    const handleDisconnected = () => {
      setWsStatus('disconnected');
      setWsReadyStatus('waiting');
    };

    // Register event handlers
    websocketManager.on('connected', handleConnected);
    websocketManager.on('ready', handleReady);
    websocketManager.on('ready_timeout', handleReadyTimeout);
    websocketManager.on('error', handleError);
    websocketManager.on('disconnected', handleDisconnected);
    
    // Start connection with cleanup timeout
    websocketManager.connect();
    
    // Clean up event listeners after test (30 seconds timeout)
    setTimeout(() => {
      websocketManager.off('connected', handleConnected);
      websocketManager.off('ready', handleReady);
      websocketManager.off('ready_timeout', handleReadyTimeout);
      websocketManager.off('error', handleError);
      websocketManager.off('disconnected', handleDisconnected);
    }, 30000);
  };

  useEffect(() => {
    testAPIConnection();
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'connected':
      case 'ready': return 'text-green-600';
      case 'failed':
      case 'timeout': return 'text-red-600';
      case 'testing': 
      case 'connecting':
      case 'waiting': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusDot = (status) => {
    switch (status) {
      case 'connected':
      case 'ready': return 'bg-green-500';
      case 'failed':
      case 'timeout': return 'bg-red-500';
      case 'testing': 
      case 'connecting':
      case 'waiting': return 'bg-yellow-500 animate-pulse';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="fixed top-4 left-4 bg-white p-4 rounded-lg shadow-lg border z-50 max-w-md">
      <h3 className="font-bold mb-3 text-gray-800">🔍 MIPTech Phase 2 Connection Test</h3>
      
      <div className="space-y-3 text-sm">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${getStatusDot(apiStatus)}`}></div>
            <span>API Connection:</span>
          </div>
          <span className={`font-medium ${getStatusColor(apiStatus)}`}>
            {apiStatus}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${getStatusDot(wsStatus)}`}></div>
            <span>WebSocket:</span>
          </div>
          <span className={`font-medium ${getStatusColor(wsStatus)}`}>
            {wsStatus}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${getStatusDot(wsReadyStatus)}`}></div>
            <span>Platform Ready:</span>
          </div>
          <span className={`font-medium ${getStatusColor(wsReadyStatus)}`}>
            {wsReadyStatus}
          </span>
        </div>
        
        {connectionMetrics.connectionTime && (
          <div className="text-xs text-gray-600 mt-2 p-2 bg-blue-50 rounded">
            <div className="font-medium mb-1">⏱️ Phase 2 Lifecycle Metrics:</div>
            <div>Connection: {connectionMetrics.connectionTime}ms</div>
            {connectionMetrics.readyTime && (
              <>
                <div>Auth + Ready: {connectionMetrics.readyTime}ms</div>
                <div>Auth Delay: ~{connectionMetrics.readyTime - connectionMetrics.connectionTime}ms</div>
              </>
            )}
          </div>
        )}
        
        <div className="text-xs text-gray-500 mt-3 p-2 bg-gray-50 rounded">
          <div className="font-medium mb-1">Configuration:</div>
          <div>API: {process.env.REACT_APP_MIPTECH_API_URL}</div>
          <div>WS: {process.env.REACT_APP_MIPTECH_WS_URL}</div>
          <div>Tenant: <span className="font-medium text-blue-600">{process.env.REACT_APP_MIPTECH_TENANT_ID}</span></div>
        </div>
      </div>
      
      <div className="mt-4 space-x-2">
        <button 
          onClick={testAPIConnection}
          disabled={apiStatus === 'testing'}
          className="px-3 py-1 bg-blue-500 text-white rounded text-xs disabled:opacity-50 hover:bg-blue-600 transition-colors"
        >
          Test API
        </button>
        <button 
          onClick={testWebSocketConnection}
          disabled={wsStatus === 'connecting'}
          className="px-3 py-1 bg-green-500 text-white rounded text-xs disabled:opacity-50 hover:bg-green-600 transition-colors"
        >
          Test Phase 2 Lifecycle
        </button>
        
        {wsStatus === 'connected' && wsReadyStatus === 'ready' && (
          <span className="text-xs text-green-600 font-medium">✅ Ready for messages</span>
        )}
      </div>
      
      {Object.keys(testResults).length > 0 && (
        <div className="mt-3">
          <details className="cursor-pointer">
            <summary className="text-xs font-medium text-gray-600 hover:text-gray-800">
              View Test Results
            </summary>
            <div className="mt-2 text-xs bg-gray-100 p-2 rounded font-mono max-h-32 overflow-y-auto">
              <pre>{JSON.stringify(testResults, null, 2)}</pre>
            </div>
          </details>
        </div>
      )}
    </div>
  );
};

export default ConnectionTest;