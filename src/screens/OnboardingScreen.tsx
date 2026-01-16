
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
  Pressable,
  type StyleProp,
  StyleSheet,
  Switch,
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
import { launchImageLibrary } from 'react-native-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { createStackNavigator, CardStyleInterpolators } from '@react-navigation/stack';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '../theme/ThemeContext';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { ChipGroup } from '../components/ChipGroup';
import { AuthContext } from '../context/AuthContext';
import { useSwipeFilters } from '../context/SwipeFiltersContext';
import { profilePhotoService } from '../services/profilePhotoService';
import { profileService } from '../services/profileService';
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
  INTERESES_OPTIONS,
  lifestyleLabelById,
} from '../constants/swipeFilters';
import type {
  HousingSituation,
  ProfileCreateRequest,
  ProfilePhoto,
} from '../types/profile';
import type { GenderPolicy } from '../types/room';
import { OnboardingScreenStyles as styles } from '../styles/screens';

type OnboardingScreenProps = {
  onComplete?: () => void;
};

type LocationOption = { id: string; label: string };

type OnboardingFlowContextValue = {
  loading: boolean;
  situacionVivienda: 'busco_piso' | 'tengo_piso';
  setSituacionVivienda: (value: 'busco_piso' | 'tengo_piso') => void;
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
const GENDER_POLICY_OPTIONS: { id: GenderPolicy; label: string }[] = [
  { id: 'mixed', label: 'Mixto' },
  { id: 'men_only', label: 'Solo hombres' },
  { id: 'flinta', label: 'Solo FLINTA' },
];
const ONBOARDING_COMPLETED_KEY = 'onboardingCompleted';
const JOINED_WITH_INVITE_KEY = 'joinedWithInvite';
const FORCE_ONBOARDING_KEY = 'forceOnboarding';

const SEEKING_STEPS = [
  'OnboardingRole',
  'OnboardingLocation',
  'OnboardingBudget',
  'OnboardingInterests',
  'OnboardingLifestyle',
  'OnboardingPhoto',
  'OnboardingFinish',
];
const OFFERING_STEPS = [
  'OnboardingRole',
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
          setSituacionVivienda('tengo_piso');
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
    const zoneIds = isSeekingFlow
      ? selectedPlaces.map((item) => item.id)
      : selectedPlace
      ? [selectedPlace.id]
      : [];

    if (!selectedCity) {
      Alert.alert('Error', 'Selecciona una ciudad');
      return false;
    }

    if (zoneIds.length === 0) {
      Alert.alert('Error', 'Selecciona al menos una zona');
      return false;
    }

    if (!isSeekingFlow) {
      if (!address.trim()) {
        Alert.alert('Error', 'Introduce la calle o direccion del piso');
        return false;
      }
      if (!selectedPlace) {
        Alert.alert('Error', 'Selecciona una zona');
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
    selectedCity,
    selectedPlace,
    selectedPlaces,
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
      const housingSituation: HousingSituation =
        situacionVivienda === 'busco_piso' ? 'seeking' : 'offering';
      const isSeeking = situacionVivienda === 'busco_piso';
      const scheduleId = estiloVida.find((id) => id.startsWith('schedule_'));
      const cleaningId = estiloVida.find((id) => id.startsWith('cleaning_'));
      const guestsId = estiloVida.find((id) => id.startsWith('guests_'));
      const smokingId = estiloVida.find((id) => id.startsWith('smoking_'));
      const petsId = estiloVida.find((id) => id.startsWith('pets_'));
      const shouldSaveBudget =
        isSeeking &&
        typeof input.budgetMin === 'number' &&
        typeof input.budgetMax === 'number';

      const profileData: ProfileCreateRequest = {
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
        preferred_zones: input.zoneIds,
        budget_min: shouldSaveBudget ? input.budgetMin : undefined,
        budget_max: shouldSaveBudget ? input.budgetMax : undefined,
        desired_roommates_min: isSeeking ? DEFAULT_ROOMMATES_MIN : undefined,
        desired_roommates_max: isSeeking ? DEFAULT_ROOMMATES_MAX : undefined,
        is_searchable: true,
      };

      return { profileData, interesesFinal, housingSituation, isSeeking };
    },
    [intereses, estiloVida, situacionVivienda]
  );

  const handleFinish = useCallback(
    async (goToEditProfile: boolean) => {
      if (loading) return;
      const isSeekingFlow = situacionVivienda === 'busco_piso';
      const zoneIds = isSeekingFlow
        ? selectedPlaces.map((item) => item.id)
        : selectedPlace
        ? [selectedPlace.id]
        : [];

      if (!selectedCity) {
        Alert.alert('Error', 'Selecciona una ciudad');
        return;
      }

      if (zoneIds.length === 0) {
        Alert.alert('Error', 'Selecciona al menos una zona');
        return;
      }

      if (!isSeekingFlow) {
        if (!address.trim()) {
          Alert.alert('Error', 'Introduce la calle o direccion del piso');
          return;
        }
        if (!selectedPlace) {
          Alert.alert('Error', 'Selecciona una zona');
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

        if (!isSeeking && selectedPlace) {
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
          housingSituation: isSeeking ? 'seeking' : 'offering',
          budgetMin: isSeeking ? budgetMinValue : DEFAULT_BUDGET_MIN,
          budgetMax: isSeeking ? budgetMaxValue : DEFAULT_BUDGET_MAX,
          roommatesMin: DEFAULT_ROOMMATES_MIN,
          roommatesMax: DEFAULT_ROOMMATES_MAX,
          cities: selectedCity ? [selectedCity.id] : [],
          zones: zoneIds,
          lifestyle: estiloVida,
          interests: interesesFinal,
        });

        await AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, '1');
        await AsyncStorage.removeItem(FORCE_ONBOARDING_KEY);
        console.log('[Onboarding] onboardingCompleted set to 1');
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
      estiloVida,
    ]
  );

  const value = useMemo<OnboardingFlowContextValue>(
    () => ({
      loading,
      situacionVivienda,
      setSituacionVivienda,
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
  onSkip?: () => void;
  children: React.ReactNode;
}> = ({
  title,
  subtitle,
  routeName,
  onHeaderLayout,
  contentStyle,
  onSkip: _onSkip,
  children,
}) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { situacionVivienda } = useOnboardingFlow();
  const steps =
    situacionVivienda === 'busco_piso' ? SEEKING_STEPS : OFFERING_STEPS;
  const stepIndex = Math.max(steps.indexOf(routeName), 0) + 1;
  const stepTotal = steps.length;
  const navigation = useNavigation<StackNavigationProp<any>>();
  const canGoBack = navigation.canGoBack();

  return (
    <KeyboardAwareScrollView
      contentContainerStyle={[
        styles.stepContent,
        { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 },
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
  );
};

const RoleStep: React.FC = () => {
  const theme = useTheme();
  const { cardStyle, situacionVivienda, setSituacionVivienda, joinedWithInvite } =
    useOnboardingFlow();
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
              ]}
              pointerEvents="none"
            />
            <Ionicons name="search-outline" size={22} color={theme.colors.text} />
            <Text style={[styles.roleCardText, { color: theme.colors.text }]}>
              Busco piso
            </Text>
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
              ]}
              pointerEvents="none"
            />
            <Ionicons name="key-outline" size={22} color={theme.colors.text} />
            <Text style={[styles.roleCardText, { color: theme.colors.text }]}>
              Tengo piso
            </Text>
          </Pressable>
        </View>
        <Button
          title="Continuar"
          onPress={() => navigation.navigate('OnboardingLocation')}
        />
      </View>
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
      />
      <Pressable
        onPress={() => {
          if (situacionVivienda === 'busco_piso') {
            navigation.navigate('OnboardingBudget');
          } else {
            navigation.navigate('OnboardingInterests');
          }
        }}
        style={styles.skipTextButton}
      >
        <Text style={[styles.skipTextButtonLabel, { color: theme.colors.textSecondary }]}>
          Saltar
        </Text>
      </Pressable>
    </OnboardingStepLayout>
  );
};

const BudgetStep: React.FC = () => {
  const theme = useTheme();
  const { budgetMin, budgetMax, setBudgetMin, setBudgetMax, validateBudgetStep } =
    useOnboardingFlow();
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
        <BudgetRange
          minValue={budgetMin}
          maxValue={budgetMax}
          onChangeMin={setBudgetMin}
          onChangeMax={setBudgetMax}
        />
      </View>
      <Button
        title="Continuar"
        onPress={() => {
          if (!validateBudgetStep()) return;
          navigation.navigate('OnboardingInterests');
        }}
      />
      <Pressable
        onPress={() => navigation.navigate('OnboardingInterests')}
        style={styles.skipTextButton}
      >
        <Text style={[styles.skipTextButtonLabel, { color: theme.colors.textSecondary }]}>
          Saltar
        </Text>
      </Pressable>
    </OnboardingStepLayout>
  );
};

const InterestsStep: React.FC = () => {
  const theme = useTheme();
  const { intereses, toggleInteres, cardStyle } =
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
      />
      <Pressable
        onPress={() => navigation.navigate('OnboardingLifestyle')}
        style={styles.skipTextButton}
      >
        <Text style={[styles.skipTextButtonLabel, { color: theme.colors.textSecondary }]}>
          Saltar
        </Text>
      </Pressable>
    </OnboardingStepLayout>
  );
};

const LifestyleStep: React.FC = () => {
  const theme = useTheme();
  const {
    isSmoker,
    hasPets,
    isSocial,
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
        <View style={styles.toggleRow}>
          <View style={styles.toggleCopy}>
            <Text style={[styles.toggleLabel, { color: theme.colors.text }]}>
              Fumador
            </Text>
            <Text style={[styles.toggleHint, { color: theme.colors.textSecondary }]}>
              Indica si fumas habitualmente.
            </Text>
          </View>
          <Switch
            value={isSmoker}
            onValueChange={(value) =>
              setLifestyleOption(value ? 'smoking_si' : 'smoking_no')
            }
            trackColor={{
              false: theme.colors.glassBorderSoft,
              true: theme.colors.primaryMuted,
            }}
            thumbColor={isSmoker ? theme.colors.primary : theme.colors.textTertiary}
            ios_backgroundColor={theme.colors.glassBorderSoft}
          />
        </View>
        <View style={styles.toggleRow}>
          <View style={styles.toggleCopy}>
            <Text style={[styles.toggleLabel, { color: theme.colors.text }]}>
              Mascotas
            </Text>
            <Text style={[styles.toggleHint, { color: theme.colors.textSecondary }]}>
              Si convives con mascotas.
            </Text>
          </View>
          <Switch
            value={hasPets}
            onValueChange={(value) =>
              setLifestyleOption(value ? 'pets_si' : 'pets_no')
            }
            trackColor={{
              false: theme.colors.glassBorderSoft,
              true: theme.colors.primaryMuted,
            }}
            thumbColor={hasPets ? theme.colors.primary : theme.colors.textTertiary}
            ios_backgroundColor={theme.colors.glassBorderSoft}
          />
        </View>
        <View style={styles.toggleRow}>
          <View style={styles.toggleCopy}>
            <Text style={[styles.toggleLabel, { color: theme.colors.text }]}>
              Vida social
            </Text>
            <Text style={[styles.toggleHint, { color: theme.colors.textSecondary }]}>
              Prefieres un ambiente mas social.
            </Text>
          </View>
          <Switch
            value={isSocial}
            onValueChange={(value) =>
              setLifestyleOption(value ? 'guests_frecuentes' : 'guests_pocas')
            }
            trackColor={{
              false: theme.colors.glassBorderSoft,
              true: theme.colors.primaryMuted,
            }}
            thumbColor={isSocial ? theme.colors.primary : theme.colors.textTertiary}
            ios_backgroundColor={theme.colors.glassBorderSoft}
          />
        </View>
      </View>
      <Button
        title="Continuar"
        onPress={() => navigation.navigate('OnboardingPhoto')}
        style={primaryButtonStyle}
      />
      <Pressable
        onPress={() => navigation.navigate('OnboardingPhoto')}
        style={styles.skipTextButton}
      >
        <Text style={[styles.skipTextButtonLabel, { color: theme.colors.textSecondary }]}>
          Saltar
        </Text>
      </Pressable>
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
      setUploading(true);
      const uploaded = await profilePhotoService.uploadPhoto(
        asset.uri,
        asset.fileName,
        asset.type
      );
      setPhoto(uploaded);
    } catch (error) {
      console.error('[Onboarding] Error subiendo foto:', error);
      Alert.alert('Error', 'No se pudo subir la foto');
    } finally {
      setUploading(false);
    }
  }, [uploading]);

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
        <Pressable
          onPress={() => navigation.navigate('OnboardingFinish')}
          style={styles.skipTextButton}
        >
          <Text style={[styles.skipTextButtonLabel, { color: theme.colors.textSecondary }]}>
            Saltar
          </Text>
        </Pressable>
      </View>
    </OnboardingStepLayout>
  );
};

const FinishStep: React.FC = () => {
  const theme = useTheme();
  const { loading, handleFinish, primaryButtonStyle, secondaryButtonStyle } =
    useOnboardingFlow();

  return (
    <OnboardingStepLayout
      routeName="OnboardingFinish"
      title="Todo listo"
      subtitle="Puedes editar todo en cualquier momento desde tu perfil."
    >
      <View style={styles.footer}>
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
        <Text style={[styles.helperText, { color: theme.colors.textSecondary }]}> 
          Te llevaremos al inicio para explorar.
        </Text>
      </View>
    </OnboardingStepLayout>
  );
};

const BudgetRange: React.FC<{
  minValue: number;
  maxValue: number;
  onChangeMin: (value: number) => void;
  onChangeMax: (value: number) => void;
}> = ({ minValue, maxValue, onChangeMin, onChangeMax }) => {
  const [trackWidth, setTrackWidth] = useState(0);
  const minValueRef = useRef(minValue);
  const maxValueRef = useRef(maxValue);
  const activeThumbRef = useRef<'min' | 'max' | null>(null);

  useEffect(() => {
    minValueRef.current = minValue;
    maxValueRef.current = maxValue;
  }, [minValue, maxValue]);

  const valueToX = (value: number) => {
    if (!trackWidth) return 0;
    return ((value - BUDGET_MIN) / (BUDGET_MAX - BUDGET_MIN)) * trackWidth;
  };

  const xToValue = (x: number) => {
    if (!trackWidth) return BUDGET_MIN;
    const raw = BUDGET_MIN + (x / trackWidth) * (BUDGET_MAX - BUDGET_MIN);
    return clamp(snapToBudgetStep(raw), BUDGET_MIN, BUDGET_MAX);
  };

  const minX = valueToX(minValue);
  const maxX = valueToX(maxValue);

  return (
    <View
      style={styles.sliderContainer}
      onLayout={(event) => {
        setTrackWidth(event.nativeEvent.layout.width);
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
      <View style={styles.sliderTrack} />
      <View
        style={[
          styles.sliderTrackActive,
          { left: minX, width: Math.max(0, maxX - minX) },
        ]}
      />
      <View
        style={[styles.sliderThumb, { left: minX - 9 }]}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      />
      <View
        style={[styles.sliderThumb, { left: maxX - 9 }]}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      />
    </View>
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
