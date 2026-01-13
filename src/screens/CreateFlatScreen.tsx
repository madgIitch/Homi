import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Alert,
  TouchableOpacity,
  ImageBackground,
  Dimensions,
  Keyboard,
  UIManager,
  findNodeHandle,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { Input } from '../components/Input';
import { ChipGroup } from '../components/ChipGroup';
import { AuthContext } from '../context/AuthContext';
import { roomService } from '../services/roomService';
import { profileService } from '../services/profileService';
import { locationService } from '../services/locationService';
import type { GenderPolicy } from '../types/room';
import type { Gender } from '../types/gender';
import { CreateFlatScreenStyles as styles } from '../styles/screens';
import LinearGradient from 'react-native-linear-gradient';
import { colors, spacing } from '../theme';
import { BlurView } from '@react-native-community/blur';
import Ionicons from 'react-native-vector-icons/Ionicons';

type LocationOption = { id: string; label: string };

export const CreateFlatScreen: React.FC = () => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<StackNavigationProp<any>>();
  const scrollRef = useRef<ScrollView>(null);
  const focusedInputHandle = useRef<number | null>(null);
  const keyboardHeightRef = useRef(0);
  const keyboardTopRef = useRef(Dimensions.get('window').height);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollYRef = useRef(0);
  const authContext = useContext(AuthContext);
  const userGender = authContext?.user?.gender ?? null;
  const [profileGender, setProfileGender] = useState<Gender | null>(null);
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState<string | null>(null);
  const [cityQuery, setCityQuery] = useState('');
  const [cities, setCities] = useState<LocationOption[]>([]);
  const [isLoadingCities, setIsLoadingCities] = useState(false);
  const [selectedCity, setSelectedCity] = useState<LocationOption | null>(null);
  const [placeQuery, setPlaceQuery] = useState('');
  const [places, setPlaces] = useState<LocationOption[]>([]);
  const [topPlaces, setTopPlaces] = useState<LocationOption[]>([]);
  const [isLoadingPlaces, setIsLoadingPlaces] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<LocationOption | null>(null);
  const [genderPolicy, setGenderPolicy] = useState<GenderPolicy>('mixed');
  const [saving, setSaving] = useState(false);

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

  useEffect(() => {
    let isMounted = true;
    const loadProfileGender = async () => {
      try {
        const profile = await profileService.getProfile();
        if (isMounted) {
          setProfileGender(profile?.gender ?? null);
        }
      } catch (error) {
        console.error('Error cargando perfil:', error);
      }
    };

    void loadProfileGender();
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
          data.map((item) => ({
            id: item.id,
            label: item.name,
          }))
        );
      } catch (error) {
        console.error('[CreateFlat] Error cargando ciudades:', error);
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
        console.error('[CreateFlat] Error cargando zonas:', error);
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

  const resolvedGender = profileGender ?? userGender;
  const allowedPolicies = useMemo(() => {
    if (resolvedGender === 'male') {
      return new Set<GenderPolicy>(['men_only', 'mixed']);
    }
    if (!resolvedGender || resolvedGender === 'undisclosed') {
      return new Set<GenderPolicy>(['men_only', 'mixed', 'flinta']);
    }
    return new Set<GenderPolicy>(['flinta', 'mixed']);
  }, [resolvedGender]);

  const cityOptions = useMemo(() => {
    const options = [...cities];
    if (selectedCity && !options.some((item) => item.id === selectedCity.id)) {
      options.unshift(selectedCity);
    }
    return options;
  }, [cities, selectedCity]);

  const placeOptions = useMemo(() => {
    const base =
      placeQuery.trim().length >= 2 ? places : topPlaces;
    const options = [...base];
    if (selectedPlace && !options.some((item) => item.id === selectedPlace.id)) {
      options.unshift(selectedPlace);
    }
    return options;
  }, [placeQuery, places, topPlaces, selectedPlace]);

  const showCityOptions =
    cityQuery.trim().length >= 2 || Boolean(selectedCity);

  const selectPolicy = (policy: GenderPolicy) => {
    if (!allowedPolicies.has(policy)) {
      Alert.alert(
        'Restriccion',
        'Esta opcion no esta disponible segun tu genero.'
      );
      return;
    }
    setGenderPolicy(policy);
  };

  const handleSave = async () => {
    const addressValue = address.trim();
    if (!addressValue) {
      Alert.alert('Error', 'Direccion es obligatoria');
      return;
    }
    if (!selectedCity) {
      Alert.alert('Error', 'Selecciona una ciudad');
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

    const cityValue = selectedCity.label;
    const districtValue = selectedPlace.label;
    setCity(cityValue);
    setDistrict(districtValue);

    try {
      setSaving(true);
      await roomService.createFlat({
        address: addressValue,
        city: cityValue,
        city_id: selectedCity.id,
        district: districtValue,
        place_id: selectedPlace.id,
        gender_policy: genderPolicy,
      });
      try {
        await locationService.trackPlaceSearches(
          selectedCity.id,
          [selectedPlace.id]
        );
      } catch (error) {
        console.warn('[CreateFlat] Error guardando contadores:', error);
      }
      Alert.alert('Exito', 'Piso creado');
      navigation.goBack();
    } catch (error) {
      console.error('Error creando piso:', error);
      Alert.alert('Error', 'No se pudo crear el piso');
    } finally {
      setSaving(false);
    }
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
          Crear piso
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
        <Input
          label="Direccion"
          value={address}
          onChangeText={setAddress}
          onFocus={handleInputFocus}
          required
        />
        <Input
          label="Buscar ciudad"
          value={cityQuery}
          onChangeText={setCityQuery}
          onFocus={handleInputFocus}
          placeholder="Escribe al menos 2 letras"
          required
        />
        {showCityOptions ? (
          <>
            {isLoadingCities ? (
              <Text style={styles.sectionHint}>Cargando ciudades...</Text>
            ) : null}
            <ChipGroup
              label="Ciudad"
              options={cityOptions}
              selectedIds={selectedCity ? [selectedCity.id] : []}
              onSelect={(id) => {
                if (selectedCity?.id === id) {
                  setSelectedCity(null);
                  setSelectedPlace(null);
                  setCity('');
                  setDistrict(null);
                  setCityQuery('');
                  setPlaceQuery('');
                  setPlaces([]);
                  setTopPlaces([]);
                  return;
                }
                const selected = cityOptions.find((item) => item.id === id) || null;
                setSelectedCity(selected);
                setSelectedPlace(null);
                setCity(selected?.label ?? '');
                setDistrict(null);
                setCityQuery('');
                setPlaceQuery('');
                setPlaces([]);
                setTopPlaces([]);
              }}
              multiline
            />
          </>
        ) : (
          <Text style={styles.sectionHint}>Escribe para buscar ciudades.</Text>
        )}
        {selectedCity ? (
          <>
            <Input
              label="Buscar zona"
              value={placeQuery}
              onChangeText={setPlaceQuery}
              onFocus={handleInputFocus}
              placeholder="Escribe al menos 2 letras"
              required
            />
            {isLoadingPlaces ? (
              <Text style={styles.sectionHint}>Cargando zonas...</Text>
            ) : null}
            <ChipGroup
              label={placeQuery.trim().length >= 2 ? 'Resultados' : 'Sugerencias'}
              options={placeOptions}
              selectedIds={selectedPlace ? [selectedPlace.id] : []}
              onSelect={(id) => {
                if (selectedPlace?.id === id) {
                  setSelectedPlace(null);
                  setDistrict(null);
                  return;
                }
                const selected =
                  placeOptions.find((item) => item.id === id) || null;
                setSelectedPlace(selected);
                setDistrict(selected?.label ?? null);
                setPlaceQuery('');
              }}
              multiline
            />
          </>
        ) : null}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tipo de convivencia</Text>
          <View style={styles.segmentRow}>
            {[
              { id: 'mixed' as const, label: 'Mixto' },
              { id: 'men_only' as const, label: 'Solo hombres' },
              { id: 'flinta' as const, label: 'FLINTA' },
            ].map((option) => {
              const isActive = genderPolicy === option.id;
              const isDisabled = !allowedPolicies.has(option.id);
              return (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.segmentButton,
                    isActive && styles.segmentButtonActive,
                    isDisabled && styles.segmentButtonDisabled,
                  ]}
                  onPress={() => selectPolicy(option.id)}
                  disabled={isDisabled}
                >
                  <Text
                    style={[
                      styles.segmentButtonText,
                      isActive && styles.segmentButtonTextActive,
                      isDisabled && styles.segmentButtonTextDisabled,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={styles.sectionHint}>
            FLINTA: mujeres, personas no binarias y otras identidades; hombres no.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};


