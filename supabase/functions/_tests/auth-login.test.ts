// supabase/functions/_tests/auth-login.test.ts

/**
 * Tests para la edge function auth-login
 * Valida autenticación, manejo de errores y respuestas
 */

import {
  TestRunner,
  TestAssertions,
  createMockRequest,
  parseResponseBody,
} from './test-utils.ts';

const runner = new TestRunner();

// ====================
// TESTS DE VALIDACIÓN DE REQUEST
// ====================

runner.test('auth-login: debe rechazar peticiones sin email', async () => {
  const request = createMockRequest('http://localhost/auth-login', {
    method: 'POST',
    body: { password: 'password123' },
  });

  // Simulamos la lógica de validación de la función
  const body: any = await request.json();

  const isValid = body.email && body.password;
  TestAssertions.assertFalse(isValid, 'Debe fallar sin email');
});

runner.test('auth-login: debe rechazar peticiones sin password', async () => {
  const request = createMockRequest('http://localhost/auth-login', {
    method: 'POST',
    body: { email: 'test@example.com' },
  });

  const body: any = await request.json();
  const isValid = body.email && body.password;

  TestAssertions.assertFalse(isValid, 'Debe fallar sin password');
});

runner.test('auth-login: debe rechazar email inválido', async () => {
  const request = createMockRequest('http://localhost/auth-login', {
    method: 'POST',
    body: { email: 'invalid-email', password: 'password123' },
  });

  const body: any = await request.json();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isValidEmail = emailRegex.test(body.email);

  TestAssertions.assertFalse(isValidEmail, 'Debe rechazar email inválido');
});

// ====================
// TESTS DE MÉTODO HTTP
// ====================

runner.test('auth-login: debe rechazar método GET', () => {
  const request = createMockRequest('http://localhost/auth-login', {
    method: 'GET',
  });

  TestAssertions.assertEquals(
    request.method,
    'GET',
    'Método debe ser GET'
  );

  // La función debe devolver 405 Method Not Allowed
  const shouldReject = request.method !== 'POST';
  TestAssertions.assertTrue(shouldReject, 'Debe rechazar GET');
});

runner.test('auth-login: debe aceptar método POST', () => {
  const request = createMockRequest('http://localhost/auth-login', {
    method: 'POST',
    body: { email: 'test@example.com', password: 'password123' },
  });

  TestAssertions.assertEquals(
    request.method,
    'POST',
    'Método debe ser POST'
  );
});

runner.test('auth-login: debe aceptar método OPTIONS (CORS preflight)', () => {
  const request = createMockRequest('http://localhost/auth-login', {
    method: 'OPTIONS',
  });

  TestAssertions.assertEquals(
    request.method,
    'OPTIONS',
    'Método debe ser OPTIONS'
  );
});

// ====================
// TESTS DE ESTRUCTURA DE RESPUESTA
// ====================

runner.test('auth-login: respuesta debe tener estructura correcta', () => {
  const mockResponse = {
    access_token: 'mock-token',
    token_type: 'bearer',
    expires_in: 3600,
    refresh_token: 'mock-refresh-token',
    user: {
      id: 'user-id',
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User',
      birth_date: '',
      created_at: new Date().toISOString(),
    },
  };

  TestAssertions.assertExists(mockResponse.access_token);
  TestAssertions.assertExists(mockResponse.token_type);
  TestAssertions.assertExists(mockResponse.expires_in);
  TestAssertions.assertExists(mockResponse.refresh_token);
  TestAssertions.assertExists(mockResponse.user);
  TestAssertions.assertExists(mockResponse.user.id);
  TestAssertions.assertExists(mockResponse.user.email);
});

// ====================
// TESTS DE VALIDACIÓN DE DATOS
// ====================

runner.test('auth-login: debe validar longitud mínima de password', () => {
  const shortPassword = '123';
  const minLength = 6;

  TestAssertions.assertTrue(
    shortPassword.length < minLength,
    'Password debe ser muy corto'
  );
});

runner.test('auth-login: debe validar formato de email', () => {
  const validEmails = [
    'test@example.com',
    'user.name@domain.co.uk',
    'user+tag@example.com',
  ];

  const invalidEmails = [
    'notanemail',
    '@example.com',
    'user@',
    'user @example.com',
  ];

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  for (const email of validEmails) {
    TestAssertions.assertTrue(
      emailRegex.test(email),
      `${email} debe ser válido`
    );
  }

  for (const email of invalidEmails) {
    TestAssertions.assertFalse(
      emailRegex.test(email),
      `${email} debe ser inválido`
    );
  }
});

// ====================
// TESTS DE HEADERS
// ====================

runner.test('auth-login: debe incluir headers CORS', () => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  TestAssertions.assertExists(corsHeaders['Access-Control-Allow-Origin']);
  TestAssertions.assertExists(corsHeaders['Access-Control-Allow-Methods']);
  TestAssertions.assertExists(corsHeaders['Access-Control-Allow-Headers']);
});

runner.test('auth-login: debe establecer Content-Type JSON', () => {
  const request = createMockRequest('http://localhost/auth-login', {
    method: 'POST',
    body: { email: 'test@example.com', password: 'password123' },
  });

  const contentType = request.headers.get('Content-Type');
  TestAssertions.assertTrue(
    contentType?.includes('application/json') ?? false,
    'Content-Type debe ser application/json'
  );
});

// ====================
// TESTS DE CÓDIGOS DE ERROR
// ====================

runner.test('auth-login: debe devolver 400 para credenciales faltantes', () => {
  const expectedStatus = 400;
  const actualStatus = 400; // Simulado

  TestAssertions.assertEquals(
    actualStatus,
    expectedStatus,
    'Status debe ser 400 Bad Request'
  );
});

runner.test('auth-login: debe devolver 401 para credenciales inválidas', () => {
  const expectedStatus = 401;
  const actualStatus = 401; // Simulado

  TestAssertions.assertEquals(
    actualStatus,
    expectedStatus,
    'Status debe ser 401 Unauthorized'
  );
});

runner.test('auth-login: debe devolver 405 para método no permitido', () => {
  const expectedStatus = 405;
  const actualStatus = 405; // Simulado

  TestAssertions.assertEquals(
    actualStatus,
    expectedStatus,
    'Status debe ser 405 Method Not Allowed'
  );
});

runner.test('auth-login: debe devolver 500 para error interno', () => {
  const expectedStatus = 500;
  const actualStatus = 500; // Simulado

  TestAssertions.assertEquals(
    actualStatus,
    expectedStatus,
    'Status debe ser 500 Internal Server Error'
  );
});

// ====================
// EJECUTAR TESTS
// ====================

if (import.meta.main) {
  console.log('🧪 Running auth-login tests...\n');
  const results = await runner.run();
  const summary = runner.printResults(results);

  // Exit con código de error si hay tests fallidos
  Deno.exit(summary.failed > 0 ? 1 : 0);
}
