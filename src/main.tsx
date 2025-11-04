import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { rollbar } from "./lib/rollbar";

// Set up global error handlers for React errors
window.addEventListener('error', (event) => {
  if (rollbar) {
    rollbar.error(event.error || new Error(event.message), {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  }
});

window.addEventListener('unhandledrejection', (event) => {
  if (rollbar) {
    rollbar.error(event.reason || new Error('Unhandled promise rejection'), {
      promise: true,
    });
  }
});

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
