import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { mockFetchJson, mockFetchResponse } from './testUtils';

jest.mock('@supabase/supabase-js', () => {
  const mockAuth = {
    setSession: jest.fn(),
    refreshSession: jest.fn(),
    signInWithIdToken: jest.fn(),
  };
  return {
    __mockSupabaseAuth: mockAuth,
    createClient: jest.fn(() => ({ auth: mockAuth })),
  };
});

import { authService } from '../../src/services/authService';

describe('authService', () => {
  beforeEach(() => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
    const supabaseModule = require('@supabase/supabase-js');
    supabaseModule.__mockSupabaseAuth.setSession.mockReset();
    supabaseModule.__mockSupabaseAuth.refreshSession.mockReset();
    supabaseModule.__mockSupabaseAuth.signInWithIdToken.mockReset();
  });

  it('login returns token payload', async () => {
    mockFetchJson({
      user: { id: 'u1', email: 'a@b.com' },
      access_token: 'token',
      refresh_token: 'refresh',
    });

    const result = await authService.login({
      email: 'a@b.com',
      password: 'pass',
    });
    expect(result.token).toBe('token');
    expect(result.refreshToken).toBe('refresh');
  });

  it('login throws on invalid credentials', async () => {
    mockFetchResponse({ ok: false, status: 401, text: 'bad' });
    await expect(
      authService.login({ email: 'a@b.com', password: 'bad' })
    ).rejects.toThrow('Credenciales inválidas');
  });

  it('loginWithGoogle returns session tokens', async () => {
    (GoogleSignin.hasPlayServices as jest.Mock).mockResolvedValue(true);
    (GoogleSignin.signIn as jest.Mock).mockResolvedValue({
      data: { idToken: 'id-token', user: { email: 'a@b.com' } },
    });
    mockFetchJson({ exists: true, email: 'a@b.com' });
    const supabaseModule = require('@supabase/supabase-js');
    supabaseModule.__mockSupabaseAuth.signInWithIdToken.mockResolvedValue({
      data: {
        user: { id: 'u1', email: 'a@b.com', user_metadata: {} },
        session: { access_token: 'token', refresh_token: 'refresh' },
      },
      error: null,
    });

    const result = await authService.loginWithGoogle();
    expect(result.token).toBe('token');
    expect(result.refreshToken).toBe('refresh');
  });

  it('loginWithGoogle throws when account does not exist', async () => {
    (GoogleSignin.hasPlayServices as jest.Mock).mockResolvedValue(true);
    (GoogleSignin.signIn as jest.Mock).mockResolvedValue({
      data: { idToken: 'id-token', user: { email: 'a@b.com' } },
    });
    mockFetchJson({ exists: false, email: 'a@b.com' });

    await expect(authService.loginWithGoogle()).rejects.toThrow(
      'No existe una cuenta asociada a este Google'
    );
  });

  it('refreshToken stores new tokens', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('refresh');
    const supabaseModule = require('@supabase/supabase-js');
    supabaseModule.__mockSupabaseAuth.refreshSession.mockResolvedValue({
      data: { session: { access_token: 'new', refresh_token: 'r2' } },
      error: null,
    });

    const token = await authService.refreshToken();
    expect(token).toBe('new');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('authToken', 'new');
  });
});
