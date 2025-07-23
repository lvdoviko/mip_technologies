// src/utils/__tests__/eventNormalizer.test.js
import {
  normalizeIncomingEvent,
  normalizeOutgoingEvent,
  convertSnakeToCamel,
  convertCamelToSnake,
  coerceUndefinedToNull,
  backfillMessageId,
  backfillEventTimestamp,
  isEventNormalized,
  normalizeEventBatch,
  snakeToCamel,
  camelToSnake,
  generateMessageId,
  generateEventTimestamp,
  FIELD_MAPPINGS,
  MESSAGE_ID_REQUIRED_EVENTS,
  TIMESTAMP_REQUIRED_EVENTS
} from '../eventNormalizer';

describe('EventNormalizer', () => {
  
  describe('String Conversion', () => {
    test('snakeToCamel converts snake_case to camelCase', () => {
      expect(snakeToCamel('snake_case')).toBe('snakeCase');
      expect(snakeToCamel('message_id')).toBe('messageId');
      expect(snakeToCamel('event_ts')).toBe('eventTs');
      expect(snakeToCamel('single')).toBe('single');
      expect(snakeToCamel('multiple_word_example')).toBe('multipleWordExample');
    });

    test('camelToSnake converts camelCase to snake_case', () => {
      expect(camelToSnake('camelCase')).toBe('camel_case');
      expect(camelToSnake('messageId')).toBe('message_id');
      expect(camelToSnake('eventTs')).toBe('event_ts');
      expect(camelToSnake('single')).toBe('single');
      expect(camelToSnake('multipleWordExample')).toBe('multiple_word_example');
    });
  });

  describe('Object Conversion', () => {
    test('convertSnakeToCamel converts object keys recursively', () => {
      const input = {
        message_id: 'msg_123',
        event_ts: 1234567890,
        nested_object: {
          chat_id: 'chat_456',
          user_data: {
            user_id: 'user_789'
          }
        },
        array_field: [
          { item_id: 1 },
          { item_id: 2 }
        ]
      };

      const expected = {
        messageId: 'msg_123',
        eventTs: 1234567890,
        nestedObject: {
          chatId: 'chat_456',
          userData: {
            userId: 'user_789'
          }
        },
        arrayField: [
          { itemId: 1 },
          { itemId: 2 }
        ]
      };

      expect(convertSnakeToCamel(input)).toEqual(expected);
    });

    test('convertCamelToSnake converts object keys recursively', () => {
      const input = {
        messageId: 'msg_123',
        eventTs: 1234567890,
        nestedObject: {
          chatId: 'chat_456',
          userData: {
            userId: 'user_789'
          }
        },
        arrayField: [
          { itemId: 1 },
          { itemId: 2 }
        ]
      };

      const expected = {
        message_id: 'msg_123',
        event_ts: 1234567890,
        nested_object: {
          chat_id: 'chat_456',
          user_data: {
            user_id: 'user_789'
          }
        },
        array_field: [
          { item_id: 1 },
          { item_id: 2 }
        ]
      };

      expect(convertCamelToSnake(input)).toEqual(expected);
    });

    test('handles null and undefined values correctly', () => {
      expect(convertSnakeToCamel(null)).toBe(null);
      expect(convertSnakeToCamel(undefined)).toBe(undefined);
      expect(convertSnakeToCamel('string')).toBe('string');
      expect(convertSnakeToCamel(123)).toBe(123);
      expect(convertSnakeToCamel([])).toEqual([]);
    });

    test('uses field mappings when available', () => {
      const input = { message_id: 'test', chat_id: 'chat_123' };
      const result = convertSnakeToCamel(input);
      
      expect(result.messageId).toBe('test');
      expect(result.chatId).toBe('chat_123');
    });
  });

  describe('Undefined to Null Coercion', () => {
    test('coerces undefined values to null recursively', () => {
      const input = {
        defined: 'value',
        undefinedField: undefined,
        nested: {
          alsoUndefined: undefined,
          defined: 'nested_value'
        },
        array: [
          undefined,
          'defined',
          { undefinedProp: undefined }
        ]
      };

      const expected = {
        defined: 'value',
        undefinedField: null,
        nested: {
          alsoUndefined: null,
          defined: 'nested_value'
        },
        array: [
          null,
          'defined',
          { undefinedProp: null }
        ]
      };

      expect(coerceUndefinedToNull(input)).toEqual(expected);
    });

    test('handles primitive values correctly', () => {
      expect(coerceUndefinedToNull(undefined)).toBe(null);
      expect(coerceUndefinedToNull(null)).toBe(null);
      expect(coerceUndefinedToNull('string')).toBe('string');
      expect(coerceUndefinedToNull(123)).toBe(123);
      expect(coerceUndefinedToNull(true)).toBe(true);
    });
  });

  describe('Message ID Back-filling', () => {
    test('generates message ID for events that require it', () => {
      const eventData = { type: 'chat_message', content: 'test' };
      const result = backfillMessageId(eventData, 'chat_message');
      
      expect(result.message_id).toBeDefined();
      expect(result.messageId).toBeDefined();
      expect(result.message_id).toMatch(/^msg_\d+_[a-f0-9]{8}$/);
    });

    test('does not generate message ID for events that do not require it', () => {
      const eventData = { type: 'ping', timestamp: Date.now() };
      const result = backfillMessageId(eventData, 'ping');
      
      expect(result.message_id).toBeUndefined();
      expect(result.messageId).toBeUndefined();
      expect(result).toEqual(eventData);
    });

    test('does not overwrite existing message ID', () => {
      const eventData = { 
        type: 'chat_message', 
        message_id: 'existing_id',
        content: 'test' 
      };
      const result = backfillMessageId(eventData, 'chat_message');
      
      expect(result.message_id).toBe('existing_id');
    });

    test('adds message ID to nested data object', () => {
      const eventData = { 
        type: 'chat_message',
        data: { content: 'test' }
      };
      const result = backfillMessageId(eventData, 'chat_message');
      
      expect(result.data.message_id).toBeDefined();
      expect(result.data.messageId).toBeDefined();
    });

    test('includes all required event types', () => {
      const requiredEvents = [
        'chat_message', 'chat_response', 'chat_response_streaming',
        'response_start', 'response_chunk', 'response_complete',
        'message_received', 'ai_processing_started', 'ai_response_complete',
        'processing'
      ];

      requiredEvents.forEach(eventType => {
        expect(MESSAGE_ID_REQUIRED_EVENTS.has(eventType)).toBe(true);
      });
    });
  });

  describe('Event Timestamp Back-filling', () => {
    test('generates timestamp for events that require it', () => {
      const eventData = { type: 'chat_message', content: 'test' };
      const before = Date.now();
      const result = backfillEventTimestamp(eventData, 'chat_message');
      const after = Date.now();
      
      expect(result.event_ts).toBeDefined();
      expect(result.eventTs).toBeDefined();
      expect(result.timestamp).toBeDefined();
      expect(result.event_ts).toBeGreaterThanOrEqual(before);
      expect(result.event_ts).toBeLessThanOrEqual(after);
    });

    test('does not generate timestamp for events that do not require it', () => {
      const eventData = { type: 'ping' };
      const result = backfillEventTimestamp(eventData, 'ping');
      
      expect(result.event_ts).toBeUndefined();
      expect(result.eventTs).toBeUndefined();
      expect(result.timestamp).toBeUndefined();
    });

    test('does not overwrite existing timestamp', () => {
      const existing_ts = 1234567890;
      const eventData = { 
        type: 'chat_message',
        event_ts: existing_ts,
        content: 'test' 
      };
      const result = backfillEventTimestamp(eventData, 'chat_message');
      
      expect(result.event_ts).toBe(existing_ts);
    });

    test('includes all required event types', () => {
      const requiredEvents = [
        'chat_message', 'chat_response', 'chat_response_streaming',
        'response_start', 'response_chunk', 'response_complete',
        'message_received', 'ai_processing_started', 'ai_response_complete',
        'processing', 'typing_start', 'typing_stop',
        'connection_established', 'connection_ready'
      ];

      requiredEvents.forEach(eventType => {
        expect(TIMESTAMP_REQUIRED_EVENTS.has(eventType)).toBe(true);
      });
    });
  });

  describe('Incoming Event Normalization', () => {
    test('normalizes complete incoming event from backend', () => {
      const backendEvent = {
        type: 'chat_response',
        data: {
          chat_id: 'chat_123',
          message: {
            content: 'Hello world',
            response_time_ms: 150,
            total_tokens: 25
          },
          metadata: {
            llm_model: 'gpt-4',
            cost_estimate: 0.001
          }
        }
      };

      const result = normalizeIncomingEvent(backendEvent);
      
      // Check structure preservation
      expect(result.type).toBe('chat_response');
      expect(result.__normalized).toBe(true);
      expect(result.__normalizedAt).toBeDefined();
      
      // Check camelCase conversion
      expect(result.data.chatId).toBe('chat_123');
      expect(result.data.message.responseTimeMs).toBe(150);
      expect(result.data.message.totalTokens).toBe(25);
      expect(result.data.metadata.llmModel).toBe('gpt-4');
      expect(result.data.metadata.costEstimate).toBe(0.001);
      
      // Check back-filling
      expect(result.data.message_id).toBeDefined();
      expect(result.data.messageId).toBeDefined();
      expect(result.event_ts).toBeDefined();
      expect(result.eventTs).toBeDefined();
      expect(result.timestamp).toBeDefined();
    });

    test('handles events with missing fields gracefully', () => {
      const incompleteEvent = {
        type: 'connection_ready'
      };

      const result = normalizeIncomingEvent(incompleteEvent);
      
      expect(result.type).toBe('connection_ready');
      expect(result.__normalized).toBe(true);
      expect(result.event_ts).toBeDefined(); // Should be back-filled
      expect(result.eventTs).toBeDefined();
      expect(result.timestamp).toBeDefined();
    });

    test('handles malformed events without crashing', () => {
      const malformedEvent = null;
      
      const result = normalizeIncomingEvent(malformedEvent);
      
      expect(result.__normalized).toBe(false);
      expect(result.__error).toBeDefined();
      expect(result.type).toBe('unknown');
    });

    test('preserves existing normalized events', () => {
      const normalizedEvent = {
        type: 'chat_message',
        messageId: 'existing_123',
        eventTs: 1234567890,
        content: 'test'
      };

      const result = normalizeIncomingEvent(normalizedEvent);
      
      expect(result.messageId).toBe('existing_123');
      expect(result.eventTs).toBe(1234567890);
      expect(result.__normalized).toBe(true);
    });
  });

  describe('Outgoing Event Normalization', () => {
    test('normalizes complete outgoing event for backend', () => {
      const frontendEvent = {
        type: 'chat_message',
        data: {
          chatId: 'chat_123',
          message: 'Hello world',
          metadata: {
            clientTimestamp: Date.now(),
            userAgent: 'test-browser'
          }
        }
      };

      const result = normalizeOutgoingEvent(frontendEvent);
      
      // Check structure preservation
      expect(result.type).toBe('chat_message');
      expect(result.__normalized).toBe(true);
      
      // Check snake_case conversion
      expect(result.data.chat_id).toBe('chat_123');
      expect(result.data.metadata.client_timestamp).toBeDefined();
      expect(result.data.metadata.user_agent).toBe('test-browser');
      
      // Check back-filling
      expect(result.message_id).toBeDefined();
      expect(result.event_ts).toBeDefined();
    });

    test('handles typing events correctly', () => {
      const typingEvent = {
        type: 'typing_start',
        data: {
          chatId: 'chat_123',
          userId: 'user_456'
        }
      };

      const result = normalizeOutgoingEvent(typingEvent);
      
      expect(result.type).toBe('typing_start');
      expect(result.data.chat_id).toBe('chat_123');
      expect(result.data.user_id).toBe('user_456');
      expect(result.event_ts).toBeDefined(); // Should be back-filled
    });
  });

  describe('Utility Functions', () => {
    test('isEventNormalized correctly identifies normalized events', () => {
      const normalized = { __normalized: true, type: 'test' };
      const notNormalized = { type: 'test' };
      
      expect(isEventNormalized(normalized)).toBe(true);
      expect(isEventNormalized(notNormalized)).toBe(false);
      expect(isEventNormalized(null)).toBe(false);
    });

    test('generateMessageId creates valid IDs', () => {
      const id1 = generateMessageId();
      const id2 = generateMessageId();
      
      expect(id1).toMatch(/^msg_\d+_[a-f0-9]{8}$/);
      expect(id2).toMatch(/^msg_\d+_[a-f0-9]{8}$/);
      expect(id1).not.toBe(id2); // Should be unique
    });

    test('generateEventTimestamp creates valid timestamps', () => {
      const before = Date.now();
      const ts = generateEventTimestamp();
      const after = Date.now();
      
      expect(ts).toBeGreaterThanOrEqual(before);
      expect(ts).toBeLessThanOrEqual(after);
      expect(typeof ts).toBe('number');
    });

    test('normalizeEventBatch processes multiple events', () => {
      const events = [
        { type: 'chat_message', data: { chat_id: 'chat_1' } },
        { type: 'chat_response', data: { chat_id: 'chat_2' } },
        { type: 'connection_ready' }
      ];

      const results = normalizeEventBatch(events, 'incoming');
      
      expect(results).toHaveLength(3);
      expect(results[0].__normalized).toBe(true);
      expect(results[1].__normalized).toBe(true);
      expect(results[2].__normalized).toBe(true);
      
      // Check camelCase conversion
      expect(results[0].data.chatId).toBe('chat_1');
      expect(results[1].data.chatId).toBe('chat_2');
    });

    test('normalizeEventBatch handles errors gracefully', () => {
      const events = [
        { type: 'valid_event', data: {} },
        null, // Invalid event
        { type: 'another_valid', data: {} }
      ];

      const results = normalizeEventBatch(events, 'incoming');
      
      expect(results).toHaveLength(3);
      expect(results[0].__normalized).toBe(true);
      expect(results[1].__normalized).toBe(false);
      expect(results[1].__error).toBeDefined();
      expect(results[1].__index).toBe(1);
      expect(results[2].__normalized).toBe(true);
    });
  });

  describe('Field Mappings', () => {
    test('includes all essential WebSocket event fields', () => {
      const expectedFields = [
        'event_ts', 'message_id', 'chat_id', 'tenant_id', 'user_id',
        'response_time_ms', 'total_tokens', 'prompt_tokens', 'completion_tokens',
        'typing_start', 'typing_stop', 'connection_established', 'connection_ready',
        'response_start', 'response_chunk', 'response_complete'
      ];

      expectedFields.forEach(field => {
        expect(FIELD_MAPPINGS[field]).toBeDefined();
        expect(typeof FIELD_MAPPINGS[field]).toBe('string');
      });
    });

    test('mappings are bidirectional', () => {
      Object.entries(FIELD_MAPPINGS).forEach(([snake, camel]) => {
        expect(convertSnakeToCamel({ [snake]: 'test' })[camel]).toBe('test');
        expect(convertCamelToSnake({ [camel]: 'test' })[snake]).toBe('test');
      });
    });
  });

  describe('Edge Cases', () => {
    test('handles deeply nested objects', () => {
      const deepObject = {
        type: 'test',
        level1: {
          level2: {
            level3: {
              message_id: 'deep_test',
              nested_array: [
                { item_field: 'value1' },
                { item_field: 'value2' }
              ]
            }
          }
        }
      };

      const result = normalizeIncomingEvent(deepObject);
      
      expect(result.level1.level2.level3.messageId).toBe('deep_test');
      expect(result.level1.level2.level3.nestedArray[0].itemField).toBe('value1');
      expect(result.level1.level2.level3.nestedArray[1].itemField).toBe('value2');
    });

    test('handles circular references gracefully', () => {
      const circularObject = { type: 'test' };
      circularObject.self = circularObject;

      // This should not throw an error but may not handle the circular reference perfectly
      expect(() => normalizeIncomingEvent(circularObject)).not.toThrow();
    });

    test('handles very large objects', () => {
      const largeObject = {
        type: 'test',
        data: {}
      };

      // Create a large nested object
      for (let i = 0; i < 1000; i++) {
        largeObject.data[`field_${i}`] = `value_${i}`;
      }

      const result = normalizeIncomingEvent(largeObject);
      
      expect(result.__normalized).toBe(true);
      expect(Object.keys(result.data)).toHaveLength(1000);
      expect(result.data[`field${999}`]).toBe('value_999'); // Should be camelCased
    });
  });
});