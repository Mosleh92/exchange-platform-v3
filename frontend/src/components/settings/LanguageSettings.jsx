import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../UI/Card';
import { Button } from '../UI/Button';
import { Select } from '../UI/Select';
import { Switch } from '../UI/Switch';
import { Badge } from '../UI/Badge';
import { Globe, Download, Upload, Check, X } from 'lucide-react';

const LanguageSettings = () => {
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [fallbackLanguage, setFallbackLanguage] = useState('en');
  const [autoDetect, setAutoDetect] = useState(true);
  const [showTranslations, setShowTranslations] = useState(false);
  const [customTranslations, setCustomTranslations] = useState({});
  const [saved, setSaved] = useState(false);

  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸', nativeName: 'English' },
    { code: 'fa', name: 'Persian', flag: '🇮🇷', nativeName: 'فارسی' },
    { code: 'ar', name: 'Arabic', flag: '🇸🇦', nativeName: 'العربية' },
    { code: 'zh', name: 'Chinese', flag: '🇨🇳', nativeName: '中文' },
    { code: 'es', name: 'Spanish', flag: '🇪🇸', nativeName: 'Español' },
    { code: 'fr', name: 'French', flag: '🇫🇷', nativeName: 'Français' },
    { code: 'de', name: 'German', flag: '🇩🇪', nativeName: 'Deutsch' },
    { code: 'ja', name: 'Japanese', flag: '🇯🇵', nativeName: '日本語' },
    { code: 'ko', name: 'Korean', flag: '🇰🇷', nativeName: '한국어' },
    { code: 'ru', name: 'Russian', flag: '🇷🇺', nativeName: 'Русский' },
    { code: 'tr', name: 'Turkish', flag: '🇹🇷', nativeName: 'Türkçe' },
    { code: 'pt', name: 'Portuguese', flag: '🇵🇹', nativeName: 'Português' }
  ];

  const commonPhrases = [
    { key: 'dashboard', en: 'Dashboard', fa: 'داشبورد', ar: 'لوحة التحكم' },
    { key: 'trading', en: 'Trading', fa: 'معاملات', ar: 'التداول' },
    { key: 'portfolio', en: 'Portfolio', fa: 'پرتفوی', ar: 'المحفظة' },
    { key: 'settings', en: 'Settings', fa: 'تنظیمات', ar: 'الإعدادات' },
    { key: 'profile', en: 'Profile', fa: 'پروفایل', ar: 'الملف الشخصي' },
    { key: 'logout', en: 'Logout', fa: 'خروج', ar: 'تسجيل الخروج' },
    { key: 'buy', en: 'Buy', fa: 'خرید', ar: 'شراء' },
    { key: 'sell', en: 'Sell', fa: 'فروش', ar: 'بيع' },
    { key: 'balance', en: 'Balance', fa: 'موجودی', ar: 'الرصيد' },
    { key: 'transactions', en: 'Transactions', fa: 'تراکنش‌ها', ar: 'المعاملات' }
  ];

  useEffect(() => {
    // Load saved preferences
    const savedLanguage = localStorage.getItem('language') || 'en';
    const savedFallback = localStorage.getItem('fallbackLanguage') || 'en';
    const savedAutoDetect = localStorage.getItem('autoDetect') !== 'false';
    const savedTranslations = JSON.parse(localStorage.getItem('customTranslations') || '{}');

    setCurrentLanguage(savedLanguage);
    setFallbackLanguage(savedFallback);
    setAutoDetect(savedAutoDetect);
    setCustomTranslations(savedTranslations);

    // Apply language
    applyLanguage(savedLanguage);
  }, []);

  const applyLanguage = (languageCode) => {
    document.documentElement.lang = languageCode;
    document.documentElement.setAttribute('data-language', languageCode);
    
    // Update direction for RTL languages
    const rtlLanguages = ['fa', 'ar', 'he', 'ur'];
    if (rtlLanguages.includes(languageCode)) {
      document.documentElement.dir = 'rtl';
    } else {
      document.documentElement.dir = 'ltr';
    }

    // Dispatch custom event for language change
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: languageCode } }));
  };

  const handleLanguageChange = (languageCode) => {
    setCurrentLanguage(languageCode);
    applyLanguage(languageCode);
    localStorage.setItem('language', languageCode);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleFallbackLanguageChange = (languageCode) => {
    setFallbackLanguage(languageCode);
    localStorage.setItem('fallbackLanguage', languageCode);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleAutoDetectChange = (enabled) => {
    setAutoDetect(enabled);
    localStorage.setItem('autoDetect', enabled.toString());
    
    if (enabled) {
      // Detect browser language
      const browserLanguage = navigator.language.split('-')[0];
      const supportedLanguage = languages.find(lang => lang.code === browserLanguage);
      if (supportedLanguage) {
        handleLanguageChange(browserLanguage);
      }
    }
    
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const getTranslation = (key, language = currentLanguage) => {
    // First check custom translations
    if (customTranslations[language] && customTranslations[language][key]) {
      return customTranslations[language][key];
    }

    // Then check common phrases
    const phrase = commonPhrases.find(p => p.key === key);
    if (phrase && phrase[language]) {
      return phrase[language];
    }

    // Fallback to English
    if (language !== 'en') {
      return getTranslation(key, 'en');
    }

    return key;
  };

  const updateCustomTranslation = (key, language, value) => {
    setCustomTranslations(prev => ({
      ...prev,
      [language]: {
        ...prev[language],
        [key]: value
      }
    }));
  };

  const saveCustomTranslations = () => {
    localStorage.setItem('customTranslations', JSON.stringify(customTranslations));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const exportTranslations = () => {
    const dataStr = JSON.stringify(customTranslations, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `translations_${currentLanguage}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importTranslations = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const translations = JSON.parse(e.target.result);
          setCustomTranslations(translations);
          localStorage.setItem('customTranslations', JSON.stringify(translations));
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        } catch (error) {
          alert('Invalid translation file format');
        }
      };
      reader.readAsText(file);
    }
  };

  const resetTranslations = () => {
    setCustomTranslations({});
    localStorage.removeItem('customTranslations');
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Language Settings</h1>
          <p className="text-gray-600 dark:text-gray-400">Customize your language preferences</p>
        </div>
        {saved && (
          <Badge variant="success" className="flex items-center space-x-2">
            <Check className="w-4 h-4" />
            <span>Settings saved</span>
          </Badge>
        )}
      </div>

      {/* Language Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Globe className="w-5 h-5" />
            <span>Language</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Auto Detect */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Auto-detect Language</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Automatically detect language from browser settings
              </p>
            </div>
            <Switch
              checked={autoDetect}
              onCheckedChange={handleAutoDetectChange}
            />
          </div>

          {/* Primary Language */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Primary Language</label>
            <Select
              value={currentLanguage}
              onChange={(e) => handleLanguageChange(e.target.value)}
              disabled={autoDetect}
            >
              {languages.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.flag} {lang.name} ({lang.nativeName})
                </option>
              ))}
            </Select>
          </div>

          {/* Fallback Language */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Fallback Language</label>
            <Select
              value={fallbackLanguage}
              onChange={(e) => handleFallbackLanguageChange(e.target.value)}
            >
              {languages.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.flag} {lang.name} ({lang.nativeName})
                </option>
              ))}
            </Select>
          </div>

          {/* Current Language Preview */}
          <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
            <h4 className="font-medium mb-2">Current Language Preview</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Dashboard:</span>
                <span>{getTranslation('dashboard')}</span>
              </div>
              <div className="flex justify-between">
                <span>Trading:</span>
                <span>{getTranslation('trading')}</span>
              </div>
              <div className="flex justify-between">
                <span>Settings:</span>
                <span>{getTranslation('settings')}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Custom Translations */}
      <Card>
        <CardHeader>
          <CardTitle>Custom Translations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Custom Translations</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Add or modify translations for your language
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowTranslations(!showTranslations)}
            >
              {showTranslations ? 'Hide' : 'Show'} Translations
            </Button>
          </div>

          {showTranslations && (
            <div className="space-y-4">
              {commonPhrases.map((phrase) => (
                <div key={phrase.key} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{phrase.key}</span>
                    <Badge variant="secondary">{currentLanguage}</Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-gray-600 dark:text-gray-400">English</label>
                      <input
                        type="text"
                        value={phrase.en}
                        readOnly
                        className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-800"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-gray-600 dark:text-gray-400">
                        {languages.find(l => l.code === currentLanguage)?.name || 'Translation'}
                      </label>
                      <input
                        type="text"
                        value={customTranslations[currentLanguage]?.[phrase.key] || phrase[currentLanguage] || ''}
                        onChange={(e) => updateCustomTranslation(phrase.key, currentLanguage, e.target.value)}
                        className="w-full p-2 border rounded"
                        placeholder="Enter translation..."
                      />
                    </div>
                  </div>
                </div>
              ))}

              <div className="flex space-x-2">
                <Button onClick={saveCustomTranslations}>
                  Save Translations
                </Button>
                <Button variant="outline" onClick={resetTranslations}>
                  Reset
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Import/Export */}
      <Card>
        <CardHeader>
          <CardTitle>Import/Export</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium mb-2">Export Translations</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Download your custom translations as JSON file
              </p>
              <Button variant="outline" onClick={exportTranslations}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
            <div>
              <h3 className="font-medium mb-2">Import Translations</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Upload a JSON file with custom translations
              </p>
              <input
                type="file"
                accept=".json"
                onChange={importTranslations}
                className="hidden"
                id="import-translations"
              />
              <label htmlFor="import-translations">
                <Button variant="outline" asChild>
                  <span>
                    <Upload className="w-4 h-4 mr-2" />
                    Import
                  </span>
                </Button>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Language Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Language Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {languages.length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Supported Languages
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {Object.keys(customTranslations).length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Custom Languages
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {commonPhrases.length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Common Phrases
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={resetTranslations}>
          Reset All Settings
        </Button>
        <div className="flex space-x-2">
          <Button variant="outline">
            Test Language
          </Button>
          <Button>
            Save All Changes
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LanguageSettings; 