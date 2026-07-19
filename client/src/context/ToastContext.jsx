/**
 * context/ToastContext.jsx — Global Toast Notification System
 *
 * A "toast" is a small pop-up message that briefly appears at the bottom-right
 * of the screen (like a phone notification) and auto-dismisses after a few seconds.
 * Examples: "Resume uploaded successfully ✓", "Login failed ✕".
 *
 * HOW IT WORKS:
 *  1. <ToastProvider> renders a fixed-position container in the corner of the screen.
 *  2. It maintains an array of active toasts in state.
 *  3. Any component calls `useToast()` to get the `toast` object, then calls
 *     toast.success('message') / toast.error('message') etc.
 *  4. Each toast has an id, type (success/error/info/warning), and message.
 *     A setTimeout automatically removes each toast after `duration` ms (default 4s).
 *
 * USAGE (in any component):
 *   const toast = useToast();
 *   toast.success('Resume uploaded!');
 *   toast.error('Login failed');
 *   toast.info('Loading your data…');
 *   toast.warning('Your session is about to expire');
 */

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { cn } from '@/lib/cn';

// Context object — consumed by useToast() below
const ToastContext = createContext(null);

// Icons shown on the left of each toast, matching the type
const ICONS = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
  warning: '!',
};

// Tailwind classes for the border and text colour of each toast type
const STYLES = {
  success: 'border-success/40 text-success',
  error: 'border-danger/40 text-danger',
  info: 'border-info/40 text-info',
  warning: 'border-warning/40 text-warning',
};

// Auto-incrementing counter to give each toast a unique id
let idCounter = 0;

export function ToastProvider({ children }) {
  // `toasts` is an array of { id, type, message } objects currently visible
  const [toasts, setToasts] = useState([]);

  /** Removes a specific toast by its id */
  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  /**
   * Adds a new toast to the list and schedules its auto-removal.
   * @param {string} type     - 'success' | 'error' | 'info' | 'warning'
   * @param {string} message  - the text to display
   * @param {number} duration - milliseconds before auto-dismiss (default 4000ms)
   * @returns {number} the toast's id (so callers can dismiss it early if needed)
   */
  const push = useCallback(
    (type, message, duration = 4000) => {
      const id = ++idCounter;                        // unique id for this toast
      setToasts((prev) => [...prev, { id, type, message }]); // add to the list
      if (duration) setTimeout(() => dismiss(id), duration); // schedule removal
      return id;
    },
    [dismiss]
  );

  /**
   * The public API exposed to components via useToast().
   * useMemo prevents re-creating this object on every render.
   */
  const toast = useMemo(
    () => ({
      success: (m, d) => push('success', m, d),
      error:   (m, d) => push('error', m, d),
      info:    (m, d) => push('info', m, d),
      warning: (m, d) => push('warning', m, d),
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}

      {/* Fixed container — sits at the bottom-right corner of the screen.
          z-[100] ensures it renders above modals and nav bars. */}
      <div className="fixed bottom-5 right-5 z-[100] flex w-full max-w-sm flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="alert" // tells screen readers this is a notification
            className={cn(
              'glass animate-fade-up flex items-start gap-3 rounded-xl px-4 py-3 shadow-lg',
              STYLES[t.type]
            )}
          >
            {/* Coloured icon circle on the left */}
            <span
              className={cn(
                'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs font-bold',
                STYLES[t.type]
              )}
            >
              {ICONS[t.type]}
            </span>

            {/* The notification message text */}
            <p className="flex-1 text-sm text-ink">{t.message}</p>

            {/* × button to dismiss the toast early */}
            <button
              onClick={() => dismiss(t.id)}
              className="text-faint transition hover:text-ink"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/**
 * useToast — hook to access the toast API from any component.
 *
 * Usage:
 *   const toast = useToast();
 *   toast.success('Done!');
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}
