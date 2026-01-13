import AsyncStorage from '@react-native-async-storage/async-storage';
import { mockFetchJson, mockFetchResponse } from './testUtils';

jest.mock('../../src/services/authService', () => ({
  authService: {
    refreshToken: jest.fn(),
  },
}));

import { authService } from '../../src/services/authService';
import { profileService } from '../../src/services/profileService';

describe('profileService', () => {
  beforeEach(() => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('token');
  });

  it('returns null on 404', async () => {
    mockFetchResponse({ ok: false, status: 404, json: { error: 'not found' } });
    await expect(profileService.getProfile()).resolves.toBeNull();
  });

  it('retries on 401 and uses refreshToken', async () => {
    mockFetchResponse({ ok: false, status: 401, json: { error: 'expired' } });
    mockFetchJson({ data: { id: 'p1' } });
    (authService.refreshToken as jest.Mock).mockResolvedValue('new-token');

    const result = await profileService.getProfile();
    expect(authService.refreshToken).toHaveBeenCalledTimes(1);
    expect(result?.id).toBe('p1');
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('throws with api error on createProfile', async () => {
    mockFetchResponse({
      ok: false,
      status: 400,
      json: { error: 'invalid' },
    });

    await expect(
      profileService.createProfile({} as any)
    ).rejects.toThrow('invalid');
  });
});
