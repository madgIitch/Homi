import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useContext,
} from 'react';
import {
  FlatList,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { BlurView } from '@react-native-community/blur';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import type { RealtimeChannel } from '@supabase/supabase-js';
import LinearGradient from 'react-native-linear-gradient';
import { spacing } from '../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, useThemeController } from '../theme/ThemeContext';
import { getUserName } from '../utils/name';
import { chatService } from '../services/chatService';
import { supabaseClient } from '../services/authService';
import { profilePhotoService } from '../services/profilePhotoService';
import { matchService } from '../services/matchService';
import { roomAssignmentService } from '../services/roomAssignmentService';
import { roomService } from '../services/roomService';
import { roomExtrasService } from '../services/roomExtrasService';
import { AuthContext } from '../context/AuthContext';
import type { Message } from '../types/chat';
import type { Profile } from '../types/profile';
import { ChatScreenStyles as styles } from '../styles/screens';
import type { MatchStatus } from '../types/chat';
import type { Room } from '../types/room';
import type { RoomExtras } from '../types/room';
import type { RoomAssignment } from '../types/roomAssignment';

type RouteParams = {
  chatId?: string;
  matchId?: string;
  name: string;
  avatarUrl: string;
  profile?: Profile;
};

const GlassCard: React.FC<{ style?: object; children: React.ReactNode }> = ({
  style,
  children,
}) => {
  const theme = useTheme();
  return (
    <View style={[styles.glassCard, style]}>
      <BlurView
        blurType="light"
        blurAmount={16}
        reducedTransparencyFallbackColor={theme.colors.glassOverlay}
        style={StyleSheet.absoluteFillObject}
      />
      <View
        style={[
          styles.glassFill,
          { backgroundColor: theme.colors.glassUltraLightAlt },
        ]}
      />
      {children}
    </View>
  );
};

export const ChatScreen: React.FC = () => {
  const theme = useTheme();
  const { isDark } = useThemeController();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<StackNavigationProp<any>>();
  const route = useRoute();
  const authContext = useContext(AuthContext);
  const currentUserId = authContext?.user?.id ?? null;
  const {
    chatId: routeChatId,
    matchId: routeMatchId,
    name,
    avatarUrl,
    profile,
  } = route.params as RouteParams;
  const [chatId, setChatId] = useState<string | null>(routeChatId ?? null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [headerAvatarUrl, setHeaderAvatarUrl] = useState(avatarUrl);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [matchId, setMatchId] = useState<string | null>(routeMatchId ?? null);
  const [matchStatus, setMatchStatus] = useState<MatchStatus | null>(null);
  const [matchUserBId, setMatchUserBId] = useState<string | null>(null);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [seekerId, setSeekerId] = useState<string | null>(null);
  const [otherUserId, setOtherUserId] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<RoomAssignment[]>([]);
  const [ownerRoomAssignments, setOwnerRoomAssignments] = useState<RoomAssignment[]>([]);
  const [ownerAssignments, setOwnerAssignments] = useState<RoomAssignment[]>([]);
  const [matchAssignment, setMatchAssignment] = useState<RoomAssignment | null>(null);
  const [ownerRooms, setOwnerRooms] = useState<Room[]>([]);
  const [roomExtras, setRoomExtras] = useState<Record<string, RoomExtras | null>>({});
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [assignTarget, setAssignTarget] = useState<'seeker' | 'owner'>('seeker');
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [isAssignmentCollapsed, setIsAssignmentCollapsed] = useState(true);
  const [isRoommatesCollapsed, setIsRoommatesCollapsed] = useState(true);
  const [isMatchMenuVisible, setIsMatchMenuVisible] = useState(false);
  const listRef = useRef<FlatList<Message> | null>(null);
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [showScrollToEnd, setShowScrollToEnd] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isAtBottomRef = useRef(true);
  const didInitialScrollRef = useRef(false);
  const layoutHeightRef = useRef(0);
  const contentHeightRef = useRef(0);
  const assignmentChannelRef = useRef<RealtimeChannel | null>(null);
  const matchChannelRef = useRef<RealtimeChannel | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);


  useEffect(() => {
    if (routeChatId && routeChatId !== chatId) {
      setChatId(routeChatId);
    }
  }, [routeChatId, chatId]);

  useEffect(() => {
    if (routeMatchId && routeMatchId !== matchId) {
      setMatchId(routeMatchId);
    }
  }, [routeMatchId, matchId]);

  const refreshMessages = useCallback(async () => {
    if (!chatId) return;
    try {
      const data = await chatService.getMessages(chatId);
      setMessages(data);
      await chatService.markMessagesAsRead(chatId);
    } catch (error) {
      console.error('Error cargando mensajes:', error);
    }
  }, [chatId]);

  const updateTypingState = useCallback(
    (typing: boolean) => {
      if (!currentUserId || !channelRef.current) return;
      channelRef.current.track({
        user_id: currentUserId,
        typing,
        at: Date.now(),
      });
    },
    [currentUserId]
  );

  const handleInputChange = useCallback(
    (text: string) => {
      setInputValue(text);
      if (!currentUserId || !channelRef.current) return;

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      if (text.trim().length === 0) {
        updateTypingState(false);
        return;
      }

      updateTypingState(true);
      typingTimeoutRef.current = setTimeout(() => {
        updateTypingState(false);
      }, 1500);
    },
    [currentUserId, updateTypingState]
  );

  useEffect(() => {
    let isMounted = true;
    const loadHeaderAvatar = async () => {
      if (!profile?.id) return;
      try {
        const photos = await profilePhotoService.getPhotosForProfile(profile.id);
        const primary = photos.find((photo) => photo.is_primary) ?? photos[0];
        if (primary?.signedUrl && isMounted) {
          setHeaderAvatarUrl(primary.signedUrl);
        }
      } catch (error) {
        console.error('Error cargando avatar del chat:', error);
      }
    };

    loadHeaderAvatar();
    return () => {
      isMounted = false;
    };
  }, [profile?.id]);

  useEffect(() => {
    if (!chatId && !matchId) return;
    let isMounted = true;

    const loadMatchDetails = async () => {
      try {
        let resolvedMatchId = matchId;
        let resolvedMatchStatus = matchStatus;

        if (chatId) {
          const chatDetail = await chatService.getChatDetails(chatId);
          if (!chatDetail || !isMounted) return;
          resolvedMatchId = chatDetail.matchId;
          resolvedMatchStatus = chatDetail.matchStatus ?? null;
          if (isMounted) {
            setMatchId(chatDetail.matchId);
            setMatchStatus(chatDetail.matchStatus ?? null);
          }
        }

        if (!resolvedMatchId) return;
        const match = await matchService.getMatch(resolvedMatchId);
        if (!match || !isMounted) return;

        const owner =
          match.user_a?.housing_situation === 'offering'
            ? match.user_a_id
            : match.user_b?.housing_situation === 'offering'
            ? match.user_b_id
            : null;
        const seeker =
          owner != null
            ? owner === match.user_a_id
              ? match.user_b_id
              : match.user_a_id
            : null;
        const other =
          currentUserId && currentUserId === match.user_a_id
            ? match.user_b_id
            : match.user_a_id;

        if (isMounted) {
          setMatchUserBId(match.user_b_id ?? null);
          setOwnerId(owner);
          setSeekerId(seeker);
          setOtherUserId(other ?? null);
          if (!resolvedMatchStatus && match.status) {
            setMatchStatus(match.status);
          }
        }
      } catch (error) {
        console.error('Error cargando detalles del match:', error);
      }
    };

    loadMatchDetails();
    return () => {
      isMounted = false;
    };
  }, [chatId, matchId, matchStatus, currentUserId]);

  const loadAssignments = useCallback(async () => {
    if (!matchId) return;
    try {
      if (isMountedRef.current) {
        setLoadingAssignments(true);
      }
      const data = await roomAssignmentService.getAssignments(matchId);
      if (!isMountedRef.current) return;
      const nextAssignments = data.assignments.filter(
        (assignment) => assignment.match_id === matchId
      );
      setAssignments(nextAssignments);
      setMatchAssignment(data.match_assignment ?? null);
    } catch (error) {
      console.error('Error cargando asignaciones:', error);
    } finally {
      if (isMountedRef.current) {
        setLoadingAssignments(false);
      }
    }
  }, [matchId]);

  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  const loadOwnerAssignments = useCallback(async () => {
    if (!currentUserId) return;
    try {
      const data = await roomAssignmentService.getAssignmentsForAssignee();
      if (!isMountedRef.current) return;
      setOwnerAssignments(data.assignments);
    } catch (error) {
      console.error('Error cargando asignaciones del owner:', error);
    }
  }, [currentUserId]);

  useEffect(() => {
    const isOwnerValue = Boolean(currentUserId && ownerId === currentUserId);
    if (!isOwnerValue) {
      setOwnerAssignments([]);
      return;
    }
    loadOwnerAssignments();
  }, [currentUserId, ownerId, loadOwnerAssignments]);

  const loadOwnerRoomAssignments = useCallback(async () => {
    if (!currentUserId) return;
    try {
      const data = await roomAssignmentService.getAssignmentsForOwner();
      if (!isMountedRef.current) return;
      setOwnerRoomAssignments(data.assignments);
    } catch (error) {
      console.error('Error cargando asignaciones de habitaciones:', error);
    }
  }, [currentUserId]);

  useEffect(() => {
    const isOwnerValue = Boolean(currentUserId && ownerId === currentUserId);
    if (!isOwnerValue) {
      setOwnerRoomAssignments([]);
      return;
    }
    loadOwnerRoomAssignments();
  }, [currentUserId, ownerId, loadOwnerRoomAssignments]);

  useEffect(() => {
    if (!matchId) {
      if (assignmentChannelRef.current) {
        supabaseClient.removeChannel(assignmentChannelRef.current);
        assignmentChannelRef.current = null;
      }
      return;
    }

    let isMounted = true;
    const subscribeToAssignments = async () => {
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        supabaseClient.realtime.setAuth(token);
      }

      if (assignmentChannelRef.current) {
        supabaseClient.removeChannel(assignmentChannelRef.current);
        assignmentChannelRef.current = null;
      }

      const channel = supabaseClient
        .channel(`room-assignments:${matchId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'room_assignments',
            filter: `match_id=eq.${matchId}`,
          },
          () => {
            if (!isMounted) return;
            loadAssignments();
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'room_assignments',
            filter: `match_id=eq.${matchId}`,
          },
          () => {
            if (!isMounted) return;
            loadAssignments();
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'room_assignments',
            filter: `match_id=eq.${matchId}`,
          },
          () => {
            if (!isMounted) return;
            loadAssignments();
          }
        )
        .subscribe();

      assignmentChannelRef.current = channel;
    };

    subscribeToAssignments();

    return () => {
      isMounted = false;
      if (assignmentChannelRef.current) {
        supabaseClient.removeChannel(assignmentChannelRef.current);
        assignmentChannelRef.current = null;
      }
    };
  }, [loadAssignments, matchId]);

  const refreshOwnerRooms = useCallback(async () => {
    if (!ownerId) return;
    try {
      if (isMountedRef.current) {
        setLoadingRooms(true);
      }
      const isOwnerValue = Boolean(currentUserId && ownerId === currentUserId);
      const rooms = isOwnerValue
        ? await roomService.getMyRooms()
        : await roomService.getRoomsByOwner(ownerId);
      if (!isMountedRef.current) return;
      setOwnerRooms(rooms);
      const extras = await roomExtrasService.getExtrasForRooms(
        rooms.map((room) => room.id)
      );
      if (!isMountedRef.current) return;
      const extrasMap = Object.fromEntries(
        extras.map((extra) => [extra.room_id, extra])
      );
      setRoomExtras(extrasMap);
    } catch (error) {
      console.error('Error cargando habitaciones del owner:', error);
    } finally {
      if (isMountedRef.current) {
        setLoadingRooms(false);
      }
    }
  }, [currentUserId, ownerId]);

  useEffect(() => {
    refreshOwnerRooms();
  }, [refreshOwnerRooms]);

  const isOwner = Boolean(currentUserId && ownerId === currentUserId);
  const isSeeker = Boolean(currentUserId && seekerId === currentUserId);

  const acceptedAssignments = useMemo(
    () => assignments.filter((assignment) => assignment.status === 'accepted'),
    [assignments]
  );

  const canSeeAssignees = useMemo(() => {
    if (isOwner) return true;
    if (matchAssignment?.status === 'accepted') return true;
    return acceptedAssignments.some(
      (assignment) => assignment.assignee_id === currentUserId
    );
  }, [acceptedAssignments, currentUserId, isOwner, matchAssignment?.status]);

  const ownerHasRoom = useMemo(() => {
    return ownerAssignments.some((assignment) => assignment.status === 'accepted');
  }, [ownerAssignments]);

  const ownerAssignment = useMemo(
    () => ownerAssignments.find((assignment) => assignment.status === 'accepted') ?? null,
    [ownerAssignments]
  );
  const hasVisibleAssignments = useMemo(
    () => acceptedAssignments.length > 0 || (isOwner && ownerAssignment !== null),
    [acceptedAssignments.length, isOwner, ownerAssignment]
  );

  const occupiedRoomIds = useMemo(() => {
    const ids = new Set<string>();
    acceptedAssignments.forEach((assignment) => ids.add(assignment.room_id));
    ownerRoomAssignments
      .filter((assignment) => assignment.status === 'accepted')
      .forEach((assignment) => ids.add(assignment.room_id));
    return ids;
  }, [acceptedAssignments, ownerRoomAssignments]);
  const isCurrentTenant = useMemo(() => {
    if (!currentUserId || isOwner || !ownerId) return false;
    return acceptedAssignments.some(
      (assignment) => assignment.assignee_id === currentUserId
    );
  }, [acceptedAssignments, currentUserId, isOwner, ownerId]);

  const isOtherTenant = useMemo(() => {
    if (!otherUserId || !ownerId) return false;
    return acceptedAssignments.some(
      (assignment) => assignment.assignee_id === otherUserId
    );
  }, [acceptedAssignments, otherUserId, ownerId]);

  const shouldShowAssignmentCard = Boolean(ownerId && (isOwner || isSeeker));
  const shouldShowRoommatesCard =
    Boolean(ownerId && isOwner) || (isCurrentTenant && isOtherTenant);

  const privateRooms = useMemo(
    () => ownerRooms.filter((room) => roomExtras[room.id]?.category !== 'area_comun'),
    [ownerRooms, roomExtras]
  );

  const availableRooms = useMemo(() => {
    if (!isOwner) return [];
    return privateRooms.filter(
      (room) => room.is_available && !occupiedRoomIds.has(room.id)
    );
  }, [isOwner, privateRooms, occupiedRoomIds]);

  const assignRoom = async () => {
    if (!selectedRoomId) return;
    const targetId = assignTarget === 'owner' ? ownerId : seekerId;
    if (!targetId) return;
    if (assignTarget === 'seeker' && !matchId) return;

    try {
      const payload: { match_id?: string; room_id: string; assignee_id: string } = {
        room_id: selectedRoomId,
        assignee_id: targetId,
      };
      if (assignTarget === 'seeker' && matchId) {
        payload.match_id = matchId;
      }
      await roomAssignmentService.createAssignment(payload);
      setAssignModalVisible(false);
      setSelectedRoomId(null);
      if (matchId) {
        const data = await roomAssignmentService.getAssignments(matchId);
        setAssignments(data.assignments);
        setMatchAssignment(data.match_assignment ?? null);
        setOwnerId(data.owner_id);
      }
      if (assignTarget === 'seeker') {
        setMatchStatus('room_offer');
      }
      if (currentUserId && ownerId === currentUserId) {
        await Promise.all([
          refreshOwnerRooms(),
          loadOwnerAssignments(),
          loadOwnerRoomAssignments(),
        ]);
      }
    } catch (error) {
      console.error('Error asignando habitacion:', error);
    }
  };

  const respondToAssignment = async (status: 'accepted' | 'rejected') => {
    if (!matchAssignment || !matchId) return;
    try {
      await roomAssignmentService.updateAssignment({
        assignment_id: matchAssignment.id,
        status,
      });
      const data = await roomAssignmentService.getAssignments(matchId);
      setAssignments(data.assignments);
      setMatchAssignment(data.match_assignment ?? null);
      setMatchStatus(status === 'accepted' ? 'room_assigned' : 'room_declined');
    } catch (error) {
      console.error('Error respondiendo a asignacion:', error);
    }
  };

  const renderRoomTitle = (room: Room) => {
    const extras = roomExtras[room.id];
    if (!extras) return room.title;
    const typeLabel =
      extras.category === 'area_comun'
        ? extras.common_area_type === 'otros'
          ? extras.common_area_custom
          : extras.common_area_type
        : extras.room_type;
    if (!typeLabel) return room.title;
    return `${room.title} - ${typeLabel}`;
  };

  useEffect(() => {
    if (!chatId) return;
    let isMounted = true;

    const subscribeToMessages = async () => {
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        supabaseClient.realtime.setAuth(token);
      }

      if (channelRef.current) {
        supabaseClient.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      const channel = supabaseClient
        .channel(`messages:chat:${chatId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `chat_id=eq.${chatId}`,
          },
          (payload) => {
            if (!isMounted) return;
            const next = mapRealtimeMessage(payload.new, currentUserId);
            setMessages((prev) => upsertMessage(prev, next));
            if (!next.isMine) {
              chatService
                .markMessagesAsRead(chatId)
                .catch((error) =>
                  console.error('Error marcando mensajes como leidos:', error)
                );
              if (matchStatus === 'pending') {
                setMatchStatus('accepted');
              }
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'messages',
            filter: `chat_id=eq.${chatId}`,
          },
          (payload) => {
            if (!isMounted) return;
            const next = mapRealtimeMessage(payload.new, currentUserId);
            setMessages((prev) => upsertMessage(prev, next));
          }
        )
        .on('presence', { event: 'sync' }, () => {
          if (!channelRef.current) return;
          const state = channelRef.current.presenceState();
          const participants = Object.values(state).flat() as Array<{
            user_id?: string;
            typing?: boolean;
          }>;
          const otherTyping = participants.some(
            (presence) =>
              presence.user_id &&
              presence.user_id !== currentUserId &&
              presence.typing
          );
          setIsOtherTyping(otherTyping);
        });

      channelRef.current = channel;
      channel.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            refreshMessages();
            updateTypingState(false);
          }
        });
    };

    subscribeToMessages();

    return () => {
      isMounted = false;
      if (channelRef.current) {
        supabaseClient.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    };
  }, [chatId, currentUserId, matchStatus, refreshMessages, updateTypingState]);

  useEffect(() => {
    if (!matchId) return;
    let isMounted = true;

    const subscribeToMatch = async () => {
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        supabaseClient.realtime.setAuth(token);
      }

      if (matchChannelRef.current) {
        supabaseClient.removeChannel(matchChannelRef.current);
        matchChannelRef.current = null;
      }

      const channel = supabaseClient
        .channel(`matches:chat:${matchId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'matches',
            filter: `id=eq.${matchId}`,
          },
          (payload) => {
            if (!isMounted) return;
            const nextStatus = payload.new?.status as MatchStatus | undefined;
            if (nextStatus) {
              setMatchStatus(nextStatus);
            }
          }
        )
        .subscribe();

      matchChannelRef.current = channel;
    };

    subscribeToMatch().catch(() => undefined);

    return () => {
      isMounted = false;
      if (matchChannelRef.current) {
        supabaseClient.removeChannel(matchChannelRef.current);
        matchChannelRef.current = null;
      }
    };
  }, [matchId]);

  useEffect(() => {
    refreshMessages();
  }, [refreshMessages]);

  const orderedMessages = useMemo(() => {
    return [...messages].sort(
      (a, b) => toTimestamp(a.createdAtIso) - toTimestamp(b.createdAtIso)
    );
  }, [messages]);
  const isUnmatched = matchStatus === 'unmatched';
  const isPending = matchStatus === 'pending';
  const isPendingRecipient =
    isPending && Boolean(currentUserId && matchUserBId === currentUserId);
  const canSendMessage = !isUnmatched && (!isPending || isPendingRecipient);

  useEffect(() => {
    if (isUnmatched) {
      setIsMatchMenuVisible(false);
    }
  }, [isUnmatched]);

  useEffect(() => {
    if (!didInitialScrollRef.current || !isAtBottomRef.current) return;
    listRef.current?.scrollToEnd({ animated: true });
  }, [orderedMessages.length]);

  const sendMessage = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    if (!canSendMessage) return;
    setInputValue('');
    updateTypingState(false);
    try {
      let resolvedChatId = chatId;
      if (!resolvedChatId) {
        if (!matchId) {
          console.error('No se pudo enviar mensaje: falta matchId');
          return;
        }
        const created = await chatService.createChat(matchId);
        resolvedChatId = created.id;
        if (isMountedRef.current) {
          setChatId(created.id);
          setMatchId(created.matchId ?? matchId);
        }
      }
      const next = await chatService.sendMessage(resolvedChatId, trimmed);
      setMessages((prev) => upsertMessage(prev, next));
      if (isPendingRecipient) {
        setMatchStatus('accepted');
      }
    } catch (error) {
      console.error('Error enviando mensaje:', error);
    }
  };

  const handleToggleMatchMenu = () => {
    setIsMatchMenuVisible((prev) => !prev);
  };

  const handleUnmatch = () => {
    if (!matchId) return;
    Alert.alert(
      'Eliminar match',
      'Se eliminará el match y no podrás enviar más mensajes a esta persona.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const updated = await matchService.updateMatchStatus(
                matchId,
                'unmatched'
              );
              if (isMountedRef.current) {
                setMatchStatus(updated.status ?? 'unmatched');
                setIsMatchMenuVisible(false);
              }
            } catch (error) {
              console.error('Error eliminando match:', error);
            }
          },
        },
      ]
    );
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMine = item.isMine;
    return (
      <View
        style={[
          styles.messageRow,
          isMine ? styles.messageRowMine : styles.messageRowOther,
        ]}
      >
        <View
          style={[
            styles.bubble,
            isMine ? styles.bubbleMine : styles.bubbleOther,
          ]}
        >
          <BlurView
            blurType="light"
            blurAmount={14}
            reducedTransparencyFallbackColor={theme.colors.glassUltraLight}
            style={StyleSheet.absoluteFillObject}
          />
          <View
            style={[
              styles.bubbleGlassFill,
              isMine ? styles.bubbleGlassFillMine : styles.bubbleGlassFillOther,
            ]}
          />
          <Text
            style={[
              styles.bubbleText,
              isMine ? styles.bubbleTextMine : styles.bubbleTextOther,
            ]}
          >
            {item.text}
          </Text>
          <View
            style={[
              styles.bubbleMeta,
              !isMine && styles.bubbleMetaOther,
            ]}
          >
            <Text
              style={[
                styles.bubbleTime,
                {
                  color: isDark
                    ? theme.colors.primaryLight
                    : isMine
                    ? theme.colors.textStrong
                    : theme.colors.textSubtle,
                },
              ]}
            >
              {item.createdAt}
            </Text>
            {isMine && item.status && (
              <Text
                style={[
                  styles.bubbleStatus,
                  { color: isDark ? theme.colors.primaryLight : theme.colors.textStrong },
                ]}
              >
                {statusLabel(item.status)}
              </Text>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surfaceMutedAlt }]}>
      <ImageBackground
        source={{
          uri: 'https://images.unsplash.com/photo-1482192596544-9eb780fc7f66?auto=format&fit=crop&w=1200&q=80',
        }}
        blurRadius={18}
        style={styles.background}
      >
        <LinearGradient
          colors={[theme.colors.glassOverlay, theme.colors.glassWarmStrong]}
          style={StyleSheet.absoluteFillObject}
        />
      </ImageBackground>
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + spacing.s10, paddingBottom: spacing.s10 },
        ]}
      >
        <BlurView
          blurType="light"
          blurAmount={16}
          reducedTransparencyFallbackColor={theme.colors.glassOverlay}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.headerFill} />
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.headerProfile}
          onPress={() => {
            if (profile) {
              navigation.navigate('ProfileDetail', { profile, fromMatch: true });
            }
          }}
          disabled={!profile}
        >
          <Image source={{ uri: headerAvatarUrl }} style={styles.headerAvatar} />
          <Text style={[styles.headerName, { color: theme.colors.text }]}>
            {name}
          </Text>
        </TouchableOpacity>
        <Pressable
          style={({ pressed }) => [
            styles.headerMenuButton,
            pressed && { opacity: 0.7 },
          ]}
          onPress={handleToggleMatchMenu}
          disabled={!matchId || isUnmatched}
        >
          <Ionicons
            name="ellipsis-horizontal"
            size={20}
            color={theme.colors.text}
          />
        </Pressable>
      </View>
      {isMatchMenuVisible && !isUnmatched && (
        <View style={styles.matchMenu}>
          <Pressable
            style={({ pressed }) => [
              styles.matchMenuItem,
              pressed && { opacity: 0.8 },
            ]}
            onPress={handleUnmatch}
          >
            <Ionicons
              name="heart-dislike"
              size={16}
              color={theme.colors.errorDark}
            />
            <Text style={styles.matchMenuText}>Eliminar match</Text>
          </Pressable>
        </View>
      )}
      {isOtherTyping && (
        <View style={styles.typingRow}>
          <BlurView
            blurType="light"
            blurAmount={14}
            reducedTransparencyFallbackColor={theme.colors.glassOverlay}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={styles.typingFill} />
          <Text style={styles.typingText}>Escribiendo...</Text>
        </View>
      )}

      {shouldShowAssignmentCard && (
        <GlassCard
          style={[
            styles.assignmentPanel,
            {
              backgroundColor: theme.colors.glassSurface,
              borderColor: theme.colors.glassBorderSoft,
            },
          ]}
        >
          <View style={styles.assignmentHeader}>
            <View>
              <Text style={styles.assignmentTitle}>Gestion de habitacion</Text>
              <Text
                style={[styles.assignmentSubtitle, { color: theme.colors.textSecondary }]}
              >
                {isOwner ? 'Asigna habitaciones y gestiona ofertas.' : 'Revisa tu estado de habitacion.'}
              </Text>
            </View>
            <View style={styles.assignmentHeaderActions}>
              {matchStatus && (
                <View style={styles.assignmentStatusPill}>
                  <Text style={styles.assignmentStatusText}>
                    {matchStatusLabel(matchStatus)}
                  </Text>
                </View>
              )}
              <TouchableOpacity
                style={styles.roommatesToggle}
                onPress={() => setIsAssignmentCollapsed((prev) => !prev)}
              >
                <Ionicons
                  name={isAssignmentCollapsed ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={theme.colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
          </View>
          {!isAssignmentCollapsed && (
            <>
              {isOwner && (
                <View style={styles.assignActions}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.assignButton,
                      availableRooms.length === 0 && styles.assignButtonDisabled,
                      pressed && availableRooms.length > 0 && { opacity: 0.9 },
                    ]}
                    onPress={() => {
                      setAssignTarget('seeker');
                      setSelectedRoomId(null);
                      setAssignModalVisible(true);
                    }}
                    disabled={availableRooms.length === 0}
                  >
                    <Text
                      style={[
                        styles.assignButtonText,
                        availableRooms.length === 0 && styles.assignButtonTextDisabled,
                      ]}
                    >
                      Asignar habitacion
                    </Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [
                      styles.assignButton,
                      (ownerHasRoom || availableRooms.length === 0) &&
                        styles.assignButtonDisabled,
                      pressed && !(ownerHasRoom || availableRooms.length === 0) && {
                        opacity: 0.9,
                      },
                    ]}
                    onPress={() => {
                      setAssignTarget('owner');
                      setSelectedRoomId(null);
                      setAssignModalVisible(true);
                    }}
                    disabled={ownerHasRoom || availableRooms.length === 0}
                  >
                    <Text
                      style={[
                        styles.assignButtonText,
                        (ownerHasRoom || availableRooms.length === 0) &&
                          styles.assignButtonTextDisabled,
                      ]}
                    >
                      Asignarme una habitacion
                    </Text>
                  </Pressable>
                  {ownerHasRoom && (
                    <Text
                      style={[styles.assignmentNote, { color: theme.colors.textSecondary }]}
                    >
                      Ya tienes una habitacion asignada.
                    </Text>
                  )}
                </View>
              )}
              {isSeeker && matchAssignment?.status === 'offered' && (
                <View style={styles.offerCard}>
                  <Text style={styles.offerTitle}>Propuesta de habitacion</Text>
                  <Text
                    style={[styles.offerSubtitle, { color: theme.colors.textSecondary }]}
                  >
                    {matchAssignment.room?.title ?? 'Habitacion asignada'}
                  </Text>
                  <View style={styles.offerActions}>
                    <Pressable
                      style={({ pressed }) => [
                        styles.offerButton,
                        styles.offerAccept,
                        pressed && { opacity: 0.9 },
                      ]}
                      onPress={() => respondToAssignment('accepted')}
                    >
                      <Text style={styles.offerButtonText}>Aceptar</Text>
                    </Pressable>
                    <Pressable
                      style={({ pressed }) => [
                        styles.offerButton,
                        styles.offerReject,
                        pressed && { opacity: 0.9 },
                      ]}
                      onPress={() => respondToAssignment('rejected')}
                    >
                      <Text style={styles.offerRejectText}>Rechazar</Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </>
          )}
        </GlassCard>
      )}

      {shouldShowRoommatesCard && (
        <GlassCard
          style={[
            styles.roommatesPanel,
            {
              backgroundColor: theme.colors.glassSurface,
              borderColor: theme.colors.glassBorderSoft,
            },
          ]}
        >
          <View style={styles.roommatesHeader}>
            <Text style={styles.roommatesTitle}>Companeros y habitaciones</Text>
            <View style={styles.roommatesHeaderActions}>
              <View style={styles.roommatesBadge}>
                <Text style={styles.roommatesBadgeText}>
                  {privateRooms.length}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.roommatesToggle}
                onPress={() => setIsRoommatesCollapsed((prev) => !prev)}
              >
                <Ionicons
                  name={isRoommatesCollapsed ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={theme.colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
          </View>
          {!isRoommatesCollapsed &&
            (loadingAssignments || loadingRooms ? (
              <Text style={styles.roommatesEmpty}>Cargando...</Text>
            ) : canSeeAssignees ? (
              <>
                {!hasVisibleAssignments ? (
                  <Text style={styles.roommatesEmpty}>
                    Aun no hay asignaciones.
                  </Text>
                ) : (
                  <View style={styles.roommatesList}>
                    {isOwner && ownerAssignment && (
                      <View style={styles.roommateRow}>
                        <Text style={styles.roommateName}>Tu</Text>
                        <Text style={styles.roommateRoom}>
                          {ownerAssignment.room?.title ?? 'Habitacion'}
                        </Text>
                      </View>
                    )}
                    {acceptedAssignments.map((assignment) => (
                      <View key={assignment.id} style={styles.roommateRow}>
                        <Text style={styles.roommateName}>
                          {getUserName(assignment.assignee, 'Companero')}
                        </Text>
                        <Text style={styles.roommateRoom}>
                          {assignment.room?.title ?? 'Habitacion'}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </>
            ) : privateRooms.length === 0 ? (
              <Text style={styles.roommatesEmpty}>No hay habitaciones.</Text>
            ) : (
              <View style={styles.roommatesList}>
                {privateRooms.map((room) => (
                  <View key={room.id} style={styles.roommateRow}>
                    <Text style={styles.roommateName}>
                      {renderRoomTitle(room)}
                    </Text>
                    <Text style={styles.roommateRoom}>
                      {occupiedRoomIds.has(room.id) ? 'Ocupada' : 'Disponible'}
                    </Text>
                  </View>
                ))}
              </View>
            ))}
        </GlassCard>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
        style={styles.flexFill}
      >
      <FlatList
        ref={listRef}
        data={orderedMessages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messagesList}
        showsVerticalScrollIndicator={false}
        style={styles.flexFill}
        onScroll={(event) => {
          const { contentOffset, contentSize, layoutMeasurement } =
            event.nativeEvent;
          layoutHeightRef.current = layoutMeasurement.height;
          contentHeightRef.current = contentSize.height;
          const isAtBottom =
            contentSize.height - (contentOffset.y + layoutMeasurement.height) <
            80;
          isAtBottomRef.current = isAtBottom;
          setShowScrollToEnd(
            contentSize.height > layoutMeasurement.height + 8 && !isAtBottom
          );
        }}
        scrollEventThrottle={16}
        onContentSizeChange={(_, height) => {
          contentHeightRef.current = height;
          const shouldShow =
            contentHeightRef.current > layoutHeightRef.current + 8 &&
            !isAtBottomRef.current;
          if (!didInitialScrollRef.current) {
            didInitialScrollRef.current = true;
            setTimeout(() => {
              listRef.current?.scrollToEnd({ animated: false });
            }, 0);
            setShowScrollToEnd(shouldShow);
            return;
          }
          if (isAtBottomRef.current) {
            setTimeout(() => {
              listRef.current?.scrollToEnd({ animated: true });
            }, 0);
          }
          setShowScrollToEnd(shouldShow);
        }}
        onLayout={(event) => {
          layoutHeightRef.current = event.nativeEvent.layout.height;
          if (!didInitialScrollRef.current) {
            didInitialScrollRef.current = true;
            setTimeout(() => {
              listRef.current?.scrollToEnd({ animated: false });
            }, 0);
          }
        }}
      />
      <View
        style={[
          styles.inputFooter,
          { paddingBottom: Math.max(insets.bottom, 12) },
        ]}
      >
        {showScrollToEnd && (
          <Pressable
            style={({ pressed }) => [
              styles.scrollToEndButton,
              pressed && { backgroundColor: theme.colors.glassUltraLightAlt },
            ]}
            onPress={() => listRef.current?.scrollToEnd({ animated: true })}
          >
            <BlurView
              blurType="light"
              blurAmount={14}
              reducedTransparencyFallbackColor={theme.colors.glassOverlay}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={styles.scrollToEndFill} />
            <Ionicons
              name="arrow-down"
              size={16}
              color={theme.colors.primary}
            />
            <Text style={styles.scrollToEndText}>Ir al ultimo mensaje</Text>
          </Pressable>
        )}
        {isUnmatched ? (
          <View style={styles.unmatchedNotice}>
            <Text style={styles.unmatchedNoticeText}>
              Se elimino el match, ya no puedes enviarle mas mensajes a esta persona.
            </Text>
          </View>
        ) : isPending && !isPendingRecipient ? (
          <View style={styles.unmatchedNotice}>
            <Text style={styles.unmatchedNoticeText}>
              Solicitud enviada. Espera respuesta para poder escribir.
            </Text>
          </View>
        ) : (
          <View style={styles.inputGlass}>
            <BlurView
              blurType="light"
              blurAmount={16}
              reducedTransparencyFallbackColor={theme.colors.glassOverlay}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={styles.inputGlassFill} />
            <View style={styles.inputRow}>
              <TextInput
                value={inputValue}
                onChangeText={handleInputChange}
                placeholder="Escribe un mensaje..."
                placeholderTextColor={theme.colors.textTertiary}
                style={styles.input}
              />
              <Pressable
                style={({ pressed }) => [
                  styles.sendButton,
                  pressed && { opacity: 0.9 },
                ]}
                onPress={sendMessage}
              >
                <Ionicons name="send" size={18} color="#FFFFFF" />
              </Pressable>
            </View>
          </View>
        )}
      </View>
      </KeyboardAvoidingView>

      <Modal visible={assignModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: theme.colors.glassSurface,
                borderColor: theme.colors.glassBorderSoft,
              },
            ]}
          >
            <Text style={styles.modalTitle}>
              {assignTarget === 'owner' ? 'Asignarme habitacion' : 'Asignar habitacion'}
            </Text>
            <Text style={styles.modalSubtitle}>
              Selecciona una habitacion disponible.
            </Text>
            <ScrollView style={styles.modalList}>
              {availableRooms.length === 0 ? (
                <Text style={styles.roommatesEmpty}>
                  No hay habitaciones disponibles.
                </Text>
              ) : (
                availableRooms.map((room) => {
                  const isSelected = selectedRoomId === room.id;
                  return (
                    <TouchableOpacity
                      key={room.id}
                      style={[
                        styles.modalRoomItem,
                        {
                          backgroundColor: theme.colors.surfaceLight,
                          borderColor: theme.colors.border,
                        },
                        isSelected && [
                          styles.modalRoomItemActive,
                          {
                            backgroundColor: theme.colors.primarySoft,
                            borderColor: theme.colors.primaryMuted,
                          },
                        ],
                      ]}
                      onPress={() => setSelectedRoomId(room.id)}
                    >
                      <Text
                        style={[
                          styles.modalRoomTitle,
                          isSelected && styles.modalRoomTitleActive,
                          { color: theme.colors.text },
                        ]}
                      >
                        {renderRoomTitle(room)}
                      </Text>
                      <Text style={[styles.modalRoomMeta, { color: theme.colors.textSecondary }]}>
                        {room.price_per_month} EUR/mes
                      </Text>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.modalCancel,
                  {
                    backgroundColor: theme.colors.surfaceLight,
                    borderColor: theme.colors.border,
                  },
                ]}
                onPress={() => {
                  setAssignModalVisible(false);
                  setSelectedRoomId(null);
                }}
              >
                <Text style={[styles.modalCancelText, { color: theme.colors.text }]}>
                  Cancelar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.modalConfirm,
                  !selectedRoomId && styles.modalButtonDisabled,
                ]}
                onPress={assignRoom}
                disabled={!selectedRoomId}
              >
                <Text style={styles.modalConfirmText}>
                    {assignTarget === 'owner' ? 'Asignarme' : 'Asignar'}
                  </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const statusLabel = (status: Message['status']) => {
  switch (status) {
    case 'delivered':
      return 'Entregado';
    case 'read':
      return 'Leido';
    default:
      return 'Enviado';
  }
};

const matchStatusLabel = (status: MatchStatus) => {
  switch (status) {
    case 'room_offer':
      return 'Propuesta enviada';
    case 'room_assigned':
      return 'Habitacion asignada';
    case 'room_declined':
      return 'Propuesta rechazada';
    case 'accepted':
      return 'Match';
    case 'unmatched':
      return 'Match eliminado';
    default:
      return 'Pendiente';
  }
};

const mapRealtimeMessage = (
  payload: any,
  currentUserId: string | null
): Message => {
  const isMine = payload.sender_id === currentUserId;
  return {
    id: payload.id,
    chatId: payload.chat_id,
    text: payload.body,
    createdAt: formatChatTime(payload.created_at),
    createdAtIso: payload.created_at,
    isMine,
    status: isMine ? (payload.read_at ? 'read' : 'sent') : undefined,
    readAt: payload.read_at ?? null,
  };
};

const formatChatTime = (iso?: string | null) => {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
};

const upsertMessage = (items: Message[], next: Message) => {
  const index = items.findIndex((message) => message.id === next.id);
  if (index === -1) {
    return [...items, next];
  }
  const updated = [...items];
  updated[index] = { ...updated[index], ...next };
  return updated;
};

const toTimestamp = (iso?: string | null) => {
  if (!iso) return 0;
  const value = Date.parse(iso);
  return Number.isNaN(value) ? 0 : value;
};


