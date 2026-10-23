import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Language, AVAILABLE_LANGUAGES, LanguageOption } from '../i18n/types';
import { translations } from '../i18n/translations';

const LANGUAGE_STORAGE_KEY = 'inbox_preferred_language_v1';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  currentLanguageOption: LanguageOption;
  languages: LanguageOption[];
  t: (key: string, params?: Record<string, string | number>) => string;
  tCategory: (category: string) => string;
  tStatus: (status: string) => string;
  tRole: (role: string) => string;
  tPaymentMethod: (method: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY) as Language;
      if (stored === 'en' || stored === 'de' || stored === 'nl') {
        return stored;
      }
    } catch {
      // ignore
    }
    return 'en';
  });

  const setLanguage = useCallback((lang: Language) => {
    if (lang === 'en' || lang === 'de' || lang === 'nl') {
      setLanguageState(lang);
      try {
        localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
      } catch {
        // ignore
      }
      // Update HTML lang attribute
      document.documentElement.lang = lang;
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      const dict = translations[language] || translations.en;
      let text = dict[key] || translations.en[key] || key;

      if (params) {
        Object.entries(params).forEach(([paramKey, paramVal]) => {
          text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramVal));
        });
      }
      return text;
    },
    [language]
  );

  const tCategory = useCallback(
    (category: string): string => {
      if (!category) return '';
      const key = `category.${category}`;
      const dict = translations[language] || translations.en;
      return dict[key] || translations.en[key] || category;
    },
    [language]
  );

  const tStatus = useCallback(
    (status: string): string => {
      if (!status) return '';
      const key = `status.${status}`;
      const dict = translations[language] || translations.en;
      return dict[key] || translations.en[key] || status;
    },
    [language]
  );

  const tRole = useCallback(
    (role: string): string => {
      if (!role) return '';
      const key = `role.${role.toLowerCase()}`;
      const dict = translations[language] || translations.en;
      return dict[key] || translations.en[key] || role;
    },
    [language]
  );

  const tPaymentMethod = useCallback(
    (method: string): string => {
      if (!method) return '';
      const lower = method.toLowerCase();
      let key = 'payment.card';
      if (lower.includes('upi')) key = 'payment.upi';
      else if (lower.includes('cod') || lower.includes('cash')) key = 'payment.cod';
      else if (lower.includes('net') || lower.includes('banking')) key = 'payment.netbanking';

      const dict = translations[language] || translations.en;
      return dict[key] || translations.en[key] || method;
    },
    [language]
  );

  const currentLanguageOption =
    AVAILABLE_LANGUAGES.find((l) => l.code === language) || AVAILABLE_LANGUAGES[0];

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        currentLanguageOption,
        languages: AVAILABLE_LANGUAGES,
        t,
        tCategory,
        tStatus,
        tRole,
        tPaymentMethod,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
};
