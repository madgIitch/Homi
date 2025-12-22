// src/screens/ProfileDetailScreen.tsx
import React, { useCallback, useContext, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
  Modal,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { BlurView } from '@react-native-community/blur';
import { useTheme } from '../theme/ThemeContext';
import { API_CONFIG } from '../config/api';
import { profileService } from '../services/profileService';
import { profilePhotoService } from '../services/profilePhotoService';
import { roomService } from '../services/roomService';
import { roomExtrasService } from '../services/roomExtrasService';
import { roomAssignmentService } from '../services/roomAssignmentService';
import { AuthContext } from '../context/AuthContext';
import { INTERESES_OPTIONS, ZONAS_OPTIONS } from '../constants/swipeFilters';
import type { Profile, ProfilePhoto } from '../types/profile';
import type { Flat, Room, RoomExtras } from '../types/room';

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
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profilePhotos, setProfilePhotos] = useState<ProfilePhoto[]>([]);
  const [lightboxVisible, setLightboxVisible] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'perfil' | 'piso'>('perfil');
  const [flats, setFlats] = useState<Flat[]>([]);
  const [flatRooms, setFlatRooms] = useState<Room[]>([]);
  const [flatExtras, setFlatExtras] = useState<Record<string, RoomExtras | null>>({});
  const [flatLoading, setFlatLoading] = useState(false);
  const [flatAssignments, setFlatAssignments] = useState<Record<string, boolean>>({});

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
    if (!profile?.id || profile.housing_situation !== 'offering') {
      setActiveTab('perfil');
      setFlats([]);
      setFlatRooms([]);
      setFlatExtras({});
      return;
    }

    try {
      setFlatLoading(true);
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
    } catch (error) {
      console.error('Error cargando piso:', error);
    } finally {
      setFlatLoading(false);
    }
  }, [profile?.id, profile?.housing_situation]);

  useEffect(() => {
    loadFlatData();
  }, [loadFlatData]);

  useFocusEffect(
    useCallback(() => {
      if (activeTab !== 'piso') return;
      loadFlatData();
    }, [activeTab, loadFlatData])
  );

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
  const shouldShowFlatTab = profile.housing_situation === 'offering';

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
  const summaryChips = [
    profile.occupation ?? null,
    profile.university ?? null,
    formatBudget() !== '-' ? formatBudget() : null,
    ...lifestyleItems,
    ...interestLabels,
  ].filter((item): item is string => Boolean(item));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Perfil
        </Text>
        {isOwnProfile ? (
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerIconButton}
              onPress={() => navigation.navigate('EditProfile')}
            >
              <Ionicons name="create-outline" size={18} color="#111827" />
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

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
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
          <View style={styles.avatarWrap}>
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
          </View>
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

        {carouselPhotos.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="images-outline" size={18} color="#111827" />
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Momentos
              </Text>
            </View>
            <View style={styles.photoGrid}>
              {carouselPhotos.map((photo) => (
                <TouchableOpacity
                  key={photo.id}
                  style={styles.photoTile}
                  onPress={() => {
                    setLightboxUrl(photo.signedUrl);
                    setLightboxVisible(true);
                  }}
                >
                  <Image source={{ uri: photo.signedUrl }} style={styles.photoTileImage} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

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

        {summaryChips.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionMutedTitle}>Un poco sobre mi</Text>
            <View style={styles.compactChips}>
              {summaryChips.map((chip, index) => (
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

        {isOwnProfile && profile.housing_situation === 'offering' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="bed" size={20} color="#111827" />
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Gestion de habitaciones
              </Text>
            </View>
            <View style={styles.manageCard}>
              <View style={styles.manageInfo}>
                <Text style={styles.manageTitle}>Administra tus anuncios</Text>
                <Text style={styles.manageSubtitle}>
                  Edita detalles, pausa publicaciones y revisa interesados.
                </Text>
              </View>
              <TouchableOpacity
                style={styles.manageButton}
                onPress={() => navigation.navigate('RoomManagement')}
              >
                <Text style={styles.manageButtonText}>Gestionar</Text>
              </TouchableOpacity>
            </View>
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
            </View>
            {flatLoading ? (
              <Text style={styles.mutedText}>Cargando piso...</Text>
            ) : flats.length === 0 ? (
              <Text style={styles.mutedText}>No hay piso publicado.</Text>
            ) : (
              <View style={styles.flatList}>
                {flats.map((flat) => {
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

                  return (
                    <View key={flat.id} style={styles.flatCard}>
                      <Text style={styles.flatTitle}>{flat.address}</Text>
                      <Text style={styles.flatMeta}>
                        {flat.city}
                        {flat.district ? ` - ${flat.district}` : ''}
                      </Text>

                      {rules.length > 0 && (
                        <View style={styles.flatSection}>
                          <Text style={styles.flatSectionTitle}>Reglas</Text>
                          <View style={styles.listContainer}>
                            {rules.map((rule) => (
                              <Text key={rule} style={styles.listItem}>
                                {getRuleIcon(rule)} {rule}
                              </Text>
                            ))}
                          </View>
                        </View>
                      )}

                      {services.length > 0 && (
                        <View style={styles.flatSection}>
                          <Text style={styles.flatSectionTitle}>Servicios</Text>
                          <View style={styles.listContainer}>
                            {services.map((service) => (
                              <Text key={service.name} style={styles.listItem}>
                                {getServiceIcon(service.name)} {service.name}
                                {service.price != null ? ` (${service.price} EUR)` : ''}
                              </Text>
                            ))}
                          </View>
                        </View>
                      )}

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
                              const statusLabel = flatAssignments[room.id]
                                ? 'Ocupada'
                                : room.is_available === true
                                ? 'Disponible'
                                : room.is_available === false
                                ? 'Ocupada'
                                : 'Sin estado';
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
                                    <Text style={styles.roomTitle}>{room.title}</Text>
                                    {room.price_per_month != null ? (
                                      <Text style={styles.roomMeta}>
                                        {room.price_per_month} EUR/mes
                                      </Text>
                                    ) : null}
                                    {typeLabel ? (
                                      <Text style={styles.roomMeta}>
                                        Tipo: {typeLabel}
                                      </Text>
                                    ) : null}
                                    <Text style={styles.roomMeta}>{statusLabel}</Text>
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
                                    <Text style={styles.roomTitle}>{room.title}</Text>
                                    {typeLabel ? (
                                      <Text style={styles.roomMeta}>
                                        Tipo: {typeLabel}
                                      </Text>
                                    ) : null}
                                  </View>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        </View>
                      )}
                    </View>
                  );
                })}
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
              reducedTransparencyFallbackColor="rgba(255, 255, 255, 0.7)"
            />
            <View style={[styles.glassTint, styles.rejectTint]} />
            <Ionicons name="close" size={24} color="#EF4444" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.bottomButton, styles.likeButton]}>
            <BlurView
              style={StyleSheet.absoluteFillObject}
              blurType="light"
              blurAmount={14}
              reducedTransparencyFallbackColor="rgba(255, 255, 255, 0.7)"
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
          <TouchableOpacity
            style={styles.lightboxBackdrop}
            activeOpacity={1}
            onPress={() => setLightboxVisible(false)}
          />
          <View style={styles.lightboxContent}>
            <TouchableOpacity
              style={styles.lightboxClose}
              onPress={() => setLightboxVisible(false)}
            >
              <Ionicons name="close" size={22} color="#FFFFFF" />
            </TouchableOpacity>
            {lightboxUrl && (
              <Image source={{ uri: lightboxUrl }} style={styles.lightboxImage} />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F5F7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  headerSpacer: {
    width: 48,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  headerIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  headerIconDanger: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  rejectButton: {
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  likeButton: {
    borderColor: 'rgba(17, 24, 39, 0.2)',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  tabsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  tabButtonActive: {
    borderColor: '#7C3AED',
    backgroundColor: '#F5F3FF',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#7C3AED',
  },
  identityCard: {
    alignItems: 'center',
    marginBottom: 28,
    paddingVertical: 18,
    paddingHorizontal: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  avatarWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  identityBadges: {
    marginTop: 10,
    alignItems: 'center',
    gap: 8,
  },
  identityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#F3F4F6',
  },
  identityBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
  },
  identityBadgeLight: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D8B4FE',
    backgroundColor: '#FFFFFF',
  },
  identityBadgeLightText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7C3AED',
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  photoTile: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  photoTileImage: {
    width: '100%',
    height: '100%',
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  sectionMutedTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  aboutText: {
    fontSize: 15,
    color: '#374151',
    marginBottom: 12,
  },
  detailCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailRowSpacing: {
    marginTop: 16,
  },
  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  detailIconBlue: {
    backgroundColor: '#DBEAFE',
  },
  detailIconGreen: {
    backgroundColor: '#DCFCE7',
  },
  detailText: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    letterSpacing: 0.6,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  mutedText: {
    fontSize: 13,
    color: '#6B7280',
  },
  flatList: {
    gap: 16,
  },
  flatCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  flatTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  flatMeta: {
    marginTop: 6,
    fontSize: 12,
    color: '#6B7280',
  },
  flatSection: {
    marginTop: 16,
  },
  flatSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  listContainer: {
    gap: 6,
  },
  listItem: {
    fontSize: 12,
    color: '#374151',
  },
  roomList: {
    gap: 10,
  },
  roomCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  roomPhoto: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  roomPhotoPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roomInfo: {
    flex: 1,
  },
  roomTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  roomMeta: {
    marginTop: 4,
    fontSize: 12,
    color: '#6B7280',
  },
  manageCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    padding: 16,
  },
  manageInfo: {
    marginBottom: 12,
  },
  manageTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  manageSubtitle: {
    marginTop: 6,
    fontSize: 13,
    color: '#6B7280',
  },
  manageButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#7C3AED',
  },
  manageButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  outlineChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#D8B4FE',
    backgroundColor: '#FFFFFF',
  },
  outlineChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7C3AED',
  },
  compactChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  compactChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  compactChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
  },
  chipIcon: {
    marginRight: 6,
  },
  ctaButton: {
    marginBottom: 32,
    backgroundColor: '#7C3AED',
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  bottomActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 8,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  bottomButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderColor: 'rgba(255, 255, 255, 0.5)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  glassTint: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 29,
  },
  rejectTint: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  likeTint: {
    backgroundColor: 'rgba(124, 58, 237, 0.08)',
  },
  lightboxOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightboxBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  lightboxContent: {
    width: '90%',
    height: '70%',
    borderRadius: 20,
    overflow: 'hidden',
  },
  lightboxImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
    backgroundColor: '#000000',
  },
  lightboxClose: {
    position: 'absolute',
    top: 14,
    right: 14,
    zIndex: 2,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(17, 24, 39, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
