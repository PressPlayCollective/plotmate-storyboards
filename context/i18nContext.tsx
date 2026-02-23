
import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';

// Define supported languages
export const supportedLocales = ['en', 'ru', 'es', 'zh'] as const;
export type Locale = typeof supportedLocales[number];

const translationsCache: Partial<Record<Locale, any>> = {};

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, options?: any) => any;
}

export const I18nContext = createContext<I18nContextType>({
  locale: 'en',
  setLocale: () => {},
  t: (key) => key,
});

// Helper to get nested value from object by string key
const getNestedTranslation = (obj: any, key: string): any | undefined => {
  return key.split('.').reduce((o, i) => (o ? o[i] : undefined), obj);
};

export const I18nProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<Locale>('en');
  const [loadedTranslations, setLoadedTranslations] = useState<any>({});
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const savedLocale = localStorage.getItem('shotdeck_locale') as Locale;
    if (savedLocale && supportedLocales.includes(savedLocale)) {
      setLocaleState(savedLocale);
    } else {
      const browserLang = navigator.language.split('-')[0] as Locale;
      if (supportedLocales.includes(browserLang)) {
        setLocaleState(browserLang);
      } else {
        setLocaleState('en');
      }
    }
  }, []);

  useEffect(() => {
    const loadTranslations = async () => {
      if (translationsCache[locale]) {
        setLoadedTranslations(translationsCache[locale]);
        setIsLoaded(true);
        return;
      }
      try {
        const response = await fetch(`/locales/${locale}.json`);
        if (!response.ok) throw new Error(`Failed to load translations for ${locale}`);
        const data = await response.json();
        translationsCache[locale] = data;
        setLoadedTranslations(data);
      } catch (error) {
        console.error(error);
        if (locale !== 'en') {
          // Attempt to load English as a fallback
          if (translationsCache['en']) {
            setLoadedTranslations(translationsCache['en']);
          } else {
            try {
              const fallbackResponse = await fetch('/locales/en.json');
              const fallbackData = await fallbackResponse.json();
              translationsCache['en'] = fallbackData;
              setLoadedTranslations(fallbackData);
            } catch (fallbackError) {
              console.error("Failed to load English fallback translations:", fallbackError);
              setLoadedTranslations({});
            }
          }
        }
      } finally {
        setIsLoaded(true);
      }
    };

    loadTranslations();
    document.documentElement.lang = locale;
  }, [locale]);
  
  const setLocale = (newLocale: Locale) => {
    if (supportedLocales.includes(newLocale)) {
      localStorage.setItem('shotdeck_locale', newLocale);
      setLocaleState(newLocale);
      document.documentElement.lang = newLocale;
    }
  };

  const t = (key: string, options?: any): any => {
    if (!isLoaded) return key; // Return the key as a fallback while translations are loading
    const translation = getNestedTranslation(loadedTranslations, key);
    
    if (options?.returnObjects && typeof translation === 'object') {
        return translation;
    }

    return translation || key;
  };

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {isLoaded ? children : null /* Or a loading spinner */}
    </I18nContext.Provider>
  );
};

export const useTranslation = () => useContext(I18nContext);
