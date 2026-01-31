'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { Locale, Translations } from './index';
import { DEFAULT_LOCALE, STORAGE_KEY } from './index';
import { zh } from './locales/zh';
import { en } from './locales/en';

// Locale to translations mapping
const translations: Record<Locale, Translations> = {
  zh,
  en,
};

// Context type
interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Translations;
}

// Create context
const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Provider props
interface LanguageProviderProps {
  children: React.ReactNode;
  defaultLocale?: Locale;
}

// Provider component
export function LanguageProvider({ children, defaultLocale = DEFAULT_LOCALE }: LanguageProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load saved locale from localStorage on mount
  useEffect(() => {
    const savedLocale = localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (savedLocale && (savedLocale === 'zh' || savedLocale === 'en')) {
      setLocaleState(savedLocale);
    }
    setIsHydrated(true);
  }, []);

  // Update locale and persist to localStorage
  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem(STORAGE_KEY, newLocale);
    // Update html lang attribute
    document.documentElement.lang = newLocale === 'zh' ? 'zh-CN' : 'en';
  }, []);

  // Get translations for current locale
  const t = useMemo(() => translations[locale], [locale]);

  // Memoize context value
  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t,
    }),
    [locale, setLocale, t]
  );

  // Prevent hydration mismatch by not rendering children until hydrated
  // But we render with default locale initially to avoid flicker
  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

// Custom hook to use language context
export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

// Export translations for direct access if needed
export { translations };
