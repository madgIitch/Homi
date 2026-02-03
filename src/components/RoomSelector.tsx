import React, { useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  FlatList,
  Image,
  StyleSheet,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { BlurView } from '@react-native-community/blur';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from '../theme/ThemeContext';
import { spacing, borderRadius } from '../theme';
import type { Room, RoomExtras } from '../types/room';

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

interface RoomSelectorProps {
  visible: boolean;
  onClose: () => void;
  rooms: Room[];
  extrasMap: Record<string, RoomExtras | null>;
  currentRoomId: string;
  onSelectRoom: (room: Room, extras: RoomExtras | null) => void;
}

interface RoomItemProps {
  room: Room;
  extras: RoomExtras | null;
  isSelected: boolean;
  onPress: () => void;
}

const RoomItem: React.FC<RoomItemProps> = ({ room, extras, isSelected, onPress }) => {
  const theme = useTheme();
  const isCommonArea = extras?.category === 'area_comun';
  const photo = extras?.photos?.[0]?.signedUrl;

  const typeLabel = useMemo(() => {
    if (!extras) return null;
    if (isCommonArea) {
      if (extras.common_area_type === 'otros') {
        return extras.common_area_custom ?? 'Area comun';
      }
      return commonAreaLabel.get(extras.common_area_type || '') ?? 'Area comun';
    }
    return roomTypeLabel.get(extras.room_type || '') ?? null;
  }, [extras, isCommonArea]);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.roomItem,
        {
          backgroundColor: isSelected
            ? theme.colors.primaryTint
            : theme.colors.glassSurface,
          borderColor: isSelected
            ? theme.colors.primaryMuted
            : theme.colors.glassBorderSoft,
        },
        pressed && styles.pressed,
      ]}
      onPress={onPress}
    >
      {photo ? (
        <Image source={{ uri: photo }} style={styles.roomPhoto} />
      ) : (
        <View
          style={[
            styles.roomPhotoPlaceholder,
            { backgroundColor: theme.colors.surfaceMuted },
          ]}
        >
          <Ionicons
            name={isCommonArea ? 'grid-outline' : 'bed-outline'}
            size={20}
            color={theme.colors.textTertiary}
          />
        </View>
      )}
      <View style={styles.roomInfo}>
        <Text
          style={[styles.roomTitle, { color: theme.colors.text }]}
          numberOfLines={1}
        >
          {room.title}
        </Text>
        <View style={styles.roomMeta}>
          {typeLabel && (
            <Text style={[styles.roomType, { color: theme.colors.textSecondary }]}>
              {typeLabel}
            </Text>
          )}
          {!isCommonArea && room.price_per_month != null && (
            <Text style={[styles.roomPrice, { color: theme.colors.primary }]}>
              {room.price_per_month} EUR/mes
            </Text>
          )}
        </View>
      </View>
      {isSelected && (
        <View
          style={[
            styles.selectedIndicator,
            { backgroundColor: theme.colors.primary },
          ]}
        >
          <Ionicons name="checkmark" size={14} color="#FFFFFF" />
        </View>
      )}
    </Pressable>
  );
};

export const RoomSelector: React.FC<RoomSelectorProps> = ({
  visible,
  onClose,
  rooms,
  extrasMap,
  currentRoomId,
  onSelectRoom,
}) => {
  const theme = useTheme();

  const sortedRooms = useMemo(() => {
    return [...rooms].sort((a, b) => {
      const extrasA = extrasMap[a.id];
      const extrasB = extrasMap[b.id];
      const isCommonA = extrasA?.category === 'area_comun';
      const isCommonB = extrasB?.category === 'area_comun';
      if (isCommonA !== isCommonB) {
        return isCommonA ? 1 : -1;
      }
      return a.title.localeCompare(b.title);
    });
  }, [rooms, extrasMap]);

  const handleSelect = (room: Room) => {
    const extras = extrasMap[room.id] ?? null;
    onSelectRoom(room, extras);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <LinearGradient
          colors={[theme.colors.overlayLight, theme.colors.overlay]}
          style={StyleSheet.absoluteFillObject}
        />
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <View
          style={[
            styles.container,
            {
              backgroundColor: theme.colors.glassUltraLightAlt,
              borderColor: theme.colors.glassBorderSoft,
            },
          ]}
        >
          <BlurView
            blurType="light"
            blurAmount={14}
            reducedTransparencyFallbackColor={theme.colors.glassUltraLightAlt}
            style={StyleSheet.absoluteFillObject}
          />
          <View
            style={[
              styles.containerFill,
              { backgroundColor: theme.colors.glassUltraLightAlt },
            ]}
          />
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.colors.text }]}>
              Seleccionar habitacion
            </Text>
            <Pressable
              style={({ pressed }) => [
                styles.closeButton,
                { backgroundColor: theme.colors.surfaceMuted },
                pressed && styles.pressed,
              ]}
              onPress={onClose}
            >
              <Ionicons name="close" size={18} color={theme.colors.textSecondary} />
            </Pressable>
          </View>
          <FlatList
            data={sortedRooms}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <RoomItem
                room={item}
                extras={extrasMap[item.id] ?? null}
                isSelected={item.id === currentRoomId}
                onPress={() => handleSelect(item)}
              />
            )}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  container: {
    width: '100%',
    maxHeight: '70%',
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  containerFill: {
    ...StyleSheet.absoluteFillObject,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    padding: spacing.sm,
  },
  separator: {
    height: spacing.xs,
  },
  roomItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing.sm,
  },
  roomPhoto: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
  },
  roomPhotoPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roomInfo: {
    flex: 1,
    gap: 2,
  },
  roomTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  roomMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  roomType: {
    fontSize: 12,
  },
  roomPrice: {
    fontSize: 12,
    fontWeight: '600',
  },
  selectedIndicator: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.8,
  },
});
