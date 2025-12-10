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
  
    const response = await fetch(`${API_CONFIG.FUNCTIONS_URL}/auth/register`, {  
      method: 'POST',  
      headers: { 'Content-Type': 'application/json' },  
      body: JSON.stringify(registerData),  
    });  
          
    if (!response.ok) {  
      throw new Error('Error en el registro');  
    }  
          
    const data = await response.json();  
    return {  
      user: data.user,  
      token: data.access_token  
    };  
  }  
  
  async logout(): Promise<void> {  
    await AsyncStorage.removeItem('authToken');  
  }  
}  
  
export const authService = new AuthService();