/**
 * Rollbar error tracking setup for React frontend
 */
import * as Rollbar from 'rollbar';

const ROLLBAR_ACCESS_TOKEN = import.meta.env.VITE_ROLLBAR_ACCESS_TOKEN;
const ROLLBAR_ENVIRONMENT = import.meta.env.VITE_ROLLBAR_ENVIRONMENT || 'development';
const ROLLBAR_ENABLED = import.meta.env.VITE_ROLLBAR_ENABLED !== 'false';

let rollbar: Rollbar | null = null;

if (ROLLBAR_ENABLED && ROLLBAR_ACCESS_TOKEN) {
  try {
    rollbar = new Rollbar({
      accessToken: ROLLBAR_ACCESS_TOKEN,
      environment: ROLLBAR_ENVIRONMENT,
      captureUncaught: true,
      captureUnhandledRejections: true,
      payload: {
        client: {
          javascript: {
            source_map_enabled: true,
            code_version: import.meta.env.VITE_APP_VERSION || '1.0.0',
          },
        },
      },
    });
    console.log('✅ Rollbar initialized successfully');
  } catch (error) {
    console.error('⚠️  Failed to initialize Rollbar:', error);
  }
} else {
  console.warn('⚠️  Rollbar is disabled or ROLLBAR_ACCESS_TOKEN is not set');
}

export const reportError = (
  error: Error | string,
  extra?: Record<string, any>,
  level: 'debug' | 'info' | 'warning' | 'error' | 'critical' = 'error'
): void => {
  if (!rollbar) return;

  try {
    if (typeof error === 'string') {
      rollbar.log(error, extra, level);
    } else {
      rollbar.error(error, extra, level);
    }
  } catch (err) {
    console.error('Failed to report error to Rollbar:', err);
  }
};

export const reportMessage = (
  message: string,
  level: 'debug' | 'info' | 'warning' | 'error' | 'critical' = 'info',
  extra?: Record<string, any>
): void => {
  if (!rollbar) return;

  try {
    rollbar.log(message, extra, level);
  } catch (err) {
    console.error('Failed to report message to Rollbar:', err);
  }
};

export const setUserContext = (user: {
  id?: string | number;
  username?: string;
  email?: string;
  [key: string]: any;
}): void => {
  if (!rollbar) return;

  try {
    rollbar.configure({
      payload: {
        person: {
          id: user.id?.toString(),
          username: user.username,
          email: user.email,
        },
      },
    });
  } catch (err) {
    console.error('Failed to set user context in Rollbar:', err);
  }
};

export const clearUserContext = (): void => {
  if (!rollbar) return;

  try {
    rollbar.configure({
      payload: {
        person: null,
      },
    });
  } catch (err) {
    console.error('Failed to clear user context in Rollbar:', err);
  }
};

export { rollbar };

