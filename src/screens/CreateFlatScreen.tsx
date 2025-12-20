import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '../theme/ThemeContext';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { ChipGroup } from '../components/ChipGroup';
import { roomService } from '../services/roomService';
import { ZONES_OPTIONS } from '../constants/zones';

export const CreateFlatScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation<StackNavigationProp<any>>();
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const addressValue = address.trim();
    const cityValue = city.trim();
    if (!addressValue || !cityValue) {
      Alert.alert('Error', 'Direccion y ciudad son obligatorias');
      return;
    }
    if (!district) {
      Alert.alert('Error', 'Selecciona un distrito');
      return;
    }

    try {
      setSaving(true);
      await roomService.createFlat({
        address: addressValue,
        city: cityValue,
        district: district,
      });
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
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Crear piso
        </Text>
        <View style={styles.headerActions}>
          <Button
            title="Cancelar"
            onPress={() => navigation.goBack()}
            variant="tertiary"
            size="small"
          />
          <Button
            title="Guardar"
            onPress={handleSave}
            size="small"
            loading={saving}
          />
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Input
          label="Direccion"
          value={address}
          onChangeText={setAddress}
          required
        />
        <Input label="Ciudad" value={city} onChangeText={setCity} required />
        <ChipGroup
          label="Distrito"
          options={ZONES_OPTIONS}
          selectedIds={district ? [district] : []}
          onSelect={(id) => {
            setDistrict((prev) => (prev === id ? null : id));
          }}
          multiline
        />
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  content: {
    flex: 1,
    padding: 20,
  },
});
