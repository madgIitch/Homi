// src/components/ImageUpload.tsx
import React, { useState, useEffect } from 'react';
import { View, Image, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '../config/api';
import { useTheme } from '../theme/ThemeContext';
import { Button } from './Button';

interface ImageUploadProps {
  currentImage?: string;
  onImageUploaded?: (url: string) => void;
  userId?: string;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  currentImage,
  onImageUploaded,
}) => {
  const theme = useTheme();
  const [imageUri, setImageUri] = useState<string | null>(currentImage || null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    console.log('[ImageUpload] currentImage prop changed:', currentImage);
    setImageUri(currentImage || null);
    console.log('[ImageUpload] imageUri state set to:', currentImage || null);
  }, [currentImage]);

  const pickImage = async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      quality: 0.8,
    });

    if (result.didCancel || !result.assets || result.assets.length === 0) {
      return;
    }

    const asset = result.assets[0];
    if (!asset.uri) return;

    setImageUri(asset.uri);
    await uploadToBackend(asset.uri, asset.fileName, asset.type);
  };

  const uploadToBackend = async (
    uri: string,
    fileName?: string,
    mimeType?: string
  ) => {
    try {
      setUploading(true);

      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        Alert.alert('Error', 'No se encontro el token de autenticacion');
        return;
      }

      const name = fileName || `avatar-${Date.now()}.jpg`;
      const type = mimeType || 'image/jpeg';

      const formData = new FormData();
      formData.append('avatar', {
        uri,
        name,
        type,
      } as any);

      console.log('[ImageUpload] Uploading avatar to backend...');
      console.log('[ImageUpload] URI:', uri);
      console.log('[ImageUpload] filename:', name);
      console.log('[ImageUpload] mimeType:', type);

      const response = await fetch(`${API_CONFIG.FUNCTIONS_URL}/upload-avatar`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const text = await response.text();
      console.log('[ImageUpload] Backend raw response:', text);

      let data: any;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error('[ImageUpload] Error parsing JSON:', e);
        Alert.alert('Error', 'Respuesta invalida del servidor');
        return;
      }

      if (!response.ok) {
        console.error('[ImageUpload] Upload failed:', data);
        Alert.alert('Error', data.error || 'Error al subir el avatar');
        return;
      }

      console.log('[ImageUpload] Upload success. New avatar URL:', data.avatarUrl);
      Alert.alert('OK', 'Avatar actualizado correctamente');

      if (onImageUploaded && data.avatarUrl) {
        onImageUploaded(data.avatarUrl);
      }
    } catch (error) {
      console.error('[ImageUpload] Unexpected error:', error);
      Alert.alert('Error', 'Error inesperado al subir el avatar');
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      {imageUri && (
        <Image
          source={{ uri: imageUri }}
          style={styles.avatar}
          onLoadStart={() => {
            console.log('[ImageUpload] Image load start:', imageUri);
          }}
          onLoad={() => {
            console.log('[ImageUpload] Image loaded:', imageUri);
          }}
          onError={(event) => {
            console.log('[ImageUpload] Image load error:', {
              uri: imageUri,
              error: event.nativeEvent?.error,
            });
          }}
        />
      )}

      {uploading ? (
        <ActivityIndicator size="small" color={theme.colors.text} />
      ) : (
        <Button title="Cambiar avatar" onPress={pickImage} variant="secondary" size="small" />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
  },
});
