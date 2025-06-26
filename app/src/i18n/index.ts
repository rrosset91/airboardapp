import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

import pt from './pt.json';
import en from './en.json';
import fr from './fr.json';
import de from './de.json';
import es from './es.json';

const resources = {
  pt: { translation: pt },
  en: { translation: en },
  fr: { translation: fr },
  de: { translation: de },
  es: { translation: es },
};

export const initI18n = async () => {
  const savedLang = await AsyncStorage.getItem('appLanguage');
  const language = savedLang || 'en';
  console.log('[INIT i18n]', savedLang);

  if (!i18n.isInitialized) {
    await i18n
      .use(initReactI18next)
      .init({
        resources,
        lng: language,
        fallbackLng: 'en',
        interpolation: { escapeValue: false },
      });
  } else {
    i18n.changeLanguage(language);
  }
};

export default i18n;
