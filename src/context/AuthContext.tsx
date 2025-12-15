// src/context/AuthContext.tsx  
import React, { createContext, useState, useEffect, ReactNode } from 'react';  
import AsyncStorage from '@react-native-async-storage/async-storage';  
import { User } from '../types/auth';  
import { authService } from '../services/authService';  
  
interface AuthContextType {  
  user: User | null;  
  isAuthenticated: boolean;  
  login: (email: string, password: string) => Promise<void>;  
  loginWithSession: (user: User, token: string) => Promise<void>;  
  logout: () => Promise<void>;  
  handleAuthError: (error: any) => boolean; // Add this  
  loading: boolean;  
} 
  
export const AuthContext = createContext<AuthContextType | undefined>(undefined);  
  
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {  
  const [user, setUser] = useState<User | null>(null);  
  const [loading, setLoading] = useState(true);  
  
  useEffect(() => {  
    checkAuth();  
  }, []);  
  
  const checkAuth = async () => {  
    try {  
      const token = await AsyncStorage.getItem('authToken');  
      const userJson = await AsyncStorage.getItem('authUser');  
  
      if (token && userJson) {  
        const userData: User = JSON.parse(userJson);  
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
    await AsyncStorage.setItem('authUser', JSON.stringify(userData));  
  };  
  
  const loginWithSession = async (userData: User, token: string) => {  
    setUser(userData);  
    await AsyncStorage.setItem('authToken', token);  
    await AsyncStorage.setItem('authUser', JSON.stringify(userData));  
  };  
  
  const logout = async () => {  
    await authService.logout();  
    await AsyncStorage.removeItem('authUser');  
    setUser(null);  
  };  
  
  // Nuevo método para manejar errores de autenticación  
  const handleAuthError = (error: any): boolean => {  
    if (error?.message?.includes('401')) {  
      logout();  
      return true; // Indica que fue un error 401 manejado  
    }  
    return false; // No fue un error 401  
  };  
  
  return (  
    <AuthContext.Provider  
      value={{  
        user,  
        isAuthenticated: !!user,  
        login,  
        loginWithSession,  
        logout,  
        handleAuthError,  
        loading,  
      }}  
    >  
      {children}  
    </AuthContext.Provider>  
  );  
};