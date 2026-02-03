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
  Vibration,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Clipboard from '@react-native-clipboard/clipboard';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import {
  GestureHandlerRootView,
  PanGestureHandler,
  PinchGestureHandler,
  State,
  TapGestureHandler,
} from 'react-native-gesture-handler';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { BlurView } from '@react-native-community/blur';
import type { RealtimeChannel } from '@supabase/supabase-js';
import LinearGradient from 'react-native-linear-gradient';
import Share from 'react-native-share';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, useThemeController } from '../theme/ThemeContext';
import { spacing } from '../theme';
import { AuthContext } from '../context/AuthContext';
import { roomExtrasService } from '../services/roomExtrasService';
import { roomAssignmentService } from '../services/roomAssignmentService';
import { roomService } from '../services/roomService';
import { roomInvitationService } from '../services/roomInvitationService';
import { shareService } from '../services/shareService';
import { supabaseClient } from '../services/authService';
import type { Flat, Room, RoomExtras } from '../types/room';
import { Button } from '../components/Button';
import { RoomSelector } from '../components/RoomSelector';
import { RoomDetailScreenStyles as styles } from '../styles/screens';
import { RuleIcon, ServiceIcon } from '../utils/iconUtils';

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
const LIGHTBOX_DOUBLE_TAP_SCALE = 2;
const LIGHTBOX_CLOSE_SCALE = 0.85;
const ZOOM_INDICATOR_TIMEOUT = 2500;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

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
  const [lightboxFrameHeight, setLightboxFrameHeight] = useState(0);
  const [lightboxScrollEnabled, setLightboxScrollEnabled] = useState(true);
  const [lightboxZoomLabel, setLightboxZoomLabel] = useState<string | null>(null);
  const lightboxScrollRef = useRef<ScrollView>(null);
  const lightboxScaleStates = useRef<
    Array<{
      base: Animated.Value;
      pinch: Animated.Value;
      lastScale: number;
      maxScale: number;
      maxScaleResolved: boolean;
      baseX: Animated.Value;
      baseY: Animated.Value;
      panX: Animated.Value;
      panY: Animated.Value;
      lastX: number;
      lastY: number;
    }>
  >([]);
  const zoomLabelTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inviteCopyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const assignmentChannelRef = useRef<RealtimeChannel | null>(null);
  const isMountedRef = useRef(true);
  const [hasAssignments, setHasAssignments] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [roomSelectorVisible, setRoomSelectorVisible] = useState(false);
  const [allRooms, setAllRooms] = useState<Room[]>([]);
  const [allExtras, setAllExtras] = useState<Record<string, RoomExtras | null>>({});

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      if (inviteCopyTimeoutRef.current) {
        clearTimeout(inviteCopyTimeoutRef.current);
      }
      if (zoomLabelTimeoutRef.current) {
        clearTimeout(zoomLabelTimeoutRef.current);
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
    const loadAllRooms = async () => {
      if (!room.flat_id) return;
      try {
        const rooms = await roomService.getRoomsByFlatIds([room.flat_id]);
        if (!isMounted) return;
        setAllRooms(rooms);

        const roomIds = rooms.map((r) => r.id);
        const extrasData = await roomExtrasService.getExtrasForRooms(roomIds);
        if (!isMounted) return;
        const extrasMap: Record<string, RoomExtras | null> = {};
        extrasData.forEach((item) => {
          extrasMap[item.room_id] = item;
        });
        setAllExtras(extrasMap);
      } catch (error) {
        console.error('Error cargando habitaciones del piso:', error);
      }
    };

    loadAllRooms();
    return () => {
      isMounted = false;
    };
  }, [room.flat_id]);

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
  const isOwner = roomState.owner_id === currentUserId;
  const canShareRoom = isOwner && !isCommonArea;
  const lightboxCount = photos.length;

  const getAdaptiveMaxScale = useCallback((width: number, height: number) => {
    const maxDimension = Math.max(width, height);
    if (maxDimension >= 4000) return 5;
    if (maxDimension >= 3000) return 4.5;
    if (maxDimension >= 2500) return 4;
    if (maxDimension >= 2000) return 3.5;
    return LIGHTBOX_MAX_SCALE;
  }, []);

  const getPanBounds = useCallback(
    (scale: number) => {
      const maxX = Math.max(0, ((scale - 1) * lightboxFrameWidth) / 2);
      const maxY = Math.max(0, ((scale - 1) * lightboxFrameHeight) / 2);
      return { maxX, maxY };
    },
    [lightboxFrameWidth, lightboxFrameHeight]
  );

  const showZoomIndicator = useCallback((scaleValue: number) => {
    const label = `${scaleValue.toFixed(1)}x`;
    setLightboxZoomLabel(label);
    if (zoomLabelTimeoutRef.current) {
      clearTimeout(zoomLabelTimeoutRef.current);
    }
    zoomLabelTimeoutRef.current = setTimeout(() => {
      setLightboxZoomLabel(null);
    }, ZOOM_INDICATOR_TIMEOUT);
  }, []);

  const animateScaleState = useCallback(
    (
      scaleState: {
        base: Animated.Value;
        baseX: Animated.Value;
        baseY: Animated.Value;
      },
      nextScale: number,
      nextX: number,
      nextY: number
    ) => {
      Animated.parallel([
        Animated.spring(scaleState.base, {
          toValue: nextScale,
          useNativeDriver: false,
          friction: 7,
          tension: 80,
        }),
        Animated.spring(scaleState.baseX, {
          toValue: nextX,
          useNativeDriver: false,
          friction: 7,
          tension: 80,
        }),
        Animated.spring(scaleState.baseY, {
          toValue: nextY,
          useNativeDriver: false,
          friction: 7,
          tension: 80,
        }),
      ]).start();
    },
    []
  );

  const resetScaleState = useCallback(
    (scaleState: (typeof lightboxScaleStates.current)[number], animate = true) => {
      scaleState.lastScale = LIGHTBOX_MIN_SCALE;
      scaleState.lastX = 0;
      scaleState.lastY = 0;
      scaleState.pinch.setValue(1);
      scaleState.panX.setValue(0);
      scaleState.panY.setValue(0);
      if (animate) {
        animateScaleState(scaleState, LIGHTBOX_MIN_SCALE, 0, 0);
      } else {
        scaleState.base.setValue(LIGHTBOX_MIN_SCALE);
        scaleState.baseX.setValue(0);
        scaleState.baseY.setValue(0);
      }
      setLightboxScrollEnabled(true);
    },
    [animateScaleState]
  );

  useEffect(() => {
    if (!lightboxVisible || lightboxFrameWidth <= 0 || lightboxFrameHeight <= 0) {
      return;
    }
    photos.forEach((photo, index) => {
      const scaleState = lightboxScaleStates.current[index];
      if (!scaleState || scaleState.maxScaleResolved) return;
      Image.getSize(
        photo.signedUrl,
        (width, height) => {
          scaleState.maxScale = getAdaptiveMaxScale(width, height);
          scaleState.maxScaleResolved = true;
        },
        () => {
          scaleState.maxScale = LIGHTBOX_MAX_SCALE;
          scaleState.maxScaleResolved = true;
        }
      );
    });
  }, [
    lightboxVisible,
    lightboxFrameWidth,
    lightboxFrameHeight,
    photos,
    getAdaptiveMaxScale,
  ]);
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
        maxScale: LIGHTBOX_MAX_SCALE,
        maxScaleResolved: false,
        baseX: new Animated.Value(0),
        baseY: new Animated.Value(0),
        panX: new Animated.Value(0),
        panY: new Animated.Value(0),
        lastX: 0,
        lastY: 0,
      });
    }
  }, [lightboxCount, lightboxIndex]);

  useEffect(() => {
    if (!lightboxVisible) return;
    const scaleState = lightboxScaleStates.current[lightboxIndex];
    if (!scaleState) return;
    setLightboxScrollEnabled(scaleState.lastScale <= LIGHTBOX_MIN_SCALE);
  }, [lightboxIndex, lightboxVisible]);

  useEffect(() => {
    if (!lightboxVisible) {
      setLightboxZoomLabel(null);
    }
  }, [lightboxVisible]);

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
      const invite = await roomInvitationService.createInvitation(roomState.id);
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

  const handleSelectRoom = (selectedRoom: Room, selectedExtras: RoomExtras | null) => {
    setRoomState(selectedRoom);
    setExtrasState(selectedExtras);
    setActivePhotoIndex(0);
    setLightboxIndex(0);
    setIsAssigned(false);
    setHasAssignments(false);
  };

  const hasMultipleRooms = allRooms.length > 1;

  const handleShareRoom = async () => {
    if (isSharing) return;
    try {
      setIsSharing(true);
      console.log('[RoomDetail] Share room', {
        roomId: roomState.id,
        title: roomState.title,
      });
      const normalizedPath = await shareService.getRoomShareImageFile(roomState.id);
      console.log('[RoomDetail] Share room image path', normalizedPath);
      const shareTitle = isCommonArea ? 'Compartir zona comun' : 'Compartir habitacion';
      await Share.open({
        title: shareTitle,
        url: normalizedPath,
        type: 'image/png',
        failOnCancel: false,
      });
    } catch (error) {
      console.error('Error compartiendo habitacion:', error);
      Alert.alert('Error', 'No se pudo compartir la habitacion');
    } finally {
      setIsSharing(false);
    }
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
        {hasMultipleRooms ? (
          <Pressable
            style={({ pressed }) => [
              styles.headerTitlePressable,
              pressed && styles.pressed,
            ]}
            onPress={() => setRoomSelectorVisible(true)}
          >
            <Text
              style={[styles.headerTitle, { color: theme.colors.text }]}
              numberOfLines={1}
            >
              {roomState.title}
            </Text>
            <Ionicons
              name="chevron-down"
              size={16}
              color={theme.colors.textSecondary}
            />
          </Pressable>
        ) : (
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            {roomState.title}
          </Text>
        )}
        {canShareRoom ? (
          <View style={styles.headerActions}>
            <Pressable
              style={({ pressed }) => [
                styles.headerAction,
                { backgroundColor: theme.colors.surfaceLight, borderColor: theme.colors.border },
                pressed && styles.pressed,
                isSharing && styles.headerActionDisabled,
              ]}
              onPress={handleShareRoom}
              disabled={isSharing}
            >
              <Ionicons
                name="share-social-outline"
                size={18}
                color={theme.colors.text}
              />
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.headerAction,
                { backgroundColor: theme.colors.surfaceLight, borderColor: theme.colors.border },
                pressed && styles.pressed,
              ]}
              onPress={() =>
                navigation.navigate('RoomInterests', {
                  roomId: roomState.id,
                  roomTitle: roomState.title,
                })
              }
            >
              <Ionicons name="people-outline" size={20} color={theme.colors.text} />
            </Pressable>
          </View>
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
                <View key={rule} style={styles.ruleRow}>
                  <RuleIcon rule={rule} size={16} color={theme.colors.textSecondary} />
                  <Text style={[styles.detailNoteText, detailNoteTextStyle]}>{rule}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {services.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, sectionTitleStyle]}>Servicios</Text>
            <View style={[styles.detailCard, detailCardStyle]}>
              {services.map((service) => (
                <View key={service.name} style={styles.serviceRow}>
                  <ServiceIcon serviceName={service.name} size={16} color={theme.colors.textSecondary} />
                  <Text style={[styles.detailNoteText, detailNoteTextStyle]}>
                    {service.name}
                    {service.price != null ? ` (${service.price} EUR)` : ''}
                  </Text>
                </View>
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
        <GestureHandlerRootView style={styles.lightboxOverlay}>
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
                const nextHeight = event.nativeEvent.layout.height;
                if (nextWidth !== lightboxFrameWidth) {
                  setLightboxFrameWidth(nextWidth);
                }
                if (nextHeight !== lightboxFrameHeight) {
                  setLightboxFrameHeight(nextHeight);
                }
              }}
            >
              {lightboxCount > 0 && lightboxFrameWidth > 0 && (
                <ScrollView
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  ref={lightboxScrollRef}
                  scrollEnabled={lightboxScrollEnabled}
                  onMomentumScrollEnd={handleLightboxScrollEnd}
                >
                  {photos.map((photo, index) => {
                    const scaleState = lightboxScaleStates.current[index];
                    const scale = scaleState
                      ? Animated.multiply(scaleState.base, scaleState.pinch)
                      : 1;
                    const translateX = scaleState
                      ? Animated.add(scaleState.baseX, scaleState.panX)
                      : 0;
                    const translateY = scaleState
                      ? Animated.add(scaleState.baseY, scaleState.panY)
                      : 0;
                    const onPinchEvent =
                      scaleState &&
                      Animated.event(
                        [{ nativeEvent: { scale: scaleState.pinch } }],
                        { useNativeDriver: false }
                      );
                    const onPinchStateChange = (event: any) => {
                      if (!scaleState) return;
                      const maxScale = scaleState.maxScale ?? LIGHTBOX_MAX_SCALE;
                      if (event.nativeEvent.state === State.ACTIVE) {
                        setLightboxScrollEnabled(false);
                      }
                      if (event.nativeEvent.oldState === State.ACTIVE) {
                        const rawScale =
                          scaleState.lastScale * event.nativeEvent.scale;
                        if (rawScale < LIGHTBOX_CLOSE_SCALE) {
                          Vibration.vibrate(10);
                          resetScaleState(scaleState, false);
                          setLightboxVisible(false);
                          return;
                        }
                        const clampedScale = clamp(
                          rawScale,
                          LIGHTBOX_MIN_SCALE,
                          maxScale
                        );
                        if (clampedScale !== rawScale) {
                          Vibration.vibrate(8);
                        }
                        scaleState.lastScale = clampedScale;
                        scaleState.pinch.setValue(1);
                        const { maxX, maxY } = getPanBounds(clampedScale);
                        const nextX = clamp(scaleState.lastX, -maxX, maxX);
                        const nextY = clamp(scaleState.lastY, -maxY, maxY);
                        scaleState.lastX = nextX;
                        scaleState.lastY = nextY;
                        animateScaleState(scaleState, clampedScale, nextX, nextY);
                        setLightboxScrollEnabled(
                          clampedScale <= LIGHTBOX_MIN_SCALE
                        );
                        showZoomIndicator(clampedScale);
                      }
                    };
                    const onPanEvent =
                      scaleState &&
                      Animated.event(
                        [
                          {
                            nativeEvent: {
                              translationX: scaleState.panX,
                              translationY: scaleState.panY,
                            },
                          },
                        ],
                        { useNativeDriver: false }
                      );
                    const onPanStateChange = (event: any) => {
                      if (!scaleState) return;
                      const isZoomed =
                        scaleState.lastScale > LIGHTBOX_MIN_SCALE;
                      if (event.nativeEvent.state === State.ACTIVE && isZoomed) {
                        setLightboxScrollEnabled(false);
                      }
                      if (event.nativeEvent.oldState === State.ACTIVE) {
                        if (isZoomed) {
                          const nextX =
                            scaleState.lastX + event.nativeEvent.translationX;
                          const nextY =
                            scaleState.lastY + event.nativeEvent.translationY;
                          const { maxX, maxY } = getPanBounds(
                            scaleState.lastScale
                          );
                          const clampedX = clamp(nextX, -maxX, maxX);
                          const clampedY = clamp(nextY, -maxY, maxY);
                          if (clampedX !== nextX || clampedY !== nextY) {
                            Vibration.vibrate(6);
                          }
                          scaleState.lastX = clampedX;
                          scaleState.lastY = clampedY;
                          Animated.parallel([
                            Animated.spring(scaleState.baseX, {
                              toValue: clampedX,
                              useNativeDriver: false,
                              friction: 7,
                              tension: 80,
                            }),
                            Animated.spring(scaleState.baseY, {
                              toValue: clampedY,
                              useNativeDriver: false,
                              friction: 7,
                              tension: 80,
                            }),
                          ]).start();
                        } else {
                          scaleState.lastX = 0;
                          scaleState.lastY = 0;
                          scaleState.baseX.setValue(0);
                          scaleState.baseY.setValue(0);
                        }
                        scaleState.panX.setValue(0);
                        scaleState.panY.setValue(0);
                        setLightboxScrollEnabled(
                          scaleState.lastScale <= LIGHTBOX_MIN_SCALE
                        );
                      }
                    };
                    const onDoubleTapStateChange = (event: any) => {
                      if (!scaleState) return;
                      if (event.nativeEvent.state === State.ACTIVE) {
                        const currentScale = scaleState.lastScale;
                        const maxScale = scaleState.maxScale ?? LIGHTBOX_MAX_SCALE;
                        let targetScale = LIGHTBOX_MIN_SCALE;
                        if (currentScale <= LIGHTBOX_MIN_SCALE + 0.05) {
                          targetScale = Math.min(maxScale, LIGHTBOX_DOUBLE_TAP_SCALE);
                        } else if (currentScale < maxScale - 0.05) {
                          targetScale = maxScale;
                        }
                        const tapX =
                          typeof event.nativeEvent.x === 'number'
                            ? event.nativeEvent.x
                            : lightboxFrameWidth / 2;
                        const tapY =
                          typeof event.nativeEvent.y === 'number'
                            ? event.nativeEvent.y
                            : lightboxFrameHeight / 2;
                        const focusX = tapX - lightboxFrameWidth / 2;
                        const focusY = tapY - lightboxFrameHeight / 2;
                        const { maxX, maxY } = getPanBounds(targetScale);
                        let nextX = clamp(
                          scaleState.lastX - focusX * (targetScale - currentScale),
                          -maxX,
                          maxX
                        );
                        let nextY = clamp(
                          scaleState.lastY - focusY * (targetScale - currentScale),
                          -maxY,
                          maxY
                        );
                        if (targetScale <= LIGHTBOX_MIN_SCALE + 0.05) {
                          nextX = 0;
                          nextY = 0;
                        }
                        scaleState.lastScale = targetScale;
                        scaleState.lastX = nextX;
                        scaleState.lastY = nextY;
                        scaleState.pinch.setValue(1);
                        scaleState.panX.setValue(0);
                        scaleState.panY.setValue(0);
                        animateScaleState(scaleState, targetScale, nextX, nextY);
                        setLightboxScrollEnabled(
                          targetScale <= LIGHTBOX_MIN_SCALE
                        );
                        showZoomIndicator(targetScale);
                        Vibration.vibrate(10);
                      }
                    };
                    return (
                      <TapGestureHandler
                        key={photo.path}
                        numberOfTaps={2}
                        onHandlerStateChange={onDoubleTapStateChange}
                      >
                        <PinchGestureHandler
                          onGestureEvent={onPinchEvent as any}
                          onHandlerStateChange={onPinchStateChange}
                        >
                          <PanGestureHandler
                            enabled={
                              !!scaleState &&
                              scaleState.lastScale > LIGHTBOX_MIN_SCALE
                            }
                            onGestureEvent={onPanEvent as any}
                            onHandlerStateChange={onPanStateChange}
                          >
                            <Animated.View
                              style={[
                                styles.lightboxSlide,
                                {
                                  width: lightboxFrameWidth,
                                  transform: [
                                    { scale },
                                    { translateX },
                                    { translateY },
                                  ],
                                },
                              ]}
                            >
                              <Image
                                source={{ uri: photo.signedUrl }}
                                style={styles.lightboxImage}
                              />
                            </Animated.View>
                          </PanGestureHandler>
                        </PinchGestureHandler>
                      </TapGestureHandler>
                    );
                  })}
                </ScrollView>
              )}
              {lightboxZoomLabel ? (
                <View style={styles.lightboxZoomChip}>
                  <Ionicons
                    name="search"
                    size={14}
                    color={theme.colors.textSecondary}
                  />
                  <Text style={styles.lightboxZoomText}>{lightboxZoomLabel}</Text>
                </View>
              ) : null}
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
        </GestureHandlerRootView>
      </Modal>

      <RoomSelector
        visible={roomSelectorVisible}
        onClose={() => setRoomSelectorVisible(false)}
        rooms={allRooms}
        extrasMap={allExtras}
        currentRoomId={roomState.id}
        onSelectRoom={handleSelectRoom}
      />
    </View>
  );
};
