import i18n from './language';

const LANGUAGE_UTILS = {
  getTranslation: (key, fallback) => {
    return i18n.t(key, fallback);
  },
  setLanguage: (lng) => {
    i18n.changeLanguage(lng);
  },
  getCurrentLanguage: () => i18n.language,
};

export default LANGUAGE_UTILS; 