// src/config/supabase.ts  
import { createClient } from '@supabase/supabase-js';  
import { API_CONFIG } from './api';  
  
export const supabase = createClient(  
  API_CONFIG.SUPABASE_URL,  
  API_CONFIG.SUPABASE_ANON_KEY,  
  {  
    auth: {  
      persistSession: true,  
      autoRefreshToken: true,  
      detectSessionInUrl: false,  
    },  
  }  
);