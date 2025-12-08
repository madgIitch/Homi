// services/authService.ts  
import { User, LoginRequest, RegisterRequest } from '../types/auth';  
  
class AuthService {  
  async login(credentials: LoginRequest): Promise<User> {  
    // Implementar llamada a API  
    const response = await fetch('/api/auth/login', {  
      method: 'POST',  
      headers: { 'Content-Type': 'application/json' },  
      body: JSON.stringify(credentials),  
    });  
      
    if (!response.ok) {  
      throw new Error('Credenciales inválidas');  
    }  
      
    return response.json();  
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
  
  async logout(): Promise<void> {  
    // Limpiar tokens y estado  
    await AsyncStorage.removeItem('authToken');  
  }  
}  
  
export const authService = new AuthService();