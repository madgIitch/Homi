import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '../theme/ThemeContext';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { roomService } from '../services/roomService';
import type { FlatService } from '../types/room';

export const ServicesManagementScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation<StackNavigationProp<any>>();
  const route = useRoute();
  const routeParams = route.params as { flatId?: string | null } | undefined;
  const flatId = routeParams?.flatId ?? null;
  const [services, setServices] = useState<FlatService[]>([]);
  const [serviceName, setServiceName] = useState('');
  const [servicePrice, setServicePrice] = useState('');
  const [saving, setSaving] = useState(false);

  const loadServices = useCallback(async () => {
    try {
      if (!flatId) return;
      const flats = await roomService.getMyFlats();
      const flat = flats.find((item) => item.id === flatId);
      setServices(flat?.services ?? []);
    } catch (error) {
      console.error('Error cargando servicios:', error);
    }
  }, [flatId]);

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  const handleSave = async () => {
    try {
      setSaving(true);
      if (!flatId) {
        Alert.alert('Error', 'No se encontro el piso');
        setSaving(false);
        return;
      }
      await roomService.updateFlat(flatId, {
        services,
      });
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
        {!flatId && (
          <Text style={styles.emptyText}>
            No se encontro el piso seleccionado.
          </Text>
        )}
        <View style={styles.addRow}>
          <View style={styles.addColumn}>
            <Input
              label="Servicio"
              value={serviceName}
              onChangeText={setServiceName}
              placeholder="Wifi, agua..."
            />
          </View>
          <View style={styles.addColumn}>
            <Input
              label="Precio aprox. (EUR)"
              value={servicePrice}
              onChangeText={setServicePrice}
              keyboardType="numeric"
              placeholder="Opcional"
            />
          </View>
          <Button
            title="Agregar"
            size="small"
            onPress={() => {
              const name = serviceName.trim();
              if (!name) return;
              const rawPrice = servicePrice.trim();
              const parsedPrice = rawPrice
                ? parseFloat(rawPrice.replace(',', '.'))
                : NaN;
              const priceValue = Number.isNaN(parsedPrice) ? undefined : parsedPrice;
              setServices((prev) => [
                ...prev,
                { name, price: priceValue },
              ]);
              setServiceName('');
              setServicePrice('');
            }}
          />
        </View>

        {services.length === 0 ? (
          <Text style={styles.emptyText}>Aun no has agregado servicios.</Text>
        ) : (
          <View style={styles.serviceList}>
            {services.map((service, index) => (
              <View key={`${service.name}-${index}`} style={styles.serviceRow}>
                <View style={styles.serviceInfo}>
                  <Text style={styles.serviceName}>{service.name}</Text>
                  {service.price != null ? (
                    <Text style={styles.servicePrice}>
                      {service.price} EUR
                    </Text>
                  ) : null}
                </View>
                <TouchableOpacity
                  onPress={() =>
                    setServices((prev) =>
                      prev.filter((_, itemIndex) => itemIndex !== index)
                    )
                  }
                >
                  <Text style={styles.removeText}>Eliminar</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

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
  addRow: {
    gap: 12,
    marginBottom: 12,
  },
  addColumn: {
    flex: 1,
  },
  emptyText: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 8,
  },
  serviceList: {
    marginBottom: 16,
    gap: 10,
  },
  serviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  servicePrice: {
    marginTop: 4,
    fontSize: 12,
    color: '#6B7280',
  },
  removeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#EF4444',
  },
});
