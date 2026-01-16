import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '../config/api';

type SwipeLimitResponse = {
  count: number;
  date: string;
};

type ApiResponse<T> = {
  data?: T;
  error?: string;
};

class SwipeLimitService {
  private async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await AsyncStorage.getItem('authToken');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  async getDailyCount(): Promise<SwipeLimitResponse> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${API_CONFIG.FUNCTIONS_URL}/swipes`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Error al obtener swipes');
    }

    const payload = (await response.json()) as ApiResponse<SwipeLimitResponse>;
    if (!payload.data) {
      throw new Error('Respuesta invalida al obtener swipes');
    }

    return payload.data;
  }

  async incrementDailyCount(): Promise<SwipeLimitResponse> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${API_CONFIG.FUNCTIONS_URL}/swipes`, {
      method: 'POST',
      headers,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Error al actualizar swipes');
    }

    const payload = (await response.json()) as ApiResponse<SwipeLimitResponse>;
    if (!payload.data) {
      throw new Error('Respuesta invalida al actualizar swipes');
    }

    return payload.data;
  }
}

export const swipeLimitService = new SwipeLimitService();
