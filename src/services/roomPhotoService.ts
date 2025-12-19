import { API_CONFIG } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface RoomPhotoUploadResponse {
  data: {
    path: string;
    signedUrl: string;
  };
}

class RoomPhotoService {
  async uploadPhoto(
    roomId: string,
    uri: string,
    fileName?: string,
    mimeType?: string
  ): Promise<{ path: string; signedUrl: string }> {
    const token = await AsyncStorage.getItem('authToken');
    if (!token) {
      throw new Error('No se encontro el token de autenticacion');
    }

    const name = fileName || `room-${Date.now()}.jpg`;
    const type = mimeType || 'image/jpeg';

    const formData = new FormData();
    formData.append('photo', {
      uri,
      name,
      type,
    } as any);
    formData.append('room_id', roomId);

    const response = await fetch(`${API_CONFIG.FUNCTIONS_URL}/room-photos`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al subir foto de habitacion');
    }

    const data: RoomPhotoUploadResponse = await response.json();
    return data.data;
  }
}

export const roomPhotoService = new RoomPhotoService();
