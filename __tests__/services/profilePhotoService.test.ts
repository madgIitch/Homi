import AsyncStorage from '@react-native-async-storage/async-storage';
import { mockFetchJson, mockFetchResponse, mockFetchText } from './testUtils';
import { profilePhotoService } from '../../src/services/profilePhotoService';

describe('profilePhotoService', () => {
  beforeEach(() => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('token');
  });

  it('gets photos list', async () => {
    mockFetchJson({ data: [{ id: 'p1' }] });
    const photos = await profilePhotoService.getPhotos();
    expect(photos.length).toBe(1);
  });

  it('throws if token missing on upload', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    await expect(
      profilePhotoService.uploadPhoto('file://photo.jpg')
    ).rejects.toThrow('No auth token found');
  });

  it('throws on delete error', async () => {
    mockFetchText('bad', 500);
    await expect(profilePhotoService.deletePhoto('p1')).rejects.toThrow('bad');
  });
});
