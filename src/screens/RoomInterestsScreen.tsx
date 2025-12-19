import React, { useCallback, useContext, useMemo, useState } from 'react';
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
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { API_CONFIG } from '../config/api';
import { useTheme } from '../theme/ThemeContext';
import { chatService } from '../services/chatService';
import { roomAssignmentService } from '../services/roomAssignmentService';
import { AuthContext } from '../context/AuthContext';
import type { Match } from '../types/chat';
import type { RoomAssignment } from '../types/roomAssignment';

const getInitials = (name?: string | null) => {
  if (!name) return 'U';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((chunk) => chunk[0]?.toUpperCase())
    .join('');
};

const statusLabel = (status: RoomAssignment['status']) => {
  switch (status) {
    case 'accepted':
      return 'Asignado';
    case 'offered':
      return 'Oferta enviada';
    case 'rejected':
      return 'Rechazado';
    default:
      return 'Pendiente';
  }
};

const resolveAvatarUrl = (avatarUrl?: string | null) => {
  if (!avatarUrl) return null;
  if (avatarUrl.startsWith('http')) return avatarUrl;
  return `${API_CONFIG.SUPABASE_URL}/storage/v1/object/public/avatars/${avatarUrl}`;
};

export const RoomInterestsScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation<StackNavigationProp<any>>();
  const route = useRoute();
  const authContext = useContext(AuthContext);
  const currentUserId = authContext?.user?.id ?? '';
  const routeParams = route.params as { roomId: string; roomTitle?: string };
  const { roomId, roomTitle } = routeParams;

  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<RoomAssignment[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [actionId, setActionId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [matchesData, assignmentsResponse] = await Promise.all([
        chatService.getMatches(),
        roomAssignmentService.getAssignmentsForRoom(roomId),
      ]);
      setMatches(matchesData);
      setAssignments(assignmentsResponse.assignments);
    } catch (error) {
      console.error('Error cargando interesados:', error);
      Alert.alert('Error', 'No se pudieron cargar los interesados');
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const roomAssignments = useMemo(
    () => assignments.filter((assignment) => assignment.room_id === roomId),
    [assignments, roomId]
  );

  const hasAcceptedAssignment = roomAssignments.some(
    (assignment) => assignment.status === 'accepted'
  );

  const assignedOwner = roomAssignments.find(
    (assignment) => assignment.assignee_id === currentUserId
  );

  const matchCandidates = useMemo(() => {
    return matches.filter((match) => {
      if (!match.profileId) return false;
      if (!match.status) return true;
      return match.status !== 'pending' && match.status !== 'rejected';
    });
  }, [matches]);

  const assignmentsByMatchId = useMemo(() => {
    return new Map(
      roomAssignments
        .filter((assignment) => assignment.match_id)
        .map((assignment) => [assignment.match_id as string, assignment])
    );
  }, [roomAssignments]);

  const handleAssignToMatch = async (match: Match) => {
    if (!match.profileId) return;
    if (hasAcceptedAssignment) {
      Alert.alert('Aviso', 'La habitacion ya esta asignada.');
      return;
    }

    try {
      setActionId(match.id);
      await roomAssignmentService.createAssignment({
        match_id: match.id,
        room_id: roomId,
        assignee_id: match.profileId,
      });
      await loadData();
    } catch (error) {
      console.error('Error asignando habitacion:', error);
      Alert.alert('Error', 'No se pudo asignar la habitacion');
    } finally {
      setActionId(null);
    }
  };

  const handleAssignToOwner = async () => {
    if (!currentUserId) return;
    if (hasAcceptedAssignment) {
      Alert.alert('Aviso', 'La habitacion ya esta asignada.');
      return;
    }

    try {
      setActionId('owner');
      await roomAssignmentService.createAssignment({
        room_id: roomId,
        assignee_id: currentUserId,
      });
      await loadData();
    } catch (error) {
      console.error('Error asignando habitacion al owner:', error);
      Alert.alert('Error', 'No se pudo asignar la habitacion');
    } finally {
      setActionId(null);
    }
  };

  const handleRemoveAssignment = (assignment: RoomAssignment) => {
    Alert.alert(
      'Eliminar asignacion',
      'Esta accion liberara la habitacion. ?Quieres continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionId(assignment.id);
              await roomAssignmentService.updateAssignment({
                assignment_id: assignment.id,
                status: 'rejected',
              });
              await loadData();
            } catch (error) {
              console.error('Error eliminando asignacion:', error);
              Alert.alert('Error', 'No se pudo eliminar la asignacion');
            } finally {
              setActionId(null);
            }
          },
        },
      ]
    );
  };

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
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Asignaciones actuales</Text>
              <TouchableOpacity
                style={[
                  styles.assignOwnerButton,
                  (hasAcceptedAssignment || assignedOwner) && styles.buttonDisabled,
                ]}
                onPress={handleAssignToOwner}
                disabled={hasAcceptedAssignment || Boolean(assignedOwner) || actionId === 'owner'}
              >
                <Text style={styles.assignOwnerText}>Asignarme</Text>
              </TouchableOpacity>
            </View>

            {roomAssignments.length === 0 ? (
              <View style={styles.emptyStateInline}>
                <Ionicons name="person-outline" size={32} color="#9CA3AF" />
                <Text style={styles.emptyTitle}>Sin asignaciones</Text>
                <Text style={styles.emptySubtitle}>
                  Asigna esta habitacion a un match o a ti mismo.
                </Text>
              </View>
            ) : (
              roomAssignments.map((assignment) => {
                const user = assignment.assignee;
                const displayName =
                  user?.display_name ||
                  (assignment.assignee_id === currentUserId ? 'Propietario' : 'Usuario');
                const avatarUrl = resolveAvatarUrl(user?.avatar_url);
                return (
                  <View key={assignment.id} style={styles.assignmentCard}>
                    <View style={styles.avatar}>
                      {avatarUrl ? (
                        <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
                      ) : (
                        <Text style={styles.avatarText}>{getInitials(displayName)}</Text>
                      )}
                    </View>
                    <View style={styles.cardContent}>
                      <Text style={styles.cardTitle}>{displayName}</Text>
                      <Text style={styles.cardSubtitle}>
                        {statusLabel(assignment.status)}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.removeButton,
                        actionId === assignment.id && styles.buttonDisabled,
                      ]}
                      onPress={() => handleRemoveAssignment(assignment)}
                      disabled={actionId === assignment.id}
                    >
                      <Text style={styles.removeButtonText}>Eliminar</Text>
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Matches disponibles</Text>
            {matchCandidates.length === 0 ? (
              <View style={styles.emptyStateInline}>
                <Ionicons name="heart-outline" size={32} color="#9CA3AF" />
                <Text style={styles.emptyTitle}>Sin matches disponibles</Text>
                <Text style={styles.emptySubtitle}>
                  Cuando tengas matches apareceran aqui.
                </Text>
              </View>
            ) : (
              matchCandidates.map((match) => {
                const existingAssignment = assignmentsByMatchId.get(match.id);
                const isAssigned = Boolean(existingAssignment);
                const assignDisabled =
                  hasAcceptedAssignment || isAssigned || actionId === match.id;
                return (
                  <View key={match.id} style={styles.card}>
                    <View style={styles.avatar}>
                      {match.avatarUrl ? (
                        <Image source={{ uri: match.avatarUrl }} style={styles.avatarImage} />
                      ) : (
                        <Text style={styles.avatarText}>{getInitials(match.name)}</Text>
                      )}
                    </View>
                    <View style={styles.cardContent}>
                      <Text style={styles.cardTitle}>{match.name}</Text>
                      {existingAssignment && (
                        <Text style={styles.cardSubtitle}>
                          {statusLabel(existingAssignment.status)}
                        </Text>
                      )}
                    </View>
                    <TouchableOpacity
                      style={[styles.assignButton, assignDisabled && styles.buttonDisabled]}
                      onPress={() => handleAssignToMatch(match)}
                      disabled={assignDisabled}
                    >
                      <Text style={styles.assignButtonText}>
                        {isAssigned ? 'Asignado' : 'Asignar'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </View>
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
  content: {
    padding: 20,
    gap: 20,
  },
  section: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  emptyStateInline: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 16,
  },
  emptyTitle: {
    marginTop: 8,
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
  },
  emptySubtitle: {
    marginTop: 6,
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  assignmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
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
    fontSize: 12,
    color: '#6B7280',
  },
  assignButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#7C3AED',
  },
  assignButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  assignOwnerButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#7C3AED',
  },
  assignOwnerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  removeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#FEE2E2',
  },
  removeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#EF4444',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
