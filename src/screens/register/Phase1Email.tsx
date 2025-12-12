// src/screens/register/Phase1Email.tsx  
import React, { useState } from 'react';  
import { View, Text, TextInput, StyleSheet, Alert } from 'react-native';  
import { Button } from '../../components/Button';  
import { GoogleSignInButton } from '../../components/GoogleSignInButton';  
import { useTheme } from '../../theme/ThemeContext';  
import { Phase1Data } from '../../types/auth';  
  
interface Phase1EmailProps {  
  onNext: (data: Phase1Data) => void;  
  onGoogleSignIn: () => void;  
  onGoToLogin: () => void;  
  loading: boolean;  
}  
  
export const Phase1Email: React.FC<Phase1EmailProps> = ({  
  onNext,  
  onGoogleSignIn,  
  onGoToLogin,  
  loading,  
}) => {  
  const theme = useTheme();  
  const [email, setEmail] = useState('');  
  const [password, setPassword] = useState('');  
  
  const handleNext = () => {  
    if (!email) {  
      Alert.alert('Error', 'Por favor ingresa tu email');  
      return;  
    }  
    if (!password) {  
      Alert.alert('Error', 'Por favor ingresa tu contraseña');  
      return;  
    }  
    onNext({ email, password });  
  };  
  
  return (  
    <View style={styles.container}>  
      <Text style={[styles.title, { color: theme.colors.text }]}>  
        Crea tu cuenta  
      </Text>  
      <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>  
        Paso 1 de 3  
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
        placeholder="Email"  
        placeholderTextColor={theme.colors.textTertiary}  
        value={email}  
        onChangeText={setEmail}  
        keyboardType="email-address"  
        autoCapitalize="none"  
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
        placeholder="Contraseña"  
        placeholderTextColor={theme.colors.textTertiary}  
        value={password}  
        onChangeText={setPassword}  
        secureTextEntry  
      />  
  
      <GoogleSignInButton onPress={onGoogleSignIn} loading={loading} />  
      <Button   
        title="¿Ya tienes cuenta? Inicia sesión"   
        onPress={onGoToLogin}   
        variant="secondary"   
      />  
      <Button title="Continuar" onPress={handleNext} loading={loading} />  
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
});