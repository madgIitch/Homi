import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
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
import { BudgetRangeSlider } from '../components/BudgetRangeSlider';
import { FormSection } from '../components/FormSection';
import { LocationSelector } from '../components/LocationSelector';
import { RoommatesRangeSlider } from '../components/RoommatesRangeSlider';
import {
  BUDGET_MAX,
  BUDGET_MIN,
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
import type { ProfileCreateRequest, AppearanceMode } from '../types/profile';
import { profileService } from '../services/profileService';
import { locationService } from '../services/locationService';
import { FiltersScreenStyles } from '../styles/screens';
import { getAppearanceMode } from '../utils/appearanceMode';

type FiltersScreenStylesType = ReturnType<typeof FiltersScreenStyles>;

const HOUSING_OPTIONS: { id: HousingFilter; label: string }[] = [
  { id: 'any', label: 'Ambos' },
  { id: 'seeking', label: 'Buscando piso' },
  { id: 'offering', label: 'Con piso' },
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

type LocationOption = { id: string; label: string };

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const snapToAgeStep = (value: number) =>
  Math.round(value / AGE_STEP) * AGE_STEP;

export const FiltersScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const theme = useTheme();
  const styles = useMemo(() => FiltersScreenStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const { filters, setFilters } = useSwipeFilters();
  const { isPremium } = usePremium();
  const [draft, setDraft] = useState<SwipeFilters>(filters);
  const [appearanceMode, setAppearanceMode] =
    useState<AppearanceMode>('seeker-only');
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
  const [selectedCities, setSelectedCities] = useState<LocationOption[]>([]);
  const [selectedZoneOptions, setSelectedZoneOptions] = useState<LocationOption[]>([]);
  const [zoneCityById, setZoneCityById] = useState<Record<string, string>>({});
  const [isLifestyleCollapsed, setIsLifestyleCollapsed] = useState(true);
  const isOwner = appearanceMode !== 'seeker-only';

  useEffect(() => {
    setDraft(filters);
    setAgeMin(filters.ageMin ?? DEFAULT_AGE_MIN);
    setAgeMax(filters.ageMax ?? DEFAULT_AGE_MAX);
    setRoommatesMin(filters.roommatesMin ?? DEFAULT_ROOMMATES_MIN);
    setRoommatesMax(filters.roommatesMax ?? DEFAULT_ROOMMATES_MAX);
  }, [filters]);

  useEffect(() => {
    if (!isOwner) return;
    const nextHousing = appearanceMode === 'both' ? 'any' : 'seeking';
    setDraft((prev) => ({
      ...prev,
      housingSituation: nextHousing,
    }));
  }, [appearanceMode, isOwner]);

  useEffect(() => {
    let isMounted = true;
    const loadProfile = async () => {
      try {
        const profile = await profileService.getProfile();
        if (isMounted && profile) {
          setAppearanceMode(
            getAppearanceMode(profile.housing_situation, profile.is_seeking)
          );

          // Load preferred_zones from profile if filters don't have zones yet
          const savedZones = profile.preferred_zones ?? [];
          if (savedZones.length > 0 && draft.zones.length === 0) {
            setDraft((prev) => ({
              ...prev,
              zones: savedZones,
            }));
          }
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
  }, [draft.zones.length]);

  // Cargar ciudades y zonas seleccionadas desde draft al montar
  useEffect(() => {
    let isActive = true;
    const loadInitialLocations = async () => {
      if (draft.cities.length === 0) {
        setSelectedCities([]);
        return;
      }

      try {
        // Cargar ciudades
        const citiesData = await Promise.all(
          draft.cities.map((id) => locationService.getCityById(id))
        );
        if (!isActive) return;
        const resolvedCities = citiesData
          .filter((item): item is NonNullable<typeof item> => Boolean(item))
          .map((item) => ({ id: item.id, label: item.name }));
        setSelectedCities(resolvedCities);

        // Cargar zonas y sus ciudades
        if (draft.zones.length > 0) {
          const missing = draft.zones.filter((zoneId) => !zoneCityById[zoneId]);
          if (missing.length > 0) {
            const entries = await Promise.all(
              missing.map(async (zoneId) => {
                const place = await locationService.getPlaceById(zoneId);
                return place
                  ? { zoneId, cityId: place.city_id, label: place.name }
                  : null;
              })
            );
            if (!isActive) return;

            const nextZoneCityMap = { ...zoneCityById };
            const nextZoneOptions: LocationOption[] = [];
            entries.forEach((entry) => {
              if (entry) {
                nextZoneCityMap[entry.zoneId] = entry.cityId;
                nextZoneOptions.push({ id: entry.zoneId, label: entry.label });
              }
            });
            setZoneCityById(nextZoneCityMap);
            setSelectedZoneOptions(nextZoneOptions);
          }
        }
      } catch (error) {
        console.warn('[FiltersScreen] Error loading initial locations:', error);
      }
    };

    loadInitialLocations();
    return () => {
      isActive = false;
    };
  }, []); // Solo al montar

  useEffect(() => {
    if (!isOwner) return;
    if (appearanceMode === 'owner-only' && draft.housingSituation !== 'seeking') {
      setDraft((prev) => ({
        ...prev,
        housingSituation: 'seeking',
      }));
      return;
    }
    if (appearanceMode === 'both' && draft.housingSituation === 'offering') {
      setDraft((prev) => ({
        ...prev,
        housingSituation: 'any',
      }));
    }
  }, [appearanceMode, draft.housingSituation, isOwner]);

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

    const shouldSyncPreferredZones = appearanceMode !== 'owner-only';
    if (shouldSyncPreferredZones || isOwner) {
      const profileUpdates: Partial<ProfileCreateRequest> = {};
      if (shouldSyncPreferredZones) {
        profileUpdates.preferred_zones = draft.zones;
        profileUpdates.desired_roommates_min = finalRoommatesMin;
        profileUpdates.desired_roommates_max = finalRoommatesMax;
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
      isOwner && appearanceMode === 'both' ? 'any' : isOwner ? 'seeking' : 'any';
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
    setSelectedZoneOptions([]);
    setZoneCityById({});
    setAgeMin(DEFAULT_AGE_MIN);
    setAgeMax(DEFAULT_AGE_MAX);
    setRoommatesMin(DEFAULT_ROOMMATES_MIN);
    setRoommatesMax(DEFAULT_ROOMMATES_MAX);
  };

  const availableHousingOptions = useMemo(() => {
    if (!isOwner) return HOUSING_OPTIONS;
    if (appearanceMode === 'owner-only') {
      return HOUSING_OPTIONS.filter((option) => option.id === 'seeking');
    }
    return HOUSING_OPTIONS;
  }, [appearanceMode, isOwner]);

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
        { text: 'Hacerme Premium', onPress: () => navigation.navigate('Subscription') },
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
              name={isPremium ? 'sparkles' : 'sparkles-outline'}
              size={20}
              color={isPremium ? theme.colors.primary : '#6B7280'}
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
            onPress={() => navigation.navigate('Subscription')}
          >
            <Text style={styles.premiumButtonText}>
              {isPremium ? 'Gestionar Premium' : 'Ser Premium'}
            </Text>
          </TouchableOpacity>
        </View>

        <LocationSelector
          selectedCities={selectedCities}
          onCitiesChange={(cities) => {
            setSelectedCities(cities);
            setDraft((prev) => ({
              ...prev,
              cities: cities.map((c) => c.id),
            }));
          }}
          selectedZones={draft.zones}
          onZonesChange={(zones) => {
            setDraft((prev) => ({
              ...prev,
              zones,
            }));
          }}
          zoneCityById={zoneCityById}
          onZoneCityMapChange={setZoneCityById}
          selectedZoneOptions={selectedZoneOptions}
          onSelectedZoneOptionsChange={setSelectedZoneOptions}
          showCities
          showZones
          recentZonesStorageKey="@filtersScreen_recentZones"
        />

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
            <FormSection title="Mostrar personas que" iconName="home-outline">
              <Text style={styles.label}>Ver perfiles: {housingLabel}</Text>
              <View style={styles.segmentRow} pointerEvents={isPremium ? 'auto' : 'none'}>
                {availableHousingOptions.map((option) => {
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
                <BudgetRangeSlider
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
                  showTicks
                  labels={[
                    `${BUDGET_MIN}`,
                    `${Math.round((BUDGET_MIN + BUDGET_MAX) / 2)}`,
                    `${BUDGET_MAX}+`,
                  ]}
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
                  <RoommatesRangeSlider
                    styles={styles}
                    minValue={roommatesMin}
                    maxValue={roommatesMax}
                    onDragStateChange={setIsDraggingRoommates}
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
              </FormSection>
            </View>
          </TouchableOpacity>
        ) : null}

        {showLifestyleFilters ? (
          <FormSection
            title="Estilo de vida"
            iconName="sparkles-outline"
            headerRight={
              <Ionicons
                name={isLifestyleCollapsed ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={theme.colors.textSecondary}
              />
            }
            onHeaderPress={() => setIsLifestyleCollapsed((prev) => !prev)}
          >
            {!isLifestyleCollapsed
              ? ESTILO_VIDA_GROUPS.map((group) => (
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
                                <Ionicons
                                  name="checkmark"
                                  size={14}
                                  color="#FFFFFF"
                                />
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
                ))
              : null}
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
