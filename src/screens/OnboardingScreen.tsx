
// src/screens/OnboardingScreen.tsx
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Alert,
  Image,
  ImageBackground,
  Platform,
  Pressable,
  type StyleProp,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
  useWindowDimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import LinearGradient from 'react-native-linear-gradient';
import { BlurView } from '@react-native-community/blur';
import Ionicons from 'react-native-vector-icons/Ionicons';
import ImageCropPicker from 'react-native-image-crop-picker';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { createStackNavigator, CardStyleInterpolators } from '@react-navigation/stack';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useTheme, useThemeController } from '../theme/ThemeContext';
import { Button } from '../components/Button';
import { BudgetRangeSlider } from '../components/BudgetRangeSlider';
import { Input } from '../components/Input';
import { ChipGroup } from '../components/ChipGroup';
import { AppearanceModeSelector } from '../components/AppearanceModeSelector';
import { AuthContext } from '../context/AuthContext';
import { useSwipeFilters } from '../context/SwipeFiltersContext';
import { profilePhotoService } from '../services/profilePhotoService';
import { profileService } from '../services/profileService';
import { roomAssignmentService } from '../services/roomAssignmentService';
import { roomService } from '../services/roomService';
import { locationService } from '../services/locationService';
import {
  BUDGET_MAX,
  BUDGET_MIN,
  BUDGET_STEP,
  DEFAULT_BUDGET_MAX,
  DEFAULT_BUDGET_MIN,
  DEFAULT_ROOMMATES_MAX,
  DEFAULT_ROOMMATES_MIN,
  ESTILO_VIDA_GROUPS,
  INTERESES_OPTIONS,
  lifestyleLabelById,
} from '../constants/swipeFilters';
import type { ProfileCreateRequest, ProfilePhoto, AppearanceMode } from '../types/profile';
import type { GenderPolicy } from '../types/room';
import { OnboardingScreenStyles as styles } from '../styles/screens';
import { mapAppearanceModeToProfile } from '../utils/appearanceMode';

type OnboardingScreenProps = {
  onComplete?: () => void;
};

type LocationOption = { id: string; label: string };

type OnboardingFlowContextValue = {
  loading: boolean;
  situacionVivienda: 'busco_piso' | 'tengo_piso';
  setSituacionVivienda: (value: 'busco_piso' | 'tengo_piso') => void;
  appearanceMode: AppearanceMode;
  setAppearanceMode: (value: AppearanceMode) => void;
  address: string;
  setAddress: (value: string) => void;
  cityQuery: string;
  setCityQuery: (value: string) => void;
  cities: LocationOption[];
  topCities: LocationOption[];
  isLoadingCities: boolean;
  selectedCity: LocationOption | null;
  handleSelectCity: (id: string) => void;
  placeQuery: string;
  setPlaceQuery: (value: string) => void;
  places: LocationOption[];
  topPlaces: LocationOption[];
  isLoadingPlaces: boolean;
  selectedPlaces: LocationOption[];
  selectedPlace: LocationOption | null;
  handleSelectPlace: (id: string) => void;
  budgetMin: number;
  setBudgetMin: (value: number) => void;
  budgetMax: number;
  setBudgetMax: (value: number) => void;
  intereses: string[];
  toggleInteres: (id: string) => void;
  estiloVida: string[];
  setLifestyleOption: (id: string) => void;
  isSmoker: boolean;
  hasPets: boolean;
  isSocial: boolean;
  genderPolicy: GenderPolicy;
  setGenderPolicy: (policy: GenderPolicy) => void;
  allowedPolicies: Set<GenderPolicy>;
  cardStyle: { backgroundColor: string; borderColor: string };
  glassInputStyle: { borderRadius: number; backgroundColor: string; borderColor: string };
  primaryButtonStyle: { backgroundColor: string; borderColor: string };
  secondaryButtonStyle: { backgroundColor: string; borderColor: string };
  validateLocationStep: () => boolean;
  validateBudgetStep: () => boolean;
  handleFinish: (goToEditProfile: boolean) => Promise<void>;
  joinedWithInvite: boolean;
};

const DEFAULT_INTERESES = INTERESES_OPTIONS.slice(0, 3).map((item) => item.id);
const DEFAULT_ESTILO_VIDA = [
  'schedule_flexible',
  'cleaning_normal',
  'guests_con_aviso',
  'smoking_no',
  'pets_ok',
];
const LIFESTYLE_GROUP_ICONS: Record<string, string> = {
  schedule: 'time-outline',
  cleaning: 'brush-outline',
  guests: 'people-outline',
  smoking: 'flame-outline',
  pets: 'paw-outline',
};
const GENDER_POLICY_OPTIONS: { id: GenderPolicy; label: string }[] = [
  { id: 'mixed', label: 'Mixto' },
  { id: 'men_only', label: 'Solo hombres' },
  { id: 'flinta', label: 'Solo FLINTA' },
];
const JOINED_WITH_INVITE_KEY = 'joinedWithInvite';

const SEEKING_STEPS = [
  'OnboardingRole',
  'OnboardingLocation',
  'OnboardingBudget',
  'OnboardingInterests',
  'OnboardingLifestyle',
  'OnboardingPhoto',
  'OnboardingFinish',
];
const INVITE_STEPS = [
  'OnboardingRole',
  'OnboardingInterests',
  'OnboardingLifestyle',
  'OnboardingPhoto',
  'OnboardingFinish',
];
const OFFERING_STEPS = [
  'OnboardingRole',
  'OnboardingAppearance',
  'OnboardingLocation',
  'OnboardingInterests',
  'OnboardingLifestyle',
  'OnboardingPhoto',
  'OnboardingFinish',
];

const OnboardingFlowContext = createContext<OnboardingFlowContextValue | null>(
  null
);

const useOnboardingFlow = () => {
  const context = useContext(OnboardingFlowContext);
  if (!context) {
    throw new Error('useOnboardingFlow must be used within provider');
  }
  return context;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));
const snapToBudgetStep = (value: number) =>
  Math.round(value / BUDGET_STEP) * BUDGET_STEP;

const OnboardingFlowProvider: React.FC<
  React.PropsWithChildren<OnboardingScreenProps>
> = ({ children, onComplete }) => {
  const theme = useTheme();
  const navigation = useNavigation<StackNavigationProp<any>>();
  const authContext = useContext(AuthContext);
  const { filters, setFilters } = useSwipeFilters();
  const [loading, setLoading] = useState(false);
  const [situacionVivienda, setSituacionVivienda] = useState<
    'busco_piso' | 'tengo_piso'
  >('busco_piso');
  const [appearanceMode, setAppearanceMode] =
    useState<AppearanceMode>('owner-only');
  const [intereses, setIntereses] = useState<string[]>(
    DEFAULT_INTERESES.length > 0 ? DEFAULT_INTERESES : ['musica']
  );
  const [estiloVida, setEstiloVida] = useState<string[]>(DEFAULT_ESTILO_VIDA);
  const [address, setAddress] = useState('');
  const [cityQuery, setCityQuery] = useState('');
  const [cities, setCities] = useState<LocationOption[]>([]);
  const [topCities, setTopCities] = useState<LocationOption[]>([]);
  const [isLoadingCities, setIsLoadingCities] = useState(false);
  const [selectedCity, setSelectedCity] = useState<LocationOption | null>(null);
  const [placeQuery, setPlaceQuery] = useState('');
  const [places, setPlaces] = useState<LocationOption[]>([]);
  const [topPlaces, setTopPlaces] = useState<LocationOption[]>([]);
  const [isLoadingPlaces, setIsLoadingPlaces] = useState(false);
  const [selectedPlaces, setSelectedPlaces] = useState<LocationOption[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<LocationOption | null>(null);
  const [budgetMin, setBudgetMin] = useState(DEFAULT_BUDGET_MIN);
  const [budgetMax, setBudgetMax] = useState(DEFAULT_BUDGET_MAX);
  const [genderPolicy, setGenderPolicy] = useState<GenderPolicy>('mixed');
  const [joinedWithInvite, setJoinedWithInvite] = useState(false);

  const cardStyle = useMemo(
    () => ({
      backgroundColor: theme.colors.glassSurface,
      borderColor: theme.colors.glassBorderSoft,
    }),
    [theme.colors.glassBorderSoft, theme.colors.glassSurface]
  );
  const glassInputStyle = useMemo(
    () => ({
      borderRadius: theme.borderRadius.lg,
      backgroundColor: theme.colors.glassSurface,
      borderColor: theme.colors.glassBorderSoft,
    }),
    [theme.borderRadius.lg, theme.colors.glassBorderSoft, theme.colors.glassSurface]
  );
  const primaryButtonStyle = useMemo(
    () => ({
      backgroundColor: theme.colors.text,
      borderColor: theme.colors.text,
    }),
    [theme.colors.text]
  );
  const secondaryButtonStyle = useMemo(
    () => ({
      backgroundColor: theme.colors.glassSurface,
      borderColor: theme.colors.glassBorderSoft,
    }),
    [theme.colors.glassBorderSoft, theme.colors.glassSurface]
  );
  const userGender = authContext?.user?.gender ?? null;
  const allowedPolicies = useMemo(() => {
    if (userGender === 'male') {
      return new Set<GenderPolicy>(['men_only', 'mixed']);
    }
    if (!userGender || userGender === 'undisclosed') {
      return new Set<GenderPolicy>(['men_only', 'mixed', 'flinta']);
    }
    return new Set<GenderPolicy>(['flinta', 'mixed']);
  }, [userGender]);

  const cityOptions = useMemo(() => {
    const base = cityQuery.trim().length >= 2 ? cities : topCities;
    const options = [...base];
    if (selectedCity && !options.some((item) => item.id === selectedCity.id)) {
      options.unshift(selectedCity);
    }
    return options;
  }, [cityQuery, cities, topCities, selectedCity]);
  const placeOptions = useMemo(() => {
    const base = placeQuery.trim().length >= 2 ? places : topPlaces;
    const options = [...base];
    const selected =
      situacionVivienda === 'busco_piso'
        ? selectedPlaces
        : selectedPlace
        ? [selectedPlace]
        : [];
    selected.forEach((item) => {
      if (!options.some((option) => option.id === item.id)) {
        options.unshift(item);
      }
    });
    return options;
  }, [
    placeQuery,
    places,
    selectedPlace,
    selectedPlaces,
    situacionVivienda,
    topPlaces,
  ]);
  const isSmoker = estiloVida.includes('smoking_si');
  const hasPets = estiloVida.includes('pets_si');
  const isSocial = estiloVida.includes('guests_frecuentes');

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
        setTopCities([]);
      } catch (error) {
        console.error('[Onboarding] Error cargando ciudades:', error);
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

    const loadTopCities = async () => {
      setIsLoadingCities(true);
      try {
        const data = await locationService.getCities({ top: true, limit: 20 });
        if (!isActive) return;
        setTopCities(
          data.map((item) => ({
            id: item.id,
            label: item.name,
          }))
        );
      } catch (error) {
        console.error('[Onboarding] Error cargando ciudades top:', error);
        if (isActive) setTopCities([]);
      } finally {
        if (isActive) setIsLoadingCities(false);
      }
    };

    if (cityQuery.trim().length < 2) {
      loadTopCities();
    }

    return () => {
      isActive = false;
    };
  }, [cityQuery]);

  useEffect(() => {
    let isActive = true;
    const loadInviteFlag = async () => {
      try {
        const flag = await AsyncStorage.getItem(JOINED_WITH_INVITE_KEY);
        if (!isActive) return;
        const joined = flag === '1';
        setJoinedWithInvite(joined);
        if (joined) {
          setSituacionVivienda('busco_piso');
        }
      } catch (error) {
        console.warn('[Onboarding] Error leyendo invite flag:', error);
      }
    };

    loadInviteFlag();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (!joinedWithInvite) return;
    let isActive = true;

    const loadInviteLocation = async () => {
      try {
        const assignmentsResponse =
          await roomAssignmentService.getAssignmentsForAssignee();
        const assignment = assignmentsResponse.assignments[0] ?? null;
        if (!assignment?.room_id) return;
        const room =
          assignment.room ?? (await roomService.getRoomById(assignment.room_id));
        const flat = room?.flat ?? null;
        const cityId = flat?.city_id;
        const placeId = flat?.place_id;
        if (!cityId || !placeId) return;

        const nextCity: LocationOption = {
          id: cityId,
          label: flat?.city || cityId,
        };
        const nextPlace: LocationOption = {
          id: placeId,
          label: flat?.district || placeId,
        };

        if (!isActive) return;
        setSelectedCity(nextCity);
        setSelectedPlaces([nextPlace]);
        setSelectedPlace(nextPlace);
        setCityQuery('');
        setPlaceQuery('');
      } catch (error) {
        console.warn('[Onboarding] Error cargando invitacion:', error);
      }
    };

    loadInviteLocation();

    return () => {
      isActive = false;
    };
  }, [joinedWithInvite]);

  useEffect(() => {
    let isActive = true;
    const query = placeQuery.trim();

    if (!selectedCity) {
      setPlaces([]);
      setTopPlaces([]);
      setIsLoadingPlaces(false);
      return;
    }

    setIsLoadingPlaces(true);
    const handle = setTimeout(async () => {
      try {
        if (query.length >= 2) {
          const data = await locationService.getPlaces(selectedCity.id, {
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
          const data = await locationService.getPlaces(selectedCity.id, {
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
        console.error('[Onboarding] Error cargando zonas:', error);
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
  }, [placeQuery, selectedCity]);

  useEffect(() => {
    if (situacionVivienda !== 'tengo_piso') return;
    if (!selectedPlace && selectedPlaces.length > 0) {
      setSelectedPlace(selectedPlaces[0]);
    }
    if (selectedPlaces.length > 1) {
      setSelectedPlaces((prev) => prev.slice(0, 1));
    }
  }, [selectedPlace, selectedPlaces, situacionVivienda]);

  useEffect(() => {
    if (situacionVivienda !== 'busco_piso') return;
    setSelectedPlaces((prev) => {
      if (prev.length > 0) return prev;
      return selectedPlace ? [selectedPlace] : prev;
    });
  }, [selectedPlace, situacionVivienda]);

  useEffect(() => {
    if (situacionVivienda === 'busco_piso') {
      if (appearanceMode !== 'seeker-only') {
        setAppearanceMode('seeker-only');
      }
      return;
    }
    if (appearanceMode === 'seeker-only') {
      setAppearanceMode('owner-only');
    }
  }, [appearanceMode, situacionVivienda]);

  const handleSelectCity = useCallback(
    (id: string) => {
      const picked = cityOptions.find((item) => item.id === id) ?? null;
      if (!picked) return;
      setSelectedCity(picked);
      setCityQuery('');
      setPlaceQuery('');
      setPlaces([]);
      setTopPlaces([]);
      setSelectedPlaces([]);
      setSelectedPlace(null);

      // Track city selection
      locationService.trackCitySearch(id).catch((error) => {
        console.warn('[Onboarding] Error tracking city selection:', error);
      });
    },
    [cityOptions]
  );

  const handleSelectPlace = useCallback(
    (id: string) => {
      const picked = placeOptions.find((item) => item.id === id) ?? null;
      if (!picked) return;
      if (situacionVivienda === 'busco_piso') {
        setSelectedPlaces((prev) => {
          const exists = prev.some((item) => item.id === id);
          return exists
            ? prev.filter((item) => item.id !== id)
            : [...prev, picked];
        });
        return;
      }
      setSelectedPlace(picked);
    },
    [placeOptions, situacionVivienda]
  );

  const toggleInteres = useCallback((id: string) => {
    setIntereses((prev) => {
      if (prev.includes(id)) {
        return prev.length > 1 ? prev.filter((item) => item !== id) : prev;
      }
      return [...prev, id];
    });
  }, []);

  const setLifestyleOption = useCallback((optionId: string) => {
    const groupPrefix = optionId.split('_')[0];
    setEstiloVida((prev) => {
      const filtered = prev.filter((id) => !id.startsWith(`${groupPrefix}_`));
      return [...filtered, optionId];
    });
  }, []);

  const validateLocationStep = useCallback(() => {
    const isSeekingFlow = situacionVivienda === 'busco_piso';

    if (!isSeekingFlow) {
      if (!address.trim()) {
        Alert.alert('Error', 'Introduce la calle o direccion del piso');
        return false;
      }
      if (!allowedPolicies.has(genderPolicy)) {
        Alert.alert(
          'Restriccion',
          'Selecciona un tipo de convivencia valido para tu genero.'
        );
        return false;
      }
    }

    return true;
  }, [
    address,
    allowedPolicies,
    genderPolicy,
    situacionVivienda,
  ]);

  const validateBudgetStep = useCallback(() => {
    const budgetMinValue = clamp(
      snapToBudgetStep(budgetMin),
      BUDGET_MIN,
      BUDGET_MAX
    );
    const budgetMaxValue = clamp(
      snapToBudgetStep(budgetMax),
      BUDGET_MIN,
      BUDGET_MAX
    );
    if (budgetMinValue > budgetMaxValue) {
      Alert.alert('Error', 'El presupuesto minimo no puede ser mayor al maximo');
      return false;
    }
    return true;
  }, [budgetMax, budgetMin]);

  const buildProfilePayload = useCallback(
    (input: { zoneIds: string[]; budgetMin?: number; budgetMax?: number }) => {
      const interesesFinal = intereses.length > 0 ? intereses : DEFAULT_INTERESES;
      const { housing_situation, is_seeking } = mapAppearanceModeToProfile(
        appearanceMode,
        situacionVivienda === 'tengo_piso'
      );
      const isSeeking = housing_situation === 'seeking' || is_seeking === true;
      const scheduleId = estiloVida.find((id) => id.startsWith('schedule_'));
      const cleaningId = estiloVida.find((id) => id.startsWith('cleaning_'));
      const guestsId = estiloVida.find((id) => id.startsWith('guests_'));
      const smokingId = estiloVida.find((id) => id.startsWith('smoking_'));
      const petsId = estiloVida.find((id) => id.startsWith('pets_'));
      const hasBudgetValues =
        typeof input.budgetMin === 'number' &&
        typeof input.budgetMax === 'number';
      const shouldSaveBudget = isSeeking && hasBudgetValues;
      const fallbackBudgetMin = hasBudgetValues ? input.budgetMin : DEFAULT_BUDGET_MIN;
      const fallbackBudgetMax = hasBudgetValues ? input.budgetMax : DEFAULT_BUDGET_MAX;

      const profileData: ProfileCreateRequest = {
        interests: interesesFinal,
        lifestyle_preferences: {
          schedule: scheduleId ? lifestyleLabelById.get(scheduleId) : undefined,
          cleaning: cleaningId ? lifestyleLabelById.get(cleaningId) : undefined,
          guests: guestsId ? lifestyleLabelById.get(guestsId) : undefined,
          smoking: smokingId ? lifestyleLabelById.get(smokingId) : undefined,
          pets: petsId ? lifestyleLabelById.get(petsId) : undefined,
        },
        housing_situation,
        is_seeking,
        preferred_zones: input.zoneIds,
        budget_min: shouldSaveBudget ? input.budgetMin : fallbackBudgetMin,
        budget_max: shouldSaveBudget ? input.budgetMax : fallbackBudgetMax,
        desired_roommates_min: isSeeking ? DEFAULT_ROOMMATES_MIN : undefined,
        desired_roommates_max: isSeeking ? DEFAULT_ROOMMATES_MAX : undefined,
        is_searchable: true,
      };

      return { profileData, interesesFinal, housingSituation: housing_situation, isSeeking };
    },
    [appearanceMode, intereses, estiloVida, situacionVivienda]
  );

  const handleFinish = useCallback(
    async (goToEditProfile: boolean) => {
      if (loading) return;
      const isSeekingFlow = situacionVivienda === 'busco_piso';
      const isOwnerFlow = situacionVivienda === 'tengo_piso';
      const nextHousingFilter = appearanceMode === 'both' ? 'any' : 'seeking';
      const zoneIds = isSeekingFlow
        ? selectedPlaces.length > 0
          ? selectedPlaces.map((item) => item.id)
          : joinedWithInvite && selectedPlace
          ? [selectedPlace.id]
          : []
        : selectedPlace
        ? [selectedPlace.id]
        : [];

      if (!isSeekingFlow) {
        if (!address.trim()) {
          Alert.alert('Error', 'Introduce la calle o direccion del piso');
          return;
        }
        if (!allowedPolicies.has(genderPolicy)) {
          Alert.alert(
            'Restriccion',
            'Selecciona un tipo de convivencia valido para tu genero.'
          );
          return;
        }
      }

      const budgetMinValue = clamp(
        snapToBudgetStep(budgetMin),
        BUDGET_MIN,
        BUDGET_MAX
      );
      const budgetMaxValue = clamp(
        snapToBudgetStep(budgetMax),
        BUDGET_MIN,
        BUDGET_MAX
      );

      if (budgetMinValue > budgetMaxValue) {
        Alert.alert('Error', 'El presupuesto minimo no puede ser mayor al maximo');
        return;
      }

      setLoading(true);
      try {
        const { profileData, interesesFinal, isSeeking } = buildProfilePayload({
          zoneIds,
          budgetMin: budgetMinValue,
          budgetMax: budgetMaxValue,
        });

        await profileService.createOrUpdateProfile(profileData);

        if (isOwnerFlow && selectedCity && selectedPlace) {
          await roomService.createFlat({
            address: address.trim(),
            city: selectedCity.label,
            city_id: selectedCity.id,
            district: selectedPlace.label,
            place_id: selectedPlace.id,
            gender_policy: genderPolicy,
          });
        }

        try {
          if (selectedCity && zoneIds.length > 0) {
            await locationService.trackPlaceSearches(selectedCity.id, zoneIds);
          }
        } catch (error) {
          console.warn('[Onboarding] Error guardando contadores:', error);
        }

        await setFilters({
          ...filters,
          housingSituation: nextHousingFilter,
          budgetMin: isSeeking ? budgetMinValue : DEFAULT_BUDGET_MIN,
          budgetMax: isSeeking ? budgetMaxValue : DEFAULT_BUDGET_MAX,
          roommatesMin: DEFAULT_ROOMMATES_MIN,
          roommatesMax: DEFAULT_ROOMMATES_MAX,
          cities: selectedCity ? [selectedCity.id] : [],
          zones: zoneIds,
          lifestyle: estiloVida,
          interests: interesesFinal,
        });

        await profileService.completeOnboarding();
        console.log('[Onboarding] onboarding_completed set to true in DB');
        onComplete?.();

        if (goToEditProfile) {
          navigation.reset({
            index: 1,
            routes: [{ name: 'Main' }, { name: 'EditProfile' }],
          });
          return;
        }

        navigation.reset({
          index: 0,
          routes: [{ name: 'Main' }],
        });
      } catch (error) {
        console.error('[Onboarding] Error guardando perfil:', error);
        Alert.alert('Error', 'No se pudo guardar el perfil inicial');
      } finally {
        setLoading(false);
      }
    },
    [
      appearanceMode,
      address,
      allowedPolicies,
      budgetMax,
      budgetMin,
      buildProfilePayload,
      filters,
      genderPolicy,
      loading,
      navigation,
      onComplete,
      selectedCity,
      selectedPlace,
      selectedPlaces,
      setFilters,
      situacionVivienda,
      joinedWithInvite,
      estiloVida,
    ]
  );

  const value = useMemo<OnboardingFlowContextValue>(
    () => ({
      loading,
      situacionVivienda,
      setSituacionVivienda,
      appearanceMode,
      setAppearanceMode,
      address,
      setAddress,
      cityQuery,
      setCityQuery,
      cities,
      topCities,
      isLoadingCities,
      selectedCity,
      handleSelectCity,
      placeQuery,
      setPlaceQuery,
      places,
      topPlaces,
      isLoadingPlaces,
      selectedPlaces,
      selectedPlace,
      handleSelectPlace,
      budgetMin,
      setBudgetMin,
      budgetMax,
      setBudgetMax,
      intereses,
      toggleInteres,
      estiloVida,
      setLifestyleOption,
      isSmoker,
      hasPets,
      isSocial,
      genderPolicy,
      setGenderPolicy,
      allowedPolicies,
      cardStyle,
      glassInputStyle,
      primaryButtonStyle,
      secondaryButtonStyle,
      validateLocationStep,
      validateBudgetStep,
      handleFinish,
      joinedWithInvite,
    }),
    [
      address,
      appearanceMode,
      allowedPolicies,
      budgetMax,
      budgetMin,
      cardStyle,
      cities,
      topCities,
      cityQuery,
      genderPolicy,
      glassInputStyle,
      handleFinish,
      handleSelectCity,
      handleSelectPlace,
      hasPets,
      intereses,
      isLoadingCities,
      isLoadingPlaces,
      isSmoker,
      isSocial,
      loading,
      placeQuery,
      places,
      primaryButtonStyle,
      secondaryButtonStyle,
      selectedCity,
      selectedPlace,
      selectedPlaces,
      setAddress,
      setAppearanceMode,
      setBudgetMax,
      setBudgetMin,
      setCityQuery,
      setGenderPolicy,
      setLifestyleOption,
      setPlaceQuery,
      setSituacionVivienda,
      situacionVivienda,
      estiloVida,
      toggleInteres,
      topPlaces,
      validateBudgetStep,
      validateLocationStep,
      joinedWithInvite,
    ]
  );

  return (
    <OnboardingFlowContext.Provider value={value}>
      {children}
    </OnboardingFlowContext.Provider>
  );
};

const OnboardingStepLayout: React.FC<{
  title?: string;
  subtitle?: string;
  routeName: string;
  onHeaderLayout?: (height: number) => void;
  contentStyle?: StyleProp<ViewStyle>;
  fixedFooter?: React.ReactNode;
  footerStyle?: StyleProp<ViewStyle>;
  onSkip?: () => void;
  children: React.ReactNode;
}> = ({
  title,
  subtitle,
  routeName,
  onHeaderLayout,
  contentStyle,
  fixedFooter,
  footerStyle,
  onSkip: _onSkip,
  children,
}) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { situacionVivienda, joinedWithInvite } = useOnboardingFlow();
  const steps = joinedWithInvite
    ? INVITE_STEPS
    : situacionVivienda === 'busco_piso'
    ? SEEKING_STEPS
    : OFFERING_STEPS;
  const stepIndex = Math.max(steps.indexOf(routeName), 0) + 1;
  const stepTotal = steps.length;
  const navigation = useNavigation<StackNavigationProp<any>>();
  const canGoBack = navigation.canGoBack();
  const [footerHeight, setFooterHeight] = useState(0);
  const bottomPadding = fixedFooter
    ? footerHeight + insets.bottom + theme.spacing.md
    : Math.max(
        insets.bottom,
        Platform.OS === 'android' ? theme.spacing.s20 : 0
      ) + theme.spacing.lg;

  return (
    <View style={styles.stepContainer}>
      <KeyboardAwareScrollView
        style={styles.stepScroll}
        contentContainerStyle={[
          styles.stepContent,
          {
            paddingTop: insets.top + theme.spacing.md,
            paddingBottom: bottomPadding,
          },
          contentStyle,
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid
        extraScrollHeight={120}
      >
        <View
          onLayout={(event) => {
            onHeaderLayout?.(event.nativeEvent.layout.height);
          }}
        >
          <View style={styles.topBar}>
            {canGoBack ? (
              <Pressable
                onPress={() => navigation.goBack()}
                style={styles.topBarButton}
              >
                <Ionicons name="chevron-back" size={18} color={theme.colors.text} />
              </Pressable>
            ) : (
              <View style={styles.topBarButton} />
            )}
            <Text style={[styles.stepProgress, { color: theme.colors.textSecondary }]}>
              Paso {stepIndex} de {stepTotal}
            </Text>
            <View style={styles.topBarButton} />
          </View>
          {title ? (
            <View style={styles.stepHeader}>
              <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
                {title}
              </Text>
              {subtitle ? (
                <Text
                  style={[styles.stepSubtitle, { color: theme.colors.textSecondary }]}
                >
                  {subtitle}
                </Text>
              ) : null}
            </View>
          ) : null}
        </View>
        {children}
      </KeyboardAwareScrollView>
      {fixedFooter ? (
        <SafeAreaView edges={['bottom']} style={[styles.fixedFooter, footerStyle]}>
          <View
            onLayout={(event) => {
              const nextHeight = event.nativeEvent.layout.height;
              if (nextHeight !== footerHeight) {
                setFooterHeight(nextHeight);
              }
            }}
          >
            {fixedFooter}
          </View>
        </SafeAreaView>
      ) : null}
    </View>
  );
};

const RoleStep: React.FC = () => {
  const theme = useTheme();
  const {
    cardStyle,
    situacionVivienda,
    setSituacionVivienda,
    joinedWithInvite,
    primaryButtonStyle,
  } = useOnboardingFlow();
  const { isDark } = useThemeController();
  const roleTextColor = isDark ? theme.colors.textTertiary : theme.colors.text;
  const roleActiveTextColor = isDark ? theme.colors.textLight : theme.colors.text;
  const rolePressedTextColor = isDark ? theme.colors.textStrong : theme.colors.text;
  const navigation = useNavigation<StackNavigationProp<any>>();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const [roleHeight, setRoleHeight] = useState(0);
  const availableHeight = Math.max(0, windowHeight - insets.top - insets.bottom);
  const roleTop = Math.max(0, (availableHeight - roleHeight) / 2);

  return (
    <OnboardingStepLayout
      routeName="OnboardingRole"
      title="Encuentra tu proximo hogar."
      subtitle="Y a las personas que lo hacen tuyo."
      contentStyle={[styles.roleStepContent, { minHeight: availableHeight }]}
    >
      <View
        style={[styles.roleCenter, styles.roleCenterFloating, { top: roleTop }]}
        onLayout={(event) => setRoleHeight(event.nativeEvent.layout.height)}
      >
        {joinedWithInvite ? (
          <View style={styles.inviteNotice}>
            <Ionicons name="people-outline" size={16} color={theme.colors.text} />
            <Text style={[styles.inviteNoticeText, { color: theme.colors.text }]}>
              Ya te uniste a un piso con invitacion. Seguimos con los datos basicos.
            </Text>
          </View>
        ) : null}
        <View style={styles.roleGrid}>
          <Pressable
            disabled={joinedWithInvite}
            style={({ pressed }) => [
              styles.roleCard,
              cardStyle,
              situacionVivienda === 'busco_piso' && styles.roleCardActive,
              pressed && styles.roleCardPressed,
              joinedWithInvite && styles.roleCardDisabled,
            ]}
            onPress={() => setSituacionVivienda('busco_piso')}
          >
            {({ pressed }) => (
              <>
                <BlurView
                  blurType="light"
                  blurAmount={situacionVivienda === 'busco_piso' ? 8 : 16}
                  reducedTransparencyFallbackColor={theme.colors.glassOverlay}
                  style={StyleSheet.absoluteFillObject}
                  pointerEvents="none"
                />
                <View
                  style={[
                    styles.roleCardTint,
                    situacionVivienda === 'busco_piso' && styles.roleCardTintActive,
                    pressed && styles.roleCardTintPressed,
                  ]}
                  pointerEvents="none"
                />
                <Ionicons
                  name="search-outline"
                  size={22}
                  color={
                    pressed
                      ? rolePressedTextColor
                      : situacionVivienda === 'busco_piso'
                      ? roleActiveTextColor
                      : roleTextColor
                  }
                />
                <Text
                  style={[
                    styles.roleCardText,
                    {
                      color: pressed
                        ? rolePressedTextColor
                        : situacionVivienda === 'busco_piso'
                        ? roleActiveTextColor
                        : roleTextColor,
                    },
                  ]}
                >
                  Busco piso
                </Text>
              </>
            )}
          </Pressable>
          <Pressable
            disabled={joinedWithInvite}
            style={({ pressed }) => [
              styles.roleCard,
              cardStyle,
              situacionVivienda === 'tengo_piso' && styles.roleCardActive,
              pressed && styles.roleCardPressed,
              joinedWithInvite && styles.roleCardDisabled,
            ]}
            onPress={() => setSituacionVivienda('tengo_piso')}
          >
            {({ pressed }) => (
              <>
                <BlurView
                  blurType="light"
                  blurAmount={situacionVivienda === 'tengo_piso' ? 8 : 16}
                  reducedTransparencyFallbackColor={theme.colors.glassOverlay}
                  style={StyleSheet.absoluteFillObject}
                  pointerEvents="none"
                />
                <View
                  style={[
                    styles.roleCardTint,
                    situacionVivienda === 'tengo_piso' && styles.roleCardTintActive,
                    pressed && styles.roleCardTintPressed,
                  ]}
                  pointerEvents="none"
                />
                <Ionicons
                  name="key-outline"
                  size={22}
                  color={
                    pressed
                      ? rolePressedTextColor
                      : situacionVivienda === 'tengo_piso'
                      ? roleActiveTextColor
                      : roleTextColor
                  }
                />
                <Text
                  style={[
                    styles.roleCardText,
                    {
                      color: pressed
                        ? rolePressedTextColor
                        : situacionVivienda === 'tengo_piso'
                        ? roleActiveTextColor
                        : roleTextColor,
                    },
                  ]}
                >
                  Tengo piso
                </Text>
              </>
            )}
          </Pressable>
        </View>
        <Button
          title="Continuar"
          onPress={() => {
            if (joinedWithInvite) {
              navigation.navigate('OnboardingInterests');
              return;
            }
            navigation.navigate(
              situacionVivienda === 'tengo_piso'
                ? 'OnboardingAppearance'
                : 'OnboardingLocation'
            );
          }}
          style={[styles.roleContinueButton, primaryButtonStyle]}
        />
      </View>
    </OnboardingStepLayout>
  );
};

const AppearanceStep: React.FC = () => {
  const theme = useTheme();
  const { appearanceMode, setAppearanceMode, primaryButtonStyle } =
    useOnboardingFlow();
  const navigation = useNavigation<StackNavigationProp<any>>();

  return (
    <OnboardingStepLayout
      routeName="OnboardingAppearance"
      title="Como quieres aparecer"
      subtitle="Elige donde quieres salir en la app."
    >
      <View style={[styles.glassCard, { backgroundColor: theme.colors.glassSurface }]}>
        <BlurView
          blurType="light"
          blurAmount={16}
          reducedTransparencyFallbackColor={theme.colors.glassOverlay}
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
        />
        <View style={styles.glassTint} pointerEvents="none" />
        <AppearanceModeSelector
          value={appearanceMode}
          onChange={setAppearanceMode}
        />
      </View>
      <Button
        title="Continuar"
        onPress={() => navigation.navigate('OnboardingLocation')}
        style={primaryButtonStyle}
      />
    </OnboardingStepLayout>
  );
};

const LocationStep: React.FC = () => {
  const theme = useTheme();
  const {
    situacionVivienda,
    address,
    setAddress,
    cityQuery,
    setCityQuery,
    cities,
    isLoadingCities,
    selectedCity,
    handleSelectCity,
    placeQuery,
    setPlaceQuery,
    places,
    topPlaces,
    isLoadingPlaces,
    selectedPlaces,
    selectedPlace,
    handleSelectPlace,
    cardStyle,
    glassInputStyle,
    genderPolicy,
    setGenderPolicy,
    allowedPolicies,
    validateLocationStep,
    primaryButtonStyle,
  } = useOnboardingFlow();
  const navigation = useNavigation<StackNavigationProp<any>>();
  const cityOptions = useMemo(() => {
    const options = [...cities];
    if (selectedCity && !options.some((item) => item.id === selectedCity.id)) {
      options.unshift(selectedCity);
    }
    return options;
  }, [cities, selectedCity]);
  const placeOptions = useMemo(() => {
    const base = placeQuery.trim().length >= 2 ? places : topPlaces;
    const options = [...base];
    const selected =
      situacionVivienda === 'busco_piso'
        ? selectedPlaces
        : selectedPlace
        ? [selectedPlace]
        : [];
    selected.forEach((item) => {
      if (!options.some((option) => option.id === item.id)) {
        options.unshift(item);
      }
    });
    return options;
  }, [
    placeQuery,
    places,
    selectedPlace,
    selectedPlaces,
    situacionVivienda,
    topPlaces,
  ]);

  return (
    <OnboardingStepLayout
      routeName="OnboardingLocation"
      title={
        situacionVivienda === 'busco_piso'
          ? 'Ciudad y zonas'
          : 'Tu piso'
      }
      subtitle={
        situacionVivienda === 'busco_piso'
          ? 'Selecciona la ciudad y las zonas que te interesan.'
          : 'Indica la direccion y la zona del piso.'
      }
      onSkip={() => {
        if (situacionVivienda === 'busco_piso') {
          navigation.navigate('OnboardingBudget');
        } else {
          navigation.navigate('OnboardingInterests');
        }
      }}
    >
      <View style={[styles.glassCard, cardStyle]}>
        <BlurView
          blurType="light"
          blurAmount={16}
          reducedTransparencyFallbackColor={theme.colors.glassOverlay}
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
        />
        <View style={styles.glassTint} pointerEvents="none" />
        {situacionVivienda === 'tengo_piso' ? (
          <Input
            label="Calle / direccion"
            value={address}
            onChangeText={setAddress}
            placeholder="Ej: Calle Mayor 12"
            icon={
              <Ionicons
                name="map-outline"
                size={16}
                color={theme.colors.textSecondary}
              />
            }
            style={glassInputStyle}
          />
        ) : null}
        <Input
          label="Buscar ciudad"
          value={cityQuery}
          onChangeText={setCityQuery}
          placeholder="Escribe al menos 2 letras"
          icon={
            <Ionicons
              name="location-outline"
              size={16}
              color={theme.colors.textSecondary}
            />
          }
          style={glassInputStyle}
        />
        {isLoadingCities ? (
          <Text style={[styles.searchHint, { color: theme.colors.textSecondary }]}>
            Cargando ciudades...
          </Text>
        ) : null}
        <ChipGroup
          label="Ciudad"
          options={cityOptions}
          selectedIds={selectedCity ? [selectedCity.id] : []}
          onSelect={handleSelectCity}
          multiline
        />
        {selectedCity ? (
          <>
            <Text
              style={[
                styles.inlineLabel,
                { color: theme.colors.textSecondary },
              ]}
            >
              {situacionVivienda === 'busco_piso'
                ? `Zonas en ${selectedCity.label}`
                : 'Zona del piso'}
            </Text>
            <Input
              label="Buscar zona"
              value={placeQuery}
              onChangeText={setPlaceQuery}
              placeholder="Escribe al menos 2 letras"
              icon={
                <Ionicons
                  name="navigate-outline"
                  size={16}
                  color={theme.colors.textSecondary}
                />
              }
              style={glassInputStyle}
            />
            {isLoadingPlaces ? (
              <Text
                style={[styles.searchHint, { color: theme.colors.textSecondary }]}
              >
                Cargando zonas...
              </Text>
            ) : null}
            <ChipGroup
              label={placeQuery.trim().length >= 2 ? 'Resultados' : 'Sugerencias'}
              options={placeOptions}
              selectedIds={
                situacionVivienda === 'busco_piso'
                  ? selectedPlaces.map((item) => item.id)
                  : selectedPlace
                  ? [selectedPlace.id]
                  : []
              }
              onSelect={handleSelectPlace}
              multiline
            />
          </>
        ) : null}
        {situacionVivienda === 'tengo_piso' ? (
          <>
            <View style={styles.inlineRow}>
              <Ionicons
                name="people-outline"
                size={14}
                color={theme.colors.textSecondary}
              />
              <Text style={[styles.inlineLabel, { color: theme.colors.textSecondary }]}>
                Tipo de convivencia
              </Text>
            </View>
            <View style={styles.policyRow}>
              {GENDER_POLICY_OPTIONS.map((option) => {
                const isActive = genderPolicy === option.id;
                const isDisabled = !allowedPolicies.has(option.id);
                return (
                  <Pressable
                    key={option.id}
                    disabled={isDisabled}
                    style={({ pressed }) => [
                      styles.policyButton,
                      cardStyle,
                      isActive && styles.policyButtonActive,
                      pressed && styles.policyButtonPressed,
                      isDisabled && styles.policyButtonDisabled,
                    ]}
                    onPress={() => setGenderPolicy(option.id)}
                  >
                    <Text
                      style={[
                        styles.policyText,
                        {
                          color: isActive
                            ? theme.colors.text
                            : theme.colors.textSecondary,
                        },
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        ) : null}
      </View>
      <Button
        title="Continuar"
        onPress={() => {
          if (!validateLocationStep()) return;
          if (situacionVivienda === 'busco_piso') {
            navigation.navigate('OnboardingBudget');
          } else {
            navigation.navigate('OnboardingInterests');
          }
        }}
        style={primaryButtonStyle}
      />
      <Button
        title="Saltar"
        onPress={() => {
          if (situacionVivienda === 'busco_piso') {
            navigation.navigate('OnboardingBudget');
          } else {
            navigation.navigate('OnboardingInterests');
          }
        }}
        style={primaryButtonStyle}
      />
    </OnboardingStepLayout>
  );
};

const BudgetStep: React.FC = () => {
  const theme = useTheme();
  const {
    budgetMin,
    budgetMax,
    setBudgetMin,
    setBudgetMax,
    validateBudgetStep,
    primaryButtonStyle,
  } = useOnboardingFlow();
  const navigation = useNavigation<StackNavigationProp<any>>();

  return (
    <OnboardingStepLayout
      routeName="OnboardingBudget"
      title="Presupuesto mensual"
      subtitle="Rango aproximado."
      onSkip={() => navigation.navigate('OnboardingInterests')}
    >
      <View style={[styles.glassCard, { backgroundColor: theme.colors.glassSurface }]}> 
        <BlurView
          blurType="light"
          blurAmount={16}
          reducedTransparencyFallbackColor={theme.colors.glassOverlay}
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
        />
        <View style={styles.glassTint} pointerEvents="none" />
        <View style={styles.budgetValues}>
          <Text style={[styles.budgetValue, { color: theme.colors.text }]}>
            {budgetMin} EUR
          </Text>
          <Text style={[styles.budgetValue, { color: theme.colors.text }]}>
            {budgetMax} EUR
          </Text>
        </View>
        <BudgetRangeSlider
          styles={styles}
          minValue={budgetMin}
          maxValue={budgetMax}
          onChangeMin={setBudgetMin}
          onChangeMax={setBudgetMax}
          showLabels={false}
          hitSlopSize={12}
          thumbOffset={9}
        />
      </View>
      <Button
        title="Continuar"
        onPress={() => {
          if (!validateBudgetStep()) return;
          navigation.navigate('OnboardingInterests');
        }}
        style={primaryButtonStyle}
      />
      <Button
        title="Saltar"
        onPress={() => navigation.navigate('OnboardingInterests')}
        style={primaryButtonStyle}
      />
    </OnboardingStepLayout>
  );
};

const InterestsStep: React.FC = () => {
  const theme = useTheme();
  const { intereses, toggleInteres, cardStyle, primaryButtonStyle } =
    useOnboardingFlow();
  const navigation = useNavigation<StackNavigationProp<any>>();

  return (
    <OnboardingStepLayout
      routeName="OnboardingInterests"
      title="Intereses base"
      subtitle="Elige al menos uno. Podras editarlo mas tarde."
      onSkip={() => navigation.navigate('OnboardingLifestyle')}
    >
      <View style={[styles.glassCard, cardStyle]}>
        <BlurView
          blurType="light"
          blurAmount={16}
          reducedTransparencyFallbackColor={theme.colors.glassOverlay}
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
        />
        <View style={styles.glassTint} pointerEvents="none" />
        <ChipGroup
          options={INTERESES_OPTIONS}
          selectedIds={intereses}
          onSelect={toggleInteres}
          multiline
        />
      </View>
      <Button
        title="Continuar"
        onPress={() => navigation.navigate('OnboardingLifestyle')}
        style={primaryButtonStyle}
      />
      <Button
        title="Saltar"
        onPress={() => navigation.navigate('OnboardingLifestyle')}
        style={primaryButtonStyle}
      />
    </OnboardingStepLayout>
  );
};

const LifestyleStep: React.FC = () => {
  const theme = useTheme();
  const {
    estiloVida,
    setLifestyleOption,
    cardStyle,
    primaryButtonStyle,
  } = useOnboardingFlow();
  const navigation = useNavigation<StackNavigationProp<any>>();

  return (
    <OnboardingStepLayout
      routeName="OnboardingLifestyle"
      title="Estilo de vida"
      subtitle="Ajustes rapidos para una mejor convivencia."
      onSkip={() => navigation.navigate('OnboardingPhoto')}
    >
      <View style={[styles.glassCard, cardStyle]}>
        <BlurView
          blurType="light"
          blurAmount={16}
          reducedTransparencyFallbackColor={theme.colors.glassOverlay}
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
        />
        <View style={styles.glassTint} pointerEvents="none" />
        {ESTILO_VIDA_GROUPS.map((group) => {
          const selectedId = estiloVida.find((id) =>
            id.startsWith(`${group.id}_`)
          );
          const iconName = LIFESTYLE_GROUP_ICONS[group.id] ?? 'options-outline';
          return (
            <View key={group.id} style={styles.lifestyleGroup}>
              <View style={styles.lifestyleGroupHeader}>
                <Ionicons
                  name={iconName}
                  size={16}
                  color={theme.colors.text}
                />
                <Text style={[styles.inlineLabel, { color: theme.colors.text }]}>
                  {group.label}
                </Text>
              </View>
              <ChipGroup
                options={group.options}
                selectedIds={selectedId ? [selectedId] : []}
                onSelect={setLifestyleOption}
                chipContainerStyle={styles.lifestyleChipContainer}
                chipStyle={styles.lifestyleChip}
                textStyle={styles.lifestyleChipText}
              />
            </View>
          );
        })}
      </View>
      <Button
        title="Continuar"
        onPress={() => navigation.navigate('OnboardingPhoto')}
        style={primaryButtonStyle}
      />
      <Button
        title="Saltar"
        onPress={() => navigation.navigate('OnboardingPhoto')}
        style={primaryButtonStyle}
      />
    </OnboardingStepLayout>
  );
};

const PhotoStep: React.FC = () => {
  const theme = useTheme();
  const { cardStyle, primaryButtonStyle, secondaryButtonStyle } = useOnboardingFlow();
  const navigation = useNavigation<StackNavigationProp<any>>();
  const [photo, setPhoto] = useState<ProfilePhoto | null>(null);
  const [uploading, setUploading] = useState(false);

  const loadPrimary = useCallback(async () => {
    try {
      const photos = await profilePhotoService.getPhotos();
      const primary = photos.find((item) => item.is_primary) ?? photos[0] ?? null;
      setPhoto(primary ?? null);
    } catch (error) {
      console.warn('[Onboarding] Error cargando fotos:', error);
    }
  }, []);

  useEffect(() => {
    loadPrimary();
  }, [loadPrimary]);

  const handleUpload = useCallback(async () => {
    if (uploading) return;
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

      setUploading(true);
      const uri = image.path.startsWith('file://')
        ? image.path
        : `file://${image.path}`;
      const fileName = image.filename || `photo-${Date.now()}.jpg`;
      const mimeType = image.mime || 'image/jpeg';
      const uploaded = await profilePhotoService.uploadPhoto(
        uri,
        fileName,
        mimeType
      );
      setPhoto(uploaded);
    } catch (error) {
      if ((error as any)?.code === 'E_PICKER_CANCELLED') {
        return;
      }
      console.error('[Onboarding] Error subiendo foto:', error);
      Alert.alert('Error', 'No se pudo subir la foto');
    } finally {
      setUploading(false);
    }
  }, [uploading, theme.colors.surfaceMutedAlt]);

  return (
    <OnboardingStepLayout
      routeName="OnboardingPhoto"
      title="Tu primera foto"
      subtitle="Sube una foto para que tu perfil tenga cara."
      onSkip={() => navigation.navigate('OnboardingFinish')}
    >
      <View style={[styles.glassCard, cardStyle]}>
        <BlurView
          blurType="light"
          blurAmount={16}
          reducedTransparencyFallbackColor={theme.colors.glassOverlay}
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
        />
        <View style={styles.glassTint} pointerEvents="none" />
        <View style={styles.photoPreview}>
          {photo?.signedUrl ? (
            <Image source={{ uri: photo.signedUrl }} style={styles.photoImage} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Ionicons name="camera-outline" size={28} color={theme.colors.textSecondary} />
              <Text style={[styles.photoPlaceholderText, { color: theme.colors.textSecondary }]}>
                Sin foto aun
              </Text>
            </View>
          )}
        </View>
        {uploading ? (
          <Text style={[styles.photoHint, { color: theme.colors.textSecondary }]}>
            Subiendo foto...
          </Text>
        ) : null}
      </View>
      <View style={styles.photoActions}>
        <Button
          title={photo ? 'Cambiar foto' : 'Subir foto'}
          variant="secondary"
          onPress={handleUpload}
          disabled={uploading}
          style={secondaryButtonStyle}
        />
        <Button
          title="Continuar"
          onPress={() => navigation.navigate('OnboardingFinish')}
          style={primaryButtonStyle}
        />
        <Button
          title="Saltar"
          onPress={() => navigation.navigate('OnboardingFinish')}
          style={primaryButtonStyle}
        />
      </View>
    </OnboardingStepLayout>
  );
};

const FinishStep: React.FC = () => {
  const theme = useTheme();
  const { loading, handleFinish, primaryButtonStyle, secondaryButtonStyle } =
    useOnboardingFlow();
  const finishFooter = (
    <View style={styles.footer}>
      <Text style={[styles.helperText, { color: theme.colors.textSecondary }]}>
        Te llevaremos al inicio para explorar.
      </Text>
      <Button
        title="Continuar"
        onPress={() => handleFinish(false)}
        loading={loading}
        style={primaryButtonStyle}
      />
      <Button
        title="Completar perfil ahora"
        variant="secondary"
        onPress={() => handleFinish(true)}
        disabled={loading}
        style={secondaryButtonStyle}
      />
    </View>
  );

  return (
    <OnboardingStepLayout
      routeName="OnboardingFinish"
      title="Todo listo"
      subtitle="Puedes editar todo en cualquier momento desde tu perfil."
      fixedFooter={finishFooter}
    >
      <View style={styles.finishContent}>
        <View style={styles.finishIllustrationWrap}>
          <Image
            source={require('../assets/onboarding-seccion7.png')}
            style={styles.finishIllustration}
            resizeMode="contain"
          />
        </View>
      </View>
    </OnboardingStepLayout>
  );
};


const OnboardingStack = createStackNavigator();

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({
  onComplete,
}) => {
  const theme = useTheme();

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
      <OnboardingFlowProvider onComplete={onComplete}>
        <OnboardingStack.Navigator
          screenOptions={{
            headerShown: false,
            cardStyle: { backgroundColor: 'transparent' },
            cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
            gestureEnabled: true,
          }}
          initialRouteName="OnboardingRole"
        >
          <OnboardingStack.Screen name="OnboardingRole" component={RoleStep} />
          <OnboardingStack.Screen
            name="OnboardingAppearance"
            component={AppearanceStep}
          />
          <OnboardingStack.Screen
            name="OnboardingLocation"
            component={LocationStep}
          />
          <OnboardingStack.Screen
            name="OnboardingBudget"
            component={BudgetStep}
          />
          <OnboardingStack.Screen
            name="OnboardingInterests"
            component={InterestsStep}
          />
          <OnboardingStack.Screen
            name="OnboardingLifestyle"
            component={LifestyleStep}
          />
          <OnboardingStack.Screen name="OnboardingPhoto" component={PhotoStep} />
          <OnboardingStack.Screen
            name="OnboardingFinish"
            component={FinishStep}
          />
        </OnboardingStack.Navigator>
      </OnboardingFlowProvider>
    </View>
  );
};
