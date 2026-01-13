// src/navigation/AppNavigator.tsx    
import React, { useContext, useEffect, useRef, useState } from 'react';    
import { View, Text, StyleSheet, Linking } from 'react-native';    
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';    
import { createStackNavigator } from '@react-navigation/stack';    
import { AuthContext } from '../context/AuthContext';    
import { LoginScreen } from '../screens/LoginScreen';    
import { RegisterScreen } from '../screens/RegisterScreen';    
import { ForgotPasswordScreen } from '../screens/ForgotPasswordScreen';
import { ResetPasswordScreen } from '../screens/ResetPasswordScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
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
import { EditFlatScreen } from '../screens/EditFlatScreen';
import { RoomDetailScreen } from '../screens/RoomDetailScreen';
import { FlatExpensesScreen } from '../screens/FlatExpensesScreen';
import { FlatSettlementScreen } from '../screens/FlatSettlementScreen';
import { useTheme } from '../theme/ThemeContext';    
import { authService } from '../services/authService';
import { notificationService } from '../services/notificationService';
import { profileService } from '../services/profileService';
import { roomAssignmentService } from '../services/roomAssignmentService';
import { roomService } from '../services/roomService';
import { navigationRef } from './navigationRef';
    
const Stack = createStackNavigator();    
const POST_INVITE_PREVIEW_KEY = 'postInvitePreview';
const ONBOARDING_COMPLETED_KEY = 'onboardingCompleted';
const FORCE_ONBOARDING_KEY = 'forceOnboarding';
    
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
  const [needsOnboarding, setNeedsOnboarding] = useState<boolean | null>(null);
  const invitePreviewHandledRef = useRef(false);
      
  // Ensure context exists    
  if (!authContext) {    
    throw new Error('AppNavigator must be used within AuthProvider');    
  }    
      
  const { isAuthenticated, loading } = authContext;    

  useEffect(() => {
    let isActive = true;
    if (!isAuthenticated) {
      setNeedsOnboarding(null);
      return () => {
        isActive = false;
      };
    }

    const checkProfile = async () => {
      try {
        const forced = await AsyncStorage.getItem(FORCE_ONBOARDING_KEY);
        if (forced === '1') {
          if (isActive) {
            setNeedsOnboarding(true);
          }
          return;
        }
        const onboardingStatus = await AsyncStorage.getItem(
          ONBOARDING_COMPLETED_KEY
        );
        console.log(
          '[AppNavigator] onboardingCompleted:',
          onboardingStatus ?? 'null'
        );
        if (onboardingStatus === '1') {
          if (isActive) {
            setNeedsOnboarding(false);
          }
          return;
        }
        if (onboardingStatus === '0') {
          if (isActive) {
            setNeedsOnboarding(true);
          }
          return;
        }

        const profile = await profileService.getProfile();
        if (isActive) {
          if (profile) {
            await AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, '1');
            setNeedsOnboarding(false);
          } else {
            setNeedsOnboarding(true);
          }
        }
      } catch (error) {
        console.warn('[AppNavigator] Error checking onboarding state:', error);
        if (isActive) {
          setNeedsOnboarding(false);
        }
      }
    };

    checkProfile();

    return () => {
      isActive = false;
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || needsOnboarding || !navigationRef.isReady()) {
      return;
    }
    if (invitePreviewHandledRef.current) {
      return;
    }

    const showInvitePreview = async () => {
      invitePreviewHandledRef.current = true;
      try {
        const shouldShow = await AsyncStorage.getItem(POST_INVITE_PREVIEW_KEY);
        if (!shouldShow) return;
        const assignmentsResponse =
          await roomAssignmentService.getAssignmentsForAssignee();
        const accepted =
          assignmentsResponse.assignments.find(
            (assignment) => assignment.status === 'accepted'
          ) ?? assignmentsResponse.match_assignment;
        const assignment =
          accepted && accepted.status === 'accepted' ? accepted : null;
        if (!assignment?.room_id) return;
        let room = assignment.room ?? null;
        if (!room) {
          room = await roomService.getRoomById(assignment.room_id);
        }
        if (!room) return;
        await AsyncStorage.removeItem(POST_INVITE_PREVIEW_KEY);
        navigationRef.navigate('RoomDetail', { room, flat: room.flat ?? null });
      } catch (error) {
        console.warn('[AppNavigator] Error showing invite preview:', error);
      }
    };

    void showInvitePreview();
  }, [isAuthenticated, needsOnboarding, navigationRef]);
    
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
    if (!navigationRef.isReady() || loading) {
      return;
    }
    if (isAuthenticated || needsOnboarding === null) {
      return;
    }
    const currentRoute = navigationRef.getCurrentRoute()?.name;
    if (currentRoute === 'ResetPassword') {
      return;
    }
    if (currentRoute !== 'Login') {
      navigationRef.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    }
  }, [isAuthenticated, loading, navigationRef, needsOnboarding]);

  useEffect(() => {
    if (!isAuthenticated || !navigationRef.isReady() || needsOnboarding) {
      return;
    }

    void notificationService.consumePendingNavigation();
  }, [isAuthenticated, navigationRef, needsOnboarding]);

  if (loading || (isAuthenticated && needsOnboarding === null)) {    
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
        if (isAuthenticated && !needsOnboarding) {
          void notificationService.consumePendingNavigation();
        }
      }}
    >    
      <Stack.Navigator
        key={
          isAuthenticated
            ? needsOnboarding
              ? 'onboarding'
              : 'main'
            : 'auth'
        }
        screenOptions={{ headerShown: false }}
        initialRouteName={
          isAuthenticated
            ? needsOnboarding
              ? 'Onboarding'
              : 'Main'
            : 'Login'
        }
      >    
        <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />    
        <Stack.Screen name="Register" component={RegisterScreen} />    
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        {isAuthenticated ? (    
          <>    
            <Stack.Screen name="Onboarding">
              {() => (
                <OnboardingScreen
                  onComplete={() => setNeedsOnboarding(false)}
                />
              )}
            </Stack.Screen>
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
            <Stack.Screen name="EditFlat" component={EditFlatScreen} />
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
