// src/components/FormSection.tsx  
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../theme/ThemeContext';

interface FormSectionProps {
  title?: string;
  subtitle?: string;
  iconName?: string;
  required?: boolean;
  requiredLabel?: string;
  children: React.ReactNode;
}

export const FormSection: React.FC<FormSectionProps> = ({
  title,
  subtitle,
  iconName,
  required = false,
  requiredLabel,
  children,
}) => {
  const theme = useTheme();
  const showHeader = Boolean(title || subtitle || iconName || requiredLabel);

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {showHeader && (
          <View style={styles.header}>
            <View style={styles.titleRow}>
              {iconName && (
                <Ionicons
                  name={iconName}
                  size={20}
                  color={theme.colors.primary}
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
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
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
