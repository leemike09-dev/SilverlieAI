import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations, Language } from './translations';

type LanguageContextType = {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: typeof translations['ko'];
};

const LanguageContext = createContext<LanguageContextType>({
  language: 'ko',
  setLanguage: () => {},
  t: translations['ko'],
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('ko');

  useEffect(() => {
    AsyncStorage.getItem('app_language').then(v => {
      if (v && (v === 'ko' || v === 'zh' || v === 'en' || v === 'ja')) {
        setLanguageState(v as Language);
      }
    });
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    AsyncStorage.setItem('app_language', lang);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t: translations[language] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
