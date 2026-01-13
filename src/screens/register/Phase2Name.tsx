// src/screens/register/Phase2Name.tsx  
import React, { useState, useMemo } from 'react';  
import {
  View,
  Text,
  TextInput,
  Alert,
} from 'react-native';  
import { Button } from '../../components/Button';  
import { useTheme } from '../../theme/ThemeContext';  
import { Phase2Data } from '../../types/auth';  
import { Phase2NameStyles } from '../../styles/screens';
  
interface Phase2NameProps {  
  onNext: (data: Phase2Data) => void;  
  onBack: () => void;  
  onInputFocus?: (event: any) => void;
  loading: boolean;  
}  
  
export const Phase2Name: React.FC<Phase2NameProps> = ({  
  onNext,  
  onBack,  
  onInputFocus,
  loading,  
}) => {  
  const theme = useTheme();
  const styles = useMemo(() => Phase2NameStyles(theme), [theme]);  
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
      <View style={styles.card}>
        <Text style={[styles.title, { color: theme.colors.text }]}>  
          Tu información  
        </Text>  
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>  
          Paso 2 de 5  
        </Text>  
        <View style={styles.stepper}>
          <View
            style={[
              styles.progressFill,
              { width: '40%', backgroundColor: theme.colors.primary },
            ]}
          />
        </View>
        <View style={styles.divider} />
  
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
          onFocus={onInputFocus}
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
          onFocus={onInputFocus}
        />  

  
        <View style={styles.buttonContainer}>  
          <Button title="Anterior" onPress={onBack} variant="tertiary" />  
          <Button title="Continuar" onPress={handleNext} loading={loading} />  
        </View>  
      </View>
    </View>  
  );  
};  
  
