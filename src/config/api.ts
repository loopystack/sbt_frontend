/**
 * Centralized API configuration
 * Change LOCAL_IP here to update all API endpoints across the application
 */
export const LOCAL_IP = '35.159.122.94';

/**
 * Get the base API URL
 * Uses environment variable if available, otherwise falls back to LOCAL_IP
 */
export const getBaseUrl = (): string => {
  return import.meta.env.VITE_API_BASE_URL || `http://${LOCAL_IP}:5001`;
};

/**
 * Get the WebSocket URL
 * Uses environment variable if available, otherwise falls back to LOCAL_IP
 */
export const getWebSocketUrl = (path: string = '/ws/odds'): string => {
  return import.meta.env.VITE_WS_URL || `ws://${LOCAL_IP}:5001${path}`;
};

/**
 * Check if the current origin matches LOCAL_IP
 */
export const isLocalOrigin = (): boolean => {
  return window.location.origin.includes(LOCAL_IP);
};

