import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Image,
  ImageBackground,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RealtimeChannel } from '@supabase/supabase-js';
import LinearGradient from 'react-native-linear-gradient';
import { BlurView } from '@react-native-community/blur';
import { useTheme } from '../theme/ThemeContext';
import { colors } from '../theme';
import { chatService } from '../services/chatService';
import { supabaseClient } from '../services/authService';
import { profilePhotoService } from '../services/profilePhotoService';
import type { Chat, Match } from '../types/chat';
import { MatchesScreenStyles as styles } from '../styles/screens';

export const MatchesScreen: React.FC = () => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<StackNavigationProp<any>>();
  const [matches, setMatches] = useState<Match[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [matchPhotoByProfile, setMatchPhotoByProfile] = useState<
    Record<string, string>
  >({});
  const channelRef = useRef<RealtimeChannel | null>(null);
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadData = React.useCallback(async () => {
    try {
      setErrorMessage(null);
      const [nextMatches, nextChats] = await Promise.all([
        chatService.getMatches(),
        chatService.getChats(),
      ]);
      setMatches(nextMatches);
      setChats(nextChats);
    } catch (error) {
      console.error('Error cargando matches/chats:', error);
      setMatches([]);
      setChats([]);
      setErrorMessage('No se pudo cargar la informacion.');
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useFocusEffect(
    React.useCallback(() => {
      void loadData();
    }, [loadData])
  );

  const scheduleRefresh = React.useCallback(() => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }
    refreshTimeoutRef.current = setTimeout(() => {
      void loadData();
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

    void subscribeToChats();

    return () => {
      isMounted = false;
      if (channelRef.current) {
        supabaseClient.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
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

    void loadMatchPhotos();
  }, [unmatched, chats, matchPhotoByProfile]);

  const emptyMessage = useMemo(() => {
    if (errorMessage) return errorMessage;
    return matches.length === 0 && chats.length === 0
      ? 'Aun no tienes matches'
      : 'No hay mensajes todavia';
  }, [errorMessage, matches.length, chats.length]);

  const handleOpenMatch = async (match: Match) => {
    try {
      const chat = await chatService.getOrCreateChat(match.id);
      navigation.navigate('Chat', {
        chatId: chat.id,
        name: chat.name,
        avatarUrl: chat.avatarUrl,
        profile: chat.profile,
      });
    } catch (error) {
      console.error('Error abriendo chat del match:', error);
    }
  };

  const renderMatch = ({ item }: { item: Match }) => {
    const photoUrl = matchPhotoByProfile[item.profileId] || item.avatarUrl;
    return (
      <TouchableOpacity
        style={styles.matchItem}
        onPress={() => void handleOpenMatch(item)}
      >
        <View style={styles.avatarWrapper}>
          <Image source={{ uri: photoUrl }} style={styles.avatar} />
        </View>
        <Text style={[styles.matchName, { color: theme.colors.text }]}>
          {item.name}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderChat = ({ item }: { item: Chat }) => (
    <TouchableOpacity
      style={styles.chatRow}
      onPress={() =>
        navigation.navigate('Chat', {
          chatId: item.id,
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
    </TouchableOpacity>
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
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <BlurView
          blurType="light"
          blurAmount={16}
          reducedTransparencyFallbackColor={colors.glassOverlay}
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

      {matches.length === 0 && chats.length === 0 ? (
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
            { paddingBottom: insets.bottom + 110 },
          ]}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            unmatched.length > 0 ? (
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
            )
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
