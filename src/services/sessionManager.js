// src/services/sessionManager.js
import { v4 as uuidv4 } from 'uuid';
import { 
  sanitizeInput, 
  ERROR_TYPES, 
  ERROR_SEVERITY, 
  MIPTechError 
} from '../utils/errorHandler';

/**
 * Simple encryption/decryption utilities for localStorage
 * Note: This is basic obfuscation, not cryptographically secure
 */
const CryptoUtils = {
  /**
   * Simple base64 encoding with basic obfuscation
   */
  encrypt: (data) => {
    try {
      const jsonString = JSON.stringify(data);
      const encoded = btoa(jsonString);
      // Add simple obfuscation by reversing and adding prefix
      return `mip_${encoded.split('').reverse().join('')}`;
    } catch (error) {
      throw new MIPTechError(
        'Failed to encrypt session data',
        ERROR_TYPES.SYSTEM,
        ERROR_SEVERITY.MEDIUM,
        { originalError: error.message }
      );
    }
  },

  /**
   * Simple base64 decoding with basic deobfuscation
   */
  decrypt: (encryptedData) => {
    try {
      if (!encryptedData || !encryptedData.startsWith('mip_')) {
        throw new Error('Invalid encrypted data format');
      }
      
      const obfuscated = encryptedData.replace('mip_', '');
      const encoded = obfuscated.split('').reverse().join('');
      const jsonString = atob(encoded);
      return JSON.parse(jsonString);
    } catch (error) {
      throw new MIPTechError(
        'Failed to decrypt session data',
        ERROR_TYPES.SYSTEM,
        ERROR_SEVERITY.MEDIUM,
        { originalError: error.message }
      );
    }
  }
};

/**
 * Session configuration
 */
export const createSessionConfig = (options = {}) => {
  return {
    sessionKey: options.sessionKey || 'miptech_session',
    tokenKey: options.tokenKey || 'miptech_session_token',
    sessionTimeout: options.sessionTimeout || 24 * 60 * 60 * 1000, // 24 hours
    maxChatHistory: options.maxChatHistory || 100,
    maxStorageSize: options.maxStorageSize || 5 * 1024 * 1024, // 5MB
    encryptionEnabled: options.encryptionEnabled !== false,
    autoCleanup: options.autoCleanup !== false,
    cleanupInterval: options.cleanupInterval || 60 * 60 * 1000, // 1 hour
    ...options
  };
};

/**
 * Session Manager with encrypted localStorage and comprehensive session management
 */
export class SessionManager {
  constructor(config, dependencies = {}) {
    this.config = createSessionConfig(config);
    this.session = null;
    this.cleanupIntervalId = null;
    
    // Dependency injection for testing - ensure dependencies is an object
    const deps = dependencies || {};
    this.localStorage = deps.localStorage || localStorage;
    this.console = deps.console || console;
    
    // Fix for setInterval brand-check: bind to proper global scope
    // Use window in browser environment, globalThis as fallback
    const globalScope = (typeof window !== 'undefined') 
                      ? window 
                      : (typeof global !== 'undefined') 
                        ? global 
                        : this;
    
    // Keep testability: caller may pass fake timers, but bind to correct context
    this.setInterval = (deps.setInterval || globalScope.setInterval).bind(globalScope);
    this.clearInterval = (deps.clearInterval || globalScope.clearInterval).bind(globalScope);
    
    // Performance metrics
    this.metrics = {
      sessionCreated: 0,
      sessionLoaded: 0,
      sessionSaved: 0,
      encryptionErrors: 0,
      storageErrors: 0,
      cleanupRuns: 0
    };
    
    // Initialize session
    this.initializeSession();
    
    // Start automatic cleanup if enabled
    if (this.config.autoCleanup) {
      this.startAutoCleanup();
    }
  }

  /**
   * Initialize session management
   */
  initializeSession() {
    try {
      this.session = this.loadSession();
      
      if (!this.session || this.isSessionExpired(this.session)) {
        this.session = this.createNewSession();
      } else {
        this.updateLastActivity();
      }
    } catch (error) {
      this.console.error('[Session] Failed to initialize session:', error);
      this.session = this.createNewSession();
    }
  }

  /**
   * Create a new session
   */
  createNewSession() {
    const session = {
      id: uuidv4(),
      visitorId: uuidv4(),
      createdAt: Date.now(),
      lastActivity: Date.now(),
      expiresAt: Date.now() + this.config.sessionTimeout,
      chatHistory: [],
      preferences: {
        theme: 'light',
        notifications: true,
        language: 'en',
        soundEnabled: true
      },
      metadata: {
        userAgent: sanitizeInput(navigator.userAgent),
        initialUrl: sanitizeInput(window.location.href),
        referrer: sanitizeInput(document.referrer || ''),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        colorDepth: window.screen.colorDepth,
        language: navigator.language
      },
      version: '1.0.0'
    };
    
    this.saveSession(session);
    this.metrics.sessionCreated++;
    
    this.console.log('[Session] Created new session:', session.id);
    return session;
  }

  /**
   * Load session from localStorage
   */
  loadSession() {
    try {
      const stored = this.localStorage.getItem(this.config.sessionKey);
      if (!stored) return null;
      
      let session;
      if (this.config.encryptionEnabled) {
        session = CryptoUtils.decrypt(stored);
      } else {
        session = JSON.parse(stored);
      }
      
      // Validate session structure
      if (!this.isValidSession(session)) {
        this.console.warn('[Session] Invalid session structure, creating new session');
        return null;
      }
      
      this.metrics.sessionLoaded++;
      this.console.log('[Session] Loaded existing session:', session.id);
      return session;
      
    } catch (error) {
      this.console.error('[Session] Failed to load session:', error);
      this.metrics.storageErrors++;
      
      // Clean up corrupted session data
      this.clearSessionData();
      return null;
    }
  }

  /**
   * Save session to localStorage
   */
  saveSession(session = this.session) {
    try {
      if (!session) {
        throw new Error('No session to save');
      }
      
      // Update activity timestamp
      session.lastActivity = Date.now();
      
      // Validate session before saving
      if (!this.isValidSession(session)) {
        throw new Error('Invalid session structure');
      }
      
      // Check storage size limits
      const sessionSize = JSON.stringify(session).length;
      if (sessionSize > this.config.maxStorageSize) {
        this.console.warn('[Session] Session exceeds size limit, cleaning up chat history');
        this.trimChatHistory(session);
      }
      
      let dataToStore;
      if (this.config.encryptionEnabled) {
        dataToStore = CryptoUtils.encrypt(session);
      } else {
        dataToStore = JSON.stringify(session);
      }
      
      this.localStorage.setItem(this.config.sessionKey, dataToStore);
      this.session = session;
      this.metrics.sessionSaved++;
      
    } catch (error) {
      this.console.error('[Session] Failed to save session:', error);
      this.metrics.storageErrors++;
      
      if (this.config.encryptionEnabled && error.type === ERROR_TYPES.SYSTEM) {
        this.metrics.encryptionErrors++;
      }
      
      throw new MIPTechError(
        'Failed to save session',
        ERROR_TYPES.SYSTEM,
        ERROR_SEVERITY.MEDIUM,
        { originalError: error.message }
      );
    }
  }

  /**
   * Validate session structure
   */
  isValidSession(session) {
    if (!session || typeof session !== 'object') return false;
    
    const requiredFields = ['id', 'visitorId', 'createdAt', 'lastActivity', 'expiresAt'];
    return requiredFields.every(field => session.hasOwnProperty(field));
  }

  /**
   * Check if session is expired
   */
  isSessionExpired(session) {
    if (!session) return true;
    
    const now = Date.now();
    
    // Check absolute expiration
    if (session.expiresAt && now > session.expiresAt) {
      return true;
    }
    
    // Check inactivity timeout
    const inactivityThreshold = now - this.config.sessionTimeout;
    if (session.lastActivity && session.lastActivity < inactivityThreshold) {
      return true;
    }
    
    return false;
  }

  /**
   * Update last activity timestamp
   */
  updateLastActivity() {
    if (this.session) {
      this.session.lastActivity = Date.now();
      this.saveSession();
    }
  }

  /**
   * Get current session
   */
  getSession() {
    if (!this.session || this.isSessionExpired(this.session)) {
      this.session = this.createNewSession();
    }
    
    return this.session;
  }

  /**
   * Update session data
   */
  updateSession(updates) {
    if (!this.session) {
      this.session = this.createNewSession();
    }
    
    // Sanitize updates
    const sanitizedUpdates = this.sanitizeSessionData(updates);
    
    this.session = { ...this.session, ...sanitizedUpdates };
    this.saveSession();
    
    return this.session;
  }

  /**
   * Sanitize session data
   */
  sanitizeSessionData(data) {
    if (!data || typeof data !== 'object') return data;
    
    const sanitized = {};
    
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string') {
        sanitized[key] = sanitizeInput(value);
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeSessionData(value);
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }

  /**
   * Clear session data
   */
  clearSession() {
    this.console.log('[Session] Clearing session');
    this.clearSessionData();
    this.session = this.createNewSession();
  }

  /**
   * Clear session data from localStorage
   */
  clearSessionData() {
    try {
      this.localStorage.removeItem(this.config.sessionKey);
      this.localStorage.removeItem(this.config.tokenKey);
    } catch (error) {
      this.console.error('[Session] Failed to clear session data:', error);
    }
  }

  /**
   * Add chat message to session history
   */
  addChatMessage(message) {
    if (!this.session) {
      this.session = this.createNewSession();
    }
    
    const sanitizedMessage = {
      id: message.id || uuidv4(),
      content: sanitizeInput(message.content || ''),
      role: sanitizeInput(message.role || 'user'),
      timestamp: message.timestamp || new Date().toISOString(),
      metadata: message.metadata || {}
    };
    
    this.session.chatHistory.push(sanitizedMessage);
    
    // Trim history if it exceeds the limit
    if (this.session.chatHistory.length > this.config.maxChatHistory) {
      this.session.chatHistory = this.session.chatHistory.slice(-this.config.maxChatHistory);
    }
    
    this.saveSession();
    return sanitizedMessage;
  }

  /**
   * Get chat history
   */
  getChatHistory(limit = null) {
    if (!this.session) return [];
    
    const history = this.session.chatHistory || [];
    return limit ? history.slice(-limit) : history;
  }

  /**
   * Clear chat history
   */
  clearChatHistory() {
    if (this.session) {
      this.session.chatHistory = [];
      this.saveSession();
    }
  }

  /**
   * Trim chat history to fit size limits
   */
  trimChatHistory(session = this.session) {
    if (!session || !session.chatHistory) return;
    
    const targetSize = Math.floor(this.config.maxChatHistory * 0.8);
    session.chatHistory = session.chatHistory.slice(-targetSize);
  }

  /**
   * Update user preferences
   */
  updatePreferences(preferences) {
    const sanitizedPrefs = this.sanitizeSessionData(preferences);
    
    this.updateSession({
      preferences: {
        ...this.session.preferences,
        ...sanitizedPrefs
      }
    });
  }

  /**
   * Get user preferences
   */
  getPreferences() {
    return this.session?.preferences || {};
  }

  /**
   * Set session token
   */
  setSessionToken(token) {
    if (!token) return;
    
    try {
      const sanitizedToken = sanitizeInput(token);
      this.localStorage.setItem(this.config.tokenKey, sanitizedToken);
      
      if (this.session) {
        this.session.token = sanitizedToken;
        this.saveSession();
      }
    } catch (error) {
      this.console.error('[Session] Failed to set session token:', error);
    }
  }

  /**
   * Get session token
   */
  getSessionToken() {
    try {
      return this.localStorage.getItem(this.config.tokenKey);
    } catch (error) {
      this.console.error('[Session] Failed to get session token:', error);
      return null;
    }
  }

  /**
   * Clear session token
   */
  clearSessionToken() {
    try {
      this.localStorage.removeItem(this.config.tokenKey);
      if (this.session) {
        delete this.session.token;
        this.saveSession();
      }
    } catch (error) {
      this.console.error('[Session] Failed to clear session token:', error);
    }
  }

  /**
   * Start automatic cleanup
   */
  startAutoCleanup() {
    if (this.cleanupIntervalId) {
      this.clearInterval(this.cleanupIntervalId);
    }
    
    this.cleanupIntervalId = this.setInterval(() => {
      this.performCleanup();
    }, this.config.cleanupInterval);
  }

  /**
   * Stop automatic cleanup
   */
  stopAutoCleanup() {
    if (this.cleanupIntervalId) {
      this.clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = null;
    }
  }

  /**
   * Perform cleanup operations
   */
  performCleanup() {
    try {
      this.console.log('[Session] Performing cleanup...');
      
      // Check if current session is expired
      if (this.session && this.isSessionExpired(this.session)) {
        this.console.log('[Session] Current session expired, creating new one');
        this.session = this.createNewSession();
      }
      
      // Trim chat history if needed
      if (this.session && this.session.chatHistory.length > this.config.maxChatHistory) {
        this.trimChatHistory();
        this.saveSession();
      }
      
      this.metrics.cleanupRuns++;
      
    } catch (error) {
      this.console.error('[Session] Cleanup failed:', error);
    }
  }

  /**
   * Get session metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      sessionAge: this.session ? Date.now() - this.session.createdAt : 0,
      chatHistorySize: this.session?.chatHistory?.length || 0,
      sessionSize: this.session ? JSON.stringify(this.session).length : 0,
      isExpired: this.session ? this.isSessionExpired(this.session) : true
    };
  }

  /**
   * Reset metrics
   */
  resetMetrics() {
    this.metrics = {
      sessionCreated: 0,
      sessionLoaded: 0,
      sessionSaved: 0,
      encryptionErrors: 0,
      storageErrors: 0,
      cleanupRuns: 0
    };
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    this.stopAutoCleanup();
    
    // Save current session before cleanup
    if (this.session) {
      this.saveSession();
    }
  }
}

/**
 * Factory function to create session manager instance
 */
export const createSessionManager = (config, dependencies) => {
  return new SessionManager(config, dependencies);
};

/**
 * Default session manager instance
 */
export const sessionManager = createSessionManager({}, {});

export default sessionManager;