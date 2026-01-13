import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  ActivityIndicator,
  Image,
  ImageBackground,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from '@react-native-community/blur';
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
import type { Gender } from '../types/gender';
import type { HousingSituation, Profile } from '../types/profile';
import type { SwipeFilters } from '../types/swipeFilters';
import { SwipeScreenStyles } from '../styles/screens';

type SwipeProfile = {
  id: string;
  name: string;
  age?: number;
  photoUrl?: string | null;
  housing: 'seeking' | 'offering' | null;
  zone?: string;
  budgetMin?: number;
  budgetMax?: number;
  desiredRoommatesMin?: number | null;
  desiredRoommatesMax?: number | null;
  bio: string;
  lifestyle: string[];
  interests: string[];
  preferredZones: string[];
  gender?: Gender | null;
  profile: Profile;
};

const SWIPE_LIMIT = 20;
let isSwiping = false;

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
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileHousing, setProfileHousing] = useState<HousingSituation | null>(
    null
  );
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

  const position = useRef(new Animated.ValueXY()).current;
  const currentProfileRef = useRef<SwipeProfile | null>(null);
  const canSwipeRef = useRef(false);
  const swipeThresholdRef = useRef(0);
  const skipResetRef = useRef(false);
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
    Math.round(Math.min(deckHeight * 0.96, windowHeight - 260))
  );
  const glassFillStyle = useMemo(
    () => ({ backgroundColor: theme.colors.glassLight }),
    [theme.colors.glassLight]
  );

  type GlassProps = {
    style?: object;
    children: React.ReactNode;
  };

  const GlassPanel: React.FC<GlassProps> = ({ style, children }) => (
    <View style={[styles.glassPanel, style]}>
      <BlurView
        blurType="light"
        blurAmount={16}
        reducedTransparencyFallbackColor={theme.colors.glassUltraLight}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={[styles.glassFill, glassFillStyle]} />
      {children}
    </View>
  );

  const GlassChip: React.FC<GlassProps> = ({ style, children }) => (
    <View style={[styles.glassChip, style]}>
      <BlurView
        blurType="light"
        blurAmount={14}
        reducedTransparencyFallbackColor={theme.colors.glassUltraLight}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={[styles.glassFill, glassFillStyle]} />
      {children}
    </View>
  );

  const GlassButton: React.FC<GlassProps> = ({ style, children }) => (
    <View style={[styles.glassButton, style]}>
      <BlurView
        blurType="light"
        blurAmount={16}
        reducedTransparencyFallbackColor={theme.colors.glassUltraLight}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={[styles.glassFill, glassFillStyle]} />
      {children}
    </View>
  );

  const ActionButton = ({
    icon,
    onPress,
    disabled,
    size,
  }: {
    icon: string;
    onPress?: () => void;
    disabled?: boolean;
    size: number;
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

  const currentProfile = profiles[currentIndex];
  const canSwipe = isSearchEnabled && (isPremium || swipesUsed < SWIPE_LIMIT);
  const activeFilterCount = getActiveFilterCount(filters);
  const hasActiveFilters = activeFilterCount > 0;
  const lifestyleIdByLabel = useMemo(
    () => new Map(ESTILO_VIDA_OPTIONS.map((option) => [option.label, option.id])),
    []
  );
  currentProfileRef.current = currentProfile ?? null;
  canSwipeRef.current = canSwipe;
  swipeThresholdRef.current = swipeThreshold;

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
    try {
      const { count } = await swipeLimitService.incrementDailyCount();
      setSwipesUsed(count);
    } catch (error) {
      console.warn('[SwipeScreen] Error actualizando swipes:', error);
      setSwipesUsed((prev) => Math.min(prev + 1, SWIPE_LIMIT));
    }
  };

  const advanceCard = () => {
    incrementSwipeCount().catch(() => undefined);
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
      advanceCard();
      skipResetRef.current = true;
      setExcludedProfileIds((prev) =>
        prev.includes(swipedId) ? prev : [...prev, swipedId]
      );
      isSwiping = false;
    });
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

  const getSituationLabel = (profile: SwipeProfile) => {
    if (profile.housing === 'offering') {
      return profile.profile?.is_seeking ? 'Ofrezco y busco' : 'Ofrezco piso';
    }
    if (profile.housing === 'seeking') return 'Busco piso';
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

  const getBadges = (profile: SwipeProfile) => {
    const badges = [];

    // 1. Presupuesto (siempre importante)
    badges.push(`💰 ${formatBudget(profile)}`);

    // 2. Zona principal
    const primaryZone =
      getZoneLabel(profile.zone) ??
      getZoneLabel(profile.preferredZones?.[0] ?? null);
    if (primaryZone) {
      badges.push(`📍 ${primaryZone}`);
    }

    // 3. Genero
    const genderLabel = getGenderLabel(profile.gender ?? null);
    if (genderLabel) {
      badges.push(`👤 ${genderLabel}`);
    }

    // 4. Número de compañeros deseados
    if (profile.desiredRoommatesMin != null || profile.desiredRoommatesMax != null) {
      const min = profile.desiredRoommatesMin ?? 1;
      const max = profile.desiredRoommatesMax ?? 5;
      const roommatesText = min === max
        ? `${min} ${min === 1 ? 'compañero' : 'compañeros'}`
        : `${min}-${max} compañeros`;
      badges.push(`👥 ${roommatesText}`);
    }

    // 5. Interés principal (personalidad)
    if (profile.interests?.[0]) {
      badges.push(`🎯 ${profile.interests[0]}`);
    }

    // 6. Estilo de vida principal
    if (profile.lifestyle?.[0]) {
      badges.push(`🌟 ${profile.lifestyle[0]}`);
    }

    return badges.slice(0, 4); // Mostrar máximo 4 chips
  };

  const mapProfileToSwipe = (profile: Profile): SwipeProfile | null => {
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
      age: profile.age ?? undefined,
      photoUrl,
      housing: profile.housing_situation ?? null,
      zone: profile.preferred_zones?.[0],
      budgetMin: profile.budget_min ?? undefined,
      budgetMax: profile.budget_max ?? undefined,
      desiredRoommatesMin: profile.desired_roommates_min ?? null,
      desiredRoommatesMax: profile.desired_roommates_max ?? null,
      bio: profile.bio ?? 'Sin descripcion por ahora.',
      interests: profile.interests ?? [],
      preferredZones: profile.preferred_zones ?? [],
      gender: profile.gender ?? null,
      lifestyle: profile.lifestyle_preferences
        ? Object.values(profile.lifestyle_preferences).filter(
            (item): item is string => Boolean(item)
          )
        : [],
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

  useEffect(() => {
    const loadProfiles = async () => {
      if (!isSearchEnabled) {
        setLoadingProfiles(false);
        setProfileError(null);
        setAllProfiles([]);
        return;
      }
      setLoadingProfiles(true);
      setProfileError(null);
      try {
        const [recommendations, existingMatches, rejections] = await Promise.all([
          profileService.getProfileRecommendations(
            activeFilterCount > 0 ? filters : undefined
          ),
          chatService.getMatches(),
          swipeRejectionService.getRejections(),
        ]);
        const excluded = new Set<string>();
        existingMatches.forEach((match) => {
          const isOutgoingPending = match.status === 'pending' && match.isOutgoing;
          const isResolvedStatus = [
            'accepted',
            'rejected',
            'room_offer',
            'room_assigned',
            'room_declined',
          ].includes(match.status);
          if (isResolvedStatus || isOutgoingPending) {
            excluded.add(match.profileId);
          }
        });
        rejections.forEach((rejection) =>
          excluded.add(rejection.rejectedProfileId)
        );
        const mapped = recommendations
          .map((rec) => mapProfileToSwipe(rec.profile))
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
      }
    };

    if (profileFiltersApplied) {
      loadProfiles().catch(() => undefined);
    }
  }, [activeFilterCount, filters, isSearchEnabled, profileFiltersApplied]);

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
    const next = applyFilters(allProfiles, filters, excludedProfileIds);
    setProfiles(next);
    if (skipResetRef.current) {
      skipResetRef.current = false;
      return;
    }
    if (!isSwiping) {
      setCurrentIndex(0);
      position.setValue({ x: 0, y: 0 });
    }
  }, [allProfiles, filters, excludedProfileIds, position]);

  useEffect(() => {
    const loadPhotosForProfile = async () => {
      if (!currentProfile) return;
      const profileId = currentProfile.id;
      if (profilePhotosById[profileId]) return;

      try {
        const photos = await profilePhotoService.getPhotosForProfile(profileId);
        const urls = photos.map((photo) => photo.signedUrl).filter(Boolean);
        if (urls.length > 0) {
          setProfilePhotosById((prev) => ({
            ...prev,
            [profileId]: urls,
          }));
          return;
        }
        if (currentProfile.photoUrl) {
          setProfilePhotosById((prev) => ({
            ...prev,
            [profileId]: [currentProfile.photoUrl],
          }));
          return;
        }
        setProfilePhotosById((prev) => ({
          ...prev,
          [profileId]: [],
        }));
      } catch (error) {
        console.error('Error cargando fotos del perfil:', error);
        if (currentProfile.photoUrl) {
          setProfilePhotosById((prev) => ({
            ...prev,
            [profileId]: [currentProfile.photoUrl],
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
    const stackOffset = isNext ? 3 : 0;
    const stackScale = isNext ? 0.992 : 1;
    const chips = getBadges(profile).slice(0, 3);
    const situationLabel = getSituationLabel(profile);
    const roomPreview = roomPreviewByProfileId[profile.id];
    const showRoomPreview =
      profile.housing === 'offering' && roomPreview && roomPreview.count > 0;
    const profilePhotos = getProfilePhotos(profile);
    const hasPhotos = profilePhotos.length > 0;

    const cardStackStyle = {
      zIndex: isTop ? 2 : isNext ? 1 : 0,
    };
    const animatedStyle = isTop
      ? {
          ...cardStackStyle,
          transform: [
            { translateX: position.x },
            { translateY: position.y },
            { rotate },
          ],
        }
      : {
          ...cardStackStyle,
          transform: [{ translateY: stackOffset }, { scale: stackScale }],
        };

    return (
      <Animated.View
        key={profile.id}
        style={[styles.cardWrap, cardLayoutStyle, animatedStyle]}
        {...(isTop ? panResponder.panHandlers : {})}
      >
        <View style={styles.cardShell}>
          {hasPhotos ? (
            <ImageBackground
              source={{ uri: profilePhotos[getPhotoIndex(profile)] }}
              style={styles.cardImage}
              imageStyle={styles.cardImageRadius}
            >
              {situationLabel ? (
                <View style={styles.imageBadge}>
                  <Text style={styles.imageBadgeText}>{situationLabel}</Text>
                </View>
              ) : null}
              {profilePhotos.length > 1 && (
                <View style={styles.photoIndicators}>
                  {profilePhotos.map((_, photoIndex) => (
                    <View
                      key={`${profile.id}-dot-${photoIndex}`}
                      style={[
                        styles.photoDot,
                        photoIndex === getPhotoIndex(profile) &&
                          styles.photoDotActive,
                      ]}
                    />
                  ))}
                </View>
              )}
              <View style={styles.photoTapOverlay}>
                <TouchableOpacity
                  style={styles.photoTapZone}
                  onPress={() => goToPrevPhoto(profile)}
                  activeOpacity={0.9}
                />
                <TouchableOpacity
                  style={styles.photoTapZone}
                  onPress={() => goToNextPhoto(profile)}
                  activeOpacity={0.9}
                />
              </View>
            </ImageBackground>
          ) : (
            <View style={styles.cardImagePlaceholder}>
              <ActivityIndicator size="small" color={theme.colors.textLight} />
              <Text style={styles.cardImagePlaceholderText}>
                Cargando fotos...
              </Text>
            </View>
          )}
          <GlassPanel style={styles.cardInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.profileName}>
                  {profile.age ? `${profile.name}, ${profile.age}` : profile.name}
                </Text>
              </View>
              <View style={styles.tagRow}>
                {chips.map((chip) => (
                  <GlassChip style={styles.tag} key={chip}>
                    <Text style={styles.tagText}>{chip}</Text>
                  </GlassChip>
                ))}
              </View>
              {showRoomPreview ? (
                <View style={styles.roomPreviewRow}>
                  {roomPreview.photoUrl ? (
                    <Image
                      source={{ uri: roomPreview.photoUrl }}
                      style={styles.roomPreviewThumb}
                    />
                  ) : (
                    <View style={styles.roomPreviewPlaceholder}>
                      <Ionicons
                        name="home-outline"
                        size={16}
                        color={theme.colors.textTertiary}
                      />
                    </View>
                  )}
                  <View style={styles.roomPreviewInfo}>
                    <Text style={styles.roomPreviewTitle}>Habitaciones disponibles</Text>
                    <Text style={styles.roomPreviewMeta} numberOfLines={1}>
                      {roomPreview.title ?? 'Habitacion disponible'}
                      {roomPreview.price != null ? ` · ${roomPreview.price} EUR/mes` : ''}
                    </Text>
                  </View>
                  {roomPreview.count > 1 ? (
                    <View style={styles.roomPreviewCount}>
                      <Text style={styles.roomPreviewCountText}>
                        +{roomPreview.count - 1}
                      </Text>
                    </View>
                  ) : null}
                </View>
              ) : null}
              <Text style={styles.profileBio} numberOfLines={3}>
                {profile.bio}
              </Text>
            <Pressable
              style={styles.profileButton}
              onPress={() =>
                navigation.navigate('ProfileDetail', {
                  profile: profile.profile,
                  userId: profile.id,
                })
              }
            >
              <GlassButton style={styles.profileButtonGlass}>
                <Text style={styles.profileButtonText}>Ver perfil completo</Text>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={theme.colors.textStrong}
                />
              </GlassButton>
            </Pressable>
          </GlassPanel>
        </View>
      </Animated.View>
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
                  name={isPremium ? 'star' : 'flash'}
                  size={14}
                  color={isPremium ? '#FFD700' : theme.colors.textStrong}
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
          {!canSwipe && currentProfile && (
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
            />
            <ActionButton
              icon="heart"
              onPress={() =>
                currentProfile ? handleSwipe('right', currentProfile) : undefined
              }
              disabled={!currentProfile || !canSwipe}
              size={actionButtonSize}
            />
          </View>
        </View>
      </View>
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

