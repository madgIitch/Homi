import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  ImageBackground,
  StyleSheet,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../theme/ThemeContext';
import LinearGradient from 'react-native-linear-gradient';
import { colors } from '../theme';
import { BlurView } from '@react-native-community/blur';
import { FormSection } from '../components/FormSection';
import { AuthContext } from '../context/AuthContext';
import { profileService } from '../services/profileService';
import { roomService } from '../services/roomService';
import { roomExtrasService } from '../services/roomExtrasService';
import { roomAssignmentService } from '../services/roomAssignmentService';
import { roomInvitationService } from '../services/roomInvitationService';
import type { Flat, Room, RoomExtras } from '../types/room';
import type { RoomAssignment } from '../types/roomAssignment';
import type { Gender } from '../types/gender';
import { RoomManagementScreenStyles as styles } from '../styles/screens';

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

const SUB_RULE_TYPE_MAP = new Map<
  string,
  { ruleType: 'visitas' | 'fumar' | 'mascotas'; isNegative: boolean }
>([
  ['si, con aviso', { ruleType: 'visitas', isNegative: false }],
  ['no permitidas', { ruleType: 'visitas', isNegative: true }],
  ['si, pero sin dormir', { ruleType: 'visitas', isNegative: false }],
  ['sin problema', { ruleType: 'visitas', isNegative: false }],
  ['no fumar', { ruleType: 'fumar', isNegative: true }],
  ['solo en terraza/balcon', { ruleType: 'fumar', isNegative: false }],
  ['permitido en zonas comunes', { ruleType: 'fumar', isNegative: false }],
  ['no se permiten', { ruleType: 'mascotas', isNegative: true }],
  ['solo gatos', { ruleType: 'mascotas', isNegative: false }],
  ['solo perros', { ruleType: 'mascotas', isNegative: false }],
  ['permitidas bajo acuerdo', { ruleType: 'mascotas', isNegative: false }],
]);

const getRuleIcon = (rule: string) => {
  const normalized = rule.toLowerCase().trim();
  const subRuleMatch = SUB_RULE_TYPE_MAP.get(normalized);
  const ruleType = subRuleMatch?.ruleType ?? (() => {
    if (
      normalized.includes('ruido') ||
      normalized.includes('silencio') ||
      normalized.includes('horario flexible')
    ) {
      return 'ruido';
    }
    if (normalized.includes('visitas')) return 'visitas';
    if (normalized.includes('limpieza')) return 'limpieza';
    if (normalized.includes('fumar')) return 'fumar';
    if (normalized.includes('mascotas') || normalized.includes('mascot')) return 'mascotas';
    if (normalized.includes('cocina')) return 'cocina';
    if (normalized.includes('banos') || normalized.includes('baños')) return 'banos';
    if (normalized.includes('basura')) return 'basura';
    if (
      normalized.includes('puerta') ||
      normalized.includes('llave') ||
      normalized.includes('seguridad')
    ) {
      return 'seguridad';
    }
    return 'otros';
  })();

  const isNegative =
    subRuleMatch?.isNegative ??
    ((ruleType === 'visitas' && normalized.includes('no permitidas')) ||
      (ruleType === 'fumar' && normalized.includes('no fumar')) ||
      (ruleType === 'mascotas' && normalized.includes('no se permiten')));

  const emojiByType: Record<string, { positive: string; negative: string }> = {
    ruido: { positive: '\u{1F4E3}', negative: '\u{1F507}' },
    visitas: {
      positive: '\u{1F465}',
      negative: '\u{1F465}\u{1F6AB}',
    },
    limpieza: {
      positive: '\u{1F9F9}',
      negative: '\u{1F6AB}\u{1F9F9}',
    },
    fumar: { positive: '\u{1F6AC}', negative: '\u{1F6AD}' },
    mascotas: {
      positive: '\u{1F43E}',
      negative: '\u{1F43E}\u{1F6AB}',
    },
    cocina: {
      positive: '\u{1F373}',
      negative: '\u{1F6AB}\u{1F373}',
    },
    banos: {
      positive: '\u{1F6BF}',
      negative: '\u{1F6AB}\u{1F6BF}',
    },
    basura: {
      positive: '\u{1F5D1}\u{FE0F}',
      negative: '\u{1F6AB}\u{1F5D1}\u{FE0F}',
    },
    seguridad: { positive: '\u{1F510}', negative: '\u{1F513}' },
    otros: { positive: '\u{2728}', negative: '\u{1F6AB}\u{2728}' },
  };

  const emoji = emojiByType[ruleType] ?? emojiByType.otros;
  return isNegative ? emoji.negative : emoji.positive;
};

const getServiceIcon = (serviceName: string) => {
  const normalized = serviceName.toLowerCase();
  if (normalized.includes('luz') || normalized.includes('electric')) {
    return '\u{26A1}';
  }
  if (normalized.includes('agua')) return '\u{1F4A7}';
  if (normalized.includes('gas')) return '\u{1F525}';
  if (normalized.includes('internet') || normalized.includes('wifi')) {
    return '\u{1F4F6}';
  }
  if (normalized.includes('limpieza')) return '\u{1F9F9}';
  if (normalized.includes('calefaccion') || normalized.includes('calefacción')) {
    return '\u{1F321}\u{FE0F}';
  }
  return '\u{1F527}';
};

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
  const authContext = useContext(AuthContext);
  const userGender = authContext?.user?.gender ?? null;
  const [profileGender, setProfileGender] = useState<Gender | null>(null);
  const [loading, setLoading] = useState(true);
  const [flats, setFlats] = useState<Flat[]>([]);
  const [selectedFlatId, setSelectedFlatId] = useState<string | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomExtras, setRoomExtras] = useState<RoomExtrasMap>({});
  const [roomAssignments, setRoomAssignments] = useState<RoomAssignmentsMap>({});
  const [updatingGenderPolicy, setUpdatingGenderPolicy] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadProfileGender = async () => {
      try {
        const profile = await profileService.getProfile();
        if (isMounted) {
          setProfileGender(profile?.gender ?? null);
        }
      } catch (error) {
        console.error('Error cargando perfil:', error);
      }
    };

    void loadProfileGender();
    return () => {
      isMounted = false;
    };
  }, []);

  const resolvedGender = profileGender ?? userGender;
  const allowedPolicies = useMemo(() => {
    if (resolvedGender === 'male') {
      return new Set<Flat['gender_policy']>(['men_only', 'mixed']);
    }
    if (!resolvedGender || resolvedGender === 'undisclosed') {
      return new Set<Flat['gender_policy']>(['men_only', 'mixed', 'flinta']);
    }
    return new Set<Flat['gender_policy']>(['flinta', 'mixed']);
  }, [resolvedGender]);

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

  const handleCreateInvite = async (room: Room, isAssigned: boolean) => {
    if (isAssigned) {
      Alert.alert('Aviso', 'La habitacion ya esta asignada.');
      return;
    }

    try {
      const invite = await roomInvitationService.createInvitation(room.id);
      const expiresText = invite.expires_at
        ? `Caduca: ${invite.expires_at}`
        : 'Sin caducidad';
      Alert.alert(
        'Invitacion creada',
        `Codigo: ${invite.code}\n${expiresText}`
      );
    } catch (error) {
      console.error('Error creando invitacion:', error);
      Alert.alert('Error', 'No se pudo crear la invitacion');
    }
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

  const handleUpdateGenderPolicy = async (policy: Flat['gender_policy']) => {
    if (!selectedFlatId || !policy) return;
    if (!allowedPolicies.has(policy)) {
      Alert.alert(
        'Restriccion',
        'Esta opcion no esta disponible segun tu genero.'
      );
      return;
    }

    const currentPolicy = selectedFlat?.gender_policy ?? 'mixed';
    if (currentPolicy === policy) return;

    try {
      setUpdatingGenderPolicy(true);
      const updatedFlat = await roomService.updateFlat(selectedFlatId, {
        gender_policy: policy,
      });
      setFlats((prev) =>
        prev.map((flat) => (flat.id === updatedFlat.id ? updatedFlat : flat))
      );
    } catch (error) {
      console.error('Error actualizando tipo de convivencia:', error);
      Alert.alert('Error', 'No se pudo actualizar el tipo de convivencia');
    } finally {
      setUpdatingGenderPolicy(false);
    }
  };

  const selectedFlat = flats.find((flat) => flat.id === selectedFlatId) || null;
  const selectedFlatRules = selectedFlat?.rules
    ? selectedFlat.rules
        .split('\n')
        .map((rule) => rule.trim())
        .filter(Boolean)
    : [];
  const filteredRooms = selectedFlatId
    ? rooms.filter((room) => room.flat_id === selectedFlatId)
    : rooms;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surfaceMutedAlt }]}>
      <ImageBackground
        source={{
          uri: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1200&q=80',
        }}
        blurRadius={18}
        style={styles.background}
      >
        <LinearGradient
          colors={[colors.glassOverlay, colors.glassWarmStrong]}
          style={StyleSheet.absoluteFillObject}
        />
      </ImageBackground>
      <View style={styles.header}>
        <BlurView
          blurType="light"
          blurAmount={16}
          reducedTransparencyFallbackColor={colors.glassOverlay}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.headerFill} />
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
                {selectedFlatRules.length > 0 ? (
                  <View style={styles.rulesList}>
                    {selectedFlatRules.map((rule) => (
                      <Text key={rule} style={styles.detailText}>
                        {getRuleIcon(rule)} {rule}
                      </Text>
                    ))}
                  </View>
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
                        <Text style={styles.detailText}>
                          {getServiceIcon(service.name)} {service.name}
                        </Text>
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

              <FormSection title="Tipo de convivencia" iconName="people-outline">
                <View style={styles.segmentRow}>
                  {[
                    { id: 'mixed' as const, label: 'Mixto' },
                    { id: 'men_only' as const, label: 'Solo hombres' },
                    { id: 'flinta' as const, label: 'FLINTA' },
                  ].map((option) => {
                    const currentPolicy = selectedFlat?.gender_policy ?? 'mixed';
                    const isActive = currentPolicy === option.id;
                    const isDisabled =
                      updatingGenderPolicy || !allowedPolicies.has(option.id);
                    return (
                      <TouchableOpacity
                        key={option.id}
                        style={[
                          styles.segmentButton,
                          isActive && styles.segmentButtonActive,
                          isDisabled && styles.segmentButtonDisabled,
                        ]}
                        onPress={() => handleUpdateGenderPolicy(option.id)}
                        disabled={isDisabled}
                      >
                        <Text
                          style={[
                            styles.segmentButtonText,
                            isActive && styles.segmentButtonTextActive,
                            isDisabled && styles.segmentButtonTextDisabled,
                          ]}
                        >
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <Text style={styles.sectionHint}>
                  FLINTA: mujeres, personas no binarias y otras identidades;
                  hombres no.
                </Text>
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
                      style={[styles.actionButton, styles.actionButtonPrimary]}
                      onPress={() => handleEditRoom(room)}
                    >
                      <Ionicons name="create-outline" size={16} color="#111827" />
                      <Text style={[styles.actionText, styles.actionTextPrimary]}>
                        Editar
                      </Text>
                    </TouchableOpacity>
                    {!isCommonArea && (
                      <TouchableOpacity
                        style={[
                          styles.actionButton,
                          styles.actionButtonPrimary,
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
                        <Text style={[styles.actionText, styles.actionTextPrimary]}>
                          {room.is_available ? 'Pausar' : 'Activar'}
                        </Text>
                      </TouchableOpacity>
                    )}
                    {!isCommonArea && (
                      <TouchableOpacity
                        style={[
                          styles.actionButton,
                          isAssigned && styles.actionButtonDisabled,
                        ]}
                        onPress={() => handleCreateInvite(room, isAssigned)}
                        disabled={isAssigned}
                      >
                        <Ionicons name="ticket-outline" size={16} color="#111827" />
                        <Text style={styles.actionText}>Invitar</Text>
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


