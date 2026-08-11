import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import deTranslation from './locales/de.json';
import plTranslation from './locales/pl.json';

// Detect language from URL query parameter `?lang=de` or `?lang=pl`
const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
const urlLang = urlParams ? urlParams.get('lang')?.toLowerCase() : null;

let initialLang = 'de';
if (urlLang === 'pl' || urlLang === 'de') {
  initialLang = urlLang;
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('language', urlLang);
  }
} else if (typeof localStorage !== 'undefined') {
  initialLang = localStorage.getItem('language') || 'de';
}

i18n
  .use(initReactI18next)
  .init({
    resources: {
      de: { translation: deTranslation },
      pl: { translation: plTranslation }
    },
    lng: initialLang,
    fallbackLng: 'de',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
