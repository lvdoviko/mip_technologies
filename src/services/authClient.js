// src/services/authClient.js
import { handleApiError } from '../utils/errorHandler';

/**
 * API Error class for authentication errors
 */
class APIError extends Error {
  constructor(status, errorData) {
    super(errorData.message || 'API Error');
    this.status = status;
    this.errorData = errorData;
  }
}

/**
 * Complete MIPTech Authentication Client
 * Based on FINAL-CLIENT-SIDE.md OAuth2 specification
 */
class MIPTechAuthClient {
  constructor(apiUrl, tenantId) {
    this.apiUrl = apiUrl || process.env.REACT_APP_MIPTECH_API_URL || 'http://localhost:8001';
    this.tenantId = tenantId || process.env.REACT_APP_MIPTECH_TENANT_ID || 'miptech-company';
    this.accessToken = localStorage.getItem('miptech_access_token');
    this.refreshToken = localStorage.getItem('miptech_refresh_token');
    this.user = JSON.parse(localStorage.getItem('miptech_user') || 'null');
  }

  // Check if user is authenticated
  isAuthenticated() {
    return !!this.accessToken && !!this.user;
  }

  // Get headers for authenticated requests
  getAuthHeaders() {
    return {
      'Authorization': `Bearer ${this.accessToken}`,
      'X-Tenant-ID': this.tenantId,  // ✅ CRITICAL: Always include tenant
      'Content-Type': 'application/json'
    };
  }

  // Register new user (FINAL-CLIENT-SIDE.md specification)
  async register(userData) {
    const response = await fetch(`${this.apiUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: {
        'X-Tenant-ID': this.tenantId,  // ✅ CRITICAL: Required header
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...userData,
        tenant_id: this.tenantId  // ✅ CRITICAL: Required in body
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new APIError(response.status, error);
    }

    const data = await response.json();
    this.setTokens(data.access_token, data.refresh_token, data.user);
    return data;
  }

  // Login user (FINAL-CLIENT-SIDE.md specification)
  async login(email, password) {
    const response = await fetch(`${this.apiUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'X-Tenant-ID': this.tenantId,  // ✅ CRITICAL: Required header
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        password,
        tenant_id: this.tenantId  // ✅ CRITICAL: Required in body
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new APIError(response.status, error);
    }

    const data = await response.json();
    this.setTokens(data.access_token, data.refresh_token, data.user);
    return data;
  }

  // Refresh access token
  async refreshAccessToken() {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch(`${this.apiUrl}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: {
        'X-Tenant-ID': this.tenantId,  // ✅ CRITICAL: Required header
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        refresh_token: this.refreshToken
      })
    });

    if (!response.ok) {
      this.logout(); // Clear invalid tokens
      throw new Error('Token refresh failed');
    }

    const data = await response.json();
    this.setTokens(data.access_token, data.refresh_token, this.user);
    return data;
  }

  // Make authenticated API request
  async authenticatedRequest(endpoint, options = {}) {
    const config = {
      ...options,
      headers: {
        ...this.getAuthHeaders(),
        ...options.headers
      }
    };

    let response = await fetch(`${this.apiUrl}${endpoint}`, config);

    // Handle token refresh on 401
    if (response.status === 401 && this.refreshToken) {
      try {
        await this.refreshAccessToken();
        config.headers = {
          ...this.getAuthHeaders(),
          ...options.headers
        };
        response = await fetch(`${this.apiUrl}${endpoint}`, config);
      } catch {
        this.logout();
        throw new Error('Authentication expired');
      }
    }

    return response;
  }

  // Logout user
  async logout() {
    try {
      if (this.accessToken) {
        await fetch(`${this.apiUrl}/api/v1/auth/logout`, {
          method: 'POST',
          headers: this.getAuthHeaders()
        });
      }
    } catch (error) {
      console.warn('Logout request failed:', error);
    } finally {
      this.clearTokens();
    }
  }

  // Get current user profile
  async getProfile() {
    const response = await fetch(`${this.apiUrl}/api/v1/auth/me`, {
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      if (response.status === 401) {
        try {
          await this.refreshAccessToken();
          return this.getProfile(); // Retry with new token
        } catch {
          this.logout();
          throw new Error('Authentication expired');
        }
      }
      throw new Error('Failed to get profile');
    }

    return response.json();
  }

  // Set tokens and user data
  setTokens(accessToken, refreshToken, user) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.user = user;

    localStorage.setItem('miptech_access_token', accessToken);
    localStorage.setItem('miptech_refresh_token', refreshToken);
    localStorage.setItem('miptech_user', JSON.stringify(user));
  }

  // Clear tokens and user data
  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    this.user = null;

    localStorage.removeItem('miptech_access_token');
    localStorage.removeItem('miptech_refresh_token');
    localStorage.removeItem('miptech_user');
  }
}

// Usage example
const auth = new MIPTechAuthClient(
  process.env.REACT_APP_MIPTECH_API_URL,
  process.env.REACT_APP_MIPTECH_TENANT_ID
);

export default MIPTechAuthClient;
export { auth };