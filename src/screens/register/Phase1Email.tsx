// src/screens/register/Phase1Email.tsx  
import React, { useState, useEffect } from 'react';  
import { View, Text, TextInput, Alert } from 'react-native';  
import { Button } from '../../components/Button';  
import { GoogleSignInButton } from '../../components/GoogleSignInButton';  
import { useTheme } from '../../theme/ThemeContext';  
import { Phase1Data } from '../../types/auth';  
import { Phase1EmailStyles as styles } from '../../styles/screens';
  
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
    <View style={styles.container}>  
      <View style={styles.card}>
      <Text style={[styles.title, { color: theme.colors.text }]}>  
          Crea tu cuenta  
        </Text>  
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>  
          Paso 1 de 5  
        </Text>  
        <View style={styles.stepper}>
          <View
            style={[
              styles.progressFill,
              { width: '20%', backgroundColor: theme.colors.primary },
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
        <Button title="Continuar" onPress={handleNext} loading={loading} />  
      </View>
    </View>  
  );  
};  
  


