import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Alert,
  TouchableOpacity,
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
import { TextArea } from '../components/TextArea';
import { ChipGroup } from '../components/ChipGroup';
import { roomService } from '../services/roomService';
import { RulesManagementScreenStyles } from '../styles/screens';
import { spacing } from '../theme';

const RULE_OPTIONS = [
  { id: 'ruido', label: 'Ruido' },
  { id: 'visitas', label: 'Visitas' },
  { id: 'limpieza', label: 'Limpieza' },
  { id: 'fumar', label: 'Fumar' },
  { id: 'mascotas', label: 'Mascotas' },
  { id: 'cocina', label: 'Dejar la cocina limpia tras usarla' },
  { id: 'banos', label: 'Mantener baños en orden' },
  { id: 'basura', label: 'Sacar la basura segun el turno' },
  { id: 'seguridad', label: 'Cerrar siempre la puerta con llave' },
  { id: 'otros', label: '+ Otros' },
];

const SUB_RULE_OPTIONS: Record<string, { id: string; label: string }[]> = {
  ruido: [
    { id: 'ruido_22_08', label: 'Silencio 22:00 - 08:00' },
    { id: 'ruido_23_08', label: 'Silencio 23:00 - 08:00' },
    { id: 'ruido_flexible', label: 'Horario flexible' },
    { id: 'ruido_otros', label: '+ Otros' },
  ],
  visitas: [
    { id: 'visitas_si', label: 'Si, con aviso' },
    { id: 'visitas_no', label: 'No permitidas' },
    { id: 'visitas_sin_dormir', label: 'Si, pero sin dormir' },
    { id: 'visitas_libre', label: 'Sin problema' },
    { id: 'visitas_otros', label: '+ Otros' },
  ],
  limpieza: [
    { id: 'limpieza_semanal', label: 'Turnos semanales' },
    { id: 'limpieza_quincenal', label: 'Turnos quincenales' },
    { id: 'limpieza_por_uso', label: 'Limpieza por uso' },
    { id: 'limpieza_profesional', label: 'Servicio de limpieza' },
    { id: 'limpieza_otros', label: '+ Otros' },
  ],
  fumar: [
    { id: 'fumar_no', label: 'No fumar' },
    { id: 'fumar_terraza', label: 'Solo en terraza/balcon' },
    { id: 'fumar_si', label: 'Permitido en zonas comunes' },
    { id: 'fumar_otros', label: '+ Otros' },
  ],
  mascotas: [
    { id: 'mascotas_no', label: 'No se permiten' },
    { id: 'mascotas_gatos', label: 'Solo gatos' },
    { id: 'mascotas_perros', label: 'Solo perros' },
    { id: 'mascotas_acuerdo', label: 'Permitidas bajo acuerdo' },
    { id: 'mascotas_otros', label: '+ Otros' },
  ],
};

export const RulesManagementScreen: React.FC = () => {
  const theme = useTheme();
  const { isDark } = useThemeController();
  const styles = useMemo(() => RulesManagementScreenStyles(theme), [theme]);
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
  const [selectedRules, setSelectedRules] = useState<string[]>([]);
  const [subSelections, setSubSelections] = useState<Record<string, string | null>>({});
  const [subCustom, setSubCustom] = useState<Record<string, string>>({});
  const [customRules, setCustomRules] = useState('');
  const [saving, setSaving] = useState(false);

  const ruleLabelById = useMemo(
    () => new Map(RULE_OPTIONS.map((rule) => [rule.id, rule.label])),
    []
  );
  const subOptionLabelMap = useMemo(() => {
    const map = new Map<string, { ruleId: string; optionId: string }>();
    Object.entries(SUB_RULE_OPTIONS).forEach(([ruleId, options]) => {
      options.forEach((option) => {
        map.set(option.label.toLowerCase(), { ruleId, optionId: option.id });
      });
    });
    return map;
  }, []);

  const loadRules = useCallback(async () => {
    try {
      if (!flatId) return;
      const flats = await roomService.getMyFlats();
      const flat = flats.find((item) => item.id === flatId);
      const storedRules = flat?.rules || '';
      if (!storedRules) {
        setSelectedRules([]);
        setCustomRules('');
        return;
      }

      const pieces = storedRules
        .split(/\n|;/)
        .map((item) => item.trim())
        .filter(Boolean);

      const matchedIds: string[] = [];
      const leftovers: string[] = [];
      const nextSubSelections: Record<string, string | null> = {};
      const nextSubCustom: Record<string, string> = {};

      pieces.forEach((rule) => {
        const lower = rule.toLowerCase();
        const matchSub = subOptionLabelMap.get(lower);
        if (matchSub) {
          if (!matchedIds.includes(matchSub.ruleId)) {
            matchedIds.push(matchSub.ruleId);
          }
          nextSubSelections[matchSub.ruleId] = matchSub.optionId;
          return;
        }

        const prefixed = Array.from(ruleLabelById.entries()).find(([id, label]) => {
          if (!SUB_RULE_OPTIONS[id]) return false;
          return lower.startsWith(`${label.toLowerCase()}:`);
        });
        if (prefixed) {
          const [ruleId, label] = prefixed;
          if (!matchedIds.includes(ruleId)) {
            matchedIds.push(ruleId);
          }
          nextSubSelections[ruleId] = `${ruleId}_otros`;
          nextSubCustom[ruleId] = rule.slice(label.length + 1).trim();
          return;
        }

        const match = RULE_OPTIONS.find(
          (option) => option.label.toLowerCase() === rule.toLowerCase()
        );
        if (match && match.id !== 'otros') {
          matchedIds.push(match.id);
        } else {
          leftovers.push(rule);
        }
      });

      if (leftovers.length > 0) {
        matchedIds.push('otros');
        setCustomRules(leftovers.join(', '));
      } else {
        setCustomRules('');
      }
      setSubSelections(nextSubSelections);
      setSubCustom(nextSubCustom);

      setSelectedRules(matchedIds);
    } catch (error) {
      console.error('Error cargando reglas:', error);
    }
  }, [flatId, ruleLabelById, subOptionLabelMap]);

  useEffect(() => {
    loadRules();
  }, [loadRules]);

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
      const baseRules = selectedRules
        .filter((id) => id !== 'otros')
        .map((id) => (SUB_RULE_OPTIONS[id] ? null : ruleLabelById.get(id)))
        .filter((label): label is string => Boolean(label));
      const customText = customRules.trim();
      const subRules = selectedRules.flatMap((ruleId) => {
        const options = SUB_RULE_OPTIONS[ruleId];
        if (!options) return [];
        const selection = subSelections[ruleId];
        if (!selection) return [];
        const selectedOption = options.find((option) => option.id === selection);
        if (!selectedOption) return [];
        if (selectedOption.id.endsWith('_otros')) {
          const custom = subCustom[ruleId]?.trim();
          if (!custom) return [];
          const label = ruleLabelById.get(ruleId) ?? 'Regla';
          return [`${label}: ${custom}`];
        }
        return [selectedOption.label];
      });
      const nextRules = [
        ...baseRules,
        ...subRules,
        ...(selectedRules.includes('otros') && customText ? [customText] : []),
      ]
        .map((rule) => rule.trim())
        .filter(Boolean)
        .join('\n');

      await roomService.updateFlat(flatId, { rules: nextRules });
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
    <View style={[styles.container, { backgroundColor: theme.colors.surfaceMutedAlt }]}>
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
            Reglas del piso
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
        <View style={styles.rulesCard}>
          <ChipGroup
            label="Selecciona las reglas principales"
            options={RULE_OPTIONS}
            selectedIds={selectedRules}
            onSelect={(id) => {
              setSelectedRules((prev) => {
                const willRemove = prev.includes(id);
                const next = willRemove
                  ? prev.filter((item) => item !== id)
                  : [...prev, id];

                if (SUB_RULE_OPTIONS[id]) {
                  setSubSelections((current) => {
                    const nextSelections = { ...current };
                    if (willRemove) {
                      delete nextSelections[id];
                    } else if (!nextSelections[id]) {
                      nextSelections[id] = SUB_RULE_OPTIONS[id][0]?.id ?? null;
                    }
                    return nextSelections;
                  });
                  if (willRemove) {
                    setSubCustom((current) => {
                      const nextCustom = { ...current };
                      delete nextCustom[id];
                      return nextCustom;
                    });
                  }
                }

                return next;
              });
            }}
            multiline
            labelStyle={styles.compactLabel}
            chipContainerStyle={styles.compactChipContainer}
            chipStyle={styles.compactChip}
            textStyle={styles.compactChipText}
          />
          {Object.keys(SUB_RULE_OPTIONS)
            .filter((ruleId) => selectedRules.includes(ruleId))
            .map((ruleId) => {
              const options = SUB_RULE_OPTIONS[ruleId];
              const active = subSelections[ruleId];
              const label = ruleLabelById.get(ruleId) ?? 'Regla';
              return (
                <View key={ruleId} style={styles.ruleBlock}>
                  <Text style={styles.ruleBlockLabel}>{label}</Text>
                  <Text style={styles.ruleBlockSubtitle}>
                    Elige una opcion
                  </Text>
                  <View style={styles.ruleOptions}>
                    {options.map((option) => {
                      const isActive = active === option.id;
                      return (
                        <TouchableOpacity
                          key={option.id}
                          style={[
                            styles.ruleOptionChip,
                            isActive && styles.ruleOptionChipActive,
                          ]}
                          onPress={() =>
                            setSubSelections((prev) => ({
                              ...prev,
                              [ruleId]: option.id,
                            }))
                          }
                        >
                          <Text
                            style={[
                              styles.ruleOptionText,
                              isActive && styles.ruleOptionTextActive,
                            ]}
                          >
                            {option.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  {active?.endsWith('_otros') && (
                  <TextArea
                    label={`Texto para ${label}`}
                    labelStyle={styles.textAreaLabel}
                    value={subCustom[ruleId] ?? ''}
                    onChangeText={(value) =>
                      setSubCustom((prev) => ({ ...prev, [ruleId]: value }))
                    }
                    onFocus={handleInputFocus}
                    maxLength={300}
                    placeholder="Escribe tu regla"
                    inputStyle={styles.textAreaInput}
                  />
                )}
              </View>
            );
          })}
        {selectedRules.includes('otros') && (
          <TextArea
            label="Otras reglas"
            labelStyle={styles.textAreaLabel}
            value={customRules}
            onChangeText={setCustomRules}
            onFocus={handleInputFocus}
            maxLength={600}
            placeholder="Ej: No se puede fumar en balcon, visitas max 2 noches"
            inputStyle={styles.textAreaInput}
          />
        )}
        </View>
      </ScrollView>
    </View>
  );
};
