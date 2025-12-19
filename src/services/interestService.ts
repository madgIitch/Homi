import { API_CONFIG } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { RoomInterest } from '../types/room';

interface InterestsResponse {
  data: RoomInterest[];
}

class InterestService {
  private async getAuthHeaders(): Promise<HeadersInit> {
    const token = await AsyncStorage.getItem('authToken');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  async getReceivedInterests(): Promise<RoomInterest[]> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(
      `${API_CONFIG.FUNCTIONS_URL}/interests?type=received`,
      {
        method: 'GET',
        headers,
      }
    );

    if (!response.ok) {
      throw new Error('Error al obtener intereses recibidos');
    }

    const data: InterestsResponse = await response.json();
    return data.data;
  }

  async getGivenInterests(): Promise<RoomInterest[]> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(
      `${API_CONFIG.FUNCTIONS_URL}/interests?type=given`,
      {
        method: 'GET',
        headers,
      }
    );

    if (!response.ok) {
      throw new Error('Error al obtener intereses');
    }

    const data: InterestsResponse = await response.json();
    return data.data;
  }
}

export const interestService = new InterestService();
