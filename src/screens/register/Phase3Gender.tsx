// src/screens/register/Phase3Gender.tsx  
import React, { useState, useMemo } from 'react';  
import { View, Text, Alert, TouchableOpacity } from 'react-native';  
import { Button } from '../../components/Button';  
import { useTheme } from '../../theme/ThemeContext';  
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
  const styles = useMemo(() => Phase3GenderStyles(theme), [theme]);  
  const [gender, setGender] = useState<Gender | null>(null);
  
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
        <Text style={[styles.title, { color: theme.colors.text }]}>  
          Tu género  
        </Text>  
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>  
          Paso 3 de 5  
        </Text>  
        <Text style={[styles.helper, { color: theme.colors.textSecondary }]}>
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
                  isActive && {
                    backgroundColor: theme.colors.primaryTint,
                    borderColor: theme.colors.primaryMuted,
                  },
                ]}
                onPress={() => setGender(option.id)}
              >
                <Text
                  style={[
                    styles.segmentButtonText,
                    { color: theme.colors.text },
                    isActive && { color: theme.colors.primary },
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
  
