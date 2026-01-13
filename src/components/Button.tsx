// components/Button.tsx
import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'tertiary';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  style,
}) => {
  const theme = useTheme();
  const isDisabled = disabled || loading;
  const sizeStyle = styles[`size_${size}` as const];
  const variantStyle = {
    primary: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    secondary: {
      backgroundColor: theme.colors.glassSurface,
      borderColor: theme.colors.glassBorderSoft,
    },
    tertiary: {
      backgroundColor: 'transparent',
      borderColor: 'transparent',
    },
  }[variant];
  const textStyle = {
    primary: { color: theme.colors.background },
    secondary: { color: theme.colors.text },
    tertiary: { color: theme.colors.primary },
  }[variant];
  const disabledStyle = {
    backgroundColor: theme.colors.surfaceLight,
    borderColor: theme.colors.border,
  };
  const textDisabledStyle = { color: theme.colors.textTertiary };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        sizeStyle,
        variantStyle,
        { borderRadius: theme.borderRadius.full },
        style,
        isDisabled && disabledStyle,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.85}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? theme.colors.background : theme.colors.text}
        />
      ) : (
        <Text style={[styles.text, textStyle, isDisabled && textDisabledStyle]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  size_small: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  size_medium: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  size_large: {
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
});

