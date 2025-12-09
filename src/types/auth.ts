// types/auth.ts  
export interface User {  
  id: string;  
  email: string;  
  firstName: string;  
  lastName: string;  
  identityDocument?: string;  
  birthDate: string;  
  createdAt: string;  
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
}