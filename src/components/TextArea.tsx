// src/components/TextArea.tsx  
import React from 'react';  
import {
  TextInput,
  View,
  Text,
  StyleSheet,
  TextInputProps,
  StyleProp,
  TextStyle,
  ViewStyle,
} from 'react-native';  
import { useTheme } from '../theme/ThemeContext';  
  
interface TextAreaProps extends TextInputProps {  
  label?: string;  
  error?: string;  
  required?: boolean;  
  maxLength?: number;  
  containerStyle?: StyleProp<ViewStyle>;  
  inputStyle?: StyleProp<TextStyle>;  
  labelStyle?: StyleProp<TextStyle>;  
}  
  
export const TextArea: React.FC<TextAreaProps> = ({  
  label,  
  error,  
  required = false,  
  maxLength = 500,  
  containerStyle,  
  inputStyle,  
  labelStyle,  
  ...props  
}) => {  
  const theme = useTheme();  
  const [charCount, setCharCount] = React.useState(0);  
  
  return (  
    <View style={[styles.container, containerStyle]}>  
      {label && (  
        <Text  
          style={[  
            theme.typography.label,  
            styles.label,  
            { color: theme.colors.text },  
            labelStyle,  
          ]}  
        >  
          {label}  
          {required && <Text style={styles.required}> *</Text>}  
        </Text>  
      )}  
      <TextInput  
        style={[  
          styles.textarea,  
          {  
            borderColor: error
              ? theme.colors.error
              : theme.colors.glassBorderSoft,  
            borderRadius: theme.borderRadius.lg,  
            paddingHorizontal: theme.spacing.md,  
            paddingVertical: theme.spacing.md,  
            fontSize: theme.typography.body.fontSize,  
            color: theme.colors.textStrong,  
            backgroundColor: theme.colors.glassSurface,  
          },  
          inputStyle,  
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
              styles.errorText,  
              { color: theme.colors.error },  
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
  label: {  
    marginBottom: 8,  
  },  
  required: {  
    color: '#EF4444',  
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
  errorText: {  
    flex: 1,  
  },  
});  
  
