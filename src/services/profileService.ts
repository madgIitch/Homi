// src/services/profileService.ts

import { Profile, ProfileCreateRequest } from '../types/profile';
import { API_CONFIG } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from './authService';

interface ProfileResponse {
  data: Profile;
}

interface ProfileRecommendation {
  profile: Profile;
  compatibility_score: number;
  match_reasons: string[];
}

interface ProfileRecommendationsResponse {
  recommendations: ProfileRecommendation[];
}

class ProfileService {
  private async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await AsyncStorage.getItem('authToken');
    console.log('[ProfileService.getAuthHeaders] Token exists:', !!token);
    console.log(
      '[ProfileService.getAuthHeaders] Token first 20 chars:',
      token?.substring(0, 20)
    );

    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  async getProfile(): Promise<Profile | null> {
    console.log('[ProfileService.getProfile] Fetching profile...');
    let headers = await this.getAuthHeaders();

    let response = await fetch(`${API_CONFIG.FUNCTIONS_URL}/profiles`, {
      method: 'GET',
      headers,
    });

    console.log('[ProfileService.getProfile] Initial response:', {
      status: response.status,
      ok: response.ok,
    });

    // Si el token expiró (401), intenta refresh
    if (response.status === 401) {
      console.log('[ProfileService.getProfile] 401 received. Attempting token refresh...');
      const newToken = await authService.refreshToken();
      console.log(
        '[ProfileService.getProfile] Refresh result:',
        newToken ? 'success' : 'failed'
      );

      if (newToken) {
        headers = await this.getAuthHeaders();
        response = await fetch(`${API_CONFIG.FUNCTIONS_URL}/profiles`, {
          method: 'GET',
          headers,
        });
        console.log('[ProfileService.getProfile] Retried response:', {
          status: response.status,
          ok: response.ok,
        });
      }
    }

    if (!response.ok) {
      if (response.status === 404) {
        console.log('[ProfileService.getProfile] Perfil no encontrado (404)');
        return null;
      }
      console.error(
        '[ProfileService.getProfile] Error al obtener el perfil:',
        response.status
      );
      throw new Error(`Error al obtener el perfil (${response.status})`);
    }

    const data: ProfileResponse = await response.json();
    console.log('[ProfileService.getProfile] Perfil cargado correctamente');
    return data.data;
  }

  async getProfileRecommendations(filters?: unknown): Promise<ProfileRecommendation[]> {
    let headers = await this.getAuthHeaders();

    const tryFetch = async (url: string) =>
      fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(filters ? { filters } : {}),
      });

    const recommendationsUrl = `${API_CONFIG.FUNCTIONS_URL}/profiles-recommendations`;
    console.log(
      '[ProfileService.getProfileRecommendations] url:',
      recommendationsUrl
    );

    let response = await tryFetch(recommendationsUrl);
    console.log(
      '[ProfileService.getProfileRecommendations] response:',
      response.status,
      response.ok
    );

    if (response.status === 401) {
      const newToken = await authService.refreshToken();
      if (newToken) {
        headers = await this.getAuthHeaders();
        response = await tryFetch(recommendationsUrl);
        console.log(
          '[ProfileService.getProfileRecommendations] retry:',
          response.status,
          response.ok
        );
      }
    }

    if (!response.ok) {
      let errorMessage = 'Error al obtener recomendaciones';
      try {
        const error = await response.json();
        errorMessage = error?.error || errorMessage;
        console.log(
          '[ProfileService.getProfileRecommendations] primary error body:',
          error
        );
      } catch {
        // ignore json parse failures
      }

      if (response.status === 404) {
        console.log(
          '[ProfileService.getProfileRecommendations] not found:',
          recommendationsUrl
        );
      }
    }

    if (!response.ok) {
      let errorDetail = 'Error al obtener recomendaciones';
      try {
        const error = await response.json();
        errorDetail = error?.error || errorDetail;
        console.log(
          '[ProfileService.getProfileRecommendations] final error body:',
          error
        );
      } catch {
        // ignore json parse failures
      }
      throw new Error(errorDetail);
    }

    const data: ProfileRecommendationsResponse = await response.json();
    console.log(
      '[ProfileService.getProfileRecommendations] ok count:',
      data.recommendations?.length ?? 0
    );
    return data.recommendations ?? [];
  }

  async createProfile(profileData: ProfileCreateRequest): Promise<Profile> {
    console.log('[ProfileService.createProfile] Creating profile...');
    const headers = await this.getAuthHeaders();

    const response = await fetch(`${API_CONFIG.FUNCTIONS_URL}/profiles`, {
      method: 'POST',
      headers,
      body: JSON.stringify(profileData),
    });

    console.log('[ProfileService.createProfile] Response:', {
      status: response.status,
      ok: response.ok,
    });

    if (!response.ok) {
      const error = await response.json();
      console.error(
        '[ProfileService.createProfile] Error:',
        error?.error || error
      );
      throw new Error(error.error || 'Error al crear el perfil');
    }

    const data: ProfileResponse = await response.json();
    return data.data;
  }

  async updateProfile(updates: Partial<ProfileCreateRequest>): Promise<Profile> {
    console.log('[ProfileService.updateProfile] Updating profile...');
    const headers = await this.getAuthHeaders();

    const response = await fetch(`${API_CONFIG.FUNCTIONS_URL}/profiles`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(updates),
    });

    console.log('[ProfileService.updateProfile] Response:', {
      status: response.status,
      ok: response.ok,
    });

    if (!response.ok) {  
      const error = await response.json();  
      console.error('[ProfileService.updateProfile] Full error:', error);  
      // This will show the validation details array  
      throw new Error(error.error || 'Error al actualizar el perfil');  
    }

    const data: ProfileResponse = await response.json();
    return data.data;
  }

  async createOrUpdateProfile(
    profileData: ProfileCreateRequest
  ): Promise<Profile> {
    const existingProfile = await this.getProfile();

    if (existingProfile) {
      return this.updateProfile(profileData);
    } else {
      return this.createProfile(profileData);
    }
  }
}

export const profileService = new ProfileService();
