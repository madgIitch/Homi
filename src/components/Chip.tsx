// src/components/Chip.tsx  
import React from 'react';  
import { Text, StyleSheet, View } from 'react-native';  
import { useTheme } from '../theme/ThemeContext';  
  
interface ChipProps {  
  label: string;  
  selected?: boolean;  
}  
  
export const Chip: React.FC<ChipProps> = ({ label, selected = false }) => {  
  const theme = useTheme();  
    
  return (  
    <View style={[  
      styles.chip,  
      selected ? styles.chipSelected : styles.chipDefault  
    ]}>  
      <Text style={[  
        styles.chipText,  
        selected ? styles.chipTextSelected : { color: theme.colors.text }  
      ]}>  
        {label}  
      </Text>  
    </View>  
  );  
};  
  
const styles = StyleSheet.create({  
  chip: {  
    paddingHorizontal: 12,  
    paddingVertical: 6,  
    borderRadius: 16,  
    borderWidth: 1,  
    borderColor: '#E5E7EB',  
  },  
  chipDefault: {  
    backgroundColor: '#F3F4F6',  
  },  
  chipSelected: {  
    backgroundColor: '#6B46C1',  
    borderWidth: 0,  
  },  
  chipText: {  
    fontSize: 14,  
    fontWeight: '500',  
  },  
  chipTextSelected: {  
    color: '#FFFFFF',  
    fontWeight: '600',  
  },  
});