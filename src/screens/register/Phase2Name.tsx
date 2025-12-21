// src/screens/register/Phase2Name.tsx  
import React, { useState } from 'react';  
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
} from 'react-native';  
import { Button } from '../../components/Button';  
import { useTheme } from '../../theme/ThemeContext';  
import { Phase2Data } from '../../types/auth';  
  
interface Phase2NameProps {  
  onNext: (data: Phase2Data) => void;  
  onBack: () => void;  
  loading: boolean;  
}  
  
export const Phase2Name: React.FC<Phase2NameProps> = ({  
  onNext,  
  onBack,  
  loading,  
}) => {  
  const theme = useTheme();  
  const [firstName, setFirstName] = useState('');  
  const [lastName, setLastName] = useState('');  
  
  const handleNext = () => {  
    if (!firstName.trim()) {  
      Alert.alert('Error', 'Por favor ingresa tu nombre');  
      return;  
    }  
    if (!lastName.trim()) {  
      Alert.alert('Error', 'Por favor ingresa tus apellidos');  
      return;  
    }  
    onNext({ firstName, lastName });  
  };  
  
  return (  
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>  
      <View style={styles.card}>
        <Text style={[styles.title, { color: theme.colors.text }]}>  
          Tu información  
        </Text>  
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>  
          Paso 2 de 4  
        </Text>  
        <View style={styles.stepper}>
          {[1, 2, 3, 4].map((step) => {
            const isActive = step === 2;
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
  
        <TextInput  
          style={[  
            styles.input,  
            {  
              borderColor: theme.colors.border,  
              backgroundColor: theme.colors.surface,  
              color: theme.colors.text,  
            },  
          ]}  
          placeholder="Nombre"  
          placeholderTextColor={theme.colors.textTertiary}  
          value={firstName}  
          onChangeText={setFirstName}  
        />  
  
        <TextInput  
          style={[  
            styles.input,  
            {  
              borderColor: theme.colors.border,  
              backgroundColor: theme.colors.surface,  
              color: theme.colors.text,  
            },  
          ]}  
          placeholder="Apellidos"  
          placeholderTextColor={theme.colors.textTertiary}  
          value={lastName}  
          onChangeText={setLastName}  
        />  

  
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
  input: {  
    borderWidth: 1,  
    padding: 16,  
    marginBottom: 16,  
    fontSize: 16,  
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },  
  buttonContainer: {  
    flexDirection: 'row',  
    justifyContent: 'space-between',  
    marginTop: 20,  
  },  
});
