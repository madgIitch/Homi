import { API_CONFIG } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { RoomInvitation } from '../types/roomInvitation';

interface ApiResponse<T> {
  data?: T;
  error?: string;
}

class RoomInvitationService {
  private async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await AsyncStorage.getItem('authToken');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  async createInvitation(roomId: string): Promise<RoomInvitation> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${API_CONFIG.FUNCTIONS_URL}/room-invitations`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ room_id: roomId }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Error al crear invitacion');
    }

    const payload = (await response.json()) as ApiResponse<RoomInvitation>;
    if (!payload.data) {
      throw new Error('Respuesta invalida al crear invitacion');
    }

    return payload.data;
  }
}

export const roomInvitationService = new RoomInvitationService();
