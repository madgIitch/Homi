import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Image,
  ImageBackground,
  Alert,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import {
  BUDGET_MAX,
  BUDGET_MIN,
  DEFAULT_BUDGET_MAX,
  DEFAULT_BUDGET_MIN,
  ESTILO_VIDA_OPTIONS,
  DEFAULT_ROOMMATES_MAX,
  DEFAULT_ROOMMATES_MIN,
  ROOMMATES_MAX,
  ROOMMATES_MIN,
  lifestyleLabelById,
} from '../constants/swipeFilters';
import { useSwipeFilters } from '../context/SwipeFiltersContext';
import { usePremium } from '../context/PremiumContext';
import { authService, supabaseClient } from '../services/authService';
import { chatService } from '../services/chatService';
import { profilePhotoService } from '../services/profilePhotoService';
import { profileService } from '../services/profileService';
import { roomExtrasService } from '../services/roomExtrasService';
import { roomService } from '../services/roomService';
import { swipeRejectionService } from '../services/swipeRejectionService';
import { swipeLimitService } from '../services/swipeLimitService';
import { locationService } from '../services/locationService';
import { API_CONFIG } from '../config/api';
import { getUserName } from '../utils/name';
import {
  getMessageRequestUsage,
  incrementMessageRequestUsage,
  type MessageRequestUsage,
} from '../utils/messageRequests';
import type { Gender } from '../types/gender';
import type { HousingSituation, RoomRecommendation } from '../types/profile';
import type { SwipeFilters } from '../types/swipeFilters';
import { SwipeScreenStyles } from '../styles/screens';
import { SwipeCard, type SwipeBadge, type SwipeProfile } from '../components/SwipeCard';

const SWIPE_LIMIT = 20;
const MAX_REQUEST_CHARS = 280;
const MESSAGE_REQUEST_TIP_KEY = '@hm_message_request_tip_seen';
let isSwiping = false;

const calculateAge = (birthDate: string | null | undefined): number | undefined => {
  if (!birthDate) return undefined;

  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  return age;
};


const ActionButton = ({
  icon,
  onPress,
  disabled,
  size,
  styles,
  theme,
}: {
  icon: string;
  onPress?: () => void;
  disabled?: boolean;
  size: number;
  styles: any;
  theme: any;
}) => {
  const scale = useRef(new Animated.Value(1)).current;
  const sizeStyle = useMemo(
    () => ({
      width: size,
      height: size,
      borderRadius: Math.round(size / 2),
    }),
    [size]
  );
  const animatedStyle = useMemo(() => ({ transform: [{ scale }] }), [scale]);

  const handlePressIn = () => {
    if (disabled) return;
    Animated.spring(scale, {
      toValue: 0.96,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
    >
      <Animated.View style={animatedStyle}>
        <View style={[styles.actionButton, sizeStyle]}>
          <Ionicons name={icon} size={22} color={theme.colors.textStrong} />
        </View>
      </Animated.View>
    </Pressable>
  );
};

export const SwipeScreen: React.FC = () => {
  const theme = useTheme();
  const styles = useMemo(() => SwipeScreenStyles(theme), [theme]);
  const navigation = useNavigation<StackNavigationProp<any>>();
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const { filters, resetFilters, setFilters } = useSwipeFilters();
  const { isPremium } = usePremium();
  const { spacing } = theme;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [swipesUsed, setSwipesUsed] = useState(0);
  const [allProfiles, setAllProfiles] = useState<SwipeProfile[]>([]);
  const [profiles, setProfiles] = useState<SwipeProfile[]>([]);
  const [excludedProfileIds, setExcludedProfileIds] = useState<string[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [isRequestModalVisible, setIsRequestModalVisible] = useState(false);
  const [requestMessage, setRequestMessage] = useState('');
  const [isSendingRequest, setIsSendingRequest] = useState(false);
  const [requestUsage, setRequestUsage] = useState<MessageRequestUsage | null>(null);
  const [showRequestTip, setShowRequestTip] = useState(false);
  const [currentProfileForRequest, setCurrentProfileForRequest] = useState<SwipeProfile | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLimitModalVisible, setIsLimitModalVisible] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [_profileHousing, setProfileHousing] = useState<HousingSituation | null>(
    null
  );
  const [profileIsSeeking, setProfileIsSeeking] = useState(false);
  const [isSearchEnabled, setIsSearchEnabled] = useState(true);
  const [photoIndexByProfile, setPhotoIndexByProfile] = useState<
    Record<string, number>
  >({});
  const [profilePhotosById, setProfilePhotosById] = useState<
    Record<string, string[]>
  >({});
  const [roomPreviewByProfileId, setRoomPreviewByProfileId] = useState<
    Record<
      string,
      { count: number; photoUrl?: string | null; title?: string | null; price?: number | null }
    >
  >({});
  const [zoneNameById, setZoneNameById] = useState<Record<string, string>>({});
  const [profileFiltersApplied, setProfileFiltersApplied] = useState(false);
  const [allProvincesBlocked, setAllProvincesBlocked] = useState(false);
  const [blockedProvinces, setBlockedProvinces] = useState<string[]>([]);

  const position = useRef(new Animated.ValueXY()).current;
  const currentProfileRef = useRef<SwipeProfile | null>(null);
  const canSwipeRef = useRef(false);
  const swipeThresholdRef = useRef(0);
  const skipResetRef = useRef(false);
  const reloadInFlightRef = useRef(false);
  const reloadPendingRef = useRef(false);
  const screenWidth = windowWidth;
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
  const tabBarTopOffset = tabBarBottom + tabBarHeight;
  const safeHeight = Math.max(0, windowHeight - insets.top - tabBarTopOffset);
  const headerHeight = Math.max(64, Math.round(safeHeight * 0.12));
  const actionDockHeight = Math.max(21, Math.round(safeHeight * 0.1));
  const deckHeight = Math.max(0, safeHeight - headerHeight - actionDockHeight);
  const cardWidth = screenWidth - spacing.s20 * 2;
  const swipeThreshold = screenWidth * 0.3;
  const actionButtonSize = Math.max(
    50,
    Math.min(68, Math.round(windowHeight * 0.075))
  );
  const cardHeight = Math.max(
    360,
    Math.round(Math.min(deckHeight * 1, windowHeight - 240))
  );

  const safeAreaStyle = useMemo(
    () => ({
      paddingTop: insets.top,
      paddingBottom: tabBarTopOffset,
    }),
    [insets.top, tabBarTopOffset]
  );
  const headerHeightStyle = useMemo(
    () => ({
      height: headerHeight,
    }),
    [headerHeight]
  );
  const deckHeightStyle = useMemo(
    () => ({
      height: deckHeight,
    }),
    [deckHeight]
  );
  const actionDockHeightStyle = useMemo(
    () => ({
      height: actionDockHeight,
    }),
    [actionDockHeight]
  );
  const cardLayoutStyle = useMemo(
    () => ({
      width: cardWidth,
      height: cardHeight,
    }),
    [cardHeight, cardWidth]
  );

  const rotate = position.x.interpolate({
    inputRange: [-screenWidth, 0, screenWidth],
    outputRange: ['-3deg', '0deg', '3deg'],
    extrapolate: 'clamp',
  });

  const effectiveFilters = useMemo(() => {
    if (
      _profileHousing === 'offering' &&
      !profileIsSeeking &&
      filters.housingSituation === 'offering'
    ) {
      return { ...filters, housingSituation: 'seeking' as const };
    }
    return filters;
  }, [filters, _profileHousing, profileIsSeeking]);

  const currentProfile = profiles[currentIndex];
  const canSwipe = isSearchEnabled && (isPremium || swipesUsed < SWIPE_LIMIT);
  const activeFilterCount = getActiveFilterCount(effectiveFilters);
  const hasActiveFilters = activeFilterCount > 0;
  const lifestyleIdByLabel = useMemo(
    () => new Map(ESTILO_VIDA_OPTIONS.map((option) => [option.label, option.id])),
    []
  );
  currentProfileRef.current = currentProfile ?? null;
  canSwipeRef.current = canSwipe;
  swipeThresholdRef.current = swipeThreshold;

  const requestCharCount = requestMessage.trim().length;
  const requestLimitText = requestUsage
    ? isPremium
      ? `Premium: ${requestUsage.remaining} de ${requestUsage.limit} ${requestUsage.periodLabel}`
      : `Gratis: ${requestUsage.remaining} de ${requestUsage.limit} ${requestUsage.periodLabel}`
    : isPremium
    ? 'Cargando...'
    : 'Gratis: 1 solicitud de prueba';

  useEffect(() => {
    if (isPremium) {
      if (isLimitModalVisible) {
        setIsLimitModalVisible(false);
      }
      return;
    }
    if (swipesUsed >= SWIPE_LIMIT && !isLimitModalVisible) {
      setIsLimitModalVisible(true);
    }
  }, [isPremium, isLimitModalVisible, swipesUsed]);

  const getAuthHeaders = async (): Promise<Record<string, string>> => {
    const token = await AsyncStorage.getItem('authToken');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  };

  const fetchWithAuth = async (input: RequestInfo, init: RequestInit) => {
    let headers = await getAuthHeaders();
    const tryFetch = () => fetch(input, { ...init, headers });
    let response = await tryFetch();

    if (response.status === 401) {
      const newToken = await authService.refreshToken();
      if (newToken) {
        headers = await getAuthHeaders();
        response = await tryFetch();
      }
    }

    return response;
  };

  const sendLike = async (profileId: string) => {
    try {
      const response = await fetchWithAuth(
        `${API_CONFIG.FUNCTIONS_URL}/matches`,
        {
          method: 'POST',
          body: JSON.stringify({ user_b_id: profileId }),
        }
      );

      if (!response.ok && response.status !== 409) {
        const error = await response.text();
        console.error('Error guardando like:', error);
      }
    } catch (error) {
      console.error('Error guardando like:', error);
    }
  };

  const sendRejection = async (profileId: string) => {
    try {
      await swipeRejectionService.createRejection(profileId);
    } catch (error) {
      console.error('Error guardando rechazo:', error);
    }
  };

  const incrementSwipeCount = async () => {
    if (isPremium) {
      return;
    }
    try {
      const { count } = await swipeLimitService.incrementDailyCount();
      setSwipesUsed(count);
    } catch (error) {
      console.warn('[SwipeScreen] Error actualizando swipes:', error);
      setSwipesUsed((prev) => Math.min(prev + 1, SWIPE_LIMIT));
    }
  };

  const advanceCard = (shouldCount: boolean) => {
    if (shouldCount) {
      incrementSwipeCount().catch(() => undefined);
    }
    position.setValue({ x: 0, y: 0 });
  };

  const handleSwipe = (direction: 'left' | 'right', profile: SwipeProfile) => {
    if (!canSwipeRef.current) return;
    isSwiping = true;
    const swipedId = profile.id;
    if (direction === 'right') {
      sendLike(swipedId).catch(() => undefined);
    } else {
      sendRejection(swipedId).catch(() => undefined);
    }
    Animated.timing(position, {
      toValue: {
        x: direction === 'right' ? screenWidth + 100 : -screenWidth - 100,
        y: 0,
      },
      duration: 240,
      useNativeDriver: true,
    }).start(() => {
      advanceCard(direction === 'right');
      skipResetRef.current = true;
      setExcludedProfileIds((prev) =>
        prev.includes(swipedId) ? prev : [...prev, swipedId]
      );
      isSwiping = false;
    });
  };

  const handleSendRequest = async () => {
    const profile = currentProfileForRequest || currentProfile;
    if (!profile) return;
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
        setCurrentProfileForRequest(null);
        navigation.navigate('Chat', {
          chatId: response.chatId,
          matchId: response.matchId,
          name: profile.name,
          avatarUrl: profile.photoUrl ?? '',
          profile: profile.profile,
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

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gesture) =>
        canSwipeRef.current &&
        (Math.abs(gesture.dx) > 4 || Math.abs(gesture.dy) > 4),
      onMoveShouldSetPanResponderCapture: (_, gesture) =>
        canSwipeRef.current &&
        (Math.abs(gesture.dx) > 4 || Math.abs(gesture.dy) > 4),
      onStartShouldSetPanResponderCapture: () => false,
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_, gesture) => {
        if (isSwiping) return;
        if (!canSwipeRef.current) return;
        position.setValue({ x: gesture.dx, y: gesture.dy });
        if (gesture.dx > swipeThresholdRef.current) {
          const profile = currentProfileRef.current;
          if (profile) {
            handleSwipe('right', profile);
          }
          return;
        }
        if (gesture.dx < -swipeThresholdRef.current) {
          const profile = currentProfileRef.current;
          if (profile) {
            handleSwipe('left', profile);
          }
          return;
        }
      },
      onPanResponderRelease: (_, gesture) => {
        if (isSwiping) {
          return;
        }
        if (!canSwipeRef.current) {
          position.setValue({ x: 0, y: 0 });
          return;
        }
        if (gesture.dx > swipeThresholdRef.current) {
          const profile = currentProfileRef.current;
          if (profile) {
            handleSwipe('right', profile);
          }
          return;
        }
        if (gesture.dx < -swipeThresholdRef.current) {
          const profile = currentProfileRef.current;
          if (profile) {
            handleSwipe('left', profile);
          }
          return;
        }
        Animated.spring(position, {
          toValue: { x: 0, y: 0 },
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  const formatBudget = (profile: SwipeProfile) => {
    if (profile.budgetMin != null && profile.budgetMax != null) {
      return `${profile.budgetMin}-${profile.budgetMax} EUR`;
    }
    if (profile.budgetMin != null) return `Desde ${profile.budgetMin} EUR`;
    if (profile.budgetMax != null) return `Hasta ${profile.budgetMax} EUR`;
    return 'Presupuesto flexible';
  };

  const getZoneLabel = (zoneId?: string | null) => {
    if (!zoneId) return null;
    return zoneNameById[zoneId] ?? zoneId;
  };

  const formatProvinceLabel = (
    provinceName?: string | null,
    provinceCode?: string | null
  ) => {
    if (provinceName) return provinceName;
    if (provinceCode) return `Provincia ${provinceCode}`;
    return null;
  };

  const formatLocationLabel = (profile: SwipeProfile) => {
    const level = profile.locationDisplayLevel;
    if (!level) return null;

    const zoneName =
      profile.locationZoneName ??
      getZoneLabel(profile.locationZoneId) ??
      getZoneLabel(profile.zone);
    const cityName = profile.locationCityName ?? null;
    const provinceLabel = formatProvinceLabel(
      profile.locationProvinceName ?? null,
      profile.locationProvinceCode ?? null
    );

    switch (level) {
      case 'zone-city':
        if (zoneName && cityName) return `${zoneName} - ${cityName}`;
        if (cityName) return cityName;
        if (zoneName) return zoneName;
        return provinceLabel;
      case 'city-province':
        if (cityName && provinceLabel) return `${cityName}, ${provinceLabel}`;
        if (cityName) return cityName;
        return provinceLabel;
      case 'province':
        return provinceLabel;
      default:
        return null;
    }
  };

  const getSituationLabel = (profile: SwipeProfile) => {
    const locationLabel = formatLocationLabel(profile);
    if (profile.housing === 'offering') {
      const base = profile.profile?.is_seeking ? 'Tengo y busco piso' : 'Tengo piso';
      return locationLabel ? `${base} en ${locationLabel}` : base;
    }
    if (profile.housing === 'seeking') {
      const base = 'Busco piso';
      return locationLabel ? `${base} en ${locationLabel}` : base;
    }
    return null;
  };

  const getGenderLabel = (gender?: Gender | null) => {
    if (!gender) return null;
    switch (gender) {
      case 'male':
        return 'Hombre';
      case 'female':
        return 'Mujer';
      case 'non_binary':
        return 'No binario';
      case 'undisclosed':
        return 'Prefiere no decir';
      case 'other':
        return 'Otro';
      default:
        return gender;
    }
  };

  const getBadges = (profile: SwipeProfile): SwipeBadge[] => {
    const badges: SwipeBadge[] = [];

    const occupationValue = profile.occupation?.trim().toLowerCase() ?? '';
    const occupationChip = occupationValue.startsWith('universidad')
      ? { icon: 'school-outline', label: 'Estudiante' }
      : occupationValue.startsWith('trabajo')
      ? { icon: 'briefcase-outline', label: 'Trabajador' }
      : occupationValue.startsWith('mixto')
      ? { icon: 'briefcase-outline', label: 'Mixto' }
      : null;


    // 1. Genero
    const genderLabel = getGenderLabel(profile.gender ?? null);
    if (genderLabel) {
      badges.push({ icon: 'person-outline', label: genderLabel });
    }

    // 2. Ocupacion
    if (occupationChip) {
      badges.push(occupationChip);
    }

    // 3. Número de compañeros deseados
    if (profile.desiredRoommatesMin != null || profile.desiredRoommatesMax != null) {
      const min = profile.desiredRoommatesMin ?? 1;
      const max = profile.desiredRoommatesMax ?? 5;
      const roommatesText = min === max
        ? `${min} ${min === 1 ? 'compañero' : 'compañeros'}`
        : `${min}-${max} compañeros`;
      badges.push({ icon: 'people-outline', label: roommatesText });
    }

    return badges.slice(0, 3); // Mostrar m?ximo 3 chips
  };

  const getBudgetBadge = (profile: SwipeProfile) =>
    formatBudget(profile);

  const mapProfileToSwipe = (
    recommendation: RoomRecommendation
  ): SwipeProfile | null => {
    const profile = recommendation.profile;
    const avatar = profile.avatar_url;
    const photoUrl = avatar
      ? avatar.startsWith('http')
        ? avatar
        : `${API_CONFIG.SUPABASE_URL}/storage/v1/object/public/avatars/${avatar}`
      : null;

    const profileName = getUserName(profile, 'Usuario');
    if (!profileName) {
      return null;
    }

    return {
      id: profile.id,
      name: profileName,
      age: profile.age ?? calculateAge(profile.birth_date),
      photoUrl,
      housing: profile.housing_situation ?? null,
      zone: profile.preferred_zones?.[0],
      budgetMin: profile.budget_min ?? undefined,
      budgetMax: profile.budget_max ?? undefined,
      desiredRoommatesMin: profile.desired_roommates_min ?? null,
      desiredRoommatesMax: profile.desired_roommates_max ?? null,
      occupation: profile.occupation ?? null,
      bio: profile.bio ?? 'Sin descripcion por ahora.',
      interests: profile.interests ?? [],
      preferredZones: profile.preferred_zones ?? [],
      gender: profile.gender ?? null,
      lifestyle: profile.lifestyle_preferences
        ? Object.values(profile.lifestyle_preferences).filter(
            (item): item is string => Boolean(item)
          )
        : [],
      locationDisplayLevel: recommendation.location_display_level ?? null,
      locationZoneId: recommendation.location_zone_id ?? null,
      locationZoneName: recommendation.location_zone_name ?? null,
      locationCityId: recommendation.location_city_id ?? null,
      locationCityName: recommendation.location_city_name ?? null,
      locationProvinceCode: recommendation.location_province_code ?? null,
      locationProvinceName: recommendation.location_province_name ?? null,
      profile,
    };
  };

  useEffect(() => {
    const loadSwipeCount = async () => {
      try {
        const { count } = await swipeLimitService.getDailyCount();
        setSwipesUsed(count);
      } catch (error) {
        console.warn('[SwipeScreen] Error cargando swipes:', error);
        setSwipesUsed(0);
      }
    };

    loadSwipeCount().catch(() => undefined);
  }, []);

  useEffect(() => {
    const loadCurrentUserId = async () => {
      try {
        const profile = await profileService.getProfile();
        if (profile?.id) {
          setCurrentUserId(profile.id);
        }
      } catch (error) {
        console.error('[SwipeScreen] Error loading current user ID:', error);
      }
    };
    loadCurrentUserId();
  }, []);

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
    let isMounted = true;
    let profileChannel: any = null;

    const subscribeToProfileChanges = async () => {
      try {
        const profile = await profileService.getProfile();
        if (!profile?.id || !isMounted) return;

        const token = await AsyncStorage.getItem('authToken');
        if (token) {
          supabaseClient.realtime.setAuth(token);
        }

        profileChannel = supabaseClient
          .channel(`profile-searchable:${profile.id}`)
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'profiles',
              filter: `id=eq.${profile.id}`,
            },
            (payload) => {
              if (!isMounted) return;
              const newData = payload.new as any;
              if (typeof newData.is_searchable === 'boolean') {
                setIsSearchEnabled(newData.is_searchable);
                if (!newData.is_searchable) {
                  setAllProfiles([]);
                  setProfiles([]);
                  setCurrentIndex(0);
                  position.setValue({ x: 0, y: 0 });
                }
              }
            }
          )
          .subscribe();
      } catch (error) {
        console.warn('[SwipeScreen] Error setting up realtime:', error);
      }
    };

    subscribeToProfileChanges().catch(() => undefined);

    return () => {
      isMounted = false;
      if (profileChannel) {
        supabaseClient.removeChannel(profileChannel);
      }
    };
  }, [position]);

  useEffect(() => {
    const applyProfileFilters = async () => {
      if (profileFiltersApplied) return;
      try {
        const profile = await profileService.getProfile();
        if (!profile) {
          setProfileFiltersApplied(true);
          return;
        }
        setProfileHousing(profile.housing_situation ?? null);
        setIsSearchEnabled(profile.is_searchable ?? true);
        setProfileIsSeeking(profile.is_seeking ?? false);
        if (activeFilterCount > 0) {
          setProfileFiltersApplied(true);
          return;
        }
        const isDefaultFilters =
          filters.housingSituation === 'any' &&
          filters.gender === 'any' &&
          filters.budgetMin === DEFAULT_BUDGET_MIN &&
          filters.budgetMax === DEFAULT_BUDGET_MAX &&
          (filters.roommatesMin ?? DEFAULT_ROOMMATES_MIN) === DEFAULT_ROOMMATES_MIN &&
          (filters.roommatesMax ?? DEFAULT_ROOMMATES_MAX) === DEFAULT_ROOMMATES_MAX &&
          filters.zones.length === 0 &&
          filters.lifestyle.length === 0 &&
          (!filters.rules ||
            Object.values(filters.rules).every((value) => !value));
        if (profile.housing_situation === 'offering' && isDefaultFilters) {
          await setFilters({
            ...filters,
            housingSituation: profile.is_seeking ? 'any' : 'seeking',
          });
        }
      } catch (error) {
        console.warn('[SwipeScreen] Error syncing filters with profile:', error);
      } finally {
        setProfileFiltersApplied(true);
      }
    };

    applyProfileFilters().catch(() => undefined);
  }, [
    activeFilterCount,
    filters,
    lifestyleIdByLabel,
    profileFiltersApplied,
    setFilters,
  ]);

  const reloadRecommendations = useCallback(async () => {
    if (reloadInFlightRef.current) {
      reloadPendingRef.current = true;
      return;
    }
    reloadInFlightRef.current = true;

    if (!isSearchEnabled) {
      setLoadingProfiles(false);
      setProfileError(null);
      setAllProfiles([]);
      setAllProvincesBlocked(false);
      setBlockedProvinces([]);
      setExcludedProfileIds([]);
      reloadInFlightRef.current = false;
      if (reloadPendingRef.current) {
        reloadPendingRef.current = false;
        reloadRecommendations().catch(() => undefined);
      }
      return;
    }
    setLoadingProfiles(true);
    setProfileError(null);
    setAllProvincesBlocked(false);
    setBlockedProvinces([]);
    try {
      const recommendationsResponse = await profileService.getProfileRecommendations(
        activeFilterCount > 0 ? effectiveFilters : undefined
      );
      console.log(
        '[SwipeScreen] recommendations response:',
        recommendationsResponse
      );

      // Check if all provinces are blocked
      if (recommendationsResponse.all_provinces_blocked === true) {
        console.log(
          '[SwipeScreen] all_provinces_blocked:',
          recommendationsResponse.all_provinces_blocked
        );
        console.log('[SwipeScreen] setting allProvincesBlocked: true');
        setAllProvincesBlocked(true);
        setBlockedProvinces(recommendationsResponse.blocked_provinces ?? []);
        setAllProfiles([]);
        setExcludedProfileIds([]);
        return;
      }

      // Check if some provinces are blocked
      const blocked = recommendationsResponse.blocked_provinces ?? [];
      console.log('[SwipeScreen] blocked_provinces from response:', blocked);
      if (blocked.length > 0) {
        setBlockedProvinces(blocked);
      }

      const [existingMatches, rejections] = await Promise.all([
        chatService.getMatches(),
        swipeRejectionService.getRejections(),
      ]);

      const recommendations = recommendationsResponse.recommendations ?? [];
      const excluded = new Set<string>();
      existingMatches.forEach((match) => {
        if (!match.status || !match.profileId) return;
        const isOutgoingPending = match.status === 'pending' && match.isOutgoing;
        const isResolvedStatus = [
          'accepted',
          'rejected',
          'room_offer',
          'room_assigned',
          'room_declined',
          'unmatched',
        ].includes(match.status);
        if (isResolvedStatus || isOutgoingPending) {
          excluded.add(match.profileId);
        }
      });
      rejections.forEach((rejection) => {
        if (rejection.rejectedProfileId) {
          excluded.add(rejection.rejectedProfileId);
        }
      });
      const mapped = recommendations
        .map((rec) => mapProfileToSwipe(rec))
        .filter((profile): profile is SwipeProfile => Boolean(profile));
      const filtered = mapped.filter((profile) => !excluded.has(profile.id));
      setAllProfiles(filtered);
      setExcludedProfileIds(Array.from(excluded));
    } catch (error) {
      console.error('Error cargando recomendaciones:', error);
      setAllProfiles([]);
      setProfileError('No se pudieron cargar perfiles reales.');
    } finally {
      setLoadingProfiles(false);
      reloadInFlightRef.current = false;
      if (reloadPendingRef.current) {
        reloadPendingRef.current = false;
        reloadRecommendations().catch(() => undefined);
      }
    }
  }, [activeFilterCount, effectiveFilters, isSearchEnabled]);

  useEffect(() => {
    if (profileFiltersApplied) {
      reloadRecommendations().catch(() => undefined);
    }
  }, [profileFiltersApplied, reloadRecommendations]);

  useFocusEffect(
    useCallback(() => {
      if (!profileFiltersApplied) return;
      reloadRecommendations().catch(() => undefined);
    }, [profileFiltersApplied, reloadRecommendations])
  );

  useEffect(() => {
    let isMounted = true;
    const zoneIds = new Set<string>();
    allProfiles.forEach((profile) => {
      if (profile.zone) zoneIds.add(profile.zone);
      profile.preferredZones?.forEach((zoneId) => {
        if (zoneId) zoneIds.add(zoneId);
      });
    });

    const missing = Array.from(zoneIds).filter(
      (zoneId) => zoneId && !zoneNameById[zoneId]
    );
    if (missing.length === 0) return undefined;

    const loadZoneNames = async () => {
      const entries = await Promise.all(
        missing.map(async (zoneId) => {
          try {
            const place = await locationService.getPlaceById(zoneId);
            return place ? [zoneId, place.name] : null;
          } catch {
            return null;
          }
        })
      );

      if (!isMounted) return;
      const next = { ...zoneNameById };
      entries.forEach((entry) => {
        if (!entry) return;
        const [zoneId, name] = entry as [string, string];
        next[zoneId] = name;
      });
      setZoneNameById(next);
    };

    loadZoneNames().catch(() => undefined);

    return () => {
      isMounted = false;
    };
  }, [allProfiles, zoneNameById]);

  useEffect(() => {
    const next = applyFilters(allProfiles, effectiveFilters, excludedProfileIds);
    setProfiles(next);
    if (skipResetRef.current) {
      skipResetRef.current = false;
      return;
    }
    if (!isSwiping) {
      setCurrentIndex(0);
      position.setValue({ x: 0, y: 0 });
    }
  }, [allProfiles, effectiveFilters, excludedProfileIds, position]);

  useEffect(() => {
    const loadPhotosForProfile = async () => {
      if (!currentProfile) return;
      const profileId = currentProfile.id;
      if (profilePhotosById[profileId]) return;

      try {
        const photos = await profilePhotoService.getPhotosForProfile(profileId);
        const urls = photos.map((photo) => photo.signedUrl).filter((url): url is string => Boolean(url));
        if (urls.length > 0) {
          setProfilePhotosById((prev) => ({
            ...prev,
            [profileId]: urls,
          }));
          return;
        }
        const photoUrl = currentProfile.photoUrl;
        if (photoUrl && typeof photoUrl === 'string') {
          setProfilePhotosById((prev) => ({
            ...prev,
            [profileId]: [photoUrl],
          }));
          return;
        }
        setProfilePhotosById((prev) => ({
          ...prev,
          [profileId]: [],
        }));
      } catch (error) {
        console.error('Error cargando fotos del perfil:', error);
        const photoUrl = currentProfile.photoUrl;
        if (photoUrl && typeof photoUrl === 'string') {
          setProfilePhotosById((prev) => ({
            ...prev,
            [profileId]: [photoUrl],
          }));
        } else {
          setProfilePhotosById((prev) => ({
            ...prev,
            [profileId]: [],
          }));
        }
      }
    };

    loadPhotosForProfile().catch(() => undefined);
  }, [currentProfile, profilePhotosById]);

  useEffect(() => {
    if (!currentProfile || currentProfile.housing !== 'offering') return;
    if (roomPreviewByProfileId[currentProfile.id]) return;

    let isMounted = true;
    const loadRoomPreview = async () => {
      try {
        const rooms = await roomService.getRoomsByOwner(currentProfile.id);
        const availableRooms = rooms.filter((room) => room.is_available);
        if (availableRooms.length === 0) {
          if (isMounted) {
            setRoomPreviewByProfileId((prev) => ({
              ...prev,
              [currentProfile.id]: { count: 0 },
            }));
          }
          return;
        }

        const extras = await roomExtrasService.getExtrasForRooms(
          availableRooms.map((room) => room.id)
        );
        const extrasByRoomId = new Map(extras.map((extra) => [extra.room_id, extra]));
        const filteredRooms = availableRooms.filter(
          (room) => (extrasByRoomId.get(room.id)?.category ?? 'habitacion') !== 'area_comun'
        );
        if (filteredRooms.length === 0) {
          if (isMounted) {
            setRoomPreviewByProfileId((prev) => ({
              ...prev,
              [currentProfile.id]: { count: 0 },
            }));
          }
          return;
        }

        const previewRoom = filteredRooms[0];
        const previewExtras = extrasByRoomId.get(previewRoom.id);
        const previewPhoto = previewExtras?.photos?.[0]?.signedUrl ?? null;
        if (isMounted) {
          setRoomPreviewByProfileId((prev) => ({
            ...prev,
            [currentProfile.id]: {
              count: filteredRooms.length,
              photoUrl: previewPhoto,
              title: previewRoom.title ?? null,
              price: previewRoom.price_per_month ?? null,
            },
          }));
        }
      } catch (error) {
        console.warn('[SwipeScreen] Error cargando preview de piso:', error);
      }
    };

    loadRoomPreview().catch(() => undefined);

    return () => {
      isMounted = false;
    };
  }, [currentProfile, roomPreviewByProfileId]);

  const getProfilePhotos = (profile: SwipeProfile) =>
    profilePhotosById[profile.id] ?? (profile.photoUrl ? [profile.photoUrl] : []);

  const getPhotoIndex = (profile: SwipeProfile) =>
    photoIndexByProfile[profile.id] ?? 0;

  const setPhotoIndex = (profile: SwipeProfile, nextIndex: number) => {
    setPhotoIndexByProfile((prev) => ({
      ...prev,
      [profile.id]: nextIndex,
    }));
  };

  const goToNextPhoto = (profile: SwipeProfile) => {
    const photos = getProfilePhotos(profile);
    if (photos.length <= 1) return;
    const current = getPhotoIndex(profile);
    const next = (current + 1) % photos.length;
    setPhotoIndex(profile, next);
  };

  const goToPrevPhoto = (profile: SwipeProfile) => {
    const photos = getProfilePhotos(profile);
    if (photos.length <= 1) return;
    const current = getPhotoIndex(profile);
    const next = (current - 1 + photos.length) % photos.length;
    setPhotoIndex(profile, next);
  };

  const renderCard = (profile: SwipeProfile, index: number) => {
    if (index < currentIndex) return null;
    const isTop = index === currentIndex;
    const isNext = index === currentIndex + 1;

    return (
      <SwipeCard
        key={profile.id}
        profile={profile}
        isTop={isTop}
        isNext={isNext}
        position={position}
        rotate={rotate}
        cardLayoutStyle={cardLayoutStyle}
        panResponderHandlers={panResponder.panHandlers}
        profilePhotos={getProfilePhotos(profile)}
        photoIndex={getPhotoIndex(profile)}
        roomPreview={roomPreviewByProfileId[profile.id]}
        badges={getBadges(profile)}
        situationLabel={getSituationLabel(profile)}
        budgetLabel={getBudgetBadge(profile)}
        onGoToPrevPhoto={() => goToPrevPhoto(profile)}
        onGoToNextPhoto={() => goToNextPhoto(profile)}
        onViewProfile={() =>
          navigation.navigate('ProfileDetail', {
            profile: profile.profile,
            userId: profile.id,
          })
        }
      />
    );
  };

  return (
    <View style={[styles.container, safeAreaStyle]}>
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

      <View style={styles.content}>
        <View style={[styles.header, headerHeightStyle]}>
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <Text style={styles.title}>Explorar</Text>
              <Text style={styles.subtitle}>Encuentra tu match ideal</Text>
            </View>
            <View style={styles.headerRight}>
              <View
                style={[
                  styles.counterBadge,
                  isPremium && styles.counterBadgePremium,
                ]}
              >
                <Ionicons
                  name={isPremium ? 'sparkles' : 'flash'}
                  size={14}
                  color={isPremium ? theme.colors.primary : theme.colors.textStrong}
                />
                <Text
                  style={[
                    styles.counterText,
                    isPremium && styles.counterTextPremium,
                  ]}
                >
                  {isPremium ? 'Ilimitado' : `${SWIPE_LIMIT - swipesUsed} libres`}
                </Text>
              </View>
              <Pressable onPress={() => navigation.navigate('Filters')}>
                <View style={styles.filterButton}>
                  <Ionicons
                    name="options-outline"
                    size={18}
                    color={theme.colors.textStrong}
                  />
                </View>
              </Pressable>
            </View>
          </View>
        </View>

      {false && blockedProvinces.length > 0 && !allProvincesBlocked ? (
          <View style={styles.blockedProvinceBanner}>
            <Ionicons
              name="information-circle-outline"
              size={20}
              color={theme.colors.warning}
            />
            <Text style={styles.blockedProvinceText}>
              Algunas de tus zonas aún no tienen suficientes usuarios. Te avisaremos cuando estén disponibles.
            </Text>
          </View>
        ) : null}

        <View style={[styles.deckStage, deckHeightStyle]}>
          {loadingProfiles ? (
            <View style={styles.emptyState}>
              <Ionicons name="hourglass" size={36} color={theme.colors.textLight} />
              <Text style={styles.emptyTitle}>Cargando perfiles...</Text>
              <Text style={styles.emptySubtitle}>Buscando matches cercanos.</Text>
            </View>
          ) : !isSearchEnabled ? (
            <View style={styles.emptyState}>
              <Ionicons
                name="eye-off-outline"
                size={36}
                color={theme.colors.textLight}
              />
              <Text style={styles.emptyTitle}>Perfil oculto</Text>
              <Text style={styles.emptySubtitle}>
                Activa la visibilidad desde tu perfil para volver a buscar y aparecer en swipes.
              </Text>
            </View>
          ) : allProvincesBlocked ? (
            <View style={styles.emptyState}>
              <Ionicons
                name="lock-closed-outline"
                size={36}
                color={theme.colors.textLight}
              />
              <Text style={styles.emptyTitle}>Zona no disponible aún</Text>
              <Text style={styles.emptySubtitle}>
                Todavía no hay suficientes usuarios en tu zona. Te avisaremos cuando hayan más personas interesadas.
              </Text>
              <Text style={[styles.emptySubtitle, { marginTop: 12, fontStyle: 'italic' }]}>
                ¡Gracias por ser de los primeros! 🚀
              </Text>
            </View>
          ) : currentProfile ? (
            profiles
              .slice(currentIndex, currentIndex + 2)
              .map((profile, idx) => ({ profile, index: currentIndex + idx }))
              .reverse()
              .map(({ profile, index }) => renderCard(profile, index))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="heart-dislike" size={36} color={theme.colors.textLight} />
              <Text style={styles.emptyTitle}>
                {hasActiveFilters
                  ? 'Sin resultados con estos filtros'
                  : 'No hay mas perfiles'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {hasActiveFilters
                  ? 'Ajusta los filtros para ver mas perfiles.'
                  : 'Vuelve manana para mas swipes.'}
              </Text>
              {hasActiveFilters && (
                <Pressable onPress={() => resetFilters().catch(() => undefined)}>
                  <View style={styles.clearFiltersButton}>
                    <Text style={styles.clearFiltersText}>Limpiar filtros</Text>
                  </View>
                </Pressable>
              )}
              {profileError && (
                <Text style={styles.emptySubtitle}>{profileError}</Text>
              )}
            </View>
          )}
          {!canSwipe && currentProfile && !isLimitModalVisible && (
            <View style={styles.limitOverlay}>
              <Text style={styles.limitText}>Limite diario alcanzado</Text>
            </View>
          )}
        </View>

        <View style={[styles.actionDock, actionDockHeightStyle]}>
          <View style={styles.actionRow}>
            <ActionButton
              icon="close"
              onPress={() =>
                currentProfile ? handleSwipe('left', currentProfile) : undefined
              }
              disabled={!currentProfile || !canSwipe}
              size={actionButtonSize}
              styles={styles}
              theme={theme}
            />
            <ActionButton
              icon="paper-plane"
              onPress={() => setIsRequestModalVisible(true)}
              disabled={!currentProfile}
              size={actionButtonSize}
              styles={styles}
              theme={theme}
            />
            <ActionButton
              icon="heart"
              onPress={() =>
                currentProfile ? handleSwipe('right', currentProfile) : undefined
              }
              disabled={!currentProfile || !canSwipe}
              size={actionButtonSize}
              styles={styles}
              theme={theme}
            />
          </View>
        </View>
      </View>

      <Modal
        visible={isLimitModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsLimitModalVisible(false)}
      >
        <View style={styles.limitModalOverlay}>
          <View style={styles.limitModalCard}>
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.45)', 'rgba(255, 255, 255, 0.1)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={styles.limitModalGlowTop} />
            <View style={styles.limitModalGlowRight} />
            <View style={styles.limitModalGlowLeft} />
            <View style={styles.limitModalGlowBottom} />
            <View style={styles.limitModalHighlight} />
            <View style={styles.limitModalShine} />

            <View style={styles.limitModalOrbPrimary} />
            <View style={styles.limitModalOrbSecondary} />
            <View style={styles.limitModalOrbAccent} />

            <View style={styles.limitModalIconWrap}>
              <Ionicons
                name="heart-dislike"
                size={28}
                color={theme.colors.primaryDark}
              />
            </View>

            <View style={styles.limitModalContent}>
              <Text style={styles.limitModalTitle}>No te quedan likes!</Text>
              <Text style={styles.limitModalSubtitle}>
                Actualiza a Premium y consigue las siguientes ventajas:
              </Text>
              <View style={styles.limitModalList}>
                <Text style={styles.limitModalListItem}>• Swipes ilimitados</Text>
                <Text style={styles.limitModalListItem}>
                  • 10 mensajes directos a la semana
                </Text>
                <Text style={styles.limitModalListItem}>• Filtros personalizados</Text>
                <Text style={styles.limitModalListItem}>• Visibilidad priorizada</Text>
              </View>
              <View style={styles.limitModalChips}>
                <View style={styles.limitModalChip}>
                  <Text style={styles.limitModalChipText}>2,99€/mes</Text>
                </View>
                <View style={styles.limitModalChip}>
                  <Text style={styles.limitModalChipText}>19,99€/año</Text>
                </View>
              </View>
            </View>

            <View style={styles.limitModalActions}>
              <TouchableOpacity
                style={[styles.limitModalButton, styles.limitModalButtonPrimary]}
                onPress={() => {
                  setIsLimitModalVisible(false);
                  navigation.navigate('Subscription');
                }}
              >
                <Text style={styles.limitModalButtonTextPrimary}>
                  Actualizar a Premium
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.limitModalButton, styles.limitModalButtonGhost]}
                onPress={() => setIsLimitModalVisible(false)}
              >
                <Text style={styles.limitModalButtonTextGhost}>Cerrar</Text>
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
          setCurrentProfileForRequest(null);
        }}
      >
        <View style={styles.requestModalOverlay}>
          <TouchableOpacity
            style={styles.requestModalBackdrop}
            activeOpacity={1}
            onPress={() => {
              setIsRequestModalVisible(false);
              setRequestMessage('');
              setCurrentProfileForRequest(null);
            }}
          />
          <View
            style={[
              styles.requestModalCard,
              {
                backgroundColor: theme.colors.background,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Text style={[styles.requestModalTitle, { color: theme.colors.text }]}>
              Enviar mensaje
            </Text>
            {showRequestTip ? (
              <View style={styles.requestTipCard}>
                <Ionicons
                  name="information-circle-outline"
                  size={16}
                  color={theme.colors.primary}
                />
                <Text style={styles.requestTipText}>
                  Puedes enviar una solicitud sin match. Si la aceptan, se abre el chat.
                </Text>
                <Pressable
                  style={styles.requestTipButton}
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
                  <Text style={styles.requestTipButtonText}>Entendido</Text>
                </Pressable>
              </View>
            ) : null}
            <View style={styles.requestPreviewRow}>
              <View style={styles.requestAvatarWrap}>
                {(() => {
                  const photoUrl = currentProfileForRequest?.photoUrl || currentProfile?.photoUrl;
                  return photoUrl ? (
                    <Image
                      source={{ uri: photoUrl }}
                      style={styles.requestAvatar}
                    />
                  ) : (
                    <View style={styles.requestAvatarPlaceholder}>
                      <Ionicons name="person" size={16} color={theme.colors.textTertiary} />
                    </View>
                  );
                })()}
              </View>
              <View style={styles.requestPreviewInfo}>
                <Text style={[styles.requestPreviewName, { color: theme.colors.text }]}>
                  {(currentProfileForRequest?.name || currentProfile?.name) ?? 'Usuario'}
                </Text>
                <Text
                  style={[
                    styles.requestPreviewMeta,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  {(currentProfileForRequest?.age || currentProfile?.age) ? `${currentProfileForRequest?.age || currentProfile?.age} años` : 'Perfil verificado'}
                </Text>
              </View>
            </View>
            <View style={styles.requestLimitRow}>
              <View style={styles.requestLimitChip}>
                <Ionicons
                  name={isPremium ? 'sparkles' : 'lock-open-outline'}
                  size={14}
                  color={isPremium ? theme.colors.primary : theme.colors.textSecondary}
                />
                <Text style={styles.requestLimitText}>
                  {requestLimitText}
                </Text>
              </View>
              {!isPremium && (
                <TouchableOpacity
                  style={styles.requestUpgradeButton}
                  onPress={() => navigation.navigate('Subscription')}
                >
                  <Text style={styles.requestUpgradeText}>Hazte Premium</Text>
                </TouchableOpacity>
              )}
            </View>
            <Text
              style={[
                styles.requestModalSubtitle,
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
                styles.requestModalInput,
                {
                  color: theme.colors.text,
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.surfaceLight,
                },
              ]}
            />
            <View style={styles.requestCounterRow}>
              <Text style={styles.requestHintText}>
                Se sincero y menciona algo que compartan.
              </Text>
              <Text style={styles.requestCounterText}>
                {requestCharCount}/{MAX_REQUEST_CHARS}
              </Text>
            </View>
            <View style={styles.requestModalActions}>
              <TouchableOpacity
                style={[styles.requestModalButton, styles.requestModalCancel]}
                onPress={() => {
                  setIsRequestModalVisible(false);
                  setRequestMessage('');
                  setCurrentProfileForRequest(null);
                }}
                disabled={isSendingRequest}
              >
                <Text
                  style={[
                    styles.requestModalButtonText,
                    { color: theme.colors.text },
                  ]}
                >
                  Cancelar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.requestModalButton,
                  styles.requestModalSend,
                  isSendingRequest && styles.requestModalButtonDisabled,
                ]}
                onPress={handleSendRequest}
                disabled={isSendingRequest}
              >
                <Text style={styles.requestModalSendText}>
                  {isSendingRequest ? 'Enviando...' : 'Enviar'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const getActiveFilterCount = (filters: SwipeFilters) => {
  let count = 0;
  if (filters.housingSituation !== 'any') count += 1;
  if (filters.gender !== 'any') count += 1;
  const hasRuleFilters = Object.values(filters.rules ?? {}).some(
    (value) => value && value !== 'flexible'
  );
  if (hasRuleFilters) count += 1;
  if (filters.budgetMin > BUDGET_MIN || filters.budgetMax < BUDGET_MAX)
    count += 1;
  if (
    (filters.roommatesMin ?? DEFAULT_ROOMMATES_MIN) > ROOMMATES_MIN ||
    (filters.roommatesMax ?? DEFAULT_ROOMMATES_MAX) < ROOMMATES_MAX
  ) {
    count += 1;
  }
  if (filters.zones.length > 0) count += 1;
  if (filters.lifestyle.length > 0) count += 1;
  return count;
};

const applyFilters = (
  items: SwipeProfile[],
  filters: SwipeFilters,
  excludedProfileIds: string[]
) => {
  const excluded = new Set(excludedProfileIds);
  const zoneSet = new Set(filters.zones);
  const lifestyleLabels = filters.lifestyle
    .map((id) => lifestyleLabelById.get(id) ?? id)
    .filter(Boolean);

  const hasBudgetFilter =
    filters.budgetMin > BUDGET_MIN || filters.budgetMax < BUDGET_MAX;
  const useProfileBudgetFilter =
    hasBudgetFilter && filters.housingSituation !== 'offering';
  const hasRoommatesFilter =
    (filters.roommatesMin ?? DEFAULT_ROOMMATES_MIN) > ROOMMATES_MIN ||
    (filters.roommatesMax ?? DEFAULT_ROOMMATES_MAX) < ROOMMATES_MAX;

  const filtered = items.filter((profile) => {
    if (excluded.has(profile.id)) {
      return false;
    }

    if (
      filters.housingSituation !== 'any' &&
      profile.housing !== filters.housingSituation
    ) {
      return false;
    }

    if (filters.gender !== 'any') {
      if (filters.gender === 'flinta') {
        if (!profile.gender || profile.gender === 'male') {
          return false;
        }
      } else if (profile.gender !== filters.gender) {
        return false;
      }
    }

    if (lifestyleLabels.length > 0 && profile.housing !== 'offering') {
      if (profile.lifestyle.length > 0) {
        const matchesLifestyle = profile.lifestyle.some((chip) =>
          lifestyleLabels.includes(chip)
        );
        if (!matchesLifestyle) return false;
      }
    }

    if (useProfileBudgetFilter) {
      if (profile.budgetMin == null && profile.budgetMax == null) {
        return false;
      }
      const profileMin = profile.budgetMin ?? BUDGET_MIN;
      const profileMax = profile.budgetMax ?? BUDGET_MAX;
      if (profileMax < filters.budgetMin || profileMin > filters.budgetMax) {
        return false;
      }
    }

    if (hasRoommatesFilter) {
      if (
        profile.desiredRoommatesMin == null &&
        profile.desiredRoommatesMax == null
      ) {
        return false;
      }
      const profileMin = profile.desiredRoommatesMin ?? ROOMMATES_MIN;
      const profileMax = profile.desiredRoommatesMax ?? ROOMMATES_MAX;
      const filterMin = filters.roommatesMin ?? ROOMMATES_MIN;
      const filterMax = filters.roommatesMax ?? ROOMMATES_MAX;
      if (profileMax < filterMin || profileMin > filterMax) {
        return false;
      }
    }

    return true;
  });

  if (filters.zones.length === 0) {
    return filtered;
  }

  const ranked = filtered.map((profile, index) => {
    const matchesZone = profile.preferredZones.some((zone) => zoneSet.has(zone));
    return { profile, matchesZone, index };
  });

  ranked.sort((a, b) => {
    if (a.matchesZone === b.matchesZone) {
      return a.index - b.index;
    }
    return a.matchesZone ? -1 : 1;
  });

  return ranked.map((item) => item.profile);
};

