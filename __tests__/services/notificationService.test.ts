import AsyncStorage from '@react-native-async-storage/async-storage';
import messaging from '@react-native-firebase/messaging';
import notifee from '@notifee/react-native';

jest.mock('../../src/services/chatService', () => ({
  chatService: {
    getChatDetails: jest.fn(),
    getChatByMatchId: jest.fn(),
  },
}));

jest.mock('../../src/navigation/navigationRef', () => ({
  navigationRef: {
    isReady: jest.fn().mockReturnValue(false),
    getCurrentRoute: jest.fn(),
    navigate: jest.fn(),
  },
}));

import { notificationService } from '../../src/services/notificationService';

describe('notificationService', () => {
  it('initForegroundHandler registers onMessage handler', async () => {
    const instance = messaging();
    const unsubscribe = jest.fn();
    (instance.onMessage as jest.Mock).mockReturnValue(unsubscribe);

    await notificationService.initForegroundHandler();
    expect(notifee.requestPermission).toHaveBeenCalled();
    expect(notifee.createChannel).toHaveBeenCalled();
  });

  it('initNotificationOpener returns unsubscribe function', () => {
    const instance = messaging();
    const unsubscribeOpen = jest.fn();
    (instance.onNotificationOpenedApp as jest.Mock).mockReturnValue(
      unsubscribeOpen
    );
    const unsubscribeForeground = jest.fn();
    (notifee.onForegroundEvent as jest.Mock).mockReturnValue(
      unsubscribeForeground
    );

    const unsubscribe = notificationService.initNotificationOpener();
    unsubscribe();

    expect(unsubscribeOpen).toHaveBeenCalled();
    expect(unsubscribeForeground).toHaveBeenCalled();
  });

  it('consumePendingChatNavigation clears pending key', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('chat1');
    await notificationService.consumePendingChatNavigation();
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('pendingChatId');
  });
});
