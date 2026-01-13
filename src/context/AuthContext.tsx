// src/context/AuthContext.tsx  
import React, { createContext, useState, useEffect, ReactNode } from 'react';  
import AsyncStorage from '@react-native-async-storage/async-storage';  
import { User } from '../types/auth';  
import { authService } from '../services/authService';  
import { pushTokenService } from '../services/pushTokenService';
  
interface AuthContextType {  
  user: User | null;  
  isAuthenticated: boolean;  
  login: (email: string, password: string) => Promise<void>;  
  loginWithSession: (user: User, token: string, refreshToken?: string | null) => Promise<void>;  
  logout: () => Promise<void>;  
  handleAuthError: (error: any) => boolean; // Add this  
  loading: boolean;  
} 
  
export const AuthContext = createContext<AuthContextType | undefined>(undefined);  

const AUTH_REFRESH_TOKEN_KEY = 'authRefreshToken';
const ONBOARDING_COMPLETED_KEY = 'onboardingCompleted';
const JOINED_WITH_INVITE_KEY = 'joinedWithInvite';
const FORCE_ONBOARDING_KEY = 'forceOnboarding';
  
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {  
  const [user, setUser] = useState<User | null>(null);  
  const [loading, setLoading] = useState(true);  
  
  useEffect(() => {  
    checkAuth();  
  }, []);  

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    let unsubscribe: (() => void) | undefined;

    const register = async () => {
      const result = await pushTokenService.register(user.id);
      if (result.status === 'registered') {
        unsubscribe = pushTokenService.onTokenRefresh(user.id);
      }
    };

    register();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user?.id]);
  
  const checkAuth = async () => {  
    try {  
      const token = await AsyncStorage.getItem('authToken');  
      const userJson = await AsyncStorage.getItem('authUser');  
  
      if (token && userJson) {  
        const userData: User = JSON.parse(userJson);  
        await authService.bootstrapSession();
        setUser(userData);  
      }  
    } catch (error) {  
      console.error('Error checking auth:', error);  
    } finally {  
      setLoading(false);  
    }  
  };  
  
  const login = async (email: string, password: string) => {  
    const { user: userData, token, refreshToken } = await authService.login({ email, password });  
    await AsyncStorage.setItem('authToken', token);  
    await AsyncStorage.setItem('authUser', JSON.stringify(userData));  
    await authService.persistSession(token, refreshToken);
    setUser(userData);  
  };  
  
  const loginWithSession = async (
    userData: User,
    token: string,
    refreshToken?: string | null
  ) => {
    await AsyncStorage.setItem('authToken', token);  
    await AsyncStorage.setItem('authUser', JSON.stringify(userData));  
    await authService.persistSession(token, refreshToken);
    setUser(userData);  
  };  
  
  const logout = async () => {  
    const currentUserId = user?.id;
    await authService.logout();  
    if (currentUserId) {
      await pushTokenService.unregister(currentUserId);
    }
    await AsyncStorage.removeItem('authUser');  
    await AsyncStorage.removeItem(AUTH_REFRESH_TOKEN_KEY);
    await AsyncStorage.removeItem(ONBOARDING_COMPLETED_KEY);
    await AsyncStorage.removeItem(JOINED_WITH_INVITE_KEY);
    await AsyncStorage.removeItem(FORCE_ONBOARDING_KEY);
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
