import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Alert,
  TouchableOpacity,
  TextInput,
  ImageBackground,
  StyleSheet,
  Dimensions,
  Keyboard,
  UIManager,
  findNodeHandle,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme, useThemeController } from '../theme/ThemeContext';
import { BlurView } from '@react-native-community/blur';
import LinearGradient from 'react-native-linear-gradient';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { roomService } from '../services/roomService';
import type { FlatService } from '../types/room';
import { ServicesManagementScreenStyles } from '../styles/screens';
import { spacing } from '../theme';

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
  const { isDark } = useThemeController();
  const styles = useMemo(() => ServicesManagementScreenStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<StackNavigationProp<any>>();
  const scrollRef = React.useRef<ScrollView>(null);
  const focusedInputHandle = React.useRef<number | null>(null);
  const keyboardHeightRef = React.useRef(0);
  const keyboardTopRef = React.useRef(Dimensions.get('window').height);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollYRef = React.useRef(0);
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

  const scrollToFocusedInput = useCallback(
    (extraOffset?: number) => {
      const scrollNode = scrollRef.current;
      const target = focusedInputHandle.current;
      if (!scrollNode || !target) return;

      UIManager.measureInWindow(target, (_x, y, _width, height) => {
        const windowHeight = Dimensions.get('window').height;
        const keyboardOffset =
          keyboardHeightRef.current > 0
            ? keyboardHeightRef.current * 0.18
            : 0;
        const resolvedOffset =
          extraOffset ??
          Math.round(
            Math.min(80, Math.max(12, windowHeight * 0.035, keyboardOffset))
          );
        const resolvedKeyboardTop =
          keyboardHeightRef.current > 0
            ? keyboardTopRef.current
            : windowHeight;
        const targetBottom = y + height;
        const targetTop = y;

        if (
          keyboardHeightRef.current > 0 &&
          targetBottom > resolvedKeyboardTop - resolvedOffset
        ) {
          const delta = targetBottom - (resolvedKeyboardTop - resolvedOffset);
          scrollNode.scrollTo({
            y: Math.max(0, scrollYRef.current + delta),
            animated: true,
          });
          return;
        }

        const safeTop = insets.top + 16;
        if (targetTop < safeTop) {
          const delta = safeTop - targetTop;
          scrollNode.scrollTo({
            y: Math.max(0, scrollYRef.current - delta),
            animated: true,
          });
        }
      });
    },
    [insets.top]
  );

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (event) => {
      keyboardHeightRef.current = event.endCoordinates.height;
      keyboardTopRef.current = event.endCoordinates.screenY;
      setKeyboardHeight(event.endCoordinates.height);
      requestAnimationFrame(() => scrollToFocusedInput());
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => {
      keyboardHeightRef.current = 0;
      keyboardTopRef.current = Dimensions.get('window').height;
      setKeyboardHeight(0);
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, [scrollToFocusedInput]);

  const handleInputFocus = useCallback(
    (event: any) => {
      const rawTarget = event?.target ?? event?.nativeEvent?.target;
      let target: number | null = null;

      if (typeof rawTarget === 'number') {
        target = rawTarget;
      } else if (rawTarget) {
        const handle = findNodeHandle(rawTarget as any);
        if (typeof handle === 'number') {
          target = handle;
        }
      }

      if (target != null) {
        focusedInputHandle.current = target;
      }

      setTimeout(() => scrollToFocusedInput(), 50);
    },
    [scrollToFocusedInput]
  );

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
      <ImageBackground
        source={{
          uri: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1200&q=80',
        }}
        blurRadius={18}
        style={styles.background}
      >
        <LinearGradient
          colors={[theme.colors.glassOverlay, theme.colors.glassWarmStrong]}
          style={StyleSheet.absoluteFillObject}
        />
      </ImageBackground>
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + spacing.md, paddingBottom: spacing.md },
        ]}
      >
        <BlurView
          blurType={isDark ? 'dark' : 'light'}
          blurAmount={16}
          reducedTransparencyFallbackColor={theme.colors.glassOverlay}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.headerFill} />
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerIconButton}
        >
          <Ionicons name="arrow-back" size={18} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            Servicios incluidos
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={handleSave}
            disabled={saving}
          >
            <Ionicons name="checkmark" size={20} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.content}
        contentContainerStyle={{
          paddingBottom: insets.bottom + keyboardHeight + 24,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onScroll={(event) => {
          scrollYRef.current = event.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
      >
        {!flatId && (
          <Text style={styles.emptyText}>
            No se encontro el piso seleccionado.
          </Text>
        )}
        {SERVICE_CATEGORIES.map((category) => {
          const isOtherActive = activeOtherCategories.includes(category.id);
          const custom = customByCategory[category.id] || { name: '', price: '' };
          return (
            <View key={category.id} style={styles.categoryCard}>
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
                        {isOther ? '+ Otros' : option.label}
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
                      onFocus={handleInputFocus}
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
                      onFocus={handleInputFocus}
                      keyboardType="numeric"
                      placeholder="Opcional"
                    />
                  </View>
                  <TouchableOpacity
                    style={styles.addPill}
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
                  >
                    <Text style={styles.addPillText}>Agregar</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}

        {services.length === 0 ? (
          <Text style={styles.emptyText}>Aun no has agregado servicios.</Text>
        ) : (
          <View style={styles.servicesCard}>
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
                      onFocus={handleInputFocus}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor={theme.colors.textTertiary}
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
                  style={styles.removeButton}
                >
                  <Ionicons
                    name="trash-outline"
                    size={16}
                    color={theme.colors.error}
                  />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

      </ScrollView>
    </View>
  );
};
