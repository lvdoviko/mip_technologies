// src/utils/urlUtils.js

/**
 * URL utilities for consistent path construction
 * Prevents double prefix issues and ensures proper URL formatting
 */

/**
 * Safely join a base URL with a path, ensuring no double slashes
 * @param {string} base - Base URL (e.g., "http://localhost:8000" or "http://localhost:8000/api/v1")
 * @param {string} path - Path to append (e.g., "health", "/health", "api/v1/health")
 * @returns {string} - Properly joined URL
 * 
 * @example
 * joinPaths("http://localhost:8000", "health") // → "http://localhost:8000/health"
 * joinPaths("http://localhost:8000/", "/health") // → "http://localhost:8000/health"
 * joinPaths("http://localhost:8000/api/v1", "health") // → "http://localhost:8000/api/v1/health"
 * joinPaths("http://localhost:8000", "/api/v1/health") // → "http://localhost:8000/api/v1/health"
 */
export const joinPaths = (base, path) => {
  if (!base || !path) {
    throw new Error('Both base and path are required for joinPaths');
  }
  
  // Remove trailing slash from base and leading slash from path
  const cleanBase = base.replace(/\/+$/, '');
  const cleanPath = path.replace(/^\/+/, '');
  
  // Join with single slash
  return `${cleanBase}/${cleanPath}`;
};

/**
 * Get the correct health endpoint URL based on environment configuration
 * @param {string} baseUrl - Base API URL from environment
 * @returns {string} - Complete health endpoint URL
 */
export const getHealthEndpointUrl = (baseUrl) => {
  // Use the actual FastAPI health endpoint path
  return joinPaths(baseUrl, '/health');
};

/**
 * Get the correct WebSocket URL with path
 * @param {string} baseWsUrl - Base WebSocket URL from environment
 * @param {string} wsPath - WebSocket path from environment  
 * @param {Object} params - Query parameters
 * @returns {string} - Complete WebSocket URL with query parameters
 */
export const getWebSocketUrl = (baseWsUrl, wsPath, params = {}) => {
  const baseUrl = joinPaths(baseWsUrl, wsPath);
  
  // Add query parameters if provided
  const queryParams = new URLSearchParams(params);
  const queryString = queryParams.toString();
  
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
};

/**
 * Validate URL format and throw descriptive error if invalid
 * @param {string} url - URL to validate
 * @param {string} context - Context for error message
 * @throws {Error} - If URL is invalid
 */
export const validateUrl = (url, context = 'URL') => {
  try {
    new URL(url);
  } catch (error) {
    throw new Error(`Invalid ${context}: ${url} - ${error.message}`);
  }
};

/**
 * Check if URL contains double prefixes (common configuration error)
 * @param {string} url - URL to check
 * @returns {boolean} - True if double prefix detected
 */
export const hasDoublePrefix = (url) => {
  return url.includes('/api/v1/api/v1') || 
         url.includes('//api/v1') ||
         url.includes('/v1/v1');
};

/**
 * Extract API version from URL path
 * @param {string} url - URL to analyze
 * @returns {string|null} - API version (e.g., "v1") or null if not found
 */
export const extractApiVersion = (url) => {
  const match = url.match(/\/api\/(v\d+)\//);
  return match ? match[1] : null;
};

export default {
  joinPaths,
  getHealthEndpointUrl,
  getWebSocketUrl,
  validateUrl,
  hasDoublePrefix,
  extractApiVersion
};