import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../theme/ThemeContext';
import { FormSection } from '../components/FormSection';
import { roomService } from '../services/roomService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Room, RoomExtraDetails } from '../types/room';

type RoomStatus = 'available' | 'paused';

type RoomExtrasMap = Record<string, RoomExtraDetails | null>;

const RULES_STORAGE_KEY = 'flatRules';
const SERVICES_STORAGE_KEY = 'flatServices';

const roomTypeLabel = new Map([
  ['individual', 'Individual'],
  ['doble', 'Doble'],
]);

const commonAreaLabel = new Map([
  ['salon', 'Salon'],
  ['cocina', 'Cocina'],
  ['comedor', 'Comedor'],
  ['bano_compartido', 'Bano compartido'],
  ['terraza', 'Terraza'],
  ['patio', 'Patio'],
  ['lavadero', 'Lavadero'],
  ['pasillo', 'Pasillo'],
  ['recibidor', 'Recibidor'],
  ['trastero', 'Trastero'],
  ['estudio', 'Sala de estudio'],
]);

const getRoomStatus = (room: Room): { label: string; key: RoomStatus } => {
  if (room.is_available) {
    return { label: 'Disponible', key: 'available' };
  }

  return { label: 'Ocupada', key: 'paused' };
};

export const RoomManagementScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation<StackNavigationProp<any>>();
  const [loading, setLoading] = useState(true);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomExtras, setRoomExtras] = useState<RoomExtrasMap>({});
  const [rules, setRules] = useState('');
  const [servicesText, setServicesText] = useState('');
  const [servicesPrice, setServicesPrice] = useState('');

  const loadRooms = useCallback(async () => {
    try {
      setLoading(true);
      const data = await roomService.getMyRooms();
      setRooms(data);

      const extrasEntries = await Promise.all(
        data.map(async (room) => {
          try {
            const stored = await AsyncStorage.getItem(`roomExtras:${room.id}`);
            return [room.id, stored ? (JSON.parse(stored) as RoomExtraDetails) : null] as const;
          } catch (error) {
            console.error('Error cargando extras:', error);
            return [room.id, null] as const;
          }
        })
      );
      setRoomExtras(Object.fromEntries(extrasEntries));
    } catch (error) {
      console.error('Error cargando habitaciones:', error);
      Alert.alert('Error', 'No se pudieron cargar las habitaciones');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadFlatDetails = useCallback(async () => {
    try {
      const [rulesStored, servicesStored] = await Promise.all([
        AsyncStorage.getItem(RULES_STORAGE_KEY),
        AsyncStorage.getItem(SERVICES_STORAGE_KEY),
      ]);

      setRules(rulesStored || '');

      if (servicesStored) {
        const parsed = JSON.parse(servicesStored) as {
          servicesText?: string;
          servicesPrice?: string;
        };
        setServicesText(parsed.servicesText || '');
        setServicesPrice(parsed.servicesPrice || '');
      } else {
        setServicesText('');
        setServicesPrice('');
      }
    } catch (error) {
      console.error('Error cargando reglas/servicios:', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadRooms();
      loadFlatDetails();
    }, [loadRooms, loadFlatDetails])
  );

  const handleToggleAvailability = async (room: Room) => {
    const nextAvailable = !room.is_available;
    const availableFrom =
      room.available_from || toISODate(new Date());

    try {
      await roomService.updateRoom(room.id, {
        flat_id: room.flat_id,
        title: room.title,
        description: room.description,
        price_per_month: room.price_per_month,
        size_m2: room.size_m2,
        is_available: nextAvailable,
        available_from: availableFrom,
      });
      await loadRooms();
    } catch (error) {
      console.error('Error actualizando disponibilidad:', error);
      Alert.alert('Error', 'No se pudo actualizar la habitacion');
    }
  };

  const handleEditRoom = (room: Room) => {
    navigation.navigate('RoomEdit', { room });
  };

  const handleViewInterests = (room: Room) => {
    navigation.navigate('RoomInterests', {
      roomId: room.id,
      roomTitle: room.title,
    });
  };

  const handleCreateRoom = () => {
    navigation.navigate('RoomEdit');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Gestion de habitaciones
        </Text>
        <TouchableOpacity onPress={handleCreateRoom} style={styles.headerAction}>
          <Ionicons name="add" size={20} color={theme.colors.primary} />
          <Text style={styles.headerActionText}>Nueva</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Cargando...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <FormSection title="Reglas" iconName="clipboard-outline">
            {rules ? (
              <Text style={styles.detailText}>{rules}</Text>
            ) : (
              <Text style={styles.detailEmpty}>
                Aun no has definido reglas del piso.
              </Text>
            )}
            <TouchableOpacity
              style={styles.inlineAction}
              onPress={() => navigation.navigate('RulesManagement')}
            >
              <Text style={styles.inlineActionText}>
                {rules ? 'Editar reglas' : 'Agregar reglas'}
              </Text>
            </TouchableOpacity>
          </FormSection>

          <FormSection title="Servicios" iconName="flash-outline">
            {servicesText ? (
              <>
                <Text style={styles.detailText}>{servicesText}</Text>
                {servicesPrice ? (
                  <Text style={styles.detailMeta}>
                    Precio aprox.: {servicesPrice} EUR
                  </Text>
                ) : null}
              </>
            ) : (
              <Text style={styles.detailEmpty}>
                Aun no has definido servicios incluidos.
              </Text>
            )}
            <TouchableOpacity
              style={styles.inlineAction}
              onPress={() => navigation.navigate('ServicesManagement')}
            >
              <Text style={styles.inlineActionText}>
                {servicesText ? 'Editar servicios' : 'Agregar servicios'}
              </Text>
            </TouchableOpacity>
          </FormSection>

          <FormSection title="Habitaciones" iconName="bed-outline">
            <TouchableOpacity
              style={styles.inlineAction}
              onPress={handleCreateRoom}
            >
              <Text style={styles.inlineActionText}>Agregar habitacion</Text>
            </TouchableOpacity>

            {rooms.length === 0 ? (
              <View style={styles.emptyStateInline}>
                <Ionicons name="bed-outline" size={42} color="#9CA3AF" />
                <Text style={styles.emptyTitle}>
                  No tienes habitaciones publicadas
                </Text>
                <Text style={styles.emptySubtitle}>
                  Crea una habitacion para empezar a recibir interesados.
                </Text>
              </View>
            ) : null}

            {rooms.map((room) => {
              const status = getRoomStatus(room);
              const extras = roomExtras[room.id];
              const isCommonArea = extras?.category === 'area_comun';
              const photo = extras?.photos?.[0];
              const typeLabel =
                extras?.category === 'area_comun'
                  ? extras?.commonAreaType === 'otros'
                    ? extras?.commonAreaCustom
                    : commonAreaLabel.get(extras?.commonAreaType || '')
                  : roomTypeLabel.get(extras?.roomType || '');
              const typeText = typeLabel
                ? isCommonArea
                  ? `Area comun: ${typeLabel}`
                  : `Tipo: ${typeLabel}`
                : null;
              const resolvedPhoto = photo || null;

              return (
                <View key={room.id} style={styles.roomCard}>
                  <View style={styles.roomCardHeader}>
                    {resolvedPhoto ? (
                      <Image source={{ uri: resolvedPhoto }} style={styles.roomPhoto} />
                    ) : (
                      <View style={styles.roomPhotoPlaceholder}>
                        <Ionicons name="image-outline" size={22} color="#9CA3AF" />
                      </View>
                    )}
                    <View style={styles.roomInfo}>
                      <Text style={styles.roomTitle}>{room.title}</Text>
                      {!isCommonArea && room.price_per_month ? (
                        <Text style={styles.roomMeta}>
                          {room.price_per_month} EUR/mes
                        </Text>
                      ) : null}
                      <Text style={styles.roomMeta}>
                        Disponible desde:{' '}
                        {room.available_from ? room.available_from : 'Sin fecha'}
                      </Text>
                      {typeText ? (
                        <Text style={styles.roomMeta}>{typeText}</Text>
                      ) : null}
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        status.key === 'available' && styles.statusAvailable,
                        status.key === 'paused' && styles.statusPaused,
                        status.key === 'reserved' && styles.statusReserved,
                      ]}
                    >
                      <Text style={styles.statusText}>{status.label}</Text>
                    </View>
                  </View>

                  <View style={styles.actionsRow}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleEditRoom(room)}
                    >
                      <Ionicons name="create-outline" size={16} color="#111827" />
                      <Text style={styles.actionText}>Editar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleToggleAvailability(room)}
                    >
                      <Ionicons
                        name={room.is_available ? 'pause' : 'play'}
                        size={16}
                        color="#111827"
                      />
                      <Text style={styles.actionText}>
                        {room.is_available ? 'Pausar' : 'Activar'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleViewInterests(room)}
                    >
                      <Ionicons name="heart-outline" size={16} color="#111827" />
                      <Text style={styles.actionText}>Interesados</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </FormSection>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  headerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerActionText: {
    fontSize: 13,
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
  emptyStateInline: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 12,
  },
  emptyTitle: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
  },
  emptySubtitle: {
    marginTop: 8,
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
  },
  detailText: {
    fontSize: 14,
    color: '#111827',
  },
  detailMeta: {
    marginTop: 6,
    fontSize: 12,
    color: '#6B7280',
  },
  detailEmpty: {
    fontSize: 13,
    color: '#6B7280',
  },
  inlineAction: {
    marginTop: 12,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#F3E8FF',
  },
  inlineActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7C3AED',
  },
  roomCard: {
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    padding: 12,
  },
  roomCardHeader: {
    flexDirection: 'row',
    gap: 12,
  },
  roomPhoto: {
    width: 68,
    height: 68,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  roomPhotoPlaceholder: {
    width: 68,
    height: 68,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roomInfo: {
    flex: 1,
  },
  roomTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  roomMeta: {
    marginTop: 4,
    fontSize: 12,
    color: '#6B7280',
  },
  content: {
    padding: 20,
    gap: 16,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    padding: 16,
  },
  cardHeader: {
    marginBottom: 12,
  },
  cardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  cardMeta: {
    marginTop: 4,
    fontSize: 13,
    color: '#6B7280',
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
  },
  statusAvailable: {
    backgroundColor: '#DCFCE7',
  },
  statusPaused: {
    backgroundColor: '#FEF3C7',
  },
  statusReserved: {
    backgroundColor: '#DBEAFE',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
});
