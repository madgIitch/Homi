// src/screens/EditProfileScreen.tsx
import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Alert,
  TouchableOpacity,
  Image,
  ImageBackground,
  ActivityIndicator,
  PanResponder,
  StyleSheet,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary } from 'react-native-image-picker';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '../theme/ThemeContext';
import { BlurView } from '@react-native-community/blur';
import LinearGradient from 'react-native-linear-gradient';
import { colors } from '../theme';
import { Input } from '../components/Input';
import { TextArea } from '../components/TextArea';
import { ChipGroup } from '../components/ChipGroup';
import { profileService } from '../services/profileService';
import { profilePhotoService } from '../services/profilePhotoService';
import { AuthContext } from '../context/AuthContext';
import { useSwipeFilters } from '../context/SwipeFiltersContext';
import { INTERESES_OPTIONS, ZONAS_OPTIONS } from '../constants/swipeFilters';
import type {
  ProfileCreateRequest,
  HousingSituation,
  ProfilePhoto,
} from '../types/profile';
import { EditProfileScreenStyles as styles } from '../styles/screens';

const ESTILO_VIDA_OPTIONS = [
  { id: 'schedule_flexible', label: 'Flexible' },
  { id: 'cleaning_muy_limpio', label: 'Muy limpio' },
  { id: 'guests_algunos', label: 'Algunos invitados' },
];

const lifestyleLabelById = new Map(
  ESTILO_VIDA_OPTIONS.map((option) => [option.id, option.label])
);

const lifestyleIdByLabel = new Map(
  ESTILO_VIDA_OPTIONS.map((option) => [option.label, option.id])
);

const BUDGET_MIN = 0;
const BUDGET_MAX = 1200;
const BUDGET_STEP = 25;
const DEFAULT_BUDGET_MIN = 300;
const DEFAULT_BUDGET_MAX = 600;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const snapToStep = (value: number) =>
  Math.round(value / BUDGET_STEP) * BUDGET_STEP;

export const EditProfileScreen: React.FC = () => {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const pillInputStyle = {
    borderRadius: 999,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  };

  // Contexto de autenticacion
  const authContext = useContext(AuthContext);
  const handleAuthError = authContext?.handleAuthError;

  const navigation = useNavigation<StackNavigationProp<any>>();
  const { setFilters, filters } = useSwipeFilters();

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
  const [zonas, setZonas] = useState<string[]>([]);
  const [presupuestoMin, setPresupuestoMin] = useState(DEFAULT_BUDGET_MIN);
  const [presupuestoMax, setPresupuestoMax] = useState(DEFAULT_BUDGET_MAX);
  const [profilePhotos, setProfilePhotos] = useState<ProfilePhoto[]>([]);
  const [photosLoading, setPhotosLoading] = useState(true);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoDeletingId, setPhotoDeletingId] = useState<string | null>(null);
  const primaryPhoto =
    profilePhotos.find((photo) => photo.is_primary) ?? profilePhotos[0];

  const loadProfile = useCallback(async () => {
    try {
      const data = await profileService.getProfile();

      if (!data) {
        // No hay perfil aun, pantalla vacia
        return;
      }

      // Solo cargar campos que existen en la tabla profiles
      setNombre(data.display_name || '');
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
      setZonas(data.preferred_zones || []);
      const nextMin =
        data.budget_min != null ? data.budget_min : DEFAULT_BUDGET_MIN;
      const nextMax =
        data.budget_max != null ? data.budget_max : DEFAULT_BUDGET_MAX;
      setPresupuestoMin(
        clamp(snapToStep(nextMin), BUDGET_MIN, BUDGET_MAX)
      );
      setPresupuestoMax(
        clamp(snapToStep(nextMax), BUDGET_MIN, BUDGET_MAX)
      );
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

      const interesesFinal =
        intereses.length > 0 ? intereses : [defaultInteres];
      if (interesesFinal.length === 1 && intereses.length === 0) {
        warnings.push('Intereses: se selecciono un interes por defecto.');
      }

      let presupuestoMinValue = presupuestoMin ?? DEFAULT_BUDGET_MIN;
      let presupuestoMaxValue = presupuestoMax ?? DEFAULT_BUDGET_MAX;
      if (presupuestoMinValue === DEFAULT_BUDGET_MIN && presupuestoMin == null) {
        warnings.push(
          `Presupuesto minimo: se uso ${DEFAULT_BUDGET_MIN} por defecto.`
        );
      }
      if (presupuestoMaxValue === DEFAULT_BUDGET_MAX && presupuestoMax == null) {
        warnings.push(
          `Presupuesto maximo: se uso ${DEFAULT_BUDGET_MAX} por defecto.`
        );
      }
      if (presupuestoMinValue > presupuestoMaxValue) {
        warnings.push('Presupuesto: el minimo era mayor al maximo, se ajusto.');
        const temp = presupuestoMinValue;
        presupuestoMinValue = presupuestoMaxValue;
        presupuestoMaxValue = temp;
      }

      const housingSituation: HousingSituation =
        situacionVivienda === 'busco_piso' ? 'seeking' : 'offering';

      const scheduleId = estiloVida.find((id) => id.startsWith('schedule_'));
      const cleaningId = estiloVida.find((id) => id.startsWith('cleaning_'));
      const guestsId = estiloVida.find((id) => id.startsWith('guests_'));

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
        display_name: nombreFinal,
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
        },
        housing_situation: housingSituation,
        preferred_zones: zonas,
        budget_min: presupuestoMinValue,
        budget_max: presupuestoMaxValue,
      };

      if (warnings.length > 0) {
        Alert.alert('Aviso', warnings.join('\n'));
      }

      await profileService.updateProfile(profileData);
      await setFilters({
        housingSituation,
        gender: filters.gender,
        budgetMin: presupuestoMinValue,
        budgetMax: presupuestoMaxValue,
        zones: zonas,
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
      <View style={styles.header}>
        <BlurView
          blurType="light"
          blurAmount={16}
          reducedTransparencyFallbackColor={colors.glassOverlay}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.headerFill} />
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Editar perfil
        </Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="close" size={18} color="#111827" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={handleSave}
            disabled={loading}
          >
            <Ionicons name="checkmark" size={20} color="#7C3AED" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.profileHeader}>
          <View style={styles.avatarShell}>
            {primaryPhoto?.signedUrl ? (
              <Image source={{ uri: primaryPhoto.signedUrl }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={28} color="#9CA3AF" />
              </View>
            )}
            <TouchableOpacity style={styles.avatarEdit} onPress={handleAddPhoto}>
              <Ionicons name="create-outline" size={16} color="#111827" />
            </TouchableOpacity>
          </View>
          <Text style={styles.profileHint}>Actualiza tu foto principal</Text>
        </View>

        {/* Fotos de perfil */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitleMuted}>Fotos</Text>
          <View style={styles.sectionCard}>
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
            <Ionicons name="images-outline" size={16} color="#111827" />
            <Text style={styles.editPhotosText}>Editar fotos</Text>
          </TouchableOpacity>
          </View>
        </View>

        {/* Informacion Personal - solo campos que existen en profiles */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitleMuted}>Perfil</Text>
          <View style={styles.sectionCard}>
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
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.switchButton,
                    isActive && styles.switchButtonActive,
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
                      isActive && styles.switchButtonTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
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

        {/* Intereses */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitleMuted}>Preferencias</Text>
          <View style={styles.sectionCard}>
          <Text style={styles.inlineLabel}>Intereses (obligatorio)</Text>
          <View style={styles.checkGrid}>
            {INTERESES_OPTIONS.map((option) => {
              const isActive = intereses.includes(option.id);
              return (
                <TouchableOpacity
                  key={option.id}
                  style={[styles.checkItem, isActive && styles.checkItemActive]}
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
                      isActive && styles.checkBoxActive,
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
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={styles.inlineLabel}>Estilo de vida</Text>
          <View style={styles.checkGrid}>
            {ESTILO_VIDA_OPTIONS.map((option) => {
              const isActive = estiloVida.includes(option.id);
              return (
                <TouchableOpacity
                  key={option.id}
                  style={[styles.checkItem, isActive && styles.checkItemActive]}
                  onPress={() =>
                    setEstiloVida((prev) =>
                      prev.includes(option.id)
                        ? prev.filter((interes) => interes !== option.id)
                        : [...prev, option.id]
                    )
                  }
                >
                  <View
                    style={[
                      styles.checkBox,
                      isActive && styles.checkBoxActive,
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
                </TouchableOpacity>
              );
            })}
          </View>
          </View>
        </View>

        {/* Situacion de Vivienda */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitleMuted}>Vivienda</Text>
          <View style={styles.sectionCard}>
          <View style={styles.situacionContainer}>
            <Text style={styles.label}>Situacion actual</Text>
            <View style={styles.situacionButtons}>
              <TouchableOpacity
                style={[
                  styles.situacionButton,
                  situacionVivienda === 'busco_piso' &&
                    styles.situacionButtonActive,
                ]}
                onPress={() => setSituacionVivienda('busco_piso')}
              >
                <Text
                  style={[
                    styles.situacionButtonText,
                    situacionVivienda === 'busco_piso' &&
                      styles.situacionButtonTextActive,
                  ]}
                >
                  Busco piso
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.situacionButton,
                  situacionVivienda === 'tengo_piso' &&
                    styles.situacionButtonActive,
                ]}
                onPress={() => setSituacionVivienda('tengo_piso')}
              >
                <Text
                  style={[
                    styles.situacionButtonText,
                    situacionVivienda === 'tengo_piso' &&
                      styles.situacionButtonTextActive,
                  ]}
                >
                  Tengo piso
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.budgetContainer}>
            <Text style={styles.label}>Presupuesto mensual</Text>
            <View style={styles.budgetValues}>
              <Text style={styles.budgetValue}>
                Min: {presupuestoMin} EUR
              </Text>
              <Text style={styles.budgetValue}>
                Max: {presupuestoMax} EUR
              </Text>
            </View>
            <BudgetRange
              minValue={presupuestoMin}
              maxValue={presupuestoMax}
              onChangeMin={setPresupuestoMin}
              onChangeMax={setPresupuestoMax}
            />
          </View>
          <ChipGroup
            label="Zonas de interes"
            options={ZONAS_OPTIONS}
            selectedIds={zonas}
            onSelect={(id) => {
              setZonas((prev) =>
                prev.includes(id)
                  ? prev.filter((zona) => zona !== id)
                  : [...prev, id]
              );
            }}
            multiline
          />
          </View>
        </View>
      </ScrollView>
    </View>
  );
};


const BudgetRange: React.FC<{
  minValue: number;
  maxValue: number;
  onChangeMin: (value: number) => void;
  onChangeMax: (value: number) => void;
}> = ({ minValue, maxValue, onChangeMin, onChangeMax }) => {
  const [trackWidth, setTrackWidth] = useState(0);
  const minStartRef = React.useRef(0);
  const maxStartRef = React.useRef(0);
  const minValueRef = React.useRef(minValue);
  const maxValueRef = React.useRef(maxValue);

  useEffect(() => {
    minValueRef.current = minValue;
    maxValueRef.current = maxValue;
  }, [minValue, maxValue]);

  const valueToX = (value: number) => {
    if (!trackWidth) return 0;
    return ((value - BUDGET_MIN) / (BUDGET_MAX - BUDGET_MIN)) * trackWidth;
  };

  const xToValue = (x: number) => {
    const raw = BUDGET_MIN + (x / trackWidth) * (BUDGET_MAX - BUDGET_MIN);
    return clamp(snapToStep(raw), BUDGET_MIN, BUDGET_MAX);
  };

  const minPanResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        minStartRef.current = valueToX(minValueRef.current);
      },
      onPanResponderMove: (_, gesture) => {
        if (!trackWidth) return;
        const nextX = clamp(
          minStartRef.current + gesture.dx,
          0,
          valueToX(maxValueRef.current)
        );
        onChangeMin(xToValue(nextX));
      },
    })
  ).current;

  const maxPanResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        maxStartRef.current = valueToX(maxValueRef.current);
      },
      onPanResponderMove: (_, gesture) => {
        if (!trackWidth) return;
        const nextX = clamp(
          maxStartRef.current + gesture.dx,
          valueToX(minValueRef.current),
          trackWidth
        );
        onChangeMax(xToValue(nextX));
      },
    })
  ).current;

  const minX = valueToX(minValue);
  const maxX = valueToX(maxValue);
  const ticks = Math.floor((BUDGET_MAX - BUDGET_MIN) / BUDGET_STEP);

  return (
    <View
      onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
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
        {...minPanResponder.panHandlers}
      />
      <View
        style={[styles.sliderThumb, { left: maxX - 10 }]}
        {...maxPanResponder.panHandlers}
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

