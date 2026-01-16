import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  ImageBackground,
  ActivityIndicator,
  Dimensions,
  Keyboard,
  UIManager,
  findNodeHandle,
  StyleSheet,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import LinearGradient from 'react-native-linear-gradient';
import { colors, spacing } from '../theme';
import { BlurView } from '@react-native-community/blur';
import { FormSection } from '../components/FormSection';
import { Input } from '../components/Input';
import { TextArea } from '../components/TextArea';
import { roomService } from '../services/roomService';
import { roomExtrasService } from '../services/roomExtrasService';
import { roomPhotoService } from '../services/roomPhotoService';
import type {
  Flat,
  Room,
  RoomCreateRequest,
  RoomExtraDetails,
} from '../types/room';
import { RoomEditScreenStyles } from '../styles/screens';

const toISODate = (date: Date) => date.toISOString().split('T')[0];

const parseNumber = (value: string) => {
  const cleaned = value.replace(',', '.');
  const parsed = parseFloat(cleaned);
  return Number.isNaN(parsed) ? null : parsed;
};

type RoomPhotoItem = {
  uri: string;
  path?: string;
  isLocal: boolean;
  fileName?: string;
  mimeType?: string;
};

const COMMON_AREA_OPTIONS = [
  { id: 'salon', label: 'Salon' },
  { id: 'cocina', label: 'Cocina' },
  { id: 'comedor', label: 'Comedor' },
  { id: 'bano_compartido', label: 'Baño compartido' },
  { id: 'terraza', label: 'Terraza' },
  { id: 'patio', label: 'Patio' },
  { id: 'lavadero', label: 'Lavadero' },
  { id: 'pasillo', label: 'Pasillo' },
  { id: 'recibidor', label: 'Recibidor' },
  { id: 'trastero', label: 'Trastero' },
  { id: 'estudio', label: 'Sala de estudio' },
  { id: 'otros', label: 'Otros' },
];

const commonAreaLabelById = new Map(
  COMMON_AREA_OPTIONS.map((option) => [option.id, option.label])
);

export const RoomEditScreen: React.FC = () => {
  const theme = useTheme();
  const styles = useMemo(() => RoomEditScreenStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<StackNavigationProp<any>>();
  const scrollRef = useRef<ScrollView>(null);
  const focusedInputHandle = useRef<number | null>(null);
  const keyboardHeightRef = useRef(0);
  const keyboardTopRef = useRef(Dimensions.get('window').height);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollYRef = useRef(0);
  const route = useRoute();
  const routeParams = route.params as
    | {
        room?: Room;
        roomId?: string;
        flatId?: string | null;
      }
    | undefined;
  const initialRoom = routeParams?.room ?? null;
  const roomId = routeParams?.roomId ?? initialRoom?.id ?? null;
  const isCreateMode = !roomId && !initialRoom;

  const [room, setRoom] = useState<Room | null>(initialRoom);
  const [loading, setLoading] = useState(!initialRoom && Boolean(roomId));
  const [saving, setSaving] = useState(false);
  const [flatsLoading, setFlatsLoading] = useState(false);
  const [flats, setFlats] = useState<Flat[]>([]);
  const [selectedFlatId, setSelectedFlatId] = useState<string | null>(
    initialRoom?.flat_id ?? null
  );
  const [flatRooms, setFlatRooms] = useState<Room[]>([]);
  const [flatRoomExtras, setFlatRoomExtras] = useState<
    Record<string, { category?: string | null; room_type?: string | null; common_area_type?: string | null; common_area_custom?: string | null }>
  >({});

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [size, setSize] = useState('');
  const [availableFrom, setAvailableFrom] = useState(toISODate(new Date()));
  const [isAvailable, setIsAvailable] = useState(true);

  const [roomType, setRoomType] = useState<RoomExtraDetails['roomType']>();
  const [roomCategory, setRoomCategory] = useState<
    RoomExtraDetails['category'] | null
  >(null);
  const [roomCapacity, setRoomCapacity] = useState('');
  const [commonAreaType, setCommonAreaType] = useState<string | null>(null);
  const [commonAreaCustom, setCommonAreaCustom] = useState('');
  const [photos, setPhotos] = useState<RoomPhotoItem[]>([]);
  const lastAutoTitleRef = React.useRef<string>('');

  const scrollToFocusedInput = useCallback(
    (extraOffset?: number) => {
      const scrollNode = scrollRef.current;
      const target = focusedInputHandle.current;
      if (!scrollNode || !target) return;

      UIManager.measureInWindow(
        target,
        (_x, y, _width, height) => {
          const windowHeight = Dimensions.get('window').height;
          const keyboardOffset =
            keyboardHeightRef.current > 0
              ? keyboardHeightRef.current * 0.18
              : 0;
          const resolvedOffset =
            extraOffset ??
            Math.round(
              Math.min(80, Math.max(12, windowHeight * 0.035, keyboardOffset))
            );
          const resolvedKeyboardTop =
            keyboardHeightRef.current > 0
              ? keyboardTopRef.current
              : windowHeight;
          const targetBottom = y + height;
          const targetTop = y;

          if (
            keyboardHeightRef.current > 0 &&
            targetBottom > resolvedKeyboardTop - resolvedOffset
          ) {
            const delta = targetBottom - (resolvedKeyboardTop - resolvedOffset);
            scrollNode.scrollTo({
              y: Math.max(0, scrollYRef.current + delta),
              animated: true,
            });
            return;
          }

          const safeTop = insets.top + 16;
          if (targetTop < safeTop) {
            const delta = safeTop - targetTop;
            scrollNode.scrollTo({
              y: Math.max(0, scrollYRef.current - delta),
              animated: true,
            });
          }
        }
      );
    },
    [insets.top]
  );

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (event) => {
      keyboardHeightRef.current = event.endCoordinates.height;
      keyboardTopRef.current = event.endCoordinates.screenY;
      setKeyboardHeight(event.endCoordinates.height);
      requestAnimationFrame(() => scrollToFocusedInput());
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => {
      keyboardHeightRef.current = 0;
      keyboardTopRef.current = Dimensions.get('window').height;
      setKeyboardHeight(0);
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, [scrollToFocusedInput]);

  const handleInputFocus = useCallback(
    (event: any) => {
      const rawTarget = event?.target ?? event?.nativeEvent?.target;
      let target: number | null = null;

      if (typeof rawTarget === 'number') {
        target = rawTarget;
      } else if (rawTarget) {
        const handle = findNodeHandle(rawTarget as any);
        if (typeof handle === 'number') {
          target = handle;
        }
      }

      if (target != null) {
        focusedInputHandle.current = target;
      }

      setTimeout(() => scrollToFocusedInput(), 50);
    },
    [scrollToFocusedInput]
  );

  const loadRoom = useCallback(async () => {
    if (!roomId) return;
    try {
      setLoading(true);
      const data = await roomService.getMyRooms();
      const found = data.find((item) => item.id === roomId) || null;
      setRoom(found);
    } catch (error) {
      console.error('Error cargando habitacion:', error);
      Alert.alert('Error', 'No se pudo cargar la habitacion');
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  const loadFlats = useCallback(async () => {
    try {
      setFlatsLoading(true);
      const data = await roomService.getMyFlats();
      setFlats(data);
      if (data.length === 1) {
        setSelectedFlatId(data[0].id);
      }
    } catch (error) {
      console.error('Error cargando pisos:', error);
      Alert.alert('Error', 'No se pudieron cargar los pisos');
    } finally {
      setFlatsLoading(false);
    }
  }, []);

  const loadFlatRooms = useCallback(async (flatId: string) => {
    try {
      const data = await roomService.getMyRooms();
      const filtered = data.filter((item) => item.flat_id === flatId);
      setFlatRooms(filtered);
      if (filtered.length === 0) {
        setFlatRoomExtras({});
        return;
      }
      const extras = await roomExtrasService.getExtrasForRooms(
        filtered.map((item) => item.id)
      );
      setFlatRoomExtras(
        Object.fromEntries(
          extras.map((extra) => [
            extra.room_id,
            {
              category: extra.category ?? null,
              room_type: extra.room_type ?? null,
              common_area_type: extra.common_area_type ?? null,
              common_area_custom: extra.common_area_custom ?? null,
            },
          ])
        )
      );
    } catch (error) {
      console.error('Error cargando habitaciones del piso:', error);
      setFlatRooms([]);
      setFlatRoomExtras({});
    }
  }, []);

  const loadExtras = useCallback(async (targetRoom: Room) => {
    try {
      const extras = await roomExtrasService.getExtras(targetRoom.id);
      if (!extras) {
        setRoomCategory('habitacion');
        return;
      }
      setRoomCategory(
        (extras.category as RoomExtraDetails['category']) ?? 'habitacion'
      );
      setRoomType(
        (extras.room_type as RoomExtraDetails['roomType']) ?? undefined
      );
      setRoomCapacity(
        typeof extras.capacity === 'number' ? String(extras.capacity) : ''
      );
      setCommonAreaType(extras.common_area_type ?? null);
      setCommonAreaCustom(extras.common_area_custom ?? '');
      setPhotos(
        extras.photos.map((photo) => ({
          uri: photo.signedUrl,
          path: photo.path,
          isLocal: false,
        }))
      );
    } catch (error) {
      console.error('Error cargando extras de habitacion:', error);
    }
  }, []);

  useEffect(() => {
    if (!room && roomId) {
      loadRoom();
    }
  }, [room, roomId, loadRoom]);

  useEffect(() => {
    if (isCreateMode) {
      loadFlats();
    }
  }, [isCreateMode, loadFlats]);

  useEffect(() => {
    if (!isCreateMode) return;
    if (!selectedFlatId) return;
    loadFlatRooms(selectedFlatId);
  }, [isCreateMode, selectedFlatId, loadFlatRooms]);

  useEffect(() => {
    if (!room) return;
    setTitle(room.title ?? '');
    setDescription(room.description ?? '');
    setPrice(room.price_per_month ? String(room.price_per_month) : '');
    setSize(room.size_m2 ? String(room.size_m2) : '');
    setAvailableFrom(room.available_from ?? toISODate(new Date()));
    setIsAvailable(room.is_available ?? true);
    setSelectedFlatId(room.flat_id);
    loadExtras(room);
  }, [room, loadExtras]);

  useEffect(() => {
    if (!isCreateMode) return;
    if (routeParams?.flatId) {
      setSelectedFlatId(routeParams.flatId);
    }
  }, [isCreateMode, routeParams]);

  const defaultTitle = useMemo(() => {
    if (!isCreateMode) return '';
    if (!roomCategory) return '';

    let baseLabel = '';
    if (roomCategory === 'habitacion') {
      baseLabel =
        roomType === 'individual'
          ? 'Individual'
          : roomType === 'doble'
          ? 'Doble'
          : '';
    } else {
      if (commonAreaType === 'otros') {
        baseLabel = commonAreaCustom.trim();
      } else {
        baseLabel = commonAreaLabelById.get(commonAreaType ?? '') ?? '';
      }
    }

    if (!baseLabel) return '';

    const count = flatRooms.reduce((acc, item) => {
      const extras = flatRoomExtras[item.id];
      if (roomCategory === 'habitacion') {
        if (extras?.category === 'habitacion' && extras?.room_type === roomType) {
          return acc + 1;
        }
      } else {
        if (extras?.category === 'area_comun') {
          if (commonAreaType === 'otros') {
            if (
              extras?.common_area_type === 'otros' &&
              extras?.common_area_custom?.trim().toLowerCase() ===
                commonAreaCustom.trim().toLowerCase()
            ) {
              return acc + 1;
            }
          } else if (extras?.common_area_type === commonAreaType) {
            return acc + 1;
          }
        }
      }

      if (item.title?.toLowerCase().startsWith(baseLabel.toLowerCase())) {
        return acc + 1;
      }

      return acc;
    }, 0);

    return `${baseLabel} ${count + 1}`;
  }, [
    isCreateMode,
    roomCategory,
    roomType,
    commonAreaType,
    commonAreaCustom,
    flatRooms,
    flatRoomExtras,
  ]);

  useEffect(() => {
    if (!isCreateMode) return;
    const shouldAutoFill =
      title.trim() === '' || title.trim() === lastAutoTitleRef.current;
    if (!shouldAutoFill) return;
    if (!defaultTitle) return;
    lastAutoTitleRef.current = defaultTitle;
    setTitle(defaultTitle);
  }, [isCreateMode, defaultTitle, title]);

  const handleAddPhoto = async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      quality: 0.8,
      selectionLimit: 1,
    });

    if (result.didCancel || !result.assets || result.assets.length === 0) {
      return;
    }

    const asset = result.assets[0];
    if (!asset.uri) return;

    setPhotos((prev) => [
      ...prev,
      {
        uri: asset.uri as string,
        isLocal: true,
        fileName: asset.fileName,
        mimeType: asset.type,
      },
    ]);
  };

  const handleRemovePhoto = (uri: string) => {
    setPhotos((prev) => prev.filter((item) => item.uri !== uri));
  };

  const handleSave = async () => {
    const titleValue = title.trim();
    if (!titleValue) {
      Alert.alert('Error', 'El titulo es obligatorio');
      return;
    }

    let priceValue = parseNumber(price);
    if (roomCategory === 'area_comun') {
      priceValue = 0;
    } else if (priceValue == null || priceValue <= 0) {
      Alert.alert('Error', 'Introduce un precio valido');
      return;
    }

    const sizeValue = size ? parseNumber(size) : null;
    if (size && sizeValue == null) {
      Alert.alert('Error', 'Introduce un tamaño valido');
      return;
    }

    const availableValue = availableFrom.trim();
    if (!availableValue) {
      Alert.alert('Error', 'Introduce la fecha de disponibilidad');
      return;
    }

    if (!roomCategory) {
      Alert.alert('Error', 'Selecciona el tipo de publicacion');
      return;
    }

    if (roomCategory === 'area_comun') {
      if (!commonAreaType) {
        Alert.alert('Error', 'Selecciona el tipo de area comun');
        return;
      }
      if (commonAreaType === 'otros' && !commonAreaCustom.trim()) {
        Alert.alert('Error', 'Escribe el tipo de area');
        return;
      }
    }

    const flatId = isCreateMode ? selectedFlatId : room?.flat_id;
    if (!flatId) {
      Alert.alert('Error', 'Selecciona un piso para esta habitacion');
      return;
    }

    const payload: RoomCreateRequest = {
      flat_id: flatId,
      title: titleValue,
      description: description.trim() || undefined,
      price_per_month: priceValue,
      size_m2: sizeValue ?? undefined,
      is_available: isAvailable,
      available_from: availableValue,
    };

    const capacityParsed = Number.parseInt(roomCapacity, 10);
    if (roomCategory !== 'area_comun' && roomType === 'doble') {
      if (!Number.isFinite(capacityParsed) || capacityParsed < 2) {
        Alert.alert('Error', 'Indica plazas validas para la habitacion doble');
        return;
      }
    }

    try {
      setSaving(true);
      const capacityValue =
        roomCategory === 'area_comun'
          ? null
          : roomType === 'doble'
          ? capacityParsed
          : roomType === 'individual'
          ? 1
          : null;
      if (isCreateMode) {
        const createdRoom = await roomService.createRoom(payload);
        const uploaded = await Promise.all(
          photos
            .filter((photo) => photo.isLocal)
            .map((photo) =>
              roomPhotoService.uploadPhoto(
                createdRoom.id,
                photo.uri,
                photo.fileName,
                photo.mimeType
              )
            )
        );
        const photoPaths = uploaded.map((item) => item.path);
        await roomExtrasService.upsertExtras({
          room_id: createdRoom.id,
          category: roomCategory,
          room_type: roomType ?? null,
          capacity: capacityValue,
          common_area_type: commonAreaType ?? null,
          common_area_custom: commonAreaCustom.trim() || null,
          photos: photoPaths,
        });
        Alert.alert('Exito', 'Habitacion creada');
      } else if (room) {
        await roomService.updateRoom(room.id, payload);
        const existingPaths = photos
          .filter((photo) => !photo.isLocal && photo.path)
          .map((photo) => photo.path as string);
        const uploaded = await Promise.all(
          photos
            .filter((photo) => photo.isLocal)
            .map((photo) =>
              roomPhotoService.uploadPhoto(
                room.id,
                photo.uri,
                photo.fileName,
                photo.mimeType
              )
            )
        );
        const allPaths = [...existingPaths, ...uploaded.map((item) => item.path)];
        await roomExtrasService.upsertExtras({
          room_id: room.id,
          category: roomCategory,
          room_type: roomType ?? null,
          capacity: capacityValue,
          common_area_type: commonAreaType ?? null,
          common_area_custom: commonAreaCustom.trim() || null,
          photos: allPaths,
        });
        Alert.alert('Exito', 'Habitacion actualizada');
      }
      navigation.goBack();
    } catch (error) {
      console.error('Error guardando habitacion:', error);
      Alert.alert('Error', 'No se pudo guardar la habitacion');
    } finally {
      setSaving(false);
    }
  };

  if (loading || (!room && !isCreateMode)) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    );
  }

  if (isCreateMode && !roomCategory) {
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
        <View
          style={[
            styles.header,
            { paddingTop: insets.top + spacing.md, paddingBottom: spacing.md },
          ]}
        >
          <BlurView
            blurType="light"
            blurAmount={16}
            reducedTransparencyFallbackColor={colors.glassOverlay}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={styles.headerFill} />
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            Nueva publicacion
          </Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerIconButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.choiceContainer}>
          <Text style={styles.choiceTitle}>Que quieres publicar?</Text>
          <Text style={styles.choiceSubtitle}>
            Elige el tipo de espacio para continuar.
          </Text>
          <View style={styles.choiceGrid}>
            <TouchableOpacity
              style={styles.choiceCard}
              onPress={() => setRoomCategory('habitacion')}
            >
              <Ionicons name="bed-outline" size={26} color="#7C3AED" />
              <Text style={styles.choiceCardTitle}>Habitacion</Text>
              <Text style={styles.choiceCardText}>
                Una habitacion privada dentro del piso.
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.choiceCard}
              onPress={() => setRoomCategory('area_comun')}
            >
              <Ionicons name="people-outline" size={26} color="#7C3AED" />
              <Text style={styles.choiceCardTitle}>Area comun</Text>
              <Text style={styles.choiceCardText}>
                Zona compartida que quieres mostrar.
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

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
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + spacing.md, paddingBottom: spacing.md },
        ]}
      >
        <BlurView
          blurType="light"
          blurAmount={16}
          reducedTransparencyFallbackColor={colors.glassOverlay}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.headerFill} />
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          {isCreateMode ? 'Nueva habitacion' : 'Editar habitacion'}
        </Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={handleSave}
            disabled={saving}
          >
            <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.content}
        contentContainerStyle={{ paddingBottom: insets.bottom + keyboardHeight + 24 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onScroll={(event) => {
          scrollYRef.current = event.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
      >
        {isCreateMode && (
          <FormSection title="Piso" iconName="business-outline" required>
            {flatsLoading ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : flats.length === 0 ? (
              <Text style={styles.flatEmptyText}>
                Necesitas crear un piso antes de anadir habitaciones.
              </Text>
            ) : (
              <View style={styles.flatList}>
                {flats.map((flat) => {
                  const isActive = selectedFlatId === flat.id;
                  return (
                    <TouchableOpacity
                      key={flat.id}
                      style={[
                        styles.flatOption,
                        isActive && styles.flatOptionActive,
                      ]}
                      onPress={() => setSelectedFlatId(flat.id)}
                    >
                      <Text
                        style={[
                          styles.flatOptionTitle,
                          isActive && styles.flatOptionTitleActive,
                        ]}
                      >
                        {flat.address}
                      </Text>
                      <Text style={styles.flatOptionSubtitle}>
                        {flat.city}
                        {flat.district ? ` · ${flat.district}` : ''}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </FormSection>
        )}

        <FormSection
          title={
            roomCategory === 'area_comun'
              ? 'Fotos del area comun'
              : 'Fotos de la habitacion'
          }
          iconName="images-outline"
        >
          <View style={styles.photoGrid}>
            {photos.map((photo) => (
              <View key={photo.uri} style={styles.photoTile}>
                <Image source={{ uri: photo.uri }} style={styles.photo} />
                <TouchableOpacity
                  style={styles.photoRemove}
                  onPress={() => handleRemovePhoto(photo.uri)}
                >
                  <Text style={styles.photoRemoveText}>X</Text>
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity
              style={[styles.photoTile, styles.addPhotoTile]}
              onPress={handleAddPhoto}
            >
              <Text style={styles.addPhotoText}>+</Text>
              <Text style={styles.addPhotoLabel}>Agregar</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.photoHint}>
            Las fotos se suben al guardar la habitacion.
          </Text>
        </FormSection>

        {roomCategory !== 'area_comun' && (
          <FormSection title="Tipo de habitacion" iconName="home-outline">
            <View style={styles.switchRow}>
              {[
                { id: 'individual', label: 'Individual' },
                { id: 'doble', label: 'Doble' },
              ].map((option) => {
                const isActive = roomType === option.id;
                return (
                  <TouchableOpacity
                    key={option.id}
                    style={[
                      styles.switchButton,
                      isActive && styles.switchButtonActive,
                    ]}
                    onPress={() =>
                      setRoomType(option.id as RoomExtraDetails['roomType'])
                    }
                  >
                    <Text
                      style={[
                        styles.switchButtonText,
                        isActive && styles.switchButtonTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {roomType === 'doble' ? (
              <Input
                label="Plazas en la habitacion"
                value={roomCapacity}
                onChangeText={setRoomCapacity}
                onFocus={handleInputFocus}
                keyboardType="number-pad"
                required
              />
            ) : null}
          </FormSection>
        )}

        {roomCategory === 'area_comun' && (
          <FormSection title="Tipo de area comun" iconName="home-outline" required>
            <View style={styles.commonAreaGrid}>
              {COMMON_AREA_OPTIONS.map((option) => {
                const isActive = commonAreaType === option.id;
                return (
                  <TouchableOpacity
                    key={option.id}
                    style={[
                      styles.commonAreaChip,
                      isActive && styles.commonAreaChipActive,
                    ]}
                    onPress={() => setCommonAreaType(option.id)}
                  >
                    <Text
                      style={[
                        styles.commonAreaChipText,
                        isActive && styles.commonAreaChipTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {commonAreaType === 'otros' && (
              <Input
                label="Tipo de area"
                value={commonAreaCustom}
                onChangeText={setCommonAreaCustom}
                onFocus={handleInputFocus}
                placeholder="Escribe el tipo de area"
                required
              />
            )}
          </FormSection>
        )}

        <FormSection title="Detalle basico" iconName="bed-outline" required>
          <Input
            label={roomCategory === 'area_comun' ? 'Titulo del area' : 'Titulo'}
            value={title}
            onChangeText={setTitle}
            onFocus={handleInputFocus}
            required
          />
          <TextArea
            label={
              roomCategory === 'area_comun'
                ? 'Descripcion del area comun'
                : 'Descripcion'
            }
            value={description}
            onChangeText={setDescription}
            onFocus={handleInputFocus}
            maxLength={500}
            placeholder={
              roomCategory === 'area_comun'
                ? 'Describe el area comun'
                : 'Describe la habitacion'
            }
          />
          {roomCategory !== 'area_comun' && (
            <Input
              label="Precio por mes (EUR)"
              value={price}
              onChangeText={setPrice}
              onFocus={handleInputFocus}
              keyboardType="numeric"
              required
            />
          )}
          <Input
            label="Metros cuadrados"
            value={size}
            onChangeText={setSize}
            onFocus={handleInputFocus}
            keyboardType="numeric"
          />
        </FormSection>

      </ScrollView>
    </View>
  );
};

