// src/context/AuthContext.tsx
import React, { createContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types/auth';
import { authService } from '../services/authService';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  // nuevo: usar sesión ya obtenida (registro)
  loginWithSession: (user: User, token: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar sesión almacenada al iniciar
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

  // Usar el resultado de authService.register (user + token)
  const loginWithSession = async (userData: User, token: string) => {
    setUser(userData);
    await AsyncStorage.setItem('authToken', token);
    await AsyncStorage.setItem('authUser', JSON.stringify(userData));
  };

  const logout = async () => {
    await authService.logout(); // limpia authToken
    await AsyncStorage.removeItem('authUser');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        loginWithSession,
        logout,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
