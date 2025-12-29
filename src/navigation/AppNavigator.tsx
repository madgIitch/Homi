// src/navigation/AppNavigator.tsx    
import React, { useContext, useEffect, useRef } from 'react';    
import { View, Text, StyleSheet, Linking } from 'react-native';    
import { NavigationContainer } from '@react-navigation/native';    
import { createStackNavigator } from '@react-navigation/stack';    
import { AuthContext } from '../context/AuthContext';    
import { LoginScreen } from '../screens/LoginScreen';    
import { RegisterScreen } from '../screens/RegisterScreen';    
import { ForgotPasswordScreen } from '../screens/ForgotPasswordScreen';
import { ResetPasswordScreen } from '../screens/ResetPasswordScreen';
import { MainNavigator } from './MainNavigator';    
import { ProfileDetailScreen } from '../screens/ProfileDetailScreen';    
import { EditProfileScreen } from '../screens/EditProfileScreen';    
import { FiltersScreen } from '../screens/FiltersScreen';
import { ChatScreen } from '../screens/ChatScreen';
import { RoomManagementScreen } from '../screens/RoomManagementScreen';
import { RoomEditScreen } from '../screens/RoomEditScreen';
import { RoomInterestsScreen } from '../screens/RoomInterestsScreen';
import { RulesManagementScreen } from '../screens/RulesManagementScreen';
import { ServicesManagementScreen } from '../screens/ServicesManagementScreen';
import { CreateFlatScreen } from '../screens/CreateFlatScreen';
import { RoomDetailScreen } from '../screens/RoomDetailScreen';
import { FlatExpensesScreen } from '../screens/FlatExpensesScreen';
import { FlatSettlementScreen } from '../screens/FlatSettlementScreen';
import { useTheme } from '../theme/ThemeContext';    
import { authService } from '../services/authService';
import { notificationService } from '../services/notificationService';
import { navigationRef } from './navigationRef';
    
const Stack = createStackNavigator();    
    
// Simple loading screen component    
const LoadingScreen: React.FC = () => {    
  const theme = useTheme();    
  return (    
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>    
      <Text style={[styles.loadingText, { color: theme.colors.text }]}>    
        HomiMatch    
      </Text>    
    </View>    
  );    
};    
    
export const AppNavigator: React.FC = () => {    
  const authContext = useContext(AuthContext);    
  const pendingRecoveryRef = useRef(false);
      
  // Ensure context exists    
  if (!authContext) {    
    throw new Error('AppNavigator must be used within AuthProvider');    
  }    
      
  const { isAuthenticated, loading } = authContext;    
    
  useEffect(() => {
    const handleUrl = async (url: string) => {
      let shouldNavigate = false;
      try {
        const parsedUrl = new URL(url);
        const hashParams = new URLSearchParams(
          parsedUrl.hash ? parsedUrl.hash.slice(1) : ''
        );
        const type =
          hashParams.get('type') || parsedUrl.searchParams.get('type');
        const accessToken =
          hashParams.get('access_token') ||
          parsedUrl.searchParams.get('access_token');
        const code = hashParams.get('code') || parsedUrl.searchParams.get('code');
        const isRecovery =
          type === 'recovery' || !!accessToken || !!code;

        const isResetHost = parsedUrl.host === 'reset-password';
        const isResetPath = parsedUrl.pathname.includes('reset-password');
        shouldNavigate = isRecovery && (isResetHost || isResetPath);
      } catch (error) {
        console.error('[AppNavigator.handleUrl] invalid url:', error);
      }

      if (shouldNavigate) {
        if (navigationRef.isReady()) {
          navigationRef.navigate('ResetPassword');
        } else {
          pendingRecoveryRef.current = true;
        }
      }

      await authService.handleRecoveryLink(url);
    };

    const init = async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        await handleUrl(initialUrl);
      }
    };

    init();

    const subscription = Linking.addEventListener('url', ({ url }) => {
      void handleUrl(url);
    });

    return () => {
      subscription.remove();
    };
  }, [navigationRef]);

  useEffect(() => {
    if (loading || !navigationRef.isReady()) {
      return;
    }
    const currentRoute = navigationRef.getCurrentRoute()?.name;

    if (isAuthenticated) {
      if (currentRoute !== 'Main') {
        navigationRef.reset({
          index: 0,
          routes: [{ name: 'Main' }],
        });
      }
      return;
    }

    if (currentRoute === 'ResetPassword') {
      return;
    }

    if (currentRoute !== 'Login') {
      navigationRef.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    }
  }, [isAuthenticated, loading, navigationRef]);

  useEffect(() => {
    if (!isAuthenticated || !navigationRef.isReady()) {
      return;
    }

    void notificationService.consumePendingNavigation();
  }, [isAuthenticated, navigationRef]);

  if (loading) {    
    return <LoadingScreen />;    
  }    
    
  return (    
    <NavigationContainer
      ref={navigationRef}
      linking={{
        prefixes: ['homimatch://', 'https://homimatch.app'],
        config: {
          screens: {
            ResetPassword: 'reset-password',
          },
        },
      }}
      onReady={() => {
        if (pendingRecoveryRef.current) {
          pendingRecoveryRef.current = false;
          navigationRef.navigate('ResetPassword');
        }
        if (isAuthenticated) {
          void notificationService.consumePendingNavigation();
        }
      }}
    >    
      <Stack.Navigator
        screenOptions={{ headerShown: false }}
        initialRouteName={isAuthenticated ? 'Main' : 'Login'}
      >    
        <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />    
        <Stack.Screen name="Register" component={RegisterScreen} />    
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        {isAuthenticated ? (    
          <>    
            <Stack.Screen name="Main" component={MainNavigator} />    
            <Stack.Screen name="ProfileDetail" component={ProfileDetailScreen} />    
            <Stack.Screen name="EditProfile" component={EditProfileScreen} />    
            <Stack.Screen name="Filters" component={FiltersScreen} />
            <Stack.Screen name="Chat" component={ChatScreen} />
            <Stack.Screen name="RoomManagement" component={RoomManagementScreen} />
            <Stack.Screen name="RoomEdit" component={RoomEditScreen} />
            <Stack.Screen name="RoomInterests" component={RoomInterestsScreen} />
            <Stack.Screen name="RulesManagement" component={RulesManagementScreen} />
            <Stack.Screen name="ServicesManagement" component={ServicesManagementScreen} />
            <Stack.Screen name="CreateFlat" component={CreateFlatScreen} />
            <Stack.Screen name="RoomDetail" component={RoomDetailScreen} />
            <Stack.Screen name="FlatExpenses" component={FlatExpensesScreen} />
            <Stack.Screen name="FlatSettlement" component={FlatSettlementScreen} />
          </>    
        ) : null}    
      </Stack.Navigator>    
    </NavigationContainer>    
  );    
};    
    
const styles = StyleSheet.create({    
  container: {    
    flex: 1,    
    justifyContent: 'center',    
    alignItems: 'center',    
  },    
  loadingText: {    
    fontSize: 24,    
    fontWeight: 'bold',    
  },    
});

