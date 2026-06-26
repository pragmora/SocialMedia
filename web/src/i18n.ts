import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import translation from '@/locales/es/translation.json'

i18n.use(initReactI18next).init({
  lng: 'es',
  fallbackLng: 'es',
  resources: {
    es: {
      translation,
    },
  },
  interpolation: {
    escapeValue: false,
  },
})

export default i18n
