// src/utils/__tests__/MessageRegistry.test.js
import { MessageRegistry, MESSAGE_STATES, getMessageRegistry, resetMessageRegistry } from '../MessageRegistry';

// Mock timers
jest.useFakeTimers();

describe('MessageRegistry', () => {
  let registry;

  beforeEach(() => {
    registry = new MessageRegistry({
      cleanupInterval: 1000,
      orphanTimeout: 5000,
      debug: false // Disable debug logs in tests
    });
    jest.clearAllTimers();
  });

  afterEach(() => {
    registry.destroy();
    jest.runOnlyPendingTimers();
  });

  describe('Basic Functionality', () => {
    test('should register message with ID', () => {
      const message = {
        id: 'msg_123',
        content: 'Hello world',
        role: 'user'
      };

      const record = registry.registerMessage(message);

      expect(record.id).toBe('msg_123');
      expect(record.message.id).toBe('msg_123');
      expect(record.state).toBe(MESSAGE_STATES.PENDING);
      expect(record.metadata.isTemporary).toBe(false);
      expect(registry.getMessage('msg_123')).toBe(record);
    });

    test('should generate temporary ID for message without ID', () => {
      const message = {
        content: 'Hello world',
        role: 'user'
      };

      const record = registry.registerMessage(message);

      expect(record.id).toMatch(/^temp_\d+_[a-f0-9]{8}$/);
      expect(record.message.id).toBe(record.id);
      expect(record.state).toBe(MESSAGE_STATES.PENDING);
      expect(record.metadata.isTemporary).toBe(true);
      expect(record.tempId).toBe(record.id);
    });

    test('should update message state correctly', () => {
      const message = { id: 'msg_123', content: 'Test' };
      const record = registry.registerMessage(message);

      const updated = registry.updateMessageState('msg_123', MESSAGE_STATES.SENDING);

      expect(updated.state).toBe(MESSAGE_STATES.SENDING);
      expect(updated.sendTimestamp).toBeDefined();
      expect(registry.getMessage('msg_123').state).toBe(MESSAGE_STATES.SENDING);
    });

    test('should handle unknown message ID in update', () => {
      const result = registry.updateMessageState('unknown_123', MESSAGE_STATES.SENDING);
      expect(result).toBeNull();
    });
  });

  describe('Message Reconciliation', () => {
    test('should reconcile temporary ID with server ID', () => {
      const message = { content: 'Hello world', role: 'user' };
      const record = registry.registerMessage(message);
      const tempId = record.id;

      const serverMessage = {
        id: 'server_msg_456',
        content: 'Hello world',
        response: 'Server processed message'
      };

      const reconciled = registry.reconcileMessage(tempId, 'server_msg_456', serverMessage);

      expect(reconciled).toBe(record);
      expect(record.serverId).toBe('server_msg_456');
      expect(record.state).toBe(MESSAGE_STATES.RECONCILED);
      expect(record.reconcileTimestamp).toBeDefined();
      expect(record.message.response).toBe('Server processed message');

      // Should be accessible by server ID
      const byServerId = registry.getMessage('server_msg_456');
      expect(byServerId).toBe(record);
    });

    test('should handle reconciliation with unknown temp ID', () => {
      const result = registry.reconcileMessage('unknown_temp_123', 'server_456');
      expect(result).toBeNull();
    });

    test('should reconcile by content matching', () => {
      const message = { content: 'Hello world how are you?', role: 'user' };
      const record = registry.registerMessage(message);

      // Try to reconcile with similar content
      const reconciled = registry.reconcileByContent(
        'Hello world how are you?', // Exact match
        'server_789',
        { response: 'Good thanks!' }
      );

      expect(reconciled).toBe(record);
      expect(record.serverId).toBe('server_789');
      expect(record.state).toBe(MESSAGE_STATES.RECONCILED);
    });

    test('should reconcile by content with similarity threshold', () => {
      const message = { content: 'Hello world', role: 'user' };
      registry.registerMessage(message);

      // Similar but not exact content
      const reconciled = registry.reconcileByContent(
        'Hello world!', // Very similar
        'server_789',
        { response: 'Hi there!' },
        0.8
      );

      expect(reconciled).toBeTruthy();
      expect(reconciled.serverId).toBe('server_789');
    });

    test('should not reconcile with low similarity', () => {
      const message = { content: 'Hello world', role: 'user' };
      registry.registerMessage(message);

      // Completely different content
      const reconciled = registry.reconcileByContent(
        'Goodbye universe',
        'server_789',
        {},
        0.8
      );

      expect(reconciled).toBeNull();
    });
  });

  describe('Message Queries', () => {
    test('should get messages by state', () => {
      const msg1 = registry.registerMessage({ content: 'Message 1' });
      const msg2 = registry.registerMessage({ content: 'Message 2' });
      const msg3 = registry.registerMessage({ content: 'Message 3' });

      registry.updateMessageState(msg1.id, MESSAGE_STATES.SENDING);
      registry.updateMessageState(msg2.id, MESSAGE_STATES.SENDING);
      registry.updateMessageState(msg3.id, MESSAGE_STATES.RECONCILED);

      const sendingMessages = registry.getMessagesByState(MESSAGE_STATES.SENDING);
      const reconciledMessages = registry.getMessagesByState(MESSAGE_STATES.RECONCILED);

      expect(sendingMessages).toHaveLength(2);
      expect(reconciledMessages).toHaveLength(1);
      expect(sendingMessages.map(r => r.id)).toContain(msg1.id);
      expect(sendingMessages.map(r => r.id)).toContain(msg2.id);
      expect(reconciledMessages[0].id).toBe(msg3.id);
    });

    test('should identify orphaned messages', () => {
      const msg1 = registry.registerMessage({ content: 'Old message' });
      const msg2 = registry.registerMessage({ content: 'Recent message' });

      // Mock old timestamp for msg1
      const record1 = registry.getMessage(msg1.id);
      record1.timestamp = Date.now() - 10000; // 10 seconds ago

      const orphaned = registry.getOrphanedMessages();
      
      // With 5 second timeout, msg1 should be orphaned
      expect(orphaned).toHaveLength(1);
      expect(orphaned[0].id).toBe(msg1.id);
    });
  });

  describe('Cleanup Operations', () => {
    test('should cleanup orphaned messages', () => {
      const msg1 = registry.registerMessage({ content: 'Old message' });
      const msg2 = registry.registerMessage({ content: 'Recent message' });

      // Make msg1 old
      const record1 = registry.getMessage(msg1.id);
      record1.timestamp = Date.now() - 10000; // 10 seconds ago (exceeds 5s timeout)

      const cleanedCount = registry.cleanupOrphanedMessages();

      expect(cleanedCount).toBe(1);
      
      const stats = registry.getStats();
      expect(stats.orphanedMessages).toBe(1);
    });

    test('should run periodic cleanup', () => {
      const msg = registry.registerMessage({ content: 'Old message' });
      const record = registry.getMessage(msg.id);
      record.timestamp = Date.now() - 10000; // Make it old

      // Fast-forward cleanup interval
      jest.advanceTimersByTime(1000);

      const stats = registry.getStats();
      expect(stats.orphanedMessages).toBeGreaterThan(0);
    });

    test('should force cleanup oldest messages when limit exceeded', () => {
      // Create messages that exceed maxOrphanedMessages (set to small number for test)
      const smallRegistry = new MessageRegistry({
        maxOrphanedMessages: 2,
        debug: false
      });

      // Register 5 temporary messages
      for (let i = 0; i < 5; i++) {
        smallRegistry.registerMessage({ content: `Message ${i}` });
      }

      // Trigger cleanup by exceeding limit
      smallRegistry.cleanupOrphanedMessages();
      
      // Should force cleanup excess messages
      const stats = smallRegistry.getStats();
      expect(stats.tempMessages).toBeLessThanOrEqual(2);

      smallRegistry.destroy();
    });
  });

  describe('Statistics and Monitoring', () => {
    test('should track message statistics', () => {
      const msg1 = registry.registerMessage({ content: 'Message 1' });
      const msg2 = registry.registerMessage({ content: 'Message 2' });
      const msg3 = registry.registerMessage({ content: 'Message 3' });

      registry.reconcileMessage(msg1.id, 'server_1');
      registry.reconcileMessage(msg2.id, 'server_2');
      registry.updateMessageState(msg3.id, MESSAGE_STATES.ORPHANED);

      const stats = registry.getStats();

      expect(stats.totalMessages).toBe(3);
      expect(stats.reconciledMessages).toBe(2);
      expect(stats.orphanedMessages).toBe(1);
      expect(stats.averageReconcileTime).toBeGreaterThan(0);
    });

    test('should calculate average reconcile time correctly', () => {
      const msg1 = registry.registerMessage({ content: 'Message 1' });
      const msg2 = registry.registerMessage({ content: 'Message 2' });

      // Mock different reconcile times
      const record1 = registry.getMessage(msg1.id);
      const record2 = registry.getMessage(msg2.id);
      
      record1.timestamp = Date.now() - 1000; // 1 second ago
      record2.timestamp = Date.now() - 3000; // 3 seconds ago

      registry.reconcileMessage(msg1.id, 'server_1');
      registry.reconcileMessage(msg2.id, 'server_2');

      const stats = registry.getStats();
      expect(stats.averageReconcileTime).toBeCloseTo(2000, -2); // Average of 1000ms and 3000ms
    });

    test('should export messages for debugging', () => {
      const msg1 = registry.registerMessage({ id: 'msg_1', content: 'Message 1' });
      const msg2 = registry.registerMessage({ content: 'Message 2' }); // Temp ID

      const exported = registry.exportMessages();

      expect(Object.keys(exported)).toHaveLength(2);
      expect(exported['msg_1']).toBeDefined();
      expect(exported[msg2.id]).toBeDefined();
      expect(exported['msg_1'].message.content).toBe('Message 1');
    });

    test('should clear all messages', () => {
      registry.registerMessage({ content: 'Message 1' });
      registry.registerMessage({ content: 'Message 2' });

      let stats = registry.getStats();
      expect(stats.totalMessages).toBe(2);

      registry.clear();

      stats = registry.getStats();
      expect(stats.totalMessages).toBe(0);
      expect(stats.activeMessages).toBe(0);
      expect(stats.tempMessages).toBe(0);
    });
  });

  describe('Similarity Calculation', () => {
    test('should calculate exact match similarity', () => {
      const similarity = registry.calculateSimilarity('Hello world', 'Hello world');
      expect(similarity).toBe(1.0);
    });

    test('should calculate partial similarity', () => {
      const similarity = registry.calculateSimilarity('Hello', 'Hello world');
      expect(similarity).toBeGreaterThan(0);
      expect(similarity).toBeLessThan(1);
    });

    test('should handle empty strings', () => {
      const similarity1 = registry.calculateSimilarity('', 'Hello');
      const similarity2 = registry.calculateSimilarity('Hello', '');
      expect(similarity1).toBe(0);
      expect(similarity2).toBe(0);
    });

    test('should handle completely different strings', () => {
      const similarity = registry.calculateSimilarity('Hello', 'xyz');
      expect(similarity).toBeLessThan(0.5); // Should be low similarity
    });
  });

  describe('Global Registry Singleton', () => {
    afterEach(() => {
      resetMessageRegistry();
    });

    test('should create and return global registry', () => {
      const registry1 = getMessageRegistry({ debug: true });
      const registry2 = getMessageRegistry({ debug: false });

      // Should return same instance
      expect(registry1).toBe(registry2);
      expect(registry1).toBeInstanceOf(MessageRegistry);
    });

    test('should reset global registry', () => {
      const registry1 = getMessageRegistry();
      registry1.registerMessage({ content: 'Test' });

      resetMessageRegistry();

      const registry2 = getMessageRegistry();
      expect(registry2).not.toBe(registry1);
      expect(registry2.getStats().totalMessages).toBe(0);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle null/undefined messages gracefully', () => {
      expect(() => {
        registry.registerMessage(null);
      }).not.toThrow();

      expect(() => {
        registry.registerMessage(undefined);
      }).not.toThrow();
    });

    test('should handle malformed message objects', () => {
      const malformedMessage = {
        // Missing required fields
        invalidField: 'value'
      };

      const record = registry.registerMessage(malformedMessage);
      expect(record).toBeDefined();
      expect(record.metadata.isTemporary).toBe(true);
    });

    test('should handle reconciliation with null server message', () => {
      const msg = registry.registerMessage({ content: 'Test' });
      const reconciled = registry.reconcileMessage(msg.id, 'server_123', null);

      expect(reconciled).toBe(registry.getMessage(msg.id));
      expect(reconciled.serverId).toBe('server_123');
    });

    test('should destroy registry cleanly', () => {
      registry.registerMessage({ content: 'Test' });
      
      registry.destroy();

      // Should clear all data
      expect(registry.messages.size).toBe(0);
      expect(registry.temporaryMessages.size).toBe(0);
      expect(registry.serverIdMap.size).toBe(0);
      expect(registry.cleanupTimer).toBeNull();
    });
  });
});