import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { GroupMembersScreenStyles } from '../styles/screens';
import type {
  ExpenseGroupMemberWithProfile,
  ExpenseGroupRole,
} from '../types/expenseGroup';
import { expenseGroupService } from '../services/expenseGroupService';
import { supabaseClient } from '../services/authService';
import { profilePhotoService } from '../services/profilePhotoService';
import { API_CONFIG } from '../config/api';
import { getUserInitials, getUserName } from '../utils/name';
import LinearGradient from 'react-native-linear-gradient';

interface GroupMembersRouteParams {
  groupId: string;
  groupName: string;
  currentUserRole: ExpenseGroupRole;
  onMemberRemoved?: () => void;
  onMemberLeft?: () => void;
  onOwnershipTransferred?: () => void;
}

const resolveAvatarUrl = (avatarUrl?: string | null) => {
  if (!avatarUrl) return null;
  if (avatarUrl.startsWith('http')) return avatarUrl;
  return `${API_CONFIG.SUPABASE_URL}/storage/v1/object/public/avatars/${avatarUrl}`;
};

const roleLabel: Record<ExpenseGroupRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Miembro',
};

export const GroupMembersScreen: React.FC = () => {
  const theme = useTheme();
  const styles = useMemo(() => GroupMembersScreenStyles(theme), [theme]);
  const navigation = useNavigation<StackNavigationProp<any>>();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const membersChannelRef = useRef<RealtimeChannel | null>(null);

  const {
    groupId,
    groupName,
    currentUserRole,
    onMemberRemoved,
    onMemberLeft,
    onOwnershipTransferred,
  } = (route.params as GroupMembersRouteParams) || {};
  const resolvedRole = currentUserRole ?? 'member';

  const [members, setMembers] = useState<ExpenseGroupMemberWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentRole, setCurrentRole] = useState<ExpenseGroupRole>(resolvedRole);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [memberPhotosById, setMemberPhotosById] = useState<Record<string, string>>({});
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);

  const loadMembers = useCallback(async () => {
    if (!groupId) return;
    setLoading(true);
    try {
      const data = await expenseGroupService.getGroupMembers(groupId);
      setMembers(data);
    } catch (error) {
      console.error('[GroupMembersScreen] error loading members:', error);
      Alert.alert('Error', 'No se pudieron cargar los miembros.');
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    supabaseClient.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id ?? null);
    });
  }, []);

  useEffect(() => {
    if (!groupId) return;
    loadMembers().catch((error) => {
      console.error('[GroupMembersScreen] initial load error:', error);
    });
  }, [groupId, loadMembers]);

  useEffect(() => {
    if (!groupId) return;

    let isMounted = true;
    const subscribeToMembers = async () => {
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        supabaseClient.realtime.setAuth(token);
      }

      if (membersChannelRef.current) {
        supabaseClient.removeChannel(membersChannelRef.current);
      }

      membersChannelRef.current = supabaseClient
        .channel(`expense-group-members:${groupId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'expense_group_members',
            filter: `group_id=eq.${groupId}`,
          },
          () => {
            if (!isMounted) return;
            loadMembers().catch((error) => {
              console.warn('[GroupMembersScreen] refresh error:', error);
            });
          }
        )
        .subscribe();
    };

    subscribeToMembers().catch((error) => {
      console.warn('[GroupMembersScreen] subscribe error:', error);
    });

    return () => {
      isMounted = false;
      if (membersChannelRef.current) {
        supabaseClient.removeChannel(membersChannelRef.current);
        membersChannelRef.current = null;
      }
    };
  }, [groupId, loadMembers]);

  useEffect(() => {
    if (!currentUserId) return;
    const current = members.find((member) => member.user_id === currentUserId);
    if (current?.role) {
      setCurrentRole(current.role);
    }
  }, [currentUserId, members]);

  useEffect(() => {
    if (members.length === 0) return;
    const missingMembers = members.filter(
      (member) => !memberPhotosById[member.user_id]
    );
    if (missingMembers.length === 0) return;

    let isActive = true;
    const loadMemberPhotos = async () => {
      await Promise.all(
        missingMembers.map(async (member) => {
          try {
            const photos = await profilePhotoService.getPhotosForProfile(member.user_id);
            const url =
              photos[0]?.signedUrl ?? resolveAvatarUrl(member.profile?.avatar_url);
            if (url && isActive) {
              setMemberPhotosById((prev) =>
                prev[member.user_id] ? prev : { ...prev, [member.user_id]: url }
              );
            }
          } catch {
            const fallbackUrl = resolveAvatarUrl(member.profile?.avatar_url);
            if (fallbackUrl && isActive) {
              setMemberPhotosById((prev) =>
                prev[member.user_id]
                  ? prev
                  : { ...prev, [member.user_id]: fallbackUrl }
              );
            }
          }
        })
      );
    };

    loadMemberPhotos().catch((error) => {
      console.warn('[GroupMembersScreen] Error cargando fotos:', error);
    });

    return () => {
      isActive = false;
    };
  }, [memberPhotosById, members]);

  const sortedMembers = useMemo(() => {
    const roleOrder: Record<ExpenseGroupRole, number> = {
      owner: 0,
      admin: 1,
      member: 2,
    };
    return [...members].sort((a, b) => {
      const roleDiff = roleOrder[a.role] - roleOrder[b.role];
      if (roleDiff !== 0) return roleDiff;
      const joinedA = new Date(a.joined_at).getTime();
      const joinedB = new Date(b.joined_at).getTime();
      return joinedA - joinedB;
    });
  }, [members]);

  const canRemoveMembers = currentRole === 'owner' || currentRole === 'admin';

  const confirmRemove = (member: ExpenseGroupMemberWithProfile) => {
    Alert.alert(
      'Expulsar miembro',
      `Vas a expulsar a ${getUserName(member.profile, 'Miembro')}.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Expulsar',
          style: 'destructive',
          onPress: () => handleRemove(member),
        },
      ]
    );
  };

  const handleRemove = async (member: ExpenseGroupMemberWithProfile) => {
    if (!groupId) return;
    setRemovingMemberId(member.user_id);
    try {
      await expenseGroupService.removeMember(groupId, member.user_id);
      onMemberRemoved?.();
    } catch (error) {
      console.error('[GroupMembersScreen] remove error:', error);
      Alert.alert('Error', 'No se pudo expulsar al miembro.');
    } finally {
      setRemovingMemberId(null);
    }
  };

  const confirmLeave = () => {
    const leaveMessage =
      currentRole === 'owner'
        ? 'Si sales, el ownership se transferira automaticamente.'
        : 'Vas a salir del grupo.';
    Alert.alert('Salir del grupo', leaveMessage, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Salir',
        style: 'destructive',
        onPress: handleLeave,
      },
    ]);
  };

  const handleLeave = async () => {
    if (!groupId) return;
    setLeaving(true);
    try {
      await expenseGroupService.leaveGroup(groupId);
      if (currentRole === 'owner') {
        onOwnershipTransferred?.();
      }
      onMemberLeft?.();
      navigation.goBack();
    } catch (error) {
      console.error('[GroupMembersScreen] leave error:', error);
      Alert.alert('Error', 'No se pudo salir del grupo.');
    } finally {
      setLeaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
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
        <View style={styles.header}>
          <Pressable style={styles.headerButton} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={18} color={theme.colors.text} />
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {groupName || 'Miembros'}
          </Text>
          <View style={styles.headerSpacer} />
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.infoCard}>
            <Text style={styles.infoText}>
              Owner y admins pueden expulsar miembros. El owner no puede expulsarse.
            </Text>
            <Text style={styles.infoText}>
              Al salir, el ownership se transfiere automaticamente si eres owner.
            </Text>
          </View>
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
            </View>
          ) : (
          sortedMembers.map((member) => {
            const isCurrentUser = member.user_id === currentUserId;
            const avatarUrl =
              memberPhotosById[member.user_id] ??
              resolveAvatarUrl(member.profile?.avatar_url);
            const showRemove =
              canRemoveMembers &&
              !isCurrentUser &&
                member.role !== 'owner' &&
                removingMemberId !== member.user_id;
              const isRemoving = removingMemberId === member.user_id;
              return (
                <View key={member.id} style={styles.memberCard}>
                  <View style={styles.avatar}>
                    {avatarUrl ? (
                      <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
                    ) : (
                      <Text style={styles.avatarText}>
                        {getUserInitials(member.profile, 'U')}
                      </Text>
                    )}
                  </View>
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>
                      {getUserName(member.profile, 'Miembro')}
                    </Text>
                    <View style={styles.roleRow}>
                      <View
                        style={[
                          styles.roleBadge,
                          member.role === 'owner' && styles.roleOwner,
                          member.role === 'admin' && styles.roleAdmin,
                          member.role === 'member' && styles.roleMember,
                        ]}
                      >
                        <Text style={styles.roleText}>{roleLabel[member.role]}</Text>
                      </View>
                      {isCurrentUser ? (
                        <View style={styles.youBadge}>
                          <Text style={styles.youText}>Tu</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                  <View style={styles.memberActions}>
                    {isRemoving ? (
                      <ActivityIndicator size="small" color={theme.colors.primary} />
                    ) : showRemove ? (
                      <Pressable
                        style={styles.removeButton}
                        onPress={() => confirmRemove(member)}
                      >
                        <Text style={styles.removeButtonText}>Expulsar</Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
        <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
          <Pressable style={styles.leaveButton} onPress={confirmLeave} disabled={leaving}>
            {leaving ? (
              <ActivityIndicator size="small" color={theme.colors.error} />
            ) : (
              <Text style={styles.leaveButtonText}>Salir del grupo</Text>
            )}
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
};
