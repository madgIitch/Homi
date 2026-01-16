import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { BlurView } from '@react-native-community/blur';
import LinearGradient from 'react-native-linear-gradient';
import { StackNavigationProp } from '@react-navigation/stack';
import { Button } from '../components/Button';
import { ChipGroup } from '../components/ChipGroup';
import { FormSection } from '../components/FormSection';
import {
  BUDGET_MAX,
  BUDGET_MIN,
  BUDGET_STEP,
  DEFAULT_BUDGET_MAX,
  DEFAULT_BUDGET_MIN,
  DEFAULT_ROOMMATES_MAX,
  DEFAULT_ROOMMATES_MIN,
  ESTILO_VIDA_GROUPS,
  ROOMMATES_MAX,
  ROOMMATES_MIN,
} from '../constants/swipeFilters';
import { useSwipeFilters } from '../context/SwipeFiltersContext';
import { usePremium } from '../context/PremiumContext';
import type { HousingFilter, SwipeFilters } from '../types/swipeFilters';
import type { GenderFilter } from '../types/gender';
import type { HousingSituation, ProfileCreateRequest } from '../types/profile';
import { profileService } from '../services/profileService';
import { locationService } from '../services/locationService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FiltersScreenStyles } from '../styles/screens';

type FiltersScreenStylesType = ReturnType<typeof FiltersScreenStyles>;

const HOUSING_OPTIONS: { id: HousingFilter; label: string }[] = [
  { id: 'any', label: 'Indiferente' },
  { id: 'seeking', label: 'Busco piso' },
  { id: 'offering', label: 'Busco compañeros' },
];

const GENDER_OPTIONS: { id: GenderFilter; label: string }[] = [
  { id: 'any', label: 'Indiferente' },
  { id: 'male', label: 'Hombre' },
  { id: 'flinta', label: 'Flinta' },
];

const AGE_MIN = 18;
const AGE_MAX = 65;
const AGE_STEP = 1;
const DEFAULT_AGE_MIN = 18;
const DEFAULT_AGE_MAX = 45;
const ROOMMATES_STEP = 1;
const RECENT_PLACES_KEY = 'recent_places_by_city';

type LocationOption = { id: string; label: string };

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const snapToStep = (value: number) =>
  Math.round(value / BUDGET_STEP) * BUDGET_STEP;

const snapToAgeStep = (value: number) =>
  Math.round(value / AGE_STEP) * AGE_STEP;

const snapToRoommatesStep = (value: number) =>
  Math.round(value / ROOMMATES_STEP) * ROOMMATES_STEP;

export const FiltersScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const theme = useTheme();
  const styles = useMemo(() => FiltersScreenStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const { filters, setFilters } = useSwipeFilters();
  const { isPremium, setPremium } = usePremium();
  const [draft, setDraft] = useState<SwipeFilters>(filters);
  const [profileHousing, setProfileHousing] = useState<HousingSituation | null>(
    null
  );
  const [ownerIsSeeking, setOwnerIsSeeking] = useState(false);
  const [isDraggingBudget, setIsDraggingBudget] = useState(false);
  const [isDraggingAge, setIsDraggingAge] = useState(false);
  const [isDraggingRoommates, setIsDraggingRoommates] = useState(false);
  const [ageMin, setAgeMin] = useState(draft.ageMin ?? DEFAULT_AGE_MIN);
  const [ageMax, setAgeMax] = useState(draft.ageMax ?? DEFAULT_AGE_MAX);
  const [roommatesMin, setRoommatesMin] = useState(
    draft.roommatesMin ?? DEFAULT_ROOMMATES_MIN
  );
  const [roommatesMax, setRoommatesMax] = useState(
    draft.roommatesMax ?? DEFAULT_ROOMMATES_MAX
  );
  const [cityQuery, setCityQuery] = useState('');
  const [cities, setCities] = useState<LocationOption[]>([]);
  const [isLoadingCities, setIsLoadingCities] = useState(false);
  const [selectedCities, setSelectedCities] = useState<LocationOption[]>([]);
  const [activeCityId, setActiveCityId] = useState<string | null>(null);
  const [placeQuery, setPlaceQuery] = useState('');
  const [places, setPlaces] = useState<LocationOption[]>([]);
  const [topPlaces, setTopPlaces] = useState<LocationOption[]>([]);
  const [recentPlaces, setRecentPlaces] = useState<LocationOption[]>([]);
  const [isLoadingPlaces, setIsLoadingPlaces] = useState(false);
  const [zoneCityById, setZoneCityById] = useState<Record<string, string>>({});
  const cityOptions = useMemo(() => {
    const options = [...cities];
    selectedCities.forEach((city) => {
      if (!options.some((item) => item.id === city.id)) {
        options.unshift(city);
      }
    });
    return options;
  }, [cities, selectedCities]);
  const isOwner = profileHousing === 'offering';

  useEffect(() => {
    setDraft(filters);
    setAgeMin(filters.ageMin ?? DEFAULT_AGE_MIN);
    setAgeMax(filters.ageMax ?? DEFAULT_AGE_MAX);
    setRoommatesMin(filters.roommatesMin ?? DEFAULT_ROOMMATES_MIN);
    setRoommatesMax(filters.roommatesMax ?? DEFAULT_ROOMMATES_MAX);
  }, [filters]);

  useEffect(() => {
    if (!isOwner) return;
    setDraft((prev) => ({
      ...prev,
      housingSituation: ownerIsSeeking ? 'any' : 'seeking',
    }));
  }, [isOwner, ownerIsSeeking]);

  useEffect(() => {
    let isMounted = true;
    const loadProfile = async () => {
      try {
        const profile = await profileService.getProfile();
        if (isMounted) {
          setProfileHousing(profile?.housing_situation ?? null);
          setOwnerIsSeeking(profile?.is_seeking === true);
        }
      } catch (error) {
        console.error('[FiltersScreen] Error cargando perfil:', error);
      }
    };

    loadProfile().catch((error) => {
      console.error('[FiltersScreen] Error cargando perfil:', error);
    });
    return () => {
      isMounted = false;
    };
  }, []);

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
          data.map((city) => ({
            id: city.id,
            label: city.name,
          }))
        );
      } catch (error) {
        console.error('[FiltersScreen] Error cargando ciudades:', error);
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

    const loadRecentPlaces = async () => {
      try {
        const stored = await AsyncStorage.getItem(RECENT_PLACES_KEY);
        const parsed = stored ? JSON.parse(stored) : {};
        const items = parsed?.[activeCityId ?? ''] ?? [];
        if (isActive) setRecentPlaces(items);
      } catch (error) {
        console.warn('[FiltersScreen] Error cargando recientes:', error);
        if (isActive) setRecentPlaces([]);
      }
    };

    if (activeCityId) {
      loadRecentPlaces().catch((error) => {
        console.warn('[FiltersScreen] Error cargando recientes:', error);
      });
    } else {
      setRecentPlaces([]);
    }

    return () => {
      isActive = false;
    };
  }, [activeCityId]);


  useEffect(() => {
    let isActive = true;
    const loadSelectedCities = async () => {
      if (!draft.cities || draft.cities.length === 0) {
        setSelectedCities([]);
        setActiveCityId(null);
        return;
      }

      try {
        const citiesData = await Promise.all(
          draft.cities.map((id) => locationService.getCityById(id))
        );
        if (!isActive) return;
        const resolved = citiesData
          .filter((item): item is NonNullable<typeof item> => Boolean(item))
          .map((item) => ({ id: item.id, label: item.name }));
        setSelectedCities(resolved);
        if (!activeCityId || !draft.cities.includes(activeCityId)) {
          setActiveCityId(draft.cities[0] ?? null);
        }
      } catch (error) {
        console.warn('[FiltersScreen] Error cargando ciudades:', error);
      }
    };

    loadSelectedCities().catch((error) => {
      console.warn('[FiltersScreen] Error cargando ciudades:', error);
    });
    return () => {
      isActive = false;
    };
  }, [activeCityId, draft.cities]);

  useEffect(() => {
    let isActive = true;
    const loadZoneCities = async () => {
      const missing = draft.zones.filter((zoneId) => !zoneCityById[zoneId]);
      if (missing.length === 0) return;
      try {
        const entries = await Promise.all(
          missing.map(async (zoneId) => {
            const place = await locationService.getPlaceById(zoneId);
            return place?.city_id ? [zoneId, place.city_id] : null;
          })
        );
        if (!isActive) return;
        const next: Record<string, string> = {};
        entries.forEach((entry) => {
          if (!entry) return;
          const [zoneId, cityId] = entry;
          next[zoneId] = cityId;
        });
        if (Object.keys(next).length > 0) {
          setZoneCityById((prev) => ({ ...prev, ...next }));
        }
      } catch (error) {
        console.warn('[FiltersScreen] Error cargando zonas:', error);
      }
    };

    loadZoneCities().catch((error) => {
      console.warn('[FiltersScreen] Error cargando zonas:', error);
    });
    return () => {
      isActive = false;
    };
  }, [draft.zones, zoneCityById]);

  const handleToggleZone = async (id: string, label: string, cityId: string) => {
    setDraft((prev) => ({
      ...prev,
      zones: prev.zones.includes(id)
        ? prev.zones.filter((zona) => zona !== id)
        : [...prev.zones, id],
    }));

    if (!cityId) return;

    setZoneCityById((prev) => ({
      ...prev,
      [id]: cityId,
    }));

    try {
      const stored = await AsyncStorage.getItem(RECENT_PLACES_KEY);
      const parsed = stored ? JSON.parse(stored) : {};
      const current = parsed[cityId] ?? [];
      const next = [
        { id, label },
        ...current.filter((item: LocationOption) => item.id !== id),
      ].slice(0, 8);
      const nextAll = { ...parsed, [cityId]: next };
      await AsyncStorage.setItem(RECENT_PLACES_KEY, JSON.stringify(nextAll));
      setRecentPlaces(next);
    } catch (error) {
      console.warn('[FiltersScreen] Error guardando recientes:', error);
    }
  };

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
            data.map((place) => ({
              id: place.id,
              label: place.name,
            }))
          );
        } else {
          const data = await locationService.getPlaces(activeCityId, {
            top: true,
            limit: 20,
          });
          if (!isActive) return;
          setTopPlaces(
            data.map((place) => ({
              id: place.id,
              label: place.name,
            }))
          );
          setPlaces([]);
        }
      } catch (error) {
        console.error('[FiltersScreen] Error cargando zonas:', error);
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

  useEffect(() => {
    if (profileHousing === 'offering' && draft.housingSituation === 'offering') {
      setDraft((prev) => ({
        ...prev,
        housingSituation: 'any',
      }));
    }
  }, [draft.housingSituation, profileHousing]);

  useEffect(() => {
    if (isOwner && ownerIsSeeking === false && draft.housingSituation === 'any') {
      setDraft((prev) => ({
        ...prev,
        housingSituation: 'seeking',
      }));
    }
  }, [draft.housingSituation, isOwner, ownerIsSeeking]);

  const handleApply = async () => {
    let budgetMin = clamp(draft.budgetMin, BUDGET_MIN, BUDGET_MAX);
    let budgetMax = clamp(draft.budgetMax, BUDGET_MIN, BUDGET_MAX);
    if (budgetMin > budgetMax) {
      const temp = budgetMin;
      budgetMin = budgetMax;
      budgetMax = temp;
    }

    let finalAgeMin = clamp(ageMin, AGE_MIN, AGE_MAX);
    let finalAgeMax = clamp(ageMax, AGE_MIN, AGE_MAX);
    if (finalAgeMin > finalAgeMax) {
      const temp = finalAgeMin;
      finalAgeMin = finalAgeMax;
      finalAgeMax = temp;
    }

    let finalRoommatesMin = clamp(roommatesMin, ROOMMATES_MIN, ROOMMATES_MAX);
    let finalRoommatesMax = clamp(roommatesMax, ROOMMATES_MIN, ROOMMATES_MAX);
    if (finalRoommatesMin > finalRoommatesMax) {
      const temp = finalRoommatesMin;
      finalRoommatesMin = finalRoommatesMax;
      finalRoommatesMax = temp;
    }

    await setFilters({
      ...draft,
      budgetMin,
      budgetMax,
      roommatesMin: finalRoommatesMin,
      roommatesMax: finalRoommatesMax,
      ageMin: finalAgeMin,
      ageMax: finalAgeMax,
    });

    const shouldSyncPreferredZones =
      profileHousing === 'seeking' || ownerIsSeeking;
    if (shouldSyncPreferredZones || isOwner) {
      const profileUpdates: Partial<ProfileCreateRequest> = {};
      if (shouldSyncPreferredZones) {
        profileUpdates.preferred_zones = draft.zones;
        profileUpdates.desired_roommates_min = finalRoommatesMin;
        profileUpdates.desired_roommates_max = finalRoommatesMax;
      }
      if (isOwner) {
        profileUpdates.is_seeking = ownerIsSeeking;
      }
      if (Object.keys(profileUpdates).length > 0) {
        try {
          await profileService.updateProfile(profileUpdates);
        } catch (error) {
          console.warn('[FiltersScreen] Error sincronizando perfil:', error);
        }
      }
    }

    if (draft.zones.length > 0) {
      try {
        const buckets: Record<string, string[]> = {};
        draft.zones.forEach((zoneId) => {
          const cityId =
            zoneCityById[zoneId] ??
            (draft.cities.length === 1 ? draft.cities[0] : null);
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
        console.warn('[FiltersScreen] Error guardando contadores:', error);
      }
    }

    navigation.goBack();
  };

  const handleResetDraft = () => {
    const defaultHousing =
      isOwner && ownerIsSeeking ? 'any' : isOwner ? 'seeking' : 'any';
    setDraft({
      housingSituation: defaultHousing,
      gender: 'any',
      budgetMin: DEFAULT_BUDGET_MIN,
      budgetMax: DEFAULT_BUDGET_MAX,
      roommatesMin: DEFAULT_ROOMMATES_MIN,
      roommatesMax: DEFAULT_ROOMMATES_MAX,
      cities: [],
      zones: [],
      lifestyle: [],
      interests: [],
      rules: {},
      ageMin: DEFAULT_AGE_MIN,
      ageMax: DEFAULT_AGE_MAX,
    });
    setSelectedCities([]);
    setActiveCityId(null);
    setZoneCityById({});
    setRecentPlaces([]);
    setAgeMin(DEFAULT_AGE_MIN);
    setAgeMax(DEFAULT_AGE_MAX);
    setRoommatesMin(DEFAULT_ROOMMATES_MIN);
    setRoommatesMax(DEFAULT_ROOMMATES_MAX);
  };

  const housingLabel = useMemo(
    () =>
      HOUSING_OPTIONS.find((option) => option.id === draft.housingSituation)
        ?.label ?? 'Indiferente',
    [draft.housingSituation]
  );
  const genderOptions = useMemo(() => {
    return GENDER_OPTIONS;
    /*if (draft.housingSituation !== 'offering') return GENDER_OPTIONS;
    if (profileGender === 'male') {
      return GENDER_OPTIONS.filter((option) => option.id !== 'flinta');
    }
    if (!profileGender || profileGender === 'undisclosed') {
      return GENDER_OPTIONS;
    }
    return GENDER_OPTIONS.filter((option) => option.id !== 'male');*/
  }, []);

  useEffect(() => {
    if (
      draft.housingSituation === 'offering' &&
      !genderOptions.some((option) => option.id === draft.gender)
    ) {
      setDraft((prev) => ({
        ...prev,
        gender: 'any',
      }));
    }
  }, [draft.gender, draft.housingSituation, genderOptions]);

  const showLifestyleFilters =
    draft.housingSituation === 'any' || draft.housingSituation === 'seeking';
  const showRoommatesFilter = draft.housingSituation !== 'offering';

  const showPremiumAlert = () => {
    Alert.alert(
      'Filtro Premium',
      'Este filtro solo esta disponible para usuarios Premium. ?Quieres hacerte Premium?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Hacerme Premium', onPress: () => setPremium(true) },
      ]
    );
  };

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
          colors={[theme.colors.glassOverlay, theme.colors.glassWarmStrong]}
          style={StyleSheet.absoluteFillObject}
        />
      </ImageBackground>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + theme.spacing.md,
            minHeight: insets.top + theme.spacing.md + theme.semanticSizes.control,
          },
        ]}
      >
        <BlurView
          blurType="light"
          blurAmount={6}
          reducedTransparencyFallbackColor={theme.colors.glassOverlay}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.headerFill} />
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <View style={styles.headerIconButton}>
              <Ionicons name="chevron-back" size={22} color={theme.colors.text} />
            </View>
          </TouchableOpacity>
          <Text style={styles.title}>Filtros</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={handleResetDraft}>
            <View style={styles.headerIconButton}>
              <Ionicons name="trash-outline" size={18} color={theme.colors.text} />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        scrollEnabled={
          !isDraggingBudget && !isDraggingAge && !isDraggingRoommates
        }
      >
        <View
          style={[
            styles.premiumBanner,
            isPremium ? styles.premiumBannerActive : styles.premiumBannerInactive,
          ]}
        >
          <View style={styles.premiumBannerContent}>
            <Ionicons
              name={isPremium ? 'star' : 'star-outline'}
              size={20}
              color={isPremium ? '#FFD700' : '#6B7280'}
            />
            <Text
              style={[
                styles.premiumBannerText,
                isPremium && styles.premiumBannerTextActive,
              ]}
            >
              {isPremium
                ? 'Eres Premium - Todos los filtros desbloqueados'
                : 'Plan Gratuito - Filtros limitados'}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.premiumButton, isPremium && styles.premiumButtonActive]}
            onPress={() => setPremium(!isPremium)}
          >
            <Text style={styles.premiumButtonText}>
              {isPremium ? 'Dejar Premium' : 'Ser Premium'}
            </Text>
          </TouchableOpacity>
        </View>

        <FormSection title="Ciudad" iconName="location-outline">
          <TextInput
            value={cityQuery}
            onChangeText={setCityQuery}
            placeholder="Buscar ciudad"
            placeholderTextColor={theme.colors.textSecondary}
            selectionColor={theme.colors.primary}
            style={styles.searchInput}
          />
          {cityQuery.trim().length < 2 ? (
            <Text style={styles.searchHint}>Escribe al menos 2 letras</Text>
          ) : null}
          {isLoadingCities ? (
            <Text style={styles.searchHint}>Cargando ciudades...</Text>
          ) : null}
          <ChipGroup
            label="Selecciona ciudad"
            options={cityOptions}
            selectedIds={draft.cities}
            onSelect={(id) => {
              const isSelected = draft.cities.includes(id);
              const nextCities = isSelected
                ? draft.cities.filter((cityId) => cityId !== id)
                : [...draft.cities, id];
              const nextZones = isSelected
                ? draft.zones.filter((zoneId) => zoneCityById[zoneId] !== id)
                : draft.zones;
              setDraft((prev) => ({
                ...prev,
                cities: nextCities,
                zones: nextZones,
              }));
              const selected = cityOptions.find((item) => item.id === id) || null;
              if (selected) {
                setSelectedCities((prev) => {
                  if (prev.some((item) => item.id === selected.id)) return prev;
                  return [...prev, selected];
                });
              } else {
                setSelectedCities((prev) => prev.filter((item) => item.id !== id));
              }
              if (!isSelected) {
                setActiveCityId(id);
              } else if (activeCityId === id) {
                setActiveCityId(nextCities[0] ?? null);
              }
              setCityQuery('');
              setPlaceQuery('');
              setPlaces([]);
              setTopPlaces([]);
            }}
            multiline
          />
        </FormSection>

        {draft.cities.length > 0 ? (
          <FormSection title="Zonas" iconName="map-outline">
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
              <TextInput
                value={placeQuery}
                onChangeText={setPlaceQuery}
                placeholder="Buscar zona"
                placeholderTextColor={theme.colors.textSecondary}
                selectionColor={theme.colors.primary}
                style={styles.searchInput}
              />
            {placeQuery.trim().length < 2 ? (
              <>
                {isLoadingPlaces ? (
                  <Text style={styles.searchHint}>Cargando zonas...</Text>
                ) : null}
                {recentPlaces.length > 0 ? (
                  <>
                    <Text style={styles.inlineLabel}>Recientes</Text>
                    <ChipGroup
                      options={recentPlaces}
                      selectedIds={draft.zones}
                      onSelect={(id) => {
                        const label =
                          recentPlaces.find((item) => item.id === id)?.label ?? '';
                        if (activeCityId) {
                          handleToggleZone(id, label, activeCityId).catch(
                            (error) => {
                              console.warn(
                                '[FiltersScreen] Error toggling zona:',
                                error
                              );
                            }
                          );
                        }
                      }}
                      multiline
                    />
                  </>
                ) : null}
                <Text style={styles.inlineLabel}>Sugerencias</Text>
                <ChipGroup
                  options={topPlaces}
                  selectedIds={draft.zones}
                  onSelect={(id) => {
                    const label =
                      topPlaces.find((item) => item.id === id)?.label ?? '';
                    if (activeCityId) {
                      handleToggleZone(id, label, activeCityId).catch((error) => {
                        console.warn(
                          '[FiltersScreen] Error toggling zona:',
                          error
                        );
                      });
                    }
                  }}
                  multiline
                />
              </>
            ) : (
              <>
                {isLoadingPlaces ? (
                  <Text style={styles.searchHint}>Cargando resultados...</Text>
                ) : null}
                <ChipGroup
                  label="Resultados"
                  options={places}
                  selectedIds={draft.zones}
                  onSelect={(id) => {
                    const label =
                      places.find((item) => item.id === id)?.label ?? '';
                    if (activeCityId) {
                      handleToggleZone(id, label, activeCityId).catch((error) => {
                        console.warn(
                          '[FiltersScreen] Error toggling zona:',
                          error
                        );
                      });
                    }
                  }}
                  multiline
                />
              </>
            )}
          </FormSection>
        ) : null}

        <TouchableOpacity
          activeOpacity={isPremium ? 1 : 0.7}
          onPress={!isPremium ? showPremiumAlert : undefined}
        >
          <View style={!isPremium ? styles.lockedSection : undefined}>
            {!isPremium && (
              <View style={styles.lockOverlay}>
                <Ionicons name="lock-closed" size={18} color="#9CA3AF" />
                <Text style={styles.lockText}>Premium</Text>
              </View>
            )}
            <FormSection title="Situacion vivienda" iconName="home-outline">
              <Text style={styles.label}>Actual: {housingLabel}</Text>
              <View style={styles.segmentRow} pointerEvents={isPremium ? 'auto' : 'none'}>
                {HOUSING_OPTIONS.map((option) => {
                  const isActive = draft.housingSituation === option.id;
                  return (
                    <TouchableOpacity
                      key={option.id}
                      style={[
                        styles.segmentButton,
                        isActive && styles.segmentButtonActive,
                        !isPremium && styles.segmentButtonDisabled,
                      ]}
                      onPress={() => {
                        setDraft((prev) => ({
                          ...prev,
                          housingSituation: option.id,
                        }));
                        if (
                          isOwner &&
                          (option.id === 'any' || option.id === 'seeking')
                        ) {
                          setOwnerIsSeeking(option.id === 'any');
                        }
                      }}
                      disabled={!isPremium}
                    >
                      <Text
                        style={[
                          styles.segmentButtonText,
                          isActive && styles.segmentButtonTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </FormSection>
          </View>
        </TouchableOpacity>
        {isOwner ? (
          <FormSection title="Busqueda del owner" iconName="home-outline">
            <View style={styles.toggleRow}>
              <View style={styles.toggleCopy}>
                <Text style={styles.toggleLabel}>Tambien busco piso</Text>
                <Text style={styles.toggleHint}>
                  Activa esto si también quieres aparecer a otros dueños de pisos.
                </Text>
              </View>
              <Switch
                value={ownerIsSeeking}
                onValueChange={(value) => {
                  setOwnerIsSeeking(value);
                  setDraft((prev) => ({
                    ...prev,
                    housingSituation: value ? 'any' : 'seeking',
                  }));
                }}
                trackColor={{
                  false: theme.colors.glassBorderSoft,
                  true: theme.colors.primaryMuted,
                }}
                thumbColor={
                  ownerIsSeeking
                    ? theme.colors.primary
                    : theme.colors.textTertiary
                }
                ios_backgroundColor={theme.colors.glassBorderSoft}
              />
            </View>
          </FormSection>
        ) : null}

        <TouchableOpacity
          activeOpacity={isPremium ? 1 : 0.7}
          onPress={!isPremium ? showPremiumAlert : undefined}
        >
          <View style={!isPremium ? styles.lockedSection : undefined}>
            {!isPremium && (
              <View style={styles.lockOverlay}>
                <Ionicons name="lock-closed" size={18} color="#9CA3AF" />
                <Text style={styles.lockText}>Premium</Text>
              </View>
            )}
            <FormSection title="Edad" iconName="calendar-outline">
              <View style={styles.budgetValues}>
                <Text style={styles.budgetValue}>Min: {ageMin} años</Text>
                <Text style={styles.budgetValue}>Max: {ageMax} años</Text>
              </View>
              <View pointerEvents={isPremium ? 'auto' : 'none'}>
                <AgeRange
                  styles={styles}
                  minValue={ageMin}
                  maxValue={ageMax}
                  onDragStateChange={setIsDraggingAge}
                  onChangeMin={setAgeMin}
                  onChangeMax={setAgeMax}
                />
              </View>
            </FormSection>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={isPremium ? 1 : 0.7}
          onPress={!isPremium ? showPremiumAlert : undefined}
        >
          <View style={!isPremium ? styles.lockedSection : undefined}>
            {!isPremium && (
              <View style={styles.lockOverlay}>
                <Ionicons name="lock-closed" size={18} color="#9CA3AF" />
                <Text style={styles.lockText}>Premium</Text>
              </View>
            )}
            <FormSection title="Genero" iconName="people-outline">
              <Text style={styles.label}>Preferencia</Text>
              <View
                style={styles.segmentRow}
                pointerEvents={isPremium ? 'auto' : 'none'}
              >
                {genderOptions.map((option) => {
                  const isActive = draft.gender === option.id;
                  return (
                    <TouchableOpacity
                      key={option.id}
                      style={[
                        styles.segmentButton,
                        isActive && styles.segmentButtonActive,
                        !isPremium && styles.segmentButtonDisabled,
                      ]}
                      onPress={() =>
                        setDraft((prev) => ({
                          ...prev,
                          gender: option.id,
                        }))
                      }
                      disabled={!isPremium}
                    >
                      <Text
                        style={[
                          styles.segmentButtonText,
                          isActive && styles.segmentButtonTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </FormSection>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={isPremium ? 1 : 0.7}
          onPress={!isPremium ? showPremiumAlert : undefined}
        >
          <View style={!isPremium ? styles.lockedSection : undefined}>
            {!isPremium && (
              <View style={styles.lockOverlay}>
                <Ionicons name="lock-closed" size={18} color="#9CA3AF" />
                <Text style={styles.lockText}>Premium</Text>
              </View>
            )}
            <FormSection title="Presupuesto" iconName="cash-outline">
              <View style={styles.budgetValues}>
                <Text style={styles.budgetValue}>Min: {draft.budgetMin} EUR</Text>
                <Text style={styles.budgetValue}>Max: {draft.budgetMax} EUR</Text>
              </View>
              <View pointerEvents={isPremium ? 'auto' : 'none'}>
                <BudgetRange
                  styles={styles}
                  minValue={draft.budgetMin}
                  maxValue={draft.budgetMax}
                  onDragStateChange={setIsDraggingBudget}
                  onChangeMin={(value) =>
                    setDraft((prev) => ({ ...prev, budgetMin: value }))
                  }
                  onChangeMax={(value) =>
                    setDraft((prev) => ({ ...prev, budgetMax: value }))
                  }
                />
              </View>
            </FormSection>
          </View>
        </TouchableOpacity>

        {showRoommatesFilter ? (
          <TouchableOpacity
            activeOpacity={isPremium ? 1 : 0.7}
            onPress={!isPremium ? showPremiumAlert : undefined}
          >
            <View style={!isPremium ? styles.lockedSection : undefined}>
              {!isPremium && (
                <View style={styles.lockOverlay}>
                  <Ionicons name="lock-closed" size={18} color="#9CA3AF" />
                  <Text style={styles.lockText}>Premium</Text>
                </View>
              )}
              <FormSection title="Companeros de piso" iconName="people-outline">
                <View style={styles.budgetValues}>
                  <Text style={styles.budgetValue}>Min: {roommatesMin}</Text>
                  <Text style={styles.budgetValue}>Max: {roommatesMax}</Text>
                </View>
                <View pointerEvents={isPremium ? 'auto' : 'none'}>
                  <RoommatesRange
                    styles={styles}
                    minValue={roommatesMin}
                    maxValue={roommatesMax}
                    onDragStateChange={setIsDraggingRoommates}
                    onChangeMin={setRoommatesMin}
                    onChangeMax={setRoommatesMax}
                  />
                </View>
              </FormSection>
            </View>
          </TouchableOpacity>
        ) : null}

        {showLifestyleFilters ? (
          <FormSection title="Estilo de vida" iconName="sparkles-outline">
            {ESTILO_VIDA_GROUPS.map((group) => (
              <View key={group.id}>
                <Text style={styles.inlineLabel}>{group.label}</Text>
                <View style={styles.checkGrid}>
                  {group.options.map((option) => {
                    const isActive = draft.lifestyle.includes(option.id);
                    return (
                      <Pressable
                        key={option.id}
                        style={({ pressed }) => [
                          styles.checkItem,
                          isActive && styles.checkItemActive,
                          pressed && styles.checkItemPressed,
                        ]}
                        onPress={() =>
                          setDraft((prev) => ({
                            ...prev,
                            lifestyle: prev.lifestyle.includes(option.id)
                              ? prev.lifestyle.filter((chip) => chip !== option.id)
                              : [...prev.lifestyle, option.id],
                          }))
                        }
                      >
                        <View
                          style={[
                            styles.checkBox,
                            {
                              borderColor: isActive
                                ? theme.colors.primaryMuted
                                : theme.colors.glassBorderSoft,
                              backgroundColor: isActive
                                ? theme.colors.primaryTint
                                : theme.colors.glassSurface,
                            },
                          ]}
                        >
                          {isActive ? (
                            <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                          ) : null}
                        </View>
                        <Text
                          style={[
                            styles.checkLabel,
                            isActive && styles.checkLabelActive,
                          ]}
                        >
                          {option.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}
          </FormSection>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.footerFill} />
        <Button
          title="Aplicar filtros"
          onPress={handleApply}
          size="large"
          style={styles.applyButton}
        />
      </View>
    </View>
  );
};

const BudgetRange: React.FC<{
  styles: FiltersScreenStylesType;
  minValue: number;
  maxValue: number;
  onDragStateChange: (isDragging: boolean) => void;
  onChangeMin: (value: number) => void;
  onChangeMax: (value: number) => void;
}> = ({ styles, minValue, maxValue, onDragStateChange, onChangeMin, onChangeMax }) => {
  const [trackWidth, setTrackWidth] = useState(0);
  const minStartRef = React.useRef(0);
  const maxStartRef = React.useRef(0);
  const minValueRef = React.useRef(minValue);
  const maxValueRef = React.useRef(maxValue);
  const startTouchRef = React.useRef(0);

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
    return clamp(snapToStep(raw), BUDGET_MIN, BUDGET_MAX);
  };

  const activeThumbRef = React.useRef<'min' | 'max' | null>(null);

  const minX = valueToX(minValue);
  const maxX = valueToX(maxValue);
  const ticks = Math.floor((BUDGET_MAX - BUDGET_MIN) / BUDGET_STEP);

  return (
    <View
      style={styles.sliderContainer}
      onLayout={(event) => {
        const width = event.nativeEvent.layout.width;
        console.log('[BudgetRange] layout width', width);
        setTrackWidth(width);
      }}
      pointerEvents="box-only"
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={(event) => {
        if (!trackWidth) {
          console.log('[BudgetRange] grant blocked, trackWidth=0');
          return;
        }
        onDragStateChange(true);
        const touchX = event.nativeEvent.locationX;
        console.log('[BudgetRange] grant', {
          trackWidth,
          touchX,
          minValue: minValueRef.current,
          maxValue: maxValueRef.current,
        });
        startTouchRef.current = touchX;
        const minPos = valueToX(minValueRef.current);
        const maxPos = valueToX(maxValueRef.current);
        activeThumbRef.current =
          Math.abs(touchX - minPos) <= Math.abs(touchX - maxPos) ? 'min' : 'max';
        console.log('[BudgetRange] activeThumb', activeThumbRef.current, {
          minPos,
          maxPos,
        });
        minStartRef.current = minPos;
        maxStartRef.current = maxPos;
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
        onDragStateChange(false);
      }}
      onResponderTerminate={() => {
        activeThumbRef.current = null;
        onDragStateChange(false);
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
        style={[styles.sliderThumb, { left: minX - 10 }]}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      />
      <View
        style={[styles.sliderThumb, { left: maxX - 10 }]}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      />
      <View style={styles.sliderTicks}>
        {Array.from({ length: ticks + 1 }).map((_, index) => (
          <View key={`tick-${index}`} style={styles.sliderTick} />
        ))}
      </View>
      <View style={styles.sliderLabels}>
        <Text style={styles.sliderLabel}>0</Text>
        <Text style={styles.sliderLabel}>600</Text>
        <Text style={styles.sliderLabel}>1200+</Text>
      </View>
    </View>
  );
};

const RoommatesRange: React.FC<{
  styles: FiltersScreenStylesType;
  minValue: number;
  maxValue: number;
  onDragStateChange: (isDragging: boolean) => void;
  onChangeMin: (value: number) => void;
  onChangeMax: (value: number) => void;
}> = ({ styles, minValue, maxValue, onDragStateChange, onChangeMin, onChangeMax }) => {
  const [trackWidth, setTrackWidth] = useState(0);
  const minValueRef = React.useRef(minValue);
  const maxValueRef = React.useRef(maxValue);

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

  const activeThumbRef = React.useRef<'min' | 'max' | null>(null);

  const minX = valueToX(minValue);
  const maxX = valueToX(maxValue);

  return (
    <View
      style={styles.sliderContainer}
      onLayout={(event) => {
        const width = event.nativeEvent.layout.width;
        setTrackWidth(width);
      }}
      pointerEvents="box-only"
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={(event) => {
        if (!trackWidth) return;
        onDragStateChange(true);
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
        onDragStateChange(false);
      }}
      onResponderTerminate={() => {
        activeThumbRef.current = null;
        onDragStateChange(false);
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
        style={[styles.sliderThumb, { left: minX - 10 }]}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      />
      <View
        style={[styles.sliderThumb, { left: maxX - 10 }]}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      />
      <View style={styles.sliderTicks}>
        {Array.from({ length: ROOMMATES_MAX - ROOMMATES_MIN + 1 }).map(
          (_, index) => (
            <View key={`tick-roommates-${index}`} style={styles.sliderTick} />
          )
        )}
      </View>
      <View style={styles.sliderLabels}>
        <Text style={styles.sliderLabel}>{ROOMMATES_MIN}</Text>
        <Text style={styles.sliderLabel}>
          {Math.round((ROOMMATES_MIN + ROOMMATES_MAX) / 2)}
        </Text>
        <Text style={styles.sliderLabel}>{ROOMMATES_MAX}+</Text>
      </View>
    </View>
  );
};

const AgeRange: React.FC<{
  styles: FiltersScreenStylesType;
  minValue: number;
  maxValue: number;
  onDragStateChange: (isDragging: boolean) => void;
  onChangeMin: (value: number) => void;
  onChangeMax: (value: number) => void;
}> = ({ styles, minValue, maxValue, onDragStateChange, onChangeMin, onChangeMax }) => {
  const [trackWidth, setTrackWidth] = useState(0);
  const minValueRef = React.useRef(minValue);
  const maxValueRef = React.useRef(maxValue);

  useEffect(() => {
    minValueRef.current = minValue;
    maxValueRef.current = maxValue;
  }, [minValue, maxValue]);

  const valueToX = (value: number) => {
    if (!trackWidth) return 0;
    return ((value - AGE_MIN) / (AGE_MAX - AGE_MIN)) * trackWidth;
  };

  const xToValue = (x: number) => {
    if (!trackWidth) return AGE_MIN;
    const raw = AGE_MIN + (x / trackWidth) * (AGE_MAX - AGE_MIN);
    return clamp(snapToAgeStep(raw), AGE_MIN, AGE_MAX);
  };

  const activeThumbRef = React.useRef<'min' | 'max' | null>(null);

  const minX = valueToX(minValue);
  const maxX = valueToX(maxValue);

  return (
    <View
      style={styles.sliderContainer}
      onLayout={(event) => {
        const width = event.nativeEvent.layout.width;
        setTrackWidth(width);
      }}
      pointerEvents="box-only"
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={(event) => {
        if (!trackWidth) return;
        onDragStateChange(true);
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
        onDragStateChange(false);
      }}
      onResponderTerminate={() => {
        activeThumbRef.current = null;
        onDragStateChange(false);
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
        style={[styles.sliderThumb, { left: minX - 10 }]}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      />
      <View
        style={[styles.sliderThumb, { left: maxX - 10 }]}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      />
      <View style={styles.sliderLabels}>
        <Text style={styles.sliderLabel}>18</Text>
        <Text style={styles.sliderLabel}>40</Text>
        <Text style={styles.sliderLabel}>65+</Text>
      </View>
    </View>
  );
};
