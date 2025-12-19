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
import { profileService } from '../services/profileService';
import { API_CONFIG } from '../config/api';
import type { Profile } from '../types/profile';

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
  profile: Profile;
};

const SWIPE_LIMIT = 20;
const SWIPE_THRESHOLD = 120;
const SWIPE_STORAGE_KEY = 'swipeDaily';
const FALLBACK_PHOTO =
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=900&q=80';

export const SwipeScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swipesUsed, setSwipesUsed] = useState(0);
  const [profiles, setProfiles] = useState<SwipeProfile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
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

  const getTodayKey = () => new Date().toISOString().slice(0, 10);

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
      onStartShouldSetPanResponder: () => canSwipe,
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
    if (profile.budgetMin && profile.budgetMax) {
      return `${profile.budgetMin}-${profile.budgetMax} EUR`;
    }
    if (profile.budgetMin) return `Desde ${profile.budgetMin} EUR`;
    if (profile.budgetMax) return `Hasta ${profile.budgetMax} EUR`;
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
        const recommendations = await profileService.getProfileRecommendations();
        const mapped = recommendations.map((rec) =>
          mapProfileToSwipe(rec.profile)
        );
        setProfiles(mapped);
        setCurrentIndex(0);
      } catch (error) {
        console.error('Error cargando recomendaciones:', error);
        setProfiles([]);
        setProfileError('No se pudieron cargar perfiles reales.');
      } finally {
        setLoadingProfiles(false);
      }
    };

    void loadProfiles();
  }, []);

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
        <Image source={{ uri: profile.photoUrl }} style={styles.cardImage} />
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
        </View>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Explorar</Text>
          <Text style={styles.subtitle}>
            Swipes diarios {swipesUsed}/{SWIPE_LIMIT}
          </Text>
        </View>
        <View style={styles.counterPill}>
          <Ionicons name="flash" size={16} color={colors.primary} />
          <Text style={styles.counterText}>{SWIPE_LIMIT - swipesUsed} libres</Text>
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
            <Text style={styles.emptyTitle}>No hay mas perfiles</Text>
            <Text style={styles.emptySubtitle}>
              Vuelve manana para mas swipes.
            </Text>
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
          style={[styles.actionButton, styles.detailButton]}
          onPress={() =>
            navigation.navigate('ProfileDetail', {
              profile: currentProfile.profile,
            })
          }
          disabled={!currentProfile}
        >
          <Text style={styles.detailButtonText}>Ver detalles completos</Text>
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
    height: 280,
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
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: 12,
  },
  actionButton: {
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  rejectButton: {
    width: 56,
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
  },
  likeButton: {
    width: 56,
    backgroundColor: '#F3E8FF',
    borderColor: '#D8B4FE',
  },
  detailButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  detailButtonText: {
    ...typography.bodyMedium,
    color: '#FFFFFF',
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
});
