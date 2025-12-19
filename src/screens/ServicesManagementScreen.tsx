import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../theme/ThemeContext';
import { Button } from '../components/Button';
import { Input } from '../components/Input';

const SERVICES_STORAGE_KEY = 'flatServices';

export const ServicesManagementScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation<StackNavigationProp<any>>();
  const [servicesText, setServicesText] = useState('');
  const [servicesPrice, setServicesPrice] = useState('');
  const [saving, setSaving] = useState(false);

  const loadServices = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(SERVICES_STORAGE_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored) as {
        servicesText?: string;
        servicesPrice?: string;
      };
      setServicesText(parsed.servicesText || '');
      setServicesPrice(parsed.servicesPrice || '');
    } catch (error) {
      console.error('Error cargando servicios:', error);
    }
  }, []);

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  const handleSave = async () => {
    try {
      setSaving(true);
      await AsyncStorage.setItem(
        SERVICES_STORAGE_KEY,
        JSON.stringify({
          servicesText: servicesText.trim(),
          servicesPrice: servicesPrice.trim(),
        })
      );
      Alert.alert('Exito', 'Servicios guardados');
      navigation.goBack();
    } catch (error) {
      console.error('Error guardando servicios:', error);
      Alert.alert('Error', 'No se pudieron guardar los servicios');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Servicios incluidos
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
          label="Servicios"
          value={servicesText}
          onChangeText={setServicesText}
          placeholder="Wifi, luz, agua..."
          helperText="Separalos por coma"
        />
        <Input
          label="Precio aproximado (EUR)"
          value={servicesPrice}
          onChangeText={setServicesPrice}
          keyboardType="numeric"
          placeholder="Opcional"
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
