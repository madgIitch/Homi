// types/auth.ts  
export interface User {  
  id: string;  
  email: string;  
  username: string;  
  premiumStatus: boolean;  
  createdAt: string;  
  updatedAt: string;  
}  
  
export interface LoginRequest {  
  email: string;  
  password: string;  
}  
  
export interface RegisterRequest {  
  email: string;  
  username: string;  
  password: string;  
  firstName: string;  
  lastName: string;  
}