// src/screens/RegisterScreen.tsx  
import React, { useState, useContext } from 'react';  
import { View, StyleSheet, Alert, Text, Image } from 'react-native';  
import { useNavigation } from '@react-navigation/native';  
import { StackNavigationProp } from '@react-navigation/stack';  
import { AuthContext } from '../context/AuthContext';  
import { Button } from '../components/Button';  
import { useTheme } from '../theme/ThemeContext';  
import { authService } from '../services/authService';
import { Phase1Email } from './register/Phase1Email';  
import { Phase2Name } from './register/Phase2Name';  
import { Phase3Gender } from './register/Phase3Gender';
import { Phase3BirthDate } from './register/Phase3BirthDate';  
import {
  Phase1Data,
  Phase2Data,
  Phase3Data,
  PhaseGenderData,
  TempRegistration,
} from '../types/auth';  
  
type RootStackParamList = {  
  Login: undefined;  
  Register: undefined;  
  Main: undefined;  
};  
  
type RegisterScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Register'>;  
  
export const RegisterScreen: React.FC = () => {  
  const navigation = useNavigation<RegisterScreenNavigationProp>();  
  const authContext = useContext(AuthContext);  
  
  if (!authContext) {  
    throw new Error('RegisterScreen must be used within AuthProvider');  
  }  
  
  const { loginWithSession } = authContext;  
  const theme = useTheme();  
    
  const [currentPhase, setCurrentPhase] = useState(1);  
  const [tempRegistration, setTempRegistration] = useState<TempRegistration | null>(null);  
  const [phase2Data, setPhase2Data] = useState<Phase2Data | null>(null);
  const [loading, setLoading] = useState(false);  
  
  const handlePhase1 = async (data: Phase1Data) => {  
    console.log('ÐY"? RegisterScreen: handlePhase1 called');  
    console.log('ÐY"? RegisterScreen: authService available:', !!authService);  
    console.log('ÐY"? RegisterScreen: registerPhase1 method available:', typeof authService.registerPhase1);  
      
    setLoading(true);  
    try {  
      if (data.isGoogleUser) {  
        console.log('ÐY"? RegisterScreen: Google flow detected');  
        const result = await authService.loginWithGoogle();  
        setTempRegistration({  
          tempToken: 'google_' + result.user.id,  
          email: result.user.email,  
          isGoogleUser: true,  
        });  
        setCurrentPhase(2);  
      } else {  
        console.log('ÐY"? RegisterScreen: Email flow detected, calling registerPhase1');  
        const tempReg = await authService.registerPhase1(data);  
        console.log('ÐY"? RegisterScreen: registerPhase1 completed:', tempReg);  
        setTempRegistration(tempReg);  
        setCurrentPhase(2);  
      }  
    } catch (error) {  
      console.error('ƒ?O Error en fase 1:', error);  
      const errorMessage = error instanceof Error ? error.message : String(error);  
      const errorStack = error instanceof Error ? error.stack : 'No stack available';  
        
      console.error('ƒ?O Full error details:', {  
        message: errorMessage,  
        stack: errorStack,  
        name: error instanceof Error ? error.name : 'Unknown'  
      });  
        
      Alert.alert('Error', errorMessage);  
    } finally {  
      setLoading(false);  
    }  
  };


  const handlePhase2 = (data: Phase2Data) => {  
    setPhase2Data(data);
    setCurrentPhase(3);
  };  

  const handlePhase3 = async (gender: PhaseGenderData['gender']) => {  
    if (!tempRegistration) {  
      Alert.alert('Error', 'Registro temporal no encontrado');  
      return;  
    }  
    if (!phase2Data) {
      Alert.alert('Error', 'Datos personales incompletos');
      return;
    }
  
    setLoading(true);  
    try {  
      await authService.registerPhase2(tempRegistration.tempToken, {
        ...phase2Data,
        gender,
      });  
      setCurrentPhase(4);  
    } catch (error) {  
      console.error('ƒ?O Error en fase 3:', error);  
      Alert.alert('Error', error instanceof Error ? error.message : 'Error desconocido');  
    } finally {  
      setLoading(false);  
    }  
  };  
  
  const handlePhase4 = async (data: Phase3Data) => {  
    if (!tempRegistration) {  
      Alert.alert('Error', 'Registro temporal no encontrado');  
      return;  
    }  
  
    setLoading(true);  
    try {  
      const result = await authService.registerPhase3(tempRegistration.tempToken, data);  
      await loginWithSession(result.user, result.token, result.refreshToken);  
      // NavegaciÇün automÇ­tica manejada por AuthContext  
    } catch (error) {  
      console.error('ƒ?O Error en fase 4:', error);  
      Alert.alert('Error', error instanceof Error ? error.message : 'Error desconocido');  
    } finally {  
      setLoading(false);  
    }  
  };  
  
  const handleBack = () => {  
    if (currentPhase > 1) {  
      setCurrentPhase(currentPhase - 1);  
    }  
  };  
  
  const handleGoogleSignIn = async () => {  
    setLoading(true);  
    try {  
      const result = await authService.loginWithGoogle();  
      setTempRegistration({  
        tempToken: 'google_' + result.user.id,  
        email: result.user.email,  
        isGoogleUser: true,  
      });  
      // Para usuarios de Google, saltar directamente al paso 2  
      setCurrentPhase(2);  
    } catch (error) {  
      console.error('ƒ?O Error en login con Google:', error);  
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
          Crea tu cuenta - Paso {currentPhase} de 4  
        </Text>  
      </View>  
  
      <View style={styles.content}>  
        {currentPhase === 1 && (  
          <Phase1Email  
            onNext={handlePhase1}  
            onGoogleSignIn={handleGoogleSignIn}  
            onGoToLogin={() => navigation.navigate('Login')}  
            loading={loading}  
          />  
        )}
        {currentPhase === 2 && (  
          <Phase2Name  
            onNext={handlePhase2}  
            onBack={handleBack}  
            loading={loading}  
          />  
        )}  
        {currentPhase === 3 && (  
          <Phase3Gender
            onNext={handlePhase3}
            onBack={handleBack}
            loading={loading}
          />
        )}  
        {currentPhase === 4 && (  
          <Phase3BirthDate  
            onComplete={handlePhase4}  
            onBack={handleBack}  
            loading={loading}  
          />  
        )}  
      </View>  
  
      <View style={styles.footer}>  
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
    marginTop: 60,  
    marginBottom: 40,  
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
  content: {  
    flex: 1,  
  },  
  footer: {  
    paddingBottom: 20,  
  },  
});
