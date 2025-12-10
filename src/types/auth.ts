// types/auth.ts  
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