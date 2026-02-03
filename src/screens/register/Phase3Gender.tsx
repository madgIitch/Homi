// src/screens/register/Phase3Gender.tsx  
import React, { useState, useMemo } from 'react';  
import { View, Text, Alert, TouchableOpacity } from 'react-native';  
import { Button } from '../../components/Button';  
import { useTheme, useThemeController } from '../../theme/ThemeContext';  
import type { Gender } from '../../types/gender';
import { Phase3GenderStyles } from '../../styles/screens';
  
interface Phase3GenderProps {  
  onNext: (gender: Gender) => void;  
  onBack: () => void;  
  loading: boolean;  
}  
  
export const Phase3Gender: React.FC<Phase3GenderProps> = ({  
  onNext,  
  onBack,  
  loading,  
}) => {  
  const theme = useTheme();
  const { isDark } = useThemeController();
  const styles = useMemo(() => Phase3GenderStyles(theme), [theme]);  
  const [gender, setGender] = useState<Gender | null>(null);
  const subtitleColor = isDark ? theme.colors.textTertiary : theme.colors.textSecondary;
  const helperColor = isDark ? theme.colors.textTertiary : theme.colors.textSecondary;
  const baseChipStyle = isDark
    ? { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.borderLight }
    : null;
  const activeChipStyle = isDark
    ? { backgroundColor: theme.colors.primaryDark, borderColor: theme.colors.primary }
    : {
        backgroundColor: theme.colors.chipSelectedBackground,
        borderColor: theme.colors.chipSelectedBorder,
      };
  const baseChipTextColor = isDark ? theme.colors.textStrong : theme.colors.text;
  const activeChipTextColor = isDark ? theme.colors.textStrong : theme.colors.chipSelectedText;
  
  const handleNext = () => {  
    if (!gender) {  
      Alert.alert('Error', 'Por favor selecciona tu género');  
      return;  
    }  
    onNext(gender);  
  };  
  
  return (  
    <View style={styles.container}>  
      <View style={styles.card}>
        <Text
          style={[
            styles.title,
            { color: isDark ? theme.colors.textTertiary : theme.colors.text },
          ]}
        >
          Tu género  
        </Text>  
        <Text style={[styles.subtitle, { color: subtitleColor }]}>  
          Paso 3 de 5  
        </Text>  
        <Text style={[styles.helper, { color: helperColor }]}>
          Esto nos ayuda a mostrarte pisos y compas adecuados.
        </Text>
        <View style={styles.stepper}>
          <View
            style={[
              styles.progressFill,
              { width: '60%', backgroundColor: theme.colors.primary },
            ]}
          />
        </View>
        <View style={styles.divider} />
  
        <View style={styles.segmentRow}>
          {[
            { id: 'male' as const, label: 'Hombre' },
            { id: 'female' as const, label: 'Mujer' },
            { id: 'non_binary' as const, label: 'No binario' },
            { id: 'other' as const, label: 'Otro' },
          ].map((option) => {
            const isActive = gender === option.id;
            return (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.segmentButton,
                  baseChipStyle,
                  isActive && activeChipStyle,
                ]}
                onPress={() => setGender(option.id)}
              >
                <Text
                  style={[
                    styles.segmentButtonText,
                    { color: baseChipTextColor },
                    isActive && { color: activeChipTextColor },
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
  
        <View style={styles.buttonContainer}>  
          <Button title="Anterior" onPress={onBack} variant="tertiary" />  
          <Button title="Continuar" onPress={handleNext} loading={loading} />  
        </View>  
      </View>
    </View>  
  );  
};  
  
