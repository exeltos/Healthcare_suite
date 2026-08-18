import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { translations } from './translations'
import { readJson, writeJson } from '../core/storage'

const STORAGE_KEY = 'limoxis.language'
const DEFAULT_LANGUAGE = 'el'
const SUPPORTED = ['el', 'en']
const I18nContext = createContext(null)

function getStoredLanguage() {
  const value = readJson(STORAGE_KEY, DEFAULT_LANGUAGE)
  return SUPPORTED.includes(value) ? value : DEFAULT_LANGUAGE
}

function resolvePath(object, path) {
  return path.split('.').reduce((current, key) => current?.[key], object)
}

export function I18nProvider({ children }) {
  const [language, setLanguageState] = useState(getStoredLanguage)

  const setLanguage = useCallback((nextLanguage) => {
    if (!SUPPORTED.includes(nextLanguage)) return
    setLanguageState(nextLanguage)
    writeJson(STORAGE_KEY, nextLanguage)
  }, [])

  const t = useCallback((key, fallback) => {
    const activeDictionary = translations[language] || translations[DEFAULT_LANGUAGE] || {}
    const translated = resolvePath(activeDictionary, key)
    if (typeof translated === 'string') return translated
    const greekFallback = resolvePath(translations.el || {}, key)
    if (typeof greekFallback === 'string') return greekFallback
    if (import.meta.env.DEV) console.warn(`[i18n] Missing translation: ${key}`)
    return fallback ?? key
  }, [language])

  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  const value = useMemo(() => ({ language, setLanguage, t, supportedLanguages: SUPPORTED }), [language, setLanguage, t])
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) throw new Error('useI18n must be used inside I18nProvider')
  return context
}
