import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '../theme/ThemeContext';
import { Button } from '../components/Button';
import { TextArea } from '../components/TextArea';
import { roomService } from '../services/roomService';

export const RulesManagementScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation<StackNavigationProp<any>>();
  const route = useRoute();
  const routeParams = route.params as { flatId?: string | null } | undefined;
  const flatId = routeParams?.flatId ?? null;
  const [rules, setRules] = useState('');
  const [saving, setSaving] = useState(false);

  const loadRules = useCallback(async () => {
    try {
      if (!flatId) return;
      const flats = await roomService.getMyFlats();
      const flat = flats.find((item) => item.id === flatId);
      setRules(flat?.rules || '');
    } catch (error) {
      console.error('Error cargando reglas:', error);
    }
  }, [flatId]);

  useEffect(() => {
    loadRules();
  }, [loadRules]);

  const handleSave = async () => {
    try {
      setSaving(true);
      if (!flatId) {
        Alert.alert('Error', 'No se encontro el piso');
        setSaving(false);
        return;
      }
      await roomService.updateFlat(flatId, { rules: rules.trim() });
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
        {!flatId && (
          <Text style={styles.emptyText}>
            No se encontro el piso seleccionado.
          </Text>
        )}
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
  emptyText: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 12,
  },
});
