// src/components/GoogleSignInButton.tsx
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View, Image } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface GoogleSignInButtonProps {
  onPress: () => void;
  loading?: boolean;
}

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  onPress,
  loading = false,
}) => {
  const theme = useTheme();

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          borderColor: theme.colors.border,
          borderRadius: theme.borderRadius.full,
          backgroundColor: theme.colors.background,
        },
        loading && styles.disabled,
      ]}
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.85}
    >
      <View style={styles.content}>
        <Image
          source={require('../assets/google-logo.png')}
          style={styles.googleLogo}
          resizeMode="contain"
        />
        <Text style={[styles.text, { color: theme.colors.text }]}>
          Continuar con Google
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    minHeight: 48,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  googleLogo: {
    width: 20,
    height: 20,
    marginRight: 12,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.6,
  },
});
