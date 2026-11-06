import axios from 'axios';

// Storage keys
export const TOKEN_STORAGE_KEY = 'ats_urja_token';
export const USER_STORAGE_KEY = 'ats_urja_user';
export const LAST_ACTIVITY_KEY = 'ats_urja_last_activity';
export const SESSION_EXPIRED_KEY = 'ats_session_expired_msg';

// Base URL configuration
export const API_BASE_URL = (typeof window !== 'undefined' && window.__API_BASE_URL__) || 'http://localhost:8080';

/**
 * Safely parse a JWT token payload without external libraries.
 */
export function parseJwt(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

/**
 * Verify whether a JWT token string is structurally valid and unexpired.
 */
export function isJwtTokenValid(token) {
  if (!token || typeof token !== 'string') return false;
  const trimmed = token.trim();
  if (
    !trimmed ||
    trimmed === 'null' ||
    trimmed === 'undefined' ||
    trimmed.startsWith('demo-') ||
    trimmed.startsWith('ms-sso-')
  ) {
    return false;
  }

  const payload = parseJwt(trimmed);
  if (!payload) return false;

  // Check expiration timestamp (with 5-second buffer)
  if (payload.exp && typeof payload.exp === 'number') {
    const expiresAt = payload.exp * 1000;
    if (expiresAt <= Date.now() + 5000) {
      return false;
    }
  }

  return true;
}

/**
 * Get active stored token from sessionStorage (or localStorage if remember-me was set).
 */
export function getStoredToken() {
  if (typeof window === 'undefined') return null;
  try {
    const sessionToken = sessionStorage.getItem(TOKEN_STORAGE_KEY);
    if (sessionToken && sessionToken !== 'null' && sessionToken !== 'undefined' && sessionToken.trim()) {
      return sessionToken.trim();
    }
    const localToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (localToken && localToken !== 'null' && localToken !== 'undefined' && localToken.trim()) {
      return localToken.trim();
    }
  } catch (e) {
    console.warn('Storage read failed:', e);
  }
  return null;
}

/**
 * Get active stored user object.
 */
export function getStoredUser() {
  if (typeof window === 'undefined') return null;
  try {
    const sessionUser = sessionStorage.getItem(USER_STORAGE_KEY);
    if (sessionUser) return JSON.parse(sessionUser);
    const localUser = localStorage.getItem(USER_STORAGE_KEY);
    if (localUser) return JSON.parse(localUser);
  } catch (e) {}
  return null;
}

/**
 * Persist authenticated session securely.
 */
export function setAuthSession(token, user, rememberMe = false) {
  if (typeof window === 'undefined') return;
  try {
    if (token) {
      sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
      if (rememberMe) {
        localStorage.setItem(TOKEN_STORAGE_KEY, token);
      }
    }
    if (user) {
      sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
      if (rememberMe) {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
      }
    }
    localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
    sessionStorage.removeItem(SESSION_EXPIRED_KEY);
  } catch (e) {
    console.error('Failed to persist auth session:', e);
  }
}

/**
 * Clear authenticated session from all storage.
 */
export function clearAuthSession() {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    sessionStorage.removeItem(USER_STORAGE_KEY);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
  } catch (e) {}
}

// Mutex flag & handler registration to prevent multiple simultaneous logout/redirect storms
let isHandling401 = false;
let authFailureHandler = null;

export function registerAuthFailureHandler(handler) {
  authFailureHandler = handler;
}

export function triggerAuthFailure(reason) {
  if (isHandling401) return;
  isHandling401 = true;

  clearAuthSession();
  try {
    sessionStorage.removeItem(SESSION_EXPIRED_KEY);
  } catch (e) {}

  if (typeof authFailureHandler === 'function') {
    authFailureHandler();
  }

  // Release mutex after redirect window
  setTimeout(() => {
    isHandling401 = false;
  }, 2500);
}

// -------------------------------------------------------------
// Axios Instance Configuration
// -------------------------------------------------------------
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json'
  },
  timeout: 20000
});

// Request Interceptor: Attach Bearer JWT token if valid
api.interceptors.request.use(
  (config) => {
    // Skip token for unauthenticated public auth routes
    const isPublicAuthRoute =
      config.url &&
      (config.url.includes('/api/v1/auth/login') ||
        config.url.includes('/api/v1/auth/register') ||
        config.url.includes('/api/v1/auth/forgot-password') ||
        config.url.includes('/api/v1/auth/reset-password'));

    if (!isPublicAuthRoute) {
      const token = getStoredToken();
      if (token && isJwtTokenValid(token)) {
        config.headers.Authorization = `Bearer ${token}`;
      } else {
        // Do not attach invalid, null, undefined or expired tokens
        delete config.headers.Authorization;
      }
    } else {
      delete config.headers.Authorization;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle 401 (Unauthorized) and 403 (Forbidden)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const requestUrl = error?.config?.url || '';

    // Ignore 401s during login attempts (invalid credentials)
    if (status === 401 && !requestUrl.includes('/api/v1/auth/login')) {
      triggerAuthFailure('Full authentication is required to access this resource.');
    }

    return Promise.reject(error);
  }
);

// -------------------------------------------------------------
// Transparent Global fetch() Patch
// Intercepts legacy raw fetch() calls to guarantee correct headers
// and 401 session expiration handling without touching 40+ files.
// -------------------------------------------------------------
export function installFetchInterceptor() {
  if (typeof window === 'undefined' || window.__ats_fetch_installed__) return;

  const originalFetch = window.fetch;
  window.__ats_fetch_installed__ = true;

  window.fetch = async function (input, init = {}) {
    let url = typeof input === 'string' ? input : (input && input.url) || '';
    const headers = new Headers(init.headers || (typeof input === 'object' && input.headers ? input.headers : {}));

    // Prepend API base URL if relative path
    if (url.startsWith('/api/')) {
      url = `${API_BASE_URL}${url}`;
    }

    // Check if this request is to our backend API
    const isBackendApi = url.includes(API_BASE_URL) || url.startsWith('/api/') || url.includes('/api/v1/');
    const isLoginEndpoint = url.includes('/api/v1/auth/login');

    if (isBackendApi && !isLoginEndpoint) {
      const existingAuth = headers.get('Authorization');
      const token = getStoredToken();

      // If Authorization header is missing, corrupted ('Bearer null', 'Bearer undefined'), or invalid
      const isCorrupted = !existingAuth || existingAuth.includes('null') || existingAuth.includes('undefined') || existingAuth === 'Bearer ';
      if (isCorrupted && token && isJwtTokenValid(token)) {
        headers.set('Authorization', `Bearer ${token}`);
      } else if (existingAuth && (existingAuth.includes('demo-jwt') || existingAuth.includes('ms-sso'))) {
        if (token && isJwtTokenValid(token)) {
          headers.set('Authorization', `Bearer ${token}`);
        }
      }
    }

    const modifiedInit = {
      ...init,
      headers
    };

    try {
      const response = await originalFetch(url, modifiedInit);

      if (response.status === 401 && isBackendApi && !isLoginEndpoint) {
        triggerAuthFailure('Full authentication is required to access this resource.');
      }

      return response;
    } catch (err) {
      throw err;
    }
  };
}

// -------------------------------------------------------------
// High-Level Authentication & User API Services
// -------------------------------------------------------------
export const userService = {
  async getCurrentUserProfile() {
    const response = await api.get('/api/users/me');
    const body = response.data;
    return body.data || body;
  }
};

export const authService = {
  async login(usernameOrEmail, password, rememberMe = false) {
    const response = await api.post('/api/v1/auth/login', {
      usernameOrEmail,
      password
    });

    const body = response.data;
    const authData = body.data || body;
    const token = authData.token || authData.accessToken;
    authData.token = token;

    setAuthSession(token, authData, rememberMe);
    return authData;
  },

  async getCurrentUser() {
    const response = await api.get('/api/v1/auth/me');
    const body = response.data;
    return body.data || body;
  },

  async logout() {
    const token = getStoredToken();
    try {
      if (token && isJwtTokenValid(token)) {
        await api.post('/api/v1/auth/logout');
      }
    } catch (e) {
      // Ignore network failures on logout
    } finally {
      clearAuthSession();
    }
  }
};

export default api;

