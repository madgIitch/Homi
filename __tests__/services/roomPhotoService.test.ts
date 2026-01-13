import AsyncStorage from '@react-native-async-storage/async-storage';
import { mockFetchJson, mockFetchResponse } from './testUtils';
import { roomPhotoService } from '../../src/services/roomPhotoService';

describe('roomPhotoService', () => {
  it('throws if token missing', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    await expect(
      roomPhotoService.uploadPhoto('room1', 'file://photo.jpg')
    ).rejects.toThrow('No se encontro el token de autenticacion');
  });

  it('uploads photo and returns data', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('token');
    mockFetchJson({
      data: { path: 'room1/photos/1.jpg', signedUrl: 'https://url' },
    });
    const result = await roomPhotoService.uploadPhoto(
      'room1',
      'file://photo.jpg'
    );
    expect(result.path).toBe('room1/photos/1.jpg');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('throws on api error', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('token');
    mockFetchResponse({
      ok: false,
      status: 400,
      json: { error: 'bad' },
    });
    await expect(
      roomPhotoService.uploadPhoto('room1', 'file://photo.jpg')
    ).rejects.toThrow('bad');
  });
});
