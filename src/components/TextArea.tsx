// src/components/TextArea.tsx  
import React from 'react';  
import { TextInput, View, Text, StyleSheet, TextInputProps } from 'react-native';  
import { useTheme } from '../theme/ThemeContext';  
  
interface TextAreaProps extends TextInputProps {  
  label?: string;  
  error?: string;  
  required?: boolean;  
  maxLength?: number;  
}  
  
export const TextArea: React.FC<TextAreaProps> = ({  
  label,  
  error,  
  required = false,  
  maxLength = 500,  
  ...props  
}) => {  
  const theme = useTheme();  
  const [charCount, setCharCount] = React.useState(0);  
  
  return (  
    <View style={styles.container}>  
      {label && (  
        <Text  
          style={[  
            theme.typography.label,  
            { color: theme.colors.text, marginBottom: theme.spacing.sm },  
          ]}  
        >  
          {label}  
          {required && <Text style={{ color: theme.colors.error }}> *</Text>}  
        </Text>  
      )}  
      <TextInput  
        style={[  
          styles.textarea,  
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
        multiline  
        numberOfLines={4}  
        maxLength={maxLength}  
        placeholderTextColor={theme.colors.textTertiary}  
        onChangeText={(text) => setCharCount(text.length)}  
        {...props}  
      />  
      <View style={styles.footer}>  
        {error && (  
          <Text  
            style={[  
              theme.typography.small,  
              { color: theme.colors.error, flex: 1 },  
            ]}  
          >  
            {error}  
          </Text>  
        )}  
        <Text  
          style={[  
            theme.typography.small,  
            { color: theme.colors.textSecondary },  
          ]}  
        >  
          {charCount}/{maxLength}  
        </Text>  
      </View>  
    </View>  
  );  
}; 

const styles = StyleSheet.create({  
  container: {  
    marginBottom: 16,  
  },  
  textarea: {  
    borderWidth: 1,  
    textAlignVertical: 'top',  
  },  
  footer: {  
    flexDirection: 'row',  
    justifyContent: 'space-between',  
    alignItems: 'center',  
    marginTop: 4,  
  },  
});