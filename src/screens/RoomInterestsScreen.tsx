import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { API_CONFIG } from '../config/api';
import { useTheme } from '../theme/ThemeContext';
import { interestService } from '../services/interestService';
import type { RoomInterest } from '../types/room';

const getInitials = (name?: string) => {
  if (!name) return 'U';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((chunk) => chunk[0]?.toUpperCase())
    .join('');
};

const resolveAvatarUrl = (avatarUrl?: string) => {
  if (!avatarUrl) return null;
  if (avatarUrl.startsWith('http')) return avatarUrl;
  return `${API_CONFIG.SUPABASE_URL}/storage/v1/object/public/avatars/${avatarUrl}`;
};

export const RoomInterestsScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation<StackNavigationProp<any>>();
  const route = useRoute();
  const routeParams = route.params as { roomId: string; roomTitle?: string };
  const { roomId, roomTitle } = routeParams;

  const [loading, setLoading] = useState(true);
  const [interests, setInterests] = useState<RoomInterest[]>([]);

  const loadInterests = useCallback(async () => {
    try {
      setLoading(true);
      const data = await interestService.getReceivedInterests();
      const filtered = data.filter((item) => item.room_id === roomId);
      setInterests(filtered);
    } catch (error) {
      console.error('Error cargando intereses:', error);
      Alert.alert('Error', 'No se pudieron cargar los interesados');
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    loadInterests();
  }, [loadInterests]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Interesados
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {roomTitle && (
        <View style={styles.roomBanner}>
          <Text style={styles.roomLabel}>Habitacion</Text>
          <Text style={styles.roomTitle}>{roomTitle}</Text>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Cargando...</Text>
        </View>
      ) : interests.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="heart-outline" size={42} color="#9CA3AF" />
          <Text style={styles.emptyTitle}>Sin interesados aun</Text>
          <Text style={styles.emptySubtitle}>
            Cuando alguien de like aparecera en esta lista.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {interests.map((interest) => {
            const user = interest.user;
            const avatar = resolveAvatarUrl(user?.avatar_url);
            return (
              <TouchableOpacity
                key={interest.id}
                style={styles.card}
                onPress={() => {
                  if (user) {
                    navigation.navigate('ProfileDetail', { profile: user });
                  }
                }}
              >
                <View style={styles.avatar}>
                  {avatar ? (
                    <Image source={{ uri: avatar }} style={styles.avatarImage} />
                  ) : (
                    <Text style={styles.avatarText}>{getInitials(user?.display_name)}</Text>
                  )}
                </View>
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle}>
                    {user?.display_name || 'Usuario'}
                  </Text>
                  <Text style={styles.cardSubtitle}>
                    {user?.occupation || 'Perfil sin ocupacion'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerSpacer: {
    width: 24,
  },
  roomBanner: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#F3F4F6',
  },
  roomLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: '#6B7280',
    fontWeight: '600',
  },
  roomTitle: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#6B7280',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
  },
  emptySubtitle: {
    marginTop: 8,
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
  },
  content: {
    padding: 20,
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E0E7FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontWeight: '700',
    color: '#4338CA',
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  cardSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: '#6B7280',
  },
});
