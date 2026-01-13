// src/components/FormSection.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../theme/ThemeContext';
import { BlurView } from '@react-native-community/blur';

interface FormSectionProps {
  title?: string;
  subtitle?: string;
  iconName?: string;
  required?: boolean;
  requiredLabel?: string;
  variant?: 'glass' | 'flat';
  children: React.ReactNode;
}

export const FormSection: React.FC<FormSectionProps> = ({
  title,
  subtitle,
  iconName,
  required = false,
  requiredLabel,
  variant = 'glass',
  children,
}) => {
  const theme = useTheme();
  const showHeader = Boolean(title || subtitle || iconName || requiredLabel);
  const isFlat = variant === 'flat';

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.card,
          {
            borderRadius: isFlat ? theme.semanticRadii.sheet : theme.borderRadius.lg,
            borderColor: theme.colors.glassBorderSoft,
            backgroundColor: isFlat ? theme.colors.glassSurface : 'transparent',
          },
        ]}
      >
        {!isFlat && (
          <>
            <BlurView
              blurType="light"
              blurAmount={16}
              reducedTransparencyFallbackColor={theme.colors.glassOverlay}
              style={StyleSheet.absoluteFillObject}
            />
            <View
              style={[
                styles.cardFill,
                { backgroundColor: theme.colors.glassUltraLightAlt },
              ]}
            />
          </>
        )}
        {showHeader && (
          <View style={styles.header}>
            <View style={styles.titleRow}>
              {iconName && (
                <Ionicons
                  name={iconName}
                  size={18}
                  color={theme.colors.text}
                  style={styles.headerIcon}
                />
              )}
              {title && (
                <Text
                  style={[
                    theme.typography.sectionTitle,
                    { color: theme.colors.text },
                  ]}
                >
                  {title}
                </Text>
              )}
              {required && <Text style={styles.requiredStar}> *</Text>}
              {requiredLabel && (
                <Text
                  style={[
                    theme.typography.caption,
                    styles.requiredLabel,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  {requiredLabel}
                </Text>
              )}
            </View>
            {subtitle && (
              <Text
                style={[
                  theme.typography.caption,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {subtitle}
              </Text>
            )}
          </View>
        )}
        <View style={styles.content}>{children}</View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  card: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    padding: 16,
    overflow: 'hidden',
    shadowOpacity: 0,
    elevation: 0,
  },
  cardFill: {
    ...StyleSheet.absoluteFillObject,
  },
  header: {
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  headerIcon: {
    marginRight: 8,
  },
  requiredStar: {
    color: '#EF4444',
    fontWeight: '600',
  },
  requiredLabel: {
    marginLeft: 6,
  },
  content: {
    gap: 16,
  },
});
