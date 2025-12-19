import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../theme/ThemeContext';
import { Button } from '../components/Button';
import { TextArea } from '../components/TextArea';

const RULES_STORAGE_KEY = 'flatRules';

export const RulesManagementScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation<StackNavigationProp<any>>();
  const [rules, setRules] = useState('');
  const [saving, setSaving] = useState(false);

  const loadRules = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(RULES_STORAGE_KEY);
      setRules(stored || '');
    } catch (error) {
      console.error('Error cargando reglas:', error);
    }
  }, []);

  useEffect(() => {
    loadRules();
  }, [loadRules]);

  const handleSave = async () => {
    try {
      setSaving(true);
      await AsyncStorage.setItem(RULES_STORAGE_KEY, rules.trim());
      Alert.alert('Exito', 'Reglas guardadas');
      navigation.goBack();
    } catch (error) {
      console.error('Error guardando reglas:', error);
      Alert.alert('Error', 'No se pudieron guardar las reglas');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Reglas del piso
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
        <TextArea
          label="Reglas"
          value={rules}
          onChangeText={setRules}
          maxLength={600}
          placeholder="Ej: No fumar, visitas hasta las 22:00"
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
