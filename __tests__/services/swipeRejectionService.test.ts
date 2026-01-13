import AsyncStorage from '@react-native-async-storage/async-storage';
import { mockFetchJson, mockFetchResponse } from './testUtils';

jest.mock('../../src/services/authService', () => ({
  authService: {
    refreshToken: jest.fn(),
  },
}));

import { authService } from '../../src/services/authService';
import { swipeRejectionService } from '../../src/services/swipeRejectionService';

describe('swipeRejectionService', () => {
  beforeEach(() => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('token');
  });

  it('maps rejections payload', async () => {
    mockFetchJson({
      data: [
        {
          id: 'r1',
          user_id: 'u1',
          rejected_profile_id: 'u2',
          created_at: '2024-01-01',
        },
      ],
    });

    const data = await swipeRejectionService.getRejections();
    expect(data[0]).toEqual({
      id: 'r1',
      userId: 'u1',
      rejectedProfileId: 'u2',
      createdAt: '2024-01-01',
    });
  });

  it('retries on 401', async () => {
    mockFetchResponse({ ok: false, status: 401, text: 'unauthorized' });
    mockFetchJson({ data: [] });
    (authService.refreshToken as jest.Mock).mockResolvedValue('new-token');

    await swipeRejectionService.getRejections();
    expect(authService.refreshToken).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('ignores conflict on createRejection', async () => {
    mockFetchResponse({ ok: false, status: 409, text: 'conflict' });
    await expect(
      swipeRejectionService.createRejection('u2')
    ).resolves.toBeUndefined();
  });
});
