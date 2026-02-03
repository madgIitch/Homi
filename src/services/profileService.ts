// src/services/profileService.ts

import type { Profile, ProfileCreateRequest, RoomRecommendation } from '../types/profile';
import type { SwipeFilters } from '../types/swipeFilters';
import { API_CONFIG } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from './authService';

const devLog = (...args: unknown[]) => {
  if (__DEV__) {
    console.log(...args);
  }
};

const SWIPE_FILTERS_KEY = 'swipeFilters';

const toFiniteNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

const withBudgetFallback = async (
  updates: Partial<ProfileCreateRequest>
): Promise<Partial<ProfileCreateRequest>> => {
  const nextUpdates = { ...updates };
  const normalizedMin = toFiniteNumber(nextUpdates.budget_min);
  const normalizedMax = toFiniteNumber(nextUpdates.budget_max);

  if (normalizedMin !== undefined) {
    nextUpdates.budget_min = normalizedMin;
  }
  if (normalizedMax !== undefined) {
    nextUpdates.budget_max = normalizedMax;
  }

  const needsMin = nextUpdates.budget_min === undefined;
  const needsMax = nextUpdates.budget_max === undefined;
  if (!needsMin && !needsMax) return nextUpdates;

  try {
    const stored = await AsyncStorage.getItem(SWIPE_FILTERS_KEY);
    if (!stored) return nextUpdates;
    const parsed = JSON.parse(stored) as Partial<SwipeFilters>;
    if (needsMin && typeof parsed?.budgetMin === 'number') {
      nextUpdates.budget_min = parsed.budgetMin;
    }
    if (needsMax && typeof parsed?.budgetMax === 'number') {
      nextUpdates.budget_max = parsed.budgetMax;
    }
  } catch (error) {
    devLog('[ProfileService.updateProfile] Budget fallback failed:', error);
  }

  return nextUpdates;
};

interface ProfileResponse {
  data: Profile;
}

type ProfileRecommendation = RoomRecommendation;

interface ProfileRecommendationsResponse {
  recommendations: ProfileRecommendation[];
  blocked_provinces?: string[];
  all_provinces_blocked?: boolean;
}

class ProfileService {
  private async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await AsyncStorage.getItem('authToken');
    devLog('[ProfileService.getAuthHeaders] Token exists:', !!token);
    devLog(
      '[ProfileService.getAuthHeaders] Token first 20 chars:',
      token?.substring(0, 20)
    );

    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  async getProfile(): Promise<Profile | null> {
    devLog('[ProfileService.getProfile] Fetching profile...');
    let headers = await this.getAuthHeaders();

    let response = await fetch(`${API_CONFIG.FUNCTIONS_URL}/profiles`, {
      method: 'GET',
      headers,
    });

    devLog('[ProfileService.getProfile] Initial response:', {
      status: response.status,
      ok: response.ok,
    });

    // Si el token expiró (401), intenta refresh
    if (response.status === 401) {
      devLog('[ProfileService.getProfile] 401 received. Attempting token refresh...');
      const newToken = await authService.refreshToken();
      devLog(
        '[ProfileService.getProfile] Refresh result:',
        newToken ? 'success' : 'failed'
      );

      if (newToken) {
        headers = await this.getAuthHeaders();
        response = await fetch(`${API_CONFIG.FUNCTIONS_URL}/profiles`, {
          method: 'GET',
          headers,
        });
        devLog('[ProfileService.getProfile] Retried response:', {
          status: response.status,
          ok: response.ok,
        });
      }
    }

    if (!response.ok) {
      if (response.status === 404) {
        devLog('[ProfileService.getProfile] Perfil no encontrado (404)');
        return null;
      }
      console.error(
        '[ProfileService.getProfile] Error al obtener el perfil:',
        response.status
      );
      throw new Error(`Error al obtener el perfil (${response.status})`);
    }

    const data: ProfileResponse = await response.json();
    devLog('[ProfileService.getProfile] Perfil cargado correctamente');
    return data.data;
  }

  async getProfileRecommendations(
    filters?: unknown
  ): Promise<ProfileRecommendationsResponse> {
    let headers = await this.getAuthHeaders();

    const tryFetch = async (url: string) =>
      fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(filters ? { filters } : {}),
      });

    const recommendationsUrl = `${API_CONFIG.FUNCTIONS_URL}/profiles-recommendations`;
    devLog(
      '[ProfileService.getProfileRecommendations] url:',
      recommendationsUrl
    );

    let response = await tryFetch(recommendationsUrl);
    devLog(
      '[ProfileService.getProfileRecommendations] response:',
      response.status,
      response.ok
    );

    if (response.status === 401) {
      const newToken = await authService.refreshToken();
      if (newToken) {
        headers = await this.getAuthHeaders();
        response = await tryFetch(recommendationsUrl);
        devLog(
          '[ProfileService.getProfileRecommendations] retry:',
          response.status,
          response.ok
        );
      }
    }

    if (!response.ok) {
      try {
        const error = await response.json();
        devLog(
          '[ProfileService.getProfileRecommendations] primary error body:',
          error
        );
      } catch {
        // ignore json parse failures
      }

      if (response.status === 404) {
        devLog(
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
        devLog(
          '[ProfileService.getProfileRecommendations] final error body:',
          error
        );
      } catch {
        // ignore json parse failures
      }
      throw new Error(errorDetail);
    }

    const data: ProfileRecommendationsResponse = await response.json();
    devLog(
      '[ProfileService.getProfileRecommendations] ok count:',
      data.recommendations?.length ?? 0
    );
    return data;
  }

  async createProfile(profileData: ProfileCreateRequest): Promise<Profile> {
    devLog('[ProfileService.createProfile] Creating profile...');
    const headers = await this.getAuthHeaders();

    const response = await fetch(`${API_CONFIG.FUNCTIONS_URL}/profiles`, {
      method: 'POST',
      headers,
      body: JSON.stringify(profileData),
    });

    devLog('[ProfileService.createProfile] Response:', {
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
    devLog('[ProfileService.updateProfile] Updating profile...');
    const headers = await this.getAuthHeaders();
    const payload = await withBudgetFallback(updates);

    const response = await fetch(`${API_CONFIG.FUNCTIONS_URL}/profiles`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(payload),
    });

    devLog('[ProfileService.updateProfile] Response:', {
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

  async deleteProfile(): Promise<void> {
    devLog('[ProfileService.deleteProfile] Deleting profile...');
    const headers = await this.getAuthHeaders();

    const response = await fetch(`${API_CONFIG.FUNCTIONS_URL}/profiles`, {
      method: 'DELETE',
      headers,
    });

    devLog('[ProfileService.deleteProfile] Response:', {
      status: response.status,
      ok: response.ok,
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('[ProfileService.deleteProfile] Error:', error);
      throw new Error(error.error || 'Error al eliminar el perfil');
    }
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

  async completeOnboarding(): Promise<Profile> {
    devLog('[ProfileService.completeOnboarding] Completing onboarding...');
    const headers = await this.getAuthHeaders();

    const response = await fetch(
      `${API_CONFIG.FUNCTIONS_URL}/profiles?action=complete-onboarding`,
      {
        method: 'POST',
        headers,
      }
    );

    devLog('[ProfileService.completeOnboarding] Response:', {
      status: response.status,
      ok: response.ok,
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('[ProfileService.completeOnboarding] Error:', error);
      throw new Error(error.error || 'Error al completar el onboarding');
    }

    const data: ProfileResponse = await response.json();
    return data.data;
  }
}

export const profileService = new ProfileService();
