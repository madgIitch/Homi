// src/components/FormSection.tsx  
import React from 'react';  
import { View, Text, StyleSheet } from 'react-native';  
import { useTheme } from '../theme/ThemeContext';  
  
interface FormSectionProps {  
  title: string;  
  subtitle?: string;  
  children: React.ReactNode;  
}  
  
export const FormSection: React.FC<FormSectionProps> = ({   
  title,   
  subtitle,   
  children   
}) => {  
  const theme = useTheme();  
  
  return (  
    <View style={styles.container}>  
      <View style={styles.header}>  
        <Text style={[theme.typography.sectionTitle, { color: theme.colors.text }]}>  
          {title}  
        </Text>  
        {subtitle && (  
          <Text style={[theme.typography.caption, { color: theme.colors.textSecondary }]}>  
            {subtitle}  
          </Text>  
        )}  
      </View>  
      <View style={styles.content}>  
        {children}  
      </View>  
    </View>  
  );  
};  
  
const styles = StyleSheet.create({  
  container: {  
    marginBottom: 24,  
  },  
  header: {  
    marginBottom: 16,  
  },  
  content: {  
    gap: 16,  
  },  
});