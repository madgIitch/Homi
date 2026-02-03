// src/screens/EditProfileScreen.tsx
import React, { useState, useEffect, useContext, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  Alert,
  Keyboard,
  TouchableOpacity,
  Pressable,
  Image,
  ImageBackground,
  ActivityIndicator,
  Dimensions,
  UIManager,
  StyleSheet,
  findNodeHandle,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Ionicons from 'react-native-vector-icons/Ionicons';
import ImageCropPicker from 'react-native-image-crop-picker';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { BlurView } from '@react-native-community/blur';
import LinearGradient from 'react-native-linear-gradient';
import { spacing } from '../theme';
import { BudgetRangeSlider } from '../components/BudgetRangeSlider';
import { Input } from '../components/Input';
import { TextArea } from '../components/TextArea';
import { ChipGroup } from '../components/ChipGroup';
import { AppearanceModeSelector } from '../components/AppearanceModeSelector';
import { LocationSelector } from '../components/LocationSelector';
import { RoommatesRangeSlider } from '../components/RoommatesRangeSlider';
import { profileService } from '../services/profileService';
import { profilePhotoService } from '../services/profilePhotoService';
import { locationService } from '../services/locationService';
import { AuthContext } from '../context/AuthContext';
import { useSwipeFilters } from '../context/SwipeFiltersContext';
import {
  ESTILO_VIDA_GROUPS,
  INTERESES_OPTIONS,
  DEFAULT_ROOMMATES_MAX,
  DEFAULT_ROOMMATES_MIN,
  ROOMMATES_MAX,
  ROOMMATES_MIN,
  BUDGET_MIN,
  BUDGET_MAX,
  BUDGET_STEP,
  DEFAULT_BUDGET_MIN,
  DEFAULT_BUDGET_MAX,
  lifestyleIdByLabel,
  lifestyleLabelById,
} from '../constants/swipeFilters';
import type {
  ProfileCreateRequest,
  ProfilePhoto,
  AppearanceMode,
} from '../types/profile';
import type { Gender } from '../types/gender';
import { EditProfileScreenStyles as styles } from '../styles/screens';
import { getUserName } from '../utils/name';
import { getAppearanceMode, mapAppearanceModeToProfile } from '../utils/appearanceMode';

type LocationOption = { id: string; label: string };

const ROOMMATES_STEP = 1;
const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));
const snapToRoommatesStep = (value: number) =>
  Math.round(value / ROOMMATES_STEP) * ROOMMATES_STEP;
const snapToBudgetStep = (value: number) =>
  Math.round(value / BUDGET_STEP) * BUDGET_STEP;
const GENDER_OPTIONS: { id: Gender; label: string }[] = [
  { id: 'male', label: 'Hombre' },
  { id: 'female', label: 'Mujer' },
  { id: 'non_binary', label: 'No binario' },
  { id: 'other', label: 'Otro' },
];
const isValidBirthDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
};

export const EditProfileScreen: React.FC = () => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<
    KeyboardAwareScrollView & {
      scrollTo: (options: { y: number; animated?: boolean }) => void;
    }
  >(null);
  const focusedInputHandle = useRef<number | null>(null);
  const keyboardHeightRef = useRef(0);
  const keyboardTopRef = useRef(Dimensions.get('window').height);
  const scrollYRef = useRef(0);
  const [, setKeyboardHeight] = useState(0);
  const pillInputStyle = {
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.glassSurface,
    borderColor: theme.colors.glassBorderSoft,
  };
  const cardStyle = {
    backgroundColor: theme.colors.glassSurface,
    borderColor: theme.colors.glassBorderSoft,
  };
  const chipBaseStyle = {
    backgroundColor: theme.colors.surfaceLight,
    borderColor: theme.colors.border,
  };
  const chipActiveStyle = {
    backgroundColor: theme.colors.primarySoft,
    borderColor: theme.colors.primary,
  };
  const chipPressedStyle = {
    backgroundColor: theme.colors.primaryTint,
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
  const headerIconPressedStyle = useMemo(
    () => ({ backgroundColor: theme.colors.glassUltraLightAlt }),
    [theme.colors.glassUltraLightAlt]
  );

  // Contexto de autenticacion
  const authContext = useContext(AuthContext);
  const handleAuthError = authContext?.handleAuthError;

  const navigation = useNavigation<StackNavigationProp<any>>();
  const { setFilters, filters } = useSwipeFilters();

  // Estados del formulario - solo campos que existen en la tabla profiles
  const [nombre, setNombre] = useState('');
  const [biografia, setBiografia] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState<Gender | ''>('');
  const [occupationType, setOccupationType] = useState<
    'universidad' | 'trabajo' | 'mixto'
  >('universidad');
  const [workplace, setWorkplace] = useState('');
  const [universidad, setUniversidad] = useState('');
  const [campoEstudio, setCampoEstudio] = useState('');
  const [intereses, setIntereses] = useState<string[]>([]);
  const [estiloVida, setEstiloVida] = useState<string[]>([]);
  const [situacionVivienda, setSituacionVivienda] = useState<
    'busco_piso' | 'tengo_piso'
  >('busco_piso');
  const [appearanceMode, setAppearanceMode] =
    useState<AppearanceMode>('owner-only');
  const [roommatesMin, setRoommatesMin] = useState(DEFAULT_ROOMMATES_MIN);
  const [roommatesMax, setRoommatesMax] = useState(DEFAULT_ROOMMATES_MAX);
  const [budgetMin, setBudgetMin] = useState(DEFAULT_BUDGET_MIN);
  const [budgetMax, setBudgetMax] = useState(DEFAULT_BUDGET_MAX);
  const [selectedCities, setSelectedCities] = useState<LocationOption[]>([]);
  const [selectedPlaces, setSelectedPlaces] = useState<LocationOption[]>([]);
  const [zonas, setZonas] = useState<string[]>([]);
  const [zoneCityById, setZoneCityById] = useState<Record<string, string>>({});
  const [profilePhotos, setProfilePhotos] = useState<ProfilePhoto[]>([]);
  const [photosLoading, setPhotosLoading] = useState(true);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoDeletingId, setPhotoDeletingId] = useState<string | null>(null);
  const [isViviendaCollapsed, setIsViviendaCollapsed] = useState(true);
  const [isEstiloVidaCollapsed, setIsEstiloVidaCollapsed] = useState(true);
  const [isInteresesCollapsed, setIsInteresesCollapsed] = useState(true);
  const primaryPhoto =
    profilePhotos.find((photo) => photo.is_primary) ?? profilePhotos[0];
  const isOwner = situacionVivienda === 'tengo_piso';
  const showZonePreferences =
    situacionVivienda === 'busco_piso' ||
    (isOwner && appearanceMode !== 'owner-only');

  const loadProfile = useCallback(async () => {
    try {
      const data = await profileService.getProfile();

      if (!data) {
        // No hay perfil aun, pantalla vacia
        return;
      }

      // Solo cargar campos que existen en la tabla profiles
      setNombre(getUserName(data, ''));
      setBiografia(data.bio || '');
      const occupationRaw = data.occupation || '';
      const normalizedOccupation = occupationRaw.toLowerCase();
      let nextType: 'universidad' | 'trabajo' | 'mixto' = 'universidad';
      let nextWorkplace = '';

      if (occupationRaw.includes('|')) {
        const [typePart, placePart] = occupationRaw.split('|');
        const typeNormalized = typePart.trim().toLowerCase();
        if (typeNormalized.includes('mixto')) {
          nextType = 'mixto';
        } else if (typeNormalized.includes('trabajo')) {
          nextType = 'trabajo';
        } else {
          nextType = 'universidad';
        }
        nextWorkplace = placePart ? placePart.trim() : '';
      } else if (normalizedOccupation.includes('mixto')) {
        nextType = 'mixto';
      } else if (
        normalizedOccupation.includes('trabajo') ||
        normalizedOccupation.includes('profesional')
      ) {
        nextType = 'trabajo';
        nextWorkplace = data.occupation || '';
      } else if (
        normalizedOccupation.includes('universidad') ||
        normalizedOccupation.includes('estudiante')
      ) {
        nextType = 'universidad';
      } else if (occupationRaw) {
        nextType = 'trabajo';
        nextWorkplace = occupationRaw;
      }

      setOccupationType(nextType);
      setWorkplace(nextWorkplace);
      setUniversidad(data.university || '');
      setCampoEstudio(data.field_of_study || '');
      const rawBirthDate = data.birth_date || '';
      setBirthDate(rawBirthDate ? rawBirthDate.split('T')[0] : '');
      setGender((data.gender as Gender) || '');
      setIntereses(data.interests || []);
      setEstiloVida(
        data.lifestyle_preferences
          ? Object.values(data.lifestyle_preferences)
              .filter((value): value is string => Boolean(value))
              .map((value) => lifestyleIdByLabel.get(value) || value)
          : []
      );
      setSituacionVivienda(
        data.housing_situation === 'seeking' ? 'busco_piso' : 'tengo_piso'
      );
      setAppearanceMode(
        getAppearanceMode(data.housing_situation, data.is_seeking)
      );
      const savedZonas = data.preferred_zones || [];
      setZonas(savedZonas);
      setRoommatesMin(
        typeof data.desired_roommates_min === 'number'
          ? data.desired_roommates_min
          : DEFAULT_ROOMMATES_MIN
      );
      setRoommatesMax(
        typeof data.desired_roommates_max === 'number'
          ? data.desired_roommates_max
          : DEFAULT_ROOMMATES_MAX
      );
      setBudgetMin(
        typeof data.budget_min === 'number'
          ? data.budget_min
          : DEFAULT_BUDGET_MIN
      );
      setBudgetMax(
        typeof data.budget_max === 'number'
          ? data.budget_max
          : DEFAULT_BUDGET_MAX
      );
      if (savedZonas.length > 0) {
        try {
          const placesData = await Promise.all(
            savedZonas.map((zoneId) => locationService.getPlaceById(zoneId))
          );
          const resolvedPlaces = placesData
            .filter((item): item is NonNullable<typeof item> => Boolean(item))
            .map((item) => ({ id: item.id, label: item.name }));
          setSelectedPlaces(resolvedPlaces);
          const zoneCityMap: Record<string, string> = {};
          placesData.forEach((item) => {
            if (item?.city_id) {
              zoneCityMap[item.id] = item.city_id;
            }
          });
          setZoneCityById(zoneCityMap);

          const uniqueCityIds = Array.from(
            new Set(
              placesData
                .map((item) => item?.city_id)
                .filter((cityId): cityId is string => Boolean(cityId))
            )
          );
          if (uniqueCityIds.length > 0) {
            const citiesData = await Promise.all(
              uniqueCityIds.map((id) => locationService.getCityById(id))
            );
            const resolvedCities = citiesData
              .filter((item): item is NonNullable<typeof item> => Boolean(item))
              .map((item) => ({ id: item.id, label: item.name }));
            setSelectedCities(resolvedCities);
          }
        } catch (error) {
          console.warn('[EditProfile] Error cargando zonas guardadas:', error);
        }
      }
    } catch (error) {
      if (handleAuthError?.(error)) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
      } else {
        console.error('Error cargando perfil:', error);
      }
    }
  }, [handleAuthError, navigation]);

  const loadPhotos = useCallback(async () => {
    try {
      setPhotosLoading(true);
      const data = await profilePhotoService.getPhotos();
      setProfilePhotos(data);
    } catch (error) {
      console.error('Error cargando fotos:', error);
    } finally {
      setPhotosLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
    loadPhotos();
  }, [loadProfile, loadPhotos]);

  const scrollToFocusedInput = useCallback(
    (extraOffset?: number) => {
      const scrollNode = scrollRef.current;
      const target = focusedInputHandle.current;
      if (!scrollNode || !target) return;

      UIManager.measureInWindow(
        target,
        (_x: number, y: number, _width: number, height: number) => {
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

  const toggleEstiloVida = useCallback((optionId: string) => {
    const groupPrefix = optionId.split('_')[0];
    setEstiloVida((prev) => {
      if (prev.includes(optionId)) {
        return prev.filter((id) => id !== optionId);
      }
      const filtered = prev.filter((id) => !id.startsWith(`${groupPrefix}_`));
      return [...filtered, optionId];
    });
  }, []);

  const handleAddPhoto = async () => {
    if (profilePhotos.length >= 10 || photoUploading) {
      Alert.alert('Limite', 'Puedes subir hasta 10 fotos.');
      return;
    }

    try {
      const image = await ImageCropPicker.openPicker({
        mediaType: 'photo',
        cropping: true,
        width: 500,
        height: 500,
        compressImageQuality: 0.8,
        cropperToolbarTitle: 'Recorta tu foto',
        cropperStatusBarColor: theme.colors.surfaceMutedAlt,
        cropperToolbarColor: theme.colors.surfaceMutedAlt,
        cropperToolbarWidgetColor: theme.colors.text,
        cropperActiveWidgetColor: theme.colors.primary,
      });
      if (!image?.path) {
        return;
      }

      setPhotoUploading(true);
      const uri = image.path.startsWith('file://')
        ? image.path
        : `file://${image.path}`;
      const fileName = image.filename || `photo-${Date.now()}.jpg`;
      const mimeType = image.mime || 'image/jpeg';
      await profilePhotoService.uploadPhoto(
        uri,
        fileName,
        mimeType
      );
      await loadPhotos();
    } catch (error) {
      if ((error as any)?.code === 'E_PICKER_CANCELLED') {
        return;
      }
      console.error('Error subiendo foto:', error);
      Alert.alert('Error', 'No se pudo subir la foto');
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleSetPrimary = async (photoId: string) => {
    try {
      await profilePhotoService.setPrimary(photoId);
      await loadPhotos();
    } catch (error) {
      console.error('Error actualizando foto principal:', error);
      Alert.alert('Error', 'No se pudo actualizar la foto principal');
    }
  };

  const handleDeletePhoto = (photoId: string) => {
    if (photoDeletingId) return;
    Alert.alert('Eliminar foto', 'Quieres eliminar esta foto?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            setPhotoDeletingId(photoId);
            await profilePhotoService.deletePhoto(photoId);
            await loadPhotos();
          } catch (error) {
            console.error('Error eliminando foto:', error);
            Alert.alert('Error', 'No se pudo eliminar la foto');
          } finally {
            setPhotoDeletingId(null);
          }
        },
      },
    ]);
  };


  const handleSave = async () => {
    setLoading(true);
    try {
      const warnings: string[] = [];
      const defaultNombre = 'Usuario';
      const defaultInteres = INTERESES_OPTIONS[0]?.id || 'musica';

      const nombreFinal = nombre.trim() ? nombre.trim() : defaultNombre;
      if (nombreFinal === defaultNombre) {
        warnings.push('Nombre: se uso "Usuario" por defecto.');
      }
      const nameParts = nombreFinal.split(' ').filter(Boolean);
      const firstName = nameParts.shift() ?? defaultNombre;
      const lastName = nameParts.join(' ') || undefined;

      const interesesFinal =
        intereses.length > 0 ? intereses : [defaultInteres];
      if (interesesFinal.length === 1 && intereses.length === 0) {
        warnings.push('Intereses: se selecciono un interes por defecto.');
      }

      const shouldSaveZones = showZonePreferences;
      if (shouldSaveZones) {
        if (selectedCities.length === 0) {
          Alert.alert('Error', 'Selecciona al menos una ciudad de interes');
          return;
        }
        if (zonas.length === 0) {
          Alert.alert('Error', 'Selecciona al menos una zona de interes');
          return;
        }
      }
      const trimmedBirthDate = birthDate.trim();
      if (trimmedBirthDate && !isValidBirthDate(trimmedBirthDate)) {
        Alert.alert('Error', 'La fecha debe tener formato YYYY-MM-DD');
        return;
      }
      const normalizedGender = gender.trim();
      if (
        normalizedGender &&
        !GENDER_OPTIONS.some((option) => option.id === normalizedGender)
      ) {
        Alert.alert('Error', 'Selecciona un genero valido');
        return;
      }

      const { housing_situation, is_seeking } = mapAppearanceModeToProfile(
        appearanceMode,
        situacionVivienda === 'tengo_piso'
      );
      const isSeeking = housing_situation === 'seeking' || is_seeking === true;
      const preferredZones = shouldSaveZones ? zonas : [];
      const nextCities = shouldSaveZones
        ? selectedCities.map((city) => city.id)
        : [];

      const scheduleId = estiloVida.find((id) => id.startsWith('schedule_'));
      const cleaningId = estiloVida.find((id) => id.startsWith('cleaning_'));
      const guestsId = estiloVida.find((id) => id.startsWith('guests_'));
      const smokingId = estiloVida.find((id) => id.startsWith('smoking_'));
      const petsId = estiloVida.find((id) => id.startsWith('pets_'));

      let finalRoommatesMin = clamp(roommatesMin, ROOMMATES_MIN, ROOMMATES_MAX);
      let finalRoommatesMax = clamp(roommatesMax, ROOMMATES_MIN, ROOMMATES_MAX);
      if (finalRoommatesMin > finalRoommatesMax) {
        const temp = finalRoommatesMin;
        finalRoommatesMin = finalRoommatesMax;
        finalRoommatesMax = temp;
      }
      const shouldSaveRoommates = isSeeking;
      let finalBudgetMin = clamp(
        snapToBudgetStep(budgetMin),
        BUDGET_MIN,
        BUDGET_MAX
      );
      let finalBudgetMax = clamp(
        snapToBudgetStep(budgetMax),
        BUDGET_MIN,
        BUDGET_MAX
      );
      if (finalBudgetMin > finalBudgetMax) {
        const temp = finalBudgetMin;
        finalBudgetMin = finalBudgetMax;
        finalBudgetMax = temp;
      }
      const shouldSaveBudget = isSeeking;

      const occupationValue =
        occupationType === 'universidad'
          ? 'Universidad'
          : occupationType === 'trabajo'
          ? workplace
            ? `Trabajo|${workplace}`
            : 'Trabajo'
          : workplace
          ? `Mixto|${workplace}`
          : 'Mixto';

      const profileData: Partial<ProfileCreateRequest> = {
        first_name: firstName,
        last_name: lastName,
        bio: biografia || undefined,
        occupation: occupationValue || undefined,
        university:
          occupationType === 'universidad' || occupationType === 'mixto'
            ? universidad || undefined
            : undefined,
        field_of_study:
          occupationType === 'universidad' || occupationType === 'mixto'
            ? campoEstudio || undefined
            : undefined,
        interests: interesesFinal,
        lifestyle_preferences: {
          schedule: scheduleId ? lifestyleLabelById.get(scheduleId) : undefined,
          cleaning: cleaningId ? lifestyleLabelById.get(cleaningId) : undefined,
          guests: guestsId ? lifestyleLabelById.get(guestsId) : undefined,
          smoking: smokingId ? lifestyleLabelById.get(smokingId) : undefined,
          pets: petsId ? lifestyleLabelById.get(petsId) : undefined,
        },
        birth_date: trimmedBirthDate || undefined,
        gender: normalizedGender || undefined,
        housing_situation,
        is_seeking,
        preferred_zones: preferredZones,
        desired_roommates_min: shouldSaveRoommates ? finalRoommatesMin : undefined,
        desired_roommates_max: shouldSaveRoommates ? finalRoommatesMax : undefined,
        budget_min: shouldSaveBudget ? finalBudgetMin : undefined,
        budget_max: shouldSaveBudget ? finalBudgetMax : undefined,
      };

      if (warnings.length > 0) {
        Alert.alert('Aviso', warnings.join('\n'));
      }

      await profileService.updateProfile(profileData);
      if (shouldSaveZones && preferredZones.length > 0) {
        try {
          const buckets: Record<string, string[]> = {};
          preferredZones.forEach((zoneId) => {
            const cityId =
              zoneCityById[zoneId] ??
              (nextCities.length === 1 ? nextCities[0] : null);
            if (!cityId) return;
            if (!buckets[cityId]) {
              buckets[cityId] = [];
            }
            buckets[cityId].push(zoneId);
          });
          await Promise.all(
            Object.entries(buckets).map(([cityId, placeIds]) =>
              locationService.trackPlaceSearches(cityId, placeIds)
            )
          );
        } catch (error) {
          console.warn('[EditProfile] Error guardando contadores:', error);
        }
      }
      await setFilters({
        housingSituation: housing_situation,
        gender: filters.gender,
        budgetMin: shouldSaveBudget ? finalBudgetMin : DEFAULT_BUDGET_MIN,
        budgetMax: shouldSaveBudget ? finalBudgetMax : DEFAULT_BUDGET_MAX,
        roommatesMin: shouldSaveRoommates
          ? finalRoommatesMin
          : DEFAULT_ROOMMATES_MIN,
        roommatesMax: shouldSaveRoommates
          ? finalRoommatesMax
          : DEFAULT_ROOMMATES_MAX,
        cities: shouldSaveZones ? nextCities : [],
        zones: preferredZones,
        lifestyle: estiloVida,
        interests: interesesFinal,
      });

      Alert.alert('Exito', 'Perfil actualizado correctamente', [
        {
          text: 'OK',
          onPress: () => {
            if (navigation.canGoBack()) {
              navigation.goBack();
              return;
            }
            navigation.navigate('Main', { screen: 'Profile' });
          },
        },
      ]);
    } catch (error) {
      console.error('Error al guardar perfil:', error);
      Alert.alert('Error', 'No se pudo actualizar el perfil');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surfaceMutedAlt }]}>
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
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + spacing.md, paddingBottom: spacing.md },
        ]}
      >
        <BlurView
          blurType="light"
          blurAmount={16}
          reducedTransparencyFallbackColor={theme.colors.glassOverlay}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={[styles.headerFill, headerFillStyle]} />
        <Pressable
          onPress={() => navigation.goBack()}
          style={({ pressed }) => pressed && headerIconPressedStyle}
        >
          <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Editar perfil
        </Text>
        <View style={styles.headerActions}>
          <Pressable
            style={({ pressed }) => [
              styles.headerIconButton,
              headerIconStyle,
              pressed && headerIconPressedStyle,
            ]}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="close" size={18} color={theme.colors.text} />
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.headerIconButton,
              headerIconStyle,
              pressed && headerIconPressedStyle,
            ]}
            onPress={handleSave}
            disabled={loading}
          >
            <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
          </Pressable>
        </View>
      </View>

        <KeyboardAwareScrollView
          ref={scrollRef}
          style={styles.content}
          contentContainerStyle={{
            paddingBottom: Math.max(insets.bottom, 24) + 24,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          enableOnAndroid={true}
          enableAutomaticScroll={true}
          extraScrollHeight={120}
          extraHeight={150}
          onScroll={(event) => {
            scrollYRef.current = event.nativeEvent.contentOffset.y;
          }}
          scrollEventThrottle={16}
        >
        <View>
            <View style={styles.profileHeader}>
              <View style={styles.avatarShell}>
                {primaryPhoto?.signedUrl ? (
                  <Image
                    source={{ uri: primaryPhoto.signedUrl }}
                    style={styles.avatarImage}
                  />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Ionicons name="person" size={28} color={theme.colors.textTertiary} />
                  </View>
                )}
                <TouchableOpacity style={styles.avatarEdit} onPress={handleAddPhoto}>
                  <Ionicons name="create-outline" size={16} color={theme.colors.text} />
                </TouchableOpacity>
              </View>
              <Text style={styles.profileHint}>Actualiza tu foto principal</Text>
            </View>

        {/* Fotos de perfil */}
        <View style={styles.sectionBlock}>
          <Text style={[styles.sectionTitleMuted, { color: theme.colors.textSecondary }]}>
            Fotos
          </Text>
          <View style={[styles.sectionCard, cardStyle]}>
          {photosLoading ? (
            <ActivityIndicator size="small" color="#7C3AED" />
          ) : (
            <View style={styles.photoGrid}>
              {profilePhotos.map((photo) => (
                <View key={photo.id} style={styles.photoTile}>
                  <TouchableOpacity
                    style={styles.photoPressArea}
                    onPress={() => {
                      if (!photo.is_primary) {
                        handleSetPrimary(photo.id);
                      }
                    }}
                  >
                    <Image
                      source={{ uri: photo.signedUrl }}
                      style={styles.photo}
                    />
                    {photo.is_primary && (
                      <View style={styles.primaryBadge}>
                        <Text style={styles.primaryBadgeText}>Principal</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeletePhoto(photo.id)}
                    disabled={photoDeletingId === photo.id}
                  >
                    <Text style={styles.deleteButtonText}>
                      {photoDeletingId === photo.id ? '...' : 'X'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
          {photoUploading && (
            <Text style={styles.photoUploadingText}>Subiendo foto...</Text>
          )}
          <Text style={styles.photoHint}>
            {profilePhotos.length}/10 fotos. Toca una foto para hacerla principal.
            Pulsa la X para eliminarla.
          </Text>
          <TouchableOpacity
            style={styles.editPhotosButton}
            onPress={handleAddPhoto}
            disabled={photoUploading}
          >
            <Ionicons
              name="images-outline"
              size={16}
              color={theme.colors.primary}
            />
            <Text style={styles.editPhotosText}>Editar fotos</Text>
          </TouchableOpacity>
          </View>
        </View>

        {/* Informacion Personal - solo campos que existen en profiles */}
        <View style={styles.sectionBlock}>
          <Text style={[styles.sectionTitleMuted, { color: theme.colors.textSecondary }]}>
            Perfil
          </Text>
          <View style={[styles.sectionCard, cardStyle]}>
          <Input
            label="Nombre"
            value={nombre}
            onChangeText={setNombre}
            required
            style={pillInputStyle}
          />
          <Input
            label="Fecha de nacimiento"
            value={birthDate}
            onChangeText={setBirthDate}
            placeholder="YYYY-MM-DD"
            keyboardType="numbers-and-punctuation"
            style={pillInputStyle}
          />
          <Text style={styles.inlineLabel}>Genero</Text>
          <ChipGroup
            options={GENDER_OPTIONS.map((option) => ({
              id: option.id,
              label: option.label,
            }))}
            selectedIds={gender ? [gender] : []}
            onSelect={(id) => setGender(id as Gender)}
            multiline
          />
          <TextArea
            label="Biografia"
            value={biografia}
            onChangeText={setBiografia}
            maxLength={500}
            placeholder="Cuéntanos sobre ti..."
          />
          <Text style={styles.switchLabel}>Ocupacion</Text>
          <View style={styles.switchRow}>
            {[
              { id: 'universidad', label: 'Universidad' },
              { id: 'trabajo', label: 'Trabajo' },
              { id: 'mixto', label: 'Mixto' },
            ].map((option) => {
              const isActive = occupationType === option.id;
              return (
                <Pressable
                  key={option.id}
                  style={({ pressed }) => [
                    styles.switchButton,
                    chipBaseStyle,
                    isActive && [styles.switchButtonActive, chipActiveStyle],
                    pressed && chipPressedStyle,
                  ]}
                  onPress={() =>
                    setOccupationType(
                      option.id as 'universidad' | 'trabajo' | 'mixto'
                    )
                  }
                >
                  <Text
                    style={[
                      styles.switchButtonText,
                      { color: isActive ? theme.colors.text : theme.colors.textMuted },
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {(occupationType === 'universidad' || occupationType === 'mixto') && (
            <>
              <Input
                label="Universidad"
                value={universidad}
                onChangeText={setUniversidad}
                style={pillInputStyle}
              />
              <Input
                label="Campo de estudio"
                value={campoEstudio}
                onChangeText={setCampoEstudio}
                style={pillInputStyle}
              />
            </>
          )}
          {(occupationType === 'trabajo' || occupationType === 'mixto') && (
            <Input
              label="Lugar de trabajo"
              value={workplace}
              onChangeText={setWorkplace}
              placeholder="Empresa / Centro"
              style={pillInputStyle}
            />
          )}
          </View>
        </View>

        {/* Vivienda */}
        <View style={styles.sectionBlock}>
          <Pressable
            style={styles.sectionHeader}
            onPress={() => setIsViviendaCollapsed((prev) => !prev)}
          >
            <Text style={[styles.sectionTitleMuted, { color: theme.colors.textSecondary }]}>
              Vivienda
            </Text>
            <Ionicons
              name={isViviendaCollapsed ? 'chevron-down' : 'chevron-up'}
              size={18}
              color={theme.colors.textSecondary}
            />
          </Pressable>
          {!isViviendaCollapsed && (
          <View style={[styles.sectionCard, cardStyle]}>
          <View style={styles.situacionContainer}>
            <Text style={styles.label}>Situacion actual</Text>
            <View style={styles.situacionButtons}>
              <Pressable
                style={({ pressed }) => [
                  styles.situacionButton,
                  chipBaseStyle,
                  situacionVivienda === 'busco_piso' &&
                    [styles.situacionButtonActive, chipActiveStyle],
                  pressed && chipPressedStyle,
                ]}
                onPress={() => {
                  setSituacionVivienda('busco_piso');
                  setAppearanceMode('seeker-only');
                }}
              >
                <Text
                  style={[
                    styles.situacionButtonText,
                    {
                      color:
                        situacionVivienda === 'busco_piso'
                          ? theme.colors.text
                          : theme.colors.textSecondary,
                    },
                  ]}
                >
                  Busco piso
                </Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.situacionButton,
                  chipBaseStyle,
                  situacionVivienda === 'tengo_piso' &&
                    [styles.situacionButtonActive, chipActiveStyle],
                  pressed && chipPressedStyle,
                ]}
                onPress={() => {
                  setSituacionVivienda('tengo_piso');
                  setAppearanceMode('owner-only');
                }}
              >
                <Text
                  style={[
                    styles.situacionButtonText,
                    {
                      color:
                        situacionVivienda === 'tengo_piso'
                          ? theme.colors.text
                          : theme.colors.textSecondary,
                    },
                  ]}
                >
                  Tengo piso
                </Text>
              </Pressable>
            </View>
          </View>
          {situacionVivienda === 'tengo_piso' ? (
            <View>
              <Text style={styles.inlineLabel}>Como quieres aparecer</Text>
              <AppearanceModeSelector
                value={appearanceMode}
                onChange={setAppearanceMode}
              />
            </View>
          ) : null}
          {showZonePreferences ? (
            <LocationSelector
              selectedCities={selectedCities}
              onCitiesChange={setSelectedCities}
              selectedZones={zonas}
              onZonesChange={setZonas}
              zoneCityById={zoneCityById}
              onZoneCityMapChange={setZoneCityById}
              selectedZoneOptions={selectedPlaces}
              onSelectedZoneOptionsChange={setSelectedPlaces}
              showCities
              showZones
              recentZonesStorageKey="@editProfile_recentZones"
            />
          ) : null}
          {showZonePreferences ? (
            <View style={styles.budgetContainer}>
              <Text style={styles.label}>Companeros deseados</Text>
              <View style={styles.budgetValues}>
                <Text style={styles.budgetValue}>Min: {roommatesMin}</Text>
                <Text style={styles.budgetValue}>Max: {roommatesMax}</Text>
              </View>
              <RoommatesRangeSlider
                styles={styles}
                minValue={roommatesMin}
                maxValue={roommatesMax}
                onChangeMin={setRoommatesMin}
                onChangeMax={setRoommatesMax}
                showTicks
                labels={[
                  `${ROOMMATES_MIN}`,
                  `${Math.round((ROOMMATES_MIN + ROOMMATES_MAX) / 2)}`,
                  `${ROOMMATES_MAX}+`,
                ]}
              />
            </View>
          ) : null}
          {showZonePreferences ? (
            <View style={styles.budgetContainer}>
              <Text style={styles.label}>Presupuesto mensual</Text>
              <View style={styles.budgetValues}>
                <Text style={styles.budgetValue}>Min: {budgetMin} EUR</Text>
                <Text style={styles.budgetValue}>Max: {budgetMax} EUR</Text>
              </View>
              <BudgetRangeSlider
                styles={styles}
                minValue={budgetMin}
                maxValue={budgetMax}
                onChangeMin={setBudgetMin}
                onChangeMax={setBudgetMax}
                labels={[
                  `${BUDGET_MIN} EUR`,
                  `${Math.round((BUDGET_MIN + BUDGET_MAX) / 2)} EUR`,
                  `${BUDGET_MAX}+ EUR`,
                ]}
              />
            </View>
          ) : null}
          </View>
          )}
        </View>

        {/* Estilo de vida */}
        <View style={styles.sectionBlock}>
          <Pressable
            style={styles.sectionHeader}
            onPress={() => setIsEstiloVidaCollapsed((prev) => !prev)}
          >
            <Text style={[styles.sectionTitleMuted, { color: theme.colors.textSecondary }]}>
              Estilo de vida
            </Text>
            <Ionicons
              name={isEstiloVidaCollapsed ? 'chevron-down' : 'chevron-up'}
              size={18}
              color={theme.colors.textSecondary}
            />
          </Pressable>
          {!isEstiloVidaCollapsed && (
          <View style={[styles.sectionCard, cardStyle]}>
          {ESTILO_VIDA_GROUPS.map((group) => (
            <View key={group.id}>
              <Text style={[styles.inlineLabel, { color: theme.colors.textSecondary }]}>
                {group.label}
              </Text>
              <View style={styles.checkGrid}>
                {group.options.map((option) => {
                  const isActive = estiloVida.includes(option.id);
                  return (
                    <Pressable
                      key={option.id}
                      style={({ pressed }) => [
                        styles.checkItem,
                        chipBaseStyle,
                        isActive && [styles.checkItemActive, chipActiveStyle],
                        pressed && chipPressedStyle,
                      ]}
                      onPress={() => toggleEstiloVida(option.id)}
                    >
                      <View
                        style={[
                          styles.checkBox,
                          {
                            borderColor: isActive
                              ? theme.colors.primary
                              : theme.colors.border,
                            backgroundColor: isActive
                              ? theme.colors.primary
                              : theme.colors.surfaceLight,
                          },
                        ]}
                      >
                        {isActive ? (
                          <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                        ) : null}
                      </View>
                      <Text style={[styles.checkLabel, { color: theme.colors.text }]}>
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
          </View>
          )}
        </View>

        {/* Intereses */}
        <View style={styles.sectionBlock}>
          <Pressable
            style={styles.sectionHeader}
            onPress={() => setIsInteresesCollapsed((prev) => !prev)}
          >
            <Text style={[styles.sectionTitleMuted, { color: theme.colors.textSecondary }]}>
              Intereses
            </Text>
            <Ionicons
              name={isInteresesCollapsed ? 'chevron-down' : 'chevron-up'}
              size={18}
              color={theme.colors.textSecondary}
            />
          </Pressable>
          {!isInteresesCollapsed && (
          <View style={[styles.sectionCard, cardStyle]}>
          <View style={styles.checkGrid}>
            {INTERESES_OPTIONS.map((option) => {
              const isActive = intereses.includes(option.id);
              return (
                <Pressable
                  key={option.id}
                  style={({ pressed }) => [
                    styles.checkItem,
                    chipBaseStyle,
                    isActive && [styles.checkItemActive, chipActiveStyle],
                    pressed && chipPressedStyle,
                  ]}
                  onPress={() =>
                    setIntereses((prev) =>
                      prev.includes(option.id)
                        ? prev.filter((i) => i !== option.id)
                        : [...prev, option.id]
                    )
                  }
                >
                  <View
                    style={[
                      styles.checkBox,
                      {
                        borderColor: isActive
                          ? theme.colors.primary
                          : theme.colors.border,
                        backgroundColor: isActive
                          ? theme.colors.primary
                          : theme.colors.surfaceLight,
                      },
                    ]}
                  >
                    {isActive ? (
                      <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                    ) : null}
                  </View>
                  <Text style={[styles.checkLabel, { color: theme.colors.text }]}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          </View>
          )}
        </View>

        </View>
      </KeyboardAwareScrollView>
    </View>
  );
};


