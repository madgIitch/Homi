import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '../theme/ThemeContext';
import { FormSection } from '../components/FormSection';
import { Input } from '../components/Input';
import { TextArea } from '../components/TextArea';
import { Button } from '../components/Button';
import { roomService } from '../services/roomService';
import type { Room, RoomCreateRequest, RoomExtraDetails } from '../types/room';

const toISODate = (date: Date) => date.toISOString().split('T')[0];

const parseNumber = (value: string) => {
  const cleaned = value.replace(',', '.');
  const parsed = parseFloat(cleaned);
  return Number.isNaN(parsed) ? null : parsed;
};

const getExtrasKey = (roomId: string) => `roomExtras:${roomId}`;

export const RoomEditScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation<StackNavigationProp<any>>();
  const route = useRoute();
  const routeParams = route.params as { room?: Room; roomId?: string } | undefined;
  const initialRoom = routeParams?.room ?? null;
  const roomId = routeParams?.roomId ?? initialRoom?.id ?? null;

  const [room, setRoom] = useState<Room | null>(initialRoom);
  const [loading, setLoading] = useState(!initialRoom && Boolean(roomId));
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [size, setSize] = useState('');
  const [availableFrom, setAvailableFrom] = useState(toISODate(new Date()));
  const [isAvailable, setIsAvailable] = useState(true);

  const [roomType, setRoomType] = useState<RoomExtraDetails['roomType']>();
  const [servicesText, setServicesText] = useState('');
  const [rules, setRules] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);

  const loadRoom = useCallback(async () => {
    if (!roomId) return;
    try {
      setLoading(true);
      const data = await roomService.getMyRooms();
      const found = data.find((item) => item.id === roomId) || null;
      setRoom(found);
    } catch (error) {
      console.error('Error cargando habitacion:', error);
      Alert.alert('Error', 'No se pudo cargar la habitacion');
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  const loadExtras = useCallback(async (targetRoom: Room) => {
    try {
      const saved = await AsyncStorage.getItem(getExtrasKey(targetRoom.id));
      if (!saved) return;
      const parsed: RoomExtraDetails = JSON.parse(saved);
      setRoomType(parsed.roomType);
      setServicesText(parsed.services ? parsed.services.join(', ') : '');
      setRules(parsed.rules ?? '');
      setPhotos(parsed.photos ?? []);
    } catch (error) {
      console.error('Error cargando extras de habitacion:', error);
    }
  }, []);

  useEffect(() => {
    if (!room && roomId) {
      loadRoom();
    }
  }, [room, roomId, loadRoom]);

  useEffect(() => {
    if (!room) return;
    setTitle(room.title ?? '');
    setDescription(room.description ?? '');
    setPrice(room.price_per_month ? String(room.price_per_month) : '');
    setSize(room.size_m2 ? String(room.size_m2) : '');
    setAvailableFrom(room.available_from ?? toISODate(new Date()));
    setIsAvailable(room.is_available ?? true);
    loadExtras(room);
  }, [room, loadExtras]);

  const statusLabel = useMemo(
    () => (isAvailable ? 'Disponible' : 'Pausada'),
    [isAvailable]
  );

  const handleAddPhoto = async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      quality: 0.8,
      selectionLimit: 1,
    });

    if (result.didCancel || !result.assets || result.assets.length === 0) {
      return;
    }

    const asset = result.assets[0];
    if (!asset.uri) return;

    setPhotos((prev) => [...prev, asset.uri as string]);
  };

  const handleRemovePhoto = (uri: string) => {
    setPhotos((prev) => prev.filter((item) => item !== uri));
  };

  const handleSave = async () => {
    if (!room) return;

    const titleValue = title.trim();
    if (!titleValue) {
      Alert.alert('Error', 'El titulo es obligatorio');
      return;
    }

    const priceValue = parseNumber(price);
    if (priceValue == null || priceValue <= 0) {
      Alert.alert('Error', 'Introduce un precio valido');
      return;
    }

    const sizeValue = size ? parseNumber(size) : null;
    if (size && sizeValue == null) {
      Alert.alert('Error', 'Introduce un tamaño valido');
      return;
    }

    const availableValue = availableFrom.trim();
    if (!availableValue) {
      Alert.alert('Error', 'Introduce la fecha de disponibilidad');
      return;
    }

    const payload: RoomCreateRequest = {
      flat_id: room.flat_id,
      title: titleValue,
      description: description.trim() || undefined,
      price_per_month: priceValue,
      size_m2: sizeValue ?? undefined,
      is_available: isAvailable,
      available_from: availableValue,
    };

    const extraDetails: RoomExtraDetails = {
      roomType,
      services: servicesText
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      rules: rules.trim() || undefined,
      photos,
    };

    try {
      setSaving(true);
      await roomService.updateRoom(room.id, payload);
      await AsyncStorage.setItem(
        getExtrasKey(room.id),
        JSON.stringify(extraDetails)
      );
      Alert.alert('Exito', 'Habitacion actualizada');
      navigation.goBack();
    } catch (error) {
      console.error('Error guardando habitacion:', error);
      Alert.alert('Error', 'No se pudo guardar la habitacion');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !room) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Editar habitacion
        </Text>
        <View style={styles.headerActions}>
          <Button
            title="Cancelar"
            onPress={() => navigation.goBack()}
            variant="tertiary"
            size="small"
          />
          <Button
            title="Guardar"
            onPress={handleSave}
            size="small"
            loading={saving}
          />
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <FormSection title="Fotos de la habitacion" iconName="images-outline">
          <View style={styles.photoGrid}>
            {photos.map((uri) => (
              <View key={uri} style={styles.photoTile}>
                <Image source={{ uri }} style={styles.photo} />
                <TouchableOpacity
                  style={styles.photoRemove}
                  onPress={() => handleRemovePhoto(uri)}
                >
                  <Text style={styles.photoRemoveText}>X</Text>
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity
              style={[styles.photoTile, styles.addPhotoTile]}
              onPress={handleAddPhoto}
            >
              <Text style={styles.addPhotoText}>+</Text>
              <Text style={styles.addPhotoLabel}>Agregar</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.photoHint}>
            Las fotos se guardan en este dispositivo.
          </Text>
        </FormSection>

        <FormSection title="Detalle basico" iconName="bed-outline" required>
          <Input label="Titulo" value={title} onChangeText={setTitle} required />
          <TextArea
            label="Descripcion"
            value={description}
            onChangeText={setDescription}
            maxLength={500}
            placeholder="Describe la habitacion"
          />
          <Input
            label="Precio por mes (EUR)"
            value={price}
            onChangeText={setPrice}
            keyboardType="numeric"
            required
          />
          <Input
            label="Metros cuadrados"
            value={size}
            onChangeText={setSize}
            keyboardType="numeric"
          />
        </FormSection>

        <FormSection title="Tipo de habitacion" iconName="home-outline">
          <View style={styles.switchRow}>
            {[
              { id: 'individual', label: 'Individual' },
              { id: 'doble', label: 'Doble' },
            ].map((option) => {
              const isActive = roomType === option.id;
              return (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.switchButton,
                    isActive && styles.switchButtonActive,
                  ]}
                  onPress={() =>
                    setRoomType(option.id as RoomExtraDetails['roomType'])
                  }
                >
                  <Text
                    style={[
                      styles.switchButtonText,
                      isActive && styles.switchButtonTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </FormSection>

        <FormSection title="Servicios incluidos" iconName="flash-outline">
          <Input
            label="Servicios"
            value={servicesText}
            onChangeText={setServicesText}
            placeholder="Wifi, luz, agua..."
            helperText="Separalos por coma"
          />
        </FormSection>

        <FormSection title="Reglas del piso" iconName="clipboard-outline">
          <TextArea
            label="Reglas"
            value={rules}
            onChangeText={setRules}
            maxLength={400}
            placeholder="Ej: No fumar, visitas hasta las 22:00"
          />
        </FormSection>

        <FormSection title="Disponibilidad" iconName="calendar-outline">
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Estado: {statusLabel}</Text>
            <TouchableOpacity
              style={styles.statusToggle}
              onPress={() => setIsAvailable((prev) => !prev)}
            >
              <Text style={styles.statusToggleText}>
                {isAvailable ? 'Pausar' : 'Activar'}
              </Text>
            </TouchableOpacity>
          </View>
          <Input
            label="Disponible desde"
            value={availableFrom}
            onChangeText={setAvailableFrom}
            placeholder="YYYY-MM-DD"
          />
        </FormSection>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  photoTile: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoRemove: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(17, 24, 39, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoRemoveText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  addPhotoTile: {
    alignItems: 'center',
    justifyContent: 'center',
    borderStyle: 'dashed',
  },
  addPhotoText: {
    fontSize: 26,
    fontWeight: '700',
    color: '#7C3AED',
  },
  addPhotoLabel: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600',
    color: '#7C3AED',
  },
  photoHint: {
    marginTop: 8,
    fontSize: 12,
    color: '#6B7280',
  },
  switchRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  switchButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  switchButtonActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  switchButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  switchButtonTextActive: {
    color: '#FFFFFF',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  statusToggle: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#F3E8FF',
  },
  statusToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7C3AED',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#6B7280',
  },
});
