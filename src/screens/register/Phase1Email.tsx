// src/screens/register/Phase1Email.tsx  
import React, { useState, useEffect, useMemo } from 'react';  
import { View, Text, TextInput, ActivityIndicator } from 'react-native';  
import { Button } from '../../components/Button';  
import { GoogleSignInButton } from '../../components/GoogleSignInButton';  
import { useTheme } from '../../theme/ThemeContext';  
import { Phase1Data } from '../../types/auth';  
import { Phase1EmailStyles } from '../../styles/screens';
import { authService } from '../../services/authService';
  
interface Phase1EmailProps {  
  onNext: (data: Phase1Data) => void;  
  onGoogleSignIn: () => void;  
  onGoToLogin: () => void;  
  onInputFocus?: (event: any) => void;
  loading: boolean;  
}  
  
export const Phase1Email: React.FC<Phase1EmailProps> = ({  
  onNext,  
  onGoogleSignIn,  
  onGoToLogin,  
  onInputFocus,
  loading,  
}) => {  
  const theme = useTheme();
  const styles = useMemo(() => Phase1EmailStyles(theme), [theme]);  
  const [email, setEmail] = useState('');  
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [checkingEmail, setCheckingEmail] = useState(false);

  // Regex para validar email
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const validateEmail = (emailValue: string): boolean => {
    if (!emailValue) {
      setEmailError('Por favor ingresa tu email');
      return false;
    }
    if (!EMAIL_REGEX.test(emailValue)) {
      setEmailError('El formato del email no es válido');
      return false;
    }
    setEmailError(null);
    return true;
  };  
  
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
  
  const handleNext = async () => {  
    console.log('📝 Phase1Email: handleNext called');  
    console.log('📝 Phase1Email: Form data:', {  
      email: email || 'empty',  
      password: password ? '***' : 'empty'  
    });  
  
    // Validar formato de email
    if (!validateEmail(email)) {
      console.log('⛔ Phase1Email: Validation failed - invalid email format');
      return;
    }
    if (!password) {  
      console.log('⛔ Phase1Email: Validation failed - empty password');  
      return;  
    }  

    // Verificar si el email ya existe en la base de datos
    setCheckingEmail(true);
    setEmailError(null);
    try {
      const emailExists = await authService.checkEmailExists(email);
      if (emailExists) {
        console.log('⛔ Phase1Email: Email already exists');
        setEmailError('Este email ya está registrado. ¿Quieres iniciar sesión?');
        setCheckingEmail(false);
        return;
      }
    } catch (error) {
      console.error('⛔ Phase1Email: Error checking email:', error);
      setEmailError('Error al verificar el email. Inténtalo de nuevo.');
      setCheckingEmail(false);
      return;
    }
    setCheckingEmail(false);
  
    const phaseData: Phase1Data = { email, password };  
    console.log('✔️ Phase1Email: Validation passed, calling onNext with:', {  
      email: phaseData.email,  
      password: '***'  
    });  
  
    try {  
      onNext(phaseData);  
      console.log('✔️ Phase1Email: onNext callback executed successfully');  
    } catch (error) {  
      console.error('⛔ Phase1Email: Error in onNext callback:', error);  
      console.error('⛔ Error en fase 1:', error);  
    }  
  };  
  
  const handleEmailChange = (text: string) => {  
    console.log('📝 Phase1Email: Email changed:', text || 'empty');  
    setEmail(text);
    // Limpiar error cuando el usuario empieza a escribir
    if (emailError) {
      setEmailError(null);
    }
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
              borderColor: emailError ? theme.colors.error : theme.colors.border,  
              backgroundColor: theme.colors.surface,  
              color: theme.colors.text,  
            },  
          ]}  
          placeholder="Email"  
          placeholderTextColor={theme.colors.textTertiary}  
          value={email}  
          onChangeText={handleEmailChange}  
          onFocus={onInputFocus}
          keyboardType="email-address"  
          autoCapitalize="none"  
        />
        {emailError && (
          <Text style={[styles.errorText, { color: theme.colors.error }]}>
            {emailError}
          </Text>
        )}  
  
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
          onFocus={onInputFocus}
          secureTextEntry  
        />  
  
        <View style={styles.authButtons}>
          <GoogleSignInButton onPress={handleGoogleSignIn} loading={loading} />  
        </View>
        <Button 
          title={checkingEmail ? "Verificando..." : "Continuar"} 
          onPress={handleNext} 
          loading={loading || checkingEmail} 
        />  
      </View>
    </View>  
  );  
};  
  


