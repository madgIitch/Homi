// src/services/pushTokenService.ts
import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { supabaseClient } from './authService';

const PUSH_TOKEN_KEY = 'pushToken';
const PROVIDER = 'fcm';
const PLATFORM = Platform.OS === 'ios' ? 'ios' : 'android';

type RegisterResult =
  | { status: 'registered'; token: string }
  | { status: 'denied' }
  | { status: 'error'; error: unknown };

const upsertPushToken = async (userId: string, token: string) => {
  const { error } = await supabaseClient.from('push_tokens').upsert(
    {
      user_id: userId,
      token,
      provider: PROVIDER,
      platform: PLATFORM,
      last_used_at: new Date().toISOString(),
    },
    { onConflict: 'token' }
  );

  if (error) {
    throw error;
  }
};

const deletePushToken = async (userId: string, token: string) => {
  const { error } = await supabaseClient
    .from('push_tokens')
    .delete()
    .eq('user_id', userId)
    .eq('token', token);

  if (error) {
    throw error;
  }
};

export const pushTokenService = {
  async register(userId: string): Promise<RegisterResult> {
    try {
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (!enabled) {
        return { status: 'denied' };
      }

      await messaging().registerDeviceForRemoteMessages();
      const token = await messaging().getToken();

      await upsertPushToken(userId, token);
      await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);

      return { status: 'registered', token };
    } catch (error) {
      console.log('[pushTokenService.register] error:', error);
      return { status: 'error', error };
    }
  },

  onTokenRefresh(userId: string) {
    return messaging().onTokenRefresh(async (token) => {
      try {
        await upsertPushToken(userId, token);
        await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
      } catch (error) {
        console.log('[pushTokenService.onTokenRefresh] error:', error);
      }
    });
  },

  async unregister(userId: string): Promise<void> {
    const token = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
    if (!token) {
      return;
    }

    try {
      await deletePushToken(userId, token);
    } catch (error) {
      console.log('[pushTokenService.unregister] error:', error);
    } finally {
      await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
    }
  },
};
