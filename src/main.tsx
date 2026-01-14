import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { rollbar } from "./lib/rollbar";

// Enable console logs
console.log('%c🚀 Frontend App Initializing...', 'color: #4CAF50; font-size: 14px; font-weight: bold;');
console.log('Environment:', import.meta.env.MODE);
console.log('API Base URL:', import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001');

// Set up global error handlers for React errors
window.addEventListener('error', (event) => {
  console.error('❌ Global Error:', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error
  });
  
  if (rollbar) {
    rollbar.error(event.error || new Error(event.message), {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  }
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('❌ Unhandled Promise Rejection:', {
    reason: event.reason,
    promise: event.promise
  });
  
  if (rollbar) {
    rollbar.error(event.reason || new Error('Unhandled promise rejection'), {
      promise: true,
    });
  }
});

const rootElement = document.getElementById("root");
if (!rootElement) {
  console.error('❌ Root element not found!');
  throw new Error('Root element not found');
}

console.log('✅ React: Rendering app to DOM');
createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

console.log('✅ Frontend App: Initialization complete!');
