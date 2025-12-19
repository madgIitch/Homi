import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '../config/api';
import { authService } from './authService';
import type { SwipeRejection } from '../types/swipeRejection';

type ApiSwipeRejection = {
  id: string;
  user_id: string;
  rejected_profile_id: string;
  created_at: string;
};

type ApiResponse<T> = {
  data?: T;
  error?: string;
};

const ENDPOINT = `${API_CONFIG.FUNCTIONS_URL}/swipe-rejections`;

class SwipeRejectionService {
  private async getAuthHeaders(): Promise<HeadersInit> {
    const token = await AsyncStorage.getItem('authToken');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  private async fetchWithAuth(input: RequestInfo, init: RequestInit) {
    let headers = await this.getAuthHeaders();
    const tryFetch = () => fetch(input, { ...init, headers });
    let response = await tryFetch();

    if (response.status === 401) {
      const newToken = await authService.refreshToken();
      if (newToken) {
        headers = await this.getAuthHeaders();
        response = await tryFetch();
      }
    }

    return response;
  }

  async getRejections(): Promise<SwipeRejection[]> {
    const response = await this.fetchWithAuth(ENDPOINT, { method: 'GET' });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Error al obtener rechazos');
    }

    const payload = (await response.json()) as ApiResponse<ApiSwipeRejection[]>;
    const data = payload.data ?? [];
    return data.map((item) => ({
      id: item.id,
      userId: item.user_id,
      rejectedProfileId: item.rejected_profile_id,
      createdAt: item.created_at,
    }));
  }

  async createRejection(rejectedProfileId: string): Promise<void> {
    const response = await this.fetchWithAuth(ENDPOINT, {
      method: 'POST',
      body: JSON.stringify({ rejected_profile_id: rejectedProfileId }),
    });

    if (!response.ok && response.status !== 409) {
      const error = await response.text();
      throw new Error(error || 'Error al crear rechazo');
    }
  }
}

export const swipeRejectionService = new SwipeRejectionService();
