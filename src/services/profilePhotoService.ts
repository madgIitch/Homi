// src/services/profilePhotoService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '../config/api';
import type { ProfilePhoto } from '../types/profile';

interface ProfilePhotosResponse {
  data: ProfilePhoto[];
}

interface ProfilePhotoResponse {
  data: ProfilePhoto;
}

class ProfilePhotoService {
  private async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await AsyncStorage.getItem('authToken');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  async getPhotos(): Promise<ProfilePhoto[]> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${API_CONFIG.FUNCTIONS_URL}/profile-photos`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error(`Error al obtener fotos (${response.status})`);
    }

    const data: ProfilePhotosResponse = await response.json();
    return data.data ?? [];
  }

  async getPhotosForProfile(profileId: string): Promise<ProfilePhoto[]> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(
      `${API_CONFIG.FUNCTIONS_URL}/profile-photos-public?profile_id=${profileId}`,
      {
        method: 'GET',
        headers,
      }
    );

    if (!response.ok) {
      throw new Error(`Error al obtener fotos (${response.status})`);
    }

    const data: ProfilePhotosResponse = await response.json();
    return data.data ?? [];
  }

  async uploadPhoto(
    uri: string,
    fileName?: string,
    mimeType?: string
  ): Promise<ProfilePhoto> {
    const token = await AsyncStorage.getItem('authToken');
    if (!token) {
      throw new Error('No auth token found');
    }

    const name = fileName || `photo-${Date.now()}.jpg`;
    const type = mimeType || 'image/jpeg';

    const formData = new FormData();
    formData.append('photo', {
      uri,
      name,
      type,
    } as any);

    const response = await fetch(
      `${API_CONFIG.FUNCTIONS_URL}/profile-photos`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || 'Error al subir la foto');
    }

    const data: ProfilePhotoResponse = await response.json();
    return data.data;
  }

  async setPrimary(photoId: string): Promise<ProfilePhoto> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${API_CONFIG.FUNCTIONS_URL}/profile-photos`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ id: photoId }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || 'Error al actualizar la foto principal');
    }

    const data: ProfilePhotoResponse = await response.json();
    return data.data;
  }

  async deletePhoto(photoId: string): Promise<void> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${API_CONFIG.FUNCTIONS_URL}/profile-photos`, {
      method: 'DELETE',
      headers,
      body: JSON.stringify({ id: photoId }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || 'Error al eliminar la foto');
    }
  }
}

export const profilePhotoService = new ProfilePhotoService();
