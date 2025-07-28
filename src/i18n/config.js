// src/i18n/config.js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import enTranslations from '../locales/en/translations.json';
import itTranslations from '../locales/it/translations.json';

const resources = {
  en: {
    translation: enTranslations
  },
  it: {
    translation: itTranslations
  }
};

i18n
  .use(LanguageDetector) // Detect user language
  .use(initReactI18next) // Bind react-i18next to the instance
  .init({
    resources,
    
    // Language detection options
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'mip-language',
      checkWhitelist: true
    },
    
    // Fallback language if detection fails
    fallbackLng: 'en',
    
    // Whitelist of supported languages
    supportedLngs: ['en', 'it'],
    
    // Debugging (set to false in production)
    debug: process.env.NODE_ENV === 'development',
    
    // Interpolation options
    interpolation: {
      escapeValue: false // React already does escaping
    },
    
    // React specific options
    react: {
      useSuspense: false // Set to false to avoid loading states
    }
  });

export default i18n;