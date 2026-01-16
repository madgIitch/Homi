// src/screens/RegisterScreen.tsx  
import React, { useEffect, useState, useContext } from 'react';  
import {
  View,
  Alert,
  Text,
  Image,
  ImageBackground,
  StyleSheet,
} from 'react-native';  
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';  
import { StackNavigationProp } from '@react-navigation/stack';  
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';  
import { Button } from '../components/Button';  
import { KeyboardAwareContainer } from '../components/KeyboardAwareContainer';
import { useTheme } from '../theme/ThemeContext';  
import { authService } from '../services/authService';
import LinearGradient from 'react-native-linear-gradient';
import { Phase1Email } from './register/Phase1Email';  
import { Phase2Name } from './register/Phase2Name';  
import { Phase3Gender } from './register/Phase3Gender';
import { Phase4Invitation } from './register/Phase4Invitation';
import { Phase3BirthDate } from './register/Phase3BirthDate';  
import { RegisterScreenStyles as styles } from '../styles/screens';
import {
  Phase1Data,
  Phase2Data,
  Phase3Data,
  PhaseGenderData,
  PhaseInviteData,
  TempRegistration,
  User,
} from '../types/auth';  
import { colors } from '../theme';
  
type RootStackParamList = {  
  Login: undefined;  
  Register: undefined;  
  Main: undefined;  
};  
  
type RegisterScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Register'>;  
  
type GoogleSession = {
  user: User;
  token: string;
  refreshToken?: string | null;
};

const TEMP_REGISTRATION_KEY = 'tempRegistration';
const GOOGLE_SESSION_KEY = 'googleSession';
const POST_INVITE_PREVIEW_KEY = 'postInvitePreview';
const ONBOARDING_COMPLETED_KEY = 'onboardingCompleted';
const JOINED_WITH_INVITE_KEY = 'joinedWithInvite';
const FORCE_ONBOARDING_KEY = 'forceOnboarding';

export const RegisterScreen: React.FC = () => {  
  const navigation = useNavigation<RegisterScreenNavigationProp>();  
  const insets = useSafeAreaInsets();
  const authContext = useContext(AuthContext);  
  
  const theme = useTheme();  
    
  const [currentPhase, setCurrentPhase] = useState(1);  
  const [tempRegistration, setTempRegistration] = useState<TempRegistration | null>(null);  
  const [phase2Data, setPhase2Data] = useState<Phase2Data | null>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleSession, setGoogleSession] = useState<GoogleSession | null>(null);

  useEffect(() => {
    const loadSavedState = async () => {
      try {
        const storedTemp = await AsyncStorage.getItem(TEMP_REGISTRATION_KEY);
        if (storedTemp) {
          setTempRegistration(JSON.parse(storedTemp));
        }
        const storedGoogle = await AsyncStorage.getItem(GOOGLE_SESSION_KEY);
        if (storedGoogle) {
          setGoogleSession(JSON.parse(storedGoogle));
        }
      } catch (error) {
        console.error('Error loading registration cache:', error);
      }
    };

    loadSavedState();
  }, []);

  useEffect(() => {
    const persistTempRegistration = async () => {
      try {
        if (tempRegistration) {
          await AsyncStorage.setItem(
            TEMP_REGISTRATION_KEY,
            JSON.stringify(tempRegistration)
          );
        } else {
          await AsyncStorage.removeItem(TEMP_REGISTRATION_KEY);
        }
      } catch (error) {
        console.error('Error saving temp registration:', error);
      }
    };

    persistTempRegistration();
  }, [tempRegistration]);

  useEffect(() => {
    const persistGoogleSession = async () => {
      try {
        if (googleSession) {
          await AsyncStorage.setItem(
            GOOGLE_SESSION_KEY,
            JSON.stringify(googleSession)
          );
        } else {
          await AsyncStorage.removeItem(GOOGLE_SESSION_KEY);
        }
      } catch (error) {
        console.error('Error saving Google session:', error);
      }
    };

    persistGoogleSession();
  }, [googleSession]);

  if (!authContext) {  
    throw new Error('RegisterScreen must be used within AuthProvider');  
  }  
  
  const { loginWithSession } = authContext;  

  const handlePhase1 = async (data: Phase1Data) => {  
    console.log('ÐY"? RegisterScreen: handlePhase1 called');  
    console.log('ÐY"? RegisterScreen: authService available:', !!authService);  
    console.log('ÐY"? RegisterScreen: registerPhase1 method available:', typeof authService.registerPhase1);  
      
    setLoading(true);  
    try {  
      if (data.isGoogleUser) {  
        console.log('?Y"? RegisterScreen: Google flow detected');  
        const result = await authService.loginWithGoogle(false);
        setGoogleSession(result);
        const tempReg = await authService.registerPhase1({
          email: result.user.email,
          isGoogleUser: true,
        });
        setTempRegistration(tempReg);
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
  
    console.log('[RegisterScreen] Phase3 temp token:', tempRegistration.tempToken);
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
  
  const handlePhase4 = (data: PhaseInviteData) => {
    setInviteCode(data.hasInvite ? data.inviteCode || null : null);
    setCurrentPhase(5);
  };

  const handlePhase5 = async (data: Phase3Data) => {  
    if (!tempRegistration) {  
      Alert.alert('Error', 'Registro temporal no encontrado');  
      return;  
    }  
  
    console.log('[RegisterScreen] Phase5 temp token:', tempRegistration.tempToken);
    setLoading(true);  
    try {  
      const result = await authService.registerPhase3(tempRegistration.tempToken, {
        ...data,
        inviteCode: inviteCode || undefined,
      });  
      await AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, '0');
      await AsyncStorage.setItem(FORCE_ONBOARDING_KEY, '1');
      console.log('[RegisterScreen] onboardingCompleted set to 0');
      if (tempRegistration.isGoogleUser) {
        if (!googleSession) {
          Alert.alert('Error', 'No se encontro la sesion de Google');
          return;
        }
        await loginWithSession(
          googleSession.user,
          googleSession.token,
          googleSession.refreshToken
        );
        setTempRegistration(null);
        setGoogleSession(null);
      } else {
        await loginWithSession(result.user, result.token, result.refreshToken);
        setTempRegistration(null);
        setGoogleSession(null);
      }
      if (inviteCode) {
        await AsyncStorage.setItem(POST_INVITE_PREVIEW_KEY, '1');
        await AsyncStorage.setItem(JOINED_WITH_INVITE_KEY, '1');
      } else {
        await AsyncStorage.removeItem(POST_INVITE_PREVIEW_KEY);
        await AsyncStorage.removeItem(JOINED_WITH_INVITE_KEY);
      }
      // NavegaciÇün automÇ­tica manejada por AuthContext  
    } catch (error) {  
      console.error('ƒ?O Error en fase 5:', error);  
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
      const result = await authService.loginWithGoogle(false);
      setGoogleSession(result);
      const tempReg = await authService.registerPhase1({
        email: result.user.email,
        isGoogleUser: true,
      });
      setTempRegistration(tempReg);
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
          Crea tu cuenta - Paso {currentPhase} de 5  
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
          <Phase4Invitation
            onNext={handlePhase4}
            onBack={handleBack}
            loading={loading}
          />
        )}
        {currentPhase === 5 && (  
          <Phase3BirthDate  
            onComplete={handlePhase5}  
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
      </KeyboardAwareContainer>
    </View>  
  );  
};
