// A temporary, simplified i18n solution to avoid build issues.
// We will replace this with a full i18next implementation later.

const translations = {
  fa: {
    'login.title': 'ورود به سیستم',
    'common.loading': 'در حال بارگذاری...',
    // Add other essential translations here as needed
  },
  en: {
    'login.title': 'Login to System',
    'common.loading': 'Loading...',
    // Add other essential translations here as needed
  },
};

const i18n = {
  language: 'fa', // Default language
  
  t: (key, fallback) => {
    const lang = i18n.language;
    const keys = key.split('.');
    let result = translations[lang];
    
    for (const k of keys) {
      if (result && result[k] !== undefined) {
        result = result[k];
      } else {
        return fallback || key; // Return fallback or the key itself if not found
      }
    }
    
    return result;
  },

  changeLanguage: (lang) => {
    if (translations[lang]) {
      i18n.language = lang;
      console.log(`Language changed to ${lang}`);
    } else {
      console.warn(`Language '${lang}' not found.`);
    }
  },
  
  // Mock other i18next functions if needed to prevent errors
  use: () => i18n,
  init: () => {},
};

// Add a named export for 't' for components that import it directly
export const t = i18n.t;

export default i18n; 