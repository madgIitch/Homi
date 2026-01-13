import { mockFetchJson, mockFetchResponse } from './testUtils';
import { locationService } from '../../src/services/locationService';

describe('locationService', () => {
  it('builds query for top cities', async () => {
    mockFetchJson({ data: [] });
    await locationService.getCities({ top: true });
    const url = (global.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(url).toContain('top=1');
  });

  it('returns null when city not found', async () => {
    mockFetchJson({ data: [] });
    const result = await locationService.getCityById('c1');
    expect(result).toBeNull();
  });

  it('tracks place searches only when ids provided', async () => {
    await locationService.trackPlaceSearches('c1', []);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
