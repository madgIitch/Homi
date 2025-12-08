import React, { useState } from 'react';  
import { View, Text, TextInput, StyleSheet, Alert } from 'react-native';  
import { Button } from '../components/Button';  
import { colors, typography, spacing, borderRadius } from '../theme';  
import { authService } from '../services/authService';  
  
export const RegisterScreen: React.FC = () => {  
  const [email, setEmail] = useState('');  
  const [username, setUsername] = useState('');  
  const [password, setPassword] = useState('');  
  const [firstName, setFirstName] = useState('');  
  const [lastName, setLastName] = useState('');  
  const [loading, setLoading] = useState(false);  
  
  const handleRegister = async () => {  
    if (!email || !username || !password || !firstName || !lastName) {  
      Alert.alert('Error', 'Por favor completa todos los campos');  
      return;  
    }  
  
    setLoading(true);  
    try {  
      const user = await authService.register({  
        email,  
        username,  
        password,  
        firstName,  
        lastName  
      });  
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
        <Text style={styles.subtitle}>Crea tu cuenta</Text>  
      </View>  
        
      <View style={styles.form}>  
        <TextInput  
          style={styles.input}  
          placeholder="Nombre"  
          value={firstName}  
          onChangeText={setFirstName}  
        />  
          
        <TextInput  
          style={styles.input}  
          placeholder="Apellidos"  
          value={lastName}  
          onChangeText={setLastName}  
        />  
          
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
          placeholder="Usuario"  
          value={username}  
          onChangeText={setUsername}  
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
          title="Registrarse"  
          onPress={handleRegister}  
          loading={loading}  
        />  
          
        <Button  
          title="¿Ya tienes cuenta? Inicia sesión"  
          onPress={() => navigation.navigate('Login')}  
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