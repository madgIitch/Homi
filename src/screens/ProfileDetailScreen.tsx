// @refresh reset
// src/screens/ProfileDetailScreen.tsx
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
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
  ImageBackground,
  Modal,
  Switch,
  NativeSyntheticEvent,
  NativeScrollEvent,
  TextInput,
  Animated,
  useWindowDimensions,
  Vibration,
  Pressable,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
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
import { sizes, spacing } from '../theme';
import { API_CONFIG } from '../config/api';
import { supabaseClient } from '../services/authService';
import { profileService } from '../services/profileService';
import { chatService } from '../services/chatService';
import { usePremium } from '../context/PremiumContext';
import { profilePhotoService } from '../services/profilePhotoService';
import { shareService } from '../services/shareService';
import { roomService } from '../services/roomService';
import { roomExtrasService } from '../services/roomExtrasService';
import { roomAssignmentService } from '../services/roomAssignmentService';
import { locationService } from '../services/locationService';
import { AuthContext } from '../context/AuthContext';
import { INTERESES_OPTIONS } from '../constants/swipeFilters';
import type { Profile, ProfilePhoto } from '../types/profile';
import type { Flat, Room, RoomExtras } from '../types/room';
import { ProfileDetailScreenStyles as styles } from '../styles/screens';
import { getUserName } from '../utils/name';
import { RuleIcon, ServiceIcon } from '../utils/iconUtils';
import {
  getMessageRequestUsage,
  incrementMessageRequestUsage,
  type MessageRequestUsage,
} from '../utils/messageRequests';

interface ProfileDetailScreenProps {
  userId?: string;
}

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

const interestLabelById = new Map(
  INTERESES_OPTIONS.map((option) => [option.id, option.label])
);

const LIGHTBOX_MIN_SCALE = 1;
const LIGHTBOX_MAX_SCALE = 3;
const LIGHTBOX_DOUBLE_TAP_SCALE = 2;
const LIGHTBOX_CLOSE_SCALE = 0.85;
const ZOOM_INDICATOR_TIMEOUT = 2500;
const MAX_REQUEST_CHARS = 280;
const MESSAGE_REQUEST_TIP_KEY = '@hm_message_request_tip_seen';

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));
const SHARE_THEME_OPTIONS = [
  { id: 'lavender', label: 'Lavanda' },
  { id: 'sunset', label: 'Atardecer' },
  { id: 'mint', label: 'Menta' },
  { id: 'ocean', label: 'Oceano' },
];

export const ProfileDetailScreen: React.FC<ProfileDetailScreenProps> = ({
  userId,
}) => {
  const theme = useTheme();
  const { isDark, toggleTheme } = useThemeController();
  const styleSheet = useMemo(() => styles(theme), [theme]);
  const { isPremium } = usePremium();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const headerFillStyle = useMemo(
    () => ({ backgroundColor: theme.colors.glassUltraLightAlt }),
    [theme.colors.glassUltraLightAlt]
  );
  const headerIconStyle = useMemo(
    () => ({
      backgroundColor: theme.colors.glassSurface,
      borderColor: theme.colors.glassBorderSoft,
    }),
    [theme.colors.glassBorderSoft, theme.colors.glassSurface]
  );
  const tabBaseStyle = useMemo(
    () => ({
      backgroundColor: theme.colors.glassUltraLightAlt,
      borderColor: theme.colors.glassBorderSoft,
    }),
    [theme.colors.glassBorderSoft, theme.colors.glassUltraLightAlt]
  );
  const tabActiveStyle = useMemo(
    () => ({
      backgroundColor: theme.colors.primaryTint,
      borderColor: theme.colors.primaryMuted,
    }),
    [theme.colors.primaryMuted, theme.colors.primaryTint]
  );
  const tabTextStyle = useMemo(
    () => ({ color: theme.colors.textSecondary }),
    [theme.colors.textSecondary]
  );
  const tabTextActiveStyle = useMemo(
    () => ({ color: theme.colors.primary }),
    [theme.colors.primary]
  );
  const badgeStyle = useMemo(
    () => ({
      backgroundColor: theme.colors.glassUltraLightAlt,
      borderColor: theme.colors.glassBorderSoft,
    }),
    [theme.colors.glassBorderSoft, theme.colors.glassUltraLightAlt]
  );
  const badgeTextStyle = useMemo(
    () => ({ color: theme.colors.text }),
    [theme.colors.text]
  );
  const badgeLightStyle = useMemo(
    () => ({
      backgroundColor: theme.colors.primaryTint,
      borderColor: theme.colors.primaryMuted,
    }),
    [theme.colors.primaryMuted, theme.colors.primaryTint]
  );
  const badgeLightTextStyle = useMemo(
    () => ({ color: theme.colors.primary }),
    [theme.colors.primary]
  );
  const compactChipStyle = useMemo(
    () => ({
      backgroundColor: theme.colors.glassSurface,
      borderColor: theme.colors.glassBorderSoft,
    }),
    [theme.colors.glassBorderSoft, theme.colors.glassSurface]
  );
  const compactChipTextStyle = useMemo(
    () => ({ color: theme.colors.text }),
    [theme.colors.text]
  );
  const flatCardStyle = useMemo(
    () => ({
      backgroundColor: theme.colors.glassSurface,
      borderColor: theme.colors.glassBorderSoft,
    }),
    [theme.colors.glassBorderSoft, theme.colors.glassSurface]
  );
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profilePhotos, setProfilePhotos] = useState<ProfilePhoto[]>([]);
  const [zoneNameById, setZoneNameById] = useState<Record<string, string>>({});
  const [zoneCityById, setZoneCityById] = useState<Record<string, string>>({});
  const [lightboxVisible, setLightboxVisible] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxFrameWidth, setLightboxFrameWidth] = useState(0);
  const [lightboxFrameHeight, setLightboxFrameHeight] = useState(0);
  const [lightboxScrollEnabled, setLightboxScrollEnabled] = useState(true);
  const [lightboxZoomLabel, setLightboxZoomLabel] = useState<string | null>(null);
  const [isSearchEnabled, setIsSearchEnabled] = useState(true);
  const [isTogglingSearch, setIsTogglingSearch] = useState(false);
  const [isRequestModalVisible, setIsRequestModalVisible] = useState(false);
  const [requestMessage, setRequestMessage] = useState('');
  const [isSendingRequest, setIsSendingRequest] = useState(false);
  const [requestUsage, setRequestUsage] = useState<MessageRequestUsage | null>(null);
  const [showRequestTip, setShowRequestTip] = useState(false);
  const lightboxScrollRef = useRef<ScrollView>(null);
  const scrollViewRef = useRef<ScrollView>(null);
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
  const [activeTab, setActiveTab] = useState<'perfil' | 'piso'>('perfil');
  const [flats, setFlats] = useState<Flat[]>([]);
  const [flatRooms, setFlatRooms] = useState<Room[]>([]);
  const [flatExtras, setFlatExtras] = useState<Record<string, RoomExtras | null>>({});
  const [flatLoading, setFlatLoading] = useState(false);
  const [flatAssignments, setFlatAssignments] = useState<Record<string, boolean>>({});
  const [flatHasAssignments, setFlatHasAssignments] = useState<
    Record<string, boolean>
  >({});
  const [flatAssignmentsToMe, setFlatAssignmentsToMe] = useState<
    Record<string, boolean>
  >({});
  const [hasAcceptedRoomForProfile, setHasAcceptedRoomForProfile] = useState(false);
  const [expandedRules, setExpandedRules] = useState<Record<string, boolean>>({});
  const [activeFlatIndex, setActiveFlatIndex] = useState(0);
  const [isSharing, setIsSharing] = useState(false);
  const [isShareConfigVisible, setIsShareConfigVisible] = useState(false);
  const [shareSelectedPhotoIds, setShareSelectedPhotoIds] = useState<string[]>([]);
  const [shareSelectedZoneIds, setShareSelectedZoneIds] = useState<string[]>([]);
  const [shareTheme, setShareTheme] = useState('lavender');
  const [shareInclude, setShareInclude] = useState({
    photos: true,
    bio: true,
    budget: true,
    zones: true,
    interests: true,
    availability: true,
    housing: true,
    age: true,
  });
  const activeFlat = useMemo(() => flats[activeFlatIndex] ?? null, [flats, activeFlatIndex]);
  const profileChannelRef = useRef<RealtimeChannel | null>(null);
  const photoChannelRef = useRef<RealtimeChannel | null>(null);
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);
  const acceptedAssignmentChannelRef = useRef<RealtimeChannel | null>(null);

  const navigation = useNavigation<StackNavigationProp<any>>();
  const parentType = navigation.getParent()?.getState()?.type;
  const bottomInset = useMemo(() => {
    if (parentType !== 'tab') {
      return insets.bottom;
    }
    const layoutPct = {
      tabBarTop: 0.87,
      tabBarBottom: 0.94,
    };
    const screenHeight = windowHeight + insets.top + insets.bottom;
    const rawTabBarBottom = Math.round(
      screenHeight * (1 - layoutPct.tabBarBottom)
    );
    const rawTabBarHeight = Math.max(
      0,
      Math.round(screenHeight * (layoutPct.tabBarBottom - layoutPct.tabBarTop))
    );
    const maxHeight = Math.max(0, windowHeight - insets.bottom);
    const tabBarHeight = Math.min(rawTabBarHeight, maxHeight);
    const maxBottom = Math.max(0, maxHeight - tabBarHeight);
    const tabBarBottom = Math.min(Math.max(0, rawTabBarBottom), maxBottom);
    return tabBarBottom + tabBarHeight;
  }, [insets.bottom, insets.top, parentType, windowHeight]);
  const route = useRoute();
  const authContext = useContext(AuthContext);
  const currentUserId = authContext?.user?.id ?? '';
  const routeParams = route as {
    params?: { profile?: Profile; fromMatch?: boolean; userId?: string };
  };
  const routeProfile = routeParams.params?.profile;
  const routeUserId = routeParams.params?.userId;
  const isFromMatch = Boolean(routeParams.params?.fromMatch);
  const isOwnProfile =
    (!routeProfile &&
      (!routeUserId && (!userId || userId === currentUserId))) ||
    routeProfile?.id === currentUserId;
  const assignmentChannelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }
      if (profileChannelRef.current) {
        supabaseClient.removeChannel(profileChannelRef.current);
        profileChannelRef.current = null;
      }
      if (photoChannelRef.current) {
        supabaseClient.removeChannel(photoChannelRef.current);
        photoChannelRef.current = null;
      }
      if (acceptedAssignmentChannelRef.current) {
        supabaseClient.removeChannel(acceptedAssignmentChannelRef.current);
        acceptedAssignmentChannelRef.current = null;
      }
      if (assignmentChannelRef.current) {
        supabaseClient.removeChannel(assignmentChannelRef.current);
        assignmentChannelRef.current = null;
      }
    };
  }, []);

  const toggleSearchEnabled = async () => {
    if (isTogglingSearch) return;
    const nextValue = !isSearchEnabled;
    setIsSearchEnabled(nextValue);
    setIsTogglingSearch(true);
    try {
      await profileService.updateProfile({ is_searchable: nextValue });
    } catch (error) {
      console.error('Error actualizando visibilidad:', error);
      setIsSearchEnabled(!nextValue);
      Alert.alert('Error', 'No se pudo actualizar tu visibilidad.');
    } finally {
      setIsTogglingSearch(false);
    }
  };

  const handleAccountOptions = () => {
    navigation.navigate('AccountOptions');
  };

  const handleBugReport = () => {
    navigation.navigate('BugReport');
  };

  const loadProfile = useCallback(async () => {
    try {
      const data = await profileService.getProfile();
      if (isMountedRef.current) {
        if (!data) {
          setProfile(null);
          setIsSearchEnabled(true);
          return;
        }
        setProfile(data);
        setIsSearchEnabled(data.is_searchable ?? true);
      }
    } catch (error) {
      console.error('Error cargando perfil:', error);
      Alert.alert('Error', 'No se pudo cargar el perfil');
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  const loadPhotos = useCallback(async () => {
    try {
      const data = await profilePhotoService.getPhotos();
      if (isMountedRef.current) {
        setProfilePhotos(data);
      }
    } catch (error) {
      console.error('Error cargando fotos:', error);
    }
  }, []);

  const loadProfileById = useCallback(async (profileId: string) => {
    try {
      const { data, error } = await supabaseClient
        .from('profiles')
        .select('*, users!profiles_id_fkey(birth_date, first_name, last_name)')
        .eq('id', profileId)
        .single();

      if (error || !data) {
        throw error || new Error('Perfil no encontrado');
      }

      const { users, ...profileData } = data as Profile & {
        users?: {
          birth_date?: string | null;
          first_name?: string | null;
          last_name?: string | null;
        };
      };
      const nextProfile: Profile = {
        ...profileData,
        birth_date: users?.birth_date ?? null,
        first_name: users?.first_name ?? profileData.first_name ?? null,
        last_name: users?.last_name ?? profileData.last_name ?? undefined,
      };
      if (isMountedRef.current) {
        setProfile(nextProfile);
      }
    } catch (error) {
      console.error('Error cargando perfil remoto:', error);
    }
  }, []);

  const loadProfilePhotosById = useCallback(
    async (profileId: string) => {
      try {
        const data = isOwnProfile
          ? await profilePhotoService.getPhotos()
          : await profilePhotoService.getPhotosForProfile(profileId);
        if (isMountedRef.current) {
          setProfilePhotos(data);
        }
      } catch (error) {
        console.error('Error cargando fotos de perfil:', error);
      }
    },
    [isOwnProfile]
  );

  const refreshProfileAndPhotos = useCallback(
    async (profileId: string) => {
      if (!profileId) return;
      if (isOwnProfile) {
        await loadProfile();
      } else {
        await loadProfileById(profileId);
      }
      await loadProfilePhotosById(profileId);
    },
    [isOwnProfile, loadProfile, loadProfileById, loadProfilePhotosById]
  );

  const scheduleProfileRefresh = useCallback(
    (profileId: string) => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      refreshTimeoutRef.current = setTimeout(() => {
        refreshProfileAndPhotos(profileId).catch(() => undefined);
      }, 400);
    },
    [refreshProfileAndPhotos]
  );

  useEffect(() => {
    if (routeProfile) {
      setProfile(routeProfile);
      setLoading(false);
      if (routeProfile.id && routeProfile.id !== currentUserId) {
        profilePhotoService
          .getPhotosForProfile(routeProfile.id)
          .then((data) => setProfilePhotos(data))
          .catch((error) =>
            console.error('Error cargando fotos externas:', error)
          );
        const hasNames = Boolean(routeProfile.first_name || routeProfile.last_name);
        if (!hasNames) {
          loadProfileById(routeProfile.id).catch((error) =>
            console.error('Error cargando perfil remoto:', error)
          );
        }
      } else {
        setProfilePhotos([]);
      }
      return;
    }

    const targetUserId = routeUserId ?? userId;
    if (targetUserId && targetUserId !== currentUserId) {
      setLoading(true);
      loadProfileById(targetUserId)
        .then(() => loadProfilePhotosById(targetUserId))
        .catch((error) =>
          console.error('Error cargando perfil remoto:', error)
        )
        .finally(() => {
          if (isMountedRef.current) {
            setLoading(false);
          }
        });
      return;
    }

    loadProfile();
    loadPhotos();
  }, [
    userId,
    routeProfile,
    routeUserId,
    currentUserId,
    loadProfile,
    loadPhotos,
    loadProfileById,
    loadProfilePhotosById,
  ]);

  const refreshAcceptedRoomForProfile = useCallback(async () => {
    if (isOwnProfile || !profile?.id || !currentUserId) {
      if (isMountedRef.current) {
        setHasAcceptedRoomForProfile(false);
      }
      return;
    }

    try {
      const { assignments } = await roomAssignmentService.getAssignmentsForAssignee();
      const hasAccepted = assignments.some(
        (assignment) => assignment.room?.owner_id === profile.id
      );
      if (isMountedRef.current) {
        setHasAcceptedRoomForProfile(hasAccepted);
      }
    } catch (error) {
      console.warn('Error comprobando asignaciones aceptadas:', error);
      if (isMountedRef.current) {
        setHasAcceptedRoomForProfile(false);
      }
    }
  }, [currentUserId, isOwnProfile, profile?.id]);

  useEffect(() => {
    if (isOwnProfile || !profile?.id || !currentUserId) {
      setHasAcceptedRoomForProfile(false);
      if (acceptedAssignmentChannelRef.current) {
        supabaseClient.removeChannel(acceptedAssignmentChannelRef.current);
        acceptedAssignmentChannelRef.current = null;
      }
      return;
    }

    let isMounted = true;
    const subscribeToAcceptedAssignments = async () => {
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        supabaseClient.realtime.setAuth(token);
      }

      if (acceptedAssignmentChannelRef.current) {
        supabaseClient.removeChannel(acceptedAssignmentChannelRef.current);
        acceptedAssignmentChannelRef.current = null;
      }

      const filter = `assignee_id=eq.${currentUserId}`;
      const channel = supabaseClient
        .channel(`room-assignments:viewer:${currentUserId}:${profile.id}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'room_assignments', filter },
          () => {
            if (!isMounted) return;
            refreshAcceptedRoomForProfile();
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'room_assignments', filter },
          () => {
            if (!isMounted) return;
            refreshAcceptedRoomForProfile();
          }
        )
        .on(
          'postgres_changes',
          { event: 'DELETE', schema: 'public', table: 'room_assignments', filter },
          () => {
            if (!isMounted) return;
            refreshAcceptedRoomForProfile();
          }
        )
        .subscribe();

      acceptedAssignmentChannelRef.current = channel;
    };

    refreshAcceptedRoomForProfile();
    subscribeToAcceptedAssignments().catch((error) => {
      console.warn('[ProfileDetail] Error suscribiendo asignaciones:', error);
    });

    return () => {
      isMounted = false;
      if (acceptedAssignmentChannelRef.current) {
        supabaseClient.removeChannel(acceptedAssignmentChannelRef.current);
        acceptedAssignmentChannelRef.current = null;
      }
    };
  }, [currentUserId, isOwnProfile, profile?.id, refreshAcceptedRoomForProfile]);

  useEffect(() => {
    let isActive = true;
    const loadZoneNames = async () => {
      const preferredZones = profile?.preferred_zones ?? [];
      if (preferredZones.length === 0) {
        if (isActive) {
          setZoneNameById({});
          setZoneCityById({});
        }
        return;
      }

      try {
        const entries = await Promise.all(
          preferredZones.map(async (zoneId) => {
            const place = await locationService.getPlaceById(zoneId);
            if (!place) return null;
            const cityId = place.city_id ?? null;
            const city =
              cityId ? await locationService.getCityById(cityId) : null;
            return {
              id: zoneId,
              name: place.name,
              cityName: city?.name ?? null,
            };
          })
        );
        if (!isActive) return;
        const nameMap: Record<string, string> = {};
        const cityMap: Record<string, string> = {};
        entries.forEach((entry) => {
          if (!entry) return;
          nameMap[entry.id] = entry.name;
          if (entry.cityName) {
            cityMap[entry.id] = entry.cityName;
          }
        });
        setZoneNameById(nameMap);
        setZoneCityById(cityMap);
      } catch (error) {
        console.warn('[ProfileDetail] Error cargando zonas:', error);
      }
    };

    loadZoneNames().catch((error) => {
      console.warn('[ProfileDetail] Error cargando zonas:', error);
    });
    return () => {
      isActive = false;
    };
  }, [profile?.preferred_zones]);

  useEffect(() => {
    const profileId = routeProfile?.id ?? userId ?? currentUserId;
    if (!profileId) return;
    let isMounted = true;

    const subscribeToProfileUpdates = async () => {
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        supabaseClient.realtime.setAuth(token);
      }

      if (profileChannelRef.current) {
        supabaseClient.removeChannel(profileChannelRef.current);
        profileChannelRef.current = null;
      }
      if (photoChannelRef.current) {
        supabaseClient.removeChannel(photoChannelRef.current);
        photoChannelRef.current = null;
      }

      const profileChannel = supabaseClient
        .channel(`profiles:${profileId}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${profileId}` },
          () => {
            if (!isMounted) return;
            scheduleProfileRefresh(profileId);
          }
        )
        .subscribe();

      const photoChannel = supabaseClient
        .channel(`profile-photos:${profileId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'profile_photos',
            filter: `profile_id=eq.${profileId}`,
          },
          () => {
            if (!isMounted) return;
            scheduleProfileRefresh(profileId);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'profile_photos',
            filter: `profile_id=eq.${profileId}`,
          },
          () => {
            if (!isMounted) return;
            scheduleProfileRefresh(profileId);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'profile_photos',
            filter: `profile_id=eq.${profileId}`,
          },
          () => {
            if (!isMounted) return;
            scheduleProfileRefresh(profileId);
          }
        )
        .subscribe();

      profileChannelRef.current = profileChannel;
      photoChannelRef.current = photoChannel;
    };

    subscribeToProfileUpdates().catch(() => undefined);

    return () => {
      isMounted = false;
      if (profileChannelRef.current) {
        supabaseClient.removeChannel(profileChannelRef.current);
        profileChannelRef.current = null;
      }
      if (photoChannelRef.current) {
        supabaseClient.removeChannel(photoChannelRef.current);
        photoChannelRef.current = null;
      }
    };
  }, [routeProfile?.id, userId, currentUserId, scheduleProfileRefresh]);

  const loadFlatData = useCallback(async () => {
    if (!profile?.id) {
      setActiveTab('perfil');
      setFlats([]);
      setFlatRooms([]);
      setFlatExtras({});
      setFlatAssignments({});
      setFlatHasAssignments({});
      setFlatAssignmentsToMe({});
      return;
    }

      try {
        setFlatLoading(true);
        const shouldLoadOwnedFlats =
          !isOwnProfile || profile.housing_situation === 'offering';
        if (shouldLoadOwnedFlats) {
          const [flatsData, roomsData] = await Promise.all([
            roomService.getFlatsByOwner(profile.id),
            roomService.getRoomsByOwner(profile.id),
          ]);
          setFlats(flatsData);
        setFlatRooms(roomsData);
        const extras = await roomExtrasService.getExtrasForRooms(
          roomsData.map((room) => room.id)
        );
        const extrasMap = Object.fromEntries(
          extras.map((extra) => [extra.room_id, extra])
        );
        setFlatExtras(extrasMap);
        const acceptedMap: Record<string, boolean> = {};
        const hasAssignmentsMap: Record<string, boolean> = {};
        await Promise.all(
          roomsData.map(async (roomItem) => {
            try {
              const assignmentsResponse =
                await roomAssignmentService.getAssignmentsForRoom(roomItem.id);
              hasAssignmentsMap[roomItem.id] =
                assignmentsResponse.assignments.length > 0 ||
                Boolean(assignmentsResponse.match_assignment);
              const hasAcceptedAssignment =
                assignmentsResponse.assignments.some(
                  (assignment) =>
                    assignment.status === 'accepted' && Boolean(assignment.assignee)
                ) ||
                (assignmentsResponse.match_assignment?.status === 'accepted' &&
                  Boolean(assignmentsResponse.match_assignment.assignee));
              if (hasAcceptedAssignment) {
                acceptedMap[roomItem.id] = true;
              }
            } catch (error) {
              console.warn(
                'No se pudo cargar asignaciones para la habitacion:',
                roomItem.id,
                error
              );
            }
          })
        );
        setFlatAssignments(acceptedMap);
          setFlatHasAssignments(hasAssignmentsMap);
          setFlatAssignmentsToMe({});
          return;
        }

        const assignmentsResponse =
          await roomAssignmentService.getAssignmentsForAssignee();
      const assignments = assignmentsResponse.assignments.filter(
        (assignment) => assignment.room?.flat?.id
      );
      const flatMap = new Map<string, Flat>();
      assignments.forEach((assignment) => {
        if (assignment.room?.flat) {
          flatMap.set(assignment.room.flat.id, assignment.room.flat);
        }
      });
      const flatsData = Array.from(flatMap.values());
      const flatIds = flatsData.map((flat) => flat.id);
      if (flatIds.length === 0) {
        setActiveTab('perfil');
        setFlats([]);
        setFlatRooms([]);
        setFlatExtras({});
        setFlatAssignments({});
        setFlatHasAssignments({});
        setFlatAssignmentsToMe({});
        return;
      }

      const roomsInFlats = await roomService.getRoomsByFlatIds(flatIds);
      setFlats(flatsData);
      setFlatRooms(roomsInFlats);
      const extras = await roomExtrasService.getExtrasForRooms(
        roomsInFlats.map((room) => room.id)
      );
      const extrasMap = Object.fromEntries(
        extras.map((extra) => [extra.room_id, extra])
      );
      setFlatExtras(extrasMap);
      const acceptedMap: Record<string, boolean> = {};
      const hasAssignmentsMap: Record<string, boolean> = {};
      const assignedToMeMap: Record<string, boolean> = {};
      assignments.forEach((assignment) => {
        if (assignment.room_id) {
          assignedToMeMap[assignment.room_id] = true;
        }
      });

      await Promise.all(
        roomsInFlats.map(async (roomItem) => {
          try {
            const roomAssignmentsResponse =
              await roomAssignmentService.getAssignmentsForRoom(roomItem.id);
            hasAssignmentsMap[roomItem.id] =
              roomAssignmentsResponse.assignments.length > 0 ||
              Boolean(roomAssignmentsResponse.match_assignment);
            const hasAcceptedAssignment =
              roomAssignmentsResponse.assignments.some(
                (assignment) =>
                  assignment.status === 'accepted' && Boolean(assignment.assignee)
              ) ||
              (roomAssignmentsResponse.match_assignment?.status === 'accepted' &&
                Boolean(roomAssignmentsResponse.match_assignment.assignee));
            if (hasAcceptedAssignment) {
              acceptedMap[roomItem.id] = true;
            }
          } catch (error) {
            console.warn(
              'No se pudo cargar asignaciones para la habitacion:',
              roomItem.id,
              error
            );
          }
        })
      );

      setFlatAssignments(acceptedMap);
      setFlatHasAssignments(hasAssignmentsMap);
      setFlatAssignmentsToMe(assignedToMeMap);
    } catch (error) {
      console.error('Error cargando piso:', error);
    } finally {
      setFlatLoading(false);
    }
  }, [profile?.id, profile?.housing_situation, isOwnProfile]);

  const toggleRules = (flatId: string) => {
    setExpandedRules((prev) => ({
      ...prev,
      [flatId]: !prev[flatId],
    }));
  };

  useEffect(() => {
    loadFlatData();
  }, [loadFlatData]);

  useEffect(() => {
    if (flats.length === 0) {
      setActiveFlatIndex(0);
      return;
    }
    setActiveFlatIndex((prev) =>
      prev >= flats.length ? flats.length - 1 : prev
    );
  }, [flats.length]);

  useFocusEffect(
    useCallback(() => {
      if (activeTab !== 'piso') return;
      loadFlatData();
    }, [activeTab, loadFlatData])
  );

  useEffect(() => {
    if (activeTab !== 'piso') {
      if (assignmentChannelRef.current) {
        supabaseClient.removeChannel(assignmentChannelRef.current);
        assignmentChannelRef.current = null;
      }
      return;
    }
    if (!profile?.id) return;

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

      let filter: string | null = null;
      if (profile.housing_situation === 'offering') {
        const roomIds = flatRooms.map((room) => room.id).filter(Boolean);
        if (roomIds.length === 0) return;
        filter =
          roomIds.length === 1
            ? `room_id=eq.${roomIds[0]}`
            : `room_id=in.(${roomIds.join(',')})`;
      } else if (isOwnProfile && currentUserId) {
        filter = `assignee_id=eq.${currentUserId}`;
      } else {
        return;
      }

      const channel = supabaseClient
        .channel(`room-assignments:piso:${profile.id}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'room_assignments', filter },
          () => {
            if (!isMounted) return;
            loadFlatData();
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'room_assignments', filter },
          () => {
            if (!isMounted) return;
            loadFlatData();
          }
        )
        .on(
          'postgres_changes',
          { event: 'DELETE', schema: 'public', table: 'room_assignments', filter },
          () => {
            if (!isMounted) return;
            loadFlatData();
          }
        )
        .subscribe();

      assignmentChannelRef.current = channel;
    };

    subscribeToAssignments().catch((error) => {
      console.warn('[ProfileDetail] Error suscribiendo asignaciones:', error);
    });

    return () => {
      isMounted = false;
      if (assignmentChannelRef.current) {
        supabaseClient.removeChannel(assignmentChannelRef.current);
        assignmentChannelRef.current = null;
      }
    };
  }, [
    activeTab,
    currentUserId,
    flatRooms,
    isOwnProfile,
    loadFlatData,
    profile?.housing_situation,
    profile?.id,
  ]);

  const handlePrevFlat = () => {
    if (flats.length <= 1) return;
    setActiveFlatIndex((prev) => (prev - 1 + flats.length) % flats.length);
  };

  const handleNextFlat = () => {
    if (flats.length <= 1) return;
    setActiveFlatIndex((prev) => (prev + 1) % flats.length);
  };

  const resolvedAvatarUrl =
    profile?.avatar_url && !profile.avatar_url.startsWith('http')
      ? `${API_CONFIG.SUPABASE_URL}/storage/v1/object/public/avatars/${profile.avatar_url}`
      : profile?.avatar_url;
  const carouselPhotos =
    profilePhotos.length > 0
      ? profilePhotos
      : resolvedAvatarUrl && profile
      ? [
          {
            id: 'avatar',
            profile_id: profile.id,
            path: resolvedAvatarUrl,
            position: 1,
            is_primary: true,
            signedUrl: resolvedAvatarUrl,
            created_at: profile.updated_at,
          },
        ]
      : [];
  const shareSelectablePhotos = carouselPhotos;
  const lightboxCount = carouselPhotos.length;

  useEffect(() => {
    return () => {
      if (zoomLabelTimeoutRef.current) {
        clearTimeout(zoomLabelTimeoutRef.current);
      }
    };
  }, []);

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
    if (!currentUserId) return;
    getMessageRequestUsage(currentUserId, isPremium)
      .then((usage) => setRequestUsage(usage))
      .catch(() => undefined);
  }, [currentUserId, isPremium]);

  useEffect(() => {
    if (!isRequestModalVisible || !currentUserId) return;
    getMessageRequestUsage(currentUserId, isPremium)
      .then((usage) => setRequestUsage(usage))
      .catch(() => undefined);
    const tipKey = `${MESSAGE_REQUEST_TIP_KEY}:${currentUserId}`;
    AsyncStorage.getItem(tipKey)
      .then((seen) => {
        if (!seen) {
          setShowRequestTip(true);
        }
      })
      .catch(() => undefined);
  }, [isRequestModalVisible, currentUserId, isPremium]);

  useEffect(() => {
    if (!lightboxVisible || lightboxFrameWidth <= 0 || lightboxFrameHeight <= 0) {
      return;
    }
    carouselPhotos.forEach((photo, index) => {
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
    carouselPhotos,
    getAdaptiveMaxScale,
  ]);

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

  const handleShareProfile = () => {
    if (!profile) return;
    const defaultPhotoIds = shareSelectablePhotos
      .slice(0, 4)
      .map((photo) => photo.id);
    const defaultZones = profile.preferred_zones ?? [];
    setShareSelectedPhotoIds(defaultPhotoIds);
    setShareSelectedZoneIds(defaultZones);
    setShareTheme('lavender');
    setShareInclude({
      photos: true,
      bio: true,
      budget: true,
      zones: true,
      interests: true,
      availability: true,
      housing: true,
      age: true,
    });
    setIsShareConfigVisible(true);
  };

  const handleConfirmShareProfile = async () => {
    if (isSharing || !profile) return;
    try {
      setIsSharing(true);
      const include = Object.entries(shareInclude)
        .filter(([, value]) => value)
        .map(([key]) => key);
      const filteredPhotoIds = shareSelectedPhotoIds.filter((id) => id !== 'avatar');
      console.log('[ProfileDetail] Share profile', {
        profileId: profile.id,
        include,
        photoIds: filteredPhotoIds,
        zoneIds: shareSelectedZoneIds,
        theme: shareTheme,
      });
      const normalizedPath = await shareService.getProfileShareImageFile(
        profile.id,
        {
          include,
          photoIds: filteredPhotoIds,
          zoneIds: shareSelectedZoneIds,
          theme: shareTheme,
        }
      );
      console.log('[ProfileDetail] Share image path', normalizedPath);
      setIsShareConfigVisible(false);
      await Share.open({
        title: 'Compartir perfil',
        url: normalizedPath,
        type: 'image/png',
        failOnCancel: false,
      });
    } catch (error) {
      console.error('Error compartiendo perfil:', error);
      Alert.alert('Error', 'No se pudo compartir el perfil');
    } finally {
      setIsSharing(false);
    }
  };

  const handleShareFlat = async () => {
    if (isSharing) return;
    if (!activeFlat) {
      Alert.alert('Aviso', 'No hay piso para compartir');
      return;
    }
    try {
      setIsSharing(true);
      console.log('[ProfileDetail] Share flat', {
        flatId: activeFlat.id,
        address: activeFlat.address,
      });
      const normalizedPath = await shareService.getFlatShareImageFile(activeFlat.id);
      console.log('[ProfileDetail] Share flat image path', normalizedPath);
      await Share.open({
        title: 'Compartir piso',
        url: normalizedPath,
        type: 'image/png',
        failOnCancel: false,
      });
    } catch (error) {
      console.error('Error compartiendo piso:', error);
      Alert.alert('Error', 'No se pudo compartir el piso');
    } finally {
      setIsSharing(false);
    }
  };

  const toggleSharePhoto = (photoId: string) => {
    if (!shareInclude.photos) return;
    setShareSelectedPhotoIds((prev) => {
      if (prev.includes(photoId)) {
        return prev.filter((id) => id !== photoId);
      }
      if (prev.length >= 4) {
        Alert.alert('Aviso', 'Puedes seleccionar hasta 4 fotos');
        return prev;
      }
      return [...prev, photoId];
    });
  };

  const toggleShareZone = (zoneId: string) => {
    if (!shareInclude.zones) return;
    setShareSelectedZoneIds((prev) => {
      if (prev.includes(zoneId)) {
        return prev.filter((id) => id !== zoneId);
      }
      return [...prev, zoneId];
    });
  };

  const handleSendRequest = async () => {
    if (!profile?.id) return;
    const trimmed = requestMessage.trim();
    if (!trimmed) {
      Alert.alert('Error', 'Escribe un mensaje para enviar la solicitud');
      return;
    }
    if (trimmed.length > MAX_REQUEST_CHARS) {
      Alert.alert('Error', `El mensaje no puede superar ${MAX_REQUEST_CHARS} caracteres`);
      return;
    }

    const sendRequest = async () => {
      setIsSendingRequest(true);
      try {
        const response = await chatService.sendMessageRequest(profile.id, trimmed);
        if (currentUserId) {
          const nextUsage = await incrementMessageRequestUsage(
            currentUserId,
            isPremium
          );
          setRequestUsage(nextUsage);
        }
        setIsRequestModalVisible(false);
        setRequestMessage('');
        navigation.navigate('Chat', {
          chatId: response.chatId,
          matchId: response.matchId,
          name: getUserName(profile, 'Usuario'),
          avatarUrl: resolvedAvatarUrl ?? '',
          profile,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        Alert.alert('Error', errorMessage || 'No se pudo enviar la solicitud');
      } finally {
        setIsSendingRequest(false);
      }
    };

    if (!isPremium) {
      Alert.alert(
        'Solicitud gratuita',
        'Esta es tu solicitud de prueba. ¿Quieres enviarla ahora?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Enviar', onPress: () => sendRequest() },
        ]
      );
      return;
    }

    await sendRequest();
  };

  if (loading) {
    return (
      <View style={styleSheet.loadingContainer}>
        <Text>Cargando perfil...</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styleSheet.loadingContainer}>
        <Text>No se encontro el perfil</Text>
      </View>
    );
  }

  const interests = profile.interests ?? [];
  const preferredZones = profile.preferred_zones ?? [];
  const interestLabels = interests.map(
    (interest) => interestLabelById.get(interest) ?? interest
  );
  const preferredZoneLabels = preferredZones.map((zone) => {
    const name = zoneNameById[zone] ?? zone;
    const city = zoneCityById[zone];
    return city ? `${name}, ${city}` : name;
  });
  const lifestyleDetails = [
    {
      key: 'schedule',
      label: 'Horario',
      value: profile.lifestyle_preferences?.schedule,
      icon: 'time-outline' as const,
    },
    {
      key: 'cleaning',
      label: 'Orden y limpieza',
      value: profile.lifestyle_preferences?.cleaning,
      icon: 'sparkles-outline' as const,
    },
    {
      key: 'guests',
      label: 'Visitas',
      value: profile.lifestyle_preferences?.guests,
      icon: 'people-outline' as const,
    },
    {
      key: 'smoking',
      label: 'Fumar',
      value: profile.lifestyle_preferences?.smoking,
      icon: 'cloud-outline' as const,
    },
    {
      key: 'pets',
      label: 'Mascotas',
      value: profile.lifestyle_preferences?.pets,
      icon: 'paw-outline' as const,
    },
  ];

  const formatBudget = () => {
    if (profile.budget_min != null && profile.budget_max != null) {
      return `${profile.budget_min} - ${profile.budget_max} EUR`;
    }
    if (profile.budget_min != null) {
      return `Desde ${profile.budget_min} EUR`;
    }
    if (profile.budget_max != null) {
      return `Hasta ${profile.budget_max} EUR`;
    }
    return '-';
  };


  const aboutText = profile.bio ?? 'Sin descripcion por ahora.';
  const requestCharCount = requestMessage.trim().length;
  const requestLimitText = requestUsage
    ? isPremium
      ? `Premium: ${requestUsage.remaining} de ${requestUsage.limit} ${requestUsage.periodLabel}`
      : `Gratis: ${requestUsage.remaining} de ${requestUsage.limit} ${requestUsage.periodLabel}`
    : isPremium
    ? 'Premium: 3 solicitudes/semana'
    : 'Gratis: 1 solicitud de prueba';
  const housingBadge =
    profile.housing_situation === 'offering'
      ? profile.is_seeking
        ? 'Ofrezco y busco'
        : 'Ofrezco piso'
      : profile.housing_situation === 'seeking'
      ? 'Busco piso'
      : null;
  const memberSinceYear = profile.created_at
    ? new Date(profile.created_at).getFullYear()
    : null;
  const bottomActionsHeight = sizes.s58 + spacing.sm + spacing.lg;
  const bottomActionsInset =
    !isOwnProfile && !isFromMatch
      ? bottomActionsHeight + bottomInset
      : bottomInset;
  const contentBottomInset =
    bottomActionsInset + spacing.lg + spacing.s20 + (isOwnProfile ? sizes.s58 : 0);
  const shouldShowFlatTab =
    profile.housing_situation === 'offering' ||
    (isOwnProfile && flats.length > 0) ||
    (!isOwnProfile && hasAcceptedRoomForProfile);

  const handleLightboxPrev = () => {
    if (lightboxCount <= 1) return;
    setLightboxIndex((prev) => (prev - 1 + lightboxCount) % lightboxCount);
  };

  const handleLightboxNext = () => {
    if (lightboxCount <= 1) return;
    setLightboxIndex((prev) => (prev + 1) % lightboxCount);
  };
  const normalizedOccupation = profile.occupation?.trim() ?? '';
  const normalizedUniversity = profile.university?.trim() ?? '';
  const showOccupation =
    !normalizedUniversity ||
    !normalizedOccupation ||
    normalizedOccupation.toLowerCase() !== 'universidad';
  const infoChips = [
    showOccupation ? profile.occupation ?? null : null,
    profile.university ?? null,
    formatBudget() !== '-' ? formatBudget() : null,
  ].filter((item): item is string => Boolean(item));
  const personalInfo = [showOccupation ? profile.occupation ?? null : null].filter(
    (item): item is string => Boolean(item)
  );
  const academicInfo = [profile.university ?? null].filter(
    (item): item is string => Boolean(item)
  );
  const economicInfo = [formatBudget() !== '-' ? formatBudget() : null].filter(
    (item): item is string => Boolean(item)
  );
  const showCategoryInfo =
    personalInfo.length + academicInfo.length + economicInfo.length > 0;
  const categoryCards = [
    {
      title: 'Informacion personal',
      icon: 'briefcase-outline',
      items: personalInfo,
      color: theme.colors.primary,
    },
    {
      title: 'Informacion academica',
      icon: 'school-outline',
      items: academicInfo,
      color: theme.colors.indigo,
    },
    {
      title: 'Informacion economica',
      icon: 'wallet-outline',
      items: economicInfo,
      color: theme.colors.successDark,
    },
  ];
  const lifestyleChips = lifestyleDetails.filter((item) => item.value);
  const interestChips = interestLabels.filter(
    (item): item is string => Boolean(item)
  );
  const profileProgress = (() => {
    const hasPhoto = profilePhotos.length > 0 || Boolean(profile.avatar_url);
    const hasName = getUserName(profile, '').trim().length > 0;
    const hasBio = Boolean(profile.bio?.trim());
    const hasOccupation = Boolean(
      profile.occupation?.trim() ||
        profile.university?.trim() ||
        profile.field_of_study?.trim()
    );
    const hasInterests = interests.length > 0;
    const hasLifestyle = Boolean(
      profile.lifestyle_preferences &&
        Object.values(profile.lifestyle_preferences).some((value) => Boolean(value))
    );
    const showZones =
      profile.housing_situation === 'seeking' || profile.is_seeking === true;

    const items = [
      { id: 'photo', complete: hasPhoto },
      { id: 'name', complete: hasName },
      { id: 'bio', complete: hasBio },
      { id: 'occupation', complete: hasOccupation },
      { id: 'interests', complete: hasInterests },
      { id: 'lifestyle', complete: hasLifestyle },
    ];

    if (showZones) {
      items.push({ id: 'zones', complete: preferredZones.length > 0 });
    }

    const completedCount = items.filter((item) => item.complete).length;
    const totalCount = items.length;
    const progress =
      totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    return { completedCount, totalCount, progress };
  })();

  return (
    <View style={[styleSheet.container, { backgroundColor: theme.colors.surfaceMutedAlt }]}>
      <ImageBackground
        source={{
          uri: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1200&q=80',
        }}
        blurRadius={18}
        style={styleSheet.background}
      >
        <LinearGradient
          colors={[theme.colors.glassOverlay, theme.colors.glassWarmStrong]}
          style={StyleSheet.absoluteFillObject}
        />
      </ImageBackground>
      <View
          style={[
            styleSheet.header,
            {
              paddingTop: insets.top + spacing.md,
              paddingBottom: spacing.md,
              borderBottomColor: theme.colors.glassBorderSoft,
            },
          ]}
        >
        <BlurView
          blurType="light"
          blurAmount={16}
          reducedTransparencyFallbackColor={theme.colors.glassOverlay}
          style={StyleSheet.absoluteFillObject}
        />
          <View style={[styleSheet.headerFill, headerFillStyle]} />
          <TouchableOpacity
            style={[styleSheet.headerIconButton, headerIconStyle]}
            onPress={() => {
              if (navigation.canGoBack()) {
                navigation.goBack();
              }
            }}
          >
            <Ionicons name="chevron-back" size={20} color={theme.colors.text} />
          </TouchableOpacity>
        <Text style={[styleSheet.headerTitle, { color: theme.colors.text }]}>
          Perfil
        </Text>
        {isOwnProfile ? (
          <View style={styleSheet.headerActions}>
            {!(activeTab === 'piso' && profile.housing_situation !== 'offering') ? (
                <TouchableOpacity
                  style={[styleSheet.headerIconButton, headerIconStyle]}
                  onPress={() =>
                    activeTab === 'piso'
                      ? navigation.navigate('RoomManagement')
                      : navigation.navigate('EditProfile')
                  }
                >
                    <Ionicons name="create-outline" size={18} color={theme.colors.text} />
                  </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                style={[
                  styleSheet.headerIconButton,
                  headerIconStyle,
                  (isSharing || (activeTab === 'piso' && !activeFlat)) &&
                    styleSheet.headerIconButtonDisabled,
                ]}
                onPress={activeTab === 'piso' ? handleShareFlat : handleShareProfile}
                disabled={isSharing || (activeTab === 'piso' && !activeFlat)}
              >
                <Ionicons name="share-social-outline" size={18} color={theme.colors.text} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styleSheet.headerIconButton, headerIconStyle]}
                onPress={toggleTheme}
              >
              <Ionicons
                name={isDark ? 'sunny-outline' : 'moon-outline'}
                size={18}
                color={theme.colors.text}
              />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styleSheet.headerSpacer} />
        )}
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styleSheet.content}
        contentContainerStyle={{
          paddingBottom: contentBottomInset,
        }}
        showsVerticalScrollIndicator={false}
      >
        {shouldShowFlatTab && (
          <View style={styleSheet.tabsContainer}>
              <TouchableOpacity
                style={[
                  styleSheet.tabButton,
                  tabBaseStyle,
                  activeTab === 'perfil' && styleSheet.tabButtonActive,
                  activeTab === 'perfil' && tabActiveStyle,
                ]}
                onPress={() => setActiveTab('perfil')}
              >
                <Text
                  style={[
                    styleSheet.tabText,
                    tabTextStyle,
                    activeTab === 'perfil' && styleSheet.tabTextActive,
                    activeTab === 'perfil' && tabTextActiveStyle,
                  ]}
                >
                  Perfil
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styleSheet.tabButton,
                  tabBaseStyle,
                  activeTab === 'piso' && styleSheet.tabButtonActive,
                  activeTab === 'piso' && tabActiveStyle,
                ]}
                onPress={() => setActiveTab('piso')}
              >
                <Text
                  style={[
                    styleSheet.tabText,
                    tabTextStyle,
                    activeTab === 'piso' && styleSheet.tabTextActive,
                    activeTab === 'piso' && tabTextActiveStyle,
                  ]}
                >
                  Piso
                </Text>
              </TouchableOpacity>
          </View>
        )}

        {activeTab === 'perfil' && (
          <>
        <View
          style={[
            styleSheet.identityCard,
            {
              backgroundColor: theme.colors.glassSurface,
              borderColor: theme.colors.glassBorderSoft,
            },
          ]}
        >
          <TouchableOpacity
            style={styleSheet.avatarWrap}
            activeOpacity={0.8}
            disabled={!carouselPhotos[0]?.signedUrl}
            onPress={() => {
              if (!carouselPhotos[0]?.signedUrl) return;
              setLightboxIndex(0);
              setLightboxVisible(true);
            }}
          >
            {carouselPhotos[0]?.signedUrl ? (
              <Image
                source={{ uri: carouselPhotos[0].signedUrl }}
                style={styleSheet.avatarImage}
              />
            ) : (
              <View style={styleSheet.avatarPlaceholder}>
                <Ionicons name="person" size={26} color={theme.colors.textTertiary} />
              </View>
            )}
          </TouchableOpacity>
          <Text style={styleSheet.identityName}>{getUserName(profile, 'Usuario')}</Text>
            <View style={styleSheet.identityBadges}>
              {memberSinceYear ? (
                <View style={[styleSheet.identityBadge, badgeStyle]}>
                  <Ionicons name="shield-checkmark" size={14} color={theme.colors.text} />
                  <Text style={[styleSheet.identityBadgeText, badgeTextStyle]}>
                    Miembro desde {memberSinceYear}
                  </Text>
                </View>
              ) : null}
            {housingBadge ? (
                <View style={[styleSheet.identityBadgeLight, badgeLightStyle]}>
                  <Text style={[styleSheet.identityBadgeLightText, badgeLightTextStyle]}>
                    {housingBadge}
                  </Text>
                </View>
              ) : null}
            {isPremium ? (
              <View style={[styleSheet.identityBadge, badgeStyle]}>
                <Ionicons name="sparkles" size={14} color={theme.colors.primary} />
                <Text style={[styleSheet.identityBadgeText, badgeTextStyle]}>
                  Premium
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[styleSheet.identityBadge, badgeStyle]}
                onPress={() => navigation.navigate('Subscription')}
                activeOpacity={0.8}
              >
                <Ionicons name="person-outline" size={14} color={theme.colors.text} />
                <Text style={[styleSheet.identityBadgeText, badgeTextStyle]}>
                  Gratis
                </Text>
              </TouchableOpacity>
            )}
            </View>
            {isOwnProfile && (
              <View style={styleSheet.profileProgressBar}>
                <View
                  style={[
                    styleSheet.profileProgressTrack,
                    { backgroundColor: theme.colors.glassBorderSoft },
                  ]}
                >
                  <View
                    style={[
                      styleSheet.profileProgressFill,
                      {
                        width: `${profileProgress.progress}%`,
                        backgroundColor: theme.colors.primary,
                      },
                    ]}
                  />
                </View>
              </View>
            )}
            {isOwnProfile && (
              <View style={styleSheet.profileStatusRow}>
                <View style={styleSheet.profileStatusTextRow}>
                  <View
                    style={[
                      styleSheet.statusDot,
                      isSearchEnabled
                        ? styleSheet.statusDotActive
                        : styleSheet.statusDotInactive,
                    ]}
                  />
                  <Text style={[styleSheet.profileStatusText, { color: theme.colors.text }]}>
                    {isSearchEnabled ? 'Perfil activo' : 'Perfil inactivo'}
                  </Text>
                  <TouchableOpacity
                    style={[
                      styleSheet.toggleContainer,
                      isSearchEnabled ? styleSheet.toggleActive : styleSheet.toggleInactive,
                    ]}
                    onPress={toggleSearchEnabled}
                    disabled={isTogglingSearch}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styleSheet.toggleThumb,
                        isSearchEnabled ? styleSheet.thumbActive : styleSheet.thumbInactive,
                      ]}
                    />
                  </TouchableOpacity>
                </View>
                <Text style={[styleSheet.profileStatusSubtext, { color: theme.colors.textSecondary }]}>
                  {isSearchEnabled
                    ? 'Aparecer\u00e1s en b\u00fasquedas y swipes'
                    : 'No aparecer\u00e1s en b\u00fasquedas'}
                </Text>
              </View>
            )}
        </View>

        <View style={styleSheet.section}>
          <View style={styleSheet.sectionHeader}>
            <Ionicons name="person" size={20} color={theme.colors.text} />
            <Text style={[styleSheet.sectionTitle, { color: theme.colors.text }]}>
              Sobre
            </Text>
          </View>
          <View
            style={[
              styleSheet.detailCard,
              {
                backgroundColor: theme.colors.glassSurface,
                borderColor: theme.colors.glassBorderSoft,
              },
            ]}
          >
            <Text style={styleSheet.aboutText}>{aboutText}</Text>
          </View>
        </View>

        {showCategoryInfo && (
          <View style={styleSheet.section}>
            <Text
              style={[styleSheet.sectionMutedTitle, { color: theme.colors.textSecondary }]}
            >
              Datos clave
            </Text>
            <View style={styleSheet.categoryGrid}>
              {categoryCards
                .filter((card) => card.items.length > 0)
                .map((card) => (
                  <View
                    key={card.title}
                    style={[styleSheet.categoryCard, { borderColor: card.color }]}
                  >
                    <View style={styleSheet.categoryHeader}>
                      <Ionicons name={card.icon} size={16} color={card.color} />
                      <Text style={[styleSheet.categoryTitle, { color: card.color }]}>
                        {card.title}
                      </Text>
                    </View>
                    <View style={styleSheet.categoryItems}>
                      {card.items.map((item, index) => (
                        <Text key={`${card.title}-${index}`} style={styleSheet.categoryItem}>
                          {item}
                        </Text>
                      ))}
                    </View>
                  </View>
                ))}
            </View>
          </View>
        )}

        {lifestyleChips.length > 0 && (
          <View style={styleSheet.section}>
            <Text
              style={[styleSheet.sectionMutedTitle, { color: theme.colors.textSecondary }]}
            >
              Estilo de vida
            </Text>
            <View style={styleSheet.compactChips}>
                {lifestyleChips.map((chip) => (
                  <View
                    key={chip.key}
                    style={[
                      styleSheet.compactChip,
                      compactChipStyle,
                    ]}
                  >
                  <Ionicons
                    name={chip.icon}
                    size={12}
                    color={theme.colors.textSecondary}
                    style={styleSheet.chipIcon}
                  />
                    <Text
                      style={[styleSheet.compactChipText, compactChipTextStyle]}
                    >
                      {chip.label}: {chip.value}
                    </Text>
                  </View>
                ))}
            </View>
          </View>
        )}

        {interestChips.length > 0 && (
          <View style={styleSheet.section}>
            <Text
              style={[styleSheet.sectionMutedTitle, { color: theme.colors.textSecondary }]}
            >
              Intereses
            </Text>
            <View style={styleSheet.compactChips}>
                {interestChips.map((chip, index) => (
                  <View
                    key={`${chip}-${index}`}
                    style={[
                      styleSheet.compactChip,
                      compactChipStyle,
                    ]}
                  >
                    <Text
                      style={[styleSheet.compactChipText, compactChipTextStyle]}
                    >
                      {chip}
                    </Text>
                  </View>
                ))}
            </View>
          </View>
        )}

        {preferredZoneLabels.length > 0 && (
          <View style={styleSheet.section}>
            <Text
              style={[styleSheet.sectionMutedTitle, { color: theme.colors.textSecondary }]}
            >
              Zonas de búsqueda
            </Text>
            <View style={styleSheet.compactChips}>
                {preferredZoneLabels.map((zone, index) => (
                  <View
                    key={`${zone}-${index}`}
                    style={[
                      styleSheet.compactChip,
                      compactChipStyle,
                    ]}
                  >
                    <Text
                      style={[styleSheet.compactChipText, compactChipTextStyle]}
                    >
                      {zone}
                    </Text>
                  </View>
                ))}
            </View>
          </View>
        )}

        {carouselPhotos.length > 0 && (
          <View style={styleSheet.section}>
            <View style={styleSheet.sectionHeader}>
              <Ionicons name="images-outline" size={18} color={theme.colors.text} />
              <Text style={[styleSheet.sectionTitle, { color: theme.colors.text }]}>
                Momentos
              </Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styleSheet.photoScroller}
            >
              {carouselPhotos.map((photo, index) => (
                <TouchableOpacity
                  key={photo.id ?? photo.path ?? photo.signedUrl ?? `photo-${index}`}
                  style={styleSheet.photoTileWide}
                  onPress={() => {
                    setLightboxIndex(index);
                    setLightboxVisible(true);
                  }}
                >
                  <Image source={{ uri: photo.signedUrl }} style={styleSheet.photoTileImage} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {isOwnProfile && (
          <View style={styleSheet.section}>
            <View style={{ gap: spacing.s12 }}>
              <TouchableOpacity
                style={styleSheet.manageSubscriptionButton}
                onPress={handleAccountOptions}
              >
                <Ionicons name="settings-outline" size={18} color={theme.colors.text} />
                <Text style={styleSheet.manageSubscriptionText}>
                  Opciones de cuenta
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styleSheet.manageSubscriptionButton}
                onPress={handleBugReport}
              >
                <Ionicons name="bug-outline" size={18} color={theme.colors.text} />
                <Text style={styleSheet.manageSubscriptionText}>
                  Reportar un problema
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

          </>
        )}

        {activeTab === 'piso' && (
          <View style={styleSheet.section}>
            <View style={styleSheet.sectionHeader}>
              <Ionicons name="home" size={20} color={theme.colors.text} />
              <Text style={[styleSheet.sectionTitle, { color: theme.colors.text }]}>
                Piso
              </Text>
              {flats.length > 1 && (
                <View style={styleSheet.flatPager}>
                  <TouchableOpacity
                    style={styleSheet.flatPagerButton}
                    onPress={handlePrevFlat}
                  >
                    <Ionicons name="chevron-back" size={18} color={theme.colors.text} />
                  </TouchableOpacity>
                  <Text style={styleSheet.flatPagerText}>
                    {activeFlatIndex + 1}/{flats.length}
                  </Text>
                  <TouchableOpacity
                    style={styleSheet.flatPagerButton}
                    onPress={handleNextFlat}
                  >
                    <Ionicons name="chevron-forward" size={18} color={theme.colors.text} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
            {flatLoading ? (
              <Text style={styleSheet.mutedText}>Cargando piso...</Text>
            ) : flats.length === 0 ? (
              <Text style={styleSheet.mutedText}>No hay piso publicado.</Text>
            ) : (
              <View style={styleSheet.flatList}>
                {(() => {
                  const flat = flats[activeFlatIndex];
                  if (!flat) return null;
                  const roomsForFlat = flatRooms.filter(
                    (room) => room.flat_id === flat.id
                  );
                  const commonAreas = roomsForFlat.filter(
                    (room) => flatExtras[room.id]?.category === 'area_comun'
                  );
                  const bedrooms = roomsForFlat.filter(
                    (room) => flatExtras[room.id]?.category !== 'area_comun'
                  );
                  const rules = flat.rules
                    ? flat.rules
                        .split('\n')
                        .map((item) => item.trim())
                        .filter(Boolean)
                    : [];
                  const services = flat.services ?? [];
                  const isExpanded = expandedRules[flat.id] ?? false;
                  const visibleRules = isExpanded ? rules : rules.slice(0, 3);
                  const canToggleRules = rules.length > 3;

                  return (
                      <View
                        key={flat.id}
                        style={[
                          styleSheet.flatCard,
                          flatCardStyle,
                        ]}
                      >
                      <Text style={styleSheet.flatTitle}>{flat.address}</Text>
                      <Text style={styleSheet.flatMeta}>
                        {flat.city}
                        {flat.district ? ` - ${flat.district}` : ''}
                      </Text>

                      <View style={styleSheet.flatInfoBlock}>
                        <Text style={styleSheet.flatSectionTitle}>Info del piso</Text>
                        <View style={styleSheet.locationRow}>
                          <View
                            style={[
                              styleSheet.locationChip,
                              {
                                backgroundColor: theme.colors.glassSurface,
                                borderColor: theme.colors.glassBorderSoft,
                              },
                            ]}
                          >
                            <Ionicons
                              name="location-outline"
                              size={14}
                              color={theme.colors.textStrong}
                            />
                            <Text style={styleSheet.locationChipText}>
                              {flat.district || flat.city}
                            </Text>
                          </View>
                          {typeof flat.capacity_total === 'number' ? (
                            <View
                              style={[
                                styleSheet.locationChip,
                                {
                                  backgroundColor: theme.colors.glassSurface,
                                  borderColor: theme.colors.glassBorderSoft,
                                },
                              ]}
                            >
                              <Ionicons
                                name="people-outline"
                                size={14}
                                color={theme.colors.textStrong}
                              />
                              <Text style={styleSheet.locationChipText}>
                                {flat.capacity_total} plazas
                              </Text>
                            </View>
                          ) : null}
                        </View>

                        {rules.length > 0 && (
                          <View style={styleSheet.flatSubSection}>
                            <Text style={styleSheet.flatSubTitle}>Reglas</Text>
                            <View style={styleSheet.listContainer}>
                              {visibleRules.map((rule, index) => (
                                <View key={`${rule}-${index}`} style={styleSheet.listItemRow}>
                                  <RuleIcon rule={rule} size={16} color={theme.colors.textSecondary} />
                                  <Text style={styleSheet.listItemText}>{rule}</Text>
                                </View>
                              ))}
                            </View>
                            {canToggleRules && (
                              <TouchableOpacity
                                style={styleSheet.rulesToggle}
                                onPress={() => toggleRules(flat.id)}
                              >
                                <Text style={styleSheet.rulesToggleText}>
                                  {isExpanded ? 'Ver menos' : 'Ver todas'}
                                </Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        )}

                        {services.length > 0 && (
                          <View style={styleSheet.flatSubSection}>
                            <Text style={styleSheet.flatSubTitle}>Servicios</Text>
                            <View style={styleSheet.listContainer}>
                              {services.map((service, index) => (
                                <View
                                  key={service.name ? `${service.name}-${index}` : `service-${index}`}
                                  style={styleSheet.listItemRow}
                                >
                                  <ServiceIcon serviceName={service.name} size={16} color={theme.colors.textSecondary} />
                                  <Text style={styleSheet.listItemText}>
                                    {service.name}
                                    {service.price != null ? ` (${service.price} EUR)` : ''}
                                  </Text>
                                </View>
                              ))}
                            </View>
                          </View>
                        )}
                      </View>

                      {bedrooms.length > 0 && (
                        <View style={styleSheet.flatSection}>
                          <Text style={styleSheet.flatSectionTitle}>Habitaciones</Text>
                          <View style={styleSheet.roomList}>
                            {bedrooms.map((room) => {
                              const extras = flatExtras[room.id];
                              const photo = extras?.photos?.[0]?.signedUrl ?? '';
                              const typeLabel = extras?.room_type
                                ? roomTypeLabel.get(extras.room_type) ?? extras.room_type
                                : '';
                              const hasAssignments = flatHasAssignments[room.id];
                              const statusLabel = flatAssignmentsToMe[room.id]
                                ? 'Ocupada por ti'
                                : flatAssignments[room.id]
                                ? 'Ocupada'
                                : room.is_available === true
                                ? 'Disponible'
                                : room.is_available === false
                                ? hasAssignments
                                  ? 'Ocupada'
                                  : 'Disponible'
                                : 'Sin estado';
                              const isAvailable = statusLabel === 'Disponible';
                              const isUnknown = statusLabel === 'Sin estado';
                              return (
                                <TouchableOpacity
                                  key={room.id}
                                  style={[
                                    styleSheet.roomCard,
                                    {
                                      backgroundColor: theme.colors.glassSurface,
                                      borderColor: theme.colors.glassBorderSoft,
                                    },
                                  ]}
                                  onPress={() =>
                                    navigation.navigate('RoomDetail', {
                                      room,
                                      extras,
                                      flat,
                                    })
                                  }
                                >
                                  {photo ? (
                                    <Image
                                      source={{ uri: photo }}
                                      style={styleSheet.roomPhoto}
                                    />
                                  ) : (
                                    <View
                                      style={[
                                        styleSheet.roomPhotoPlaceholder,
                                        { backgroundColor: theme.colors.surfaceLight },
                                      ]}
                                    >
                                      <Ionicons
                                        name="image-outline"
                                        size={20}
                                        color={theme.colors.textTertiary}
                                      />
                                    </View>
                                  )}
                                  <View style={styleSheet.roomInfo}>
                                    <View style={styleSheet.roomHeader}>
                                      <Text style={styleSheet.roomTitle}>{room.title}</Text>
                                      {room.price_per_month != null ? (
                                        <Text style={styleSheet.roomPrice}>
                                          {room.price_per_month} EUR/mes
                                        </Text>
                                      ) : null}
                                    </View>
                                    {typeLabel ? (
                                      <Text style={styleSheet.roomMeta}>
                                        Tipo: {typeLabel}
                                      </Text>
                                    ) : null}
                                    <View style={styleSheet.roomFooter}>
                                      <View
                                        style={[
                                          styleSheet.statusBadge,
                                          isAvailable
                                            ? styleSheet.statusAvailable
                                            : isUnknown
                                            ? styleSheet.statusNeutral
                                            : styleSheet.statusOccupied,
                                        ]}
                                      >
                                        <Text
                                          style={[
                                            styleSheet.statusText,
                                            isAvailable
                                              ? styleSheet.statusAvailableText
                                              : isUnknown
                                              ? styleSheet.statusNeutralText
                                              : styleSheet.statusOccupiedText,
                                          ]}
                                        >
                                          {statusLabel}
                                        </Text>
                                      </View>
                                      <View style={styleSheet.roomCta}>
                                        <Text style={styleSheet.roomCtaText}>Ver detalle</Text>
                                        <Ionicons
                                          name="chevron-forward"
                                          size={14}
                                          color="#7C3AED"
                                        />
                                      </View>
                                    </View>
                                  </View>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        </View>
                      )}

                      {commonAreas.length > 0 && (
                        <View style={styleSheet.flatSection}>
                          <Text style={styleSheet.flatSectionTitle}>Zonas comunes</Text>
                          <View style={styleSheet.roomList}>
                            {commonAreas.map((room) => {
                              const extras = flatExtras[room.id];
                              const photo = extras?.photos?.[0]?.signedUrl ?? '';
                              const typeLabel =
                                extras?.common_area_type === 'otros'
                                  ? extras?.common_area_custom
                                  : extras?.common_area_type
                                  ? commonAreaLabel.get(extras.common_area_type) ??
                                    extras.common_area_type
                                  : '';
                              return (
                                <TouchableOpacity
                                  key={room.id}
                                  style={[
                                    styleSheet.roomCard,
                                    {
                                      backgroundColor: theme.colors.glassSurface,
                                      borderColor: theme.colors.glassBorderSoft,
                                    },
                                  ]}
                                  onPress={() =>
                                    navigation.navigate('RoomDetail', {
                                      room,
                                      extras,
                                      flat,
                                    })
                                  }
                                >
                                  {photo ? (
                                    <Image
                                      source={{ uri: photo }}
                                      style={styleSheet.roomPhoto}
                                    />
                                  ) : (
                                    <View
                                      style={[
                                        styleSheet.roomPhotoPlaceholder,
                                        { backgroundColor: theme.colors.surfaceLight },
                                      ]}
                                    >
                                      <Ionicons
                                        name="image-outline"
                                        size={20}
                                        color={theme.colors.textTertiary}
                                      />
                                    </View>
                                  )}
                                  <View style={styleSheet.roomInfo}>
                                    <View style={styleSheet.roomHeader}>
                                      <Text style={styleSheet.roomTitle}>{room.title}</Text>
                                    </View>
                                    {typeLabel ? (
                                      <Text style={styleSheet.roomMeta}>
                                        Tipo: {typeLabel}
                                      </Text>
                                    ) : null}
                                    <View style={styleSheet.roomFooter}>
                                      <View style={[styleSheet.statusBadge, styleSheet.statusNeutral]}>
                                        <Text style={styleSheet.statusNeutralText}>
                                          Zona comun
                                        </Text>
                                      </View>
                                      <View style={styleSheet.roomCta}>
                                        <Text style={styleSheet.roomCtaText}>Ver detalle</Text>
                                        <Ionicons
                                          name="chevron-forward"
                                          size={14}
                                          color="#7C3AED"
                                        />
                                      </View>
                                    </View>
                                  </View>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        </View>
                      )}
                    </View>
                  );
                })()}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {!isOwnProfile && !isFromMatch && (
        <View
          style={[
            styleSheet.bottomActions,
            { paddingBottom: spacing.lg + bottomInset },
          ]}
        >
          <TouchableOpacity style={styleSheet.bottomButton}>
            <Ionicons name="close" size={22} color={theme.colors.textStrong} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styleSheet.bottomButton}
            onPress={() => setIsRequestModalVisible(true)}
          >
            <Ionicons
              name="chatbubble-ellipses"
              size={22}
              color={theme.colors.textStrong}
            />
          </TouchableOpacity>
          <TouchableOpacity style={styleSheet.bottomButton}>
            <Ionicons name="heart" size={22} color={theme.colors.textStrong} />
          </TouchableOpacity>
        </View>
      )}

      <Modal
        visible={isShareConfigVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsShareConfigVisible(false)}
      >
        <View style={styleSheet.shareConfigOverlay}>
          <TouchableOpacity
            style={styleSheet.shareConfigBackdrop}
            activeOpacity={1}
            onPress={() => setIsShareConfigVisible(false)}
          />
          <View
            style={[
              styleSheet.shareConfigCard,
              {
                borderColor: theme.colors.border,
              },
            ]}
          >
            <ImageBackground
              source={{
                uri: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1200&q=80',
              }}
              blurRadius={18}
              style={StyleSheet.absoluteFillObject}
            >
              <LinearGradient
                colors={[theme.colors.glassOverlay, theme.colors.glassWarmStrong]}
                style={StyleSheet.absoluteFillObject}
              />
            </ImageBackground>
            <Text style={[styleSheet.shareConfigTitle, { color: theme.colors.text }]}>
              Compartir perfil
            </Text>
            <Text
              style={[
                styleSheet.shareConfigSubtitle,
                { color: theme.colors.textSecondary },
              ]}
            >
              Elige lo que quieres incluir en tu plantilla.
            </Text>
            <ScrollView
              style={styleSheet.shareConfigScroll}
              showsVerticalScrollIndicator={false}
            >
              <View style={styleSheet.shareConfigSection}>
                <Text style={[styleSheet.shareConfigSectionTitle, { color: theme.colors.text }]}>
                  Fotos (0-4)
                </Text>
                {shareSelectablePhotos.length === 0 ? (
                  <Text style={[styleSheet.shareConfigHint, { color: theme.colors.textSecondary }]}>
                    No tienes fotos subidas.
                  </Text>
                ) : (
                  <View
                    style={[
                      styleSheet.sharePhotoGrid,
                      !shareInclude.photos && styleSheet.shareSectionDisabled,
                    ]}
                  >
                    {shareSelectablePhotos.map((photo) => {
                      const isSelected = shareSelectedPhotoIds.includes(photo.id);
                      return (
                        <TouchableOpacity
                          key={photo.id}
                          style={[
                            styleSheet.sharePhotoTile,
                            isSelected && styleSheet.sharePhotoTileSelected,
                          ]}
                          onPress={() => toggleSharePhoto(photo.id)}
                          disabled={!shareInclude.photos}
                        >
                          <Image source={{ uri: photo.signedUrl }} style={styleSheet.sharePhotoImage} />
                          {isSelected && (
                            <View style={styleSheet.sharePhotoCheck}>
                              <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>

              <View style={styleSheet.shareConfigSection}>
                <Text style={[styleSheet.shareConfigSectionTitle, { color: theme.colors.text }]}>
                  Zonas
                </Text>
                {preferredZones.length === 0 ? (
                  <Text style={[styleSheet.shareConfigHint, { color: theme.colors.textSecondary }]}>
                    No has seleccionado zonas.
                  </Text>
                ) : (
                  <View
                    style={[
                      styleSheet.shareZonesGrid,
                      !shareInclude.zones && styleSheet.shareSectionDisabled,
                    ]}
                  >
                    {preferredZones.map((zoneId, index) => {
                      const label = preferredZoneLabels[index] ?? zoneId;
                      const isSelected = shareSelectedZoneIds.includes(zoneId);
                      return (
                        <TouchableOpacity
                          key={zoneId}
                          style={[
                            styleSheet.shareZoneChip,
                            isSelected && styleSheet.shareZoneChipSelected,
                          ]}
                          onPress={() => toggleShareZone(zoneId)}
                          disabled={!shareInclude.zones}
                        >
                          <Text
                            style={[
                              styleSheet.shareZoneText,
                              isSelected && styleSheet.shareZoneTextSelected,
                            ]}
                          >
                            {label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>

              <View style={styleSheet.shareConfigSection}>
                <Text style={[styleSheet.shareConfigSectionTitle, { color: theme.colors.text }]}>
                  Campos
                </Text>
                <View style={styleSheet.shareFieldGrid}>
                  {[
                    { key: 'photos', label: 'Fotos' },
                    { key: 'zones', label: 'Zonas' },
                    { key: 'bio', label: 'Bio' },
                    { key: 'budget', label: 'Presupuesto' },
                    { key: 'interests', label: 'Intereses' },
                    { key: 'availability', label: 'Disponibilidad' },
                    { key: 'housing', label: 'Situacion' },
                    { key: 'age', label: 'Edad' },
                  ].map((field) => (
                    <View
                      key={field.key}
                      style={[
                        styleSheet.shareFieldRow,
                        styleSheet.shareFieldItem,
                        styleSheet.shareFieldCard,
                        shareInclude[field.key as keyof typeof shareInclude] &&
                          styleSheet.shareFieldCardActive,
                      ]}
                    >
                      <Text style={[styleSheet.shareFieldLabel, { color: theme.colors.text }]}>
                        {field.label}
                      </Text>
                      <View
                        style={[
                          styleSheet.shareFieldToggleWrap,
                          shareInclude[field.key as keyof typeof shareInclude] &&
                            styleSheet.shareFieldToggleActive,
                        ]}
                      >
                        <Switch
                          style={styleSheet.shareFieldSwitch}
                          value={shareInclude[field.key as keyof typeof shareInclude]}
                          onValueChange={(value) =>
                            setShareInclude((prev) => ({
                              ...prev,
                              [field.key]: value,
                            }))
                          }
                          trackColor={{
                            false: theme.colors.border,
                            true: theme.colors.primary,
                          }}
                          thumbColor={
                            shareInclude[field.key as keyof typeof shareInclude]
                              ? theme.colors.background
                              : theme.colors.surfaceLight
                          }
                          ios_backgroundColor={theme.colors.border}
                        />
                      </View>
                    </View>
                  ))}
                </View>
              </View>

              <View style={styleSheet.shareConfigSection}>
                <Text style={[styleSheet.shareConfigSectionTitle, { color: theme.colors.text }]}>
                  Tema
                </Text>
                <View style={styleSheet.shareThemeRow}>
                  {SHARE_THEME_OPTIONS.map((option) => {
                    const isSelected = shareTheme === option.id;
                    return (
                      <TouchableOpacity
                        key={option.id}
                        style={[
                          styleSheet.shareThemeChip,
                          isSelected && styleSheet.shareThemeChipSelected,
                        ]}
                        onPress={() => setShareTheme(option.id)}
                      >
                        <Text
                          style={[
                            styleSheet.shareThemeText,
                            isSelected && styleSheet.shareThemeTextSelected,
                          ]}
                        >
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </ScrollView>
            <View style={styleSheet.shareConfigActions}>
              <TouchableOpacity
                style={[styleSheet.shareConfigButton, styleSheet.shareConfigCancel]}
                onPress={() => setIsShareConfigVisible(false)}
                disabled={isSharing}
              >
                <Text
                  style={[
                    styleSheet.shareConfigButtonText,
                    { color: isDark ? '#000000' : theme.colors.text },
                  ]}
                >
                  Cancelar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styleSheet.shareConfigButton,
                  styleSheet.shareConfigConfirm,
                  isSharing && styleSheet.shareConfigButtonDisabled,
                ]}
                onPress={handleConfirmShareProfile}
                disabled={isSharing}
              >
                <Text style={styleSheet.shareConfigConfirmText}>
                  {isSharing ? 'Preparando...' : 'Compartir'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={isRequestModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setIsRequestModalVisible(false);
          setRequestMessage('');
        }}
      >
        <View style={styleSheet.requestModalOverlay}>
          <TouchableOpacity
            style={styleSheet.requestModalBackdrop}
            activeOpacity={1}
            onPress={() => {
              setIsRequestModalVisible(false);
              setRequestMessage('');
            }}
          />
          <View
            style={[
              styleSheet.requestModalCard,
              {
                backgroundColor: theme.colors.background,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Text style={[styleSheet.requestModalTitle, { color: theme.colors.text }]}>
              Enviar mensaje
            </Text>
            {showRequestTip ? (
              <View style={styleSheet.requestTipCard}>
                <Ionicons
                  name="information-circle-outline"
                  size={16}
                  color={theme.colors.primary}
                />
                <Text style={styleSheet.requestTipText}>
                  Puedes enviar una solicitud sin match. Si la aceptan, se abre el chat.
                </Text>
                <Pressable
                  style={styleSheet.requestTipButton}
                  onPress={async () => {
                    setShowRequestTip(false);
                    if (currentUserId) {
                      await AsyncStorage.setItem(
                        `${MESSAGE_REQUEST_TIP_KEY}:${currentUserId}`,
                        '1'
                      );
                    }
                  }}
                >
                  <Text style={styleSheet.requestTipButtonText}>Entendido</Text>
                </Pressable>
              </View>
            ) : null}
            <View style={styleSheet.requestPreviewRow}>
              <View style={styleSheet.requestAvatarWrap}>
                {resolvedAvatarUrl ? (
                  <Image
                    source={{ uri: resolvedAvatarUrl }}
                    style={styleSheet.requestAvatar}
                  />
                ) : (
                  <View style={styleSheet.requestAvatarPlaceholder}>
                    <Ionicons name="person" size={16} color={theme.colors.textTertiary} />
                  </View>
                )}
              </View>
              <View style={styleSheet.requestPreviewInfo}>
                <Text style={[styleSheet.requestPreviewName, { color: theme.colors.text }]}>
                  {getUserName(profile, 'Usuario')}
                </Text>
                <Text
                  style={[
                    styleSheet.requestPreviewMeta,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  {profile.age ? `${profile.age} años` : 'Perfil verificado'}
                </Text>
              </View>
            </View>
            <View style={styleSheet.requestLimitRow}>
              <View style={styleSheet.requestLimitChip}>
                <Ionicons
                  name={isPremium ? 'sparkles' : 'lock-open-outline'}
                  size={14}
                  color={isPremium ? theme.colors.primary : theme.colors.textSecondary}
                />
                <Text style={styleSheet.requestLimitText}>
                  {requestLimitText}
                </Text>
              </View>
              {!isPremium && (
                <TouchableOpacity
                  style={styleSheet.requestUpgradeButton}
                  onPress={() => navigation.navigate('Subscription')}
                >
                  <Text style={styleSheet.requestUpgradeText}>Hazte Premium</Text>
                </TouchableOpacity>
              )}
            </View>
            <Text
              style={[
                styleSheet.requestModalSubtitle,
                { color: theme.colors.textSecondary },
              ]}
            >
              Tu solicitud quedara pendiente hasta que te respondan.
            </Text>
            <TextInput
              value={requestMessage}
              onChangeText={setRequestMessage}
              placeholder="Escribe tu mensaje..."
              placeholderTextColor={theme.colors.textSecondary}
              multiline
              style={[
                styleSheet.requestModalInput,
                {
                  color: theme.colors.text,
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.surfaceLight,
                },
              ]}
            />
            <View style={styleSheet.requestCounterRow}>
              <Text style={styleSheet.requestHintText}>
                Se sincero y menciona algo que compartan.
              </Text>
              <Text style={styleSheet.requestCounterText}>
                {requestCharCount}/{MAX_REQUEST_CHARS}
              </Text>
            </View>
            <View style={styleSheet.requestModalActions}>
              <TouchableOpacity
                style={[styleSheet.requestModalButton, styleSheet.requestModalCancel]}
                onPress={() => {
                  setIsRequestModalVisible(false);
                  setRequestMessage('');
                }}
                disabled={isSendingRequest}
              >
                <Text
                  style={[
                    styleSheet.requestModalButtonText,
                    { color: theme.colors.text },
                  ]}
                >
                  Cancelar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styleSheet.requestModalButton,
                  styleSheet.requestModalSend,
                  isSendingRequest && styleSheet.requestModalButtonDisabled,
                ]}
                onPress={handleSendRequest}
                disabled={isSendingRequest}
              >
                <Text style={styleSheet.requestModalSendText}>
                  {isSendingRequest ? 'Enviando...' : 'Enviar'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={lightboxVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLightboxVisible(false)}
      >
        <GestureHandlerRootView style={styleSheet.lightboxOverlay}>
          <LinearGradient
            colors={[theme.colors.overlayLight, theme.colors.overlayDark]}
            style={StyleSheet.absoluteFillObject}
          />
          <TouchableOpacity
            style={styleSheet.lightboxBackdrop}
            activeOpacity={1}
            onPress={() => setLightboxVisible(false)}
          />
          <View style={styleSheet.lightboxContent}>
            <View style={styleSheet.lightboxTopBar}>
              <Text style={styleSheet.lightboxTitle}>Momentos</Text>
              <TouchableOpacity
                style={styleSheet.lightboxClose}
                onPress={() => setLightboxVisible(false)}
              >
                <Ionicons name="close" size={18} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={styleSheet.lightboxDivider} />
            <View
              style={styleSheet.lightboxImageFrame}
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
                  {carouselPhotos.map((photo, index) => {
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
                        key={photo.id ?? photo.path ?? photo.signedUrl ?? `photo-${index}`}
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
                                styleSheet.lightboxSlide,
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
                                style={styleSheet.lightboxImage}
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
                <View style={styleSheet.lightboxZoomChip}>
                  <Ionicons
                    name="search"
                    size={14}
                    color={theme.colors.textSecondary}
                  />
                  <Text style={styleSheet.lightboxZoomText}>{lightboxZoomLabel}</Text>
                </View>
              ) : null}
            </View>
            {lightboxCount > 1 && (
              <View style={styleSheet.lightboxNav}>
                <TouchableOpacity
                  style={styleSheet.lightboxNavButton}
                  onPress={handleLightboxPrev}
                >
                  <Ionicons
                    name="chevron-back"
                    size={20}
                    color={theme.colors.textSecondary}
                  />
                </TouchableOpacity>
                <View style={styleSheet.lightboxCounterChip}>
                  <Ionicons
                    name="image-outline"
                    size={14}
                    color={theme.colors.textSecondary}
                  />
                  <Text style={styleSheet.lightboxCounter}>
                    {lightboxIndex + 1}/{lightboxCount}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styleSheet.lightboxNavButton}
                  onPress={handleLightboxNext}
                >
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={theme.colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </GestureHandlerRootView>
      </Modal>
    </View>
  );
};
