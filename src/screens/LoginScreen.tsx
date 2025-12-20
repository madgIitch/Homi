// src/screens/LoginScreen.tsx  
import React, { useState, useContext } from 'react';  
import { View, Text, TextInput, StyleSheet, Alert, Image } from 'react-native';  
import { useNavigation } from '@react-navigation/native';  
import { StackNavigationProp } from '@react-navigation/stack';  
import { AuthContext } from '../context/AuthContext';  
import { Button } from '../components/Button';  
import { useTheme } from '../theme/ThemeContext';  
import { authService } from '../services/authService';  
import { GoogleSignInButton } from '../components/GoogleSignInButton';  
  

type RootStackParamList = {  
  Login: undefined;  
  Register: undefined;  
  Main: undefined;  
};  
  
type LoginScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Login'>;  
  
export const LoginScreen: React.FC = () => {  
  const navigation = useNavigation<LoginScreenNavigationProp>();  
  const authContext = useContext(AuthContext);  
      
  // Ensure context exists  
  if (!authContext) {  
    throw new Error('LoginScreen must be used within AuthProvider');  
  }  
      
  const { login, loginWithSession } = authContext;  
  const theme = useTheme();  
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
      const result = await authService.loginWithGoogle();  
      await loginWithSession(result.user, result.token, result.refreshToken);  
      // La navegación se manejará automáticamente por el AuthContext  
    } catch (error) {  
      console.error('❌ Error en login con Google:', error);  
      Alert.alert('Error', error instanceof Error ? error.message : 'Error desconocido');  
    } finally {  
      setLoading(false);  
    }  
  };  
    
  return (  
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>  
      <View style={styles.header}>  
        <Image
          source={require('../assets/homiLogo.png')}
          style={styles.logoImage}
          resizeMode="contain"
        />
  
        <Text style={[styles.logo, { color: theme.colors.primary }]}>HomiMatch</Text>  
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
    </View>  
  );  
};  
  
const styles = StyleSheet.create({  
  container: {  
    flex: 1,  
    padding: 24,  
  },  
  header: {  
    alignItems: 'center',  
    marginTop: 80,  
    marginBottom: 80,  
  },  
  logoImage: {  
    width: 84,  
    height: 84,  
    marginBottom: 12,  
  },  
  logo: {  
    fontSize: 32,  
    fontWeight: 'bold',  
    marginBottom: 8,  
  },  
  subtitle: {  
    fontSize: 16,  
  },  
  form: {  
    flex: 1,  
    justifyContent: 'center',  
  },  
  input: {  
    borderWidth: 1,  
    padding: 16,  
    marginBottom: 16,  
    fontSize: 16,  
  },  
});
