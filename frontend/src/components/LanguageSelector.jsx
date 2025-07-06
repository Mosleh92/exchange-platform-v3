import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const LanguageSelector = () => {
  const { user } = useAuth();
  const [currentLanguage, setCurrentLanguage] = useState('fa');

  useEffect(() => {
    // Get language from localStorage or user preferences
    const savedLanguage = localStorage.getItem('language') || user?.preferences?.language || 'fa';
    setCurrentLanguage(savedLanguage);
    document.documentElement.lang = savedLanguage;
    document.documentElement.dir = savedLanguage === 'fa' ? 'rtl' : 'ltr';
  }, [user]);

  const changeLanguage = (language) => {
    setCurrentLanguage(language);
    localStorage.setItem('language', language);
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'fa' ? 'rtl' : 'ltr';
    
    // Update user preferences if logged in
    if (user) {
      updateUserLanguage(language);
    }
  };

  const updateUserLanguage = async (language) => {
    try {
      await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          preferences: { language }
        })
      });
    } catch (error) {
      console.error('Error updating language preference:', error);
    }
  };

  return (
    <div className="relative">
      <select
        value={currentLanguage}
        onChange={(e) => changeLanguage(e.target.value)}
        className="appearance-none bg-white border border-gray-300 rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        <option value="fa">🇮🇷 فارسی</option>
        <option value="en">🇺🇸 English</option>
      </select>
      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
};

export default LanguageSelector; 