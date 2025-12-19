import { API_CONFIG } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { RoomExtras } from '../types/room';

interface RoomExtrasResponse {
  data: RoomExtras[];
}

interface SingleRoomExtrasResponse {
  data: RoomExtras;
}

class RoomExtrasService {
  private async getAuthHeaders(): Promise<HeadersInit> {
    const token = await AsyncStorage.getItem('authToken');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  async getExtras(roomId: string): Promise<RoomExtras | null> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(
      `${API_CONFIG.FUNCTIONS_URL}/room-extras?room_id=${roomId}`,
      {
        method: 'GET',
        headers,
      }
    );

    if (!response.ok) {
      throw new Error('Error al obtener extras de habitacion');
    }

    const data: RoomExtrasResponse = await response.json();
    return data.data?.[0] ?? null;
  }

  async getExtrasForRooms(roomIds: string[]): Promise<RoomExtras[]> {
    if (roomIds.length === 0) return [];
    const headers = await this.getAuthHeaders();
    const response = await fetch(
      `${API_CONFIG.FUNCTIONS_URL}/room-extras?room_ids=${roomIds.join(',')}`,
      {
        method: 'GET',
        headers,
      }
    );

    if (!response.ok) {
      throw new Error('Error al obtener extras de habitaciones');
    }

    const data: RoomExtrasResponse = await response.json();
    return data.data ?? [];
  }

  async upsertExtras(payload: {
    room_id: string;
    category?: string | null;
    room_type?: string | null;
    common_area_type?: string | null;
    common_area_custom?: string | null;
    photos: string[];
  }): Promise<RoomExtras> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${API_CONFIG.FUNCTIONS_URL}/room-extras`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error('Error al guardar extras de habitacion');
    }

    const data: SingleRoomExtrasResponse = await response.json();
    return data.data;
  }
}

export const roomExtrasService = new RoomExtrasService();
