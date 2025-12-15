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
import { API_CONFIG } from '../config/api';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(API_CONFIG.SUPABASE_URL, API_CONFIG.SUPABASE_ANON_KEY);

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
      mediaType: 'photo',   // solo fotos
      quality: 0.7,
      selectionLimit: 1,
    };

    setUploading(true);

    try {
      const result = await launchImageLibrary(options);

      if (result.didCancel) {
        return;
      }

      if (result.errorCode) {
        Alert.alert('Error', result.errorMessage || 'No se pudo abrir la galería');
        return;
      }

      const asset: Asset | undefined = result.assets && result.assets[0];

      if (!asset || !asset.uri) {
        Alert.alert('Error', 'No se ha podido obtener la imagen seleccionada');
        return;
      }

      await uploadImage(asset.uri);
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'No se pudo seleccionar la imagen');
    } finally {
      setUploading(false);
    }
  };

  const uploadImage = async (uri: string) => {
    setUploading(true);

    try {
      // Obtener sesión del usuario autenticado
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Usuario no autenticado');
      }

      const response = await fetch(uri);
      const blob = await response.blob();
      const fileName = `avatar-${Date.now()}.jpg`;

      // Ruta segura con ID de usuario: userId/avatar-123.jpg
      const filePath = `${session.user.id}/${fileName}`;

      const { error } = await supabase.storage
        .from('avatars')
        .upload(filePath, blob, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (error) throw error;

      const {
        data: { publicUrl },
      } = supabase.storage.from('avatars').getPublicUrl(filePath);

      onImageUploaded(publicUrl);
    } catch (error) {
      Alert.alert('Error', 'No se pudo subir la imagen');
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <TouchableOpacity onPress={pickImage} disabled={uploading} style={styles.container}>
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
