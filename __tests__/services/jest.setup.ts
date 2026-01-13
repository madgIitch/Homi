import AsyncStorage from '@react-native-async-storage/async-storage';

const fetchMock = jest.fn();
global.fetch = fetchMock as any;

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock('@react-native-firebase/messaging', () => {
  const instance = {
    requestPermission: jest.fn(),
    registerDeviceForRemoteMessages: jest.fn(),
    getToken: jest.fn(),
    onTokenRefresh: jest.fn(),
    onMessage: jest.fn(),
    onNotificationOpenedApp: jest.fn(),
    getInitialNotification: jest.fn().mockResolvedValue(null),
  };
  const mock = jest.fn(() => instance);
  mock.AuthorizationStatus = { AUTHORIZED: 1, PROVISIONAL: 2 };
  return mock;
});

jest.mock('@notifee/react-native', () => ({
  AndroidImportance: { HIGH: 4 },
  AndroidStyle: { BIGTEXT: 1 },
  EventType: { PRESS: 1 },
  requestPermission: jest.fn(),
  createChannel: jest.fn(),
  displayNotification: jest.fn(),
  onForegroundEvent: jest.fn(),
}));

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    hasPlayServices: jest.fn(),
    signIn: jest.fn(),
  },
}));

jest.mock('react-native-fs', () => ({
  PicturesDirectoryPath: '/tmp/pictures',
  DocumentDirectoryPath: '/tmp/documents',
  mkdir: jest.fn(),
  writeFile: jest.fn(),
  scanFile: jest.fn(),
}));

jest.mock('react-native', () => ({
  Platform: {
    OS: 'android',
    select: (options: Record<string, any>) =>
      options.android ?? options.default,
  },
}));

afterEach(() => {
  fetchMock.mockReset();
  (AsyncStorage.getItem as jest.Mock).mockReset();
  (AsyncStorage.setItem as jest.Mock).mockReset();
  (AsyncStorage.removeItem as jest.Mock).mockReset();
});
