import React, { useCallback, useContext, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  ImageBackground,
  StyleSheet,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { BlurView } from '@react-native-community/blur';
import { API_CONFIG } from '../config/api';
import { useTheme, useThemeController } from '../theme/ThemeContext';
import { chatService } from '../services/chatService';
import { roomAssignmentService } from '../services/roomAssignmentService';
import { profilePhotoService } from '../services/profilePhotoService';
import { AuthContext } from '../context/AuthContext';
import type { Match } from '../types/chat';
import type { RoomAssignment } from '../types/roomAssignment';
import { RoomInterestsScreenStyles as styles } from '../styles/screens';
import { getUserInitials, getUserName } from '../utils/name';
import { spacing } from '../theme';

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
  const { isDark } = useThemeController();
  const navigation = useNavigation<StackNavigationProp<any>>();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const authContext = useContext(AuthContext);
  const currentUserId = authContext?.user?.id ?? '';
  const routeParams = route.params as { roomId: string; roomTitle?: string };
  const { roomId, roomTitle } = routeParams;

  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<RoomAssignment[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [actionId, setActionId] = useState<string | null>(null);
  const [photoUrlByProfileId, setPhotoUrlByProfileId] = useState<
    Record<string, string>
  >({});

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [matchesData, assignmentsResponse] = await Promise.all([
        chatService.getMatches(),
        roomAssignmentService.getAssignmentsForRoom(roomId),
      ]);
      setMatches(matchesData);
      setAssignments(assignmentsResponse.assignments);

      const uniqueIds = new Set<string>();
      matchesData.forEach((match) => {
        if (match.profileId) uniqueIds.add(match.profileId);
      });
      assignmentsResponse.assignments.forEach((assignment) => {
        if (assignment.assignee_id) uniqueIds.add(assignment.assignee_id);
      });
      if (uniqueIds.size > 0) {
        const photoEntries = await Promise.all(
          Array.from(uniqueIds).map(async (profileId) => {
            try {
              const photos =
                await profilePhotoService.getPhotosForProfile(profileId);
              const primary =
                photos.find((photo) => photo.is_primary) ?? photos[0];
              if (!primary?.signedUrl) return null;
              return [profileId, primary.signedUrl] as const;
            } catch {
              return null;
            }
          })
        );
        const next: Record<string, string> = {};
        photoEntries.forEach((entry) => {
          if (!entry) return;
          const [profileId, url] = entry;
          next[profileId] = url;
        });
        setPhotoUrlByProfileId(next);
      }
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

  const headerFillStyle = useMemo(
    () => ({ backgroundColor: theme.colors.glassUltraLightAlt }),
    [theme.colors.glassUltraLightAlt]
  );
  const headerIconStyle = useMemo(
    () => ({
      backgroundColor: theme.colors.glassSurface,
      borderColor: theme.colors.glassBorderSoft,
    }),
    [theme.colors.glassBorderSoft, theme.colors.glassSurface]
  );
  const cardStyle = useMemo(
    () => ({
      backgroundColor: isDark ? theme.colors.surfaceLight : theme.colors.glassSurface,
      borderColor: isDark ? theme.colors.border : theme.colors.glassBorderSoft,
    }),
    [isDark, theme.colors.border, theme.colors.glassBorderSoft, theme.colors.glassSurface, theme.colors.surfaceLight]
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surfaceMutedAlt }]}>
      <ImageBackground
        source={{
          uri: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1200&q=80',
        }}
        blurRadius={18}
        style={StyleSheet.absoluteFillObject}
      >
        <LinearGradient
          colors={[theme.colors.glassOverlay, theme.colors.glassWarmStrong]}
          style={StyleSheet.absoluteFillObject}
        />
      </ImageBackground>

      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + spacing.md,
            paddingBottom: spacing.md,
            borderBottomColor: theme.colors.glassBorderSoft,
          },
        ]}
      >
        <BlurView
          blurType="light"
          blurAmount={16}
          reducedTransparencyFallbackColor={theme.colors.glassOverlay}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={[styles.headerFill, headerFillStyle]} />
        <TouchableOpacity
          style={[styles.headerIconButton, headerIconStyle]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={20} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Interesados
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {roomTitle && (
        <View style={[styles.roomBanner, { backgroundColor: theme.colors.glassSurface, borderColor: theme.colors.glassBorderSoft }]}>
          <BlurView
            blurType="light"
            blurAmount={16}
            reducedTransparencyFallbackColor={theme.colors.glassOverlay}
            style={StyleSheet.absoluteFillObject}
            pointerEvents="none"
          />
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: theme.colors.glassUltraLightAlt }]} pointerEvents="none" />
          <Text style={[styles.roomLabel, { color: theme.colors.textSecondary }]}>Habitacion</Text>
          <Text style={[styles.roomTitle, { color: theme.colors.text }]}>{ roomTitle}</Text>
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
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Asignaciones actuales</Text>
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
              <View style={[styles.emptyStateInline, cardStyle]}>
                {!isDark && (
                  <>
                    <BlurView
                      blurType="light"
                      blurAmount={16}
                      reducedTransparencyFallbackColor={theme.colors.glassOverlay}
                      style={StyleSheet.absoluteFillObject}
                      pointerEvents="none"
                    />
                    <View style={[StyleSheet.absoluteFillObject, { backgroundColor: theme.colors.glassUltraLightAlt }]} pointerEvents="none" />
                  </>
                )}
                <Ionicons name="person-outline" size={32} color={theme.colors.textSecondary} />
                <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>Sin asignaciones</Text>
                <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
                  Asigna esta habitacion a un match o a ti mismo.
                </Text>
              </View>
            ) : (
              roomAssignments.map((assignment) => {
                const user = assignment.assignee;
                const displayName = getUserName(
                  user,
                  assignment.assignee_id === currentUserId ? 'Propietario' : 'Usuario'
                );
                const avatarUrl =
                  photoUrlByProfileId[assignment.assignee_id] ??
                  resolveAvatarUrl(user?.avatar_url);
                return (
                  <View key={assignment.id} style={[styles.assignmentCard, cardStyle]}>
                    {!isDark && (
                      <>
                        <BlurView
                          blurType="light"
                          blurAmount={16}
                          reducedTransparencyFallbackColor={theme.colors.glassOverlay}
                          style={StyleSheet.absoluteFillObject}
                          pointerEvents="none"
                        />
                        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: theme.colors.glassUltraLightAlt }]} pointerEvents="none" />
                      </>
                    )}
                    <View style={styles.avatar}>
                      {avatarUrl ? (
                        <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
                      ) : (
                        <Text style={styles.avatarText}>
                          {getUserInitials(user ?? { first_name: displayName }, 'U')}
                        </Text>
                      )}
                    </View>
                    <View style={styles.cardContent}>
                      <Text style={[styles.cardTitle, { color: theme.colors.text }]}>{displayName}</Text>
                      <Text style={[styles.cardSubtitle, { color: theme.colors.textSecondary }]}>
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
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Matches disponibles</Text>
            {matchCandidates.length === 0 ? (
              <View style={[styles.emptyStateInline, cardStyle]}>
                {!isDark && (
                  <>
                    <BlurView
                      blurType="light"
                      blurAmount={16}
                      reducedTransparencyFallbackColor={theme.colors.glassOverlay}
                      style={StyleSheet.absoluteFillObject}
                      pointerEvents="none"
                    />
                    <View style={[StyleSheet.absoluteFillObject, { backgroundColor: theme.colors.glassUltraLightAlt }]} pointerEvents="none" />
                  </>
                )}
                <Ionicons name="heart-outline" size={32} color={theme.colors.textSecondary} />
                <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>Sin matches disponibles</Text>
                <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
                  Cuando tengas matches apareceran aqui.
                </Text>
              </View>
            ) : (
              matchCandidates.map((match) => {
                const existingAssignment = assignmentsByMatchId.get(match.id);
                const assignmentStatus = existingAssignment?.status;
                const canReassign = assignmentStatus === 'rejected';
                const assignDisabled =
                  hasAcceptedAssignment ||
                  (!canReassign && Boolean(assignmentStatus)) ||
                  actionId === match.id;
                const assignLabel = assignmentStatus
                  ? assignmentStatus === 'rejected'
                    ? 'Reenviar'
                    : statusLabel(assignmentStatus)
                  : 'Asignar';
                const avatarUrl =
                  (match.profileId
                    ? photoUrlByProfileId[match.profileId]
                    : undefined) ?? match.avatarUrl;
                return (
                  <View key={match.id} style={[styles.card, cardStyle]}>
                    {!isDark && (
                      <>
                        <BlurView
                          blurType="light"
                          blurAmount={16}
                          reducedTransparencyFallbackColor={theme.colors.glassOverlay}
                          style={StyleSheet.absoluteFillObject}
                          pointerEvents="none"
                        />
                        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: theme.colors.glassUltraLightAlt }]} pointerEvents="none" />
                      </>
                    )}
                    <View style={styles.avatar}>
                      {avatarUrl ? (
                        <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
                      ) : (
                        <Text style={styles.avatarText}>
                          {getUserInitials({ first_name: match.name }, 'U')}
                        </Text>
                      )}
                    </View>
                    <View style={styles.cardContent}>
                      <Text style={[styles.cardTitle, { color: theme.colors.text }]}>{match.name}</Text>
                      {existingAssignment && (
                        <Text style={[styles.cardSubtitle, { color: theme.colors.textSecondary }]}>
                          {statusLabel(existingAssignment.status)}
                        </Text>
                      )}
                    </View>
                    <TouchableOpacity
                      style={[styles.assignButton, assignDisabled && styles.buttonDisabled]}
                      onPress={() => handleAssignToMatch(match)}
                      disabled={assignDisabled}
                    >
                      <Text style={styles.assignButtonText}>{assignLabel}</Text>
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
