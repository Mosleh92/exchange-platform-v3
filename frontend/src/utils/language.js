import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '../lang/en.js';
import fa from '../lang/fa.js';

// مقداردهی اولیه i18next
if (!i18n.isInitialized) {
  i18n
    .use(initReactI18next)
    .init({
      resources: {
        en: { translation: en },
        fa: { translation: fa },
      },
      lng: 'fa', // زبان پیش‌فرض
      fallbackLng: 'en',
      interpolation: { escapeValue: false },
    });
}

export default i18n; 