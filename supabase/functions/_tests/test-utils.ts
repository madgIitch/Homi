// supabase/functions/_tests/test-utils.ts

/**
 * Utilidades compartidas para testing de Edge Functions
 * Proporciona helpers para crear requests, mocks y assertions
 */

export interface TestContext {
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceKey: string;
}

/**
 * Crea un contexto de test con variables de entorno mockeadas
 */
export function createTestContext(): TestContext {
  return {
    supabaseUrl: Deno.env.get('SUPABASE_URL') ?? 'http://localhost:54321',
    supabaseAnonKey: Deno.env.get('SUPABASE_ANON_KEY') ?? 'test-anon-key',
    supabaseServiceKey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? 'test-service-key',
  };
}

/**
 * Crea un Request HTTP mock para testing
 */
export function createMockRequest(
  url: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: unknown;
  } = {}
): Request {
  const { method = 'GET', headers = {}, body } = options;

  const requestHeaders = new Headers({
    'Content-Type': 'application/json',
    ...headers,
  });

  const requestBody = body ? JSON.stringify(body) : undefined;

  return new Request(url, {
    method,
    headers: requestHeaders,
    body: requestBody,
  });
}

/**
 * Crea un Request con autenticación (Bearer token)
 */
export function createAuthenticatedRequest(
  url: string,
  token: string,
  options: {
    method?: string;
    body?: unknown;
    extraHeaders?: Record<string, string>;
  } = {}
): Request {
  return createMockRequest(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.extraHeaders || {}),
    },
  });
}

/**
 * Parsea y devuelve el body JSON de una Response
 */
export async function parseResponseBody<T = unknown>(response: Response): Promise<T> {
  const text = await response.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Failed to parse response body as JSON: ${text}`);
  }
}

/**
 * Assertions personalizadas para testing
 */
export class TestAssertions {
  static assertEquals(actual: unknown, expected: unknown, message?: string) {
    if (actual !== expected) {
      throw new Error(
        message || `Expected ${expected}, but got ${actual}`
      );
    }
  }

  static assertNotEquals(actual: unknown, expected: unknown, message?: string) {
    if (actual === expected) {
      throw new Error(
        message || `Expected values to be different, but both are ${actual}`
      );
    }
  }

  static assertTrue(value: boolean, message?: string) {
    if (!value) {
      throw new Error(message || 'Expected value to be true');
    }
  }

  static assertFalse(value: boolean, message?: string) {
    if (value) {
      throw new Error(message || 'Expected value to be false');
    }
  }

  static assertExists(value: unknown, message?: string) {
    if (value === null || value === undefined) {
      throw new Error(message || 'Expected value to exist');
    }
  }

  static assertNull(value: unknown, message?: string) {
    if (value !== null) {
      throw new Error(message || `Expected null, but got ${value}`);
    }
  }

  static assertArrayIncludes<T>(array: T[], item: T, message?: string) {
    if (!array.includes(item)) {
      throw new Error(
        message || `Expected array to include ${item}`
      );
    }
  }

  static assertThrows(fn: () => void | Promise<void>, message?: string) {
    try {
      fn();
      throw new Error(message || 'Expected function to throw an error');
    } catch (error) {
      // Expected error
      if (error instanceof Error && error.message.includes('Expected function to throw')) {
        throw error;
      }
    }
  }

  static assertResponseStatus(
    response: Response,
    expectedStatus: number,
    message?: string
  ) {
    if (response.status !== expectedStatus) {
      throw new Error(
        message ||
          `Expected status ${expectedStatus}, but got ${response.status}`
      );
    }
  }

  static assertResponseHasHeader(
    response: Response,
    headerName: string,
    message?: string
  ) {
    if (!response.headers.has(headerName)) {
      throw new Error(
        message || `Expected response to have header "${headerName}"`
      );
    }
  }

  static assertResponseContentType(
    response: Response,
    expectedType: string,
    message?: string
  ) {
    const contentType = response.headers.get('Content-Type');
    if (!contentType || !contentType.includes(expectedType)) {
      throw new Error(
        message ||
          `Expected Content-Type "${expectedType}", but got "${contentType}"`
      );
    }
  }
}

/**
 * Helper para crear tokens JWT mockeados (solo para tests)
 */
export function createMockJWT(userId: string, email: string): string {
  // En un test real, esto debería usar la API de Supabase para crear un token válido
  // Para tests unitarios, puede ser un mock simple
  const payload = {
    sub: userId,
    email: email,
    aud: 'authenticated',
    role: 'authenticated',
    exp: Math.floor(Date.now() / 1000) + 3600,
  };

  // En tests reales esto debería ser un JWT válido
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

/**
 * Test runner simple
 */
export interface TestResult {
  name: string;
  passed: boolean;
  error?: Error;
  duration: number;
}

export class TestRunner {
  private tests: Array<{
    name: string;
    fn: () => void | Promise<void>;
  }> = [];

  test(name: string, fn: () => void | Promise<void>) {
    this.tests.push({ name, fn });
  }

  async run(): Promise<TestResult[]> {
    const results: TestResult[] = [];

    for (const test of this.tests) {
      const startTime = performance.now();
      try {
        await test.fn();
        results.push({
          name: test.name,
          passed: true,
          duration: performance.now() - startTime,
        });
      } catch (error) {
        results.push({
          name: test.name,
          passed: false,
          error: error as Error,
          duration: performance.now() - startTime,
        });
      }
    }

    return results;
  }

  printResults(results: TestResult[]) {
    console.log('\n========================================');
    console.log('TEST RESULTS');
    console.log('========================================\n');

    let passed = 0;
    let failed = 0;

    for (const result of results) {
      if (result.passed) {
        console.log(`✅ ${result.name} (${result.duration.toFixed(2)}ms)`);
        passed++;
      } else {
        console.log(`❌ ${result.name} (${result.duration.toFixed(2)}ms)`);
        console.log(`   Error: ${result.error?.message}`);
        if (result.error?.stack) {
          console.log(`   Stack: ${result.error.stack}`);
        }
        failed++;
      }
    }

    console.log('\n========================================');
    console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`);
    console.log('========================================\n');

    return { passed, failed, total: results.length };
  }
}

/**
 * Helper para limpiar datos de test en la base de datos
 */
export async function cleanupTestData(
  supabaseClient: any,
  userId: string
): Promise<void> {
  // Limpia todos los datos relacionados con un usuario de test
  await supabaseClient.from('messages').delete().eq('sender_id', userId);
  await supabaseClient.from('room_assignments').delete().eq('assignee_id', userId);
  await supabaseClient.from('room_interests').delete().eq('user_id', userId);
  await supabaseClient.from('swipe_rejections').delete().eq('user_id', userId);
  await supabaseClient.from('matches').delete().or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`);
  await supabaseClient.from('profile_photos').delete().eq('profile_id', userId);
  await supabaseClient.from('profiles').delete().eq('id', userId);
  await supabaseClient.from('users').delete().eq('id', userId);
}

/**
 * Mock de Supabase Client para tests unitarios
 */
export class MockSupabaseClient {
  private mockData: Map<string, any[]> = new Map();

  constructor(initialData: Record<string, any[]> = {}) {
    for (const [table, data] of Object.entries(initialData)) {
      this.mockData.set(table, data);
    }
  }

  from(table: string) {
    return {
      select: (columns: string = '*') => ({
        eq: (column: string, value: any) => ({
          single: async () => {
            const data = this.mockData.get(table) || [];
            const result = data.find((item) => item[column] === value);
            return { data: result || null, error: result ? null : new Error('Not found') };
          },
        }),
        or: (query: string) => ({
          order: (column: string, options: any) => ({
            data: this.mockData.get(table) || [],
            error: null,
          }),
        }),
      }),
      insert: (data: any) => ({
        select: (columns?: string) => ({
          single: async () => {
            const existing = this.mockData.get(table) || [];
            const newItem = { ...data, id: crypto.randomUUID() };
            this.mockData.set(table, [...existing, newItem]);
            return { data: newItem, error: null };
          },
        }),
      }),
      update: (data: any) => ({
        eq: (column: string, value: any) => ({
          select: (columns?: string) => ({
            single: async () => {
              const items = this.mockData.get(table) || [];
              const index = items.findIndex((item) => item[column] === value);
              if (index === -1) {
                return { data: null, error: new Error('Not found') };
              }
              items[index] = { ...items[index], ...data };
              return { data: items[index], error: null };
            },
          }),
        }),
      }),
      delete: () => ({
        eq: (column: string, value: any) => ({
          then: async () => {
            const items = this.mockData.get(table) || [];
            this.mockData.set(
              table,
              items.filter((item) => item[column] !== value)
            );
            return { data: null, error: null };
          },
        }),
      }),
    };
  }

  get auth() {
    return {
      signInWithPassword: async (credentials: any) => {
        return {
          data: {
            user: { id: 'test-user-id', email: credentials.email },
            session: {
              access_token: 'mock-token',
              refresh_token: 'mock-refresh',
              token_type: 'bearer',
            },
          },
          error: null,
        };
      },
      getUser: async (token: string) => {
        return {
          data: {
            user: { id: 'test-user-id', email: 'test@example.com' },
          },
          error: null,
        };
      },
    };
  }
}
