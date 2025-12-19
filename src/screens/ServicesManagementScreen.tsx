import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '../theme/ThemeContext';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { roomService } from '../services/roomService';
import type { FlatService } from '../types/room';

const SERVICE_CATEGORIES = [
  {
    id: 'suministros',
    label: 'Suministros',
    options: [
      { id: 'luz', label: 'Luz' },
      { id: 'agua', label: 'Agua' },
      { id: 'gas', label: 'Gas' },
      { id: 'calefaccion', label: 'Calefaccion' },
      { id: 'aire', label: 'Aire acondicionado' },
      { id: 'otros', label: 'Otros' },
    ],
  },
  {
    id: 'internet',
    label: 'Internet y TV',
    options: [
      { id: 'wifi', label: 'Internet/WiFi' },
      { id: 'tv', label: 'TV' },
      { id: 'streaming', label: 'Streaming incluido' },
      { id: 'otros', label: 'Otros' },
    ],
  },
  {
    id: 'limpieza',
    label: 'Limpieza y mantenimiento',
    options: [
      { id: 'limpieza', label: 'Limpieza' },
      { id: 'basura', label: 'Basura' },
      { id: 'otros', label: 'Otros' },
    ],
  },
  {
    id: 'extras',
    label: 'Extras',
    options: [
      { id: 'lavanderia', label: 'Lavanderia' },
      { id: 'parking', label: 'Parking' },
      { id: 'gimnasio', label: 'Gimnasio' },
      { id: 'otros', label: 'Otros' },
    ],
  },
];

export const ServicesManagementScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation<StackNavigationProp<any>>();
  const route = useRoute();
  const routeParams = route.params as { flatId?: string | null } | undefined;
  const flatId = routeParams?.flatId ?? null;
  const [services, setServices] = useState<FlatService[]>([]);
  const [activeOtherCategories, setActiveOtherCategories] = useState<string[]>([]);
  const [customByCategory, setCustomByCategory] = useState<
    Record<string, { name: string; price: string }>
  >({});
  const [saving, setSaving] = useState(false);

  const serviceByName = useMemo(() => {
    const map = new Map<string, FlatService>();
    services.forEach((service) => map.set(service.name.toLowerCase(), service));
    return map;
  }, [services]);

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

  const toggleService = (name: string) => {
    setServices((prev) => {
      const exists = prev.some(
        (service) => service.name.toLowerCase() === name.toLowerCase()
      );
      if (exists) {
        return prev.filter(
          (service) => service.name.toLowerCase() !== name.toLowerCase()
        );
      }
      return [...prev, { name }];
    });
  };

  const updateServicePrice = (name: string, value: string) => {
    const trimmed = value.trim();
    const parsed = trimmed ? parseFloat(trimmed.replace(',', '.')) : NaN;
    const priceValue = Number.isNaN(parsed) ? undefined : parsed;
    setServices((prev) =>
      prev.map((service) =>
        service.name.toLowerCase() === name.toLowerCase()
          ? { ...service, price: priceValue }
          : service
      )
    );
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
        {SERVICE_CATEGORIES.map((category) => {
          const isOtherActive = activeOtherCategories.includes(category.id);
          const custom = customByCategory[category.id] || { name: '', price: '' };
          return (
            <View key={category.id} style={styles.categoryBlock}>
              <Text style={styles.categoryLabel}>{category.label}</Text>
              <View style={styles.categoryChips}>
                {category.options.map((option) => {
                  const isOther = option.id === 'otros';
                  const isActive = isOther
                    ? isOtherActive
                    : serviceByName.has(option.label.toLowerCase());
                  return (
                    <TouchableOpacity
                      key={option.id}
                      style={[
                        styles.categoryChip,
                        isActive && styles.categoryChipActive,
                      ]}
                      onPress={() => {
                        if (isOther) {
                          setActiveOtherCategories((prev) =>
                            prev.includes(category.id)
                              ? prev.filter((id) => id !== category.id)
                              : [...prev, category.id]
                          );
                        } else {
                          toggleService(option.label);
                        }
                      }}
                    >
                      <Text
                        style={[
                          styles.categoryChipText,
                          isActive && styles.categoryChipTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {isOtherActive && (
                <View style={styles.customRow}>
                  <View style={styles.customColumn}>
                    <Input
                      label="Servicio"
                      value={custom.name}
                      onChangeText={(value) =>
                        setCustomByCategory((prev) => ({
                          ...prev,
                          [category.id]: { ...custom, name: value },
                        }))
                      }
                      placeholder="Escribe el servicio"
                    />
                  </View>
                  <View style={styles.customColumn}>
                    <Input
                      label="Precio aprox. (EUR)"
                      value={custom.price}
                      onChangeText={(value) =>
                        setCustomByCategory((prev) => ({
                          ...prev,
                          [category.id]: { ...custom, price: value },
                        }))
                      }
                      keyboardType="numeric"
                      placeholder="Opcional"
                    />
                  </View>
                  <Button
                    title="Agregar"
                    size="small"
                    onPress={() => {
                      const name = custom.name.trim();
                      if (!name) return;
                      const rawPrice = custom.price.trim();
                      const parsedPrice = rawPrice
                        ? parseFloat(rawPrice.replace(',', '.'))
                        : NaN;
                      const priceValue = Number.isNaN(parsedPrice)
                        ? undefined
                        : parsedPrice;
                      setServices((prev) => [...prev, { name, price: priceValue }]);
                      setCustomByCategory((prev) => ({
                        ...prev,
                        [category.id]: { name: '', price: '' },
                      }));
                    }}
                  />
                </View>
              )}
            </View>
          );
        })}

        {services.length === 0 ? (
          <Text style={styles.emptyText}>Aun no has agregado servicios.</Text>
        ) : (
          <View style={styles.serviceList}>
            {services.map((service, index) => (
              <View key={`${service.name}-${index}`} style={styles.serviceRow}>
                <View style={styles.serviceInfo}>
                  <Text style={styles.serviceName}>{service.name}</Text>
                  <View style={styles.priceRow}>
                    <Text style={styles.priceLabel}>Precio aprox.</Text>
                    <TextInput
                      style={styles.priceInput}
                      value={
                        service.price != null ? String(service.price) : ''
                      }
                      onChangeText={(value) =>
                        updateServicePrice(service.name, value)
                      }
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor="#9CA3AF"
                    />
                    <Text style={styles.priceUnit}>EUR</Text>
                  </View>
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
  categoryBlock: {
    marginBottom: 16,
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  categoryChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  categoryChipActive: {
    borderColor: '#7C3AED',
    backgroundColor: '#F5F3FF',
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  categoryChipTextActive: {
    color: '#7C3AED',
  },
  customRow: {
    marginTop: 12,
    gap: 10,
  },
  customColumn: {
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
  priceRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  priceLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  priceInput: {
    minWidth: 56,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    fontSize: 12,
    color: '#111827',
  },
  priceUnit: {
    fontSize: 12,
    color: '#6B7280',
  },
  removeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#EF4444',
  },
});
