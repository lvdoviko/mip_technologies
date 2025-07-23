// src/utils/eventNormalizer.js
import { v4 as uuidv4 } from 'uuid';

/**
 * Central Event Normalizer for MIPTech WebSocket Events
 * 
 * Handles:
 * - camelCase ⇄ snake_case conversion
 * - undefined → null coercion
 * - Automatic back-filling of missing message_id and event_ts
 * - Event data validation and sanitization
 * 
 * @author MIPTech Engineering Team
 * @version 1.0.0
 */

/**
 * Event field mappings for camelCase ⇄ snake_case conversion
 */
export const FIELD_MAPPINGS = {
  // Event metadata
  'event_ts': 'eventTs',
  'message_id': 'messageId', 
  'chat_id': 'chatId',
  'tenant_id': 'tenantId',
  'user_id': 'userId',
  'client_id': 'clientId',
  'session_id': 'sessionId',
  'visitor_id': 'visitorId',
  
  // Message fields
  'response_time': 'responseTime',
  'response_time_ms': 'responseTimeMs',
  'total_tokens': 'totalTokens',
  'prompt_tokens': 'promptTokens',
  'completion_tokens': 'completionTokens',
  'cost_estimate': 'costEstimate',
  'llm_model': 'llmModel',
  'total_chunks': 'totalChunks',
  'created_at': 'createdAt',
  
  // Event types
  'typing_start': 'typingStart',
  'typing_stop': 'typingStop',
  'typing_indicator': 'typingIndicator',
  'connection_established': 'connectionEstablished',
  'connection_ready': 'connectionReady',
  'response_start': 'responseStart',
  'response_chunk': 'responseChunk',
  'response_complete': 'responseComplete',
  'message_received': 'messageReceived',
  'ai_processing_started': 'aiProcessingStarted',
  'ai_processing_error': 'aiProcessingError',
  'ai_response_complete': 'aiResponseComplete',
  'rate_limit_error': 'rateLimitError',
  'message_validation_error': 'messageValidationError',
  'chat_response_streaming': 'chatResponseStreaming'
};

/**
 * Reverse mapping for snake_case → camelCase
 */
export const REVERSE_FIELD_MAPPINGS = Object.fromEntries(
  Object.entries(FIELD_MAPPINGS).map(([snake, camel]) => [camel, snake])
);

/**
 * Event types that require message_id back-filling
 */
export const MESSAGE_ID_REQUIRED_EVENTS = new Set([
  'chat_message',
  'chat_response', 
  'chat_response_streaming',
  'response_start',
  'response_chunk', 
  'response_complete',
  'message_received',
  'ai_processing_started',
  'ai_response_complete',
  'processing'
]);

/**
 * Event types that require event_ts back-filling
 */
export const TIMESTAMP_REQUIRED_EVENTS = new Set([
  'chat_message',
  'chat_response',
  'chat_response_streaming', 
  'response_start',
  'response_chunk',
  'response_complete',
  'message_received',
  'ai_processing_started',
  'ai_response_complete',
  'processing',
  'typing_start',
  'typing_stop',
  'connection_established',
  'connection_ready'
]);

/**
 * Convert string from snake_case to camelCase
 */
export const snakeToCamel = (str) => {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
};

/**
 * Convert string from camelCase to snake_case  
 */
export const camelToSnake = (str) => {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
};

/**
 * Deep convert object keys from snake_case to camelCase
 */
export const convertSnakeToCamel = (obj) => {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(convertSnakeToCamel);
  
  const converted = {};
  
  for (const [key, value] of Object.entries(obj)) {
    // Use mapping if available, otherwise convert programmatically
    const camelKey = FIELD_MAPPINGS[key] || snakeToCamel(key);
    converted[camelKey] = convertSnakeToCamel(value);
  }
  
  return converted;
};

/**
 * Deep convert object keys from camelCase to snake_case
 */
export const convertCamelToSnake = (obj) => {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(convertCamelToSnake);
  
  const converted = {};
  
  for (const [key, value] of Object.entries(obj)) {
    // Use reverse mapping if available, otherwise convert programmatically
    const snakeKey = REVERSE_FIELD_MAPPINGS[key] || camelToSnake(key);
    converted[snakeKey] = convertCamelToSnake(value);
  }
  
  return converted;
};

/**
 * Coerce undefined values to null recursively
 */
export const coerceUndefinedToNull = (obj) => {
  if (obj === undefined) return null;
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(coerceUndefinedToNull);
  
  const coerced = {};
  
  for (const [key, value] of Object.entries(obj)) {
    coerced[key] = coerceUndefinedToNull(value);
  }
  
  return coerced;
};

/**
 * Generate a message ID if missing
 */
export const generateMessageId = () => {
  return `msg_${Date.now()}_${uuidv4().substr(0, 8)}`;
};

/**
 * Generate event timestamp if missing
 */
export const generateEventTimestamp = () => {
  return Date.now();
};

/**
 * Back-fill missing message_id for events that require it
 */
export const backfillMessageId = (eventData, eventType) => {
  if (!MESSAGE_ID_REQUIRED_EVENTS.has(eventType)) return eventData;
  
  const data = { ...eventData };
  
  // Check both camelCase and snake_case variants
  if (!data.message_id && !data.messageId && !data.data?.message_id && !data.data?.messageId) {
    const messageId = generateMessageId();
    
    // Add to main data object
    data.message_id = messageId;
    data.messageId = messageId;
    
    // Add to nested data if it exists
    if (data.data) {
      data.data.message_id = messageId;
      data.data.messageId = messageId;
    }
  }
  
  return data;
};

/**
 * Back-fill missing event_ts for events that require it
 */
export const backfillEventTimestamp = (eventData, eventType) => {
  if (!TIMESTAMP_REQUIRED_EVENTS.has(eventType)) return eventData;
  
  const data = { ...eventData };
  const timestamp = generateEventTimestamp();
  
  // Check both camelCase and snake_case variants
  if (!data.event_ts && !data.eventTs && !data.timestamp) {
    data.event_ts = timestamp;
    data.eventTs = timestamp;
    data.timestamp = timestamp;
  }
  
  // Add to nested data if it exists and is missing
  if (data.data && !data.data.event_ts && !data.data.eventTs && !data.data.timestamp) {
    data.data.event_ts = timestamp;
    data.data.eventTs = timestamp; 
    data.data.timestamp = timestamp;
  }
  
  return data;
};

/**
 * Validate event structure and required fields
 */
export const validateEventStructure = (eventData) => {
  if (!eventData || typeof eventData !== 'object') {
    throw new Error('Event data must be an object');
  }
  
  if (!eventData.type && !eventData.event_type && !eventData.eventType) {
    throw new Error('Event must have a type field');
  }
  
  return true;
};

/**
 * Normalize incoming WebSocket event (from backend)
 * Converts snake_case → camelCase and back-fills missing fields
 */
export const normalizeIncomingEvent = (eventData) => {
  try {
    // Validate basic structure
    validateEventStructure(eventData);
    
    // Get event type (handle all variants)
    const eventType = eventData.type || eventData.event_type || eventData.eventType;
    
    // Step 1: Coerce undefined → null
    let normalized = coerceUndefinedToNull(eventData);
    
    // Step 2: Back-fill message_id if required
    normalized = backfillMessageId(normalized, eventType);
    
    // Step 3: Back-fill event_ts if required  
    normalized = backfillEventTimestamp(normalized, eventType);
    
    // Step 4: Convert snake_case → camelCase for frontend consumption
    normalized = convertSnakeToCamel(normalized);
    
    // Step 5: Ensure type field is normalized
    normalized.type = eventType;
    normalized.eventType = eventType;
    
    // Step 6: Add normalization metadata
    normalized.__normalized = true;
    normalized.__normalizedAt = Date.now();
    
    return normalized;
    
  } catch (error) {
    console.error('[EventNormalizer] Failed to normalize incoming event:', error, eventData);
    
    // Return minimally normalized event to prevent crashes
    return {
      ...eventData,
      type: eventData.type || eventData.event_type || eventData.eventType || 'unknown',
      __normalized: false,
      __normalizedAt: Date.now(),
      __error: error.message
    };
  }
};

/**
 * Normalize outgoing WebSocket event (to backend)  
 * Converts camelCase → snake_case and ensures backend compatibility
 */
export const normalizeOutgoingEvent = (eventData) => {
  try {
    // Validate basic structure
    validateEventStructure(eventData);
    
    // Get event type (handle all variants)
    const eventType = eventData.type || eventData.event_type || eventData.eventType;
    
    // Step 1: Coerce undefined → null
    let normalized = coerceUndefinedToNull(eventData);
    
    // Step 2: Back-fill message_id if required
    normalized = backfillMessageId(normalized, eventType);
    
    // Step 3: Back-fill event_ts if required
    normalized = backfillEventTimestamp(normalized, eventType);
    
    // Step 4: Convert camelCase → snake_case for backend consumption
    normalized = convertCamelToSnake(normalized);
    
    // Step 5: Ensure type field is normalized for backend
    normalized.type = eventType;
    
    // Step 6: Add normalization metadata
    normalized.__normalized = true;
    normalized.__normalizedAt = Date.now();
    
    return normalized;
    
  } catch (error) {
    console.error('[EventNormalizer] Failed to normalize outgoing event:', error, eventData);
    
    // Return minimally normalized event to prevent crashes
    return {
      ...eventData,
      type: eventData.type || eventData.event_type || eventData.eventType || 'unknown',
      __normalized: false,
      __normalizedAt: Date.now(),
      __error: error.message
    };
  }
};

/**
 * Normalize event for internal use (consistent camelCase)
 */
export const normalizeInternalEvent = (eventData) => {
  // For internal use, we prefer incoming normalization (camelCase)
  return normalizeIncomingEvent(eventData);
};

/**
 * Check if an event has been normalized
 */
export const isEventNormalized = (eventData) => {
  return eventData && eventData.__normalized === true;
};

/**
 * Get normalization statistics for debugging
 */
export const getNormalizationStats = () => {
  return {
    fieldMappingsCount: Object.keys(FIELD_MAPPINGS).length,
    messageIdRequiredEvents: MESSAGE_ID_REQUIRED_EVENTS.size,
    timestampRequiredEvents: TIMESTAMP_REQUIRED_EVENTS.size,
    version: '1.0.0'
  };
};

/**
 * Batch normalize multiple events
 */
export const normalizeEventBatch = (events, direction = 'incoming') => {
  const normalizer = direction === 'outgoing' ? normalizeOutgoingEvent : normalizeIncomingEvent;
  
  return events.map((event, index) => {
    try {
      return normalizer(event);
    } catch (error) {
      console.error(`[EventNormalizer] Failed to normalize event at index ${index}:`, error, event);
      return {
        ...event,
        __normalized: false,
        __error: error.message,
        __index: index
      };
    }
  });
};

export default {
  // Core functions
  normalizeIncomingEvent,
  normalizeOutgoingEvent,
  normalizeInternalEvent,
  
  // Utility functions
  convertSnakeToCamel,
  convertCamelToSnake,
  coerceUndefinedToNull,
  backfillMessageId,
  backfillEventTimestamp,
  
  // Helper functions
  isEventNormalized,
  getNormalizationStats,
  normalizeEventBatch,
  
  // Constants
  FIELD_MAPPINGS,
  REVERSE_FIELD_MAPPINGS,
  MESSAGE_ID_REQUIRED_EVENTS,
  TIMESTAMP_REQUIRED_EVENTS
};