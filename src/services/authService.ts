// src/services/authService.ts
import {
  User,
  LoginRequest,
  RegisterRequest,
  Phase1Data,
  PhaseGenderData,
  Phase3Data,
  TempRegistration,
} from '../types/auth';
import { API_CONFIG } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { createClient } from '@supabase/supabase-js';

const devLog = (...args: unknown[]) => {
  if (__DEV__) {
    console.log(...args);
  }
};

export const supabaseClient = createClient(
  API_CONFIG.SUPABASE_URL,
  API_CONFIG.SUPABASE_ANON_KEY,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);

// Logs de diagnóstico de configuración Supabase
devLog('[Supabase][init] URL:', API_CONFIG.SUPABASE_URL);
devLog(
  '[Supabase][init] ANON key length:',
  API_CONFIG.SUPABASE_ANON_KEY ? API_CONFIG.SUPABASE_ANON_KEY.length : 'undefined'
);

// Algunos clientes exponen internamente las URLs; lo dejamos solo para debug defensivo
try {
  // @ts-ignore acceso interno para debug
  const restUrl = (supabaseClient as any).rest?.url;
  // @ts-ignore acceso interno para debug
  const storageUrl = (supabaseClient as any).storage?.url;
  devLog('[Supabase][init] Internal rest URL:', restUrl);
  devLog('[Supabase][init] Internal storage URL:', storageUrl);
} catch (e) {
  devLog('[Supabase][init] No internal URLs available for logging', e);
}

// Función auxiliar para mapear el usuario
const mapSupabaseUserToAppUser = (supabaseUser: any): User => {
  const fullName = supabaseUser.user_metadata?.full_name || '';
  const nameParts = fullName.split(' ');

  return {
    id: supabaseUser.id,
    email: supabaseUser.email || '',
    first_name:
      supabaseUser.user_metadata?.first_name || nameParts[0] || '',
    last_name:
      supabaseUser.user_metadata?.last_name ||
      nameParts.slice(1).join(' ') ||
      '',
    birth_date: supabaseUser.user_metadata?.birth_date || '',
    gender: supabaseUser.user_metadata?.gender ?? null,
    identity_document: supabaseUser.user_metadata?.identity_document,
    created_at: supabaseUser.created_at,
  };
};

interface AuthResponse {
  user: User;
  token: string;
  refreshToken?: string | null;
}

const defaultHeaders = {
  'Content-Type': 'application/json',
  apikey: API_CONFIG.SUPABASE_ANON_KEY,
  Authorization: `Bearer ${API_CONFIG.SUPABASE_ANON_KEY}`,
};

const AUTH_REFRESH_TOKEN_KEY = 'authRefreshToken';
const ONBOARDING_COMPLETED_KEY = 'onboardingCompleted';
const JOINED_WITH_INVITE_KEY = 'joinedWithInvite';

class AuthService {
  async persistSession(
    accessToken: string,
    refreshToken?: string | null
  ): Promise<void> {
    if (!refreshToken) {
      await AsyncStorage.removeItem(AUTH_REFRESH_TOKEN_KEY);
      return;
    }

    await AsyncStorage.setItem(AUTH_REFRESH_TOKEN_KEY, refreshToken);

    const { data, error } = await supabaseClient.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (error || !data.session) {
      devLog('[AuthService.persistSession] setSession failed:', error?.message);
      const refreshAttempt = await supabaseClient.auth.refreshSession({ refresh_token: refreshToken });
      if (refreshAttempt.data.session) {
        await AsyncStorage.setItem(
          'authToken',
          refreshAttempt.data.session.access_token
        );
        await AsyncStorage.setItem(
          AUTH_REFRESH_TOKEN_KEY,
          refreshAttempt.data.session.refresh_token
        );
      }
      return;
    }

    await AsyncStorage.setItem('authToken', data.session.access_token);
    await AsyncStorage.setItem(
      AUTH_REFRESH_TOKEN_KEY,
      data.session.refresh_token
    );
  }

  async bootstrapSession(): Promise<void> {
    const refreshToken = await AsyncStorage.getItem(AUTH_REFRESH_TOKEN_KEY);
    const accessToken = await AsyncStorage.getItem('authToken');

    if (!refreshToken || !accessToken) {
      return;
    }

    const { data, error } = await supabaseClient.auth.refreshSession({ refresh_token: refreshToken });
    if (data.session) {
      await AsyncStorage.setItem('authToken', data.session.access_token);
      await AsyncStorage.setItem(
        AUTH_REFRESH_TOKEN_KEY,
        data.session.refresh_token
      );
      return;
    }

    devLog('[AuthService.bootstrapSession] refresh failed:', error?.message);
    await this.persistSession(accessToken, refreshToken);
  }

  async login(credentials: LoginRequest): Promise<AuthResponse> {
    devLog('[AuthService.login] called with email:', credentials.email);

    const response = await fetch(`${API_CONFIG.FUNCTIONS_URL}/auth-login`, {
      method: 'POST',
      headers: defaultHeaders,
      body: JSON.stringify(credentials),
    });

    devLog('[AuthService.login] response:', {
      status: response.status,
      ok: response.ok,
      url: response.url,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error login API:', errorText);
      throw new Error('Credenciales inválidas');
    }

    const data = await response.json();
    return {
      user: data.user,
      token: data.access_token || data.token,
      refreshToken: data.refresh_token ?? data.refreshToken ?? null,
    };
  }

  async loginWithGoogle(requireExisting: boolean = true): Promise<AuthResponse> {
    devLog('[AuthService.loginWithGoogle] Iniciando login con Google');

    // Check if Google Play Services are available and Activity is ready
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    } catch (error: any) {
      devLog('[AuthService.loginWithGoogle] hasPlayServices error:', error?.code);
      if (error?.code === 'NULL_ACTIVITY') {
        throw new Error('La app no está lista. Por favor, intenta de nuevo en unos segundos.');
      }
      throw error;
    }

    const result = await GoogleSignin.signIn();
    const idToken = result.data?.idToken;
    const email =
      result.data?.user?.email ||
      (result as any)?.user?.email ||
      (result as any)?.data?.profile?.email ||
      (result as any)?.profile?.email;

    devLog('[AuthService.loginWithGoogle] Google idToken exists:', !!idToken);

    if (!idToken) {
      throw new Error('No se pudo obtener el idToken de Google');
    }

    if (!email) {
      throw new Error('No se pudo obtener el email de Google');
    }

    if (requireExisting) {
      const emailCheckResponse = await fetch(
        `${API_CONFIG.FUNCTIONS_URL}/auth-check-email`,
        {
          method: 'POST',
          headers: defaultHeaders,
          body: JSON.stringify({ email }),
        }
      );

      if (!emailCheckResponse.ok) {
        const detail = await emailCheckResponse.text();
        console.error(
          '[AuthService.loginWithGoogle] email check failed:',
          detail
        );
        throw new Error('No se pudo verificar el email');
      }

      const emailCheck = await emailCheckResponse.json();
      if (!emailCheck?.exists) {
        throw new Error('No existe una cuenta asociada a este Google');
      }
    }

    const { data, error } = await supabaseClient.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    });

    devLog('[AuthService.loginWithGoogle] Supabase response:', {
      hasUser: !!data?.user,
      hasSession: !!data?.session,
      error: error?.message,
    });

    if (error) throw error;

    return {
      user: mapSupabaseUserToAppUser(data.user),
      token: data.session.access_token,
      refreshToken: data.session.refresh_token,
    };
  }

  async requestPasswordReset(
    email: string,
    redirectTo?: string
  ): Promise<void> {
    const trimmedEmail = email.trim();
    devLog('[AuthService.requestPasswordReset] email:', trimmedEmail);

    const options = redirectTo ? { redirectTo } : undefined;
    const { error } = await supabaseClient.auth.resetPasswordForEmail(
      trimmedEmail,
      options
    );

    if (error) {
      console.error(
        '[AuthService.requestPasswordReset] error:',
        error.message
      );
      throw new Error('No se pudo enviar el correo de recuperacion');
    }
  }

  async handleRecoveryLink(url: string): Promise<boolean> {
    try {
      const parsedUrl = new URL(url);
      const hash = (parsedUrl as any).hash || '';
      const hashParams = new URLSearchParams(
        hash ? hash.slice(1) : ''
      );
      const accessToken =
        (hashParams as any).get?.('access_token') ||
        (parsedUrl.searchParams as any).get?.('access_token');
      const refreshToken =
        (hashParams as any).get?.('refresh_token') ||
        (parsedUrl.searchParams as any).get?.('refresh_token');
      const type =
        (hashParams as any).get?.('type') || (parsedUrl.searchParams as any).get?.('type');
      const code =
        (hashParams as any).get?.('code') || (parsedUrl.searchParams as any).get?.('code');

      if (code) {
        const { error } = await supabaseClient.auth.exchangeCodeForSession(
          code
        );
        if (error) {
          console.error(
            '[AuthService.handleRecoveryLink] exchange code error:',
            error.message
          );
          return false;
        }
        return true;
      }

      if (!accessToken || !refreshToken) {
        return false;
      }

      if (type && type !== 'recovery') {
        return false;
      }

      const { error } = await supabaseClient.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (error) {
        console.error(
          '[AuthService.handleRecoveryLink] setSession error:',
          error.message
        );
        return false;
      }

      return true;
    } catch (error) {
      console.error('[AuthService.handleRecoveryLink] invalid url:', error);
      return false;
    }
  }

  async updatePassword(newPassword: string): Promise<void> {
    const { error } = await supabaseClient.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      console.error('[AuthService.updatePassword] error:', error.message);
      throw new Error('No se pudo actualizar la contrasena');
    }
  }

  async hasActiveSession(): Promise<boolean> {
    const { data, error } = await supabaseClient.auth.getSession();
    if (error) {
      console.error('[AuthService.hasActiveSession] error:', error.message);
      return false;
    }

    return !!data.session;
  }

  async register(userData: RegisterRequest): Promise<AuthResponse> {
    devLog('🔧 AuthService.register() llamado con:', {
      email: userData.email,
      password: userData.password ? '***' : 'vacío',
      firstName: userData.firstName,
      lastName: userData.lastName,
      birthDate: userData.birthDate,
      gender: userData.gender,
    });

    const registerData = {
      email: userData.email,
      password: userData.password,
      data: {
        first_name: userData.firstName,
        last_name: userData.lastName,
        birth_date: userData.birthDate,
        gender: userData.gender,
      },
    };

    devLog('📦 Datos transformados para backend:', {
      ...registerData,
      password: registerData.password ? '***' : 'vacío',
    });

    const response = await fetch(`${API_CONFIG.FUNCTIONS_URL}/auth-register`, {
      method: 'POST',
      headers: defaultHeaders,
      body: JSON.stringify(registerData),
    });

    devLog('📥 Respuesta recibida:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error de la API:', errorText);
      throw new Error('Error en el registro');
    }

    const data = await response.json();
    devLog('✅ Datos de respuesta:', data);

    return {
      user: data.user,
      token: data.access_token,
      refreshToken: data.refresh_token ?? data.refreshToken ?? null,
    };
  }

  async logout(): Promise<void> {
    devLog('[AuthService.logout] Removing authToken from storage');
    await AsyncStorage.removeItem('authToken');
    await AsyncStorage.removeItem(AUTH_REFRESH_TOKEN_KEY);
    await AsyncStorage.removeItem(ONBOARDING_COMPLETED_KEY);
    await AsyncStorage.removeItem(JOINED_WITH_INVITE_KEY);
  }

  async refreshToken(): Promise<string | null> {
    devLog('[AuthService.refreshToken] Attempting refreshSession');

    try {
      const refreshToken = await AsyncStorage.getItem(AUTH_REFRESH_TOKEN_KEY);
      if (!refreshToken) {
        devLog('[AuthService.refreshToken] Missing refresh token');
        return null;
      }
      const { data, error } = await supabaseClient.auth.refreshSession({ refresh_token: refreshToken });

      devLog('[AuthService.refreshToken] Supabase response:', {
        hasSession: !!data?.session,
        error: error?.message,
      });

      if (error || !data.session) {
        return null;
      }

      await AsyncStorage.setItem('authToken', data.session.access_token);
      await AsyncStorage.setItem(
        AUTH_REFRESH_TOKEN_KEY,
        data.session.refresh_token
      );
      devLog('[AuthService.refreshToken] New token stored');
      return data.session.access_token;
    } catch (error) {
      console.error('Error refreshing token:', error);
      return null;
    }
  }

  // Registro por fases
  async registerPhase1(data: Phase1Data): Promise<TempRegistration> {
    devLog('🔧 registerPhase1 called with:', {
      email: data.email,
      hasPassword: !!data.password,
      isGoogleUser: data.isGoogleUser,
    });

    const url = `${API_CONFIG.FUNCTIONS_URL}/auth-register-phase1`;
    devLog('🌐 Fetch URL:', url);
    devLog('🔧 API_CONFIG.FUNCTIONS_URL:', API_CONFIG.FUNCTIONS_URL);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: defaultHeaders,
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          is_google_user: data.isGoogleUser,
        }),
      });

      devLog('📥 Response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        url: response.url,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error response body:', errorText);
        let friendlyMessage = 'Error en fase 1 del registro';
        try {
          const parsed = JSON.parse(errorText);
          const backendError =
            typeof parsed?.error === 'string' ? parsed.error : '';
          if (backendError === 'Email domain does not exist') {
            friendlyMessage = 'El dominio del correo no existe';
          } else if (backendError === 'Invalid email format') {
            friendlyMessage = 'El formato del correo no es valido';
          } else if (backendError === 'Password must be at least 8 characters') {
            friendlyMessage = 'La contrasena debe tener al menos 8 caracteres';
          } else if (backendError === 'Password is required') {
            friendlyMessage = 'Por favor ingresa una contrasena';
          }
        } catch (parseError) {
          console.error(
            '[AuthService.registerPhase1] Failed to parse error body:',
            parseError
          );
        }
        throw new Error(friendlyMessage);
      }

      const result = await response.json();
      devLog('✅ Phase1 response:', result);

      return {
        tempToken: result.temp_token,
        email: result.email,
        isGoogleUser: data.isGoogleUser || false,
      };
    } catch (error) {
      console.error('❌ registerPhase1 error:', error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack =
        error instanceof Error ? error.stack : 'No stack available';
      const errorName = error instanceof Error ? error.name : 'Unknown';

      console.error('❌ Error details:', {
        message: errorMessage,
        stack: errorStack,
        name: errorName,
      });
      throw error;
    }
  }

  async registerPhase2(tempToken: string, data: PhaseGenderData): Promise<void> {
    const response = await fetch(
      `${API_CONFIG.FUNCTIONS_URL}/auth-register-phase2`,
      {
        method: 'POST',
        headers: defaultHeaders,
        body: JSON.stringify({
          temp_token: tempToken,
          first_name: data.firstName,
          last_name: data.lastName,
          gender: data.gender,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error en fase 2 del registro:', errorText);
      throw new Error('Error en fase 2 del registro');
    }
  }

  async registerPhase3(
    tempToken: string,
    data: Phase3Data
  ): Promise<AuthResponse> {
    const response = await fetch(
      `${API_CONFIG.FUNCTIONS_URL}/auth-register-phase3`,
      {
        method: 'POST',
        headers: defaultHeaders,
        body: JSON.stringify({
          temp_token: tempToken,
          birth_date: data.birthDate,
          invite_code: data.inviteCode,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error en fase 3 del registro:', errorText);
      throw new Error('Error en fase 3 del registro');
    }

    const result = await response.json();
    return {
      user: result.user,
      token: result.access_token,
      refreshToken: result.refresh_token ?? result.refreshToken ?? null,
    };
  }

  // Limpiar registro temporal (útil si el usuario abandona el proceso)
  async clearTempRegistration(): Promise<void> {
    await AsyncStorage.removeItem('tempRegistration');
  }

  // Verificar si un email ya existe en la base de datos
  async checkEmailExists(email: string): Promise<boolean> {
    devLog('[AuthService.checkEmailExists] Checking email:', email);

    try {
      const response = await fetch(`${API_CONFIG.FUNCTIONS_URL}/auth-check-email`, {
        method: 'POST',
        headers: defaultHeaders,
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      devLog('[AuthService.checkEmailExists] Response:', {
        status: response.status,
        ok: response.ok,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[AuthService.checkEmailExists] Error:', errorText);
        throw new Error('Error al verificar el email');
      }

      const result = await response.json();
      devLog('[AuthService.checkEmailExists] Result:', result);
      
      return result.exists === true;
    } catch (error) {
      console.error('[AuthService.checkEmailExists] Error:', error);
      throw error;
    }
  }
}

export const authService = new AuthService();
