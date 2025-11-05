/**
 * Centralized API configuration
 * Change LOCAL_IP here to update all API endpoints across the application
 */
export const LOCAL_IP = '127.0.0.1';

/**
 * Get the backend hostname
 * In production, uses the same hostname as the frontend
 * In development, uses LOCAL_IP
 */
const getBackendHost = (): string => {
  // If environment variable is set, use it
  if (import.meta.env.VITE_API_BASE_URL) {
    try {
      const url = new URL(import.meta.env.VITE_API_BASE_URL);
      return url.hostname;
    } catch {
      // If it's not a full URL, assume it's just the hostname
      return import.meta.env.VITE_API_BASE_URL;
    }
  }

  // In production (not localhost), use the same hostname as the frontend
  const currentHost = window.location.hostname;
  if (currentHost !== 'localhost' && currentHost !== '127.0.0.1') {
    return currentHost;
  }

  // In development, use localhost
  return LOCAL_IP;
};

/**
 * Get the backend port
 * Defaults to 5001, but can be overridden via environment variable
 */
const getBackendPort = (): string => {
  if (import.meta.env.VITE_API_PORT) {
    return import.meta.env.VITE_API_PORT;
  }
  return '5001';
};

/**
 * Get the base API URL
 * Uses environment variable if available, otherwise constructs from host and port
 */
export const getBaseUrl = (): string => {
  // If full URL is provided via environment variable, use it
  if (import.meta.env.VITE_API_BASE_URL && import.meta.env.VITE_API_BASE_URL.startsWith('http')) {
    return import.meta.env.VITE_API_BASE_URL;
  }

  const host = getBackendHost();
  const port = getBackendPort();
  const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
  
  // If using the same host as frontend and port is 80/443, omit port
  const currentHost = window.location.hostname;
  const currentPort = window.location.port;
  
  if (host === currentHost && (port === '80' || port === '443' || !currentPort)) {
    return `${protocol}//${host}`;
  }
  
  return `${protocol}//${host}:${port}`;
};

/**
 * Get the WebSocket URL
 * Uses environment variable if available, otherwise constructs from host and port
 */
export const getWebSocketUrl = (path: string = '/ws/odds'): string => {
  if (import.meta.env.VITE_WS_URL) {
    return import.meta.env.VITE_WS_URL;
  }

  const host = getBackendHost();
  const port = getBackendPort();
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  
  return `${protocol}//${host}:${port}${path}`;
};

/**
 * Check if the current origin matches LOCAL_IP
 */
export const isLocalOrigin = (): boolean => {
  return window.location.origin.includes(LOCAL_IP);
};

