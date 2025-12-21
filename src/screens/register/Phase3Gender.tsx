// src/screens/register/Phase3Gender.tsx  
import React, { useState } from 'react';  
import { View, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';  
import { Button } from '../../components/Button';  
import { useTheme } from '../../theme/ThemeContext';  
import type { Gender } from '../../types/gender';
  
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
  const [gender, setGender] = useState<Gender | null>(null);
  
  const handleNext = () => {  
    if (!gender) {  
      Alert.alert('Error', 'Por favor selecciona tu género');  
      return;  
    }  
    onNext(gender);  
  };  
  
  return (  
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>  
      <View style={styles.card}>
        <Text style={[styles.title, { color: theme.colors.text }]}>  
          Tu género  
        </Text>  
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>  
          Paso 3 de 4  
        </Text>  
        <Text style={[styles.helper, { color: theme.colors.textSecondary }]}>
          Esto nos ayuda a mostrarte pisos y compas adecuados.
        </Text>
        <View style={styles.stepper}>
          {[1, 2, 3, 4].map((step) => {
            const isActive = step === 3;
            return (
              <View
                key={step}
                style={[
                  styles.stepDot,
                  {
                    backgroundColor: isActive ? theme.colors.primary : '#E5E7EB',
                  },
                ]}
              />
            );
          })}
        </View>
  
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
                  { borderColor: theme.colors.border },
                  isActive && {
                    backgroundColor: theme.colors.primary,
                    borderColor: theme.colors.primary,
                  },
                ]}
                onPress={() => setGender(option.id)}
              >
                <Text
                  style={[
                    styles.segmentButtonText,
                    { color: theme.colors.text },
                    isActive && { color: '#FFFFFF' },
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
  
const styles = StyleSheet.create({  
  container: {  
    flex: 1,  
    justifyContent: 'center',
    paddingHorizontal: 20,
  },  
  card: {
    borderRadius: 20,
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  title: {  
    fontSize: 24,  
    fontWeight: 'bold',  
    textAlign: 'center',  
    marginBottom: 8,  
  },  
  subtitle: {  
    fontSize: 16,  
    textAlign: 'center',  
    marginBottom: 6,  
  },  
  helper: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 18,
  },
  stepper: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  segmentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },
  segmentButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  segmentButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  buttonContainer: {  
    flexDirection: 'row',  
    justifyContent: 'space-between',  
    marginTop: 20,  
  },  
});
