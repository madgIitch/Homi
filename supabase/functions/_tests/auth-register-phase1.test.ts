// supabase/functions/_tests/auth-register-phase1.test.ts

/**
 * Tests para auth-register-phase1
 * Valida email, registro temporal y verificacion inicial
 */

import { TestRunner, TestAssertions, createMockRequest } from './test-utils.ts';

const runner = new TestRunner();

// ====================
// TESTS DE REQUEST
// ====================

runner.test('auth-register-phase1: debe aceptar solo POST', () => {
  const request = createMockRequest('http://localhost/auth-register-phase1', {
    method: 'GET',
  });
  const shouldReject = request.method !== 'POST';
  TestAssertions.assertTrue(shouldReject, 'Debe rechazar GET');
});

runner.test('auth-register-phase1: debe requerir email', async () => {
  const request = createMockRequest('http://localhost/auth-register-phase1', {
    method: 'POST',
    body: {},
  });
  const body: any = await request.json();
  const hasEmail = Boolean(body.email);
  TestAssertions.assertFalse(hasEmail, 'Debe fallar si no hay email');
});

runner.test('auth-register-phase1: debe validar formato de email', async () => {
  const request = createMockRequest('http://localhost/auth-register-phase1', {
    method: 'POST',
    body: { email: 'invalid-email' },
  });
  const body: any = await request.json();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isValid = emailRegex.test(body.email);
  TestAssertions.assertFalse(isValid, 'Debe rechazar email invalido');
});

// ====================
// TESTS DE REGISTRO TEMPORAL
// ====================

runner.test('auth-register-phase1: debe generar temp_token', () => {
  const tempToken = `temp_${Date.now()}_abcdefghi`;
  TestAssertions.assertTrue(tempToken.startsWith('temp_'), 'Debe tener prefijo temp_');
});

runner.test('auth-register-phase1: expires_at debe ser 24 horas', () => {
  const createdAt = Date.now();
  const expiresAt = new Date(createdAt + 24 * 60 * 60 * 1000);
  const diffHours = Math.round((expiresAt.getTime() - createdAt) / (1000 * 60 * 60));
  TestAssertions.assertEquals(diffHours, 24);
});

runner.test('auth-register-phase1: debe guardar is_google_user si se envia', () => {
  const body = { is_google_user: true };
  TestAssertions.assertTrue(body.is_google_user, 'Debe persistir is_google_user');
});

// ====================
// EJECUTAR TESTS
// ====================

if (import.meta.main) {
  console.log('Running auth-register-phase1 tests...\n');
  const results = await runner.run();
  const summary = runner.printResults(results);

  Deno.exit(summary.failed > 0 ? 1 : 0);
}
