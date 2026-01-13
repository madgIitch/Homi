import AsyncStorage from '@react-native-async-storage/async-storage';
import { mockFetchJson, mockFetchResponse } from './testUtils';
import { interestService } from '../../src/services/interestService';

describe('interestService', () => {
  beforeEach(() => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('token');
  });

  it('returns received interests', async () => {
    mockFetchJson({ data: [{ id: 'i1' }] });
    const data = await interestService.getReceivedInterests();
    expect(data.length).toBe(1);
  });

  it('throws on getGivenInterests error', async () => {
    mockFetchResponse({ ok: false, status: 500, json: {} });
    await expect(interestService.getGivenInterests()).rejects.toThrow(
      'Error al obtener intereses'
    );
  });
});
