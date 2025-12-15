// src/screens/EditProfileScreen.tsx        
import React, { useState, useEffect } from 'react';        
import { View, Text, ScrollView, StyleSheet, Alert, TouchableOpacity } from 'react-native';        
import { useTheme } from '../theme/ThemeContext';        
import { Button } from '../components/Button';        
import { Input } from '../components/Input';        
import { TextArea } from '../components/TextArea';        
import { ChipGroup } from '../components/ChipGroup';        
import { FormSection } from '../components/FormSection';        
import { ImageUpload } from '../components/ImageUpload';      
import { profileService } from '../services/profileService';
 
  
const INTERESES_OPTIONS = [        
  { id: 'deportes', label: 'Deportes' },        
  { id: 'musica', label: 'Música' },        
  { id: 'cine', label: 'Cine' },        
  { id: 'arte', label: 'Arte' },        
  { id: 'videojuegos', label: 'Videojuegos' },        
  { id: 'gastronomia', label: 'Gastronomía' },        
  { id: 'viajes', label: 'Viajes' },        
];        
        
const ZONAS_OPTIONS = [        
  { id: 'casco_antiguo', label: 'Casco Antiguo' },        
  { id: 'triana', label: 'Triana' },        
  { id: 'nervion', label: 'Nervión' },        
  { id: 'viapol', label: 'Viapol' },        
  { id: 'plantinar', label: 'El Plantinar' },        
  { id: 'juncal', label: 'El Juncal' },        
];        
        
const ESTILO_VIDA_OPTIONS = [        
  { id: 'muy_ordenado', label: 'Muy ordenado/a' },        
  { id: 'flexible', label: 'Flexible' },        
  { id: 'no_fuma', label: 'No fuma' },        
  { id: 'sin_mascotas', label: 'Sin mascotas' },        
  { id: 'sin_invitados', label: 'Sin problema invitados' },        
];        
        
export const EditProfileScreen: React.FC = () => {        
  const theme = useTheme();        
  const [loading, setLoading] = useState(false);        
          
  // Estados del formulario        
  const [nombre, setNombre] = useState('');        
  const [apellidos, setApellidos] = useState('');        
  const [username, setUsername] = useState('');        
  const [edad, setEdad] = useState('');      
  const [biografia, setBiografia] = useState('');        
  const [ocupacion, setOcupacion] = useState('');        
  const [universidad, setUniversidad] = useState('');        
  const [campoEstudio, setCampoEstudio] = useState('');        
  const [intereses, setIntereses] = useState<string[]>([]);        
  const [estiloVida, setEstiloVida] = useState<string[]>([]);        
  const [situacionVivienda, setSituacionVivienda] = useState('busco_piso');        
  const [zonas, setZonas] = useState<string[]>([]);        
  const [numCompaneros, setNumCompaneros] = useState('');        
  const [presupuestoMin, setPresupuestoMin] = useState('');        
  const [presupuestoMax, setPresupuestoMax] = useState('');        
  const [avatarUrl, setAvatarUrl] = useState<string>('');        
  
  useEffect(() => {        
    loadProfile();        
  }, []);        
        
  const loadProfile = async () => {
    try {
      const data = await profileService.getProfile();

      if (!data) {
        // No hay perfil aún, pantalla vacía
        return;
      }

      setNombre(data.display_name || '');
      setApellidos(data.last_name || '');
      setUsername(data.username || '');
      setEdad(data.age ? String(data.age) : '');
      setBiografia(data.bio || '');
      setOcupacion(data.occupation || '');
      setUniversidad(data.university || '');
      setCampoEstudio(data.field_of_study || '');
      setIntereses(data.interests || []);
      setEstiloVida(
        data.lifestyle_preferences
          ? Object.values(data.lifestyle_preferences)
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
    } catch (error) {
      console.error('Error cargando perfil:', error);
    }
  };       
      
  const handleSave = async () => {
    setLoading(true);
    try {
      const profileData = {
        display_name: nombre,
        last_name: apellidos || undefined,
        username: username,
        age: edad ? parseInt(edad, 10) : undefined,
        bio: biografia || undefined,
        occupation: ocupacion || undefined,
        university: universidad || undefined,
        field_of_study: campoEstudio || undefined,
        intereses,
        lifestyle_preferences: {
          schedule: estiloVida.find((id) => id.includes('horario')),
          cleaning: estiloVida.find((id) => id.includes('ordenado')),
          guests: estiloVida.find((id) => id.includes('invitados')),
        },
        housing_situation:
          situacionVivienda === 'busco_piso' ? 'seeking' : 'offering',
        preferred_zones: zonas,
        budget_min: presupuestoMin ? parseInt(presupuestoMin, 10) : undefined,
        budget_max: presupuestoMax ? parseInt(presupuestoMax, 10) : undefined,
        num_roommates_wanted: numCompaneros
          ? parseInt(numCompaneros, 10)
          : undefined,
        avatar_url: avatarUrl || undefined,
      };

      await profileService.updateProfile(profileData);

      Alert.alert('Éxito', 'Perfil actualizado correctamente');
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
            onPress={() => {}}        
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
        <FormSection title="">      
          <View style={styles.avatarSection}>      
            <ImageUpload       
              currentImage={avatarUrl}      
              onImageUploaded={(url) => setAvatarUrl(url)}      
            />      
          </View>      
        </FormSection>      
      
        {/* Información Personal */}        
        <FormSection title="Información personal">        
          <Input        
            label="Nombre"        
            value={nombre}        
            onChangeText={setNombre}        
            required        
          />        
          <Input        
            label="Apellidos"        
            value={apellidos}        
            onChangeText={setApellidos}        
          />        
          <Input        
            label="Nombre de usuario"        
            value={username}        
            onChangeText={setUsername}        
            required        
          />        
          <Input        
            label="Edad"        
            value={edad}        
            onChangeText={setEdad}        
            keyboardType="numeric"        
            required        
          />        
          <TextArea        
            label="Biografía"        
            value={biografia}        
            onChangeText={setBiografia}        
            maxLength={500}        
            placeholder="Cuéntanos sobre ti..."        
          />        
        </FormSection>        
        
        {/* Ocupación y Estudios */}        
        <FormSection title="Ocupación y estudios">        
          <Input        
            label="Ocupación"        
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
        <FormSection title="Intereses">        
          <ChipGroup        
            label="Selecciona tus intereses"        
            options={INTERESES_OPTIONS}        
            selectedIds={intereses}        
            onSelect={(id) => {        
              setIntereses(prev =>        
                prev.includes(id)        
                  ? prev.filter(i => i !== id)        
                  : [...prev, id]        
              );        
            }}        
            multiline        
          />        
        </FormSection>        
        
        {/* Estilo de Vida */}        
        <FormSection title="Estilo de vida">        
          <ChipGroup        
            label="¿Cómo describes tu estilo de vida?"        
            options={ESTILO_VIDA_OPTIONS}        
            selectedIds={estiloVida}        
            onSelect={(id) => {        
              setEstiloVida(prev =>        
                prev.includes(id)        
                  ? prev.filter(i => i !== id)        
                  : [...prev, id]        
              );        
            }}        
            multiline        
          />        
        </FormSection>        
        
        {/* Situación de Vivienda */}        
        <FormSection title="Situación de vivienda">        
          <View style={styles.situacionContainer}>      
            <Text style={styles.label}>¿Cuál es tu situación actual?</Text>      
            <View style={styles.situacionButtons}>      
              <TouchableOpacity      
                style={[      
                  styles.situacionButton,      
                  situacionVivienda === 'busco_piso' && styles.situacionButtonActive      
                ]}      
                onPress={() => setSituacionVivienda('busco_piso')}      
              >      
                <Text style={[      
                  styles.situacionButtonText,      
                  situacionVivienda === 'busco_piso' && styles.situacionButtonTextActive      
                ]}>      
                  Busco piso      
                </Text>      
              </TouchableOpacity>      
              <TouchableOpacity      
                style={[      
                  styles.situacionButton,      
                  situacionVivienda === 'tengo_piso' && styles.situacionButtonActive      
                ]}      
                onPress={() => setSituacionVivienda('tengo_piso')}      
              >      
                <Text style={[      
                  styles.situacionButtonText,      
                  situacionVivienda === 'tengo_piso' && styles.situacionButtonTextActive      
                ]}>      
                  Tengo piso      
                </Text>      
              </TouchableOpacity>      
            </View>      
          </View>        
          <Input        
            label="Número de compañeros que buscas"        
            value={numCompaneros}        
            onChangeText={setNumCompaneros}        
            keyboardType="numeric"        
          />        
          <View style={styles.presupuestoRow}>        
            <Input        
              label="Presupuesto mínimo"        
              value={presupuestoMin}        
              onChangeText={setPresupuestoMin}        
              keyboardType="numeric"        
              placeholder="200€"        
            />        
            <Input        
              label="Presupuesto máximo"        
              value={presupuestoMax}        
              onChangeText={setPresupuestoMax}        
              keyboardType="numeric"        
              placeholder="300€"        
            />        
          </View>        
          <ChipGroup        
            label="Zonas de interés"        
            options={ZONAS_OPTIONS}        
            selectedIds={zonas}        
            onSelect={(id) => {        
              setZonas(prev =>        
                prev.includes(id)        
                  ? prev.filter(z => z !== id)        
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
    backgroundColor: '#FFFFFF',        
  },        
  header: {        
    flexDirection: 'row',        
    justifyContent: 'space-between',        
    alignItems: 'center',        
    paddingHorizontal: 24,        
    paddingVertical: 16,        
    borderBottomWidth: 1,        
    borderBottomColor: '#E5E7EB',        
  },        
  headerActions: {        
    flexDirection: 'row',        
    gap: 8,        
  },        
  content: {        
    flex: 1,        
    padding: 24,        
  },        
  avatarSection: {      
    alignItems: 'center',      
    marginBottom: 16,      
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
    borderRadius: 8,      
    borderWidth: 1,      
    borderColor: '#E5E7EB',      
    backgroundColor: '#FFFFFF',      
  },      
  situacionButtonActive: {      
    backgroundColor: '#6B46C1',      
    borderColor: '#6B46C1',      
  },      
  situacionButtonText: {      
    textAlign: 'center',      
    fontSize: 14,      
    color: '#6B7280',      
  },      
  situacionButtonTextActive: {      
    color: '#FFFFFF',      
  },      
});