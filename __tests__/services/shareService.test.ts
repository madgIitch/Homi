import AsyncStorage from '@react-native-async-storage/async-storage';
import { mockFetchResponse } from './testUtils';

jest.mock('../../src/services/authService', () => ({
  authService: {
    refreshToken: jest.fn(),
  },
}));

import { authService } from '../../src/services/authService';
import { shareService } from '../../src/services/shareService';

describe('shareService', () => {
  beforeEach(() => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('token');
  });

  it('retries on 401 and returns arrayBuffer', async () => {
    mockFetchResponse({ ok: false, status: 401, text: 'unauthorized' });
    const buffer = new ArrayBuffer(4);
    mockFetchResponse({ ok: true, status: 200, arrayBuffer: buffer });
    (authService.refreshToken as jest.Mock).mockResolvedValue('new-token');

    const result = await shareService.getProfileShareImage();
    expect(result.byteLength).toBe(4);
    expect(authService.refreshToken).toHaveBeenCalledTimes(1);
  });
});
