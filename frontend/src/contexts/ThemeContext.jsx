import React, { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext()

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState("light")
  const [language, setLanguage] = useState("fa")

  useEffect(() => {
    // Load theme from localStorage
    const savedTheme = localStorage.getItem('theme') || 'light'
    const savedLanguage = localStorage.getItem('language') || 'fa'
    
    setTheme(savedTheme)
    setLanguage(savedLanguage)
    
    // Apply theme to document
    document.documentElement.setAttribute('data-theme', savedTheme)
    document.documentElement.setAttribute('dir', savedLanguage === 'fa' ? 'rtl' : 'ltr')
    document.documentElement.setAttribute('lang', savedLanguage)
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'))
  }

  const changeLanguage = (lang) => {
    setLanguage(lang)
    localStorage.setItem('language', lang)
    document.documentElement.setAttribute('dir', lang === 'fa' ? 'rtl' : 'ltr')
    document.documentElement.setAttribute('lang', lang)
  }

  const value = {
    theme,
    language,
    toggleTheme,
    changeLanguage
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
} 