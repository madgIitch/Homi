import AsyncStorage from '@react-native-async-storage/async-storage';
import { mockFetchJson, mockFetchResponse, mockFetchText } from './testUtils';
import { matchService } from '../../src/services/matchService';

describe('matchService', () => {
  beforeEach(() => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('token');
  });

  it('returns null on 404', async () => {
    mockFetchResponse({ ok: false, status: 404, text: 'not found' });
    await expect(matchService.getMatch('m1')).resolves.toBeNull();
  });

  it('throws on non-ok response', async () => {
    mockFetchText('bad', 500);
    await expect(matchService.getMatch('m1')).rejects.toThrow('bad');
  });

  it('returns data on ok', async () => {
    mockFetchJson({ data: { id: 'm1', user_a_id: 'u1', user_b_id: 'u2' } });
    const match = await matchService.getMatch('m1');
    expect(match?.id).toBe('m1');
  });
});
