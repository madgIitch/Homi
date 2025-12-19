import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../theme/ThemeContext';
import { roomService } from '../services/roomService';
import type { Room } from '../types/room';

type RoomStatus = 'available' | 'paused' | 'reserved';

const toISODate = (date: Date) => date.toISOString().split('T')[0];

const getRoomStatus = (room: Room): { label: string; key: RoomStatus } => {
  const now = new Date();
  const availableFrom = room.available_from
    ? new Date(room.available_from)
    : null;

  if (room.is_available) {
    return { label: 'Disponible', key: 'available' };
  }

  if (availableFrom && availableFrom > now) {
    return { label: 'Reservada', key: 'reserved' };
  }

  return { label: 'Pausada', key: 'paused' };
};

export const RoomManagementScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation<StackNavigationProp<any>>();
  const [loading, setLoading] = useState(true);
  const [rooms, setRooms] = useState<Room[]>([]);

  const loadRooms = useCallback(async () => {
    try {
      setLoading(true);
      const data = await roomService.getMyRooms();
      setRooms(data);
    } catch (error) {
      console.error('Error cargando habitaciones:', error);
      Alert.alert('Error', 'No se pudieron cargar las habitaciones');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadRooms();
    }, [loadRooms])
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

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Gestion de habitaciones
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Cargando...</Text>
        </View>
      ) : rooms.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="bed-outline" size={42} color="#9CA3AF" />
          <Text style={styles.emptyTitle}>No tienes habitaciones publicadas</Text>
          <Text style={styles.emptySubtitle}>
            Crea una habitacion para empezar a recibir interesados.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {rooms.map((room) => {
            const status = getRoomStatus(room);
            return (
              <View key={room.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardTitleRow}>
                    <Text style={styles.cardTitle}>{room.title}</Text>
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
                  <Text style={styles.cardMeta}>
                    {room.size_m2 ? `${room.size_m2} m2 · ` : ''}
                    {room.price_per_month} EUR/mes
                  </Text>
                  <Text style={styles.cardMeta}>
                    Disponible desde:{' '}
                    {room.available_from ? room.available_from : 'Sin fecha'}
                  </Text>
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
  headerSpacer: {
    width: 24,
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
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
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
