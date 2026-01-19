import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  effectiveTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = 'chatbot-theme';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize theme from localStorage or default to system
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        return stored;
      }
    } catch (error) {
      console.error('Failed to read theme from localStorage:', error);
    }
    return 'system';
  });

  // Track system preference
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  // Calculate effective theme based on preference and system
  const effectiveTheme: 'light' | 'dark' = theme === 'system' ? systemTheme : theme;

  // Update system theme when media query changes
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };

    // Initial check
    handleChange(mediaQuery);

    // Listen for changes
    try {
      // Modern browsers
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } catch (error) {
      // Fallback for older browsers
      try {
        mediaQuery.addListener(handleChange);
        return () => mediaQuery.removeListener(handleChange);
      } catch (innerError) {
        console.error('Failed to listen to system theme changes:', innerError);
      }
    }
  }, []);

  // Apply theme to document root
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(effectiveTheme);

    // Set data-theme attribute for additional styling hooks
    root.setAttribute('data-theme', effectiveTheme);
  }, [effectiveTheme]);

  // Set theme and persist to localStorage
  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem(STORAGE_KEY, newTheme);
    } catch (error) {
      console.error('Failed to save theme to localStorage:', error);
    }
  }, []);

  // Toggle between light and dark (ignoring system)
  const toggleTheme = useCallback(() => {
    setTheme(effectiveTheme === 'light' ? 'dark' : 'light');
  }, [effectiveTheme, setTheme]);

  const value: ThemeContextType = React.useMemo(
    () => ({
      theme,
      effectiveTheme,
      setTheme,
      toggleTheme,
    }),
    [theme, effectiveTheme, setTheme, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

// Custom hook to use theme context
export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Helper hook for theme-specific values
export const useThemedValue = <T,>(lightValue: T, darkValue: T): T => {
  const { effectiveTheme } = useTheme();
  return effectiveTheme === 'dark' ? darkValue : lightValue;
};

export default ThemeProvider;
