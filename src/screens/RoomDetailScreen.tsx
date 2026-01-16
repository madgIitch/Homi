import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  TouchableOpacity,
  FlatList,
  Image,
  ImageBackground,
  Dimensions,
  ScrollView,
  Modal,
  Animated,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Alert,
  StyleSheet,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Clipboard from '@react-native-clipboard/clipboard';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { PinchGestureHandler, State } from 'react-native-gesture-handler';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { BlurView } from '@react-native-community/blur';
import type { RealtimeChannel } from '@supabase/supabase-js';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, useThemeController } from '../theme/ThemeContext';
import { spacing } from '../theme';
import { AuthContext } from '../context/AuthContext';
import { roomExtrasService } from '../services/roomExtrasService';
import { roomAssignmentService } from '../services/roomAssignmentService';
import { roomService } from '../services/roomService';
import { roomInvitationService } from '../services/roomInvitationService';
import { supabaseClient } from '../services/authService';
import type { Flat, Room, RoomExtras } from '../types/room';
import { Button } from '../components/Button';
import { RoomDetailScreenStyles as styles } from '../styles/screens';

type RouteParams = {
  room: Room;
  extras?: RoomExtras | null;
  flat?: Flat | null;
};

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

const LIGHTBOX_MIN_SCALE = 1;
const LIGHTBOX_MAX_SCALE = 3;

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

const getRuleIcon = (rule?: string | null) => {
  const normalized = typeof rule === 'string' ? rule.toLowerCase().trim() : '';
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
    if (normalized.includes('banos')) return 'baños';
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

const getServiceIcon = (serviceName?: string | null) => {
  const normalized = typeof serviceName === 'string' ? serviceName.toLowerCase() : '';
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

export const RoomDetailScreen: React.FC = () => {
  const theme = useTheme();
  const { isDark } = useThemeController();
  const insets = useSafeAreaInsets();
  const authContext = useContext(AuthContext);
  const currentUserId = authContext?.user?.id ?? '';
  const navigation = useNavigation<StackNavigationProp<any>>();
  const route = useRoute();
  const { room, extras, flat } = route.params as RouteParams;
  const [roomState, setRoomState] = useState(room);
  const [extrasState, setExtrasState] = useState<RoomExtras | null>(
    extras ?? null
  );
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [isAssigned, setIsAssigned] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [inviteExpires, setInviteExpires] = useState('');
  const [inviteCopied, setInviteCopied] = useState(false);
  const [lightboxVisible, setLightboxVisible] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxFrameWidth, setLightboxFrameWidth] = useState(0);
  const lightboxScrollRef = useRef<ScrollView>(null);
  const lightboxScaleStates = useRef<
    Array<{ base: Animated.Value; pinch: Animated.Value; lastScale: number }>
  >([]);
  const inviteCopyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const assignmentChannelRef = useRef<RealtimeChannel | null>(null);
  const isMountedRef = useRef(true);
  const [hasAssignments, setHasAssignments] = useState(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      if (inviteCopyTimeoutRef.current) {
        clearTimeout(inviteCopyTimeoutRef.current);
      }
      if (assignmentChannelRef.current) {
        supabaseClient.removeChannel(assignmentChannelRef.current);
        assignmentChannelRef.current = null;
      }
      isMountedRef.current = false;
    };
  }, []);

  const refreshRoom = useCallback(async () => {
      try {
        const isOwner = room.owner_id === currentUserId;
        const assignmentsResponse =
          await roomAssignmentService.getAssignmentsForRoom(room.id);

        if (isOwner) {
          const rooms = await roomService.getRoomsByOwner(room.owner_id);
          const updated = rooms.find((item) => item.id === room.id);
          if (updated && isMountedRef.current) {
            setRoomState(updated);
          }
        } else {
          try {
            const updated = await roomService.getRoomById(room.id);
            if (updated && isMountedRef.current) {
              setRoomState(updated);
            }
          } catch (error) {
            console.warn(
              'No se pudo refrescar la habitacion para no-dueno:',
              room.id,
              error
            );
          }
        }

        const extrasData = await roomExtrasService.getExtrasForRooms([room.id]);
        if (isMountedRef.current) {
          setExtrasState(extrasData[0] ?? null);
          setHasAssignments(
            assignmentsResponse.assignments.length > 0 ||
              Boolean(assignmentsResponse.match_assignment)
          );
          const assigned =
            assignmentsResponse.assignments.some(
              (assignment) =>
                assignment.room_id === room.id &&
                assignment.status === 'accepted' &&
                Boolean(assignment.assignee)
            ) ||
            (assignmentsResponse.match_assignment?.status === 'accepted' &&
              Boolean(assignmentsResponse.match_assignment.assignee));
          setIsAssigned(assigned);
        }
      } catch (error) {
        console.error('Error cargando detalle de habitacion:', error);
      }
    },
    [room.id, room.owner_id, currentUserId]
  );

  useEffect(() => {
    refreshRoom().catch((error) => {
      console.error('Error refrescando habitacion:', error);
    });
  }, [refreshRoom]);

  useEffect(() => {
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

      const channel = supabaseClient
        .channel(`room-assignments:room:${room.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'room_assignments',
            filter: `room_id=eq.${room.id}`,
          },
          () => {
            if (!isMounted) return;
            refreshRoom().catch((error) => {
              console.error('Error refrescando habitacion:', error);
            });
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'room_assignments',
            filter: `room_id=eq.${room.id}`,
          },
          () => {
            if (!isMounted) return;
            refreshRoom().catch((error) => {
              console.error('Error refrescando habitacion:', error);
            });
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'room_assignments',
            filter: `room_id=eq.${room.id}`,
          },
          () => {
            if (!isMounted) return;
            refreshRoom().catch((error) => {
              console.error('Error refrescando habitacion:', error);
            });
          }
        )
        .subscribe();

      assignmentChannelRef.current = channel;
    };

    subscribeToAssignments().catch((error) => {
      console.warn('[RoomDetail] Error suscribiendo asignaciones:', error);
    });

    return () => {
      isMounted = false;
      if (assignmentChannelRef.current) {
        supabaseClient.removeChannel(assignmentChannelRef.current);
        assignmentChannelRef.current = null;
      }
    };
  }, [refreshRoom, room.id]);

  const photos = extrasState?.photos ?? [];
  const carouselWidth = Dimensions.get('window').width - 40;
  const isCommonArea = extrasState?.category === 'area_comun';
  const isOwner = room.owner_id === currentUserId;
  const lightboxCount = photos.length;
  const detailCardStyle = useMemo(
    () => ({
      backgroundColor: isDark ? theme.colors.surfaceLight : theme.colors.glassSurface,
      borderColor: isDark ? theme.colors.border : theme.colors.glassBorderSoft,
    }),
    [isDark, theme.colors.border, theme.colors.glassBorderSoft, theme.colors.glassSurface, theme.colors.surfaceLight]
  );
  const detailNoteStyle = useMemo(
    () => ({
      backgroundColor: isDark ? theme.colors.surfaceLight : theme.colors.glassSurface,
      borderColor: isDark ? theme.colors.border : theme.colors.glassBorderSoft,
    }),
    [isDark, theme.colors.border, theme.colors.glassBorderSoft, theme.colors.glassSurface, theme.colors.surfaceLight]
  );
  const sectionTitleStyle = useMemo(
    () => ({ color: theme.colors.text }),
    [theme.colors.text]
  );
  const detailLabelStyle = useMemo(
    () => ({ color: theme.colors.textSecondary }),
    [theme.colors.textSecondary]
  );
  const detailValueStyle = useMemo(
    () => ({ color: theme.colors.text }),
    [theme.colors.text]
  );
  const detailNoteTextStyle = useMemo(
    () => ({ color: theme.colors.textSecondary }),
    [theme.colors.textSecondary]
  );
  const statusTextStyle = useMemo(
    () => ({ color: theme.colors.text }),
    [theme.colors.text]
  );

  useEffect(() => {
    if (lightboxCount === 0) {
      setLightboxIndex(0);
      lightboxScaleStates.current = [];
      return;
    }
    if (lightboxIndex >= lightboxCount) {
      setLightboxIndex(0);
    }
    while (lightboxScaleStates.current.length < lightboxCount) {
      lightboxScaleStates.current.push({
        base: new Animated.Value(1),
        pinch: new Animated.Value(1),
        lastScale: 1,
      });
    }
  }, [lightboxCount, lightboxIndex]);

  useEffect(() => {
    if (!lightboxVisible || lightboxFrameWidth <= 0) return;
    lightboxScrollRef.current?.scrollTo({
      x: lightboxIndex * lightboxFrameWidth,
      animated: false,
    });
  }, [lightboxFrameWidth, lightboxIndex, lightboxVisible]);

  const handleLightboxScrollEnd = (
    event: NativeSyntheticEvent<NativeScrollEvent>
  ) => {
    if (lightboxFrameWidth <= 0) return;
    const nextIndex = Math.round(
      event.nativeEvent.contentOffset.x / lightboxFrameWidth
    );
    setLightboxIndex(nextIndex);
  };

  const handleLightboxPrev = () => {
    if (lightboxCount <= 1) return;
    setLightboxIndex((prev) => (prev - 1 + lightboxCount) % lightboxCount);
  };

  const handleLightboxNext = () => {
    if (lightboxCount <= 1) return;
    setLightboxIndex((prev) => (prev + 1) % lightboxCount);
  };

  const typeLabel = useMemo(() => {
    if (!extrasState) return null;
    if (extrasState.category === 'area_comun') {
      if (extrasState.common_area_type === 'otros') {
        return extrasState.common_area_custom ?? null;
      }
      return extrasState.common_area_type
        ? commonAreaLabel.get(extrasState.common_area_type) ??
            extrasState.common_area_type
        : null;
    }
    return extrasState.room_type
      ? roomTypeLabel.get(extrasState.room_type) ?? extrasState.room_type
      : null;
  }, [extrasState]);

  const rules = flat?.rules
    ? flat.rules
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
  const services = flat?.services ?? [];
  const statusLabel = !isCommonArea
    ? isAssigned
      ? 'Ocupada'
      : roomState.is_available === true
      ? 'Disponible'
      : roomState.is_available === false
      ? hasAssignments
        ? 'Ocupada'
        : 'Disponible'
      : 'Sin estado'
    : null;
  const statusTone =
    statusLabel === 'Disponible'
      ? styles.statusPillAvailable
      : styles.statusPillOccupied;

  const handleCreateInvite = async () => {
    if (isAssigned) {
      Alert.alert('Aviso', 'La habitacion ya esta asignada.');
      return;
    }

    setInviteLoading(true);
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
    } finally {
      setInviteLoading(false);
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

  return (
    <View style={styles.container}>
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
          style={({ pressed }) => [
            styles.headerBackButton,
            { backgroundColor: theme.colors.surfaceLight, borderColor: theme.colors.border },
            pressed && styles.pressed,
          ]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={20} color={theme.colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          {room.title}
        </Text>
        {isOwner && !isCommonArea ? (
          <Pressable
            style={({ pressed }) => [
              styles.headerAction,
              { backgroundColor: theme.colors.surfaceLight, borderColor: theme.colors.border },
              pressed && styles.pressed,
            ]}
            onPress={() =>
              navigation.navigate('RoomInterests', {
                roomId: room.id,
                roomTitle: room.title,
              })
            }
          >
            <Ionicons name="people-outline" size={20} color={theme.colors.text} />
          </Pressable>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {photos.length > 0 && (
          <View style={styles.carouselContainer}>
            <FlatList
              data={photos}
              keyExtractor={(item) => item.path}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              snapToInterval={carouselWidth}
              decelerationRate="fast"
              onMomentumScrollEnd={(event) => {
                const index = Math.round(
                  event.nativeEvent.contentOffset.x / carouselWidth
                );
                setActivePhotoIndex(index);
              }}
              renderItem={({ item, index }) => (
                <View style={{ width: carouselWidth }}>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => {
                      setLightboxIndex(index);
                      setLightboxVisible(true);
                    }}
                  >
                    <Image
                      source={{ uri: item.signedUrl }}
                      style={styles.carouselImage}
                    />
                  </TouchableOpacity>
                </View>
              )}
            />
            {photos.length > 1 && (
              <View style={styles.carouselDots}>
                {photos.map((photo, index) => (
                  <View
                    key={photo.path}
                    style={[
                      styles.carouselDot,
                      index === activePhotoIndex && styles.carouselDotActive,
                    ]}
                  />
                ))}
              </View>
            )}
          </View>
        )}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, sectionTitleStyle]}>Informacion</Text>
          <View style={[styles.detailCard, detailCardStyle]}>
            {typeLabel ? (
              <View style={styles.detailRow}>
                <View style={styles.detailLabelRow}>
                  <Ionicons
                    name="home-outline"
                    size={16}
                    color={theme.colors.textSecondary}
                  />
                  <Text style={[styles.detailLabel, detailLabelStyle]}>Tipo</Text>
                </View>
                <Text style={[styles.detailValue, detailValueStyle]}>{typeLabel}</Text>
              </View>
            ) : null}
            {!isCommonArea && roomState.price_per_month != null ? (
              <View style={styles.detailRow}>
                <View style={styles.detailLabelRow}>
                  <Ionicons
                    name="card-outline"
                    size={16}
                    color={theme.colors.textSecondary}
                  />
                  <Text style={[styles.detailLabel, detailLabelStyle]}>Precio</Text>
                </View>
                <View style={styles.pricePill}>
                  <Text style={styles.pricePillText}>
                    {roomState.price_per_month} EUR/mes
                  </Text>
                </View>
              </View>
            ) : null}
            {!isCommonArea && statusLabel ? (
              <View style={styles.detailRow}>
                <View style={styles.detailLabelRow}>
                  <Ionicons
                    name="pulse-outline"
                    size={16}
                    color={theme.colors.textSecondary}
                  />
                  <Text style={[styles.detailLabel, detailLabelStyle]}>Estado</Text>
                </View>
                <View style={[styles.statusPill, statusTone]}>
                  <Text style={[styles.statusPillText, statusTextStyle]}>
                    {statusLabel}
                  </Text>
                </View>
              </View>
            ) : null}
            {roomState.size_m2 != null ? (
              <View style={styles.detailRow}>
                <View style={styles.detailLabelRow}>
                  <Ionicons
                    name="resize-outline"
                    size={16}
                    color={theme.colors.textSecondary}
                  />
                  <Text style={[styles.detailLabel, detailLabelStyle]}>Tamaño</Text>
                </View>
                <Text style={[styles.detailValue, detailValueStyle]}>
                  {roomState.size_m2} m2
                </Text>
              </View>
            ) : null}
            {roomState.description ? (
              <View style={[styles.detailNote, detailNoteStyle]}>
                <Text style={[styles.detailNoteText, detailNoteTextStyle]}>
                  {roomState.description}
                </Text>
              </View>
            ) : null}
          </View>
          {isOwner && !isCommonArea ? (
            <View style={styles.inviteRow}>
              <View style={styles.inviteCopy}>
                <Text style={styles.inviteTitle}>Invitacion</Text>
                <Text style={styles.inviteSubtitle}>
                  Codigo de un solo uso para esta habitacion.
                </Text>
              </View>
              <Button
                title="Crear"
                onPress={handleCreateInvite}
                loading={inviteLoading}
                disabled={isAssigned}
                size="small"
                variant="secondary"
              />
            </View>
          ) : null}
          {isOwner && !isCommonArea && isAssigned ? (
            <Text style={styles.inviteHint}>
              Esta habitacion ya esta asignada.
            </Text>
          ) : null}
        </View>

        {flat && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, sectionTitleStyle]}>Piso</Text>
            <View style={[styles.detailCard, detailCardStyle]}>
              <View style={styles.detailRow}>
                <View style={styles.detailLabelRow}>
                  <Ionicons
                    name="location-outline"
                    size={16}
                    color={theme.colors.textSecondary}
                  />
                  <Text style={[styles.detailLabel, detailLabelStyle]}>Direccion</Text>
                </View>
                <Text style={[styles.detailValue, detailValueStyle]}>
                  {flat.address}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <View style={styles.detailLabelRow}>
                  <Ionicons
                    name="map-outline"
                    size={16}
                    color={theme.colors.textSecondary}
                  />
                  <Text style={[styles.detailLabel, detailLabelStyle]}>Zona</Text>
                </View>
                <Text style={[styles.detailValue, detailValueStyle]}>
                  {flat.city}
                  {flat.district ? ` - ${flat.district}` : ''}
                </Text>
              </View>
            </View>
          </View>
        )}

        {rules.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, sectionTitleStyle]}>Reglas</Text>
            <View style={[styles.detailCard, detailCardStyle]}>
              {rules.map((rule) => (
                <Text key={rule} style={[styles.detailNoteText, detailNoteTextStyle]}>
                  {getRuleIcon(rule)} {rule}
                </Text>
              ))}
            </View>
          </View>
        )}

        {services.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, sectionTitleStyle]}>Servicios</Text>
            <View style={[styles.detailCard, detailCardStyle]}>
              {services.map((service) => (
                <Text
                  key={service.name}
                  style={[styles.detailNoteText, detailNoteTextStyle]}
                >
                  {getServiceIcon(service.name)} {service.name}
                  {service.price != null ? ` (${service.price} EUR)` : ''}
                </Text>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

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

      <Modal
        visible={lightboxVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLightboxVisible(false)}
      >
        <View style={styles.lightboxOverlay}>
          <LinearGradient
            colors={[theme.colors.overlayLight, theme.colors.overlayDark]}
            style={StyleSheet.absoluteFillObject}
          />
          <TouchableOpacity
            style={styles.lightboxBackdrop}
            activeOpacity={1}
            onPress={() => setLightboxVisible(false)}
          />
          <View style={styles.lightboxContent}>
            <View style={styles.lightboxTopBar}>
              <Text style={styles.lightboxTitle}>Fotos</Text>
              <Pressable
                style={({ pressed }) => [
                  styles.lightboxClose,
                  pressed && styles.pressed,
                ]}
                onPress={() => setLightboxVisible(false)}
              >
                <Ionicons
                  name="close"
                  size={18}
                  color={theme.colors.textSecondary}
                />
              </Pressable>
            </View>
            <View style={styles.lightboxDivider} />
            <View
              style={styles.lightboxImageFrame}
              onLayout={(event) => {
                const nextWidth = event.nativeEvent.layout.width;
                if (nextWidth !== lightboxFrameWidth) {
                  setLightboxFrameWidth(nextWidth);
                }
              }}
            >
              {lightboxCount > 0 && lightboxFrameWidth > 0 && (
                <ScrollView
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  ref={lightboxScrollRef}
                  onMomentumScrollEnd={handleLightboxScrollEnd}
                >
                  {photos.map((photo, index) => {
                    const scaleState = lightboxScaleStates.current[index];
                    const scale = scaleState
                      ? Animated.multiply(scaleState.base, scaleState.pinch)
                      : 1;
                    const onPinchEvent =
                      scaleState &&
                      Animated.event(
                        [{ nativeEvent: { scale: scaleState.pinch } }],
                        { useNativeDriver: true }
                      );
                    const onPinchStateChange = (event: any) => {
                      if (!scaleState) return;
                      if (event.nativeEvent.oldState === State.ACTIVE) {
                        const nextScale =
                          scaleState.lastScale * event.nativeEvent.scale;
                        const clampedScale = Math.min(
                          LIGHTBOX_MAX_SCALE,
                          Math.max(LIGHTBOX_MIN_SCALE, nextScale)
                        );
                        scaleState.lastScale = clampedScale;
                        scaleState.base.setValue(clampedScale);
                        scaleState.pinch.setValue(1);
                      }
                    };
                    return (
                      <PinchGestureHandler
                        key={photo.path}
                        onGestureEvent={onPinchEvent as any}
                        onHandlerStateChange={onPinchStateChange}
                      >
                        <Animated.View
                          style={[
                            styles.lightboxSlide,
                            { width: lightboxFrameWidth, transform: [{ scale }] },
                          ]}
                        >
                          <Image
                            source={{ uri: photo.signedUrl }}
                            style={styles.lightboxImage}
                          />
                        </Animated.View>
                      </PinchGestureHandler>
                    );
                  })}
                </ScrollView>
              )}
            </View>
            {lightboxCount > 1 && (
              <View style={styles.lightboxNav}>
                <Pressable
                  style={({ pressed }) => [
                    styles.lightboxNavButton,
                    pressed && styles.pressed,
                  ]}
                  onPress={handleLightboxPrev}
                >
                  <Ionicons
                    name="chevron-back"
                    size={20}
                    color={theme.colors.textSecondary}
                  />
                </Pressable>
                <View style={styles.lightboxCounterChip}>
                  <Ionicons
                    name="image-outline"
                    size={14}
                    color={theme.colors.textSecondary}
                  />
                  <Text style={styles.lightboxCounter}>
                    {lightboxIndex + 1}/{lightboxCount}
                  </Text>
                </View>
                <Pressable
                  style={({ pressed }) => [
                    styles.lightboxNavButton,
                    pressed && styles.pressed,
                  ]}
                  onPress={handleLightboxNext}
                >
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={theme.colors.textSecondary}
                  />
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};
