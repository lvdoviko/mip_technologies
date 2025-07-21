// src/utils/__tests__/urlUtils.test.js

import { joinPaths, getHealthEndpointUrl, hasDoublePrefix, extractApiVersion } from '../urlUtils';

describe('urlUtils', () => {
  describe('joinPaths', () => {
    test('should join paths correctly without double slashes', () => {
      expect(joinPaths('http://localhost:8000', 'health')).toBe('http://localhost:8000/health');
      expect(joinPaths('http://localhost:8000/', '/health')).toBe('http://localhost:8000/health');
      expect(joinPaths('http://localhost:8000/api/v1', 'health')).toBe('http://localhost:8000/api/v1/health');
      expect(joinPaths('http://localhost:8000', '/api/v1/health')).toBe('http://localhost:8000/api/v1/health');
    });

    test('should handle multiple trailing/leading slashes', () => {
      expect(joinPaths('http://localhost:8000///', '///health')).toBe('http://localhost:8000/health');
      expect(joinPaths('http://localhost:8000/', '/api/v1/health')).toBe('http://localhost:8000/api/v1/health');
    });

    test('should throw error for missing parameters', () => {
      expect(() => joinPaths('', 'health')).toThrow('Both base and path are required');
      expect(() => joinPaths('http://localhost:8000', '')).toThrow('Both base and path are required');
      expect(() => joinPaths(null, 'health')).toThrow('Both base and path are required');
    });
  });

  describe('getHealthEndpointUrl', () => {
    test('should create correct health endpoint URL', () => {
      expect(getHealthEndpointUrl('http://localhost:8000')).toBe('http://localhost:8000/health');
      expect(getHealthEndpointUrl('https://api.miptechnologies.tech')).toBe('https://api.miptechnologies.tech/health');
    });

    test('should not create double prefix', () => {
      const result = getHealthEndpointUrl('http://localhost:8000');
      expect(result).not.toContain('/api/v1/api/v1');
      expect(result).toBe('http://localhost:8000/health');
    });
  });

  describe('hasDoublePrefix', () => {
    test('should detect double API prefixes', () => {
      expect(hasDoublePrefix('http://localhost:8000/api/v1/api/v1/health')).toBe(true);
      expect(hasDoublePrefix('http://localhost:8000//api/v1/health')).toBe(true);
      expect(hasDoublePrefix('http://localhost:8000/v1/v1/health')).toBe(true);
    });

    test('should not flag correct URLs', () => {
      expect(hasDoublePrefix('http://localhost:8000/api/v1/health')).toBe(false);
      expect(hasDoublePrefix('https://api.miptechnologies.tech/api/v1/health')).toBe(false);
    });
  });

  describe('extractApiVersion', () => {
    test('should extract API version from URL', () => {
      expect(extractApiVersion('http://localhost:8000/api/v1/health')).toBe('v1');
      expect(extractApiVersion('https://api.miptechnologies.tech/api/v2/health')).toBe('v2');
    });

    test('should return null for URLs without version', () => {
      expect(extractApiVersion('http://localhost:8000/health')).toBe(null);
      expect(extractApiVersion('https://api.miptechnologies.tech/status')).toBe(null);
    });
  });

  describe('URL construction prevention of double prefix bug', () => {
    test('should prevent the specific double prefix issue from error logs', () => {
      // This test specifically addresses the reported bug: GET /api/v1/api/v1/health → 404
      const baseUrl = 'http://localhost:8000'; // Environment variable WITHOUT /api/v1
      const healthUrl = getHealthEndpointUrl(baseUrl);
      
      expect(healthUrl).toBe('http://localhost:8000/health');
      expect(healthUrl).not.toContain('/api/v1/api/v1');
      expect(hasDoublePrefix(healthUrl)).toBe(false);
    });

    test('should work correctly when base URL accidentally contains prefix', () => {
      // Edge case: if someone misconfigures environment to include /api/v1
      const baseUrlWithPrefix = 'http://localhost:8000/api/v1';
      const healthPath = '/api/v1/health';
      
      // Using joinPaths should still work (though this would be misconfiguration)
      const result = joinPaths(baseUrlWithPrefix, 'health');
      expect(result).toBe('http://localhost:8000/api/v1/health');
      expect(hasDoublePrefix(result)).toBe(false);
    });
  });
});