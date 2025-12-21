// src/screens/register/Phase3BirthDate.tsx  
import React, { useState } from 'react';  
import { View, Text, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';  
import DateTimePicker from '@react-native-community/datetimepicker';  
import { Button } from '../../components/Button';  
import { useTheme } from '../../theme/ThemeContext';  
import { Phase3Data } from '../../types/auth';  
  
interface Phase3BirthDateProps {  
  onComplete: (data: Phase3Data) => void;  
  onBack: () => void;  
  loading: boolean;  
}  
  
export const Phase3BirthDate: React.FC<Phase3BirthDateProps> = ({  
  onComplete,  
  onBack,  
  loading,  
}) => {  
  const theme = useTheme();  
  const [birthDate, setBirthDate] = useState<Date | null>(null);  
  const [showPicker, setShowPicker] = useState(false);  
  
  const formatDate = (date: Date) => {  
    return date.toLocaleDateString('es-ES', {  
      day: '2-digit',  
      month: '2-digit',  
      year: 'numeric',  
    });  
  };  
  
  const handleComplete = () => {  
    if (!birthDate) {  
      Alert.alert('Error', 'Por favor selecciona tu fecha de nacimiento');  
      return;  
    }  
    onComplete({ birthDate: birthDate.toISOString().split('T')[0] });  
  };  
  
  const onChange = (event: any, selectedDate?: Date) => {  
    setShowPicker(Platform.OS === 'ios');  
    if (selectedDate) {  
      setBirthDate(selectedDate);  
    }  
  };  
  
  return (  
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>  
      <View style={styles.card}>
        <Text style={[styles.title, { color: theme.colors.text }]}>  
          Fecha de nacimiento  
        </Text>  
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>  
          Paso 4 de 4  
        </Text>  
        <View style={styles.stepper}>
          {[1, 2, 3, 4].map((step) => {
            const isActive = step === 4;
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
  
        <TouchableOpacity  
          style={[  
            styles.dateInput,  
            {  
              borderColor: theme.colors.border,  
              backgroundColor: theme.colors.surface,  
            },  
          ]}  
          onPress={() => setShowPicker(true)}  
        >  
          <Text  
            style={[  
              styles.dateText,  
              { color: birthDate ? theme.colors.text : theme.colors.textTertiary },  
            ]}  
          >  
            {birthDate ? formatDate(birthDate) : 'Selecciona tu fecha de nacimiento'}  
          </Text>  
        </TouchableOpacity>  
  
        {showPicker && (  
          <DateTimePicker  
            value={birthDate || new Date()}  
            mode="date"  
            display="default"  
            onChange={onChange}  
            maximumDate={new Date()}  
          />  
        )}  
  
        <View style={styles.buttonContainer}>  
          <Button title="Anterior" onPress={onBack} variant="tertiary" />  
          <Button title="Completar registro" onPress={handleComplete} loading={loading} />  
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
    marginBottom: 16,  
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
  dateInput: {  
    borderWidth: 1,  
    padding: 16,  
    marginBottom: 16,  
    borderRadius: 8,  
    height: 54,  
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },  
  dateText: {  
    fontSize: 16,  
  },  
  buttonContainer: {  
    flexDirection: 'row',  
    justifyContent: 'space-between',  
    marginTop: 20,  
  },  
});
