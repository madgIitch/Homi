// src/screens/ProfileDetailScreen.tsx
import React, { useContext, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
  FlatList,
  Dimensions,
  Modal,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../theme/ThemeContext';
import { API_CONFIG } from '../config/api';
import { profileService } from '../services/profileService';
import { profilePhotoService } from '../services/profilePhotoService';
import { AuthContext } from '../context/AuthContext';
import type { Profile, ProfilePhoto } from '../types/profile';

interface ProfileDetailScreenProps {
  userId?: string;
}

export const ProfileDetailScreen: React.FC<ProfileDetailScreenProps> = ({
  userId,
}) => {
  const theme = useTheme();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profilePhotos, setProfilePhotos] = useState<ProfilePhoto[]>([]);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [lightboxVisible, setLightboxVisible] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const navigation = useNavigation<StackNavigationProp<any>>();
  const route = useRoute();
  const authContext = useContext(AuthContext);
  const currentUserId = authContext?.user?.id ?? '';
  const routeProfile = (route as { params?: { profile?: Profile } }).params
    ?.profile;
  const isOwnProfile =
    (!routeProfile && (!userId || userId === currentUserId)) ||
    routeProfile?.id === currentUserId;

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
  }, [userId, routeProfile]);

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
  const hasStudyInfo = Boolean(profile.university || profile.occupation);
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
      ? `Tengo piso en ${preferredZones[0] ?? 'zona preferida'}`
      : null;
  const aboutBadges = [housingBadge].filter(
    (badge): badge is string => Boolean(badge)
  );

  const carouselWidth = Dimensions.get('window').width - 40;
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {isOwnProfile ? (
          <View style={styles.headerSpacer} />
        ) : (
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color="#111827" />
          </TouchableOpacity>
        )}
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          {profile.display_name}
        </Text>
        {isOwnProfile ? (
          <TouchableOpacity onPress={() => navigation.navigate('EditProfile')}>
            <Text style={styles.editButton}>Editar</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.headerActions}>
            <TouchableOpacity style={[styles.actionButton, styles.rejectButton]}>
              <Ionicons name="close" size={18} color="#EF4444" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, styles.likeButton]}>
              <Ionicons name="heart" size={18} color="#7C3AED" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {carouselPhotos.length > 0 && (
          <View style={styles.carouselContainer}>
            <FlatList
              data={carouselPhotos}
              keyExtractor={(item) => item.id}
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
              renderItem={({ item }) => (
                <View style={{ width: carouselWidth }}>
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => {
                      setLightboxUrl(item.signedUrl);
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
            {carouselPhotos.length > 1 && (
              <View style={styles.carouselDots}>
                {carouselPhotos.map((photo, index) => (
                  <View
                    key={photo.id}
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
          <View style={styles.sectionHeader}>
            <Ionicons name="person" size={20} color="#111827" />
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Sobre
            </Text>
          </View>
          <View style={styles.detailCard}>
            <Text style={styles.aboutText}>{aboutText}</Text>
            {aboutBadges.length > 0 && (
              <View style={styles.chipsContainer}>
                {aboutBadges.map((badge) => (
                  <View key={badge} style={styles.outlineChip}>
                    <Text style={styles.outlineChipText}>{badge}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="people" size={20} color="#111827" />
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Companeros
            </Text>
          </View>
          <View style={styles.detailCard}>
            <View style={styles.detailRow}>
              <View style={[styles.detailIcon, styles.detailIconBlue]}>
                <Ionicons name="people" size={18} color="#2563EB" />
              </View>
              <View style={styles.detailText}>
                <Text style={styles.detailLabel}>COMPANEROS BUSCADOS</Text>
                <Text style={styles.detailValue}>
                  {profile.num_roommates_wanted ?? '-'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="cash" size={20} color="#111827" />
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Presupuesto
            </Text>
          </View>
          <View style={styles.detailCard}>
            <View style={styles.detailRow}>
              <View style={[styles.detailIcon, styles.detailIconGreen]}>
                <Ionicons name="cash" size={18} color="#16A34A" />
              </View>
              <View style={styles.detailText}>
                <Text style={styles.detailLabel}>RANGO</Text>
                <Text style={styles.detailValue}>{formatBudget()}</Text>
              </View>
            </View>
          </View>
        </View>

        {hasStudyInfo && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="school" size={20} color="#111827" />
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Estudios y Trabajo
              </Text>
            </View>
            <View style={styles.detailCard}>
              {profile.university && (
                <View style={styles.detailRow}>
                  <View style={[styles.detailIcon, styles.detailIconBlue]}>
                    <Ionicons name="school" size={18} color="#2563EB" />
                  </View>
                  <View style={styles.detailText}>
                    <Text style={styles.detailLabel}>UNIVERSIDAD</Text>
                    <Text style={styles.detailValue}>{profile.university}</Text>
                  </View>
                </View>
              )}
              {profile.occupation && (
                <View style={[styles.detailRow, styles.detailRowSpacing]}>
                  <View style={[styles.detailIcon, styles.detailIconGreen]}>
                    <Ionicons name="briefcase" size={18} color="#16A34A" />
                  </View>
                  <View style={styles.detailText}>
                    <Text style={styles.detailLabel}>OCUPACION</Text>
                    <Text style={styles.detailValue}>{profile.occupation}</Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        )}

        {lifestyleItems.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="home" size={20} color="#111827" />
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Estilo de Vida
              </Text>
            </View>
            <View style={styles.chipsContainer}>
              {lifestyleItems.map((pref, index) => (
                <View key={`${pref}-${index}`} style={styles.outlineChip}>
                  <Ionicons
                    name={getLifestyleIcon(pref)}
                    size={14}
                    color="#7C3AED"
                    style={styles.chipIcon}
                  />
                  <Text style={styles.outlineChipText}>{pref}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {interests.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="sparkles" size={20} color="#111827" />
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Intereses
              </Text>
            </View>
            <View style={styles.chipsContainer}>
              {interests.map((interest, index) => (
                <View key={`${interest}-${index}`} style={styles.outlineChip}>
                  <Text style={styles.outlineChipText}>{interest}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {preferredZones.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="location" size={20} color="#111827" />
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Zonas de interes
              </Text>
            </View>
            <View style={styles.chipsContainer}>
              {preferredZones.map((zone, index) => (
                <View key={`${zone}-${index}`} style={styles.outlineChip}>
                  <Text style={styles.outlineChipText}>{zone}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {convivenciaItems.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="clipboard" size={20} color="#111827" />
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Detalles de convivencia
              </Text>
            </View>
            <View style={styles.detailCard}>
              {convivenciaItems.map((item, index) => (
                <View
                  key={item.key}
                  style={[styles.detailRow, index > 0 && styles.detailRowSpacing]}
                >
                  <View style={[styles.detailIcon, { backgroundColor: item.bg }]}>
                    <Ionicons name={item.icon} size={18} color={item.color} />
                  </View>
                  <View style={styles.detailText}>
                    <Text style={styles.detailLabel}>{item.label.toUpperCase()}</Text>
                    <Text style={styles.detailValue}>{item.value}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {!isOwnProfile && (
          <TouchableOpacity style={styles.ctaButton}>
            <Text style={styles.ctaText}>Enviar mensaje</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {!isOwnProfile && (
        <View style={styles.bottomActions}>
          <TouchableOpacity style={[styles.bottomButton, styles.rejectButton]}>
            <Ionicons name="close" size={24} color="#EF4444" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.bottomButton, styles.likeButton]}>
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
    backgroundColor: '#FFFFFF',
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
  },
  headerSpacer: {
    width: 48,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  editButton: {
    fontSize: 16,
    color: '#6B46C1',
    fontWeight: '500',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
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
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
  },
  likeButton: {
    backgroundColor: '#F3E8FF',
    borderColor: '#D8B4FE',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  carouselContainer: {
    marginBottom: 24,
  },
  carouselImage: {
    width: '100%',
    height: 480,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
  },
  carouselDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
    gap: 6,
  },
  carouselDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D1D5DB',
  },
  carouselDotActive: {
    backgroundColor: '#7C3AED',
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
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
