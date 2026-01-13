import AsyncStorage from '@react-native-async-storage/async-storage';
import { mockFetchJson, mockFetchResponse } from './testUtils';
import { roomExtrasService } from '../../src/services/roomExtrasService';

describe('roomExtrasService', () => {
  beforeEach(() => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('token');
  });

  it('returns null when extras empty', async () => {
    mockFetchJson({ data: [] });
    const result = await roomExtrasService.getExtras('room1');
    expect(result).toBeNull();
  });

  it('returns empty list for empty roomIds', async () => {
    const result = await roomExtrasService.getExtrasForRooms([]);
    expect(result).toEqual([]);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('throws on upsert error', async () => {
    mockFetchResponse({ ok: false, status: 500, json: {} });
    await expect(
      roomExtrasService.upsertExtras({
        room_id: 'room1',
        photos: [],
      })
    ).rejects.toThrow('Error al guardar extras de habitacion');
  });
});
