import AsyncStorage from '@react-native-async-storage/async-storage';
import { mockFetchJson, mockFetchResponse } from './testUtils';
import { roomService } from '../../src/services/roomService';

describe('roomService', () => {
  beforeEach(() => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('token');
  });

  it('returns empty list when flatIds empty', async () => {
    const result = await roomService.getRoomsByFlatIds([]);
    expect(result).toEqual([]);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('throws on createRoom error', async () => {
    mockFetchResponse({
      ok: false,
      status: 400,
      json: { error: 'bad' },
    });
    await expect(roomService.createRoom({} as any)).rejects.toThrow('bad');
  });

  it('searchRooms returns paginated payload', async () => {
    mockFetchJson({
      data: [],
      count: 0,
      page: 1,
      per_page: 20,
      total_pages: 0,
    });
    const result = await roomService.searchRooms();
    expect(result.page).toBe(1);
  });
});
