import React, { useEffect, useMemo, useState } from 'react';
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
import { roomExtrasService } from '../services/roomExtrasService';
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

export const RoomDetailScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation<StackNavigationProp<any>>();
  const route = useRoute();
  const { room, extras, flat } = route.params as RouteParams;
  const [roomState, setRoomState] = useState(room);
  const [extrasState, setExtrasState] = useState<RoomExtras | null>(
    extras ?? null
  );
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const refreshRoom = async () => {
      try {
        const rooms = await roomService.getRoomsByOwner(room.owner_id);
        const updated = rooms.find((item) => item.id === room.id);
        if (updated && isMounted) {
          setRoomState(updated);
        }
        const extrasData = await roomExtrasService.getExtrasForRooms([room.id]);
        if (isMounted) {
          setExtrasState(extrasData[0] ?? null);
        }
      } catch (error) {
        console.error('Error cargando detalle de habitacion:', error);
      }
    };

    void refreshRoom();
    return () => {
      isMounted = false;
    };
  }, [room.id, room.owner_id]);

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
              <Text style={styles.detailItem}>Tipo: {typeLabel}</Text>
            ) : null}
            {!isCommonArea && roomState.price_per_month != null ? (
              <Text style={styles.detailItem}>
                Precio: {roomState.price_per_month} EUR/mes
              </Text>
            ) : null}
            {!isCommonArea && (
              <Text style={styles.detailItem}>
                Estado:{' '}
                {roomState.is_available === true
                  ? 'Disponible'
                  : roomState.is_available === false
                  ? 'Ocupada'
                  : 'Sin estado'}
              </Text>
            )}
            {roomState.size_m2 != null ? (
              <Text style={styles.detailItem}>Tamano: {roomState.size_m2} m2</Text>
            ) : null}
            {roomState.description ? (
              <Text style={styles.detailItem}>{roomState.description}</Text>
            ) : null}
          </View>
        </View>

        {flat && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Piso</Text>
            <View style={styles.detailCard}>
              <Text style={styles.detailItem}>{flat.address}</Text>
              <Text style={styles.detailItem}>
                {flat.city}
                {flat.district ? ` - ${flat.district}` : ''}
              </Text>
            </View>
          </View>
        )}

        {rules.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Reglas</Text>
            <View style={styles.detailCard}>
              {rules.map((rule) => (
                <Text key={rule} style={styles.detailItem}>
                  - {rule}
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
                <Text key={service.name} style={styles.detailItem}>
                  - {service.name}
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
    gap: 8,
  },
  detailItem: {
    fontSize: 13,
    color: '#374151',
  },
});
