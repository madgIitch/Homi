import AsyncStorage from '@react-native-async-storage/async-storage';
import messaging from '@react-native-firebase/messaging';

const mockUpsert = jest.fn().mockResolvedValue({ error: null });
const mockDeleteChain = {
  eq: jest.fn(),
};
mockDeleteChain.eq
  .mockImplementationOnce(() => mockDeleteChain)
  .mockImplementationOnce(() => Promise.resolve({ error: null }));

jest.mock('../../src/services/authService', () => ({
  supabaseClient: {
    from: jest.fn(() => ({
      upsert: mockUpsert,
      delete: jest.fn(() => mockDeleteChain),
    })),
  },
}));

import { pushTokenService } from '../../src/services/pushTokenService';

describe('pushTokenService', () => {
  beforeEach(() => {
    mockUpsert.mockClear();
    mockDeleteChain.eq.mockClear();
    mockDeleteChain.eq
      .mockImplementationOnce(() => mockDeleteChain)
      .mockImplementationOnce(() => Promise.resolve({ error: null }));
  });

  it('register returns denied when permission not granted', async () => {
    const instance = messaging();
    (instance.requestPermission as jest.Mock).mockResolvedValue(0);

    const result = await pushTokenService.register('user1');
    expect(result.status).toBe('denied');
  });

  it('register stores token when authorized', async () => {
    const instance = messaging();
    (instance.requestPermission as jest.Mock).mockResolvedValue(
      (messaging as any).AuthorizationStatus.AUTHORIZED
    );
    (instance.registerDeviceForRemoteMessages as jest.Mock).mockResolvedValue(
      undefined
    );
    (instance.getToken as jest.Mock).mockResolvedValue('token-1');

    const result = await pushTokenService.register('user1');
    expect(result.status).toBe('registered');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('pushToken', 'token-1');
  });

  it('unregister removes cached token', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('token-1');
    await pushTokenService.unregister('user1');
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('pushToken');
  });
});
