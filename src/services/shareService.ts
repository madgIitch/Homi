// src/services/shareService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { API_CONFIG } from '../config/api';
import { authService } from './authService';
import RNFS from 'react-native-fs';

const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer);
  const base64Chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let output = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const byte1 = bytes[i];
    const byte2 = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const byte3 = i + 2 < bytes.length ? bytes[i + 2] : 0;
    // eslint-disable-next-line no-bitwise
    const enc1 = byte1 >> 2;
    // eslint-disable-next-line no-bitwise
    const enc2 = ((byte1 & 3) << 4) | (byte2 >> 4);
    // eslint-disable-next-line no-bitwise
    const enc3 = ((byte2 & 15) << 2) | (byte3 >> 6);
    // eslint-disable-next-line no-bitwise
    const enc4 = byte3 & 63;
    output += base64Chars.charAt(enc1);
    output += base64Chars.charAt(enc2);
    output += i + 1 < bytes.length ? base64Chars.charAt(enc3) : '=';
    output += i + 2 < bytes.length ? base64Chars.charAt(enc4) : '=';
  }
  return output;
};

class ShareService {
  private async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await AsyncStorage.getItem('authToken');
    return {
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  private appendListParam(url: URL, key: string, values?: string[]) {
    if (!values || values.length === 0) return;
    url.searchParams.set(key, values.join(','));
  }

  private async fetchShareImage(
    url: URL,
    logLabel: string
  ): Promise<ArrayBuffer> {
    let headers = await this.getAuthHeaders();
    console.log(`[ShareService] Request ${logLabel} share image`, {
      url: url.toString(),
      hasAuth: Boolean(headers.Authorization),
    });

    let response = await fetch(url.toString(), {
      method: 'GET',
      headers,
    });
    console.log(`[ShareService] Response status ${logLabel}`, response.status);

    if (response.status === 401) {
      const newToken = await authService.refreshToken();
      if (newToken) {
        headers = await this.getAuthHeaders();
        console.log(`[ShareService] Retrying ${logLabel} with refreshed token`, {
          hasAuth: Boolean(headers.Authorization),
        });
        response = await fetch(url.toString(), {
          method: 'GET',
          headers,
        });
        console.log(
          `[ShareService] Response status after refresh ${logLabel}`,
          response.status
        );
      }
    }

    if (!response.ok) {
      let errorBody = '';
      try {
        errorBody = await response.text();
      } catch {
        errorBody = '';
      }
      console.error(`[ShareService] ${logLabel} share image error body`, {
        status: response.status,
        errorBody,
      });
      throw new Error(
        `Error obteniendo imagen (${response.status}) ${errorBody}`.trim()
      );
    }

    return await response.arrayBuffer();
  }

  private async writeShareImageFile(
    buffer: ArrayBuffer,
    prefix: string
  ): Promise<string> {
    const base64 = arrayBufferToBase64(buffer);
    const fileName = `${prefix}-${Date.now()}.png`;
    const baseDir =
      Platform.OS === 'android'
        ? `${RNFS.PicturesDirectoryPath}/HomiMatch`
        : `${RNFS.DocumentDirectoryPath}/HomiMatch`;
    await RNFS.mkdir(baseDir);
    const path = `${baseDir}/${fileName}`;
    await RNFS.writeFile(path, base64, 'base64');
    if (Platform.OS === 'android') {
      try {
        await RNFS.scanFile(path);
      } catch (error) {
        console.warn('[ShareService] No se pudo indexar la imagen:', error);
      }
    }
    console.log('[ShareService] Imagen guardada en:', path);
    return `file://${path}`;
  }

  async getProfileShareImage(
    profileId?: string,
    options?: {
      include?: string[];
      photoIds?: string[];
      zoneIds?: string[];
      theme?: string;
    }
  ): Promise<ArrayBuffer> {
    const url = new URL(`${API_CONFIG.FUNCTIONS_URL}/profile-share-image`);
    if (profileId) {
      (url.searchParams as any).set?.('profile_id', profileId);
    }
    if (options?.include?.length) {
      (url.searchParams as any).set?.('include', options.include.join(','));
    }
    this.appendListParam(url, 'photo_ids', options?.photoIds);
    this.appendListParam(url, 'zone_ids', options?.zoneIds);
    if (options?.theme) {
      (url.searchParams as any).set?.('theme', options.theme);
    }
    return this.fetchShareImage(url, 'profile');
  }

  async getFlatShareImage(flatId: string): Promise<ArrayBuffer> {
    const url = new URL(`${API_CONFIG.FUNCTIONS_URL}/flat-share-image`);
    (url.searchParams as any).set?.('flat_id', flatId);
    return this.fetchShareImage(url, 'flat');
  }

  async getRoomShareImage(roomId: string): Promise<ArrayBuffer> {
    const url = new URL(`${API_CONFIG.FUNCTIONS_URL}/room-share-image`);
    (url.searchParams as any).set?.('room_id', roomId);
    return this.fetchShareImage(url, 'room');
  }

  async getProfileShareImageFile(
    profileId?: string,
    options?: {
      include?: string[];
      photoIds?: string[];
      zoneIds?: string[];
      theme?: string;
    }
  ): Promise<string> {
    const buffer = await this.getProfileShareImage(profileId, options);
    return this.writeShareImageFile(buffer, 'profile-share');
  }

  async getFlatShareImageFile(flatId: string): Promise<string> {
    const buffer = await this.getFlatShareImage(flatId);
    return this.writeShareImageFile(buffer, 'flat-share');
  }

  async getRoomShareImageFile(roomId: string): Promise<string> {
    const buffer = await this.getRoomShareImage(roomId);
    return this.writeShareImageFile(buffer, 'room-share');
  }
}

export const shareService = new ShareService();
