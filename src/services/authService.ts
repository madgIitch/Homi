// src/services/authService.ts  
import {   
  User,   
  LoginRequest,   
  RegisterRequest,  
  Phase1Data,  
  Phase2Data,  
  Phase3Data,  
  TempRegistration   
} from '../types/auth';  
import { API_CONFIG } from '../config/api';  
import AsyncStorage from '@react-native-async-storage/async-storage';  
import { GoogleSignin } from '@react-native-google-signin/google-signin';  
import { createClient } from '@supabase/supabase-js';  
  
const supabaseClient = createClient(  
  API_CONFIG.SUPABASE_URL,  
  API_CONFIG.SUPABASE_ANON_KEY  
);  
  
// Función auxiliar para mapear el usuario  
const mapSupabaseUserToAppUser = (supabaseUser: any): User => {  
  const fullName = supabaseUser.user_metadata?.full_name || '';  
  const nameParts = fullName.split(' ');  
    
  return {  
    id: supabaseUser.id,  
    email: supabaseUser.email || '',  
    first_name: supabaseUser.user_metadata?.first_name || nameParts[0] || '',  
    last_name: supabaseUser.user_metadata?.last_name || nameParts.slice(1).join(' ') || '',  
    birth_date: supabaseUser.user_metadata?.birth_date || '',  
    identity_document: supabaseUser.user_metadata?.identity_document,  
    created_at: supabaseUser.created_at,  
  };  
};  
  
interface AuthResponse {  
  user: User;  
  token: string;  
}  
  
const defaultHeaders = {  
  'Content-Type': 'application/json',  
  apikey: API_CONFIG.SUPABASE_ANON_KEY,  
  Authorization: `Bearer ${API_CONFIG.SUPABASE_ANON_KEY}`,  
};  
  
class AuthService {  
  async login(credentials: LoginRequest): Promise<AuthResponse> {  
    const response = await fetch(`${API_CONFIG.FUNCTIONS_URL}/auth-login`, {  
      method: 'POST',  
      headers: defaultHeaders,  
      body: JSON.stringify(credentials),  
    });  
  
    if (!response.ok) {  
      const errorText = await response.text();  
      console.error('❌ Error login API:', errorText);  
      throw new Error('Credenciales inválidas');  
    }  
  
    const data = await response.json();  
    return {  
      user: data.user,  
      token: data.access_token || data.token,  
    };  
  }  
  
  async loginWithGoogle(): Promise<AuthResponse> {  
    await GoogleSignin.hasPlayServices();  
    const result = await GoogleSignin.signIn();  
    const idToken = result.data?.idToken;  
      
    if (!idToken) {  
      throw new Error('No se pudo obtener el idToken de Google');  
    }  
      
    // Enviar idToken a Supabase para verificar  
    const { data, error } = await supabaseClient.auth.signInWithIdToken({  
      provider: 'google',  
      token: idToken,  
    });  
      
    if (error) throw error;  
      
    return {  
      user: mapSupabaseUserToAppUser(data.user),  
      token: data.session.access_token,  
    };  
  }  
  
  async register(userData: RegisterRequest): Promise<AuthResponse> {  
    console.log('🔧 AuthService.register() llamado con:', {  
      email: userData.email,  
      password: userData.password ? '***' : 'vacío',  
      firstName: userData.firstName,  
      lastName: userData.lastName,  
      birthDate: userData.birthDate,  
    });  
  
    const registerData = {  
      email: userData.email,  
      password: userData.password,  
      data: {  
        first_name: userData.firstName,  
        last_name: userData.lastName,  
        birth_date: userData.birthDate,  
      },  
    };  
  
    console.log('📦 Datos transformados para backend:', {  
      ...registerData,  
      password: registerData.password ? '***' : 'vacío',  
    });  
  
    const response = await fetch(`${API_CONFIG.FUNCTIONS_URL}/auth-register`, {  
      method: 'POST',  
      headers: defaultHeaders,  
      body: JSON.stringify(registerData),  
    });  
  
    console.log('📥 Respuesta recibida:', {  
      status: response.status,  
      statusText: response.statusText,  
      ok: response.ok,  
    });  
  
    if (!response.ok) {  
      const errorText = await response.text();  
      console.error('❌ Error de la API:', errorText);  
      throw new Error('Error en el registro');  
    }  
  
    const data = await response.json();  
    console.log('✅ Datos de respuesta:', data);  
  
    return {  
      user: data.user,  
      token: data.access_token,  
    };  
  }  
  
  async logout(): Promise<void> {  
    await AsyncStorage.removeItem('authToken');  
  }  
  
  // Registro por fases  
  async registerPhase1(data: Phase1Data): Promise<TempRegistration> {  
    console.log('🔧 Fase 1 - Guardando email y temporal');  
      
    // Generar token temporal único  
    const tempToken = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;  
      
    // Guardar datos temporales en AsyncStorage  
    const tempData: TempRegistration = {  
      tempToken,  
      email: data.email,  
      isGoogleUser: data.isGoogleUser || false,  
    };  
      
    await AsyncStorage.setItem('tempRegistration', JSON.stringify(tempData));  
      
    return tempData;  
  }  
  
  async registerPhase2(tempToken: string, data: Phase2Data): Promise<void> {  
    console.log('🔧 Fase 2 - Guardando nombre');  
      
    // Recuperar datos temporales  
    const tempJson = await AsyncStorage.getItem('tempRegistration');  
    if (!tempJson) {  
      throw new Error('Registro temporal no encontrado');  
    }  
      
    const tempData: TempRegistration = JSON.parse(tempJson);  
      
    if (tempData.tempToken !== tempToken) {  
      throw new Error('Token temporal inválido');  
    }  
      
    // Actualizar datos temporales con nombre  
    const updatedData = {  
      ...tempData,  
      firstName: data.firstName,  
      lastName: data.lastName,  
    };  
      
    await AsyncStorage.setItem('tempRegistration', JSON.stringify(updatedData));  
  }  
  
  async registerPhase3(tempToken: string, data: Phase3Data): Promise<AuthResponse> {  
    console.log('🔧 Fase 3 - Completando registro');  
      
    // Recuperar todos los datos  
    const tempJson = await AsyncStorage.getItem('tempRegistration');  
    if (!tempJson) {  
      throw new Error('Registro temporal no encontrado');  
    }  
      
    const tempData: any = JSON.parse(tempJson);  
      
    if (tempData.tempToken !== tempToken) {  
      throw new Error('Token temporal inválido');  
    }  
      
    if (tempData.isGoogleUser) {  
      // Para usuarios de Google, ya están autenticados  
      // Solo necesitamos actualizar su perfil con la fecha de nacimiento  
      const result = await this.loginWithGoogle();  
        
      // Aquí podrías llamar a una Edge Function para actualizar birth_date  
      // await this.updateProfile({ birth_date: data.birthDate });  
        
      // Limpiar datos temporales  
      await AsyncStorage.removeItem('tempRegistration');  
        
      return result;  
    } else {  
      // Registro normal con email/contraseña  
      const registerData: RegisterRequest = {  
        email: tempData.email,  
        password: tempData.password,  
        firstName: tempData.firstName,  
        lastName: tempData.lastName,  
        birthDate: data.birthDate,  
      };  
        
      const result = await this.register(registerData);  
        
      // Limpiar datos temporales  
      await AsyncStorage.removeItem('tempRegistration');  
        
      return result;  
    }  
  }  
  
  // Limpiar registro temporal (útil si el usuario abandona el proceso)  
  async clearTempRegistration(): Promise<void> {  
    await AsyncStorage.removeItem('tempRegistration');  
  }  
}  
  
export const authService = new AuthService();