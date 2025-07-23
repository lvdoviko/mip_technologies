// src/components/ConnectionDebugger.jsx
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  Activity, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Loader2, 
  RefreshCw,
  Eye,
  EyeOff,
  Settings,
  Monitor,
  Wifi
} from 'lucide-react';
import MIPTechApiClient from '../services/miptechApi';

/**
 * Enterprise-grade ConnectionDebugger component for real-time monitoring
 * Provides comprehensive debugging interface for development and troubleshooting
 */
const ConnectionDebugger = () => {
  // Enhanced environment safety checks
  const shouldEnableDebugger = 
    process.env.NODE_ENV === 'development' && 
    process.env.REACT_APP_DEBUG_MODE === 'true' &&
    process.env.REACT_APP_DISABLE_AUTO_TESTS !== 'true';

  const [isVisible, setIsVisible] = useState(shouldEnableDebugger);
  const [apiStatus, setApiStatus] = useState('unknown');
  const [wsStatus, setWsStatus] = useState('unknown');
  const [environmentData, setEnvironmentData] = useState({});
  const [performanceMetrics, setPerformanceMetrics] = useState({});
  const [testResults, setTestResults] = useState({ api: null, ws: null });
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  
  // React StrictMode protection
  const hasInitializedRef = useRef(false);
  const testInProgressRef = useRef(false);

  /**
   * Environment validation and data collection
   */
  const collectEnvironmentData = useCallback(() => {
    const envData = {
      // Core Configuration
      API_URL: process.env.REACT_APP_MIPTECH_API_URL,
      WS_URL: process.env.REACT_APP_MIPTECH_WS_URL,
      TENANT_ID: process.env.REACT_APP_MIPTECH_TENANT_ID,
      ENVIRONMENT: process.env.REACT_APP_ENVIRONMENT,
      
      // Debug Flags
      DEBUG_API: process.env.REACT_APP_DEBUG_API,
      DEBUG_WEBSOCKET: process.env.REACT_APP_DEBUG_WEBSOCKET,
      
      // Enterprise Features
      ENDPOINT_DISCOVERY: process.env.REACT_APP_ENABLE_ENDPOINT_DISCOVERY,
      MULTI_HEADER_AUTH: process.env.REACT_APP_ENABLE_MULTI_HEADER_AUTH,
      CONNECTION_RETRY: process.env.REACT_APP_ENABLE_CONNECTION_RETRY,
      PERFORMANCE_TRACKING: process.env.REACT_APP_ENABLE_PERFORMANCE_TRACKING,
      
      // Runtime Info
      USER_AGENT: navigator.userAgent,
      CURRENT_URL: window.location.href,
      TIMESTAMP: new Date().toISOString()
    };
    
    setEnvironmentData(envData);
    return envData;
  }, []);

  /**
   * Test API connection with detailed metrics
   */
  const testAPIConnection = useCallback(async () => {
    const startTime = performance.now();
    setApiStatus('testing');
    
    try {
      console.log('🔍 [ConnectionDebugger] Testing API connection...');
      
      // Create MIPTechApiClient instance and test health endpoint
      const apiClient = new MIPTechApiClient();
      const response = await apiClient.health();
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      setApiStatus(response.status === 'healthy' ? 'connected' : 'failed');
      setTestResults(prev => ({
        ...prev,
        api: {
          connected: response.status === 'healthy',
          data: response,
          tenantId: apiClient.tenantId,
          duration: Math.round(duration),
          timestamp: new Date().toISOString()
        }
      }));
      
      console.log('✅ [ConnectionDebugger] API test completed:', response);
      
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      setApiStatus('failed');
      setTestResults(prev => ({
        ...prev,
        api: {
          connected: false,
          error: error.message,
          duration: Math.round(duration),
          timestamp: new Date().toISOString()
        }
      }));
      
      console.error('❌ [ConnectionDebugger] API test failed:', error);
    }
  }, []);

  /**
   * Platform-aware WebSocket connection test that respects platform initialization cycle
   */
  const testWebSocketConnection = useCallback(async () => {
    console.log('🔍 [ConnectionDebugger] Starting platform-aware WebSocket test');
    setWsStatus('testing');
    
    try {
      // ✅ CORRECT: Use proper MIPTech platform WebSocket URL format
      const baseUrl = process.env.REACT_APP_MIPTECH_WS_URL || 'ws://localhost:8001';
      const tenantId = process.env.REACT_APP_MIPTECH_TENANT_ID || 'miptech-company';
      const testClientId = `debug_test_${Date.now()}_platform_aware`;
      
      // Build correct WebSocket URL with test mode indicator
      const testWsUrl = `${baseUrl}/api/v1/ws/chat?tenant_id=${encodeURIComponent(tenantId)}&client_id=${encodeURIComponent(testClientId)}&test_mode=true`;
      
      console.log(`🔍 [ConnectionDebugger] Creating platform-aware test WebSocket: ${testWsUrl}`);
      
      return new Promise((resolve, reject) => {
        let initializationComplete = false;
        let initializationSteps = [];
        const startTime = performance.now();
        
        // Platform-aware timeout (account for cold start vs warm platform)
        const isFirstConnection = !sessionStorage.getItem('miptech_platform_connected');
        const platformTimeout = isFirstConnection ? 10000 : 5000; // Allow cold start time
        
        const timeout = setTimeout(() => {
          if (!initializationComplete) {
            console.warn('[ConnectionDebugger] Platform initialization timeout');
            testWs?.close(1001, 'Platform initialization timeout');
            setWsStatus('failed');
            setTestResults(prev => ({
              ...prev,
              ws: {
                connected: false,
                error: 'Platform initialization timeout',
                initialization_steps: initializationSteps,
                timeout_type: isFirstConnection ? 'cold_start' : 'warm_start',
                timestamp: new Date().toISOString()
              }
            }));
            reject(new Error('Platform initialization timeout'));
          }
        }, platformTimeout);
        
        // Create test WebSocket with proper MIPTech platform URL format
        const testWs = new WebSocket(testWsUrl);
        
        testWs.onopen = () => {
          console.log('✅ [ConnectionDebugger] WebSocket connected - waiting for platform initialization');
          setWsStatus('connected');
          setTestResults(prev => ({
            ...prev,
            ws: {
              connected: true,
              waiting_for_platform: true,
              initialization_steps: [],
              clientId: testClientId,
              tenantId: tenantId,
              endpoint: '/api/v1/ws/chat',
              timestamp: new Date().toISOString(),
              note: 'Platform-aware test - waiting for platform ready signal'
            }
          }));
        };
        
        // ✅ CRITICAL: Handle platform initialization messages
        testWs.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            const elapsed = Math.round(performance.now() - startTime);
            
            switch(data.type) {
              case 'connection_established':
                console.log(`🔗 [ConnectionDebugger] Platform connection established (${elapsed}ms)`);
                initializationSteps.push({ type: 'established', time: elapsed });
                break;
                
              case 'initialization_progress':
                const progress = data.data || {};
                console.log(`⏳ [ConnectionDebugger] Platform progress: ${progress.phase} - ${progress.message} (${elapsed}ms)`);
                initializationSteps.push({ 
                  type: 'progress', 
                  phase: progress.phase, 
                  message: progress.message, 
                  time: elapsed 
                });
                
                // Update UI with platform progress
                setTestResults(prev => ({
                  ...prev,
                  ws: {
                    ...prev.ws,
                    initialization_steps: initializationSteps,
                    current_phase: progress.phase,
                    current_message: progress.message
                  }
                }));
                break;
                
              case 'connection_ready':
                console.log(`🚀 [ConnectionDebugger] Platform fully initialized and ready (${elapsed}ms)`);
                initializationComplete = true;
                clearTimeout(timeout);
                
                // Mark successful connection for future timeout optimization
                sessionStorage.setItem('miptech_platform_connected', 'true');
                
                setWsStatus('ready');
                setTestResults(prev => ({
                  ...prev,
                  ws: {
                    connected: true,
                    ready: true,
                    platform_initialization_time: elapsed,
                    initialization_steps: initializationSteps,
                    total_time: elapsed,
                    clientId: testClientId,
                    tenantId: tenantId,
                    endpoint: '/api/v1/ws/chat',
                    timestamp: new Date().toISOString(),
                    note: 'Platform-aware test completed successfully - platform services ready'
                  }
                }));
                
                // ✅ NOW it's safe to close - platform is ready
                setTimeout(() => {
                  console.log('🔍 [ConnectionDebugger] Closing test connection gracefully after platform ready');
                  testWs.close(1000, 'Platform-aware test completed');
                  resolve();
                }, 100); // Brief delay for platform cleanup
                break;
                
              case 'error':
                console.error('[ConnectionDebugger] Platform error during initialization:', data.data);
                clearTimeout(timeout);
                setWsStatus('failed');
                setTestResults(prev => ({
                  ...prev,
                  ws: {
                    connected: false,
                    error: `Platform error: ${data.data?.message || 'Unknown error'}`,
                    initialization_steps: initializationSteps,
                    timestamp: new Date().toISOString()
                  }
                }));
                reject(new Error(`Platform error: ${data.data?.message || 'Unknown error'}`));
                break;
                
              default:
                console.log(`[ConnectionDebugger] Platform message: ${data.type}`, data.data);
            }
          } catch (error) {
            console.warn('[ConnectionDebugger] Failed to parse platform message:', event.data);
          }
        };
        
        testWs.onerror = (error) => {
          clearTimeout(timeout);
          console.error('❌ [ConnectionDebugger] WebSocket error:', error);
          setWsStatus('failed');
          setTestResults(prev => ({
            ...prev,
            ws: {
              connected: false,
              error: 'WebSocket connection failed - Check platform server and tenant_id',
              initialization_steps: initializationSteps,
              timestamp: new Date().toISOString(),
              url: testWsUrl
            }
          }));
          reject(error);
        };
        
        testWs.onclose = (event) => {
          clearTimeout(timeout);
          console.log(`🔍 [ConnectionDebugger] Test connection closed: ${event.code} - ${event.reason}`);
          
          if (event.code === 1006 && !initializationComplete) {
            console.error('❌ [ConnectionDebugger] Connection closed abnormally during platform initialization');
            setTestResults(prev => ({
              ...prev,
              ws: {
                connected: false,
                error: 'Connection closed during platform initialization (code 1006)',
                initialization_steps: initializationSteps,
                timestamp: new Date().toISOString()
              }
            }));
          }
        };
      });
      
    } catch (error) {
      console.error('❌ [ConnectionDebugger] WebSocket test failed:', error);
      setWsStatus('failed');
      setTestResults(prev => ({
        ...prev,
        ws: {
          connected: false,
          error: error.message,
          timestamp: new Date().toISOString()
        }
      }));
      throw error;
    }
  }, []);

  /**
   * Create debounce utility function
   */
  const debounce = useCallback((func, wait, options = {}) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        if (!options.leading) func(...args);
      };
      const callNow = options.leading && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) func(...args);
    };
  }, []);

  /**
   * Enhanced debouncing with platform awareness
   */
  const debouncedPlatformTest = useMemo(
    () => debounce(async () => {
      if (testInProgressRef.current) {
        console.log('[ConnectionDebugger] Test already in progress, skipping');
        return;
      }
      
      testInProgressRef.current = true;
      try {
        await testWebSocketConnection();
      } finally {
        testInProgressRef.current = false;
      }
    }, 1000, { leading: true, trailing: false }),
    [testWebSocketConnection, debounce]
  );

  /**
   * Manual platform-aware test handler
   */
  const handleManualPlatformTest = useCallback(async () => {
    const lastTestTime = sessionStorage.getItem('last_platform_test');
    const cooldownMs = 5000; // Platform-aware cooldown
    
    if (lastTestTime && (Date.now() - parseInt(lastTestTime)) < cooldownMs) {
      console.log('[ConnectionDebugger] Platform test cooldown active');
      return;
    }
    
    sessionStorage.setItem('last_platform_test', Date.now().toString());
    debouncedPlatformTest();
  }, [debouncedPlatformTest]);

  /**
   * Run API-only tests (safe, no platform resource waste)
   */
  const runSafeTests = useCallback(async () => {
    console.log('🔄 [ConnectionDebugger] Running safe connection tests (API only)...');
    
    // Collect fresh environment data
    collectEnvironmentData();
    
    // Only run API test - WebSocket testing is manual-only now
    await testAPIConnection();
    
    console.log('✅ [ConnectionDebugger] Safe tests completed');
  }, [collectEnvironmentData, testAPIConnection]);

  /**
   * Performance metrics collection
   */
  const collectPerformanceMetrics = useCallback(() => {
    const metrics = {
      // Navigation timing
      loadTime: performance.timing ? 
        performance.timing.loadEventEnd - performance.timing.navigationStart : 0,
      
      // Memory usage (if available)
      memoryUsage: performance.memory ? {
        used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
        total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
        limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
      } : null,
      
      // Connection info (if available)
      connectionInfo: navigator.connection ? {
        effectiveType: navigator.connection.effectiveType,
        downlink: navigator.connection.downlink,
        rtt: navigator.connection.rtt
      } : null,
      
      timestamp: Date.now()
    };
    
    setPerformanceMetrics(metrics);
  }, []);

  /**
   * Auto-refresh functionality
   */
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      collectPerformanceMetrics();
      if (apiStatus === 'connected' && wsStatus === 'connected') {
        // Optional: Light health check
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, [autoRefresh, apiStatus, wsStatus, collectPerformanceMetrics]);

  /**
   * Initial setup - React StrictMode protected
   */
  useEffect(() => {
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      
      collectEnvironmentData();
      collectPerformanceMetrics();
      
      // ✅ DISABLED: Automatic WebSocket testing to prevent platform resource waste
      // Only run safe API tests on mount
      if (shouldEnableDebugger) {
        console.log('🔄 [ConnectionDebugger] Running initial safe tests (API only)');
        runSafeTests();
      }
      
      // WebSocket testing is now manual-only via button
      console.log('ℹ️ [ConnectionDebugger] WebSocket testing disabled on mount - use manual test button');
    }
  }, [collectEnvironmentData, collectPerformanceMetrics, runSafeTests, shouldEnableDebugger]);

  /**
   * Status indicator component
   */
  const StatusIndicator = ({ status, label }) => {
    const getStatusConfig = () => {
      switch (status) {
        case 'connected':
          return { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-100' };
        case 'failed':
          return { icon: XCircle, color: 'text-red-500', bg: 'bg-red-100' };
        case 'testing':
          return { icon: Loader2, color: 'text-blue-500', bg: 'bg-blue-100' };
        default:
          return { icon: AlertTriangle, color: 'text-gray-500', bg: 'bg-gray-100' };
      }
    };
    
    const { icon: Icon, color, bg } = getStatusConfig();
    
    return (
      <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${bg}`}>
        <Icon className={`w-4 h-4 ${color} ${status === 'testing' ? 'animate-spin' : ''}`} />
        <span className={`text-sm font-medium ${color}`}>{label}</span>
      </div>
    );
  };

  // Enhanced production safety - multiple checks
  if (process.env.NODE_ENV === 'production' && !isVisible) {
    return null;
  }
  
  // Don't render if debugger is disabled
  if (!shouldEnableDebugger) {
    return null;
  }

  return (
    <div className="fixed top-4 left-4 z-50 max-w-md">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Header */}
        <div className="bg-gray-900 text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Monitor className="w-5 h-5" />
            <h3 className="font-semibold text-sm">MIPTech Connection Debug</h3>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`p-1 rounded ${autoRefresh ? 'bg-green-600' : 'bg-gray-600'} hover:opacity-80`}
              title={autoRefresh ? 'Auto-refresh enabled' : 'Auto-refresh disabled'}
            >
              <Activity className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1 rounded hover:bg-gray-700"
              title={isCollapsed ? 'Expand' : 'Collapse'}
            >
              {isCollapsed ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setIsVisible(false)}
              className="p-1 rounded hover:bg-gray-700"
              title="Hide debugger"
            >
              ❌
            </button>
          </div>
        </div>

        {!isCollapsed && (
          <div className="p-4 space-y-4">
            {/* Connection Status */}
            <div className="space-y-2">
              <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300 flex items-center">
                <Wifi className="w-4 h-4 mr-2" />
                Connection Status
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <StatusIndicator 
                  status={apiStatus} 
                  label={`API ${apiStatus === 'connected' ? '✓' : apiStatus === 'failed' ? '✗' : '...'}`} 
                />
                <StatusIndicator 
                  status={wsStatus} 
                  label={`WS ${wsStatus === 'connected' ? '✓' : wsStatus === 'failed' ? '✗' : '...'}`} 
                />
              </div>
            </div>

            {/* Environment Info */}
            <div className="space-y-2">
              <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300 flex items-center">
                <Settings className="w-4 h-4 mr-2" />
                Environment
              </h4>
              <div className="bg-gray-50 dark:bg-gray-700 rounded p-2 text-xs">
                <div className="grid grid-cols-1 gap-1">
                  <div><strong>API:</strong> {environmentData.API_URL}</div>
                  <div><strong>WS:</strong> {environmentData.WS_URL}</div>
                  <div><strong>Tenant:</strong> {environmentData.TENANT_ID}</div>
                  <div><strong>Discovery:</strong> {environmentData.ENDPOINT_DISCOVERY}</div>
                  <div><strong>Multi-Auth:</strong> {environmentData.MULTI_HEADER_AUTH}</div>
                </div>
              </div>
            </div>

            {/* Performance Metrics */}
            {performanceMetrics.memoryUsage && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300">Performance</h4>
                <div className="bg-gray-50 dark:bg-gray-700 rounded p-2 text-xs">
                  <div>Memory: {performanceMetrics.memoryUsage.used}MB / {performanceMetrics.memoryUsage.limit}MB</div>
                  {performanceMetrics.connectionInfo && (
                    <div>Network: {performanceMetrics.connectionInfo.effectiveType} ({performanceMetrics.connectionInfo.downlink}Mbps)</div>
                  )}
                </div>
              </div>
            )}

            {/* Platform Progress Feedback */}
            {wsStatus === 'connected' && testResults.ws?.waiting_for_platform && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300 flex items-center">
                  <Loader2 className="w-4 h-4 mr-2 animate-spin text-blue-500" />
                  Platform Initializing
                </h4>
                <div className="bg-blue-50 dark:bg-blue-900 rounded p-2 text-xs">
                  {testResults.ws.current_phase && (
                    <div className="font-medium text-blue-700 dark:text-blue-300">
                      Phase: {testResults.ws.current_phase}
                    </div>
                  )}
                  {testResults.ws.current_message && (
                    <div className="text-blue-600 dark:text-blue-400 mt-1">
                      {testResults.ws.current_message}
                    </div>
                  )}
                  <div className="text-orange-600 dark:text-orange-400 mt-1">
                    ⚠️ Waiting for platform services (Pinecone, OpenAI, RAG)...
                  </div>
                  {testResults.ws.initialization_steps && testResults.ws.initialization_steps.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {testResults.ws.initialization_steps.slice(-3).map((step, index) => (
                        <div key={index} className="text-xs text-gray-600 dark:text-gray-400">
                          {step.time}ms: {step.phase || step.type} - {step.message || 'Processing...'}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Platform Ready Status */}
            {wsStatus === 'ready' && testResults.ws?.ready && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300 flex items-center">
                  <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                  Platform Ready
                </h4>
                <div className="bg-green-50 dark:bg-green-900 rounded p-2 text-xs">
                  <div className="font-medium text-green-700 dark:text-green-300 mb-1">
                    ✅ Platform services initialized successfully
                  </div>
                  <div>Initialization: {testResults.ws.platform_initialization_time}ms</div>
                  <div>Services: Pinecone, OpenAI, RAG ready</div>
                  {testResults.ws.initialization_steps && (
                    <div className="mt-2 text-gray-600 dark:text-gray-400">
                      {testResults.ws.initialization_steps.length} initialization steps completed
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Test Results */}
            {(testResults.api || testResults.ws) && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300">Test Results</h4>
                <div className="bg-gray-50 dark:bg-gray-700 rounded p-2 text-xs max-h-32 overflow-y-auto">
                  {testResults.api && (
                    <div className="mb-2">
                      <strong>API:</strong> {testResults.api.connected ? '✅' : '❌'} 
                      {testResults.api.duration && ` (${testResults.api.duration}ms)`}
                      {testResults.api.error && (
                        <div className="text-red-500 mt-1">{testResults.api.error}</div>
                      )}
                    </div>
                  )}
                  {testResults.ws && (
                    <div>
                      <strong>WebSocket:</strong> {testResults.ws.connected ? '✅' : '❌'}
                      {testResults.ws.ready && ' (Platform Ready)'}
                      {testResults.ws.platform_initialization_time && (
                        <div className="text-blue-600 mt-1">
                          Platform init: {testResults.ws.platform_initialization_time}ms
                        </div>
                      )}
                      {testResults.ws.error && (
                        <div className="text-red-500 mt-1">{testResults.ws.error}</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col space-y-2">
              <div className="flex space-x-2">
                <button
                  onClick={runSafeTests}
                  className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>API Test</span>
                </button>
                <button
                  onClick={() => console.log('Debug data:', { environmentData, testResults, performanceMetrics })}
                  className="px-3 py-2 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 transition-colors"
                >
                  📋 Log
                </button>
              </div>
              
              <button
                onClick={handleManualPlatformTest}
                disabled={testInProgressRef.current || wsStatus === 'testing'}
                className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {wsStatus === 'testing' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Platform Testing...</span>
                  </>
                ) : (
                  <>
                    <Wifi className="w-4 h-4" />
                    <span>Manual Platform Test</span>
                  </>
                )}
              </button>
              
              {wsStatus === 'testing' && (
                <div className="text-xs text-orange-600 dark:text-orange-400 text-center">
                  ⚠️ Platform test in progress - waiting for services initialization
                </div>
              )}
              
              <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                ℹ️ Auto WebSocket testing disabled to prevent platform resource waste
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Quick status indicator when collapsed */}
      {isCollapsed && (
        <div className="mt-2 flex space-x-2">
          <div className={`w-3 h-3 rounded-full ${apiStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <div className={`w-3 h-3 rounded-full ${wsStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'}`}></div>
        </div>
      )}
    </div>
  );
};

export default ConnectionDebugger;