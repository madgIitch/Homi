// supabase/functions/auth-login/index.ts  
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';  
import { corsHeaders, handleCORS } from '../_shared/cors.ts';  
  
interface LoginRequest {  
  email: string;  
  password: string;  
}  
  
interface Session {  
  access_token: string;  
  refresh_token: string;  
  expires_in?: number;  
  token_type: string;  
}  
  
interface UserMetadata {  
  first_name?: string;  
  last_name?: string;  
}  
  
interface AuthUser {  
  id: string;  
  email: string;  
  created_at: string;  
  user_metadata: UserMetadata;  
}  
  
async function handler(req: Request): Promise<Response> {  
  const corsResponse = handleCORS(req);  
  if (corsResponse) return corsResponse;  
  
  try {  
    if (req.method !== 'POST') {  
      return new Response(  
        JSON.stringify({ error: 'Method not allowed' }),  
        {  
          status: 405,  
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },  
        }  
      );  
    }  
  
    const body: LoginRequest = await req.json();  
    console.log('📥 Login Edge Function - Request body:', {  
      email: body.email,  
      password: body.password ? '***' : 'vacío',  
    });  
  
    if (!body.email || !body.password) {  
      return new Response(  
        JSON.stringify({  
          error: 'Missing credentials',  
          details: 'email and password are required',  
        }),  
        {  
          status: 400,  
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },  
        }  
      );  
    }  
  
    const supabaseClient = createClient(  
      Deno.env.get('SUPABASE_URL') ?? '',  
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',  
      {  
        auth: {  
          autoRefreshToken: false,  
          persistSession: false,  
        },  
      }  
    );  
  
    const { data, error } = await supabaseClient.auth.signInWithPassword({  
      email: body.email,  
      password: body.password,  
    });  
  
    console.log('🔐 Login result:', {  
      success: !error,  
      userId: data?.user?.id,  
      error: error?.message,  
    });  
  
    if (error || !data.session || !data.user) {  
      return new Response(  
        JSON.stringify({  
          error: 'Invalid credentials',  
          details: error?.message,  
        }),  
        {  
          status: 401,  
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },  
        }  
      );  
    }  
  
    const session = data.session as Session;  
    const user = data.user as AuthUser;  
  
    const responseBody = {  
      access_token: session.access_token,  
      token_type: session.token_type,  
      expires_in: session.expires_in ?? 3600,  
      refresh_token: session.refresh_token ?? '',  
      user: {  
        id: user.id,  
        email: user.email!,  
        first_name: user.user_metadata.first_name ?? '',  
        last_name: user.user_metadata.last_name ?? '',  
        birth_date: '', // opcional: podrías leerlo desde la tabla users  
        created_at: user.created_at,  
      },  
    };  
  
    return new Response(JSON.stringify(responseBody), {  
      status: 200,  
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },  
    });  
  } catch (error) {  
    console.error('Login function error:', error);  
    const errorMessage = error instanceof Error ? error.message : String(error);  
    return new Response(  
      JSON.stringify({  
        error: 'Internal server error',  
        details: errorMessage,  
      }),  
      {  
        status: 500,  
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },  
      }  
    );  
  }  
}  
  
Deno.serve(handler);