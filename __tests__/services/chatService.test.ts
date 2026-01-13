import AsyncStorage from '@react-native-async-storage/async-storage';
import { mockFetchJson, mockFetchResponse } from './testUtils';

jest.mock('../../src/services/authService', () => ({
  authService: {
    refreshToken: jest.fn(),
  },
}));

import { chatService } from '../../src/services/chatService';

describe('chatService', () => {
  beforeEach(() => {
    (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
      if (key === 'authToken') return Promise.resolve('token');
      if (key === 'authUser') return Promise.resolve(JSON.stringify({ id: 'u1' }));
      return Promise.resolve(null);
    });
  });

  it('returns null on 404 for getChatByMatchId', async () => {
    mockFetchResponse({ ok: false, status: 404, text: 'not found' });
    await expect(chatService.getChatByMatchId('m1')).resolves.toBeNull();
  });

  it('maps messages with status for current user', async () => {
    mockFetchJson({
      data: [
        {
          id: 'msg1',
          chat_id: 'c1',
          sender_id: 'u1',
          body: 'hi',
          created_at: '2024-01-01T00:00:00Z',
          read_at: null,
        },
      ],
    });

    const messages = await chatService.getMessages('c1');
    expect(messages[0].isMine).toBe(true);
    expect(messages[0].status).toBe('sent');
  });
});
