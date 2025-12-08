// src/theme/ThemeContext.tsx  
import React, { createContext, useContext } from 'react';  
import { theme, Theme } from './index';  
  
const ThemeContext = createContext<Theme>(theme);  
  
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {  
  return (  
    <ThemeContext.Provider value={theme}>  
      {children}  
    </ThemeContext.Provider>  
  );  
};  
  
export const useTheme = (): Theme => {  
  const context = useContext(ThemeContext);  
  if (!context) {  
    throw new Error('useTheme debe ser usado dentro de ThemeProvider');  
  }  
  return context;  
};