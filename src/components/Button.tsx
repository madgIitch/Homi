// components/Button.tsx  
import React from 'react';  
import { TouchableOpacity, Text, StyleSheet } from 'react-native';  
import { colors, typography, borderRadius, spacing } from '../theme';  
  
interface ButtonProps {  
  title: string;  
  onPress: () => void;  
  variant?: 'primary' | 'secondary' | 'tertiary'; // Añadir 'tertiary'  
  size?: 'small' | 'medium' | 'large';  
  loading?: boolean; // Añadir loading prop  
  disabled?: boolean;  
}  
  
export const Button: React.FC<ButtonProps> = ({   
  title,   
  onPress,   
  variant = 'primary'   
}) => (  
  <TouchableOpacity   
    style={[  
      styles.button,  
      variant === 'primary' ? styles.primary : styles.secondary  
    ]}  
    onPress={onPress}  
  >  
    <Text style={[styles.text, variant === 'primary' ? styles.textPrimary : styles.textSecondary]}>  
      {title}  
    </Text>  
  </TouchableOpacity>  
);  
  
const styles = StyleSheet.create({  
  button: {  
    paddingVertical: spacing.md,  
    paddingHorizontal: spacing.lg,  
    borderRadius: borderRadius.md,  
    alignItems: 'center',  
  },  
  primary: {  
    backgroundColor: colors.primary,  
  },  
  secondary: {  
    backgroundColor: colors.surface,  
    borderWidth: 1,  
    borderColor: colors.border,  
  },  
  text: {  
    ...typography.body,  
    fontWeight: '600',  
  },  
  textPrimary: {  
    color: colors.background,  
  },  
  textSecondary: {  
    color: colors.primary,  
  },  
});