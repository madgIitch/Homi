import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RealtimeChannel } from '@supabase/supabase-js';
import LinearGradient from 'react-native-linear-gradient';
import { BlurView } from '@react-native-community/blur';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../theme/ThemeContext';
import { spacing } from '../theme';
import { chatService } from '../services/chatService';
import { matchService } from '../services/matchService';
import { supabaseClient } from '../services/authService';
import { profilePhotoService } from '../services/profilePhotoService';
import { AuthContext } from '../context/AuthContext';
import type { Chat, Match } from '../types/chat';
import type { Profile } from '../types/profile';
import { MatchesScreenStyles as styles } from '../styles/screens';

export const MatchesScreen: React.FC = () => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<StackNavigationProp<any>>();
  const [matches, setMatches] = useState<Match[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Match[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [matchPhotoByProfile, setMatchPhotoByProfile] = useState<
    Record<string, string>
  >({});
  const [pendingMessagesByMatchId, setPendingMessagesByMatchId] = useState<
    Record<string, string>
  >({});
  const [pendingProfilesByMatchId, setPendingProfilesByMatchId] = useState<
    Record<string, Profile>
  >({});
  const [expandedPendingIds, setExpandedPendingIds] = useState<
    Record<string, boolean>
  >({});
  const channelRef = useRef<RealtimeChannel | null>(null);
  const matchesChannelRef = useRef<RealtimeChannel | null>(null);
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const authContext = useContext(AuthContext);
  const currentUserId = authContext?.user?.id ?? '';

  const calculateAge = (birthDate?: string | null) => {
    if (!birthDate) return null;
    const birth = new Date(birthDate);
    if (Number.isNaN(birth.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const loadData = React.useCallback(async () => {
    try {
      setErrorMessage(null);
      const [nextMatches, nextChats] = await Promise.all([
        chatService.getMatches(),
        chatService.getChats(),
      ]);
      const pending =
        currentUserId.length > 0
          ? nextMatches.filter(
              (match) =>
                match.status === 'pending' && match.userBId === currentUserId
            )
          : [];
      const active = nextMatches.filter((match) => {
        const status = match.status ?? 'pending';
        const isPendingIncoming =
          status === 'pending' && match.userBId === currentUserId;
        return (
          ['accepted', 'room_offer', 'room_assigned', 'room_declined', 'unmatched'].includes(
            status
          ) && !isPendingIncoming
        );
      });
      setMatches(active);
      setPendingRequests(pending);
      setChats(nextChats);
    } catch (error) {
      console.error('Error cargando matches/chats:', error);
      setMatches([]);
      setPendingRequests([]);
      setChats([]);
      setErrorMessage('No se pudo cargar la informacion.');
    }
  }, [currentUserId]);

  useEffect(() => {
    loadData().catch(() => undefined);
  }, [loadData]);

  useFocusEffect(
    React.useCallback(() => {
      loadData().catch(() => undefined);
    }, [loadData])
  );

  const scheduleRefresh = React.useCallback(() => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }
    refreshTimeoutRef.current = setTimeout(() => {
      loadData().catch(() => undefined);
    }, 400);
  }, [loadData]);

  useEffect(() => {
    let isMounted = true;

    const subscribeToChats = async () => {
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        supabaseClient.realtime.setAuth(token);
      }

      if (channelRef.current) {
        supabaseClient.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      const channel = supabaseClient
        .channel('chats:list')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages' },
          () => {
            if (!isMounted) return;
            scheduleRefresh();
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'messages' },
          () => {
            if (!isMounted) return;
            scheduleRefresh();
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'chats' },
          () => {
            if (!isMounted) return;
            scheduleRefresh();
          }
        )
        .subscribe();

      channelRef.current = channel;
    };

    subscribeToChats().catch(() => undefined);

    return () => {
      isMounted = false;
      if (channelRef.current) {
        supabaseClient.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      if (matchesChannelRef.current) {
        supabaseClient.removeChannel(matchesChannelRef.current);
        matchesChannelRef.current = null;
      }
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }
    };
  }, [scheduleRefresh]);

  useEffect(() => {
    let isMounted = true;

    const subscribeToMatches = async () => {
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        supabaseClient.realtime.setAuth(token);
      }

      if (matchesChannelRef.current) {
        supabaseClient.removeChannel(matchesChannelRef.current);
        matchesChannelRef.current = null;
      }

      const channel = supabaseClient
        .channel('matches:list')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'matches' },
          () => {
            if (!isMounted) return;
            scheduleRefresh();
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'matches' },
          () => {
            if (!isMounted) return;
            scheduleRefresh();
          }
        )
        .subscribe();

      matchesChannelRef.current = channel;
    };

    subscribeToMatches().catch((error) => {
      console.warn('[MatchesScreen] Error suscribiendo matches:', error);
    });

    return () => {
      isMounted = false;
      if (matchesChannelRef.current) {
        supabaseClient.removeChannel(matchesChannelRef.current);
        matchesChannelRef.current = null;
      }
    };
  }, [scheduleRefresh]);

  const chatMatchIds = useMemo(
    () => new Set(chats.map((chat) => chat.matchId)),
    [chats]
  );

  const orderedChats = useMemo(() => {
    return [...chats].sort(
      (a, b) => Date.parse(b.lastMessageAtIso) - Date.parse(a.lastMessageAtIso)
    );
  }, [chats]);

  const unmatched = useMemo(
    () => matches.filter((match) => !chatMatchIds.has(match.id)),
    [matches, chatMatchIds]
  );

  useEffect(() => {
    const loadMatchPhotos = async () => {
      const profileFallbacks = new Map<string, string>();
      pendingRequests.forEach((match) => {
        if (match.profileId) {
          profileFallbacks.set(match.profileId, match.avatarUrl);
        }
      });
      unmatched.forEach((match) => {
        if (match.profileId) {
          profileFallbacks.set(match.profileId, match.avatarUrl);
        }
      });
      chats.forEach((chat) => {
        if (chat.profileId) {
          profileFallbacks.set(chat.profileId, chat.avatarUrl);
        }
      });

      const missing = Array.from(profileFallbacks.keys()).filter(
        (profileId) => !matchPhotoByProfile[profileId]
      );
      if (missing.length === 0) return;

      const updates: Record<string, string> = {};
      await Promise.all(
        missing.map(async (profileId) => {
          try {
            const photos = await profilePhotoService.getPhotosForProfile(
              profileId
            );
            const primary = photos.find((photo) => photo.is_primary) ?? photos[0];
            const fallback = profileFallbacks.get(profileId) || '';
            updates[profileId] = primary?.signedUrl || fallback;
          } catch (error) {
            console.error('Error cargando foto del match:', error);
            const fallback = profileFallbacks.get(profileId) || '';
            updates[profileId] = fallback;
          }
        })
      );

      if (Object.keys(updates).length > 0) {
        setMatchPhotoByProfile((prev) => ({ ...prev, ...updates }));
      }
    };

    loadMatchPhotos().catch(() => undefined);
  }, [pendingRequests, unmatched, chats, matchPhotoByProfile]);

  useEffect(() => {
    let isMounted = true;

    const loadPendingDetails = async () => {
      const nextMessages: Record<string, string> = {};
      const nextProfiles: Record<string, Profile> = {};

      await Promise.all(
        pendingRequests.map(async (request) => {
          if (!request.id) return;
          const hasMessage = Boolean(pendingMessagesByMatchId[request.id]);
          const hasProfile = Boolean(pendingProfilesByMatchId[request.id]);
          if (hasMessage && hasProfile) return;
          try {
            const chat = await chatService.getChatByMatchId(request.id);
            if (!chat) return;
            if (!hasProfile && chat.profile) {
              nextProfiles[request.id] = chat.profile;
            }
            if (!hasMessage) {
              const messages = await chatService.getMessages(chat.id);
              if (messages.length > 0) {
                const ordered = [...messages].sort(
                  (a, b) =>
                    Date.parse(a.createdAtIso) - Date.parse(b.createdAtIso)
                );
                nextMessages[request.id] = ordered[0]?.text ?? '';
              }
            }
          } catch (error) {
            console.warn('[MatchesScreen] Error loading pending details:', error);
          }
        })
      );

      if (!isMounted) return;
      if (Object.keys(nextMessages).length > 0) {
        setPendingMessagesByMatchId((prev) => ({ ...prev, ...nextMessages }));
      }
      if (Object.keys(nextProfiles).length > 0) {
        setPendingProfilesByMatchId((prev) => ({ ...prev, ...nextProfiles }));
      }
    };

    if (pendingRequests.length > 0) {
      loadPendingDetails().catch(() => undefined);
    }

    return () => {
      isMounted = false;
    };
  }, [pendingRequests, pendingMessagesByMatchId, pendingProfilesByMatchId]);

  const emptyMessage = useMemo(() => {
    if (errorMessage) return errorMessage;
    return matches.length === 0 && chats.length === 0 && pendingRequests.length === 0
      ? 'Aun no tienes matches'
      : 'No hay mensajes todavia';
  }, [errorMessage, matches.length, chats.length, pendingRequests.length]);

  const handleAcceptRequest = async (request: Match) => {
    try {
      await matchService.updateMatchStatus(request.id, 'accepted');
      await loadData();

      // Navigate to chat to show the initial message
      const chat = await chatService.getChatByMatchId(request.id);
      if (chat) {
        navigation.navigate('Chat', {
          chatId: chat.id,
          matchId: chat.matchId,
          name: chat.name,
          avatarUrl: chat.avatarUrl,
          profile: chat.profile,
        });
        return;
      }
      navigation.navigate('Chat', {
        matchId: request.id,
        name: request.name,
        avatarUrl: request.avatarUrl,
      });
    } catch (error) {
      console.error('Error aceptando solicitud:', error);
      Alert.alert('Error', 'No se pudo aceptar la solicitud');
    }
  };

  const handleRejectRequest = async (request: Match) => {
    try {
      await matchService.updateMatchStatus(request.id, 'rejected');
      await loadData();
    } catch (error) {
      console.error('Error rechazando solicitud:', error);
      Alert.alert('Error', 'No se pudo rechazar la solicitud');
    }
  };

  const handleOpenMatch = async (match: Match) => {
    try {
      const chat = await chatService.getChatByMatchId(match.id);
      if (chat) {
        navigation.navigate('Chat', {
          chatId: chat.id,
          matchId: chat.matchId,
          name: chat.name,
          avatarUrl: chat.avatarUrl,
          profile: chat.profile,
        });
        return;
      }
      navigation.navigate('Chat', {
        matchId: match.id,
        name: match.name,
        avatarUrl: match.avatarUrl,
      });
    } catch (error) {
      console.error('Error abriendo chat del match:', error);
    }
  };

  const handleDeleteMatch = (matchId: string, name: string) => {
    Alert.alert(
      'Eliminar conversacion',
      `¿Estas seguro de que quieres eliminar la conversacion con ${name}?`,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await chatService.deleteMatch(matchId);
              loadData().catch(() => undefined);
            } catch (error) {
              console.error('Error eliminando match:', error);
              Alert.alert('Error', 'No se pudo eliminar la conversacion');
            }
          },
        },
      ]
    );
  };

  const renderMatch = ({ item }: { item: Match }) => {
    const photoUrl = matchPhotoByProfile[item.profileId] || item.avatarUrl;
    return (
      <Pressable
        style={({ pressed }) => [
          styles.matchItem,
          pressed && { opacity: 0.7 },
        ]}
        onPress={() => handleOpenMatch(item).catch(() => undefined)}
      >
        <View style={styles.avatarWrapper}>
          <Image source={{ uri: photoUrl }} style={styles.avatar} />
        </View>
        <Text style={[styles.matchName, { color: theme.colors.text }]}>
          {item.name}
        </Text>
      </Pressable>
    );
  };

  const renderChat = ({ item }: { item: Chat }) => {
    const isUnmatched = item.matchStatus === 'unmatched';

    return (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: spacing.s12,
        }}
      >
        <Pressable
          style={({ pressed }) => [
            styles.chatRow,
            {
              flex: 1,
              marginBottom: 0,
              backgroundColor: theme.colors.glassSurface,
              borderColor: theme.colors.glassBorderSoft,
            },
            pressed && { backgroundColor: theme.colors.glassUltraLightAlt },
          ]}
          onPress={() =>
            navigation.navigate('Chat', {
              chatId: item.id,
              matchId: item.matchId,
              name: item.name,
              avatarUrl: item.avatarUrl,
              profile: item.profile,
            })
          }
        >
          <Image
            source={{
              uri:
                matchPhotoByProfile[item.profileId ?? ''] ||
                item.avatarUrl,
            }}
            style={styles.chatAvatar}
          />
          <View style={styles.chatBody}>
            <View style={styles.chatHeaderRow}>
              <Text style={[styles.chatName, { color: theme.colors.text }]}>
                {item.name}
              </Text>
              <Text
                style={[styles.chatTime, { color: theme.colors.textSecondary }]}
              >
                {item.lastMessageAt}
              </Text>
            </View>
            <View style={styles.chatPreviewRow}>
              <Text
                style={[styles.chatPreview, { color: theme.colors.textSecondary }]}
                numberOfLines={1}
              >
                {item.lastMessage}
              </Text>
              {item.unreadCount > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadText}>{item.unreadCount}</Text>
                </View>
              )}
            </View>
          </View>
        </Pressable>
        {isUnmatched && (
          <Pressable
            style={({ pressed }) => [
              {
                marginLeft: spacing.sm,
                padding: spacing.sm,
                borderRadius: 12,
                backgroundColor: theme.colors.error || '#ff4444',
              },
              pressed && { opacity: 0.7 },
            ]}
            onPress={() => handleDeleteMatch(item.matchId, item.name)}
          >
            <Ionicons name="trash-outline" size={24} color="#fff" />
          </Pressable>
        )}
      </View>
    );
  };

  const PendingRequestCard = ({ request }: { request: Match }) => {
    const photoUrl = matchPhotoByProfile[request.profileId] || request.avatarUrl;
    const pendingMessage =
      pendingMessagesByMatchId[request.id] || 'Solicitud de chat';
    const isExpanded = Boolean(expandedPendingIds[request.id]);
    const previewProfile = pendingProfilesByMatchId[request.id];
    const previewAge = calculateAge(previewProfile?.birth_date ?? null);
    const previewOccupation = previewProfile?.occupation?.trim() || null;
    const previewBudget =
      previewProfile?.budget_min != null || previewProfile?.budget_max != null
        ? previewProfile?.budget_min != null && previewProfile?.budget_max != null
          ? `${previewProfile.budget_min}-${previewProfile.budget_max} EUR`
          : previewProfile?.budget_min != null
          ? `Desde ${previewProfile.budget_min} EUR`
          : `Hasta ${previewProfile?.budget_max} EUR`
        : null;

    const previewChips = [
      previewAge ? `${previewAge} años` : null,
      previewOccupation,
      previewBudget,
    ].filter((item): item is string => Boolean(item));

    return (
      <View
        style={[
          styles.pendingRequestCard,
          { borderColor: theme.colors.glassBorderSoft },
        ]}
      >
        <Image source={{ uri: photoUrl }} style={styles.pendingAvatar} />
        <View style={styles.pendingInfo}>
          <Text style={styles.pendingName}>{request.name}</Text>
          <Text
            style={styles.pendingMessage}
            numberOfLines={isExpanded ? undefined : 2}
          >
            {pendingMessage}
          </Text>
          <Pressable
            style={({ pressed }) => [
              styles.pendingExpandButton,
              pressed && { opacity: 0.8 },
            ]}
            onPress={() =>
              setExpandedPendingIds((prev) => ({
                ...prev,
                [request.id]: !prev[request.id],
              }))
            }
          >
            <Text style={styles.pendingExpandText}>
              {isExpanded ? 'Ver menos' : 'Ver mensaje completo'}
            </Text>
          </Pressable>
          {isExpanded && previewChips.length > 0 ? (
            <View style={styles.pendingPreviewRow}>
              {previewChips.map((chip) => (
                <View key={`${request.id}-${chip}`} style={styles.pendingMetaChip}>
                  <Text style={styles.pendingMetaText}>{chip}</Text>
                </View>
              ))}
            </View>
          ) : null}
          {isExpanded && previewProfile ? (
            <Pressable
              style={({ pressed }) => [
                styles.pendingProfileButton,
                pressed && { opacity: 0.85 },
              ]}
              onPress={() =>
                navigation.navigate('ProfileDetail', {
                  profile: previewProfile,
                  fromMatch: true,
                })
              }
            >
              <Ionicons name="person-circle-outline" size={16} color={theme.colors.primary} />
              <Text style={styles.pendingProfileText}>Ver perfil</Text>
            </Pressable>
          ) : null}
        </View>
        <View style={styles.pendingActions}>
          <Pressable
            style={({ pressed }) => [
              styles.actionButton,
              styles.acceptButton,
              pressed && { opacity: 0.8 },
            ]}
            onPress={() => handleAcceptRequest(request)}
          >
            <Ionicons name="checkmark" size={16} color="#FFFFFF" />
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.actionButton,
              styles.rejectButton,
              pressed && { opacity: 0.8 },
            ]}
            onPress={() => handleRejectRequest(request)}
          >
            <Ionicons name="close" size={16} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surfaceMutedAlt }]}>
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
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <BlurView
          blurType="light"
          blurAmount={16}
          reducedTransparencyFallbackColor={theme.colors.glassOverlay}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.headerFill} />
        <Text style={[styles.title, { color: theme.colors.text }]}>
          Matches
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          Conversaciones activas y nuevos matches
        </Text>
      </View>

      {matches.length === 0 && chats.length === 0 && pendingRequests.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: theme.colors.text }]}>
            {emptyMessage}
          </Text>
        </View>
      ) : (
        <FlatList
          data={orderedChats}
          keyExtractor={(item) => item.id}
          renderItem={renderChat}
          contentContainerStyle={[
            styles.chatList,
            { paddingBottom: insets.bottom + spacing.lg + spacing.s20 },
          ]}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View>
              {pendingRequests.length > 0 ? (
                <View style={styles.pendingSection}>
                  <Text style={styles.sectionTitle}>Solicitudes pendientes</Text>
                  <FlatList
                    data={pendingRequests}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => <PendingRequestCard request={item} />}
                    scrollEnabled={false}
                  />
                  <View style={styles.sectionDivider} />
                </View>
              ) : null}
              {unmatched.length > 0 ? (
                <View style={styles.matchesSection}>
                  <Text style={styles.sectionTitle}>Nuevos matches</Text>
                  <FlatList
                    data={unmatched}
                    keyExtractor={(item) => item.id}
                    renderItem={renderMatch}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.matchesRow}
                  />
                  <View style={styles.sectionDivider} />
                </View>
              ) : (
                <View style={styles.matchesSectionEmpty}>
                  <Text style={styles.sectionTitle}>Sin nuevos matches</Text>
                </View>
              )}
            </View>
          }
          ListEmptyComponent={
            chats.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyText, { color: theme.colors.text }]}>
                  {emptyMessage}
                </Text>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
};
