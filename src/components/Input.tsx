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
              styles.label,  
              { color: theme.colors.text },  
            ]}  
          >  
            {label}  
            {required && <Text style={styles.required}> *</Text>}  
          </Text>  
        </View>  
      )}  
      <TextInput  
        style={[  
          styles.input,  
          {  
            borderColor: error ? theme.colors.error : theme.colors.borderLight,  
            borderRadius: theme.borderRadius.full,  
            paddingHorizontal: theme.spacing.md,  
            paddingVertical: 12,  
            fontSize: theme.typography.body.fontSize,  
            color: theme.colors.text,  
            backgroundColor: theme.colors.background,  
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
  label: {  
    flex: 1,  
  },  
  required: {  
    color: '#EF4444',  
  },  
  input: {  
    borderWidth: 1,  
  },  
});
