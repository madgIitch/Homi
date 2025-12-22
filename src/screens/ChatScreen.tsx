import React, { useEffect, useMemo, useRef, useState, useContext } from 'react';
import {
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Modal,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useTheme } from '../theme/ThemeContext';
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
import type { MatchStatus } from '../types/chat';
import type { Room } from '../types/room';
import type { RoomExtras } from '../types/room';
import type { RoomAssignment } from '../types/roomAssignment';

type RouteParams = {
  chatId: string;
  name: string;
  avatarUrl: string;
  profile?: Profile;
};

export const ChatScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation<StackNavigationProp<any>>();
  const route = useRoute();
  const authContext = useContext(AuthContext);
  const currentUserId = authContext?.user?.id ?? null;
  const { chatId, name, avatarUrl, profile } = route.params as RouteParams;
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [headerAvatarUrl, setHeaderAvatarUrl] = useState(avatarUrl);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [matchStatus, setMatchStatus] = useState<MatchStatus | null>(null);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [seekerId, setSeekerId] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<RoomAssignment[]>([]);
  const [matchAssignment, setMatchAssignment] = useState<RoomAssignment | null>(null);
  const [ownerRooms, setOwnerRooms] = useState<Room[]>([]);
  const [roomExtras, setRoomExtras] = useState<Record<string, RoomExtras | null>>({});
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [assignTarget, setAssignTarget] = useState<'seeker' | 'owner'>('seeker');
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [loadingRooms, setLoadingRooms] = useState(false);

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

    void loadHeaderAvatar();
    return () => {
      isMounted = false;
    };
  }, [profile?.id]);

  useEffect(() => {
    let isMounted = true;

    const loadMatchDetails = async () => {
      try {
        const chatDetail = await chatService.getChatDetails(chatId);
        if (!chatDetail || !isMounted) return;
        setMatchId(chatDetail.matchId);
        setMatchStatus(chatDetail.matchStatus ?? null);

        const match = await matchService.getMatch(chatDetail.matchId);
        if (!match || !isMounted) return;

        const owner =
          match.user_a?.housing_situation === 'offering'
            ? match.user_a_id
            : match.user_b?.housing_situation === 'offering'
            ? match.user_b_id
            : match.user_a_id;
        const seeker =
          owner === match.user_a_id ? match.user_b_id : match.user_a_id;

        setOwnerId(owner);
        setSeekerId(seeker);
      } catch (error) {
        console.error('Error cargando detalles del match:', error);
      }
    };

    void loadMatchDetails();
    return () => {
      isMounted = false;
    };
  }, [chatId]);

  useEffect(() => {
    if (!matchId) return;
    let isMounted = true;

    const loadAssignments = async () => {
      try {
        setLoadingAssignments(true);
        const data = await roomAssignmentService.getAssignments(matchId);
        if (!isMounted) return;
        setOwnerId(data.owner_id);
        setAssignments(data.assignments);
        setMatchAssignment(data.match_assignment ?? null);
      } catch (error) {
        console.error('Error cargando asignaciones:', error);
      } finally {
        if (isMounted) {
          setLoadingAssignments(false);
        }
      }
    };

    void loadAssignments();
    return () => {
      isMounted = false;
    };
  }, [matchId]);

  useEffect(() => {
    if (!ownerId) return;
    let isMounted = true;

    const loadOwnerRooms = async () => {
      try {
        setLoadingRooms(true);
        const rooms = isOwner
          ? await roomService.getMyRooms()
          : await roomService.getRoomsByOwner(ownerId);
        if (!isMounted) return;
        setOwnerRooms(rooms);
        const extras = await roomExtrasService.getExtrasForRooms(
          rooms.map((room) => room.id)
        );
        const extrasMap = Object.fromEntries(
          extras.map((extra) => [extra.room_id, extra])
        );
        setRoomExtras(extrasMap);
      } catch (error) {
        console.error('Error cargando habitaciones del owner:', error);
      } finally {
        if (isMounted) {
          setLoadingRooms(false);
        }
      }
    };

    void loadOwnerRooms();
    return () => {
      isMounted = false;
    };
  }, [ownerId, isOwner, canSeeAssignees]);

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

  const ownerHasRoom = useMemo(
    () => acceptedAssignments.some((assignment) => assignment.assignee_id === ownerId),
    [acceptedAssignments, ownerId]
  );

  const assignedRoomIds = useMemo(
    () =>
      new Set(
        acceptedAssignments.map((assignment) => assignment.room_id)
      ),
    [acceptedAssignments]
  );
  const isChatWithSeeker = profile?.housing_situation === 'seeking';

  const privateRooms = useMemo(
    () => ownerRooms.filter((room) => roomExtras[room.id]?.category !== 'area_comun'),
    [ownerRooms, roomExtras]
  );

  const availableRooms = useMemo(() => {
    if (!isOwner) return [];
    return privateRooms.filter(
      (room) => room.is_available && !assignedRoomIds.has(room.id)
    );
  }, [isOwner, privateRooms, assignedRoomIds]);

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
            setMessages((prev) =>
              prev.some((message) => message.id === next.id)
                ? prev
                : [...prev, next]
            );
            if (!next.isMine) {
              void chatService.markMessagesAsRead(chatId);
            }
          }
        )
        .subscribe();

      channelRef.current = channel;
    };

    void subscribeToMessages();

    return () => {
      isMounted = false;
      if (channelRef.current) {
        supabaseClient.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [chatId, currentUserId]);

  useEffect(() => {
    const loadMessages = async () => {
      try {
        const data = await chatService.getMessages(chatId);
        setMessages(data);
        await chatService.markMessagesAsRead(chatId);
      } catch (error) {
        console.error('Error cargando mensajes:', error);
      }
    };

    void loadMessages();
  }, [chatId]);

  const orderedMessages = useMemo(() => {
    return [...messages];
  }, [messages]);

  const sendMessage = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    setInputValue('');
    try {
      const next = await chatService.sendMessage(chatId, trimmed);
      setMessages((prev) => [...prev, next]);
    } catch (error) {
      console.error('Error enviando mensaje:', error);
    }
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
          <Text style={[styles.bubbleText, { color: '#111827' }]}>
            {item.text}
          </Text>
          <View style={styles.bubbleMeta}>
            <Text style={styles.bubbleTime}>{item.createdAt}</Text>
            {isMine && item.status && (
              <Text style={styles.bubbleStatus}>{statusLabel(item.status)}</Text>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
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
        <View style={styles.headerSpacer} />
      </View>

      {!isChatWithSeeker && (isOwner || isSeeker) && (
        <View style={styles.assignmentPanel}>
          <View style={styles.assignmentHeader}>
            <View>
              <Text style={styles.assignmentTitle}>Gestion de habitacion</Text>
              <Text style={styles.assignmentSubtitle}>
                {isOwner ? 'Asigna habitaciones y gestiona ofertas.' : 'Revisa tu estado de habitacion.'}
              </Text>
            </View>
            {matchStatus && (
              <View style={styles.assignmentStatusPill}>
                <Text style={styles.assignmentStatusText}>
                  {matchStatusLabel(matchStatus)}
                </Text>
              </View>
            )}
          </View>
          {isOwner && (
            <View style={styles.assignActions}>
              <TouchableOpacity
                style={[
                  styles.assignButton,
                  availableRooms.length === 0 && styles.assignButtonDisabled,
                ]}
                onPress={() => {
                  setAssignTarget('seeker');
                  setSelectedRoomId(null);
                  setAssignModalVisible(true);
                }}
                disabled={availableRooms.length === 0}
              >
                <Text style={styles.assignButtonText}>Asignar habitacion</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.assignButton,
                  (ownerHasRoom || availableRooms.length === 0) &&
                    styles.assignButtonDisabled,
                ]}
                onPress={() => {
                  setAssignTarget('owner');
                  setSelectedRoomId(null);
                  setAssignModalVisible(true);
                }}
                disabled={ownerHasRoom || availableRooms.length === 0}
              >
                <Text style={styles.assignButtonText}>Asignarme una habitacion</Text>
              </TouchableOpacity>
            </View>
          )}
          {isSeeker && matchAssignment?.status === 'offered' && (
            <View style={styles.offerCard}>
              <Text style={styles.offerTitle}>Propuesta de habitacion</Text>
              <Text style={styles.offerSubtitle}>
                {matchAssignment.room?.title ?? 'Habitacion asignada'}
              </Text>
              <View style={styles.offerActions}>
                <TouchableOpacity
                  style={[styles.offerButton, styles.offerAccept]}
                  onPress={() => respondToAssignment('accepted')}
                >
                  <Text style={styles.offerButtonText}>Aceptar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.offerButton, styles.offerReject]}
                  onPress={() => respondToAssignment('rejected')}
                >
                  <Text style={styles.offerRejectText}>Rechazar</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      )}

      {!isChatWithSeeker && (
        <View style={styles.roommatesPanel}>
        <View style={styles.roommatesHeader}>
          <Text style={styles.roommatesTitle}>Companeros y habitaciones</Text>
          <View style={styles.roommatesBadge}>
            <Text style={styles.roommatesBadgeText}>
              {privateRooms.length}
            </Text>
          </View>
        </View>
        {loadingAssignments || loadingRooms ? (
          <Text style={styles.roommatesEmpty}>Cargando...</Text>
        ) : canSeeAssignees ? (
          <>
            {acceptedAssignments.length === 0 ? (
              <Text style={styles.roommatesEmpty}>Aun no hay asignaciones.</Text>
            ) : (
              <View style={styles.roommatesList}>
                {acceptedAssignments.map((assignment) => (
                  <View key={assignment.id} style={styles.roommateRow}>
                    <Text style={styles.roommateName}>
                      {assignment.assignee?.display_name ?? 'Companero'}
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
                <Text style={styles.roommateName}>{renderRoomTitle(room)}</Text>
                <Text style={styles.roommateRoom}>
                  {assignedRoomIds.has(room.id) ? 'Ocupada' : 'Disponible'}
                </Text>
              </View>
            ))}
          </View>
        )}
        </View>
      )}

      <FlatList
        data={orderedMessages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messagesList}
        showsVerticalScrollIndicator={false}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 96 : 0}
      >
        <View style={styles.inputRow}>
          <TextInput
            value={inputValue}
            onChangeText={setInputValue}
            placeholder="Escribe un mensaje..."
            placeholderTextColor="#9CA3AF"
            style={styles.input}
          />
          <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
            <Ionicons name="send" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <Modal visible={assignModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
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
                        isSelected && styles.modalRoomItemActive,
                      ]}
                      onPress={() => setSelectedRoomId(room.id)}
                    >
                      <Text
                        style={[
                          styles.modalRoomTitle,
                          isSelected && styles.modalRoomTitleActive,
                        ]}
                      >
                        {renderRoomTitle(room)}
                      </Text>
                      <Text style={styles.modalRoomMeta}>
                        {room.price_per_month} EUR/mes
                      </Text>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancel]}
                onPress={() => {
                  setAssignModalVisible(false);
                  setSelectedRoomId(null);
                }}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  headerName: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerSpacer: {
    width: 22,
  },
  assignmentPanel: {
    marginHorizontal: 16,
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#111827',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 2,
    gap: 10,
  },
  assignmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  assignmentTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  assignmentSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: '#6B7280',
  },
  assignmentStatusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#EEF2FF',
  },
  assignmentStatusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4F46E5',
  },
  assignActions: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
    marginTop: 6,
  },
  assignButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#7C3AED',
  },
  assignButtonDisabled: {
    backgroundColor: '#C4B5FD',
  },
  assignButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  offerCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
    backgroundColor: '#F8FAFC',
  },
  offerTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  offerSubtitle: {
    marginTop: 6,
    fontSize: 12,
    color: '#6B7280',
  },
  offerActions: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 10,
  },
  offerButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 999,
    alignItems: 'center',
  },
  offerAccept: {
    backgroundColor: '#7C3AED',
  },
  offerReject: {
    backgroundColor: '#FEE2E2',
  },
  offerButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  offerRejectText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#EF4444',
  },
  roommatesPanel: {
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#111827',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 2,
  },
  roommatesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  roommatesTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  roommatesBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  roommatesBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7C3AED',
  },
  roommatesEmpty: {
    marginTop: 8,
    fontSize: 12,
    color: '#6B7280',
  },
  roommatesList: {
    marginTop: 10,
    gap: 6,
  },
  roommateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  roommateName: {
    fontSize: 12,
    color: '#111827',
    fontWeight: '600',
  },
  roommateRoom: {
    fontSize: 12,
    color: '#6B7280',
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 12,
  },
  messageRow: {
    flexDirection: 'row',
  },
  messageRowMine: {
    justifyContent: 'flex-end',
  },
  messageRowOther: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
  },
  bubbleMine: {
    backgroundColor: '#EDE9FE',
    borderTopRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: '#F3F4F6',
    borderTopLeftRadius: 4,
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 20,
  },
  bubbleMeta: {
    marginTop: 6,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  bubbleTime: {
    fontSize: 10,
    color: '#6B7280',
  },
  bubbleStatus: {
    fontSize: 10,
    color: '#7C3AED',
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    gap: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    fontSize: 14,
    color: '#111827',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  modalSubtitle: {
    marginTop: 6,
    fontSize: 12,
    color: '#6B7280',
  },
  modalList: {
    marginTop: 12,
  },
  modalRoomItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 10,
  },
  modalRoomItemActive: {
    borderColor: '#7C3AED',
    backgroundColor: '#F5F3FF',
  },
  modalRoomTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  modalRoomTitleActive: {
    color: '#7C3AED',
  },
  modalRoomMeta: {
    marginTop: 4,
    fontSize: 12,
    color: '#6B7280',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: 'center',
  },
  modalCancel: {
    backgroundColor: '#F3F4F6',
  },
  modalCancelText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
  },
  modalConfirmText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalConfirm: {
    backgroundColor: '#7C3AED',
  },
  modalButtonDisabled: {
    backgroundColor: '#C4B5FD',
  },
});
