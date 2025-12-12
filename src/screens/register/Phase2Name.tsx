// src/screens/register/Phase2Name.tsx  
import React, { useState } from 'react';  
import { View, Text, TextInput, StyleSheet, Alert } from 'react-native';  
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
    <View style={styles.container}>  
      <Text style={[styles.title, { color: theme.colors.text }]}>  
        Tu información  
      </Text>  
      <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>  
        Paso 2 de 3  
      </Text>  
  
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
  );  
};  
  
const styles = StyleSheet.create({  
  container: {  
    flex: 1,  
    justifyContent: 'center',  
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
    marginBottom: 40,  
  },  
  input: {  
    borderWidth: 1,  
    padding: 16,  
    marginBottom: 16,  
    fontSize: 16,  
    borderRadius: 8,  
  },  
  buttonContainer: {  
    flexDirection: 'row',  
    justifyContent: 'space-between',  
    marginTop: 20,  
  },  
});