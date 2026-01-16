// src/screens/LoginScreen.tsx  
import React, { useState, useContext, useMemo } from 'react';  
import {
  View,
  Text,
  TextInput,
  Alert,
  Image,
  ImageBackground,
  StyleSheet,
} from 'react-native';  
import { useNavigation } from '@react-navigation/native';  
import { StackNavigationProp } from '@react-navigation/stack';  
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';  
import { Button } from '../components/Button';  
import { KeyboardAwareContainer } from '../components/KeyboardAwareContainer';
import { useTheme } from '../theme/ThemeContext';  
import { authService } from '../services/authService';
import { statusCodes } from '@react-native-google-signin/google-signin';  
import { GoogleSignInButton } from '../components/GoogleSignInButton';  
import { LoginScreenStyles } from '../styles/screens';
import LinearGradient from 'react-native-linear-gradient';
import { colors } from '../theme';
  

type RootStackParamList = {  
  Login: undefined;  
  Register: undefined;  
  Main: undefined;  
  ForgotPassword: undefined;
};  
  
type LoginScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Login'>;  
  
export const LoginScreen: React.FC = () => {  
  const navigation = useNavigation<LoginScreenNavigationProp>();  
  const insets = useSafeAreaInsets();
  const authContext = useContext(AuthContext);  
      
  // Ensure context exists  
  if (!authContext) {  
    throw new Error('LoginScreen must be used within AuthProvider');  
  }  
      
  const { login, loginWithSession } = authContext;  
  const theme = useTheme();
  const styles = useMemo(() => LoginScreenStyles(theme), [theme]);  
  const [email, setEmail] = useState('');  
  const [password, setPassword] = useState('');  
  const [loading, setLoading] = useState(false);
  
  const handleLogin = async () => {  
    if (!email || !password) {  
      Alert.alert('Error', 'Por favor completa todos los campos');  
      return;  
    }  
    
    setLoading(true);  
    try {  
      await login(email, password);  
      // La navegación se manejará automáticamente por el AuthContext  
    } catch (error) {  
      Alert.alert('Error', error instanceof Error ? error.message : 'Error desconocido');  
    } finally {  
      setLoading(false);  
    }  
  };  
  
  const handleGoogleSignIn = async () => {  
    setLoading(true);  
    try {  
      const result = await authService.loginWithGoogle(true);  
      await loginWithSession(result.user, result.token, result.refreshToken);  
      // La navegación se manejará automáticamente por el AuthContext  
    } catch (error) {
      const typedError = error as { code?: string; message?: string };
      console.error('? Error en login con Google:', error);
      console.log('[GoogleSignIn] error.code:', typedError?.code);
      console.log('[GoogleSignIn] error.message:', typedError?.message);
      if (typedError?.code === statusCodes.SIGN_IN_CANCELLED) {
        console.log('[GoogleSignIn] User cancelled sign-in');
      }
      Alert.alert('Error', error instanceof Error ? error.message : 'Error desconocido');  
    } finally {  
      setLoading(false);  
    }  
  };  
    
  return (  
    <View style={styles.container}>
      <ImageBackground
        source={{
          uri: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1200&q=80',
        }}
        blurRadius={18}
        style={styles.background}
      >
        <LinearGradient
          colors={[colors.glassOverlay, colors.glassWarmStrong]}
          style={StyleSheet.absoluteFillObject}
        />
      </ImageBackground>
      <KeyboardAwareContainer
        style={styles.transparentBackground}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top }]}
        withSafeAreaBottom
        extraScrollHeight={120}
      >
        <View style={styles.header}>  
        <Image
          source={require('../assets/homiLogo.png')}
          style={[styles.logoImage, styles.logoImageMuted]}
          resizeMode="contain"
        />
  
        <Text style={[styles.logo, { color: theme.colors.text }]}>HomiMatch</Text>  
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>  
          Encuentra tu compañero ideal  
        </Text>  
      </View>  
            
      <View style={styles.form}>  
        <TextInput  
          style={[  
            styles.input,  
            {  
              borderColor: theme.colors.border,  
              borderRadius: theme.borderRadius.md,  
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
              borderRadius: theme.borderRadius.md,  
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
  
        
        <Button
          title="Olvidaste tu contrasena?"
          onPress={() => navigation.navigate('ForgotPassword')}
          variant="tertiary"
        />

        <Button
          title="Iniciar Sesión"  
          onPress={handleLogin}  
          loading={loading}  
        />  
  
        <GoogleSignInButton  
          onPress={handleGoogleSignIn}  
          loading={loading}  
        />  
              
        <Button  
          title="¿No tienes cuenta? Regístrate"  
          onPress={() => navigation.navigate('Register')}  
          variant="tertiary"  
        />  
      </View>  
      </KeyboardAwareContainer>
    </View>  
  );  
};
