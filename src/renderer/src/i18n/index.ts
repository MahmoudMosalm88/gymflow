import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './en.json'
import ar from './ar.json'

// Apply dir to <html> immediately and keep it in sync
const applyDir = (lng: string) => {
  document.documentElement.dir = lng === 'ar' ? 'rtl' : 'ltr'
  document.documentElement.lang = lng
}

// Read from localStorage for synchronous startup (set by App.tsx on language load)
const savedLang = localStorage.getItem('gymflow-lang') || 'en'
applyDir(savedLang)

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ar: { translation: ar }
  },
  lng: savedLang,
  fallbackLng: 'en',
  react: {
    useSuspense: false
  },
  interpolation: {
    escapeValue: false,
    formatSeparator: ','
  },
  pluralSeparator: '_',
  nsSeparator: ':',
  keySeparator: '.'
})

// Keep dir in sync whenever language changes
i18n.on('languageChanged', applyDir)

export default i18n
