// src/screens/EditProfileScreen.tsx
import React, { useState, useEffect, useContext, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  Alert,
  Keyboard,
  TouchableOpacity,
  Switch,
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
import { launchImageLibrary } from 'react-native-image-picker';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { BlurView } from '@react-native-community/blur';
import LinearGradient from 'react-native-linear-gradient';
import { spacing } from '../theme';
import { Input } from '../components/Input';
import { TextArea } from '../components/TextArea';
import { ChipGroup } from '../components/ChipGroup';
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
  lifestyleIdByLabel,
  lifestyleLabelById,
} from '../constants/swipeFilters';
import type {
  ProfileCreateRequest,
  HousingSituation,
  ProfilePhoto,
} from '../types/profile';
import { EditProfileScreenStyles as styles } from '../styles/screens';
import { getUserName } from '../utils/name';

type LocationOption = { id: string; label: string };

const ROOMMATES_STEP = 1;
const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));
const snapToRoommatesStep = (value: number) =>
  Math.round(value / ROOMMATES_STEP) * ROOMMATES_STEP;

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
  const includeOtherOwners = filters.housingSituation === 'any';

  // Estados del formulario - solo campos que existen en la tabla profiles
  const [nombre, setNombre] = useState('');
  const [biografia, setBiografia] = useState('');
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
  const [isAlsoSeeking, setIsAlsoSeeking] = useState(false);
  const [roommatesMin, setRoommatesMin] = useState(DEFAULT_ROOMMATES_MIN);
  const [roommatesMax, setRoommatesMax] = useState(DEFAULT_ROOMMATES_MAX);
  const [cityQuery, setCityQuery] = useState('');
  const [cities, setCities] = useState<LocationOption[]>([]);
  const [isLoadingCities, setIsLoadingCities] = useState(false);
  const [selectedCities, setSelectedCities] = useState<LocationOption[]>([]);
  const [activeCityId, setActiveCityId] = useState<string | null>(null);
  const [placeQuery, setPlaceQuery] = useState('');
  const [places, setPlaces] = useState<LocationOption[]>([]);
  const [topPlaces, setTopPlaces] = useState<LocationOption[]>([]);
  const [isLoadingPlaces, setIsLoadingPlaces] = useState(false);
  const [selectedPlaces, setSelectedPlaces] = useState<LocationOption[]>([]);
  const [zonas, setZonas] = useState<string[]>([]);
  const [zoneCityById, setZoneCityById] = useState<Record<string, string>>({});
  const [profilePhotos, setProfilePhotos] = useState<ProfilePhoto[]>([]);
  const [photosLoading, setPhotosLoading] = useState(true);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [deletingProfile, setDeletingProfile] = useState(false);
  const [photoDeletingId, setPhotoDeletingId] = useState<string | null>(null);
  const primaryPhoto =
    profilePhotos.find((photo) => photo.is_primary) ?? profilePhotos[0];

  const cityOptions = useMemo(() => {
    const options = [...cities];
    selectedCities.forEach((city) => {
      if (!options.some((item) => item.id === city.id)) {
        options.unshift(city);
      }
    });
    return options;
  }, [cities, selectedCities]);
  const placeOptions = useMemo(() => {
    const base = placeQuery.trim().length >= 2 ? places : topPlaces;
    const options = [...base];
    selectedPlaces.forEach((selected) => {
      if (!options.some((item) => item.id === selected.id)) {
        options.unshift(selected);
      }
    });
    return options;
  }, [placeQuery, places, topPlaces, selectedPlaces]);
  const showCityOptions =
    cityQuery.trim().length >= 2 || selectedCities.length > 0;
  const showZonePreferences =
    situacionVivienda === 'busco_piso' || isAlsoSeeking;

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
      const savedZonas = data.preferred_zones || [];
      setZonas(savedZonas);
      setIsAlsoSeeking(
        data.housing_situation === 'offering' && data.is_seeking === true
      );
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
            if (!activeCityId) {
              setActiveCityId(uniqueCityIds[0]);
            }
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
  }, [activeCityId, handleAuthError, navigation]);

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

  useEffect(() => {
    if (situacionVivienda !== 'tengo_piso') return;
    setIsAlsoSeeking(includeOtherOwners);
  }, [includeOtherOwners, situacionVivienda]);

  useEffect(() => {
    let isActive = true;
    const query = cityQuery.trim();

    if (query.length < 2) {
      setCities([]);
      setIsLoadingCities(false);
      return;
    }

    setIsLoadingCities(true);
    const handle = setTimeout(async () => {
      try {
        const data = await locationService.getCities({ query });
        if (!isActive) return;
        setCities(
          data.map((item) => ({
            id: item.id,
            label: item.name,
          }))
        );
      } catch (error) {
        console.error('[EditProfile] Error cargando ciudades:', error);
        if (isActive) setCities([]);
      } finally {
        if (isActive) setIsLoadingCities(false);
      }
    }, 300);

    return () => {
      isActive = false;
      clearTimeout(handle);
    };
  }, [cityQuery]);

  useEffect(() => {
    let isActive = true;
    const query = placeQuery.trim();

    if (!activeCityId) {
      setPlaces([]);
      setTopPlaces([]);
      setIsLoadingPlaces(false);
      return;
    }

    setIsLoadingPlaces(true);
    const handle = setTimeout(async () => {
      try {
        if (query.length >= 2) {
          const data = await locationService.getPlaces(activeCityId, {
            query,
            limit: 50,
          });
          if (!isActive) return;
          setPlaces(
            data.map((item) => ({
              id: item.id,
              label: item.name,
            }))
          );
          setTopPlaces([]);
        } else {
          const data = await locationService.getPlaces(activeCityId, {
            top: true,
            limit: 20,
          });
          if (!isActive) return;
          setTopPlaces(
            data.map((item) => ({
              id: item.id,
              label: item.name,
            }))
          );
          setPlaces([]);
        }
      } catch (error) {
        console.error('[EditProfile] Error cargando zonas:', error);
        if (isActive) {
          setPlaces([]);
          setTopPlaces([]);
        }
      } finally {
        if (isActive) setIsLoadingPlaces(false);
      }
    }, 300);

    return () => {
      isActive = false;
      clearTimeout(handle);
    };
  }, [placeQuery, activeCityId]);

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

    const result = await launchImageLibrary({
      mediaType: 'photo',
      quality: 0.8,
    });

    if (result.didCancel || !result.assets || result.assets.length === 0) {
      return;
    }

    const asset = result.assets[0];
    if (!asset.uri) return;

    try {
      setPhotoUploading(true);
      await profilePhotoService.uploadPhoto(
        asset.uri,
        asset.fileName,
        asset.type
      );
      await loadPhotos();
    } catch (error) {
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

  const handleDeleteProfile = useCallback(() => {
    if (deletingProfile) return;
    Alert.alert(
      'Eliminar perfil',
      'Esta accion elimina tu cuenta y todos tus datos. ?Quieres continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeletingProfile(true);
              await profileService.deleteProfile();
              await authContext?.logout();
            } catch (error) {
              console.error('Error eliminando perfil:', error);
              Alert.alert('Error', 'No se pudo eliminar el perfil');
            } finally {
              setDeletingProfile(false);
            }
          },
        },
      ]
    );
  }, [authContext, deletingProfile]);

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

      const housingSituation: HousingSituation =
        situacionVivienda === 'busco_piso' ? 'seeking' : 'offering';
      const isSeeking = situacionVivienda === 'busco_piso' || isAlsoSeeking;
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
        housing_situation: housingSituation,
        is_seeking: isSeeking,
        preferred_zones: preferredZones,
        desired_roommates_min: shouldSaveRoommates ? finalRoommatesMin : undefined,
        desired_roommates_max: shouldSaveRoommates ? finalRoommatesMax : undefined,
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
        housingSituation,
        gender: filters.gender,
        budgetMin: filters.budgetMin,
        budgetMax: filters.budgetMax,
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
          <TextArea
            label="Biografia"
            value={biografia}
            onChangeText={setBiografia}
            maxLength={500}
            placeholder="Cuentanos sobre ti..."
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
          <Text style={[styles.sectionTitleMuted, { color: theme.colors.textSecondary }]}>
            Vivienda
          </Text>
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
                onPress={() => setSituacionVivienda('busco_piso')}
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
                onPress={() => setSituacionVivienda('tengo_piso')}
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
            <View style={styles.toggleRow}>
              <View style={styles.toggleCopy}>
                <Text style={styles.toggleLabel}>Tambien busco piso</Text>
                <Text style={styles.toggleHint}>
                  Activa esto si quieres aparecer como buscador de piso.
                </Text>
              </View>
              <Switch
                value={isAlsoSeeking}
                onValueChange={(value) => {
                  setIsAlsoSeeking(value);
                  if (situacionVivienda === 'tengo_piso') {
                    setFilters({
                      ...filters,
                      housingSituation: value ? 'any' : 'seeking',
                    });
                  }
                }}
                trackColor={{
                  false: theme.colors.glassBorderSoft,
                  true: theme.colors.primaryMuted,
                }}
                thumbColor={
                  isAlsoSeeking ? theme.colors.primary : theme.colors.textTertiary
                }
                ios_backgroundColor={theme.colors.glassBorderSoft}
              />
            </View>
          ) : null}
          {showZonePreferences ? (
            <>
              <Input
                label="Buscar ciudad"
                value={cityQuery}
                onChangeText={setCityQuery}
                onFocus={handleInputFocus}
                placeholder="Escribe al menos 2 letras"
                style={pillInputStyle}
              />
              {showCityOptions ? (
                <>
                  {isLoadingCities ? (
                    <Text style={styles.searchHint}>Cargando ciudades...</Text>
                  ) : null}
                  <ChipGroup
                    label="Ciudad de interes"
                    options={cityOptions}
                    selectedIds={selectedCities.map((city) => city.id)}
                    onSelect={(id) => {
                      const isSelected = selectedCities.some(
                        (item) => item.id === id
                      );
                      const picked = cityOptions.find((item) => item.id === id);
                      const nextCities = isSelected
                        ? selectedCities.filter((city) => city.id !== id)
                        : picked
                        ? [...selectedCities, picked]
                        : selectedCities;
                      const nextZones = isSelected
                        ? zonas.filter((zoneId) => zoneCityById[zoneId] !== id)
                        : zonas;
                      setSelectedCities(nextCities);
                      setZonas(nextZones);
                      if (isSelected) {
                        setSelectedPlaces((prev) =>
                          prev.filter((item) => zoneCityById[item.id] !== id)
                        );
                      }
                      if (!isSelected) {
                        setActiveCityId(id);
                      } else if (activeCityId === id) {
                        setActiveCityId(nextCities[0]?.id ?? null);
                      }
                      setCityQuery('');
                      setPlaceQuery('');
                      setPlaces([]);
                      setTopPlaces([]);
                    }}
                    multiline
                  />
                </>
              ) : (
                <Text style={styles.searchHint}>
                  Escribe para buscar ciudades.
                </Text>
              )}
              {selectedCities.length > 0 ? (
                <>
                  <Text style={styles.inlineLabel}>Ciudad para buscar zonas</Text>
                  <ChipGroup
                    options={selectedCities}
                    selectedIds={activeCityId ? [activeCityId] : []}
                    onSelect={(id) => {
                      setActiveCityId((prev) => (prev === id ? prev : id));
                      setPlaceQuery('');
                      setPlaces([]);
                      setTopPlaces([]);
                    }}
                    multiline
                  />
                  <Input
                    label="Buscar zona"
                    value={placeQuery}
                    onChangeText={setPlaceQuery}
                    onFocus={handleInputFocus}
                    placeholder="Escribe al menos 2 letras"
                    style={pillInputStyle}
                  />
                  {isLoadingPlaces ? (
                    <Text style={styles.searchHint}>Cargando zonas...</Text>
                  ) : null}
                  <ChipGroup
                    label={
                      placeQuery.trim().length >= 2 ? 'Resultados' : 'Sugerencias'
                    }
                    options={placeOptions}
                    selectedIds={zonas}
                    onSelect={(id) => {
                      if (!activeCityId) return;
                      const isSelected = zonas.includes(id);
                      const next = isSelected
                        ? zonas.filter((zona) => zona !== id)
                        : [...zonas, id];
                      setZonas(next);
                      if (isSelected) {
                        setSelectedPlaces((prev) =>
                          prev.filter((item) => item.id !== id)
                        );
                        return;
                      }
                      const selected =
                        placeOptions.find((item) => item.id === id) || null;
                      if (selected) {
                        setSelectedPlaces((prev) => {
                          if (prev.some((item) => item.id === selected.id)) {
                            return prev;
                          }
                          return [...prev, selected];
                        });
                        setZoneCityById((prev) => ({
                          ...prev,
                          [id]: activeCityId,
                        }));
                      }
                    }}
                    multiline
                  />
                </>
              ) : null}
            </>
          ) : null}
          {showZonePreferences ? (
            <View style={styles.budgetContainer}>
              <Text style={styles.label}>Companeros deseados</Text>
              <View style={styles.budgetValues}>
                <Text style={styles.budgetValue}>Min: {roommatesMin}</Text>
                <Text style={styles.budgetValue}>Max: {roommatesMax}</Text>
              </View>
              <RoommatesRange
                styles={styles}
                minValue={roommatesMin}
                maxValue={roommatesMax}
                onChangeMin={setRoommatesMin}
                onChangeMax={setRoommatesMax}
              />
            </View>
          ) : null}
          </View>
        </View>

        {/* Preferencias */}
        <View style={styles.sectionBlock}>
          <Text style={[styles.sectionTitleMuted, { color: theme.colors.textSecondary }]}>
            Preferencias
          </Text>
          <View style={[styles.sectionCard, cardStyle]}>
          <Text style={[styles.inlineLabel, { color: theme.colors.textSecondary }]}>
            Estilo de vida
          </Text>
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
          <Text style={[styles.inlineLabel, { color: theme.colors.textSecondary }]}>
            Intereses (obligatorio)
          </Text>
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
        </View>

        <View style={styles.sectionBlock}>
          <View style={[styles.sectionCard, cardStyle]}>
            <Pressable
              style={({ pressed }) => [
                styles.deleteProfileButton,
                pressed && styles.deleteProfileButtonPressed,
              ]}
              onPress={handleDeleteProfile}
              disabled={deletingProfile}
            >
              <Text style={styles.deleteProfileButtonText}>
                {deletingProfile ? 'Eliminando perfil...' : 'Eliminar perfil'}
              </Text>
            </Pressable>
          </View>
        </View>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
};

const RoommatesRange: React.FC<{
  styles: typeof styles;
  minValue: number;
  maxValue: number;
  onChangeMin: (value: number) => void;
  onChangeMax: (value: number) => void;
}> = ({ styles: screenStyles, minValue, maxValue, onChangeMin, onChangeMax }) => {
  const [trackWidth, setTrackWidth] = useState(0);
  const minValueRef = useRef(minValue);
  const maxValueRef = useRef(maxValue);

  useEffect(() => {
    minValueRef.current = minValue;
    maxValueRef.current = maxValue;
  }, [minValue, maxValue]);

  const valueToX = (value: number) => {
    if (!trackWidth) return 0;
    return ((value - ROOMMATES_MIN) / (ROOMMATES_MAX - ROOMMATES_MIN)) * trackWidth;
  };

  const xToValue = (x: number) => {
    if (!trackWidth) return ROOMMATES_MIN;
    const raw =
      ROOMMATES_MIN + (x / trackWidth) * (ROOMMATES_MAX - ROOMMATES_MIN);
    return clamp(snapToRoommatesStep(raw), ROOMMATES_MIN, ROOMMATES_MAX);
  };

  const activeThumbRef = useRef<'min' | 'max' | null>(null);

  const minX = valueToX(minValue);
  const maxX = valueToX(maxValue);

  return (
    <View
      style={screenStyles.sliderContainer}
      onLayout={(event) => {
        const width = event.nativeEvent.layout.width;
        setTrackWidth(width);
      }}
      pointerEvents="box-only"
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={(event) => {
        if (!trackWidth) return;
        const touchX = event.nativeEvent.locationX;
        const minPos = valueToX(minValueRef.current);
        const maxPos = valueToX(maxValueRef.current);
        activeThumbRef.current =
          Math.abs(touchX - minPos) <= Math.abs(touchX - maxPos) ? 'min' : 'max';
      }}
      onResponderMove={(event) => {
        if (!trackWidth || !activeThumbRef.current) return;
        const nextX = clamp(event.nativeEvent.locationX, 0, trackWidth);
        if (activeThumbRef.current === 'min') {
          const bounded = clamp(nextX, 0, valueToX(maxValueRef.current));
          onChangeMin(xToValue(bounded));
        } else {
          const bounded = clamp(nextX, valueToX(minValueRef.current), trackWidth);
          onChangeMax(xToValue(bounded));
        }
      }}
      onResponderRelease={() => {
        activeThumbRef.current = null;
      }}
      onResponderTerminate={() => {
        activeThumbRef.current = null;
      }}
    >
      <View style={screenStyles.sliderTrack} />
      <View
        style={[
          screenStyles.sliderTrackActive,
          { left: minX, width: Math.max(0, maxX - minX) },
        ]}
      />
      <View
        style={[screenStyles.sliderThumb, { left: minX - 10 }]}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      />
      <View
        style={[screenStyles.sliderThumb, { left: maxX - 10 }]}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      />
      <View style={screenStyles.sliderTicks}>
        {Array.from({ length: ROOMMATES_MAX - ROOMMATES_MIN + 1 }).map(
          (_, index) => (
            <View key={`tick-roommates-${index}`} style={screenStyles.sliderTick} />
          )
        )}
      </View>
      <View style={screenStyles.sliderLabels}>
        <Text style={screenStyles.sliderLabel}>{ROOMMATES_MIN}</Text>
        <Text style={screenStyles.sliderLabel}>
          {Math.round((ROOMMATES_MIN + ROOMMATES_MAX) / 2)}
        </Text>
        <Text style={screenStyles.sliderLabel}>{ROOMMATES_MAX}+</Text>
      </View>
    </View>
  );
};


