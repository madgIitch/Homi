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
    console.log('ÐY"? Phase1Email: Component mounted');  
    console.log('ÐY"? Phase1Email: Props received:', {  
      hasNext: typeof onNext,  
      hasGoogleSignIn: typeof onGoogleSignIn,  
      hasGoToLogin: typeof onGoToLogin,  
      loading  
    });  
  }, [loading, onGoToLogin, onGoogleSignIn, onNext]); // Added all dependencies  
  
  const handleNext = () => {  
    console.log('ÐY"? Phase1Email: handleNext called');  
    console.log('ÐY"? Phase1Email: Form data:', {  
      email: email || 'empty',  
      password: password ? '***' : 'empty'  
    });  
  
    if (!email) {  
      console.log('ƒ?O Phase1Email: Validation failed - empty email');  
      Alert.alert('Error', 'Por favor ingresa tu email');  
      return;  
    }  
    if (!password) {  
      console.log('ƒ?O Phase1Email: Validation failed - empty password');  
      Alert.alert('Error', 'Por favor ingresa tu contraseña');  
      return;  
    }  
  
    const phaseData: Phase1Data = { email, password };  
    console.log('ƒo. Phase1Email: Validation passed, calling onNext with:', {  
      email: phaseData.email,  
      password: '***'  
    });  
  
    try {  
      onNext(phaseData);  
      console.log('ƒo. Phase1Email: onNext callback executed successfully');  
    } catch (error) {  
      console.error('ƒ?O Phase1Email: Error in onNext callback:', error);  
      console.error('ƒ?O Error en fase 1:', error);  
    }  
  };  
  
  const handleEmailChange = (text: string) => {  
    console.log('ÐY"? Phase1Email: Email changed:', text || 'empty');  
    setEmail(text);  
  };  
  
  const handlePasswordChange = (text: string) => {  
    console.log('ÐY"? Phase1Email: Password changed:', text ? '***' : 'empty');  
    setPassword(text);  
  };  
  
  const handleGoogleSignIn = () => {  
    console.log('ÐY"? Phase1Email: Google Sign-In button pressed');  
    onGoogleSignIn();  
  };  
  
  const handleGoToLogin = () => {  
    console.log('ÐY"? Phase1Email: Go to Login button pressed');  
    onGoToLogin();  
  };  
  
  return (  
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>  
      <View style={styles.card}>
      <Text style={[styles.title, { color: theme.colors.text }]}>  
          Crea tu cuenta  
        </Text>  
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>  
          Paso 1 de 4  
        </Text>  
        <View style={styles.stepper}>
          {[1, 2, 3, 4].map((step) => {
            const isActive = step === 1;
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
  
        <View style={styles.authButtons}>
          <GoogleSignInButton onPress={handleGoogleSignIn} loading={loading} />  
        </View>
        <Button  
          title="¿Ya tienes cuenta? Inicia sesión"  
          onPress={handleGoToLogin}  
          variant="secondary"  
        />  
        <Button title="Continuar" onPress={handleNext} loading={loading} />  
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
  authButtons: {
    marginBottom: 8,
  },
});
