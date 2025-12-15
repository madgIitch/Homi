// src/components/ImageUpload.tsx
import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Text,
  StyleSheet,
} from 'react-native';
import {
  launchImageLibrary,
  ImageLibraryOptions,
  Asset,
} from 'react-native-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabaseClient } from '../services/authService';

interface ImageUploadProps {
  onImageUploaded: (url: string) => void;
  currentImage?: string;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  onImageUploaded,
  currentImage,
}) => {
  const [uploading, setUploading] = useState(false);

  const pickImage = async () => {
    const options: ImageLibraryOptions = {
      mediaType: 'photo',
      selectionLimit: 1,
      quality: 0.7,
    };

    launchImageLibrary(options, async (response) => {
      if (response.didCancel) {
        return;
      }

      if (response.errorCode) {
        console.error('ImagePicker error:', response.errorMessage);
        Alert.alert('Error', 'No se pudo abrir la galería');
        return;
      }

      const asset: Asset | undefined = response.assets?.[0];
      if (!asset?.uri) {
        Alert.alert('Error', 'No se pudo leer la imagen seleccionada');
        return;
      }

      await uploadImage(asset.uri);
    });
  };

  const uploadImage = async (uri: string) => {
    setUploading(true);

    try {
      // 1. Obtener token de auth (tu sistema principal)
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        console.error('No hay authToken en AsyncStorage');
        throw new Error('Usuario no autenticado');
      }

      // 2. Obtener usuario desde Supabase usando ese token
      const { data: userData, error: userError } =
        await supabaseClient.auth.getUser(token);

      if (userError || !userData?.user) {
        console.error('Error getUser:', userError);
        throw new Error('No se pudo obtener el usuario');
      }

      const userId = userData.user.id;

      // 3. Descargar la imagen local y convertirla en blob
      const response = await fetch(uri);
      const blob = await response.blob();
      const fileName = `avatar-${Date.now()}.jpg`;

      // Carpeta por usuario
      const filePath = `${userId}/${fileName}`;

      const { error: uploadError } = await supabaseClient.storage
        .from('avatars')
        .upload(filePath, blob, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      const {
        data: { publicUrl },
      } = supabaseClient.storage.from('avatars').getPublicUrl(filePath);

      onImageUploaded(publicUrl);
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Error', 'No se pudo subir la imagen');
    } finally {
      setUploading(false);
    }
  };

  return (
    <TouchableOpacity
      onPress={pickImage}
      disabled={uploading}
      style={styles.container}
    >
      <View style={styles.avatarContainer}>
        {uploading ? (
          <ActivityIndicator size="small" color="#6B46C1" />
        ) : currentImage ? (
          <Image source={{ uri: currentImage }} style={styles.avatar} />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>Añadir foto</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  placeholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: '#6B46C1',
    fontSize: 12,
    textAlign: 'center',
  },
});
