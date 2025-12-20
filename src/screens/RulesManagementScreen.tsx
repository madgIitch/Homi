import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '../theme/ThemeContext';
import { Button } from '../components/Button';
import { TextArea } from '../components/TextArea';
import { ChipGroup } from '../components/ChipGroup';
import { roomService } from '../services/roomService';

const RULE_OPTIONS = [
  { id: 'ruido', label: 'Ruido' },
  { id: 'visitas', label: 'Visitas' },
  { id: 'limpieza', label: 'Limpieza' },
  { id: 'fumar', label: 'Fumar' },
  { id: 'mascotas', label: 'Mascotas' },
  { id: 'cocina', label: 'Dejar la cocina limpia tras usarla' },
  { id: 'banos', label: 'Mantener banos en orden' },
  { id: 'basura', label: 'Sacar la basura segun el turno' },
  { id: 'seguridad', label: 'Cerrar siempre la puerta con llave' },
  { id: 'otros', label: 'Otros' },
];

const SUB_RULE_OPTIONS: Record<string, { id: string; label: string }[]> = {
  ruido: [
    { id: 'ruido_22_08', label: 'Silencio 22:00 - 08:00' },
    { id: 'ruido_23_08', label: 'Silencio 23:00 - 08:00' },
    { id: 'ruido_flexible', label: 'Horario flexible' },
    { id: 'ruido_otros', label: 'Otros' },
  ],
  visitas: [
    { id: 'visitas_si', label: 'Si, con aviso' },
    { id: 'visitas_no', label: 'No permitidas' },
    { id: 'visitas_sin_dormir', label: 'Si, pero sin dormir' },
    { id: 'visitas_libre', label: 'Sin problema' },
    { id: 'visitas_otros', label: 'Otros' },
  ],
  limpieza: [
    { id: 'limpieza_semanal', label: 'Turnos semanales' },
    { id: 'limpieza_quincenal', label: 'Turnos quincenales' },
    { id: 'limpieza_por_uso', label: 'Limpieza por uso' },
    { id: 'limpieza_profesional', label: 'Servicio de limpieza' },
    { id: 'limpieza_otros', label: 'Otros' },
  ],
  fumar: [
    { id: 'fumar_no', label: 'No fumar' },
    { id: 'fumar_terraza', label: 'Solo en terraza/balcon' },
    { id: 'fumar_si', label: 'Permitido en zonas comunes' },
    { id: 'fumar_otros', label: 'Otros' },
  ],
  mascotas: [
    { id: 'mascotas_no', label: 'No se permiten' },
    { id: 'mascotas_gatos', label: 'Solo gatos' },
    { id: 'mascotas_perros', label: 'Solo perros' },
    { id: 'mascotas_acuerdo', label: 'Permitidas bajo acuerdo' },
    { id: 'mascotas_otros', label: 'Otros' },
  ],
};

export const RulesManagementScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation<StackNavigationProp<any>>();
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
                    value={subCustom[ruleId] ?? ''}
                    onChangeText={(value) =>
                      setSubCustom((prev) => ({ ...prev, [ruleId]: value }))
                    }
                    maxLength={300}
                    placeholder="Escribe tu regla"
                  />
                )}
              </View>
            );
          })}
        {selectedRules.includes('otros') && (
          <TextArea
            label="Otras reglas"
            value={customRules}
            onChangeText={setCustomRules}
            maxLength={600}
            placeholder="Ej: No se puede fumar en balcon, visitas max 2 noches"
          />
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
  emptyText: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 12,
  },
  ruleOptions: {
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  ruleBlock: {
    marginTop: 12,
  },
  ruleBlockLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  ruleOptionChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  ruleOptionChipActive: {
    borderColor: '#7C3AED',
    backgroundColor: '#F5F3FF',
  },
  ruleOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  ruleOptionTextActive: {
    color: '#7C3AED',
  },
});
