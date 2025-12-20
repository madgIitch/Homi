// src/screens/EditProfileScreen.tsx
import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  PanResponder,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '../theme/ThemeContext';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { TextArea } from '../components/TextArea';
import { ChipGroup } from '../components/ChipGroup';
import { FormSection } from '../components/FormSection';
import { profileService } from '../services/profileService';
import { profilePhotoService } from '../services/profilePhotoService';
import { AuthContext } from '../context/AuthContext';
import { INTERESES_OPTIONS, ZONAS_OPTIONS } from '../constants/swipeFilters';
import type {
  ProfileCreateRequest,
  HousingSituation,
  ProfilePhoto,
} from '../types/profile';

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
const DEFAULT_ROOMMATES = 1;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const snapToStep = (value: number) =>
  Math.round(value / BUDGET_STEP) * BUDGET_STEP;

export const EditProfileScreen: React.FC = () => {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);

  // Contexto de autenticacion
  const authContext = useContext(AuthContext);
  const handleAuthError = authContext?.handleAuthError;

  const navigation = useNavigation<StackNavigationProp<any>>();

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
  const [numCompaneros, setNumCompaneros] = useState('');
  const [presupuestoMin, setPresupuestoMin] = useState(DEFAULT_BUDGET_MIN);
  const [presupuestoMax, setPresupuestoMax] = useState(DEFAULT_BUDGET_MAX);
  const [profilePhotos, setProfilePhotos] = useState<ProfilePhoto[]>([]);
  const [photosLoading, setPhotosLoading] = useState(true);
  const [photoUploading, setPhotoUploading] = useState(false);

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
      setNumCompaneros(
        data.num_roommates_wanted != null
          ? String(data.num_roommates_wanted)
          : ''
      );
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

      let numCompanerosValue =
        numCompaneros && numCompaneros.trim()
          ? parseInt(numCompaneros, 10)
          : DEFAULT_ROOMMATES;
      if (!numCompaneros || Number.isNaN(numCompanerosValue)) {
        numCompanerosValue = DEFAULT_ROOMMATES;
        warnings.push(
          `Numero de companeros: se uso ${DEFAULT_ROOMMATES} por defecto.`
        );
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
        num_roommates_wanted: numCompanerosValue,
      };

      if (warnings.length > 0) {
        Alert.alert('Aviso', warnings.join('\n'));
      }

      await profileService.updateProfile(profileData);

      Alert.alert('Exito', 'Perfil actualizado correctamente', [
        {
          text: 'OK',
          onPress: () => {
            // Navegar de vuelta a ProfileDetailScreen
            navigation.replace('ProfileDetail');
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
      <View style={styles.header}>
        <Text style={[theme.typography.h2, { color: theme.colors.text }]}>
          Editar perfil
        </Text>
        <View style={styles.headerActions}>
          <Button
            title="Cancelar"
            onPress={() => {
              navigation.goBack();
            }}
            variant="tertiary"
            size="small"
          />
          <Button
            title="Guardar"
            onPress={handleSave}
            loading={loading}
            size="small"
          />
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Fotos de perfil */}
        <FormSection title="Fotos de perfil" iconName="images-outline">
          {photosLoading ? (
            <ActivityIndicator size="small" color="#7C3AED" />
          ) : (
            <View style={styles.photoGrid}>
              {profilePhotos.map((photo) => (
                <TouchableOpacity
                  key={photo.id}
                  style={styles.photoTile}
                  onPress={() => {
                    if (!photo.is_primary) {
                      handleSetPrimary(photo.id);
                    }
                  }}
                >
                  <Image source={{ uri: photo.signedUrl }} style={styles.photo} />
                  {photo.is_primary && (
                    <View style={styles.primaryBadge}>
                      <Text style={styles.primaryBadgeText}>Principal</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
              {profilePhotos.length < 10 && (
                <TouchableOpacity
                  style={[styles.photoTile, styles.addPhotoTile]}
                  onPress={handleAddPhoto}
                >
                  <Text style={styles.addPhotoText}>+</Text>
                  <Text style={styles.addPhotoLabel}>Agregar</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          {photoUploading && (
            <Text style={styles.photoUploadingText}>Subiendo foto...</Text>
          )}
          <Text style={styles.photoHint}>
            {profilePhotos.length}/10 fotos. Toca una foto para hacerla principal.
          </Text>
        </FormSection>

        {/* Informacion Personal - solo campos que existen en profiles */}
        <FormSection title="Informacion personal">
          <Input
            label="Nombre"
            value={nombre}
            onChangeText={setNombre}
            required
          />
          <TextArea
            label="Biografia"
            value={biografia}
            onChangeText={setBiografia}
            maxLength={500}
            placeholder="Cuentanos sobre ti..."
          />
        </FormSection>

        {/* Ocupacion */}
        <FormSection title="Ocupacion" iconName="briefcase-outline">
          <Text style={styles.switchLabel}>Selecciona tu situacion</Text>
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
              />
              <Input
                label="Campo de estudio"
                value={campoEstudio}
                onChangeText={setCampoEstudio}
              />
            </>
          )}
          {(occupationType === 'trabajo' || occupationType === 'mixto') && (
            <Input
              label="Lugar de trabajo"
              value={workplace}
              onChangeText={setWorkplace}
              placeholder="Empresa / Centro"
            />
          )}
        </FormSection>

        {/* Intereses */}
        <FormSection
          title="Intereses"
          iconName="heart-outline"
          required
          requiredLabel="(obligatorio)"
        >
          <ChipGroup
            label="Selecciona tus intereses"
            options={INTERESES_OPTIONS}
            selectedIds={intereses}
            onSelect={(id) => {
              setIntereses((prev) =>
                prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
              );
            }}
            multiline
          />
        </FormSection>

        {/* Estilo de Vida */}
        <FormSection title="Estilo de vida" iconName="person-outline">
          <ChipGroup
            label="Como describes tu estilo de vida?"
            options={ESTILO_VIDA_OPTIONS}
            selectedIds={estiloVida}
            onSelect={(id) => {
              setEstiloVida((prev) =>
                prev.includes(id)
                  ? prev.filter((interes) => interes !== id)
                  : [...prev, id]
              );
            }}
            multiline
          />
        </FormSection>

        {/* Situacion de Vivienda */}
        <FormSection
          title="Situacion de vivienda"
          iconName="location-outline"
          required
          requiredLabel="(obligatorio)"
        >
          <View style={styles.situacionContainer}>
            <Text style={styles.label}>Cual es tu situacion actual?</Text>
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
          <Input
            label="Numero de companeros que buscas"
            value={numCompaneros}
            onChangeText={setNumCompaneros}
            keyboardType="numeric"
          />
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
        </FormSection>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  photoTile: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  addPhotoTile: {
    borderStyle: 'dashed',
    borderWidth: 1.5,
    borderColor: '#C4B5FD',
    backgroundColor: '#F5F3FF',
  },
  addPhotoText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#7C3AED',
  },
  addPhotoLabel: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600',
    color: '#7C3AED',
  },
  primaryBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    right: 6,
    paddingVertical: 4,
    backgroundColor: 'rgba(124, 58, 237, 0.85)',
    borderRadius: 8,
  },
  primaryBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  photoHint: {
    marginTop: 10,
    fontSize: 12,
    color: '#6B7280',
  },
  photoUploadingText: {
    marginTop: 8,
    fontSize: 12,
    color: '#7C3AED',
    fontWeight: '600',
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 10,
  },
  switchRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  switchButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  switchButtonActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  switchButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  switchButtonTextActive: {
    color: '#FFFFFF',
  },
  budgetContainer: {
    marginTop: 8,
    marginBottom: 8,
  },
  budgetValues: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  budgetValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  situacionContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: '#1F2937',
  },
  situacionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  situacionButton: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  situacionButtonActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  situacionButtonText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#6B7280',
  },
  situacionButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  sliderTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E5E7EB',
  },
  sliderTrackActive: {
    position: 'absolute',
    height: 6,
    borderRadius: 3,
    backgroundColor: '#7C3AED',
  },
  sliderThumb: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#7C3AED',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    top: -7,
  },
  sliderTicks: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  sliderTick: {
    width: 2,
    height: 6,
    backgroundColor: '#D1D5DB',
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  sliderLabel: {
    fontSize: 11,
    color: '#6B7280',
  },
});

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
