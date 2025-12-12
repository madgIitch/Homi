// src/screens/register/Phase1Email.tsx  
import React, { useState, useEffect } from 'react';  
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
  
  // Log component mount  
  useEffect(() => {  
    console.log('📍 Phase1Email: Component mounted');  
    console.log('📍 Phase1Email: Props received:', {  
      hasNext: typeof onNext,  
      hasGoogleSignIn: typeof onGoogleSignIn,  
      hasGoToLogin: typeof onGoToLogin,  
      loading  
    });  
  }, [loading, onGoToLogin, onGoogleSignIn, onNext]); // Added all dependencies  
  
  const handleNext = () => {  
    console.log('📍 Phase1Email: handleNext called');  
    console.log('📍 Phase1Email: Form data:', {  
      email: email || 'empty',  
      password: password ? '***' : 'empty'  
    });  
  
    if (!email) {  
      console.log('❌ Phase1Email: Validation failed - empty email');  
      Alert.alert('Error', 'Por favor ingresa tu email');  
      return;  
    }  
    if (!password) {  
      console.log('❌ Phase1Email: Validation failed - empty password');  
      Alert.alert('Error', 'Por favor ingresa tu contraseña');  
      return;  
    }  
  
    const phaseData: Phase1Data = { email, password };  
    console.log('✅ Phase1Email: Validation passed, calling onNext with:', {  
      email: phaseData.email,  
      password: '***'  
    });  
  
    try {  
      onNext(phaseData);  
      console.log('✅ Phase1Email: onNext callback executed successfully');  
    } catch (error) {  
      console.error('❌ Phase1Email: Error in onNext callback:', error);  
      console.error('❌ Error en fase 1:', error);  
    }  
  };  
  
  const handleEmailChange = (text: string) => {  
    console.log('📝 Phase1Email: Email changed:', text || 'empty');  
    setEmail(text);  
  };  
  
  const handlePasswordChange = (text: string) => {  
    console.log('📝 Phase1Email: Password changed:', text ? '***' : 'empty');  
    setPassword(text);  
  };  
  
  const handleGoogleSignIn = () => {  
    console.log('📍 Phase1Email: Google Sign-In button pressed');  
    onGoogleSignIn();  
  };  
  
  const handleGoToLogin = () => {  
    console.log('📍 Phase1Email: Go to Login button pressed');  
    onGoToLogin();  
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
        onChangeText={handleEmailChange}  
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
        onChangeText={handlePasswordChange}  
        secureTextEntry  
      />  
  
      <GoogleSignInButton onPress={handleGoogleSignIn} loading={loading} />  
      <Button  
        title="¿Ya tienes cuenta? Inicia sesión"  
        onPress={handleGoToLogin}  
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