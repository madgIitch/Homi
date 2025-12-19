// src/screens/EditProfileScreen.tsx
import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '../theme/ThemeContext';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { TextArea } from '../components/TextArea';
import { ChipGroup } from '../components/ChipGroup';
import { FormSection } from '../components/FormSection';
import { ImageUpload } from '../components/ImageUpload';
import { profileService } from '../services/profileService';
import { AuthContext } from '../context/AuthContext';
import type { ProfileCreateRequest, HousingSituation } from '../types/profile';

const INTERESES_OPTIONS = [
  { id: 'deportes', label: 'Deportes' },
  { id: 'musica', label: 'Musica' },
  { id: 'cine', label: 'Cine' },
  { id: 'arte', label: 'Arte' },
  { id: 'videojuegos', label: 'Videojuegos' },
  { id: 'gastronomia', label: 'Gastronomia' },
  { id: 'viajes', label: 'Viajes' },
  { id: 'literatura', label: 'Literatura' },
  { id: 'tecnologia', label: 'Tecnologia' },
  { id: 'moda', label: 'Moda' },
  { id: 'fotografia', label: 'Fotografia' },
  { id: 'naturaleza', label: 'Naturaleza' },
  { id: 'fiesta', label: 'Fiesta' },
  { id: 'series', label: 'Series' },
  { id: 'cocina', label: 'Cocina' },
  { id: 'teatro', label: 'Teatro' },
  { id: 'politica', label: 'Politica' },
  { id: 'activismo', label: 'Activismo' },
  { id: 'emprendimiento', label: 'Emprendimiento' },
];

const ZONAS_OPTIONS = [
  { id: 'casco_antiguo', label: 'Casco Antiguo' },
  { id: 'triana', label: 'Triana' },
  { id: 'los_remedios', label: 'Los Remedios' },
  { id: 'nervion', label: 'Nervion' },
  { id: 'san_pablo', label: 'San Pablo - Santa Justa' },
  { id: 'este_alcosa', label: 'Este - Alcosa - Torreblanca' },
  { id: 'cerro_amate', label: 'Cerro - Amate' },
  { id: 'sur', label: 'Sur' },
  { id: 'bellavista', label: 'Bellavista - La Palmera' },
  { id: 'macarena', label: 'Macarena' },
  { id: 'norte', label: 'Norte' },
  { id: 'viapol', label: 'Viapol' },
  { id: 'plantinar', label: 'El Plantinar' },
  { id: 'juncal', label: 'El Juncal' },
  { id: 'gran_plaza', label: 'Gran Plaza' },
  { id: 'otros', label: 'Otro/Alrededores' },
];

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
  const [ocupacion, setOcupacion] = useState('');
  const [universidad, setUniversidad] = useState('');
  const [campoEstudio, setCampoEstudio] = useState('');
  const [intereses, setIntereses] = useState<string[]>([]);
  const [estiloVida, setEstiloVida] = useState<string[]>([]);
  const [situacionVivienda, setSituacionVivienda] = useState<
    'busco_piso' | 'tengo_piso'
  >('busco_piso');
  const [zonas, setZonas] = useState<string[]>([]);
  const [numCompaneros, setNumCompaneros] = useState('');
  const [presupuestoMin, setPresupuestoMin] = useState('');
  const [presupuestoMax, setPresupuestoMax] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string>('');

  const loadProfile = useCallback(async () => {
    try {
      const data = await profileService.getProfile();

      if (!data) {
        // No hay perfil aun, pantalla vacia
        return;
      }

      // Solo cargar campos que existen en la tabla profiles
      console.log('[EditProfileScreen] Perfil recibido:', data);
      console.log('[EditProfileScreen] avatar_url:', data.avatar_url);
      setNombre(data.display_name || '');
      setBiografia(data.bio || '');
      setOcupacion(data.occupation || '');
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
      setPresupuestoMin(
        data.budget_min != null ? String(data.budget_min) : ''
      );
      setPresupuestoMax(
        data.budget_max != null ? String(data.budget_max) : ''
      );
      setAvatarUrl(data.avatar_url || '');
      console.log('[EditProfileScreen] avatarUrl state set to:', data.avatar_url || '');
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

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const housingSituation: HousingSituation =
        situacionVivienda === 'busco_piso' ? 'seeking' : 'offering';

      const scheduleId = estiloVida.find((id) => id.startsWith('schedule_'));
      const cleaningId = estiloVida.find((id) => id.startsWith('cleaning_'));
      const guestsId = estiloVida.find((id) => id.startsWith('guests_'));

      const profileData: Partial<ProfileCreateRequest> = {
        display_name: nombre,
        bio: biografia || undefined,
        occupation: ocupacion || undefined,
        university: universidad || undefined,
        field_of_study: campoEstudio || undefined,
        interests: intereses,
        lifestyle_preferences: {
          schedule: scheduleId ? lifestyleLabelById.get(scheduleId) : undefined,
          cleaning: cleaningId ? lifestyleLabelById.get(cleaningId) : undefined,
          guests: guestsId ? lifestyleLabelById.get(guestsId) : undefined,
        },
        housing_situation: housingSituation,
        preferred_zones: zonas,
        budget_min:
          presupuestoMin && presupuestoMin.trim()
            ? parseInt(presupuestoMin, 10)
            : undefined,
        budget_max:
          presupuestoMax && presupuestoMax.trim()
            ? parseInt(presupuestoMax, 10)
            : undefined,
        num_roommates_wanted:
          numCompaneros && numCompaneros.trim()
            ? parseInt(numCompaneros, 10)
            : undefined,
      };

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
        {/* Foto de perfil */}
        <FormSection>
          <View style={styles.avatarSection}>
            <ImageUpload
              currentImage={avatarUrl}
              onImageUploaded={(url) => setAvatarUrl(url)}
            />
          </View>
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
          <Input
            label="Ocupacion"
            value={ocupacion}
            onChangeText={setOcupacion}
            placeholder="Estudiante / Trabajador / Mixto"
          />
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
          <View style={styles.presupuestoRow}>
            <Input
              label="Presupuesto minimo"
              value={presupuestoMin}
              onChangeText={setPresupuestoMin}
              keyboardType="numeric"
              placeholder="200 EUR"
            />
            <Input
              label="Presupuesto maximo"
              value={presupuestoMax}
              onChangeText={setPresupuestoMax}
              keyboardType="numeric"
              placeholder="300 EUR"
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
  avatarSection: {
    alignItems: 'center',
    marginBottom: 8,
  },
  presupuestoRow: {
    flexDirection: 'row',
    gap: 16,
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
});
