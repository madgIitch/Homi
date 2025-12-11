// src/services/authService.ts  
import { User, LoginRequest, RegisterRequest } from '../types/auth';  
import { API_CONFIG } from '../config/api';  
import AsyncStorage from '@react-native-async-storage/async-storage';  
  
interface AuthResponse {  
  user: User;  
  token: string;  
}  
  
class AuthService {  
  async login(credentials: LoginRequest): Promise<AuthResponse> {  
    const response = await fetch(`${API_CONFIG.FUNCTIONS_URL}/auth/login`, {  
      method: 'POST',  
      headers: { 'Content-Type': 'application/json' },  
      body: JSON.stringify(credentials),  
    });  
            
    if (!response.ok) {  
      throw new Error('Credenciales inválidas');  
    }  
            
    const data = await response.json();  
    return {  
      user: data.user,  
      token: data.access_token || data.token  
    };  
  }  
  
  async register(userData: RegisterRequest): Promise<AuthResponse> {  
    console.log('🔧 AuthService.register() llamado con:', {  
      email: userData.email,  
      password: userData.password ? '***' : 'vacío',  
      firstName: userData.firstName,  
      lastName: userData.lastName,  
      birthDate: userData.birthDate  
    });  
    
    // Adaptar al nuevo formato que espera el backend  
    const registerData = {  
      email: userData.email,  
      password: userData.password,  
      data: {  
        first_name: userData.firstName,  
        last_name: userData.lastName,  
        birth_date: userData.birthDate  
      }  
    };  
      
    console.log('📦 Datos transformados para backend:', {  
      ...registerData,  
      password: registerData.password ? '***' : 'vacío'  
    });  
      
    const url = `${API_CONFIG.FUNCTIONS_URL}/auth/register`;  
    console.log('🌐 URL de la petición:', url);  
      
    try {  
      const response = await fetch(url, {  
        method: 'POST',  
        headers: { 'Content-Type': 'application/json' },  
        body: JSON.stringify(registerData),  
      });  
        
      console.log('📥 Respuesta recibida:', {  
        status: response.status,  
        statusText: response.statusText,  
        ok: response.ok  
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
        token: data.access_token  
      };  
    } catch (error) {  
      console.error('❌ Error en fetch:', error);  
      throw error;  
    }  
  } 
  
  async logout(): Promise<void> {  
    await AsyncStorage.removeItem('authToken');  
  }  
}  
  
export const authService = new AuthService();