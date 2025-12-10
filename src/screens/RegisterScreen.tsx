// src/screens/RegisterScreen.tsx  
import React, { useState, useContext } from 'react';  
import { View, Text, TextInput, StyleSheet, Alert, Platform, TouchableOpacity } from 'react-native';  
import { useNavigation } from '@react-navigation/native';  
import { StackNavigationProp } from '@react-navigation/stack';  
import { AuthContext } from '../context/AuthContext';  
import { Button } from '../components/Button';  
import { useTheme } from '../theme/ThemeContext';  
import { authService } from '../services/authService';  
import DateTimePicker from '@react-native-community/datetimepicker';  
  
type RootStackParamList = {  
  Login: undefined;  
  Register: undefined;  
  Main: undefined;  
};  
  
type RegisterScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Register'>;  
  
export const RegisterScreen: React.FC = () => {  
  const navigation = useNavigation<RegisterScreenNavigationProp>();  
  const authContext = useContext(AuthContext);  
    
  // Ensure context exists  
  if (!authContext) {  
    throw new Error('RegisterScreen must be used within AuthProvider');  
  }  
    
  const { login } = authContext;  
  const theme = useTheme();  
  const [email, setEmail] = useState('');  
  const [password, setPassword] = useState('');  
  const [firstName, setFirstName] = useState('');  
  const [lastName, setLastName] = useState('');  
  const [birthDate, setBirthDate] = useState<Date | null>(null);  
  const [showDatePicker, setShowDatePicker] = useState(false);  
  const [loading, setLoading] = useState(false);  
  
  const handleRegister = async () => {  
    if (!email || !password || !firstName || !lastName || !birthDate) {  
      Alert.alert('Error', 'Por favor completa todos los campos');  
      return;  
    }  
  
    setLoading(true);  
    try {  
      await authService.register({  
        email,  
        password,  
        firstName,  
        lastName,  
        birthDate: birthDate.toISOString().split('T')[0] // Formato YYYY-MM-DD  
      });  
      // Después de registrar, hacer login automáticamente  
      await login(email, password);  
    } catch (error) {  
      Alert.alert('Error', error instanceof Error ? error.message : 'Error desconocido');  
    } finally {  
      setLoading(false);  
    }  
  };  
  
  const onChangeDate = (event: any, selectedDate?: Date) => {  
    setShowDatePicker(Platform.OS === 'ios');  
    if (selectedDate) {  
      setBirthDate(selectedDate);  
    }  
  };  
  
  const showDatepicker = () => {  
    setShowDatePicker(true);  
  };  
  
  const formatDate = (date: Date) => {  
    return date.toLocaleDateString('es-ES', {  
      day: '2-digit',  
      month: '2-digit',  
      year: 'numeric'  
    });  
  };  
  
  return (  
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>  
      <View style={styles.header}>  
        <Text style={[styles.logo, { color: theme.colors.primary }]}>HomiMatch</Text>  
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>  
          Crea tu cuenta  
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
          placeholder="Nombre"  
          placeholderTextColor={theme.colors.textTertiary}  
          value={firstName}  
          onChangeText={setFirstName}  
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
          placeholder="Apellidos"  
          placeholderTextColor={theme.colors.textTertiary}  
          value={lastName}  
          onChangeText={setLastName}  
        />  
  
        <TouchableOpacity  
          style={[  
            styles.input,  
            styles.dateInput,  
            {  
              borderColor: theme.colors.border,  
              borderRadius: theme.borderRadius.md,  
              backgroundColor: theme.colors.surface,  
            },  
          ]}  
          onPress={showDatepicker}  
        >  
          <Text style={[  
            styles.dateText,  
            { color: birthDate ? theme.colors.text : theme.colors.textTertiary }  
          ]}>  
            {birthDate ? formatDate(birthDate) : 'Fecha de nacimiento'}  
          </Text>  
        </TouchableOpacity>  
  
        {showDatePicker && (  
          <DateTimePicker  
            testID="dateTimePicker"  
            value={birthDate || new Date()}  
            mode="date"  
            display="default"  
            onChange={onChangeDate}  
            maximumDate={new Date()}  
          />  
        )}  
                
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
    padding: 24,  
  },  
  header: {  
    alignItems: 'center',  
    marginTop: 80,  
    marginBottom: 80,  
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
  dateInput: {  
    justifyContent: 'center',  
    height: 54,  
  },  
  dateText: {  
    fontSize: 16,  
  },  
});