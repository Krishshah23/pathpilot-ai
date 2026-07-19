/**
 * main.jsx — Application Entry Point
 *
 * This is the very first file that runs in the browser.
 * React needs a "root" DOM element to attach itself to (see index.html <div id="root">).
 * We also wrap the whole app with two "Provider" components so every page can
 * access the logged-in user (AuthProvider) and show toast notifications (ToastProvider).
 *
 * Think of providers like global state bags — instead of passing data through
 * every component manually, any child can just ask "give me the current user".
 */

import { StrictMode } from 'react';        // Enables extra React warnings in development
import { createRoot } from 'react-dom/client'; // Modern React way to mount the app to the DOM
import './index.css';                        // Global styles (custom properties, base resets)
import App from './App.jsx';                 // Root component that holds all routes
import { AuthProvider } from '@/context/AuthContext';   // Provides user + auth actions to the whole app
import { ToastProvider } from '@/context/ToastContext'; // Provides toast() notification function to the whole app

// Find the <div id="root"> in index.html and mount React inside it.
// StrictMode double-renders components in dev to catch bugs early — it has no effect in production.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* ToastProvider must wrap AuthProvider so auth actions can fire toasts */}
    <ToastProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ToastProvider>
  </StrictMode>
);
