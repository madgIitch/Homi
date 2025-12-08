// src/components/Input.tsx  
import React from 'react';  
import { TextInput, View, Text, StyleSheet, TextInputProps } from 'react-native';  
import { useTheme } from '../theme/ThemeContext';  
  
interface InputProps extends TextInputProps {  
  label?: string;  
  icon?: React.ReactNode;  
  error?: string;  
  helperText?: string;  
  required?: boolean;  
}  
  
export const Input: React.FC<InputProps> = ({  
  label,  
  icon,  
  error,  
  helperText,  
  required = false,  
  ...props  
}) => {  
  const theme = useTheme();  
  
  return (  
    <View style={styles.container}>  
      {label && (  
        <View style={styles.labelContainer}>  
          {icon && <View style={styles.icon}>{icon}</View>}  
          <Text  
            style={[  
              theme.typography.label,  
              { color: theme.colors.text, flex: 1 }, // Movido a StyleSheet  
            ]}  
          >  
            {label}  
            {required && <Text style={{ color: theme.colors.error }}> *</Text>}  
          </Text>  
        </View>  
      )}  
      <TextInput  
        style={[  
          styles.input,  
          {  
            borderColor: error ? theme.colors.error : theme.colors.border,  
            borderRadius: theme.borderRadius.md,  
            paddingHorizontal: theme.spacing.md,  
            paddingVertical: theme.spacing.md,  
            fontSize: theme.typography.body.fontSize,  
            color: theme.colors.text,  
            backgroundColor: theme.colors.surface,  
          },  
        ]}  
        placeholderTextColor={theme.colors.textTertiary}  
        {...props}  
      />  
      {error && (  
        <Text  
          style={[  
            theme.typography.small,  
            { color: theme.colors.error, marginTop: theme.spacing.sm },  
          ]}  
        >  
          {error}  
        </Text>  
      )}  
      {helperText && !error && (  
        <Text  
          style={[  
            theme.typography.small,  
            { color: theme.colors.textSecondary, marginTop: theme.spacing.sm },  
          ]}  
        >  
          {helperText}  
        </Text>  
      )}  
    </View>  
  );  
};  
  
const styles = StyleSheet.create({  
  container: {  
    marginBottom: 16,  
  },  
  labelContainer: {  
    flexDirection: 'row',  
    alignItems: 'center',  
    marginBottom: 8,  
  },  
  icon: {  
    marginRight: 8,  
  },  
  input: {  
    borderWidth: 1,  
  },  
});