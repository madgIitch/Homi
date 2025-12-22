// src/components/ChipGroup.tsx
import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface ChipOption {
  id: string;
  label: string;
}

interface ChipGroupProps {
  options: ChipOption[];
  selectedIds: string[];
  onSelect: (id: string) => void;
  label?: string;
  required?: boolean;
  multiline?: boolean;
}

export const ChipGroup: React.FC<ChipGroupProps> = ({
  options,
  selectedIds,
  onSelect,
  label,
  required = false,
  multiline = true,
}) => {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      {label && (
        <Text
          style={[
            theme.typography.label,
            { color: theme.colors.text, marginBottom: theme.spacing.md },
          ]}
        >
          {label}
          {required && <Text style={{ color: theme.colors.error }}> *</Text>}
        </Text>
      )}
      <View style={[styles.chipContainer, !multiline && styles.singleLine]}>
        {options.map((option) => {
          const isSelected = selectedIds.includes(option.id);
          return (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.chip,
                {
                  backgroundColor: isSelected
                    ? theme.colors.text
                    : theme.colors.surfaceLight,
                  borderColor: isSelected ? theme.colors.text : theme.colors.border,
                  borderRadius: theme.borderRadius.full,
                  paddingHorizontal: theme.spacing.md,
                  paddingVertical: theme.spacing.sm,
                },
              ]}
              onPress={() => onSelect(option.id)}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  theme.typography.captionMedium,
                  { color: isSelected ? theme.colors.background : theme.colors.text },
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  singleLine: {
    flexWrap: 'nowrap',
  },
  chip: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});
