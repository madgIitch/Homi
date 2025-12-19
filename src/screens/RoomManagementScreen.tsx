import React, { useCallback, useEffect, useState } from 'react';
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
import { roomExtrasService } from '../services/roomExtrasService';
import { roomAssignmentService } from '../services/roomAssignmentService';
import type { Flat, Room, RoomExtras } from '../types/room';
import type { RoomAssignment } from '../types/roomAssignment';

type RoomStatus = 'available' | 'paused';

type RoomExtrasMap = Record<string, RoomExtras | null>;
type RoomAssignmentsMap = Record<string, RoomAssignment[]>;

const toISODate = (date: Date) => date.toISOString().split('T')[0];

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

const getRoomStatus = (
  room: Room,
  isAssigned: boolean
): { label: string; key: RoomStatus } => {
  if (isAssigned) {
    return { label: 'Ocupada', key: 'paused' };
  }
  if (room.is_available) {
    return { label: 'Disponible', key: 'available' };
  }

  return { label: 'Ocupada', key: 'paused' };
};

export const RoomManagementScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation<StackNavigationProp<any>>();
  const [loading, setLoading] = useState(true);
  const [flats, setFlats] = useState<Flat[]>([]);
  const [selectedFlatId, setSelectedFlatId] = useState<string | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomExtras, setRoomExtras] = useState<RoomExtrasMap>({});
  const [roomAssignments, setRoomAssignments] = useState<RoomAssignmentsMap>({});

  const loadRooms = useCallback(async () => {
    try {
      setLoading(true);
      const data = await roomService.getMyRooms();
      setRooms(data);

      const extras = await roomExtrasService.getExtrasForRooms(
        data.map((room) => room.id)
      );
      setRoomExtras(
        Object.fromEntries(extras.map((item) => [item.room_id, item]))
      );

      const assignmentsResponse = await roomAssignmentService.getAssignmentsForOwner();
      const assignmentsByRoom: RoomAssignmentsMap = {};
      assignmentsResponse.assignments.forEach((assignment) => {
        if (!assignmentsByRoom[assignment.room_id]) {
          assignmentsByRoom[assignment.room_id] = [];
        }
        assignmentsByRoom[assignment.room_id].push(assignment);
      });
      setRoomAssignments(assignmentsByRoom);
    } catch (error) {
      console.error('Error cargando habitaciones:', error);
      Alert.alert('Error', 'No se pudieron cargar las habitaciones');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadFlats = useCallback(async () => {
    try {
      const data = await roomService.getMyFlats();
      setFlats(data);
    } catch (error) {
      console.error('Error cargando pisos:', error);
      Alert.alert('Error', 'No se pudieron cargar los pisos');
    }
  }, [selectedFlatId]);

  useFocusEffect(
    useCallback(() => {
      loadFlats();
      loadRooms();
    }, [loadRooms, loadFlats])
  );

  useEffect(() => {
    if (flats.length === 0) {
      setSelectedFlatId(null);
      return;
    }
    if (!selectedFlatId || !flats.some((flat) => flat.id === selectedFlatId)) {
      setSelectedFlatId(flats[0].id);
    }
  }, [flats, selectedFlatId]);

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

  const handleDeleteRoom = (room: Room) => {
    Alert.alert(
      'Eliminar habitacion',
      'Esta accion no se puede deshacer. ?Quieres continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await roomService.deleteRoom(room.id);
              await loadRooms();
            } catch (error) {
              console.error('Error eliminando habitacion:', error);
              Alert.alert('Error', 'No se pudo eliminar la habitacion');
            }
          },
        },
      ]
    );
  };

  const handleCreateRoom = () => {
    if (!selectedFlatId) {
      Alert.alert('Aviso', 'Debes crear un piso antes de añadir habitaciones.');
      return;
    }
    navigation.navigate('RoomEdit', { flatId: selectedFlatId });
  };

  const selectedFlat = flats.find((flat) => flat.id === selectedFlatId) || null;
  const filteredRooms = selectedFlatId
    ? rooms.filter((room) => room.flat_id === selectedFlatId)
    : rooms;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Gestion de habitaciones
        </Text>
        {flats.length > 0 ? (
          <TouchableOpacity onPress={handleCreateRoom} style={styles.headerAction}>
            <Ionicons name="add" size={20} color={theme.colors.primary} />
            <Text style={styles.headerActionText}>Nueva</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.headerSpacer} />
        )}
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
          {flats.length === 0 ? (
            <View style={styles.createFlatCard}>
              <Ionicons name="home-outline" size={42} color="#9CA3AF" />
              <Text style={styles.emptyTitle}>Aun no tienes un piso creado</Text>
              <Text style={styles.emptySubtitle}>
                Crea tu primer piso para empezar a publicar habitaciones.
              </Text>
              <TouchableOpacity
                style={styles.createFlatButton}
                onPress={() => navigation.navigate('CreateFlat')}
              >
                <Text style={styles.createFlatButtonText}>Crear piso</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.flatSelector}>
                <Text style={styles.flatSelectorLabel}>Pisos</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.flatChips}>
                  {flats.map((flat) => {
                    const isActive = flat.id === selectedFlatId;
                    return (
                      <TouchableOpacity
                        key={flat.id}
                        style={[
                          styles.flatChip,
                          isActive && styles.flatChipActive,
                        ]}
                        onPress={() => setSelectedFlatId(flat.id)}
                      >
                        <Text
                          style={[
                            styles.flatChipText,
                            isActive && styles.flatChipTextActive,
                          ]}
                        >
                          {flat.address}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                  <TouchableOpacity
                    style={[styles.flatChip, styles.flatChipAdd]}
                    onPress={() => navigation.navigate('CreateFlat')}
                  >
                    <Ionicons name="add" size={14} color="#7C3AED" />
                    <Text style={styles.flatChipAddText}>Nuevo piso</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>

              <FormSection title="Reglas" iconName="clipboard-outline">
                {selectedFlat?.rules ? (
                  <Text style={styles.detailText}>{selectedFlat.rules}</Text>
                ) : (
                  <Text style={styles.detailEmpty}>
                    Aun no has definido reglas del piso.
                  </Text>
                )}
                <TouchableOpacity
                  style={styles.inlineAction}
                  onPress={() =>
                    selectedFlatId
                      ? navigation.navigate('RulesManagement', {
                          flatId: selectedFlatId,
                        })
                      : Alert.alert('Aviso', 'Selecciona un piso primero.')
                  }
                >
                  <Text style={styles.inlineActionText}>
                    {selectedFlat?.rules ? 'Editar reglas' : 'Agregar reglas'}
                  </Text>
                </TouchableOpacity>
              </FormSection>

              <FormSection title="Servicios" iconName="flash-outline">
                {selectedFlat?.services && selectedFlat.services.length > 0 ? (
                  <View style={styles.servicesList}>
                    {selectedFlat.services.map((service, index) => (
                      <View key={`${service.name}-${index}`} style={styles.serviceRow}>
                        <Text style={styles.detailText}>{service.name}</Text>
                        {service.price != null && service.price !== 0 ? (
                          <Text style={styles.detailMeta}>{service.price} EUR</Text>
                        ) : null}
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.detailEmpty}>
                    Aun no has definido servicios incluidos.
                  </Text>
                )}
                <TouchableOpacity
                  style={styles.inlineAction}
                  onPress={() =>
                    selectedFlatId
                      ? navigation.navigate('ServicesManagement', {
                          flatId: selectedFlatId,
                        })
                      : Alert.alert('Aviso', 'Selecciona un piso primero.')
                  }
                >
                  <Text style={styles.inlineActionText}>
                    {selectedFlat?.services?.length
                      ? 'Editar servicios'
                      : 'Agregar servicios'}
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

                {filteredRooms.length === 0 ? (
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

                {filteredRooms.map((room) => {
                  const extras = roomExtras[room.id];
                  const isCommonArea = extras?.category === 'area_comun';
                  const assignmentsForRoom = roomAssignments[room.id] ?? [];
                  const isAssigned = assignmentsForRoom.some(
                    (assignment) => assignment.status === 'accepted'
                  );
                  const photo = extras?.photos?.[0];
                  const typeLabel =
                    extras?.category === 'area_comun'
                      ? extras?.common_area_type === 'otros'
                        ? extras?.common_area_custom
                        : commonAreaLabel.get(extras?.common_area_type || '')
                      : roomTypeLabel.get(extras?.room_type || '');
                  const typeText = typeLabel
                    ? isCommonArea
                      ? `Area comun: ${typeLabel}`
                      : `Tipo: ${typeLabel}`
                    : null;
                  const resolvedPhoto = photo?.signedUrl || null;

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
                        {!isCommonArea && (
                          <Text style={styles.roomMeta}>
                            Disponible desde:{' '}
                            {room.available_from ? room.available_from : 'Sin fecha'}
                          </Text>
                        )}
                        {typeText ? (
                          <Text style={styles.roomMeta}>{typeText}</Text>
                        ) : null}
                    </View>
                    {!isCommonArea && (() => {
                      const status = getRoomStatus(room, isAssigned);
                      return (
                        <View
                          style={[
                            styles.statusBadge,
                            status.key === 'available' && styles.statusAvailable,
                            status.key === 'paused' && styles.statusPaused,
                          ]}
                        >
                          <Text style={styles.statusText}>{status.label}</Text>
                        </View>
                      );
                    })()}
                  </View>

                  <View style={styles.actionsRow}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleEditRoom(room)}
                    >
                      <Ionicons name="create-outline" size={16} color="#111827" />
                      <Text style={styles.actionText}>Editar</Text>
                    </TouchableOpacity>
                    {!isCommonArea && (
                      <TouchableOpacity
                        style={[
                          styles.actionButton,
                          isAssigned && styles.actionButtonDisabled,
                        ]}
                        onPress={() => handleToggleAvailability(room)}
                        disabled={isAssigned}
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
                    )}
                    {!isCommonArea && (
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleViewInterests(room)}
                      >
                        <Ionicons name="heart-outline" size={16} color="#111827" />
                        <Text style={styles.actionText}>Interesados</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={[styles.actionButton, styles.deleteButton]}
                      onPress={() => handleDeleteRoom(room)}
                    >
                      <Ionicons name="trash-outline" size={16} color="#EF4444" />
                      <Text style={[styles.actionText, styles.deleteButtonText]}>
                        Eliminar
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </FormSection>
            </>
          )}
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
  headerSpacer: {
    width: 40,
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
  flatSelector: {
    marginBottom: 8,
  },
  flatSelectorLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  flatChips: {
    flexDirection: 'row',
    gap: 10,
  },
  flatChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  flatChipActive: {
    borderColor: '#7C3AED',
    backgroundColor: '#F5F3FF',
  },
  flatChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  flatChipTextActive: {
    color: '#7C3AED',
  },
  flatChipAdd: {
    borderStyle: 'dashed',
    borderColor: '#C4B5FD',
    backgroundColor: '#F5F3FF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  flatChipAddText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7C3AED',
  },
  createFlatCard: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 40,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  createFlatButton: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#7C3AED',
  },
  createFlatButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
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
  servicesList: {
    gap: 8,
  },
  serviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    padding: 14,
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  roomCardHeader: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  roomPhoto: {
    width: 72,
    height: 72,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
  },
  roomPhotoPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 14,
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
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 86,
    alignItems: 'center',
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
    flexWrap: 'wrap',
    marginTop: 12,
  },
  actionButton: {
    flexGrow: 1,
    flexBasis: '48%',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    backgroundColor: '#FFFFFF',
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  deleteButton: {
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
  },
  deleteButtonText: {
    color: '#EF4444',
  },
});
