// src/utils/MessageRegistry.js
import { v4 as uuidv4 } from 'uuid';

/**
 * ✅ FE-04: Message Registry for Graceful Missing-ID Fallback
 * 
 * Handles scenarios where messages lack proper IDs due to:
 * - Network issues during send
 * - Backend processing delays
 * - Race conditions between send and response
 * - Platform downtime or restarts
 * 
 * Features:
 * - Automatic temporary UUID assignment
 * - ID reconciliation on response_complete
 * - Orphaned message cleanup
 * - Message lifecycle tracking
 * - Performance monitoring integration
 * 
 * @author MIPTech Engineering Team
 * @version 1.0.0
 */

/**
 * Message states in the registry lifecycle
 */
export const MESSAGE_STATES = {
  PENDING: 'pending',           // Temporary ID assigned, waiting for server confirmation
  SENDING: 'sending',          // Being sent to server
  SENT: 'sent',               // Confirmed sent, waiting for processing
  PROCESSING: 'processing',    // Server is processing (AI generating response)
  RECONCILED: 'reconciled',   // Temporary ID successfully matched with server ID
  ORPHANED: 'orphaned',       // No matching response found (cleanup candidate)
  FAILED: 'failed'           // Send operation failed
};

/**
 * Message registry class
 */
export class MessageRegistry {
  constructor(options = {}) {
    this.options = {
      cleanupInterval: 60000,        // 1 minute
      orphanTimeout: 300000,         // 5 minutes
      maxOrphanedMessages: 100,      // Prevent memory leaks
      enablePerformanceTracking: true,
      debug: process.env.NODE_ENV === 'development',
      ...options
    };

    // Message storage
    this.messages = new Map();           // messageId -> MessageRecord
    this.temporaryMessages = new Map();  // tempId -> MessageRecord
    this.serverIdMap = new Map();        // serverId -> tempId
    
    // Cleanup tracking
    this.cleanupTimer = null;
    this.stats = {
      totalMessages: 0,
      reconciledMessages: 0,
      orphanedMessages: 0,
      failedReconciliations: 0,
      averageReconcileTime: 0
    };
    
    this.startCleanupTimer();
  }

  /**
   * Generate a temporary message ID
   */
  generateTempId() {
    return `temp_${Date.now()}_${uuidv4().substring(0, 8)}`;
  }

  /**
   * Register a new message with optional temporary ID
   */
  registerMessage(message, options = {}) {
    const now = Date.now();
    
    // Use provided ID or generate temporary one
    const messageId = message.id || this.generateTempId();
    const isTemporary = !message.id || messageId.startsWith('temp_');
    
    const record = {
      id: messageId,
      originalId: message.id,
      tempId: isTemporary ? messageId : null,
      serverId: null,
      message: { ...message, id: messageId },
      state: MESSAGE_STATES.PENDING,
      timestamp: now,
      reconcileTimestamp: null,
      sendTimestamp: null,
      processingTimestamp: null,
      metadata: {
        ...options,
        isTemporary,
        retryCount: 0,
        lastError: null
      }
    };

    // Store in appropriate maps
    this.messages.set(messageId, record);
    if (isTemporary) {
      this.temporaryMessages.set(messageId, record);
    }

    this.stats.totalMessages++;

    if (this.options.debug) {
      console.log(`📝 [MessageRegistry] Registered message: ${messageId} (temp: ${isTemporary})`);
    }

    return record;
  }

  /**
   * Update message state
   */
  updateMessageState(messageId, newState, metadata = {}) {
    const record = this.messages.get(messageId);
    if (!record) {
      if (this.options.debug) {
        console.warn(`⚠️ [MessageRegistry] Attempted to update unknown message: ${messageId}`);
      }
      return null;
    }

    const oldState = record.state;
    record.state = newState;
    record.metadata = { ...record.metadata, ...metadata };

    // Update timestamps based on state
    const now = Date.now();
    switch (newState) {
      case MESSAGE_STATES.SENDING:
        record.sendTimestamp = now;
        break;
      case MESSAGE_STATES.PROCESSING:
        record.processingTimestamp = now;
        break;
      case MESSAGE_STATES.RECONCILED:
        record.reconcileTimestamp = now;
        this.stats.reconciledMessages++;
        if (record.timestamp) {
          const reconcileTime = now - record.timestamp;
          this.updateAverageReconcileTime(reconcileTime);
        }
        break;
      case MESSAGE_STATES.ORPHANED:
        this.stats.orphanedMessages++;
        break;
      case MESSAGE_STATES.FAILED:
        this.stats.failedReconciliations++;
        break;
      default:
        // No specific action for other states
        break;
    }

    if (this.options.debug) {
      console.log(`🔄 [MessageRegistry] State change: ${messageId} ${oldState} -> ${newState}`);
    }

    return record;
  }

  /**
   * Reconcile temporary ID with server ID
   */
  reconcileMessage(tempId, serverId, serverMessage = {}) {
    const record = this.temporaryMessages.get(tempId);
    if (!record) {
      if (this.options.debug) {
        console.warn(`⚠️ [MessageRegistry] Cannot reconcile unknown temp ID: ${tempId}`);
      }
      return null;
    }

    // Update record with server information
    record.serverId = serverId;
    record.message = {
      ...record.message,
      ...serverMessage,
      id: serverId // Use server ID as primary
    };

    // Move from temporary to permanent storage
    this.messages.set(serverId, record);
    this.serverIdMap.set(serverId, tempId);
    
    // Update state
    this.updateMessageState(tempId, MESSAGE_STATES.RECONCILED, {
      reconciledWith: serverId,
      serverMessage: serverMessage
    });

    if (this.options.debug) {
      console.log(`✅ [MessageRegistry] Reconciled: ${tempId} -> ${serverId}`);
    }

    return record;
  }

  /**
   * Try to reconcile by content matching (fallback for missing IDs)
   */
  reconcileByContent(content, serverId, serverMessage = {}, similarity = 0.8) {
    if (!content || typeof content !== 'string') return null;

    // Find temporary messages with similar content
    for (const [tempId, record] of this.temporaryMessages.entries()) {
      if (record.state !== MESSAGE_STATES.PENDING && record.state !== MESSAGE_STATES.SENDING) {
        continue;
      }

      const messageContent = record.message.content;
      if (!messageContent) continue;

      // Simple similarity check (can be enhanced with more sophisticated algorithms)
      const sim = this.calculateSimilarity(content, messageContent);
      if (sim >= similarity) {
        if (this.options.debug) {
          console.log(`🔍 [MessageRegistry] Content-based reconciliation: ${tempId} -> ${serverId} (similarity: ${sim.toFixed(2)})`);
        }
        return this.reconcileMessage(tempId, serverId, serverMessage);
      }
    }

    return null;
  }

  /**
   * Simple text similarity calculation
   */
  calculateSimilarity(text1, text2) {
    if (text1 === text2) return 1.0;
    
    const shorter = text1.length < text2.length ? text1 : text2;
    const longer = text1.length < text2.length ? text2 : text1;
    
    if (shorter.length === 0) return 0;
    
    // Simple character-based similarity
    let matches = 0;
    for (let i = 0; i < shorter.length; i++) {
      if (longer.includes(shorter[i])) matches++;
    }
    
    return matches / shorter.length;
  }

  /**
   * Get message by ID (handles both temp and server IDs)
   */
  getMessage(messageId) {
    const record = this.messages.get(messageId);
    if (record) return record;

    // Check if it's a server ID mapped to a temp ID
    const tempId = this.serverIdMap.get(messageId);
    if (tempId) {
      return this.messages.get(tempId);
    }

    return null;
  }

  /**
   * Get all messages in a specific state
   */
  getMessagesByState(state) {
    const results = [];
    for (const record of this.messages.values()) {
      if (record.state === state) {
        results.push(record);
      }
    }
    return results;
  }

  /**
   * Get orphaned messages (candidates for cleanup)
   */
  getOrphanedMessages() {
    const now = Date.now();
    const orphaned = [];

    for (const record of this.temporaryMessages.values()) {
      const age = now - record.timestamp;
      
      if ((record.state === MESSAGE_STATES.PENDING || record.state === MESSAGE_STATES.SENDING) && 
          age > this.options.orphanTimeout) {
        orphaned.push(record);
      }
    }

    return orphaned;
  }

  /**
   * Cleanup orphaned messages
   */
  cleanupOrphanedMessages() {
    const orphaned = this.getOrphanedMessages();
    let cleanedCount = 0;

    for (const record of orphaned) {
      // Mark as orphaned first for tracking
      this.updateMessageState(record.id, MESSAGE_STATES.ORPHANED);
      
      // Remove from temporary storage
      this.temporaryMessages.delete(record.id);
      
      // Keep in main storage for a while for potential late reconciliation
      setTimeout(() => {
        this.messages.delete(record.id);
        if (record.serverId) {
          this.serverIdMap.delete(record.serverId);
        }
      }, 60000); // Remove after 1 minute
      
      cleanedCount++;
    }

    if (cleanedCount > 0 && this.options.debug) {
      console.log(`🧹 [MessageRegistry] Cleaned up ${cleanedCount} orphaned messages`);
    }

    return cleanedCount;
  }

  /**
   * Start periodic cleanup timer
   */
  startCleanupTimer() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cleanupTimer = setInterval(() => {
      this.cleanupOrphanedMessages();
      
      // Prevent memory leaks by limiting orphaned messages
      if (this.temporaryMessages.size > this.options.maxOrphanedMessages) {
        const excess = this.temporaryMessages.size - this.options.maxOrphanedMessages;
        this.forceCleanupOldestMessages(excess);
      }
    }, this.options.cleanupInterval);
  }

  /**
   * Force cleanup of oldest messages (emergency cleanup)
   */
  forceCleanupOldestMessages(count) {
    const messages = Array.from(this.temporaryMessages.values())
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(0, count);

    for (const record of messages) {
      this.messages.delete(record.id);
      this.temporaryMessages.delete(record.id);
      if (record.serverId) {
        this.serverIdMap.delete(record.serverId);
      }
    }

    if (this.options.debug) {
      console.warn(`⚠️ [MessageRegistry] Force cleaned ${count} oldest messages to prevent memory leak`);
    }
  }

  /**
   * Update average reconcile time
   */
  updateAverageReconcileTime(newTime) {
    const count = this.stats.reconciledMessages;
    const currentAvg = this.stats.averageReconcileTime;
    this.stats.averageReconcileTime = ((currentAvg * (count - 1)) + newTime) / count;
  }

  /**
   * Get registry statistics
   */
  getStats() {
    const now = Date.now();
    const activeMessages = this.messages.size;
    const tempMessages = this.temporaryMessages.size;
    const orphanCandidates = this.getOrphanedMessages().length;

    return {
      ...this.stats,
      activeMessages,
      tempMessages,
      orphanCandidates,
      memoryUsage: {
        totalMessages: this.messages.size,
        temporaryMessages: this.temporaryMessages.size,
        serverIdMappings: this.serverIdMap.size
      },
      uptime: now - (this.startTime || now)
    };
  }

  /**
   * Export messages for debugging
   */
  exportMessages() {
    const messages = {};
    for (const [id, record] of this.messages.entries()) {
      messages[id] = {
        ...record,
        message: { ...record.message } // Clone to prevent mutations
      };
    }
    return messages;
  }

  /**
   * Clear all messages (for testing or reset)
   */
  clear() {
    this.messages.clear();
    this.temporaryMessages.clear();
    this.serverIdMap.clear();
    this.stats = {
      totalMessages: 0,
      reconciledMessages: 0,
      orphanedMessages: 0,
      failedReconciliations: 0,
      averageReconcileTime: 0
    };

    if (this.options.debug) {
      console.log('🧹 [MessageRegistry] All messages cleared');
    }
  }

  /**
   * Cleanup resources
   */
  destroy() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.clear();
  }
}

// Singleton instance for global use
let globalRegistry = null;

/**
 * Get or create global message registry instance
 */
export const getMessageRegistry = (options) => {
  if (!globalRegistry) {
    globalRegistry = new MessageRegistry(options);
  }
  return globalRegistry;
};

/**
 * Reset global registry (for testing)
 */
export const resetMessageRegistry = () => {
  if (globalRegistry) {
    globalRegistry.destroy();
    globalRegistry = null;
  }
};

export default MessageRegistry;