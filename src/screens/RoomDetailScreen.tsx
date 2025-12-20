import React, { useContext, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  Dimensions,
  ScrollView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../theme/ThemeContext';
import { AuthContext } from '../context/AuthContext';
import { roomExtrasService } from '../services/roomExtrasService';
import { roomAssignmentService } from '../services/roomAssignmentService';
import { roomService } from '../services/roomService';
import type { Flat, Room, RoomExtras } from '../types/room';

type RouteParams = {
  room: Room;
  extras?: RoomExtras | null;
  flat?: Flat | null;
};

const roomTypeLabel = new Map([
  ['individual', 'Individual'],
  ['doble', 'Doble'],
]);

const commonAreaLabel = new Map([
  ['salon', 'Salon'],
  ['cocina', 'Cocina'],
  ['comedor', 'Comedor'],
  ['bano_compartido', 'Bano compartido'],
  ['terraza', 'Terraza'],
  ['patio', 'Patio'],
  ['lavadero', 'Lavadero'],
  ['pasillo', 'Pasillo'],
  ['recibidor', 'Recibidor'],
  ['trastero', 'Trastero'],
  ['estudio', 'Sala de estudio'],
]);

const SUB_RULE_TYPE_MAP = new Map<
  string,
  { ruleType: 'visitas' | 'fumar' | 'mascotas'; isNegative: boolean }
>([
  ['si, con aviso', { ruleType: 'visitas', isNegative: false }],
  ['no permitidas', { ruleType: 'visitas', isNegative: true }],
  ['si, pero sin dormir', { ruleType: 'visitas', isNegative: false }],
  ['sin problema', { ruleType: 'visitas', isNegative: false }],
  ['no fumar', { ruleType: 'fumar', isNegative: true }],
  ['solo en terraza/balcon', { ruleType: 'fumar', isNegative: false }],
  ['permitido en zonas comunes', { ruleType: 'fumar', isNegative: false }],
  ['no se permiten', { ruleType: 'mascotas', isNegative: true }],
  ['solo gatos', { ruleType: 'mascotas', isNegative: false }],
  ['solo perros', { ruleType: 'mascotas', isNegative: false }],
  ['permitidas bajo acuerdo', { ruleType: 'mascotas', isNegative: false }],
]);

const getRuleIcon = (rule: string) => {
  const normalized = rule.toLowerCase().trim();
  const subRuleMatch = SUB_RULE_TYPE_MAP.get(normalized);
  const ruleType = subRuleMatch?.ruleType ?? (() => {
    if (
      normalized.includes('ruido') ||
      normalized.includes('silencio') ||
      normalized.includes('horario flexible')
    ) {
      return 'ruido';
    }
    if (normalized.includes('visitas')) return 'visitas';
    if (normalized.includes('limpieza')) return 'limpieza';
    if (normalized.includes('fumar')) return 'fumar';
    if (normalized.includes('mascotas') || normalized.includes('mascot')) return 'mascotas';
    if (normalized.includes('cocina')) return 'cocina';
    if (normalized.includes('banos')) return 'banos';
    if (normalized.includes('basura')) return 'basura';
    if (
      normalized.includes('puerta') ||
      normalized.includes('llave') ||
      normalized.includes('seguridad')
    ) {
      return 'seguridad';
    }
    return 'otros';
  })();

  const isNegative =
    subRuleMatch?.isNegative ??
    ((ruleType === 'visitas' && normalized.includes('no permitidas')) ||
      (ruleType === 'fumar' && normalized.includes('no fumar')) ||
      (ruleType === 'mascotas' && normalized.includes('no se permiten')));

  const emojiByType: Record<string, { positive: string; negative: string }> = {
    ruido: { positive: '\u{1F4E3}', negative: '\u{1F507}' },
    visitas: {
      positive: '\u{1F465}',
      negative: '\u{1F465}\u{1F6AB}',
    },
    limpieza: {
      positive: '\u{1F9F9}',
      negative: '\u{1F6AB}\u{1F9F9}',
    },
    fumar: { positive: '\u{1F6AC}', negative: '\u{1F6AD}' },
    mascotas: {
      positive: '\u{1F43E}',
      negative: '\u{1F43E}\u{1F6AB}',
    },
    cocina: {
      positive: '\u{1F373}',
      negative: '\u{1F6AB}\u{1F373}',
    },
    banos: {
      positive: '\u{1F6BF}',
      negative: '\u{1F6AB}\u{1F6BF}',
    },
    basura: {
      positive: '\u{1F5D1}\u{FE0F}',
      negative: '\u{1F6AB}\u{1F5D1}\u{FE0F}',
    },
    seguridad: { positive: '\u{1F510}', negative: '\u{1F513}' },
    otros: { positive: '\u{2728}', negative: '\u{1F6AB}\u{2728}' },
  };

  const emoji = emojiByType[ruleType] ?? emojiByType.otros;
  return isNegative ? emoji.negative : emoji.positive;
};

const getServiceIcon = (serviceName: string) => {
  const normalized = serviceName.toLowerCase();
  if (normalized.includes('luz') || normalized.includes('electric')) {
    return '\u{26A1}';
  }
  if (normalized.includes('agua')) return '\u{1F4A7}';
  if (normalized.includes('gas')) return '\u{1F525}';
  if (normalized.includes('internet') || normalized.includes('wifi')) {
    return '\u{1F4F6}';
  }
  if (normalized.includes('limpieza')) return '\u{1F9F9}';
  if (normalized.includes('calefaccion') || normalized.includes('calefacción')) {
    return '\u{1F321}\u{FE0F}';
  }
  return '\u{1F527}';
};

export const RoomDetailScreen: React.FC = () => {
  const theme = useTheme();
  const authContext = useContext(AuthContext);
  const currentUserId = authContext?.user?.id ?? '';
  const navigation = useNavigation<StackNavigationProp<any>>();
  const route = useRoute();
  const { room, extras, flat } = route.params as RouteParams;
  const [roomState, setRoomState] = useState(room);
  const [extrasState, setExtrasState] = useState<RoomExtras | null>(
    extras ?? null
  );
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [isAssigned, setIsAssigned] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const refreshRoom = async () => {
      try {
        const isOwner = room.owner_id === currentUserId;
        const assignmentsResponse =
          await roomAssignmentService.getAssignmentsForRoom(room.id);

        if (isOwner) {
          const rooms = await roomService.getRoomsByOwner(room.owner_id);
          const updated = rooms.find((item) => item.id === room.id);
          if (updated && isMounted) {
            setRoomState(updated);
          }
        } else {
          try {
            const updated = await roomService.getRoomById(room.id);
            if (updated && isMounted) {
              setRoomState(updated);
            }
          } catch (error) {
            console.warn(
              'No se pudo refrescar la habitacion para no-dueno:',
              room.id,
              error
            );
          }
        }

        const extrasData = await roomExtrasService.getExtrasForRooms([room.id]);
        if (isMounted) {
          setExtrasState(extrasData[0] ?? null);
          const assigned =
            assignmentsResponse.assignments.some(
              (assignment) =>
                assignment.room_id === room.id && assignment.status === 'accepted'
            ) || assignmentsResponse.match_assignment?.status === 'accepted';
          setIsAssigned(assigned);
        }
      } catch (error) {
        console.error('Error cargando detalle de habitacion:', error);
      }
    };

    refreshRoom();
    return () => {
      isMounted = false;
    };
  }, [room.id, room.owner_id, currentUserId]);

  const photos = extrasState?.photos ?? [];
  const carouselWidth = Dimensions.get('window').width - 40;
  const isCommonArea = extrasState?.category === 'area_comun';

  const typeLabel = useMemo(() => {
    if (!extrasState) return null;
    if (extrasState.category === 'area_comun') {
      if (extrasState.common_area_type === 'otros') {
        return extrasState.common_area_custom ?? null;
      }
      return extrasState.common_area_type
        ? commonAreaLabel.get(extrasState.common_area_type) ??
            extrasState.common_area_type
        : null;
    }
    return extrasState.room_type
      ? roomTypeLabel.get(extrasState.room_type) ?? extrasState.room_type
      : null;
  }, [extrasState]);

  const rules = flat?.rules
    ? flat.rules
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
  const services = flat?.services ?? [];
  const statusLabel = !isCommonArea
    ? isAssigned
      ? 'Ocupada'
      : roomState.is_available === true
      ? 'Disponible'
      : roomState.is_available === false
      ? 'Ocupada'
      : 'Sin estado'
    : null;
  const statusTone =
    statusLabel === 'Disponible'
      ? styles.statusPillAvailable
      : styles.statusPillOccupied;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          {room.title}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {photos.length > 0 && (
          <View style={styles.carouselContainer}>
            <FlatList
              data={photos}
              keyExtractor={(item) => item.path}
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
                  <Image source={{ uri: item.signedUrl }} style={styles.carouselImage} />
                </View>
              )}
            />
            {photos.length > 1 && (
              <View style={styles.carouselDots}>
                {photos.map((photo, index) => (
                  <View
                    key={photo.path}
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
          <Text style={styles.sectionTitle}>Informacion</Text>
          <View style={styles.detailCard}>
            {typeLabel ? (
              <View style={styles.detailRow}>
                <View style={styles.detailLabelRow}>
                  <Ionicons name="home-outline" size={16} color="#6B7280" />
                  <Text style={styles.detailLabel}>Tipo</Text>
                </View>
                <Text style={styles.detailValue}>{typeLabel}</Text>
              </View>
            ) : null}
            {!isCommonArea && roomState.price_per_month != null ? (
              <View style={styles.detailRow}>
                <View style={styles.detailLabelRow}>
                  <Ionicons name="card-outline" size={16} color="#6B7280" />
                  <Text style={styles.detailLabel}>Precio</Text>
                </View>
                <View style={styles.pricePill}>
                  <Text style={styles.pricePillText}>
                    {roomState.price_per_month} EUR/mes
                  </Text>
                </View>
              </View>
            ) : null}
            {!isCommonArea && statusLabel ? (
              <View style={styles.detailRow}>
                <View style={styles.detailLabelRow}>
                  <Ionicons name="pulse-outline" size={16} color="#6B7280" />
                  <Text style={styles.detailLabel}>Estado</Text>
                </View>
                <View style={[styles.statusPill, statusTone]}>
                  <Text style={styles.statusPillText}>{statusLabel}</Text>
                </View>
              </View>
            ) : null}
            {roomState.size_m2 != null ? (
              <View style={styles.detailRow}>
                <View style={styles.detailLabelRow}>
                  <Ionicons name="resize-outline" size={16} color="#6B7280" />
                  <Text style={styles.detailLabel}>Tamano</Text>
                </View>
                <Text style={styles.detailValue}>{roomState.size_m2} m2</Text>
              </View>
            ) : null}
            {roomState.description ? (
              <View style={styles.detailNote}>
                <Text style={styles.detailNoteText}>{roomState.description}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {flat && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Piso</Text>
            <View style={styles.detailCard}>
              <View style={styles.detailRow}>
                <View style={styles.detailLabelRow}>
                  <Ionicons name="location-outline" size={16} color="#6B7280" />
                  <Text style={styles.detailLabel}>Direccion</Text>
                </View>
                <Text style={styles.detailValue}>{flat.address}</Text>
              </View>
              <View style={styles.detailRow}>
                <View style={styles.detailLabelRow}>
                  <Ionicons name="map-outline" size={16} color="#6B7280" />
                  <Text style={styles.detailLabel}>Zona</Text>
                </View>
                <Text style={styles.detailValue}>
                  {flat.city}
                  {flat.district ? ` - ${flat.district}` : ''}
                </Text>
              </View>
            </View>
          </View>
        )}

        {rules.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Reglas</Text>
            <View style={styles.detailCard}>
              {rules.map((rule) => (
                <Text key={rule} style={styles.detailNoteText}>
                  {getRuleIcon(rule)} {rule}
                </Text>
              ))}
            </View>
          </View>
        )}

        {services.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Servicios</Text>
            <View style={styles.detailCard}>
              {services.map((service) => (
                <Text key={service.name} style={styles.detailNoteText}>
                  {getServiceIcon(service.name)} {service.name}
                  {service.price != null ? ` (${service.price} EUR)` : ''}
                </Text>
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerSpacer: {
    width: 22,
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
    height: 320,
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
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 10,
  },
  detailCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    gap: 12,
    shadowColor: '#111827',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 2,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  detailLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'right',
    flexShrink: 1,
  },
  pricePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#EEF2FF',
  },
  pricePillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4F46E5',
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusPillAvailable: {
    backgroundColor: '#ECFDF3',
  },
  statusPillOccupied: {
    backgroundColor: '#FEF2F2',
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
  },
  detailNote: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  detailNoteText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
  },
});
