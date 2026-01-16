// src/screens/register/Phase3BirthDate.tsx  
import React, { useState, useMemo } from 'react';  
import { View, Text, TouchableOpacity, Alert, Platform } from 'react-native';  
import DateTimePicker from '@react-native-community/datetimepicker';  
import { Button } from '../../components/Button';  
import { useTheme } from '../../theme/ThemeContext';  
import { Phase3Data } from '../../types/auth';  
import { Phase3BirthDateStyles } from '../../styles/screens';
  
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
  const styles = useMemo(() => Phase3BirthDateStyles(theme), [theme]);  
  const [birthDate, setBirthDate] = useState<Date | null>(null);  
  const [showPicker, setShowPicker] = useState(false);  
  const [isTooYoung, setIsTooYoung] = useState(false);
  
  const formatDate = (date: Date) => {  
    return date.toLocaleDateString('es-ES', {  
      day: '2-digit',  
      month: '2-digit',  
      year: 'numeric',  
    });  
  };  

  const isOlderThan16 = (date: Date) => {
    const today = new Date();
    const cutoff = new Date(
      today.getFullYear() - 16,
      today.getMonth(),
      today.getDate()
    );
    return date < cutoff;
  };
  
  const handleComplete = () => {  
    if (!birthDate) {  
      Alert.alert('Error', 'Por favor selecciona tu fecha de nacimiento');  
      return;  
    }  
    if (!isOlderThan16(birthDate)) {
      Alert.alert('Error', 'Debes tener mas de 16 anos para registrarte');
      return;
    }
    onComplete({ birthDate: birthDate.toISOString().split('T')[0] });  
  };  
  
  const onChange = (event: any, selectedDate?: Date) => {  
    setShowPicker(Platform.OS === 'ios');  
    if (selectedDate) {  
      setBirthDate(selectedDate);
      setIsTooYoung(!isOlderThan16(selectedDate));
    }  
  };  
  
  return (  
    <View style={styles.container}>  
      <View style={styles.card}>
        <Text style={[styles.title, { color: theme.colors.text }]}>  
          Fecha de nacimiento  
        </Text>  
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>  
          Paso 5 de 5  
        </Text>  
        <View style={styles.stepper}>
          <View
            style={[
              styles.progressFill,
              { width: '100%', backgroundColor: theme.colors.primary },
            ]}
          />
        </View>
        <View style={styles.divider} />
  
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
  
        {isTooYoung && (
          <Text style={[styles.subtitle, { color: theme.colors.error }]}>
            Debes tener mas de 16 anos para registrarte.
          </Text>
        )}
        <View style={styles.buttonContainer}>  
          <Button title="Anterior" onPress={onBack} variant="tertiary" />  
          <Button
            title="Completar registro"
            onPress={handleComplete}
            loading={loading}
            disabled={isTooYoung}
          />  
        </View>  
      </View>
    </View>  
  );  
};  
  
