// src/services/authService.ts  
import { User, LoginRequest, RegisterRequest } from '../types/auth';  
import AsyncStorage from '@react-native-async-storage/async-storage';  
import { supabase } from '../config/supabase';  
  
interface AuthResponse {  
  user: User;  
  token: string;  
}  
  
class AuthService {  
  async login(credentials: LoginRequest): Promise<AuthResponse> {  
    const { data, error } = await supabase.auth.signInWithPassword({  
      email: credentials.email,  
      password: credentials.password,  
    });  
  
    if (error) {  
      throw new Error(error.message || 'Credenciales inválidas');  
    }  
  
    if (!data.user || !data.session) {  
      throw new Error('Error en el inicio de sesión');  
    }  
  
    // Obtener datos adicionales del usuario desde la tabla users  
    const { data: userData, error: userError } = await supabase  
      .from('users')  
      .select('*')  
      .eq('id', data.user.id)  
      .single();  
  
    if (userError) {  
      throw new Error('Error al obtener datos del usuario');  
    }  
  
    return {  
      user: userData,  
      token: data.session.access_token,  
    };  
  }  
  
  async register(userData: RegisterRequest): Promise<User> {  
    // Crear usuario en auth  
    const { data: authData, error: authError } = await supabase.auth.signUp({  
      email: userData.email,  
      password: userData.password,  
      options: {  
        data: {  
          first_name: userData.firstName,  
          last_name: userData.lastName,  
        },  
      },  
    });  
  
    if (authError) {  
      throw new Error(authError.message || 'Error en el registro');  
    }  
  
    if (!authData.user) {  
      throw new Error('Error al crear usuario');  
    }  
  
    // Crear entrada en la tabla users  
    const { data: newUserData, error: insertError } = await supabase  
      .from('users')  
      .insert([  
        {  
          id: authData.user.id,  
          email: userData.email,  
          firstName: userData.firstName,  
          lastName: userData.lastName,  
        },  
      ])  
      .select()  
      .single();  
  
    if (insertError) {  
      throw new Error('Error al guardar datos del usuario');  
    }  
  
    return newUserData;  
  }  
  
  async validateToken(token: string): Promise<User> {  
    // Verificar el token con Supabase  
    const { data: { user }, error } = await supabase.auth.getUser(token);  
  
    if (error || !user) {  
      throw new Error('Token inválido');  
    }  
  
    // Obtener datos completos del usuario  
    const { data: userData, error: userError } = await supabase  
      .from('users')  
      .select('*')  
      .eq('id', user.id)  
      .single();  
  
    if (userError) {  
      throw new Error('Error al obtener datos del usuario');  
    }  
  
    return userData;  
  }  
  
  async logout(): Promise<void> {  
    await supabase.auth.signOut();  
    await AsyncStorage.removeItem('authToken');  
  }  
  
  // Nuevo método para Google OAuth  
  async signInWithGoogle(): Promise<AuthResponse> {  
    const { error } = await supabase.auth.signInWithOAuth({  
      provider: 'google',  
      options: {  
        redirectTo: 'yourapp://auth/callback',  
      },  
    });  
  
    if (error) {  
      throw new Error(error.message || 'Error con Google Auth');  
    }  
  
    // Nota: Con OAuth, el manejo de la respuesta es diferente  
    // Necesitarás configurar deep linking para manejar el callback  
    throw new Error('Implementar manejo de callback OAuth');  
  }  
}  
  
export const authService = new AuthService();