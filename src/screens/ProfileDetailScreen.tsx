// src/screens/ProfileDetailScreen.tsx
import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
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
  NativeSyntheticEvent,
  NativeScrollEvent,
  Animated,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { PinchGestureHandler, State } from 'react-native-gesture-handler';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { BlurView } from '@react-native-community/blur';
import LinearGradient from 'react-native-linear-gradient';
import Share from 'react-native-share';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { colors } from '../theme';
import { API_CONFIG } from '../config/api';
import { profileService } from '../services/profileService';
import { profilePhotoService } from '../services/profilePhotoService';
import { shareService } from '../services/shareService';
import { roomService } from '../services/roomService';
import { roomExtrasService } from '../services/roomExtrasService';
import { roomAssignmentService } from '../services/roomAssignmentService';
import { AuthContext } from '../context/AuthContext';
import { INTERESES_OPTIONS, ZONAS_OPTIONS } from '../constants/swipeFilters';
import type { Profile, ProfilePhoto } from '../types/profile';
import type { Flat, Room, RoomExtras } from '../types/room';
import { ProfileDetailScreenStyles as styles } from '../styles/screens';

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
  ['bano_compartido', 'Bano compartido'],
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

const zoneLabelById = new Map(
  ZONAS_OPTIONS.map((option) => [option.id, option.label])
);

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
    if (normalized.includes('banos')) return 'banos';
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

export const ProfileDetailScreen: React.FC<ProfileDetailScreenProps> = ({
  userId,
}) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profilePhotos, setProfilePhotos] = useState<ProfilePhoto[]>([]);
  const [lightboxVisible, setLightboxVisible] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxFrameWidth, setLightboxFrameWidth] = useState(0);
  const lightboxScrollRef = useRef<ScrollView>(null);
  const lightboxScaleStates = useRef<
    Array<{ base: Animated.Value; pinch: Animated.Value; lastScale: number }>
  >([]);
  const [activeTab, setActiveTab] = useState<'perfil' | 'piso'>('perfil');
  const [flats, setFlats] = useState<Flat[]>([]);
  const [flatRooms, setFlatRooms] = useState<Room[]>([]);
  const [flatExtras, setFlatExtras] = useState<Record<string, RoomExtras | null>>({});
  const [flatLoading, setFlatLoading] = useState(false);
  const [flatAssignments, setFlatAssignments] = useState<Record<string, boolean>>({});
  const [flatAssignmentsToMe, setFlatAssignmentsToMe] = useState<
    Record<string, boolean>
  >({});
  const [expandedRules, setExpandedRules] = useState<Record<string, boolean>>({});
  const [activeFlatIndex, setActiveFlatIndex] = useState(0);
  const [isSharing, setIsSharing] = useState(false);

  const navigation = useNavigation<StackNavigationProp<any>>();
  const route = useRoute();
  const authContext = useContext(AuthContext);
  const currentUserId = authContext?.user?.id ?? '';
  const routeParams = route as { params?: { profile?: Profile; fromMatch?: boolean } };
  const routeProfile = routeParams.params?.profile;
  const isFromMatch = Boolean(routeParams.params?.fromMatch);
  const isOwnProfile =
    (!routeProfile && (!userId || userId === currentUserId)) ||
    routeProfile?.id === currentUserId;

  const handleLogout = () => {
    if (!authContext?.logout) return;
    Alert.alert('Cerrar sesion', 'Quieres salir de tu cuenta?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Salir',
        style: 'destructive',
        onPress: async () => {
          try {
            await authContext.logout();
          } finally {
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          }
        },
      },
    ]);
  };

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
      } else {
        setProfilePhotos([]);
      }
      return;
    }

    loadProfile();
    loadPhotos();
  }, [userId, routeProfile, currentUserId]);

  const loadProfile = async () => {
    try {
      const data = await profileService.getProfile();
      setProfile(data);
    } catch (error) {
      console.error('Error cargando perfil:', error);
      Alert.alert('Error', 'No se pudo cargar el perfil');
    } finally {
      setLoading(false);
    }
  };

  const loadPhotos = async () => {
    try {
      const data = await profilePhotoService.getPhotos();
      setProfilePhotos(data);
    } catch (error) {
      console.error('Error cargando fotos:', error);
    }
  };

  const loadFlatData = useCallback(async () => {
    if (!profile?.id) {
      setActiveTab('perfil');
      setFlats([]);
      setFlatRooms([]);
      setFlatExtras({});
      setFlatAssignments({});
      setFlatAssignmentsToMe({});
      return;
    }

    try {
      setFlatLoading(true);
      if (profile.housing_situation === 'offering') {
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
        await Promise.all(
          roomsData.map(async (roomItem) => {
            try {
              const assignmentsResponse =
                await roomAssignmentService.getAssignmentsForRoom(roomItem.id);
              const hasAcceptedAssignment =
                assignmentsResponse.assignments.some(
                  (assignment) => assignment.status === 'accepted'
                ) ||
                assignmentsResponse.match_assignment?.status === 'accepted';
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
        setFlatAssignmentsToMe({});
        return;
      }

      if (!isOwnProfile) {
        setActiveTab('perfil');
        setFlats([]);
        setFlatRooms([]);
      setFlatExtras({});
      setFlatAssignments({});
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
      const assignedToMeMap: Record<string, boolean> = {};
      assignments.forEach((assignment) => {
        if (assignment.room_id) {
          assignedToMeMap[assignment.room_id] = true;
        }
      });

      await Promise.all(
        roomsInFlats.map(async (roomItem) => {
          try {
            const assignmentsResponse =
              await roomAssignmentService.getAssignmentsForRoom(roomItem.id);
            const hasAcceptedAssignment =
              assignmentsResponse.assignments.some(
                (assignment) => assignment.status === 'accepted'
              ) ||
              assignmentsResponse.match_assignment?.status === 'accepted';
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

  const handlePrevFlat = () => {
    if (flats.length <= 1) return;
    setActiveFlatIndex((prev) => (prev - 1 + flats.length) % flats.length);
  };

  const handleNextFlat = () => {
    if (flats.length <= 1) return;
    setActiveFlatIndex((prev) => (prev + 1) % flats.length);
  };

  const handleLightboxPrev = () => {
    if (lightboxCount <= 1) return;
    setLightboxIndex((prev) => (prev - 1 + lightboxCount) % lightboxCount);
  };

  const handleLightboxNext = () => {
    if (lightboxCount <= 1) return;
    setLightboxIndex((prev) => (prev + 1) % lightboxCount);
  };

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

  const handleShareProfile = async () => {
    if (isSharing) return;
    try {
      setIsSharing(true);
      const normalizedPath = await shareService.getProfileShareImageFile(
        profile?.id
      );
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Cargando perfil...</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.loadingContainer}>
        <Text>No se encontro el perfil</Text>
      </View>
    );
  }

  const lifestyleItems = (
    profile.lifestyle_preferences
      ? Object.values(profile.lifestyle_preferences)
      : []
  ).filter((item): item is string => Boolean(item));
  const interests = profile.interests ?? [];
  const preferredZones = profile.preferred_zones ?? [];
  const interestLabels = interests.map(
    (interest) => interestLabelById.get(interest) ?? interest
  );
  const preferredZoneLabels = preferredZones.map(
    (zone) => zoneLabelById.get(zone) ?? zone
  );
  const convivenciaItems = [
    {
      key: 'schedule',
      label: 'Horario',
      value: profile.lifestyle_preferences?.schedule,
      icon: 'time-outline',
      color: '#7C3AED',
      bg: '#F3E8FF',
    },
    {
      key: 'cleaning',
      label: 'Limpieza',
      value: profile.lifestyle_preferences?.cleaning,
      icon: 'star-outline',
      color: '#2563EB',
      bg: '#DBEAFE',
    },
    {
      key: 'guests',
      label: 'Invitados',
      value: profile.lifestyle_preferences?.guests,
      icon: 'people-outline',
      color: '#16A34A',
      bg: '#DCFCE7',
    },
  ].filter((item) => item.value);

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

  const getLifestyleIcon = (label: string) => {
    const normalized = label.toLowerCase();
    if (normalized.includes('orden')) return 'star';
    if (normalized.includes('nocturn') || normalized.includes('noche'))
      return 'moon';
    if (normalized.includes('fuma')) return 'ban';
    if (normalized.includes('mascot')) return 'paw';
    if (normalized.includes('invitad')) return 'people';
    if (normalized.includes('flexible')) return 'options';
    return 'sparkles';
  };

  const aboutText = profile.bio ?? 'Sin descripcion por ahora.';
  const housingBadge =
    profile.housing_situation === 'seeking'
      ? 'Busco piso'
      : profile.housing_situation === 'offering'
      ? `Tengo piso en ${preferredZoneLabels[0] ?? 'zona preferida'}`
      : null;
  const memberSinceYear = profile.created_at
    ? new Date(profile.created_at).getFullYear()
    : null;
  const birthDateString = isOwnProfile
    ? profile.birth_date ?? authContext?.user?.birth_date ?? null
    : profile.birth_date ?? null;
  const birthDateValue = birthDateString
    ? (() => {
        const date = new Date(birthDateString);
        if (Number.isNaN(date.getTime())) return null;
        const today = new Date();
        let age = today.getFullYear() - date.getFullYear();
        const monthDelta = today.getMonth() - date.getMonth();
        if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < date.getDate())) {
          age -= 1;
        }
        return `${age} años`;
      })()
    : null;
  const aboutBadges = [housingBadge].filter(
    (badge): badge is string => Boolean(badge)
  );
  const shouldShowFlatTab =
    profile.housing_situation === 'offering' || (isOwnProfile && flats.length > 0);

  const resolvedAvatarUrl =
    profile.avatar_url && !profile.avatar_url.startsWith('http')
      ? `${API_CONFIG.SUPABASE_URL}/storage/v1/object/public/avatars/${profile.avatar_url}`
      : profile.avatar_url;
  const carouselPhotos =
    profilePhotos.length > 0
      ? profilePhotos
      : resolvedAvatarUrl
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
  const lightboxCount = carouselPhotos.length;
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
  const lifestyleChips = [...lifestyleItems, ...interestLabels].filter(
    (item): item is string => Boolean(item)
  );

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
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Perfil
        </Text>
        {isOwnProfile ? (
          <View style={styles.headerActions}>
            {!(activeTab === 'piso' && profile.housing_situation !== 'offering') ? (
              <TouchableOpacity
                style={styles.headerIconButton}
                onPress={() =>
                  activeTab === 'piso'
                    ? navigation.navigate('RoomManagement')
                    : navigation.navigate('EditProfile')
                }
              >
                  <Ionicons name="create-outline" size={18} color="#111827" />
                </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              style={[
                styles.headerIconButton,
                isSharing && styles.headerIconButtonDisabled,
              ]}
              onPress={handleShareProfile}
              disabled={isSharing}
            >
              <Ionicons name="share-social-outline" size={18} color="#111827" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.headerIconButton, styles.headerIconDanger]}
              onPress={handleLogout}
            >
              <Ionicons name="log-out-outline" size={18} color="#DC2626" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: insets.bottom + 110 }}
        showsVerticalScrollIndicator={false}
      >
        {shouldShowFlatTab && (
          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={[
                styles.tabButton,
                activeTab === 'perfil' && styles.tabButtonActive,
              ]}
              onPress={() => setActiveTab('perfil')}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === 'perfil' && styles.tabTextActive,
                ]}
              >
                Perfil
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tabButton,
                activeTab === 'piso' && styles.tabButtonActive,
              ]}
              onPress={() => setActiveTab('piso')}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === 'piso' && styles.tabTextActive,
                ]}
              >
                Piso
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {activeTab === 'perfil' && (
          <>
        <View style={styles.identityCard}>
          <TouchableOpacity
            style={styles.avatarWrap}
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
                style={styles.avatarImage}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={26} color="#9CA3AF" />
              </View>
            )}
          </TouchableOpacity>
          <Text style={styles.identityName}>{profile.display_name ?? 'Usuario'}</Text>
          <View style={styles.identityBadges}>
            {memberSinceYear ? (
              <View style={styles.identityBadge}>
                <Ionicons name="shield-checkmark" size={14} color="#111827" />
                <Text style={styles.identityBadgeText}>
                  Miembro desde {memberSinceYear}
                </Text>
              </View>
            ) : null}
            {housingBadge ? (
              <View style={styles.identityBadgeLight}>
                <Text style={styles.identityBadgeLightText}>{housingBadge}</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="person" size={20} color="#111827" />
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Sobre
            </Text>
          </View>
          <View style={styles.detailCard}>
            <Text style={styles.aboutText}>{aboutText}</Text>
          </View>
        </View>

        {infoChips.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionMutedTitle}>Datos clave</Text>
            <View style={styles.compactChips}>
              {infoChips.map((chip, index) => (
                <View key={`${chip}-${index}`} style={styles.compactChip}>
                  <Text style={styles.compactChipText}>{chip}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {lifestyleChips.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionMutedTitle}>Estilo e intereses</Text>
            <View style={styles.compactChips}>
              {lifestyleChips.map((chip, index) => (
                <View key={`${chip}-${index}`} style={styles.compactChip}>
                  <Text style={styles.compactChipText}>{chip}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {preferredZoneLabels.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionMutedTitle}>Zonas de interes</Text>
            <View style={styles.compactChips}>
              {preferredZoneLabels.map((zone, index) => (
                <View key={`${zone}-${index}`} style={styles.compactChip}>
                  <Text style={styles.compactChipText}>{zone}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {carouselPhotos.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="images-outline" size={18} color="#111827" />
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Momentos
              </Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.photoScroller}
            >
              {carouselPhotos.map((photo, index) => (
                <TouchableOpacity
                  key={photo.id}
                  style={styles.photoTileWide}
                  onPress={() => {
                    setLightboxIndex(index);
                    setLightboxVisible(true);
                  }}
                >
                  <Image source={{ uri: photo.signedUrl }} style={styles.photoTileImage} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

          </>
        )}

        {activeTab === 'piso' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="home" size={20} color="#111827" />
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Piso
              </Text>
              {flats.length > 1 && (
                <View style={styles.flatPager}>
                  <TouchableOpacity
                    style={styles.flatPagerButton}
                    onPress={handlePrevFlat}
                  >
                    <Ionicons name="chevron-back" size={18} color="#111827" />
                  </TouchableOpacity>
                  <Text style={styles.flatPagerText}>
                    {activeFlatIndex + 1}/{flats.length}
                  </Text>
                  <TouchableOpacity
                    style={styles.flatPagerButton}
                    onPress={handleNextFlat}
                  >
                    <Ionicons name="chevron-forward" size={18} color="#111827" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
            {flatLoading ? (
              <Text style={styles.mutedText}>Cargando piso...</Text>
            ) : flats.length === 0 ? (
              <Text style={styles.mutedText}>No hay piso publicado.</Text>
            ) : (
              <View style={styles.flatList}>
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
                    <View key={flat.id} style={styles.flatCard}>
                      <Text style={styles.flatTitle}>{flat.address}</Text>
                      <Text style={styles.flatMeta}>
                        {flat.city}
                        {flat.district ? ` - ${flat.district}` : ''}
                      </Text>

                      <View style={styles.flatInfoBlock}>
                        <Text style={styles.flatSectionTitle}>Info del piso</Text>
                        <View style={styles.locationRow}>
                          <View style={styles.locationChip}>
                            <Ionicons
                              name="location-outline"
                              size={14}
                              color="#6B7280"
                            />
                            <Text style={styles.locationChipText}>
                              {flat.district || flat.city}
                            </Text>
                          </View>
                        </View>

                        {rules.length > 0 && (
                          <View style={styles.flatSubSection}>
                            <Text style={styles.flatSubTitle}>Reglas</Text>
                            <View style={styles.listContainer}>
                              {visibleRules.map((rule) => (
                                <Text key={rule} style={styles.listItem}>
                                  <Text style={styles.listBullet}>• </Text>
                                  {getRuleIcon(rule)} {rule}
                                </Text>
                              ))}
                            </View>
                            {canToggleRules && (
                              <TouchableOpacity
                                style={styles.rulesToggle}
                                onPress={() => toggleRules(flat.id)}
                              >
                                <Text style={styles.rulesToggleText}>
                                  {isExpanded ? 'Ver menos' : 'Ver todas'}
                                </Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        )}

                        {services.length > 0 && (
                          <View style={styles.flatSubSection}>
                            <Text style={styles.flatSubTitle}>Servicios</Text>
                            <View style={styles.listContainer}>
                              {services.map((service) => (
                                <Text key={service.name} style={styles.listItem}>
                                  <Text style={styles.listBullet}>• </Text>
                                  {getServiceIcon(service.name)} {service.name}
                                  {service.price != null
                                    ? ` (${service.price} EUR)`
                                    : ''}
                                </Text>
                              ))}
                            </View>
                          </View>
                        )}
                      </View>

                      {bedrooms.length > 0 && (
                        <View style={styles.flatSection}>
                          <Text style={styles.flatSectionTitle}>Habitaciones</Text>
                          <View style={styles.roomList}>
                            {bedrooms.map((room) => {
                              const extras = flatExtras[room.id];
                              const photo = extras?.photos?.[0]?.signedUrl ?? '';
                              const typeLabel = extras?.room_type
                                ? roomTypeLabel.get(extras.room_type) ?? extras.room_type
                                : '';
                              const statusLabel = flatAssignmentsToMe[room.id]
                                ? 'Ocupada por ti'
                                : flatAssignments[room.id]
                                ? 'Ocupada'
                                : room.is_available === true
                                ? 'Disponible'
                                : room.is_available === false
                                ? 'Ocupada'
                                : 'Sin estado';
                              const isAvailable = statusLabel === 'Disponible';
                              const isUnknown = statusLabel === 'Sin estado';
                              return (
                                <TouchableOpacity
                                  key={room.id}
                                  style={styles.roomCard}
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
                                      style={styles.roomPhoto}
                                    />
                                  ) : (
                                    <View style={styles.roomPhotoPlaceholder}>
                                      <Ionicons
                                        name="image-outline"
                                        size={20}
                                        color="#9CA3AF"
                                      />
                                    </View>
                                  )}
                                  <View style={styles.roomInfo}>
                                    <View style={styles.roomHeader}>
                                      <Text style={styles.roomTitle}>{room.title}</Text>
                                      {room.price_per_month != null ? (
                                        <Text style={styles.roomPrice}>
                                          {room.price_per_month} EUR/mes
                                        </Text>
                                      ) : null}
                                    </View>
                                    {typeLabel ? (
                                      <Text style={styles.roomMeta}>
                                        Tipo: {typeLabel}
                                      </Text>
                                    ) : null}
                                    <View style={styles.roomFooter}>
                                      <View
                                        style={[
                                          styles.statusBadge,
                                          isAvailable
                                            ? styles.statusAvailable
                                            : isUnknown
                                            ? styles.statusNeutral
                                            : styles.statusOccupied,
                                        ]}
                                      >
                                        <Text
                                          style={[
                                            styles.statusText,
                                            isAvailable
                                              ? styles.statusAvailableText
                                              : isUnknown
                                              ? styles.statusNeutralText
                                              : styles.statusOccupiedText,
                                          ]}
                                        >
                                          {statusLabel}
                                        </Text>
                                      </View>
                                      <View style={styles.roomCta}>
                                        <Text style={styles.roomCtaText}>Ver detalle</Text>
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
                        <View style={styles.flatSection}>
                          <Text style={styles.flatSectionTitle}>Zonas comunes</Text>
                          <View style={styles.roomList}>
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
                                  style={styles.roomCard}
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
                                      style={styles.roomPhoto}
                                    />
                                  ) : (
                                    <View style={styles.roomPhotoPlaceholder}>
                                      <Ionicons
                                        name="image-outline"
                                        size={20}
                                        color="#9CA3AF"
                                      />
                                    </View>
                                  )}
                                  <View style={styles.roomInfo}>
                                    <View style={styles.roomHeader}>
                                      <Text style={styles.roomTitle}>{room.title}</Text>
                                    </View>
                                    {typeLabel ? (
                                      <Text style={styles.roomMeta}>
                                        Tipo: {typeLabel}
                                      </Text>
                                    ) : null}
                                    <View style={styles.roomFooter}>
                                      <View style={[styles.statusBadge, styles.statusNeutral]}>
                                        <Text style={styles.statusNeutralText}>
                                          Zona comun
                                        </Text>
                                      </View>
                                      <View style={styles.roomCta}>
                                        <Text style={styles.roomCtaText}>Ver detalle</Text>
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
        <View style={styles.bottomActions}>
          <TouchableOpacity style={[styles.bottomButton, styles.rejectButton]}>
            <BlurView
              style={StyleSheet.absoluteFillObject}
              blurType="light"
              blurAmount={14}
              reducedTransparencyFallbackColor={theme.colors.glassOverlayStrong}
            />
            <View style={[styles.glassTint, styles.rejectTint]} />
            <Ionicons name="close" size={24} color="#EF4444" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.bottomButton, styles.likeButton]}>
            <BlurView
              style={StyleSheet.absoluteFillObject}
              blurType="light"
              blurAmount={14}
              reducedTransparencyFallbackColor={theme.colors.glassOverlayStrong}
            />
            <View style={[styles.glassTint, styles.likeTint]} />
            <Ionicons name="heart" size={24} color="#7C3AED" />
          </TouchableOpacity>
        </View>
      )}

      <Modal
        visible={lightboxVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLightboxVisible(false)}
      >
        <View style={styles.lightboxOverlay}>
          <LinearGradient
            colors={[colors.overlayLight, colors.overlayDark]}
            style={StyleSheet.absoluteFillObject}
          />
          <TouchableOpacity
            style={styles.lightboxBackdrop}
            activeOpacity={1}
            onPress={() => setLightboxVisible(false)}
          />
          <View style={styles.lightboxContent}>
            <View style={styles.lightboxTopBar}>
              <Text style={styles.lightboxTitle}>Momentos</Text>
              <TouchableOpacity
                style={styles.lightboxClose}
                onPress={() => setLightboxVisible(false)}
              >
                <Ionicons name="close" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
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
                  {carouselPhotos.map((photo, index) => {
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
                        key={photo.id}
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
                <TouchableOpacity
                  style={styles.lightboxNavButton}
                  onPress={handleLightboxPrev}
                >
                  <Ionicons
                    name="chevron-back"
                    size={20}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
                <View style={styles.lightboxCounterChip}>
                  <Ionicons
                    name="image-outline"
                    size={14}
                    color={colors.textSecondary}
                  />
                  <Text style={styles.lightboxCounter}>
                    {lightboxIndex + 1}/{lightboxCount}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.lightboxNavButton}
                  onPress={handleLightboxNext}
                >
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};



