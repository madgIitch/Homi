// src/screens/EditProfileScreen.tsx  
import React, { useState } from 'react';  
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';  
import { useTheme } from '../theme/ThemeContext';  
import { Button } from '../components/Button';  
import { Input } from '../components/Input';  
import { TextArea } from '../components/TextArea';  
import { ChipGroup } from '../components/ChipGroup';  
import { FormSection } from '../components/FormSection';  
  
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
  const [situacionVivienda, _setSituacionVivienda] = useState('busco_piso');  
  const [zonas, setZonas] = useState<string[]>([]);  
  const [numCompaneros, setNumCompaneros] = useState('');  
  const [presupuestoMin, setPresupuestoMin] = useState('');  
  const [presupuestoMax, setPresupuestoMax] = useState('');  
  
  const handleSave = async () => {  
    setLoading(true);  
    try {  
      // Lógica para guardar el perfil  
      // Integración con entidades PROFILE, HABITACION, PISO [12-cite-0](#12-cite-0)   
      Alert.alert('Éxito', 'Perfil actualizado correctamente');  
    } catch {  
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
          <Input  
            label="¿Cuál es tu situación actual?"  
            value={situacionVivienda === 'busco_piso' ? 'Busco piso' : 'Tengo piso'}  
            onChangeText={() => {}}  
            editable={false}  
          />  
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
  presupuestoRow: {  
    flexDirection: 'row',  
    gap: 16,  
  },  
});