import React, { useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Button } from '../components/Button';
import { ChipGroup } from '../components/ChipGroup';
import { FormSection } from '../components/FormSection';
import { Input } from '../components/Input';
import {
  BUDGET_MAX,
  BUDGET_MIN,
  BUDGET_STEP,
  DEFAULT_BUDGET_MAX,
  DEFAULT_BUDGET_MIN,
  ESTILO_VIDA_OPTIONS,
  INTERESES_OPTIONS,
  ZONAS_OPTIONS,
} from '../constants/swipeFilters';
import { useSwipeFilters } from '../context/SwipeFiltersContext';
import type { HousingFilter, SwipeFilters } from '../types/swipeFilters';
import type { GenderFilter } from '../types/gender';

const HOUSING_OPTIONS: { id: HousingFilter; label: string }[] = [
  { id: 'any', label: 'Indiferente' },
  { id: 'seeking', label: 'Busca piso' },
  { id: 'offering', label: 'Tiene piso' },
];

const GENDER_OPTIONS: { id: GenderFilter; label: string }[] = [
  { id: 'any', label: 'Indiferente' },
  { id: 'male', label: 'Hombre' },
  { id: 'female', label: 'Mujer' },
  { id: 'non_binary', label: 'No binario' },
  { id: 'other', label: 'Otro' },
];

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const snapToStep = (value: number) =>
  Math.round(value / BUDGET_STEP) * BUDGET_STEP;

export const FiltersScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const { filters, setFilters } = useSwipeFilters();
  const [draft, setDraft] = useState<SwipeFilters>(filters);
  const [roommatesText, setRoommatesText] = useState(
    filters.roommates != null ? String(filters.roommates) : ''
  );
  const [isDraggingBudget, setIsDraggingBudget] = useState(false);

  useEffect(() => {
    setDraft(filters);
    setRoommatesText(filters.roommates != null ? String(filters.roommates) : '');
  }, [filters]);

  const handleApply = async () => {
    let budgetMin = clamp(draft.budgetMin, BUDGET_MIN, BUDGET_MAX);
    let budgetMax = clamp(draft.budgetMax, BUDGET_MIN, BUDGET_MAX);
    if (budgetMin > budgetMax) {
      const temp = budgetMin;
      budgetMin = budgetMax;
      budgetMax = temp;
    }

    await setFilters({
      ...draft,
      budgetMin,
      budgetMax,
    });

    navigation.goBack();
  };

  const handleResetDraft = () => {
    setDraft({
      housingSituation: 'any',
      gender: 'any',
      budgetMin: DEFAULT_BUDGET_MIN,
      budgetMax: DEFAULT_BUDGET_MAX,
      zones: [],
      roommates: null,
      lifestyle: [],
      interests: [],
    });
    setRoommatesText('');
  };

  const housingLabel = useMemo(
    () =>
      HOUSING_OPTIONS.find((option) => option.id === draft.housingSituation)
        ?.label ?? 'Indiferente',
    [draft.housingSituation]
  );

  const updateRoommates = (text: string) => {
    const cleaned = text.replace(/[^\d]/g, '');
    setRoommatesText(cleaned);
    if (!cleaned) {
      setDraft((prev) => ({ ...prev, roommates: null }));
      return;
    }
    const parsed = Number.parseInt(cleaned, 10);
    setDraft((prev) => ({
      ...prev,
      roommates: Number.isNaN(parsed) ? null : parsed,
    }));
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>Filtros</Text>
        <TouchableOpacity onPress={handleResetDraft}>
          <Text style={styles.resetText}>Limpiar</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!isDraggingBudget}
      >
        <FormSection title="Situacion vivienda" iconName="home-outline">
          <Text style={styles.label}>Actual: {housingLabel}</Text>
          <View style={styles.segmentRow}>
            {HOUSING_OPTIONS.map((option) => {
              const isActive = draft.housingSituation === option.id;
              return (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.segmentButton,
                    isActive && styles.segmentButtonActive,
                  ]}
                  onPress={() =>
                    setDraft((prev) => ({
                      ...prev,
                      housingSituation: option.id,
                    }))
                  }
                >
                  <Text
                    style={[
                      styles.segmentButtonText,
                      isActive && styles.segmentButtonTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </FormSection>

        <FormSection title="Genero" iconName="people-outline">
          <Text style={styles.label}>Preferencia</Text>
          <View style={styles.segmentRow}>
            {GENDER_OPTIONS.map((option) => {
              const isActive = draft.gender === option.id;
              return (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.segmentButton,
                    isActive && styles.segmentButtonActive,
                  ]}
                  onPress={() =>
                    setDraft((prev) => ({
                      ...prev,
                      gender: option.id,
                    }))
                  }
                >
                  <Text
                    style={[
                      styles.segmentButtonText,
                      isActive && styles.segmentButtonTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </FormSection>

        <FormSection title="Presupuesto" iconName="cash-outline">
          <View style={styles.budgetValues}>
            <Text style={styles.budgetValue}>Min: {draft.budgetMin} EUR</Text>
            <Text style={styles.budgetValue}>Max: {draft.budgetMax} EUR</Text>
          </View>
          <BudgetRange
            minValue={draft.budgetMin}
            maxValue={draft.budgetMax}
            onDragStateChange={setIsDraggingBudget}
            onChangeMin={(value) =>
              setDraft((prev) => ({ ...prev, budgetMin: value }))
            }
            onChangeMax={(value) =>
              setDraft((prev) => ({ ...prev, budgetMax: value }))
            }
          />
        </FormSection>

        <FormSection title="Zonas" iconName="map-outline">
          <ChipGroup
            label="Selecciona zonas"
            options={ZONAS_OPTIONS}
            selectedIds={draft.zones}
            onSelect={(id) => {
              setDraft((prev) => ({
                ...prev,
                zones: prev.zones.includes(id)
                  ? prev.zones.filter((zona) => zona !== id)
                  : [...prev.zones, id],
              }));
            }}
            multiline
          />
        </FormSection>

        <FormSection title="Numero de companeros" iconName="people-outline">
          <Input
            label="Preferencia"
            placeholder="Cualquiera"
            value={roommatesText}
            onChangeText={updateRoommates}
            keyboardType="numeric"
          />
        </FormSection>

        <FormSection title="Estilo de vida" iconName="sparkles-outline">
          <ChipGroup
            label="Selecciona estilos"
            options={ESTILO_VIDA_OPTIONS}
            selectedIds={draft.lifestyle}
            onSelect={(id) => {
              setDraft((prev) => ({
                ...prev,
                lifestyle: prev.lifestyle.includes(id)
                  ? prev.lifestyle.filter((chip) => chip !== id)
                  : [...prev.lifestyle, id],
              }));
            }}
            multiline
          />
        </FormSection>

        <FormSection title="Intereses clave" iconName="heart-outline">
          <ChipGroup
            label="Selecciona intereses"
            options={INTERESES_OPTIONS}
            selectedIds={draft.interests}
            onSelect={(id) => {
              setDraft((prev) => ({
                ...prev,
                interests: prev.interests.includes(id)
                  ? prev.interests.filter((item) => item !== id)
                  : [...prev.interests, id],
              }));
            }}
            multiline
          />
        </FormSection>
      </ScrollView>

      <View style={styles.footer}>
        <Button title="Aplicar filtros" onPress={handleApply} />
      </View>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  resetText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7C3AED',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 10,
  },
  segmentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  segmentButtonActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  segmentButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  segmentButtonTextActive: {
    color: '#FFFFFF',
  },
  budgetValues: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  budgetValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  sliderTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E5E7EB',
  },
  sliderContainer: {
    paddingVertical: 12,
    position: 'relative',
    minHeight: 36,
  },
  sliderTrackActive: {
    position: 'absolute',
    height: 6,
    borderRadius: 3,
    backgroundColor: '#7C3AED',
  },
  sliderThumb: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#7C3AED',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    top: -7,
  },
  sliderTicks: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  sliderTick: {
    width: 2,
    height: 6,
    backgroundColor: '#D1D5DB',
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  sliderLabel: {
    fontSize: 11,
    color: '#6B7280',
  },
});

const BudgetRange: React.FC<{
  minValue: number;
  maxValue: number;
  onDragStateChange: (isDragging: boolean) => void;
  onChangeMin: (value: number) => void;
  onChangeMax: (value: number) => void;
}> = ({ minValue, maxValue, onDragStateChange, onChangeMin, onChangeMax }) => {
  const [trackWidth, setTrackWidth] = useState(0);
  const minStartRef = React.useRef(0);
  const maxStartRef = React.useRef(0);
  const minValueRef = React.useRef(minValue);
  const maxValueRef = React.useRef(maxValue);
  const startTouchRef = React.useRef(0);

  useEffect(() => {
    minValueRef.current = minValue;
    maxValueRef.current = maxValue;
  }, [minValue, maxValue]);

  const valueToX = (value: number) => {
    if (!trackWidth) return 0;
    return ((value - BUDGET_MIN) / (BUDGET_MAX - BUDGET_MIN)) * trackWidth;
  };

  const xToValue = (x: number) => {
    if (!trackWidth) return BUDGET_MIN;
    const raw = BUDGET_MIN + (x / trackWidth) * (BUDGET_MAX - BUDGET_MIN);
    return clamp(snapToStep(raw), BUDGET_MIN, BUDGET_MAX);
  };

  const activeThumbRef = React.useRef<'min' | 'max' | null>(null);

  const minX = valueToX(minValue);
  const maxX = valueToX(maxValue);
  const ticks = Math.floor((BUDGET_MAX - BUDGET_MIN) / BUDGET_STEP);

  return (
    <View
      style={styles.sliderContainer}
      onLayout={(event) => {
        const width = event.nativeEvent.layout.width;
        console.log('[BudgetRange] layout width', width);
        setTrackWidth(width);
      }}
      pointerEvents="box-only"
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={(event) => {
        if (!trackWidth) {
          console.log('[BudgetRange] grant blocked, trackWidth=0');
          return;
        }
        onDragStateChange(true);
        const touchX = event.nativeEvent.locationX;
        console.log('[BudgetRange] grant', {
          trackWidth,
          touchX,
          minValue: minValueRef.current,
          maxValue: maxValueRef.current,
        });
        startTouchRef.current = touchX;
        const minPos = valueToX(minValueRef.current);
        const maxPos = valueToX(maxValueRef.current);
        activeThumbRef.current =
          Math.abs(touchX - minPos) <= Math.abs(touchX - maxPos) ? 'min' : 'max';
        console.log('[BudgetRange] activeThumb', activeThumbRef.current, {
          minPos,
          maxPos,
        });
        minStartRef.current = minPos;
        maxStartRef.current = maxPos;
      }}
      onResponderMove={(event) => {
        if (!trackWidth || !activeThumbRef.current) return;
        const nextX = clamp(event.nativeEvent.locationX, 0, trackWidth);
        if (activeThumbRef.current === 'min') {
          const bounded = clamp(nextX, 0, valueToX(maxValueRef.current));
          onChangeMin(xToValue(bounded));
        } else {
          const bounded = clamp(nextX, valueToX(minValueRef.current), trackWidth);
          onChangeMax(xToValue(bounded));
        }
      }}
      onResponderRelease={() => {
        activeThumbRef.current = null;
        onDragStateChange(false);
      }}
      onResponderTerminate={() => {
        activeThumbRef.current = null;
        onDragStateChange(false);
      }}
    >
      <View style={styles.sliderTrack} />
      <View
        style={[
          styles.sliderTrackActive,
          { left: minX, width: Math.max(0, maxX - minX) },
        ]}
      />
      <View
        style={[styles.sliderThumb, { left: minX - 10 }]}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      />
      <View
        style={[styles.sliderThumb, { left: maxX - 10 }]}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      />
      <View style={styles.sliderTicks}>
        {Array.from({ length: ticks + 1 }).map((_, index) => (
          <View key={`tick-${index}`} style={styles.sliderTick} />
        ))}
      </View>
      <View style={styles.sliderLabels}>
        <Text style={styles.sliderLabel}>0</Text>
        <Text style={styles.sliderLabel}>600</Text>
        <Text style={styles.sliderLabel}>1200+</Text>
      </View>
    </View>
  );
};
