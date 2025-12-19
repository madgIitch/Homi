import { API_CONFIG } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Profile } from '../types/profile';
import type { MatchStatus } from '../types/chat';

type ApiMatch = {
  id: string;
  user_a_id: string;
  user_b_id: string;
  status?: MatchStatus;
  user_a?: Profile;
  user_b?: Profile;
};

type ApiResponse<T> = {
  data?: T;
  error?: string;
};

class MatchService {
  private async getAuthHeaders(): Promise<HeadersInit> {
    const token = await AsyncStorage.getItem('authToken');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  async getMatch(matchId: string): Promise<ApiMatch | null> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(
      `${API_CONFIG.FUNCTIONS_URL}/matches?id=${matchId}`,
      {
        method: 'GET',
        headers,
      }
    );

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Error al obtener match');
    }

    const payload = (await response.json()) as ApiResponse<ApiMatch>;
    return payload.data ?? null;
  }
}

export const matchService = new MatchService();
