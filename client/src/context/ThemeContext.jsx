/**
 * context/ThemeContext.jsx — Theme State (light-only)
 *
 * The app ships a single light theme now. This context is kept as a thin
 * shell so any remaining `useTheme()` call sites don't need to change,
 * but there is no dark mode to toggle into.
 */

import { createContext, useContext } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  return (
    <ThemeContext.Provider value={{ theme: 'light', isDark: false }}>
      {children}
    </ThemeContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
}
