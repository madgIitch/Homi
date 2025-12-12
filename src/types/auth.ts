// src/types/auth.ts  
export interface User {  
  id: string;  
  email: string;  
  first_name: string;  
  last_name: string;  
  identity_document?: string;  
  birth_date: string;  
  created_at: string;  
}  
  
export interface LoginRequest {  
  email: string;  
  password: string;  
}  
  
export interface RegisterRequest {  
  email: string;  
  password: string;  
  firstName: string;  
  lastName: string;  
  birthDate: string;  
}  
  
// Nuevos tipos para registro por fases  
export interface Phase1Data {  
  email: string;  
  password?: string; // opcional si usa Google  
  isGoogleUser?: boolean;  
}  
  
export interface Phase2Data {  
  firstName: string;  
  lastName: string;  
}  
  
export interface Phase3Data {  
  birthDate: string;  
}  
  
export interface TempRegistration {  
  tempToken: string;  
  email: string;  
  isGoogleUser: boolean;  
}