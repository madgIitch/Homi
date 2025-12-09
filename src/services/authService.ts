// src/services/authService.ts  
import { User, LoginRequest, RegisterRequest } from '../types/auth';  
import AsyncStorage from '@react-native-async-storage/async-storage';  
  
interface AuthResponse {  
  user: User;  
  token: string;  
}  
  
class AuthService {  
  async login(credentials: LoginRequest): Promise<AuthResponse> {  
    // Implementar llamada a API  
    const response = await fetch('/api/auth/login', {  
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
  
  async register(userData: RegisterRequest): Promise<User> {  
    // Implementar llamada a API  
    const response = await fetch('/api/auth/register', {  
      method: 'POST',  
      headers: { 'Content-Type': 'application/json' },  
      body: JSON.stringify(userData),  
    });  
        
    if (!response.ok) {  
      throw new Error('Error en el registro');  
    }  
        
    return response.json();  
  }  
  
  async validateToken(token: string): Promise<User> {  
    const response = await fetch('/api/auth/validate', {  
      method: 'POST',  
      headers: {  
        'Content-Type': 'application/json',  
        'Authorization': `Bearer ${token}`  
      }  
    });  
  
    if (!response.ok) {  
      throw new Error('Token inválido');  
    }  
  
    const data = await response.json();  
    return data.user;  
  }  
  
  async logout(): Promise<void> {  
    await AsyncStorage.removeItem('authToken');  
  }  
}  
  
export const authService = new AuthService();