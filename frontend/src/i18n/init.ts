import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'

import en_agent from '@/messages/en/trace.json'
import en_common from '@/messages/en/common.json'
import en_dashboard from '@/messages/en/dashboard.json'
import en_navigation from '@/messages/en/navigation.json'

import zh_agent from '@/messages/zh-CN/trace.json'
import zh_common from '@/messages/zh-CN/common.json'
import zh_dashboard from '@/messages/zh-CN/dashboard.json'
import zh_navigation from '@/messages/zh-CN/navigation.json'

import ko_agent from '@/messages/ko/trace.json'
import ko_common from '@/messages/ko/common.json'
import ko_dashboard from '@/messages/ko/dashboard.json'
import ko_navigation from '@/messages/ko/navigation.json'

import es_agent from '@/messages/es/trace.json'
import es_common from '@/messages/es/common.json'
import es_dashboard from '@/messages/es/dashboard.json'
import es_navigation from '@/messages/es/navigation.json'

const resources = {
  en: {
    trace: en_agent,
    common: en_common,
    dashboard: en_dashboard,
    navigation: en_navigation,
  },
  'zh-CN': {
    trace: zh_agent,
    common: zh_common,
    dashboard: zh_dashboard,
    navigation: zh_navigation,
  },
  ko: {
    trace: ko_agent,
    common: ko_common,
    dashboard: ko_dashboard,
    navigation: ko_navigation,
  },
  es: {
    trace: es_agent,
    common: es_common,
    dashboard: es_dashboard,
    navigation: es_navigation,
  },
}

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    supportedLngs: ['en', 'zh-CN', 'ko', 'es'],
    defaultNS: 'common',
    ns: ['common', 'agent', 'dashboard', 'navigation'],
    interpolation: { escapeValue: false },
    detection: {
      order: ['querystring', 'localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  })

