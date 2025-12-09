// src/context/AuthContext.tsx  
import React, { createContext, useState, useEffect, ReactNode } from 'react';  
import AsyncStorage from '@react-native-async-storage/async-storage';  
import { User } from '../types/auth';  
import { authService } from '../services/authService';  
  
interface AuthContextType {  
  user: User | null;  
  isAuthenticated: boolean;  
  login: (email: string, password: string) => Promise<void>;  
  logout: () => Promise<void>;  
  loading: boolean;  
}  
  
export const AuthContext = createContext<AuthContextType | undefined>(undefined);  
  
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {  
  const [user, setUser] = useState<User | null>(null);  
  const [loading, setLoading] = useState(true);  
  
  useEffect(() => {  
    // Verificar token almacenado al iniciar  
    checkAuth();  
  }, []);  
  
  const checkAuth = async () => {  
    try {  
      const token = await AsyncStorage.getItem('authToken');  
      if (token) {  
        // Validar token con el backend  
        const userData = await authService.validateToken(token);  
        setUser(userData);  
      }  
    } catch (error) {  
      console.error('Error checking auth:', error);  
    } finally {  
      setLoading(false);  
    }  
  };  
  
  const login = async (email: string, password: string) => {  
    const { user: userData, token } = await authService.login({ email, password });  
    setUser(userData);  
    await AsyncStorage.setItem('authToken', token);  
  };  
  
  const logout = async () => {  
    await authService.logout();  
    setUser(null);  
  };  
  
  return (  
    <AuthContext.Provider value={{  
      user,  
      isAuthenticated: !!user,  
      login,  
      logout,  
      loading  
    }}>  
      {children}  
    </AuthContext.Provider>  
  );  
};