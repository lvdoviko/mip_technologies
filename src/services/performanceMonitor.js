// src/services/performanceMonitor.js
import { logError, ERROR_TYPES, ERROR_SEVERITY, MIPTechError } from '../utils/errorHandler';

/**
 * Performance thresholds for different metrics
 */
export const PERFORMANCE_THRESHOLDS = {
  FCP: 1800, // First Contentful Paint - 1.8s
  LCP: 2500, // Largest Contentful Paint - 2.5s
  FID: 100,  // First Input Delay - 100ms
  CLS: 0.1,  // Cumulative Layout Shift - 0.1
  TTFB: 600, // Time to First Byte - 600ms
  API_RESPONSE: 500, // API Response Time - 500ms
  WEBSOCKET_CONNECT: 2000, // WebSocket Connection - 2s
  CHAT_LOAD: 1000, // Chat Widget Load - 1s
  MESSAGE_SEND: 300, // Message Send Time - 300ms
  BUNDLE_SIZE: 300 * 1024 // Bundle Size - 300KB
};

/**
 * Performance metric types
 */
export const METRIC_TYPES = {
  WEB_VITALS: 'web_vitals',
  API: 'api',
  WEBSOCKET: 'websocket',
  CHAT: 'chat',
  BUNDLE: 'bundle',
  MEMORY: 'memory',
  NETWORK: 'network'
};

/**
 * Performance severity levels
 */
export const PERFORMANCE_SEVERITY = {
  GOOD: 'good',
  NEEDS_IMPROVEMENT: 'needs_improvement',
  POOR: 'poor'
};

/**
 * Performance Monitor with Web Vitals integration
 */
export class PerformanceMonitor {
  constructor(config = {}, dependencies = {}) {
    this.config = {
      enableWebVitals: true,
      enableResourceTiming: true,
      enableMemoryMonitoring: true,
      enableNetworkMonitoring: true,
      sampleRate: 0.1, // 10% sampling rate
      bufferSize: 1000,
      reportingInterval: 30000, // 30 seconds
      ...config
    };
    
    // Dependency injection for testing
    this.console = dependencies.console || console;
    this.performance = dependencies.performance || performance;
    this.navigator = dependencies.navigator || navigator;
    this.window = dependencies.window || window;
    this.document = dependencies.document || document;
    
    // Fix for setInterval brand-check: bind to proper global scope
    const globalScope = (typeof window !== 'undefined') 
                      ? window 
                      : (typeof global !== 'undefined') 
                        ? global 
                        : this;
    
    this.setInterval = (dependencies.setInterval || globalScope.setInterval).bind(globalScope);
    this.clearInterval = (dependencies.clearInterval || globalScope.clearInterval).bind(globalScope);
    
    // Performance metrics storage
    this.metrics = {
      webVitals: new Map(),
      api: [],
      websocket: [],
      chat: [],
      bundle: new Map(),
      memory: [],
      network: []
    };
    
    // Performance observers
    this.observers = new Map();
    
    // Timing data
    this.timings = new Map();
    
    // Reporting interval
    this.reportingIntervalId = null;
    
    // Initialize monitoring
    this.initialize();
  }

  /**
   * Initialize performance monitoring
   */
  initialize() {
    if (this.shouldSample()) {
      this.initializeWebVitals();
      this.initializeResourceTiming();
      this.initializeMemoryMonitoring();
      this.initializeNetworkMonitoring();
      this.startReporting();
    }
  }

  /**
   * Check if we should sample this session
   */
  shouldSample() {
    return Math.random() < this.config.sampleRate;
  }

  /**
   * Initialize Web Vitals monitoring
   */
  initializeWebVitals() {
    if (!this.config.enableWebVitals) return;
    
    try {
      // Dynamic import to avoid blocking
      import('web-vitals').then((webVitals) => {
        // Handle both named exports and namespace imports
        const { onCLS, onFID, onFCP, onLCP, onTTFB } = webVitals.default ? webVitals.default : webVitals;
        
        // Verify functions exist before calling - return early if not available
        if (typeof onCLS !== 'function' || 
            typeof onFID !== 'function' || 
            typeof onFCP !== 'function' || 
            typeof onLCP !== 'function' || 
            typeof onTTFB !== 'function') {
          
          if (process.env.REACT_APP_DEBUG_API === 'true') {
            console.warn('[Performance] Web-vitals functions not available, skipping monitoring. This may happen during HMR or if web-vitals API changed.');
          }
          return; // Return early instead of throwing error
        }
        
        const vitalsConfig = {
          reportAllChanges: true
        };
        
        onCLS(this.handleWebVitalMetric.bind(this, 'CLS'), vitalsConfig);
        onFID(this.handleWebVitalMetric.bind(this, 'FID'), vitalsConfig);
        onFCP(this.handleWebVitalMetric.bind(this, 'FCP'), vitalsConfig);
        onLCP(this.handleWebVitalMetric.bind(this, 'LCP'), vitalsConfig);
        onTTFB(this.handleWebVitalMetric.bind(this, 'TTFB'), vitalsConfig);
        
        this.console.log('[Performance] Web Vitals monitoring initialized');
      }).catch(error => {
        this.console.warn('[Performance] Web Vitals not available:', error);
      });
    } catch (error) {
      this.console.error('[Performance] Failed to initialize Web Vitals:', error);
    }
  }

  /**
   * Handle Web Vital metric
   */
  handleWebVitalMetric(name, metric) {
    const threshold = PERFORMANCE_THRESHOLDS[name];
    const severity = this.getSeverity(metric.value, threshold, name);
    
    const vitalMetric = {
      name,
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
      id: metric.id,
      threshold,
      severity,
      timestamp: Date.now(),
      url: this.window.location.href,
      connection: this.getConnectionInfo()
    };
    
    this.metrics.webVitals.set(name, vitalMetric);
    
    this.console.log(`[Performance] ${name}: ${metric.value} (${severity})`);
    
    // Send to analytics if configured
    this.sendToAnalytics('web_vitals', vitalMetric);
    
    // Log poor performance
    if (severity === PERFORMANCE_SEVERITY.POOR) {
      const error = new MIPTechError(
        `Poor ${name} performance: ${metric.value}`,
        ERROR_TYPES.SYSTEM,
        ERROR_SEVERITY.MEDIUM,
        { metric: vitalMetric }
      );
      logError(error);
    }
  }

  /**
   * Initialize resource timing monitoring
   */
  initializeResourceTiming() {
    if (!this.config.enableResourceTiming || !this.performance.getEntriesByType) return;
    
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name.includes('miptech') || entry.name.includes('api')) {
            this.trackResourceTiming(entry);
          }
        }
      });
      
      observer.observe({ entryTypes: ['resource'] });
      this.observers.set('resource', observer);
      
      this.console.log('[Performance] Resource timing monitoring initialized');
    } catch (error) {
      this.console.error('[Performance] Failed to initialize resource timing:', error);
    }
  }

  /**
   * Track resource timing
   */
  trackResourceTiming(entry) {
    const resourceMetric = {
      name: entry.name,
      duration: entry.duration,
      transferSize: entry.transferSize,
      encodedBodySize: entry.encodedBodySize,
      decodedBodySize: entry.decodedBodySize,
      timestamp: Date.now(),
      type: this.getResourceType(entry.name)
    };
    
    this.metrics.network.push(resourceMetric);
    
    // Keep buffer size manageable
    if (this.metrics.network.length > this.config.bufferSize) {
      this.metrics.network = this.metrics.network.slice(-this.config.bufferSize / 2);
    }
  }

  /**
   * Get resource type from URL
   */
  getResourceType(url) {
    if (url.includes('/api/')) return 'api';
    if (url.includes('/ws')) return 'websocket';
    if (url.includes('.js')) return 'javascript';
    if (url.includes('.css')) return 'stylesheet';
    if (url.includes('.png') || url.includes('.jpg') || url.includes('.svg')) return 'image';
    return 'other';
  }

  /**
   * Initialize memory monitoring
   */
  initializeMemoryMonitoring() {
    if (!this.config.enableMemoryMonitoring || !this.performance.memory) return;
    
    try {
      const checkMemory = () => {
        const memoryInfo = this.performance.memory;
        const memoryMetric = {
          usedJSHeapSize: memoryInfo.usedJSHeapSize,
          totalJSHeapSize: memoryInfo.totalJSHeapSize,
          jsHeapSizeLimit: memoryInfo.jsHeapSizeLimit,
          timestamp: Date.now(),
          usagePercent: (memoryInfo.usedJSHeapSize / memoryInfo.jsHeapSizeLimit) * 100
        };
        
        this.metrics.memory.push(memoryMetric);
        
        // Keep buffer size manageable
        if (this.metrics.memory.length > this.config.bufferSize) {
          this.metrics.memory = this.metrics.memory.slice(-this.config.bufferSize / 2);
        }
        
        // Warn if memory usage is high
        if (memoryMetric.usagePercent > 80) {
          this.console.warn('[Performance] High memory usage:', memoryMetric.usagePercent + '%');
        }
      };
      
      // Check memory every 5 seconds
      this.memoryIntervalId = this.setInterval(checkMemory, 5000);
      
      this.console.log('[Performance] Memory monitoring initialized');
    } catch (error) {
      this.console.error('[Performance] Failed to initialize memory monitoring:', error);
    }
  }

  /**
   * Initialize network monitoring
   */
  initializeNetworkMonitoring() {
    if (!this.config.enableNetworkMonitoring || !this.navigator.connection) return;
    
    try {
      const connection = this.navigator.connection;
      
      const updateConnectionInfo = () => {
        const networkMetric = {
          effectiveType: connection.effectiveType,
          downlink: connection.downlink,
          rtt: connection.rtt,
          saveData: connection.saveData,
          timestamp: Date.now()
        };
        
        this.metrics.network.push(networkMetric);
        
        // Keep buffer size manageable
        if (this.metrics.network.length > this.config.bufferSize) {
          this.metrics.network = this.metrics.network.slice(-this.config.bufferSize / 2);
        }
      };
      
      // Listen for connection changes
      connection.addEventListener('change', updateConnectionInfo);
      
      // Get initial connection info
      updateConnectionInfo();
      
      this.console.log('[Performance] Network monitoring initialized');
    } catch (error) {
      this.console.error('[Performance] Failed to initialize network monitoring:', error);
    }
  }

  /**
   * Start timer for custom metrics
   */
  startTimer(name) {
    this.timings.set(name, this.performance.now());
  }

  /**
   * End timer and record metric
   */
  endTimer(name, type = METRIC_TYPES.CHAT, metadata = {}) {
    const startTime = this.timings.get(name);
    if (startTime === undefined) {
      this.console.warn(`[Performance] Timer '${name}' not found`);
      return null;
    }
    
    const duration = this.performance.now() - startTime;
    this.timings.delete(name);
    
    const metric = {
      name,
      duration,
      timestamp: Date.now(),
      type,
      metadata,
      severity: this.getSeverity(duration, PERFORMANCE_THRESHOLDS[name] || 1000)
    };
    
    this.metrics[type].push(metric);
    
    // Keep buffer size manageable
    if (this.metrics[type].length > this.config.bufferSize) {
      this.metrics[type] = this.metrics[type].slice(-this.config.bufferSize / 2);
    }
    
    this.console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms (${metric.severity})`);
    
    return metric;
  }

  /**
   * Track API call performance
   */
  trackApiCall(url, method, duration, success = true, metadata = {}) {
    const threshold = PERFORMANCE_THRESHOLDS.API_RESPONSE;
    const severity = this.getSeverity(duration, threshold);
    
    const apiMetric = {
      url,
      method,
      duration,
      success,
      threshold,
      severity,
      timestamp: Date.now(),
      metadata
    };
    
    this.metrics.api.push(apiMetric);
    
    // Keep buffer size manageable
    if (this.metrics.api.length > this.config.bufferSize) {
      this.metrics.api = this.metrics.api.slice(-this.config.bufferSize / 2);
    }
    
    this.console.log(`[Performance] API ${method} ${url}: ${duration.toFixed(2)}ms (${severity})`);
    
    return apiMetric;
  }

  /**
   * Track WebSocket connection performance
   */
  trackWebSocketConnection(event, duration = null, metadata = {}) {
    const wsMetric = {
      event,
      duration,
      timestamp: Date.now(),
      metadata
    };
    
    if (duration) {
      const threshold = PERFORMANCE_THRESHOLDS.WEBSOCKET_CONNECT;
      wsMetric.threshold = threshold;
      wsMetric.severity = this.getSeverity(duration, threshold);
    }
    
    this.metrics.websocket.push(wsMetric);
    
    // Keep buffer size manageable
    if (this.metrics.websocket.length > this.config.bufferSize) {
      this.metrics.websocket = this.metrics.websocket.slice(-this.config.bufferSize / 2);
    }
    
    this.console.log(`[Performance] WebSocket ${event}${duration ? ': ' + duration.toFixed(2) + 'ms' : ''}`);
    
    return wsMetric;
  }

  /**
   * Track chat widget performance
   */
  trackChatWidget(event, duration = null, metadata = {}) {
    const chatMetric = {
      event,
      duration,
      timestamp: Date.now(),
      metadata
    };
    
    if (duration) {
      const threshold = PERFORMANCE_THRESHOLDS.CHAT_LOAD;
      chatMetric.threshold = threshold;
      chatMetric.severity = this.getSeverity(duration, threshold);
    }
    
    this.metrics.chat.push(chatMetric);
    
    // Keep buffer size manageable
    if (this.metrics.chat.length > this.config.bufferSize) {
      this.metrics.chat = this.metrics.chat.slice(-this.config.bufferSize / 2);
    }
    
    this.console.log(`[Performance] Chat ${event}${duration ? ': ' + duration.toFixed(2) + 'ms' : ''}`);
    
    return chatMetric;
  }

  /**
   * Track bundle size metrics
   */
  trackBundleSize(name, size, type = 'javascript') {
    const threshold = PERFORMANCE_THRESHOLDS.BUNDLE_SIZE;
    const severity = this.getSeverity(size, threshold);
    
    const bundleMetric = {
      name,
      size,
      type,
      threshold,
      severity,
      timestamp: Date.now(),
      sizeKB: Math.round(size / 1024),
      sizeMB: Math.round(size / 1024 / 1024 * 100) / 100
    };
    
    this.metrics.bundle.set(name, bundleMetric);
    
    this.console.log(`[Performance] Bundle ${name}: ${bundleMetric.sizeKB}KB (${severity})`);
    
    return bundleMetric;
  }

  /**
   * Get severity level for a metric
   */
  getSeverity(value, threshold, metricName = '') {
    if (!threshold) return PERFORMANCE_SEVERITY.GOOD;
    
    // Special handling for CLS (lower is better)
    if (metricName === 'CLS') {
      if (value <= 0.1) return PERFORMANCE_SEVERITY.GOOD;
      if (value <= 0.25) return PERFORMANCE_SEVERITY.NEEDS_IMPROVEMENT;
      return PERFORMANCE_SEVERITY.POOR;
    }
    
    // For other metrics (higher is worse)
    if (value <= threshold) return PERFORMANCE_SEVERITY.GOOD;
    if (value <= threshold * 1.5) return PERFORMANCE_SEVERITY.NEEDS_IMPROVEMENT;
    return PERFORMANCE_SEVERITY.POOR;
  }

  /**
   * Get connection information
   */
  getConnectionInfo() {
    if (!this.navigator.connection) return null;
    
    const connection = this.navigator.connection;
    return {
      effectiveType: connection.effectiveType,
      downlink: connection.downlink,
      rtt: connection.rtt,
      saveData: connection.saveData
    };
  }

  /**
   * Send metrics to analytics
   */
  sendToAnalytics(category, metric) {
    try {
      // Google Analytics
      if (this.window.gtag) {
        this.window.gtag('event', metric.name, {
          event_category: category,
          value: Math.round(metric.value || metric.duration),
          custom_map: {
            severity: metric.severity,
            threshold: metric.threshold
          }
        });
      }
      
      // Custom analytics endpoint
      if (this.config.analyticsEndpoint) {
        fetch(this.config.analyticsEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ category, metric })
        }).catch(error => {
          this.console.error('[Performance] Failed to send analytics:', error);
        });
      }
    } catch (error) {
      this.console.error('[Performance] Analytics error:', error);
    }
  }

  /**
   * Start periodic reporting
   */
  startReporting() {
    if (this.reportingIntervalId) {
      this.clearInterval(this.reportingIntervalId);
    }
    
    this.reportingIntervalId = this.setInterval(() => {
      this.generateReport();
    }, this.config.reportingInterval);
  }

  /**
   * Generate performance report
   */
  generateReport() {
    const report = {
      timestamp: Date.now(),
      webVitals: Object.fromEntries(this.metrics.webVitals),
      api: {
        total: this.metrics.api.length,
        successful: this.metrics.api.filter(m => m.success).length,
        averageResponseTime: this.getAverageResponseTime(this.metrics.api),
        slowest: this.getSlowestRequests(this.metrics.api, 5)
      },
      websocket: {
        total: this.metrics.websocket.length,
        connections: this.metrics.websocket.filter(m => m.event === 'connected').length,
        disconnections: this.metrics.websocket.filter(m => m.event === 'disconnected').length,
        averageConnectionTime: this.getAverageConnectionTime()
      },
      chat: {
        total: this.metrics.chat.length,
        loads: this.metrics.chat.filter(m => m.event === 'load').length,
        messages: this.metrics.chat.filter(m => m.event === 'message_sent').length,
        averageLoadTime: this.getAverageLoadTime()
      },
      memory: this.getMemoryStats(),
      network: this.getNetworkStats(),
      bundle: Object.fromEntries(this.metrics.bundle),
      summary: this.getSummary()
    };
    
    this.console.log('[Performance] Report generated:', report);
    
    // Send report to monitoring service
    this.sendToAnalytics('performance_report', report);
    
    return report;
  }

  /**
   * Get average response time for API calls
   */
  getAverageResponseTime(apiMetrics) {
    if (apiMetrics.length === 0) return 0;
    const total = apiMetrics.reduce((sum, metric) => sum + metric.duration, 0);
    return total / apiMetrics.length;
  }

  /**
   * Get slowest requests
   */
  getSlowestRequests(apiMetrics, limit = 5) {
    return apiMetrics
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit)
      .map(({ url, method, duration, severity }) => ({ url, method, duration, severity }));
  }

  /**
   * Get average connection time
   */
  getAverageConnectionTime() {
    const connections = this.metrics.websocket.filter(m => m.event === 'connected' && m.duration);
    if (connections.length === 0) return 0;
    const total = connections.reduce((sum, metric) => sum + metric.duration, 0);
    return total / connections.length;
  }

  /**
   * Get average load time
   */
  getAverageLoadTime() {
    const loads = this.metrics.chat.filter(m => m.event === 'load' && m.duration);
    if (loads.length === 0) return 0;
    const total = loads.reduce((sum, metric) => sum + metric.duration, 0);
    return total / loads.length;
  }

  /**
   * Get memory statistics
   */
  getMemoryStats() {
    if (this.metrics.memory.length === 0) return null;
    
    const latest = this.metrics.memory[this.metrics.memory.length - 1];
    const usageHistory = this.metrics.memory.slice(-10);
    
    return {
      current: latest,
      averageUsage: usageHistory.reduce((sum, m) => sum + m.usagePercent, 0) / usageHistory.length,
      peakUsage: Math.max(...usageHistory.map(m => m.usagePercent))
    };
  }

  /**
   * Get network statistics
   */
  getNetworkStats() {
    if (this.metrics.network.length === 0) return null;
    
    const latest = this.metrics.network[this.metrics.network.length - 1];
    const resources = this.metrics.network.filter(m => m.type);
    
    return {
      connection: latest.effectiveType ? {
        effectiveType: latest.effectiveType,
        downlink: latest.downlink,
        rtt: latest.rtt
      } : null,
      resources: {
        total: resources.length,
        byType: resources.reduce((acc, r) => {
          acc[r.type] = (acc[r.type] || 0) + 1;
          return acc;
        }, {})
      }
    };
  }

  /**
   * Get performance summary
   */
  getSummary() {
    const webVitals = Object.fromEntries(this.metrics.webVitals);
    const apiMetrics = this.metrics.api;
    
    return {
      webVitalsScore: this.calculateWebVitalsScore(webVitals),
      apiPerformance: {
        successRate: apiMetrics.length > 0 ? 
          (apiMetrics.filter(m => m.success).length / apiMetrics.length) * 100 : 100,
        averageResponseTime: this.getAverageResponseTime(apiMetrics)
      },
      overallHealth: this.calculateOverallHealth()
    };
  }

  /**
   * Calculate Web Vitals score
   */
  calculateWebVitalsScore(webVitals) {
    const scores = Object.values(webVitals).map(metric => {
      switch (metric.severity) {
        case PERFORMANCE_SEVERITY.GOOD: return 100;
        case PERFORMANCE_SEVERITY.NEEDS_IMPROVEMENT: return 75;
        case PERFORMANCE_SEVERITY.POOR: return 25;
        default: return 50;
      }
    });
    
    return scores.length > 0 ? scores.reduce((a, b) => a + b) / scores.length : 100;
  }

  /**
   * Calculate overall health score
   */
  calculateOverallHealth() {
    const webVitalsScore = this.calculateWebVitalsScore(Object.fromEntries(this.metrics.webVitals));
    const apiSuccessRate = this.metrics.api.length > 0 ? 
      (this.metrics.api.filter(m => m.success).length / this.metrics.api.length) * 100 : 100;
    
    return (webVitalsScore + apiSuccessRate) / 2;
  }

  /**
   * Get current metrics
   */
  getMetrics() {
    return {
      webVitals: Object.fromEntries(this.metrics.webVitals),
      api: this.metrics.api,
      websocket: this.metrics.websocket,
      chat: this.metrics.chat,
      bundle: Object.fromEntries(this.metrics.bundle),
      memory: this.metrics.memory,
      network: this.metrics.network
    };
  }

  /**
   * Clear all metrics
   */
  clearMetrics() {
    this.metrics.webVitals.clear();
    this.metrics.api = [];
    this.metrics.websocket = [];
    this.metrics.chat = [];
    this.metrics.bundle.clear();
    this.metrics.memory = [];
    this.metrics.network = [];
    this.timings.clear();
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    // Clear reporting interval
    if (this.reportingIntervalId) {
      this.clearInterval(this.reportingIntervalId);
    }
    
    // Clear memory monitoring interval
    if (this.memoryIntervalId) {
      this.clearInterval(this.memoryIntervalId);
    }
    
    // Disconnect observers
    this.observers.forEach(observer => {
      try {
        observer.disconnect();
      } catch (error) {
        this.console.error('[Performance] Error disconnecting observer:', error);
      }
    });
    
    this.observers.clear();
    this.clearMetrics();
  }
}

/**
 * Factory function to create performance monitor instance
 */
export const createPerformanceMonitor = (config, dependencies) => {
  return new PerformanceMonitor(config, dependencies);
};

/**
 * Default performance monitor instance
 */
export const performanceMonitor = createPerformanceMonitor();

export default performanceMonitor;