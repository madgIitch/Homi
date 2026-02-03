/**
 * HomiMatch - App de búsqueda de compañeros de piso
 * @format
 */

// 👇 AÑADE ESTO COMO PRIMER IMPORT (justo después del comentario)
import 'react-native-url-polyfill/auto';

import React, { useEffect } from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  SafeAreaProvider,
} from 'react-native-safe-area-context';
import { ThemeProvider } from './src/theme/ThemeContext';
import { AuthProvider } from './src/context/AuthContext';
import { PremiumProvider } from './src/context/PremiumContext';
import { SwipeFiltersProvider } from './src/context/SwipeFiltersContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { configureGoogleSignIn } from './src/config/google';
import { notificationService } from './src/services/notificationService';

// Ejecutar configuración al iniciar
configureGoogleSignIn();

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  useEffect(() => {
    let unsubscribeForeground: (() => void) | undefined;
    let unsubscribeOpener: (() => void) | undefined;

    const init = async () => {
      unsubscribeForeground = await notificationService.initForegroundHandler();
      unsubscribeOpener = notificationService.initNotificationOpener();
    };

    init();

    return () => {
      if (unsubscribeForeground) {
        unsubscribeForeground();
      }
      if (unsubscribeOpener) {
        unsubscribeOpener();
      }
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar
          barStyle={isDarkMode ? 'light-content' : 'dark-content'}
          translucent
          backgroundColor="transparent"
        />
        <ThemeProvider>
          <AuthProvider>
            <PremiumProvider>
              <SwipeFiltersProvider>
                <AppNavigator />
              </SwipeFiltersProvider>
            </PremiumProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default App;
