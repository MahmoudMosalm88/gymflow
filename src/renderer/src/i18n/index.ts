import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './en.json'
import ar from './ar.json'

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ar: { translation: ar }
  },
  lng: 'en', // Default language
  fallbackLng: 'en',
  react: {
    useSuspense: false
  },
  interpolation: {
    escapeValue: false, // React already escapes values
    formatSeparator: ','
  },
  pluralSeparator: '_',
  nsSeparator: ':',
  keySeparator: '.'
})

export default i18n
