import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  Animated,
  GestureResponderHandlers,
  Image,
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { BlurView } from '@react-native-community/blur';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme, useThemeController } from '../theme/ThemeContext';
import type { Theme } from '../theme';
import type { Gender } from '../types/gender';
import type { LifestylePreferences, LocationDisplayLevel, Profile } from '../types/profile';
import { SwipeCardStyles } from '../styles/components';

export type SwipeProfile = {
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
  occupation?: string | null;
  bio: string;
  lifestyle: string[];
  interests: string[];
  preferredZones: string[];
  gender?: Gender | null;
  locationDisplayLevel?: LocationDisplayLevel | null;
  locationZoneId?: string | null;
  locationZoneName?: string | null;
  locationCityId?: string | null;
  locationCityName?: string | null;
  locationProvinceCode?: string | null;
  locationProvinceName?: string | null;
  profile: Profile;
};

export type RoomPreview = {
  count: number;
  photoUrl?: string | null;
  title?: string | null;
  price?: number | null;
};

export type SwipeBadge = {
  icon: string;
  label: string;
};

type GlassProps = {
  style?: object;
  children: React.ReactNode;
};

const GlassPanel: React.FC<GlassProps & { glassFillStyle: object; styles: any; theme: Theme; isDark: boolean }> = ({
  style,
  children,
  glassFillStyle,
  styles,
  theme,
  isDark,
}) => (
  <View style={[styles.glassPanel, style]}>
    {isDark ? (
      <LinearGradient
        colors={['rgba(26, 31, 38, 0.72)', 'rgba(16, 21, 27, 0.72)']}
        style={StyleSheet.absoluteFillObject}
      />
    ) : null}
    <BlurView
      blurType="light"
      blurAmount={16}
      reducedTransparencyFallbackColor={theme.colors.glassOverlay}
      style={StyleSheet.absoluteFillObject}
    />
    <View style={[styles.glassFill, glassFillStyle]} />
    {children}
  </View>
);

const GlassChip: React.FC<GlassProps & { glassFillStyle: object; styles: any; theme: Theme; isDark: boolean }> = ({
  style,
  children,
  glassFillStyle,
  styles,
  theme,
  isDark,
}) => (
  <View style={[styles.glassChip, style]}>
    <BlurView
      blurType={isDark ? "dark" : "light"}
      blurAmount={18}
      reducedTransparencyFallbackColor={isDark ? theme.colors.glassOverlay : theme.colors.glassUltraLight}
      style={StyleSheet.absoluteFillObject}
    />
    <View style={[styles.glassFill, glassFillStyle]} />
    {children}
  </View>
);

const GlassButton: React.FC<GlassProps & { glassFillStyle: object; styles: any; theme: Theme; isDark: boolean }> = ({
  style,
  children,
  glassFillStyle,
  styles,
  theme,
  isDark,
}) => (
  <View style={[styles.glassButton, style]}>
    <BlurView
      blurType={isDark ? "dark" : "light"}
      blurAmount={20}
      reducedTransparencyFallbackColor={isDark ? theme.colors.glassOverlay : theme.colors.glassUltraLight}
      style={StyleSheet.absoluteFillObject}
    />
    <View style={[styles.glassFill, glassFillStyle]} />
    {children}
  </View>
);

type SwipeCardProps = {
  profile: SwipeProfile;
  isTop: boolean;
  isNext: boolean;
  position: Animated.ValueXY;
  rotate: Animated.AnimatedInterpolation<string>;
  cardLayoutStyle: { width: number; height: number };
  panResponderHandlers: GestureResponderHandlers;
  profilePhotos: string[];
  photoIndex: number;
  roomPreview?: RoomPreview;
  badges: SwipeBadge[];
  situationLabel: string | null;
  budgetLabel?: string | null;
  onGoToPrevPhoto: () => void;
  onGoToNextPhoto: () => void;
  onViewProfile: () => void;
};

export const SwipeCard: React.FC<SwipeCardProps> = ({
  profile,
  isTop,
  isNext,
  position,
  rotate,
  cardLayoutStyle,
  panResponderHandlers,
  profilePhotos,
  photoIndex,
  roomPreview,
  badges,
  situationLabel,
  budgetLabel,
  onGoToPrevPhoto,
  onGoToNextPhoto,
  onViewProfile,
}) => {
  const theme = useTheme();
  const { isDark } = useThemeController();
  const styles = useMemo(() => SwipeCardStyles(theme), [theme]);
  const nameOverlayBottom =
    profile.housing === 'offering' ? 215 : 205;

  const glassFillStyle = useMemo(
    () => ({
      backgroundColor: isDark
        ? theme.colors.glassSubtle
        : theme.colors.glassMid
    }),
    [theme.colors.glassMid, theme.colors.glassSubtle, isDark]
  );

  const chips = badges.slice(0, 3);
  const showRoomPreview = profile.housing === 'offering' && roomPreview && roomPreview.count > 0;
  const hasPhotos = profilePhotos.length > 0;
  const chipIconSize = theme.semanticSizes?.iconSm ?? theme.sizes?.s18 ?? 18;
  type LifestyleKey = keyof LifestylePreferences;
  const lifestyleKeyLabels: Record<LifestyleKey, string> = {
    schedule: 'Horario',
    cleaning: 'Limpieza',
    guests: 'Invitados',
    smoking: 'Fumar',
    pets: 'Mascotas',
  };
  const lifestyleKeyIcons: Record<LifestyleKey, string> = {
    schedule: 'time-outline',
    cleaning: 'sparkles-outline',
    guests: 'people-outline',
    smoking: 'cloud-outline',
    pets: 'paw-outline',
  };
  const lifestylePrefs = profile.profile?.lifestyle_preferences ?? null;
  const lifestylePriority: LifestyleKey[] = [
    'cleaning',
    'schedule',
    'guests',
    'smoking',
    'pets',
  ];
  const lifestyleEntries = lifestylePrefs
    ? lifestylePriority
        .map((key) => [key, lifestylePrefs[key]] as const)
        .filter(([, value]) => Boolean(value))
    : [];
  const lifestyleChips = lifestyleEntries
    .slice(0, 2)
    .map(([key, value]) => ({
      icon: lifestyleKeyIcons[key] ?? 'leaf-outline',
      label: `${lifestyleKeyLabels[key] ?? key}: ${value}`,
    }));
  const bottomChips = lifestyleChips.filter(
    (chip): chip is { icon: string; label: string } => Boolean(chip)
  );

  const stackOffset = isNext ? 3 : 0;
  const stackScale = isNext ? 0.992 : 1;

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
      style={[styles.cardWrap, cardLayoutStyle, animatedStyle]}
      {...(isTop ? panResponderHandlers : {})}
    >
      <View style={styles.cardShell}>
        {hasPhotos ? (
          <ImageBackground
            source={{ uri: profilePhotos[photoIndex] }}
            style={styles.cardImage}
            imageStyle={styles.cardImageRadius}
          >
            {situationLabel ? (
              <View style={styles.imageBadge}>
                <Text style={styles.imageBadgeText}>{situationLabel}</Text>
              </View>
            ) : null}
            {budgetLabel ? (
              <View style={styles.budgetBadge}>
                <Text style={styles.budgetBadgeText}>{budgetLabel}</Text>
              </View>
            ) : null}
            {profilePhotos.length > 1 && (
              <View style={styles.photoIndicators}>
                {profilePhotos.map((_, idx) => (
                  <View
                    key={`${profile.id}-dot-${idx}`}
                    style={[
                      styles.photoDot,
                      idx === photoIndex && styles.photoDotActive,
                    ]}
                  />
                ))}
              </View>
            )}
            <View style={[styles.cardNameOverlay, { bottom: nameOverlayBottom }]}>
              <Text style={styles.cardNameText}>
                {profile.age ? `${profile.name}, ${profile.age}` : profile.name}
              </Text>
            </View>
            <View style={styles.photoTapOverlay} pointerEvents="box-none">
              <TouchableOpacity
                style={styles.photoTapZone}
                onPress={onGoToPrevPhoto}
                activeOpacity={0.9}
              />
              <TouchableOpacity
                style={styles.photoTapZone}
                onPress={onGoToNextPhoto}
                activeOpacity={0.9}
              />
            </View>
          </ImageBackground>
        ) : (
          <View style={styles.cardImagePlaceholder}>
            <ActivityIndicator size="small" color={theme.colors.textLight} />
            <Text style={styles.cardImagePlaceholderText}>Cargando fotos...</Text>
          </View>
        )}
        <GlassPanel
          style={styles.cardInfo}
          glassFillStyle={glassFillStyle}
          styles={styles}
          theme={theme}
          isDark={isDark}
        >
          <View style={[styles.tagRow, styles.tagRowNoWrap]}>
            {chips.map((chip) => (
              <GlassChip
                style={styles.tag}
                key={`${chip.icon}-${chip.label}`}
                glassFillStyle={glassFillStyle}
                styles={styles}
                theme={theme}
                isDark={isDark}
              >
                <View style={styles.tagContent}>
                  <Ionicons
                    name={chip.icon}
                    size={chipIconSize}
                    color={theme.colors.textStrong}
                  />
                  <Text style={styles.tagText}>{chip.label}</Text>
                </View>
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
                  <Text style={styles.roomPreviewCountText}>+{roomPreview.count - 1}</Text>
                </View>
              ) : null}
            </View>
          ) : null}
          <Text style={styles.profileBio} numberOfLines={3}>
            {profile.bio}
          </Text>
          {bottomChips.length > 0 ? (
            <View style={styles.tagRow}>
              {bottomChips.map((chip) => (
                <GlassChip
                  style={styles.tag}
                  key={`${chip.icon}-${chip.label}`}
                  glassFillStyle={glassFillStyle}
                  styles={styles}
                  theme={theme}
                  isDark={isDark}
                >
                  <View style={styles.tagContent}>
                    <Ionicons
                      name={chip.icon}
                      size={chipIconSize}
                      color={theme.colors.textStrong}
                    />
                    <Text style={styles.tagText}>{chip.label}</Text>
                  </View>
                </GlassChip>
              ))}
            </View>
          ) : null}
          <Pressable style={styles.profileButton} onPress={onViewProfile}>
            <GlassButton
              style={styles.profileButtonGlass}
              glassFillStyle={glassFillStyle}
              styles={styles}
              theme={theme}
              isDark={isDark}
            >
              <Text style={styles.profileButtonText}>Ver perfil completo</Text>
              <Ionicons name="chevron-forward" size={16} color={theme.colors.textStrong} />
            </GlassButton>
          </Pressable>
        </GlassPanel>
      </View>
    </Animated.View>
  );
};
