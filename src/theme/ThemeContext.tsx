// src/theme/ThemeContext.tsx  
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { darkTheme, theme, Theme } from './index';  
  
type ThemeContextValue = {  
  theme: Theme;  
  isDark: boolean;  
  toggleTheme: () => void;  
};  
  
const ThemeContext = createContext<ThemeContextValue>({  
  theme,  
  isDark: false,  
  toggleTheme: () => undefined,  
});  

const THEME_STORAGE_KEY = 'theme:isDark';
  
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {  
  const [isDark, setIsDark] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isMounted = true;
    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((value) => {
        if (!isMounted || value == null) return;
        setIsDark(value === '1');
      })
      .catch(() => undefined)
      .finally(() => {
        if (isMounted) {
          setIsReady(true);
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isReady) return;
    AsyncStorage.setItem(THEME_STORAGE_KEY, isDark ? '1' : '0').catch(
      () => undefined
    );
  }, [isDark, isReady]);
  const value = useMemo(  
    () => ({  
      theme: isDark ? darkTheme : theme,  
      isDark,  
      toggleTheme: () => setIsDark((prev) => !prev),  
    }),  
    [isDark]  
  );  
  
  return (  
    <ThemeContext.Provider value={value}>  
      {children}  
    </ThemeContext.Provider>  
  );  
};  
  
export const useTheme = (): Theme => {  
  const context = useContext(ThemeContext);  
  return context.theme;  
};  
  
export const useThemeController = (): { isDark: boolean; toggleTheme: () => void } => {  
  const context = useContext(ThemeContext);  
  return { isDark: context.isDark, toggleTheme: context.toggleTheme };  
};
