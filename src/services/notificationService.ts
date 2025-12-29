// src/services/notificationService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance, AndroidStyle, EventType } from '@notifee/react-native';
import { chatService } from './chatService';
import { navigationRef } from '../navigation/navigationRef';

const ANDROID_CHANNEL_ID = 'messages';
const PENDING_CHAT_ID_KEY = 'pendingChatId';
const PENDING_NOTIFICATION_KEY = 'pendingNotification';

const ensureAndroidChannel = async () => {
  await notifee.createChannel({
    id: ANDROID_CHANNEL_ID,
    name: 'Messages',
    importance: AndroidImportance.HIGH,
  });
};

const openChatFromData = async (data?: Record<string, string>) => {
  const chatId = data?.chat_id;
  if (!chatId) return;

  if (!navigationRef.isReady()) {
    await AsyncStorage.setItem(PENDING_CHAT_ID_KEY, chatId);
    return;
  }

  const route = navigationRef.getCurrentRoute();
  if (route?.name === 'Chat') {
    const params = route.params as { chatId?: string } | undefined;
    if (params?.chatId === chatId) {
      return;
    }
  }

  const chat = await chatService.getChatDetails(chatId);
  if (!chat) return;

  navigationRef.navigate('Chat', {
    chatId: chat.id,
    name: chat.name,
    avatarUrl: chat.avatarUrl,
    profile: chat.profile,
  });
};

const openMatchFromData = async (data?: Record<string, string>) => {
  const matchId = data?.match_id;
  if (!matchId) return;

  if (!navigationRef.isReady()) {
    await AsyncStorage.setItem(
      PENDING_NOTIFICATION_KEY,
      JSON.stringify({ type: 'match', matchId })
    );
    return;
  }

  navigationRef.navigate('Main', { screen: 'Matches' });
};

const openFlatExpenses = async () => {
  if (!navigationRef.isReady()) {
    await AsyncStorage.setItem(
      PENDING_NOTIFICATION_KEY,
      JSON.stringify({ type: 'flat_expense' })
    );
    return;
  }
  navigationRef.navigate('FlatExpenses');
};

const openFlatSettlements = async () => {
  if (!navigationRef.isReady()) {
    await AsyncStorage.setItem(
      PENDING_NOTIFICATION_KEY,
      JSON.stringify({ type: 'flat_settlement' })
    );
    return;
  }
  navigationRef.navigate('FlatSettlement');
};

const openChatFromMatchId = async (matchId?: string) => {
  if (!matchId) return;

  if (!navigationRef.isReady()) {
    await AsyncStorage.setItem(
      PENDING_NOTIFICATION_KEY,
      JSON.stringify({ type: 'room_assignment', matchId })
    );
    return;
  }

  const chat = await chatService.getChatByMatchId(matchId);
  if (!chat) {
    navigationRef.navigate('Main', { screen: 'Matches' });
    return;
  }

  navigationRef.navigate('Chat', {
    chatId: chat.id,
    name: chat.name,
    avatarUrl: chat.avatarUrl,
    profile: chat.profile,
  });
};

const openFromData = async (data?: Record<string, string>) => {
  const type = data?.type;
  if (type === 'match_status') {
    await openMatchFromData(data);
    return;
  }
  if (type === 'room_assignment') {
    await openChatFromMatchId(data?.match_id);
    return;
  }
  if (type === 'flat_expense') {
    await openFlatExpenses();
    return;
  }
  if (type === 'flat_settlement') {
    await openFlatSettlements();
    return;
  }
  await openChatFromData(data);
};

const shouldSuppressForeground = (chatId?: string) => {
  if (!chatId || !navigationRef.isReady()) {
    return false;
  }
  const route = navigationRef.getCurrentRoute();
  if (route?.name !== 'Chat') {
    return false;
  }
  const params = route.params as { chatId?: string } | undefined;
  return params?.chatId === chatId;
};

export const notificationService = {
  async initForegroundHandler(): Promise<() => void> {
    await notifee.requestPermission();
    await ensureAndroidChannel();

    const unsubscribe = messaging().onMessage(async (remoteMessage) => {
      if (shouldSuppressForeground(remoteMessage.data?.chat_id)) {
        return;
      }

      const title =
        remoteMessage.data?.sender_name ??
        remoteMessage.notification?.title ??
        'Nuevo mensaje';
      const body =
        remoteMessage.data?.message_body ??
        remoteMessage.notification?.body ??
        'Tienes un nuevo mensaje';
      const largeIcon = remoteMessage.data?.sender_avatar_url;

      await notifee.displayNotification({
        title,
        body,
        data: remoteMessage.data,
        android: {
          channelId: ANDROID_CHANNEL_ID,
          pressAction: { id: 'default' },
          largeIcon: largeIcon && largeIcon.length > 0 ? largeIcon : undefined,
          style: {
            type: AndroidStyle.BIGTEXT,
            text: body,
          },
        },
      });
    });

    return unsubscribe;
  },

  initNotificationOpener(): () => void {
    const unsubscribeOpen = messaging().onNotificationOpenedApp(
      async (remoteMessage) => {
        await openFromData(remoteMessage.data);
      }
    );

    const unsubscribeForeground = notifee.onForegroundEvent(async ({ type, detail }) => {
      if (type !== EventType.PRESS) {
        return;
      }
      await openFromData(detail.notification?.data as Record<string, string>);
    });

    void messaging()
      .getInitialNotification()
      .then(async (remoteMessage) => {
        if (remoteMessage) {
          await openFromData(remoteMessage.data);
        }
      })
      .catch((error) => {
        console.log('[notificationService.getInitialNotification] error:', error);
      });

    return () => {
      unsubscribeOpen();
      unsubscribeForeground();
    };
  },

  async consumePendingChatNavigation(): Promise<void> {
    const chatId = await AsyncStorage.getItem(PENDING_CHAT_ID_KEY);
    if (!chatId) return;
    await AsyncStorage.removeItem(PENDING_CHAT_ID_KEY);
    await openChatFromData({ chat_id: chatId });
  },

  async consumePendingMatchNavigation(): Promise<void> {
    const pending = await AsyncStorage.getItem(PENDING_NOTIFICATION_KEY);
    if (!pending) return;
    await AsyncStorage.removeItem(PENDING_NOTIFICATION_KEY);
    try {
      const parsed = JSON.parse(pending) as {
        type?: string;
        matchId?: string;
      };
      if (parsed.type === 'match' && parsed.matchId) {
        await openMatchFromData({ match_id: parsed.matchId });
      }
      if (parsed.type === 'room_assignment' && parsed.matchId) {
        await openChatFromMatchId(parsed.matchId);
      }
      if (parsed.type === 'flat_expense') {
        await openFlatExpenses();
      }
      if (parsed.type === 'flat_settlement') {
        await openFlatSettlements();
      }
    } catch (error) {
      console.log('[notificationService.consumePendingMatchNavigation] error:', error);
    }
  },

  async consumePendingNavigation(): Promise<void> {
    await this.consumePendingChatNavigation();
    await this.consumePendingMatchNavigation();
  },
};
