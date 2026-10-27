import React, { createContext, useContext, useState, useEffect } from 'react';
import type { AppearanceSettings } from '../types';

const STORAGE_KEY = 'enrolment_integrity_appearance_settings_v1';

const defaultSettings: AppearanceSettings = {
  theme: 'light',
  accent: 'forest',
  density: 'comfortable',
  sidebarCollapsed: false,
  dashboardLayout: 'standard',
  reducedMotion: false,
};

interface AppearanceContextType {
  settings: AppearanceSettings;
  updateSettings: (partial: Partial<AppearanceSettings>) => void;
  toggleSidebar: () => void;
}

const AppearanceContext = createContext<AppearanceContextType | undefined>(undefined);

export const AppearanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppearanceSettings>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...defaultSettings, ...JSON.parse(stored) };
      }
    } catch {
      // Fallback
    }
    return defaultSettings;
  });

  const updateSettings = (partial: Partial<AppearanceSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...partial };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // local storage write failed
      }
      return updated;
    });
  };

  const toggleSidebar = () => {
    updateSettings({ sidebarCollapsed: !settings.sidebarCollapsed });
  };

  useEffect(() => {
    const root = document.documentElement;

    // Resolve system theme
    const resolvedTheme =
      settings.theme === 'system'
        ? window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'
        : settings.theme;

    root.setAttribute('data-theme', resolvedTheme);
    if (resolvedTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    root.setAttribute('data-accent', settings.accent);
    root.setAttribute('data-density', settings.density);
    root.setAttribute('data-reduced-motion', settings.reducedMotion ? 'true' : 'false');

    // System theme change listener
    if (settings.theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e: MediaQueryListEvent) => {
        const theme = e.matches ? 'dark' : 'light';
        root.setAttribute('data-theme', theme);
        if (theme === 'dark') {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }
      };
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [settings.theme, settings.accent, settings.density, settings.reducedMotion]);

  return (
    <AppearanceContext.Provider value={{ settings, updateSettings, toggleSidebar }}>
      {children}
    </AppearanceContext.Provider>
  );
};

export const useAppearance = (): AppearanceContextType => {
  const context = useContext(AppearanceContext);
  if (!context) {
    throw new Error('useAppearance must be used within an AppearanceProvider');
  }
  return context;
};
