import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import type { AppearanceMode } from '../types/profile';

type AppearanceOption = {
  id: AppearanceMode;
  label: string;
  caption: string;
};

const OPTIONS: AppearanceOption[] = [
  {
    id: 'owner-only',
    label: 'Solo owner',
    caption: 'Solo aparezco ofreciendo piso',
  },
  {
    id: 'both',
    label: 'Owner y busco',
    caption: 'Aparezco como owner y buscador',
  },
  {
    id: 'seeker-only',
    label: 'Solo busco',
    caption: 'Solo aparezco buscando piso',
  },
];

type AppearanceModeSelectorProps = {
  value: AppearanceMode;
  onChange: (value: AppearanceMode) => void;
};

export const AppearanceModeSelector: React.FC<AppearanceModeSelectorProps> = ({
  value,
  onChange,
}) => {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      {OPTIONS.map((option) => {
        const isActive = value === option.id;
        return (
          <Pressable
            key={option.id}
            style={({ pressed }) => [
              styles.card,
              {
                backgroundColor: theme.colors.glassSurface,
                borderColor: isActive
                  ? theme.colors.primary
                  : theme.colors.glassBorderSoft,
              },
              isActive && styles.cardActive,
              pressed && styles.cardPressed,
            ]}
            onPress={() => onChange(option.id)}
          >
            <Text
              style={[
                styles.label,
                { color: isActive ? theme.colors.text : theme.colors.textSecondary },
              ]}
            >
              {option.label}
            </Text>
            <Text
              style={[
                styles.caption,
                { color: theme.colors.textSecondary },
              ]}
            >
              {option.caption}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  cardActive: {
    borderWidth: 2,
  },
  cardPressed: {
    opacity: 0.9,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  caption: {
    fontSize: 12,
    marginTop: 4,
  },
});
