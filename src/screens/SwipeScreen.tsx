import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { borderRadius, colors, shadows, spacing, typography } from '../theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  BUDGET_MAX,
  BUDGET_MIN,
  lifestyleLabelById,
} from '../constants/swipeFilters';
import { useSwipeFilters } from '../context/SwipeFiltersContext';
import { profileService } from '../services/profileService';
import { profilePhotoService } from '../services/profilePhotoService';
import { authService } from '../services/authService';
import { API_CONFIG } from '../config/api';
import type { Profile } from '../types/profile';
import type { SwipeFilters } from '../types/swipeFilters';

type SwipeProfile = {
  id: string;
  name: string;
  age?: number;
  photoUrl: string;
  housing: 'seeking' | 'offering' | null;
  zone?: string;
  budgetMin?: number;
  budgetMax?: number;
  bio: string;
  lifestyle: string[];
  interests: string[];
  preferredZones: string[];
  roommates: number | null;
  profile: Profile;
};

const SWIPE_LIMIT = 20;
const SWIPE_THRESHOLD = 120;
const SWIPE_STORAGE_KEY = 'swipeDaily';
const FALLBACK_PHOTO =
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=900&q=80';

export const SwipeScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const { filters, resetFilters } = useSwipeFilters();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swipesUsed, setSwipesUsed] = useState(0);
  const [allProfiles, setAllProfiles] = useState<SwipeProfile[]>([]);
  const [profiles, setProfiles] = useState<SwipeProfile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [photoIndexByProfile, setPhotoIndexByProfile] = useState<
    Record<string, number>
  >({});
  const [profilePhotosById, setProfilePhotosById] = useState<
    Record<string, string[]>
  >({});
  const position = useRef(new Animated.ValueXY()).current;

  const screenWidth = Dimensions.get('window').width;
  const cardWidth = screenWidth - 40;

  const rotate = position.x.interpolate({
    inputRange: [-screenWidth, 0, screenWidth],
    outputRange: ['-12deg', '0deg', '12deg'],
    extrapolate: 'clamp',
  });

  const likeOpacity = position.x.interpolate({
    inputRange: [0, SWIPE_THRESHOLD],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const rejectOpacity = position.x.interpolate({
    inputRange: [-SWIPE_THRESHOLD, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const currentProfile = profiles[currentIndex];
  const canSwipe = swipesUsed < SWIPE_LIMIT;
  const activeFilterCount = getActiveFilterCount(filters);
  const hasActiveFilters = activeFilterCount > 0;

  const getTodayKey = () => new Date().toISOString().slice(0, 10);

  const getAuthHeaders = async (): Promise<HeadersInit> => {
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

  const updateSwipeCount = async (nextCount: number) => {
    setSwipesUsed(nextCount);
    await AsyncStorage.setItem(
      SWIPE_STORAGE_KEY,
      JSON.stringify({ date: getTodayKey(), count: nextCount })
    );
  };

  const advanceCard = () => {
    setCurrentIndex((prev) => prev + 1);
    const nextCount = Math.min(swipesUsed + 1, SWIPE_LIMIT);
    void updateSwipeCount(nextCount);
    position.setValue({ x: 0, y: 0 });
  };

  const handleSwipe = (direction: 'left' | 'right') => {
    if (!currentProfile || !canSwipe) return;
    if (direction === 'right') {
      void sendLike(currentProfile.id);
    }
    Animated.timing(position, {
      toValue: {
        x: direction === 'right' ? screenWidth + 100 : -screenWidth - 100,
        y: 0,
      },
      duration: 240,
      useNativeDriver: true,
    }).start(() => advanceCard());
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gesture) =>
        canSwipe && (Math.abs(gesture.dx) > 4 || Math.abs(gesture.dy) > 4),
      onPanResponderMove: (_, gesture) => {
        position.setValue({ x: gesture.dx, y: gesture.dy });
      },
      onPanResponderRelease: (_, gesture) => {
        if (!canSwipe) {
          position.setValue({ x: 0, y: 0 });
          return;
        }
        if (gesture.dx > SWIPE_THRESHOLD) {
          handleSwipe('right');
          return;
        }
        if (gesture.dx < -SWIPE_THRESHOLD) {
          handleSwipe('left');
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

  const getBadges = (profile: SwipeProfile) => {
    const badges = [];
    if (profile.housing === 'seeking') badges.push('Busco piso');
    if (profile.housing === 'offering')
      badges.push(`Tengo piso en ${profile.zone ?? 'zona top'}`);
    badges.push(formatBudget(profile));
    return badges;
  };

  const mapProfileToSwipe = (profile: Profile): SwipeProfile => {
    const avatar = profile.avatar_url;
    const photoUrl = avatar
      ? avatar.startsWith('http')
        ? avatar
        : `${API_CONFIG.SUPABASE_URL}/storage/v1/object/public/avatars/${avatar}`
      : FALLBACK_PHOTO;

    return {
      id: profile.id,
      name: profile.display_name ?? 'Usuario',
      age: profile.age ?? undefined,
      photoUrl,
      housing: profile.housing_situation ?? null,
      zone: profile.preferred_zones?.[0],
      budgetMin: profile.budget_min ?? undefined,
      budgetMax: profile.budget_max ?? undefined,
      bio: profile.bio ?? 'Sin descripcion por ahora.',
      interests: profile.interests ?? [],
      preferredZones: profile.preferred_zones ?? [],
      roommates: profile.num_roommates_wanted ?? null,
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
      const today = getTodayKey();
      const stored = await AsyncStorage.getItem(SWIPE_STORAGE_KEY);
      if (!stored) {
        await AsyncStorage.setItem(
          SWIPE_STORAGE_KEY,
          JSON.stringify({ date: today, count: 0 })
        );
        setSwipesUsed(0);
        return;
      }

      try {
        const parsed = JSON.parse(stored) as { date?: string; count?: number };
        if (parsed.date === today && typeof parsed.count === 'number') {
          setSwipesUsed(parsed.count);
        } else {
          await AsyncStorage.setItem(
            SWIPE_STORAGE_KEY,
            JSON.stringify({ date: today, count: 0 })
          );
          setSwipesUsed(0);
        }
      } catch {
        await AsyncStorage.setItem(
          SWIPE_STORAGE_KEY,
          JSON.stringify({ date: today, count: 0 })
        );
        setSwipesUsed(0);
      }
    };

    void loadSwipeCount();
  }, []);

  useEffect(() => {
    const loadProfiles = async () => {
      setLoadingProfiles(true);
      setProfileError(null);
      try {
        console.log('[SwipeScreen] loading recommendations...');
        const recommendations = await profileService.getProfileRecommendations();
        console.log(
          '[SwipeScreen] recommendations received:',
          recommendations.length
        );
        const mapped = recommendations.map((rec) =>
          mapProfileToSwipe(rec.profile)
        );
        console.log('[SwipeScreen] mapped profiles:', mapped.length);
        setAllProfiles(mapped);
      } catch (error) {
        console.error('Error cargando recomendaciones:', error);
        setAllProfiles([]);
        setProfileError('No se pudieron cargar perfiles reales.');
      } finally {
        setLoadingProfiles(false);
      }
    };

    void loadProfiles();
  }, []);

  useEffect(() => {
    const next = applyFilters(allProfiles, filters);
    setProfiles(next);
    setCurrentIndex(0);
    position.setValue({ x: 0, y: 0 });
  }, [allProfiles, filters, position]);

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
        } else {
          setProfilePhotosById((prev) => ({
            ...prev,
            [profileId]: [currentProfile.photoUrl],
          }));
        }
      } catch (error) {
        console.error('Error cargando fotos del perfil:', error);
        setProfilePhotosById((prev) => ({
          ...prev,
          [profileId]: [currentProfile.photoUrl],
        }));
      }
    };

    void loadPhotosForProfile();
  }, [currentProfile, profilePhotosById]);

  const getProfilePhotos = (profile: SwipeProfile) =>
    profilePhotosById[profile.id] ?? [profile.photoUrl];

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
    const stackOffset = isNext ? 10 : 0;
    const stackScale = isNext ? 0.96 : 1;

    const animatedStyle = isTop
      ? {
          transform: [
            { translateX: position.x },
            { translateY: position.y },
            { rotate },
          ],
        }
      : {
          transform: [{ translateY: stackOffset }, { scale: stackScale }],
        };

    return (
      <Animated.View
        key={profile.id}
        style={[
          styles.card,
          { width: cardWidth, zIndex: profiles.length - index },
          animatedStyle,
        ]}
        {...(isTop ? panResponder.panHandlers : {})}
      >
        <View style={styles.photoWrapper}>
          <Image
            source={{ uri: getProfilePhotos(profile)[getPhotoIndex(profile)] }}
            style={styles.cardImage}
          />
          {getProfilePhotos(profile).length > 1 && (
            <View style={styles.photoIndicators}>
              {getProfilePhotos(profile).map((_, photoIndex) => (
                <View
                  key={`${profile.id}-dot-${photoIndex}`}
                  style={[
                    styles.photoDot,
                    photoIndex === getPhotoIndex(profile) && styles.photoDotActive,
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
        </View>
        {isTop && (
          <>
            <Animated.View
              style={[styles.actionTag, styles.likeTag, { opacity: likeOpacity }]}
            >
              <Ionicons name="heart" size={16} color="#16A34A" />
              <Text style={styles.actionTagText}>LIKE</Text>
            </Animated.View>
            <Animated.View
              style={[styles.actionTag, styles.rejectTag, { opacity: rejectOpacity }]}
            >
              <Ionicons name="close" size={16} color="#EF4444" />
              <Text style={styles.actionTagText}>NOPE</Text>
            </Animated.View>
          </>
        )}
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle}>
            {profile.name}, {profile.age}
          </Text>
          <View style={styles.badgeRow}>
            {getBadges(profile).map((badge) => (
              <View key={badge} style={styles.badge}>
                <Text style={styles.badgeText}>{badge}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.bioText}>{profile.bio}</Text>
          <View style={styles.chipRow}>
            {profile.lifestyle.map((chip) => (
              <View key={chip} style={styles.chip}>
                <Text style={styles.chipText}>{chip}</Text>
              </View>
            ))}
          </View>
          <TouchableOpacity
            style={styles.detailTapArea}
            onPress={() =>
              navigation.navigate('ProfileDetail', {
                profile: profile.profile,
              })
            }
          >
            <Text style={styles.detailTapText}>Ver perfil completo</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Explorar</Text>
        </View>
        <View style={styles.headerActions}>
          <View style={styles.counterPill}>
            <Ionicons name="flash" size={16} color={colors.primary} />
            <Text style={styles.counterText}>
              {SWIPE_LIMIT - swipesUsed} libres
            </Text>
          </View>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => navigation.navigate('Filters')}
          >
            <Ionicons name="options-outline" size={18} color={colors.text} />
            {activeFilterCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>
                  {activeFilterCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.stack}>
        {loadingProfiles ? (
          <View style={styles.emptyState}>
            <Ionicons name="hourglass" size={42} color={colors.textTertiary} />
            <Text style={styles.emptyTitle}>Cargando perfiles...</Text>
            <Text style={styles.emptySubtitle}>Buscando matches cercanos.</Text>
          </View>
        ) : currentProfile ? (
          profiles.slice(currentIndex, currentIndex + 2).map((profile, index) =>
            renderCard(profile, currentIndex + index)
          )
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="heart-dislike" size={42} color={colors.textTertiary} />
            <Text style={styles.emptyTitle}>
              {hasActiveFilters
                ? 'Sin resultados con estos filtros'
                : 'No hay mas perfiles'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {hasActiveFilters
                ? 'Prueba a ajustar los filtros para ver mas perfiles.'
                : 'Vuelve manana para mas swipes.'}
            </Text>
            {hasActiveFilters && (
              <TouchableOpacity
                style={styles.clearFiltersButton}
                onPress={() => void resetFilters()}
              >
                <Text style={styles.clearFiltersText}>Limpiar filtros</Text>
              </TouchableOpacity>
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

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.rejectButton]}
          onPress={() => handleSwipe('left')}
          disabled={!currentProfile || !canSwipe}
        >
          <Ionicons name="close" size={22} color="#EF4444" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.likeButton]}
          onPress={() => handleSwipe('right')}
          disabled={!currentProfile || !canSwipe}
        >
          <Ionicons name="heart" size={22} color="#7C3AED" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: spacing.lg,
  },
  header: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    ...typography.h3,
    color: colors.text,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  counterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceLight,
  },
  counterText: {
    ...typography.smallMedium,
    color: colors.textSecondary,
  },
  filterButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceLight,
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  filterBadgeText: {
    ...typography.smallMedium,
    color: '#FFFFFF',
    fontSize: 10,
  },
  stack: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    position: 'absolute',
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    ...shadows.md,
  },
  cardImage: {
    width: '100%',
    height: 480,
  },
  photoWrapper: {
    position: 'relative',
  },
  photoTapOverlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
  },
  photoTapZone: {
    flex: 1,
  },
  photoIndicators: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  photoDot: {
    width: 18,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  photoDotActive: {
    backgroundColor: '#FFFFFF',
  },
  cardBody: {
    padding: spacing.md,
  },
  cardTitle: {
    ...typography.h4,
    color: colors.text,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
    marginBottom: 8,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceLight,
  },
  badgeText: {
    ...typography.smallMedium,
    color: colors.primaryDark,
  },
  bioText: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: 10,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryLight,
  },
  chipText: {
    ...typography.smallMedium,
    color: '#FFFFFF',
  },
  actionTag: {
    position: 'absolute',
    top: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
  },
  actionTagText: {
    ...typography.smallMedium,
    letterSpacing: 1,
  },
  likeTag: {
    left: 18,
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
  },
  rejectTag: {
    right: 18,
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: 120,
  },
  actionButton: {
    height: 70,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  rejectButton: {
    width: 70,
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
  },
  likeButton: {
    width: 70,
    backgroundColor: '#F3E8FF',
    borderColor: '#D8B4FE',
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing.lg,
  },
  emptyTitle: {
    ...typography.h4,
    color: colors.text,
    marginTop: spacing.md,
  },
  emptySubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  clearFiltersButton: {
    marginTop: spacing.md,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceLight,
  },
  clearFiltersText: {
    ...typography.smallMedium,
    color: colors.primaryDark,
  },
  limitOverlay: {
    position: 'absolute',
    bottom: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: borderRadius.full,
    backgroundColor: colors.warningLight,
  },
  limitText: {
    ...typography.smallMedium,
    color: colors.warning,
  },
  detailTapArea: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.surfaceLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailTapText: {
    ...typography.captionMedium,
    color: colors.primaryDark,
  },
});

const getActiveFilterCount = (filters: SwipeFilters) => {
  let count = 0;
  if (filters.housingSituation !== 'any') count += 1;
  if (filters.budgetMin > BUDGET_MIN || filters.budgetMax < BUDGET_MAX)
    count += 1;
  if (filters.zones.length > 0) count += 1;
  if (filters.roommates != null) count += 1;
  if (filters.lifestyle.length > 0) count += 1;
  if (filters.interests.length > 0) count += 1;
  return count;
};

const applyFilters = (items: SwipeProfile[], filters: SwipeFilters) => {
  const lifestyleLabels = filters.lifestyle
    .map((id) => lifestyleLabelById.get(id) ?? id)
    .filter(Boolean);

  const hasBudgetFilter =
    filters.budgetMin > BUDGET_MIN || filters.budgetMax < BUDGET_MAX;

  return items.filter((profile) => {
    if (
      filters.housingSituation !== 'any' &&
      profile.housing !== filters.housingSituation
    ) {
      return false;
    }

    if (filters.zones.length > 0) {
      const matchesZone = profile.preferredZones.some((zone) =>
        filters.zones.includes(zone)
      );
      if (!matchesZone) return false;
    }

    if (filters.roommates != null) {
      if (profile.roommates == null || profile.roommates !== filters.roommates) {
        return false;
      }
    }

    if (filters.interests.length > 0) {
      const matchesInterest = profile.interests.some((interest) =>
        filters.interests.includes(interest)
      );
      if (!matchesInterest) return false;
    }

    if (lifestyleLabels.length > 0) {
      const matchesLifestyle = profile.lifestyle.some((chip) =>
        lifestyleLabels.includes(chip)
      );
      if (!matchesLifestyle) return false;
    }

    if (hasBudgetFilter) {
      if (profile.budgetMin == null && profile.budgetMax == null) {
        return false;
      }
      const profileMin = profile.budgetMin ?? BUDGET_MIN;
      const profileMax = profile.budgetMax ?? BUDGET_MAX;
      if (profileMax < filters.budgetMin || profileMin > filters.budgetMax) {
        return false;
      }
    }

    return true;
  });
};
