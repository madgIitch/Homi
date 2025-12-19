// src/screens/ProfileDetailScreen.tsx
import React, { useState, useEffect, useContext } from 'react';
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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../theme/ThemeContext';
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

  const navigation = useNavigation<StackNavigationProp<any>>();
  const authContext = useContext(AuthContext);
  const currentUserId = authContext?.user?.id ?? '';
  const isOwnProfile = !userId || userId === currentUserId;

  useEffect(() => {
    loadProfile();
    loadPhotos();
  }, [userId]);

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

  const carouselWidth = Dimensions.get('window').width - 40;
  const carouselPhotos =
    profilePhotos.length > 0
      ? profilePhotos
      : profile.avatar_url
      ? [
          {
            id: 'avatar',
            profile_id: profile.id,
            path: profile.avatar_url,
            position: 1,
            is_primary: true,
            signedUrl: profile.avatar_url,
            created_at: profile.updated_at,
          },
        ]
      : [];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
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
                  <Image
                    source={{ uri: item.signedUrl }}
                    style={styles.carouselImage}
                  />
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

        <View style={styles.cardRow}>
          <View style={[styles.infoCard, styles.infoCardBlue]}>
            <View style={[styles.infoIcon, styles.infoIconBlue]}>
              <Ionicons name="people" size={22} color="#2563EB" />
            </View>
            <Text style={[styles.infoLabel, styles.infoTextBlue]}>
              COMPANEROS
            </Text>
            <Text style={[styles.infoValue, styles.infoTextBlue]}>
              {profile.num_roommates_wanted ?? '-'}
            </Text>
          </View>
          <View style={[styles.infoCard, styles.infoCardGreen]}>
            <View style={[styles.infoIcon, styles.infoIconGreen]}>
              <Ionicons name="cash" size={22} color="#16A34A" />
            </View>
            <Text style={[styles.infoLabel, styles.infoTextGreen]}>
              PRESUPUESTO
            </Text>
            <Text style={[styles.infoValue, styles.infoTextGreen]}>
              {formatBudget()}
            </Text>
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
                Zonas de Interes
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
                Detalles de Convivencia
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
      </ScrollView>
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
  cardRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  carouselContainer: {
    marginBottom: 24,
  },
  carouselImage: {
    width: '100%',
    height: 220,
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
  infoCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  infoCardBlue: {
    borderColor: '#BFDBFE',
    backgroundColor: '#F8FAFF',
  },
  infoCardGreen: {
    borderColor: '#BBF7D0',
    backgroundColor: '#F0FDF4',
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  infoIconBlue: {
    backgroundColor: '#DBEAFE',
  },
  infoIconGreen: {
    backgroundColor: '#DCFCE7',
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  infoTextBlue: {
    color: '#1D4ED8',
  },
  infoTextGreen: {
    color: '#15803D',
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
});
