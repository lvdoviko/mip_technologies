// src/hooks/useMIPTechApi.js
import { useState, useCallback } from 'react';
import MIPTechApiClient from '../services/miptechApi';

export const useMIPTechApi = (options = {}) => {
  const [apiClient] = useState(() => new MIPTechApiClient(options));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const request = useCallback(async (endpoint, options = {}) => {
    setLoading(true);
    setError(null);

    try {
      const result = await apiClient.request(endpoint, options);
      return result;
    } catch (error) {
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [apiClient]);

  const healthCheck = useCallback(async () => {
    return request('/health');
  }, [request]);

  return {
    apiClient,
    loading,
    error,
    request,
    healthCheck
  };
};