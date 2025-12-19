/**
 * HomiMatch - App de búsqueda de compañeros de piso
 * @format
 */

// 👇 AÑADE ESTO COMO PRIMER IMPORT (justo después del comentario)
import 'react-native-url-polyfill/auto';

import React from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import {
  SafeAreaProvider,
} from 'react-native-safe-area-context';
import { ThemeProvider } from './src/theme/ThemeContext';
import { AuthProvider } from './src/context/AuthContext';
import { SwipeFiltersProvider } from './src/context/SwipeFiltersContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { configureGoogleSignIn } from './src/config/google';

// Ejecutar configuración al iniciar
configureGoogleSignIn();

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <ThemeProvider>
        <AuthProvider>
          <SwipeFiltersProvider>
            <AppNavigator />
          </SwipeFiltersProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

export default App;
