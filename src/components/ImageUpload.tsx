// src/components/ImageUpload.tsx  
import React, { useState } from 'react';  
import { View, Button, Image, ActivityIndicator, Alert, StyleSheet } from 'react-native';  
import { launchImageLibrary } from 'react-native-image-picker';  
import AsyncStorage from '@react-native-async-storage/async-storage';  
import { API_CONFIG } from '../config/api';  
  
interface ImageUploadProps {  
  currentImage?: string;  
  onImageUploaded?: (url: string) => void;  
  userId?: string;  
}  
  
export const ImageUpload: React.FC<ImageUploadProps> = ({  
  currentImage,  
  onImageUploaded  
}) => {  
  const [imageUri, setImageUri] = useState<string | null>(currentImage || null);  
  const [uploading, setUploading] = useState(false);  
  
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
        Alert.alert('Error', 'No se encontró el token de autenticación');  
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
  
      const response = await fetch(  
        `${API_CONFIG.FUNCTIONS_URL}/upload-avatar`,  
        {  
          method: 'POST',  
          headers: {  
            Authorization: `Bearer ${token}`,  
          },  
          body: formData,  
        }  
      );  
  
      const text = await response.text();  
      console.log('[ImageUpload] Backend raw response:', text);  
  
      let data: any;  
      try {  
        data = JSON.parse(text);  
      } catch (e) {  
        console.error('[ImageUpload] Error parsing JSON:', e);  
        Alert.alert('Error', 'Respuesta inválida del servidor');  
        return;  
      }  
  
      if (!response.ok) {  
        console.error('[ImageUpload] Upload failed:', data);  
        Alert.alert('Error', data.error || 'Error al subir el avatar');  
        return;  
      }  
  
      console.log(  
        '[ImageUpload] Upload success. New avatar URL:',  
        data.avatarUrl  
      );  
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
        />  
      )}  
  
      {uploading ? (  
        <ActivityIndicator size="small" color="#6B46C1" />  
      ) : (  
        <Button title="Cambiar avatar" onPress={pickImage} />  
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