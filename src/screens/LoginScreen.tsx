// screens/LoginScreen.tsx  
import React, { useState } from 'react';  
import { View, Text, TextInput, StyleSheet, Alert } from 'react-native';  
import { Button } from '../components/Button';  
import { colors, typography, spacing, borderRadius } from '../theme';  
import { authService } from '../services/authService';  
  
export const LoginScreen: React.FC = () => {  
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
      const user = await authService.login({ email, password });  
      // Navegar a pantalla principal  
      navigation.navigate('Main');  
    } catch (error) {  
      Alert.alert('Error', error.message);  
    } finally {  
      setLoading(false);  
    }  
  };  
  
  return (  
    <View style={styles.container}>  
      <View style={styles.header}>  
        <Text style={styles.logo}>HomiMatch</Text>  
        <Text style={styles.subtitle}>Encuentra tu compañero ideal</Text>  
      </View>  
        
      <View style={styles.form}>  
        <TextInput  
          style={styles.input}  
          placeholder="Email"  
          value={email}  
          onChangeText={setEmail}  
          keyboardType="email-address"  
          autoCapitalize="none"  
        />  
          
        <TextInput  
          style={styles.input}  
          placeholder="Contraseña"  
          value={password}  
          onChangeText={setPassword}  
          secureTextEntry  
        />  
          
        <Button  
          title="Iniciar Sesión"  
          onPress={handleLogin}  
          loading={loading}  
        />  
          
        <Button  
          title="¿No tienes cuenta? Regístrate"  
          onPress={() => navigation.navigate('Register')}  
          variant="secondary"  
        />  
      </View>  
    </View>  
  );  
};  
  
const styles = StyleSheet.create({  
  container: {  
    flex: 1,  
    backgroundColor: colors.background,  
    padding: spacing.lg,  
  },  
  header: {  
    alignItems: 'center',  
    marginTop: spacing.xl * 2,  
    marginBottom: spacing.xl * 2,  
  },  
  logo: {  
    ...typography.h1,  
    color: colors.primary,  
    marginBottom: spacing.sm,  
  },  
  subtitle: {  
    ...typography.body,  
    color: colors.textSecondary,  
  },  
  form: {  
    flex: 1,  
    justifyContent: 'center',  
  },  
  input: {  
    borderWidth: 1,  
    borderColor: colors.border,  
    borderRadius: borderRadius.md,  
    padding: spacing.md,  
    marginBottom: spacing.md,  
    fontSize: 16,  
    backgroundColor: colors.surface,  
  },  
});