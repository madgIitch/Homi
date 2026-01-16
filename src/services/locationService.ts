import { API_CONFIG } from '../config/api';

export type CityResult = {
  id: string;
  name: string;
};

export type PlaceResult = {
  id: string;
  city_id: string;
  city_name?: string | null;
  name: string;
  place: string;
};

type PlacesQuery = {
  query?: string;
  place?: string;
  top?: boolean;
  limit?: number;
  offset?: number;
};

class LocationService {
  private buildUrl(path: string, params: Record<string, string>) {
    const url = new URL(`${API_CONFIG.FUNCTIONS_URL}/locations${path}`);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== '') (url.searchParams as any).set?.(key, value);
    });
    return url.toString();
  }

  private getHeaders() {
    return {
      apikey: API_CONFIG.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${API_CONFIG.SUPABASE_ANON_KEY}`,
    };
  }

  async getCities(params: { query?: string; top?: boolean; limit?: number }) {
    const query = params.query?.trim() ?? '';
    const searchParams: Record<string, string> = {};

    if (query) {
      searchParams.q = query;
      searchParams.limit = String(params.limit ?? 50);
    } else if (params.top) {
      searchParams.top = '1';
      searchParams.limit = String(params.limit ?? 20);
    }

    const url = this.buildUrl('/cities', searchParams);
    const response = await fetch(url, { headers: this.getHeaders() });
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(
        `Error cargando ciudades (${response.status}): ${detail || 'sin detalle'}`
      );
    }
    const data = await response.json();
    return (data?.data ?? []) as CityResult[];
  }

  async getCityById(id: string) {
    const url = this.buildUrl('/cities', { id, limit: '1' });
    const response = await fetch(url, { headers: this.getHeaders() });
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(
        `Error cargando ciudad (${response.status}): ${detail || 'sin detalle'}`
      );
    }
    const data = await response.json();
    const result = (data?.data ?? []) as CityResult[];
    return result[0] ?? null;
  }

  async getPlaces(cityId: string, params: PlacesQuery) {
    const searchParams: Record<string, string> = {};
    if (params.query) searchParams.q = params.query;
    if (params.place) searchParams.place = params.place;
    if (params.top) searchParams.top = '1';
    if (params.limit) searchParams.limit = String(params.limit);
    if (params.offset) searchParams.offset = String(params.offset);

    const url = this.buildUrl(
      `/cities/${encodeURIComponent(cityId)}`,
      searchParams
    );
    const response = await fetch(url, { headers: this.getHeaders() });
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(
        `Error cargando zonas (${response.status}): ${detail || 'sin detalle'}`
      );
    }
    const data = await response.json();
    return (data?.data ?? []) as PlaceResult[];
  }

  async getPlaceById(placeId: string) {
    const url = this.buildUrl(`/places/${encodeURIComponent(placeId)}`, {});
    const response = await fetch(url, { headers: this.getHeaders() });
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(
        `Error cargando zona (${response.status}): ${detail || 'sin detalle'}`
      );
    }
    const data = await response.json();
    return (data?.data ?? null) as PlaceResult | null;
  }

  async trackPlaceSearches(cityId: string, placeIds: string[]) {
    if (!cityId || placeIds.length === 0) return;
    const url = this.buildUrl('/places/track', {});
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...this.getHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ city_id: cityId, place_ids: placeIds }),
    });
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(
        `Error guardando contadores (${response.status}): ${detail || 'sin detalle'}`
      );
    }
  }

  async trackCitySearch(cityId: string) {
    if (!cityId) return;
    const url = this.buildUrl('/cities/track', {});
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...this.getHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ city_id: cityId }),
    });
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(
        `Error guardando contador de ciudad (${response.status}): ${detail || 'sin detalle'}`
      );
    }
  }
}

export const locationService = new LocationService();
