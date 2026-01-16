import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  Image,
  ImageBackground,
  Modal,
  StyleSheet,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Clipboard from '@react-native-clipboard/clipboard';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../theme/ThemeContext';
import LinearGradient from 'react-native-linear-gradient';
import { spacing } from '../theme';
import { BlurView } from '@react-native-community/blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { FormSection } from '../components/FormSection';
import { AuthContext } from '../context/AuthContext';
import { profileService } from '../services/profileService';
import { roomService } from '../services/roomService';
import { roomExtrasService } from '../services/roomExtrasService';
import { roomAssignmentService } from '../services/roomAssignmentService';
import { roomInvitationService } from '../services/roomInvitationService';
import { supabaseClient } from '../services/authService';
import type { Flat, Room, RoomExtras } from '../types/room';
import type { RoomAssignment } from '../types/roomAssignment';
import type { Gender } from '../types/gender';
import { RoomManagementScreenStyles } from '../styles/screens';

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
  ['bano_compartido', 'Baño compartido'],
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
    if (normalized.includes('banos') || normalized.includes('baños')) return 'baños';
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
  const styles = useMemo(() => RoomManagementScreenStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
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
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [inviteExpires, setInviteExpires] = useState('');
  const [inviteCopied, setInviteCopied] = useState(false);
  const roomsRef = useRef<Room[]>([]);
  const extrasRef = useRef<RoomExtrasMap>({});
  const flatsRef = useRef<Flat[]>([]);
  const inviteCopyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const assignmentChannelRef = useRef<RealtimeChannel | null>(null);
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      if (inviteCopyTimeoutRef.current) {
        clearTimeout(inviteCopyTimeoutRef.current);
      }
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }
      if (assignmentChannelRef.current) {
        supabaseClient.removeChannel(assignmentChannelRef.current);
        assignmentChannelRef.current = null;
      }
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    roomsRef.current = rooms;
  }, [rooms]);

  useEffect(() => {
    extrasRef.current = roomExtras;
  }, [roomExtras]);

  useEffect(() => {
    flatsRef.current = flats;
  }, [flats]);

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

    loadProfileGender().catch(() => undefined);
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

  const loadRooms = useCallback(async ({ silent }: { silent?: boolean } = {}) => {
    try {
      if (!silent && isMountedRef.current) {
        setLoading(true);
      }
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
      if (!silent && isMountedRef.current) {
        setLoading(false);
      }
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
  }, []);

  const computeFlatCapacity = useCallback(
    (flatId: string, roomsData: Room[], extrasData: RoomExtrasMap) => {
      const roomsForFlat = roomsData.filter((room) => room.flat_id === flatId);
      return roomsForFlat.reduce((sum, room) => {
        const extras = extrasData[room.id];
        if (extras?.category && extras.category !== 'habitacion') {
          return sum;
        }
        const roomType = extras?.room_type ?? null;
        if (roomType === 'doble') {
          const capacity =
            typeof extras?.capacity === 'number' && extras.capacity > 0
              ? extras.capacity
              : 2;
          return sum + capacity;
        }
        if (roomType === 'individual') {
          return sum + 1;
        }
        return sum;
      }, 0);
    },
    []
  );

  const syncFlatCapacities = useCallback(async () => {
    const roomsData = roomsRef.current;
    const extrasData = extrasRef.current;
    const flatsData = flatsRef.current;
    if (flatsData.length === 0 || roomsData.length === 0) return;

    await Promise.all(
      flatsData.map(async (flat) => {
        const nextCapacity = computeFlatCapacity(flat.id, roomsData, extrasData);
        if (!nextCapacity || flat.capacity_total === nextCapacity) return;
        try {
          const updated = await roomService.updateFlat(flat.id, {
            capacity_total: nextCapacity,
          });
          setFlats((prev) =>
            prev.map((item) => (item.id === updated.id ? updated : item))
          );
        } catch (error) {
          console.error('Error sincronizando capacidad:', error);
        }
      })
    );
  }, [computeFlatCapacity]);

  useFocusEffect(
    useCallback(() => {
      loadFlats();
      loadRooms();
      return () => {
        syncFlatCapacities().catch(() => undefined);
      };
    }, [loadRooms, loadFlats, syncFlatCapacities])
  );

  const scheduleRefresh = useCallback(() => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }
    refreshTimeoutRef.current = setTimeout(() => {
      loadRooms({ silent: true }).catch(() => undefined);
    }, 400);
  }, [loadRooms]);

  useEffect(() => {
    if (rooms.length === 0) {
      if (assignmentChannelRef.current) {
        supabaseClient.removeChannel(assignmentChannelRef.current);
        assignmentChannelRef.current = null;
      }
      return;
    }

    let isMounted = true;
    const subscribeToAssignments = async () => {
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        supabaseClient.realtime.setAuth(token);
      }

      if (assignmentChannelRef.current) {
        supabaseClient.removeChannel(assignmentChannelRef.current);
        assignmentChannelRef.current = null;
      }

      const roomIds = rooms.map((room) => room.id);
      if (roomIds.length === 0) return;
      const filter = `room_id=in.(${roomIds.join(',')})`;

      const channel = supabaseClient
        .channel('room-assignments:owner')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'room_assignments',
            filter,
          },
          () => {
            if (!isMounted) return;
            scheduleRefresh();
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'room_assignments',
            filter,
          },
          () => {
            if (!isMounted) return;
            scheduleRefresh();
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'room_assignments',
            filter,
          },
          () => {
            if (!isMounted) return;
            scheduleRefresh();
          }
        )
        .subscribe();

      assignmentChannelRef.current = channel;
    };

    subscribeToAssignments().catch(() => undefined);

    return () => {
      isMounted = false;
      if (assignmentChannelRef.current) {
        supabaseClient.removeChannel(assignmentChannelRef.current);
        assignmentChannelRef.current = null;
      }
    };
  }, [rooms, scheduleRefresh]);

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
      setInviteCode(invite.code);
      setInviteExpires(expiresText);
      setInviteCopied(false);
      setInviteModalVisible(true);
    } catch (error) {
      console.error('Error creando invitacion:', error);
      Alert.alert('Error', 'No se pudo crear la invitacion');
    }
  };

  const handleCopyInvite = () => {
    if (!inviteCode) return;
    Clipboard.setString(inviteCode);
    setInviteCopied(true);
    if (inviteCopyTimeoutRef.current) {
      clearTimeout(inviteCopyTimeoutRef.current);
    }
    inviteCopyTimeoutRef.current = setTimeout(() => {
      setInviteCopied(false);
    }, 1600);
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
          colors={[theme.colors.glassOverlay, theme.colors.glassWarmStrong]}
          style={StyleSheet.absoluteFillObject}
        />
      </ImageBackground>
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + spacing.md, paddingBottom: spacing.md },
        ]}
      >
        <BlurView
          blurType="light"
          blurAmount={16}
          reducedTransparencyFallbackColor={theme.colors.glassOverlay}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.headerFill} />
        <Pressable
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [
            styles.headerIconButton,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Gestion de habitaciones
        </Text>
        {flats.length > 0 ? (
          <Pressable
            onPress={handleCreateRoom}
            style={({ pressed }) => [
              styles.headerIconButton,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons name="add" size={20} color={theme.colors.text} />
          </Pressable>
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
              <Pressable
                style={({ pressed }) => [
                  styles.createFlatButton,
                  pressed && styles.pressed,
                ]}
                onPress={() => navigation.navigate('CreateFlat')}
              >
                <Text style={styles.createFlatButtonText}>Crear piso</Text>
              </Pressable>
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
                      <Pressable
                        key={flat.id}
                        style={({ pressed }) => [
                          styles.flatChip,
                          isActive && styles.flatChipActive,
                          pressed && styles.pressed,
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
                      </Pressable>
                    );
                  })}
                  <Pressable
                    style={({ pressed }) => [
                      styles.flatChip,
                      styles.flatChipAdd,
                      pressed && styles.pressed,
                    ]}
                    onPress={() => navigation.navigate('CreateFlat')}
                  >
                    <Ionicons name="add" size={14} color="#7C3AED" />
                    <Text style={styles.flatChipAddText}>Nuevo piso</Text>
                  </Pressable>
                </View>
              </ScrollView>
            </View>
            {selectedFlat ? (
              <Pressable
                style={({ pressed }) => [
                  styles.inlineAction,
                  pressed && styles.pressed,
                ]}
                onPress={() => navigation.navigate('EditFlat', { flat: selectedFlat })}
              >
                <Text style={styles.inlineActionText}>Editar piso</Text>
              </Pressable>
            ) : null}

              <FormSection title="Reglas" iconName="clipboard-outline" variant="flat">
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
                <Pressable
                  style={({ pressed }) => [
                    styles.inlineAction,
                    pressed && styles.pressed,
                  ]}
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
                </Pressable>
              </FormSection>

              <FormSection title="Servicios" iconName="flash-outline" variant="flat">
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
                <Pressable
                  style={({ pressed }) => [
                    styles.inlineAction,
                    pressed && styles.pressed,
                  ]}
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
                </Pressable>
              </FormSection>

              <FormSection title="Tipo de convivencia" iconName="people-outline" variant="flat">
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
                      <Pressable
                        key={option.id}
                        style={({ pressed }) => [
                          styles.segmentButton,
                          isActive && styles.segmentButtonActive,
                          isDisabled && styles.segmentButtonDisabled,
                          pressed && !isDisabled && styles.pressed,
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
                      </Pressable>
                    );
                  })}
                </View>
                <Text style={styles.sectionHint}>
                  FLINTA: mujeres, personas no binarias y otras identidades;
                  hombres no.
                </Text>
              </FormSection>

              <FormSection title="Habitaciones" iconName="bed-outline" variant="flat">
                <Pressable
                  style={({ pressed }) => [
                    styles.inlineAction,
                    pressed && styles.pressed,
                  ]}
                  onPress={handleCreateRoom}
                >
                  <Text style={styles.inlineActionText}>Agregar habitacion</Text>
                </Pressable>

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
                          <Text
                            style={[
                              styles.statusText,
                              status.key === 'available' && styles.statusAvailableText,
                              status.key === 'paused' && styles.statusPausedText,
                            ]}
                          >
                            {status.label}
                          </Text>
                        </View>
                      );
                    })()}
                  </View>

                  <View style={styles.actionsRow}>
                    <Pressable
                      style={({ pressed }) => [
                        styles.actionButton,
                        styles.actionButtonPrimary,
                        pressed && styles.pressed,
                      ]}
                      onPress={() => handleEditRoom(room)}
                    >
                      <Ionicons
                        name="create-outline"
                        size={16}
                        color={theme.colors.primary}
                      />
                      <Text style={[styles.actionText, styles.actionTextPrimary]}>
                        Editar
                      </Text>
                    </Pressable>
                    {!isCommonArea && (
                      <Pressable
                        style={({ pressed }) => [
                          styles.actionButton,
                          styles.actionButtonPrimary,
                          isAssigned && styles.actionButtonDisabled,
                          pressed && !isAssigned && styles.pressed,
                        ]}
                        onPress={() => handleToggleAvailability(room)}
                        disabled={isAssigned}
                      >
                        <Ionicons
                          name={room.is_available ? 'pause' : 'play'}
                          size={16}
                          color={theme.colors.primary}
                        />
                        <Text style={[styles.actionText, styles.actionTextPrimary]}>
                          {room.is_available ? 'Pausar' : 'Activar'}
                        </Text>
                      </Pressable>
                    )}
                    {!isCommonArea && (
                      <Pressable
                        style={({ pressed }) => [
                          styles.actionButton,
                          isAssigned && styles.actionButtonDisabled,
                          pressed && !isAssigned && styles.pressed,
                        ]}
                        onPress={() => handleCreateInvite(room, isAssigned)}
                        disabled={isAssigned}
                      >
                        <Ionicons
                          name="ticket-outline"
                          size={16}
                          color={theme.colors.textStrong}
                        />
                        <Text style={styles.actionText}>Invitar</Text>
                      </Pressable>
                    )}
                    {!isCommonArea && (
                      <Pressable
                        style={({ pressed }) => [
                          styles.actionButton,
                          pressed && styles.pressed,
                        ]}
                        onPress={() => handleViewInterests(room)}
                      >
                        <Ionicons
                          name="heart-outline"
                          size={16}
                          color={theme.colors.textStrong}
                        />
                        <Text style={styles.actionText}>Interesados</Text>
                      </Pressable>
                    )}
                    <Pressable
                      style={({ pressed }) => [
                        styles.actionButton,
                        styles.deleteButton,
                        pressed && styles.pressed,
                      ]}
                      onPress={() => handleDeleteRoom(room)}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={16}
                        color={theme.colors.error}
                      />
                      <Text style={[styles.actionText, styles.deleteButtonText]}>
                        Eliminar
                      </Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </FormSection>
            </>
          )}
        </ScrollView>
      )}

      <Modal transparent animationType="fade" visible={inviteModalVisible}>
        <View style={styles.inviteOverlay}>
          <LinearGradient
            colors={[theme.colors.overlayLight, theme.colors.overlay]}
            style={StyleSheet.absoluteFillObject}
          />
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={() => setInviteModalVisible(false)}
          />
          <View
            style={[
              styles.inviteCard,
              {
                backgroundColor: theme.colors.glassUltraLightAlt,
                borderColor: theme.colors.glassBorderSoft,
              },
            ]}
          >
            <BlurView
              blurType="light"
              blurAmount={14}
              reducedTransparencyFallbackColor={theme.colors.glassUltraLightAlt}
              style={StyleSheet.absoluteFillObject}
            />
            <View
              style={[
                styles.inviteCardFill,
                { backgroundColor: theme.colors.glassUltraLightAlt },
              ]}
            />
            <View style={styles.inviteHeader}>
              <Ionicons
                name="mail-open-outline"
                size={20}
                color={theme.colors.primary}
              />
              <Text style={styles.inviteTitleText}>Invitacion creada</Text>
            </View>
            <Text style={styles.inviteCodeLabel}>Codigo</Text>
            <View style={styles.inviteCodeRow}>
              <Text style={styles.inviteCodeValue}>{inviteCode}</Text>
              <Pressable
                style={({ pressed }) => [
                  styles.inviteCopyButton,
                  pressed && styles.pressed,
                ]}
                onPress={handleCopyInvite}
              >
                <Ionicons
                  name={inviteCopied ? 'checkmark' : 'copy-outline'}
                  size={16}
                  color={
                    inviteCopied ? theme.colors.successDark : theme.colors.primary
                  }
                />
                <Text style={styles.inviteCopyText}>
                  {inviteCopied ? 'Copiado' : 'Copiar'}
                </Text>
              </Pressable>
            </View>
            <Text style={styles.inviteExpiresText}>{inviteExpires}</Text>
            <Pressable
              style={({ pressed }) => [
                styles.inviteCloseButton,
                pressed && styles.pressed,
              ]}
              onPress={() => setInviteModalVisible(false)}
            >
              <Text style={styles.inviteCloseText}>Cerrar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
};


