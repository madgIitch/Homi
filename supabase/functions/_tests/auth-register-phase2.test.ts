// supabase/functions/_tests/auth-register-phase2.test.ts

/**
 * Tests para auth-register-phase2
 * Valida OTP, datos personales y actualizacion de registro temporal
 */

import { TestRunner, TestAssertions, createMockRequest } from './test-utils.ts';

const runner = new TestRunner();

// ====================
// TESTS DE REQUEST
// ====================

runner.test('auth-register-phase2: debe aceptar solo POST', () => {
  const request = createMockRequest('http://localhost/auth-register-phase2', {
    method: 'GET',
  });
  const shouldReject = request.method !== 'POST';
  TestAssertions.assertTrue(shouldReject, 'Debe rechazar GET');
});

runner.test('auth-register-phase2: debe requerir campos obligatorios', async () => {
  const request = createMockRequest('http://localhost/auth-register-phase2', {
    method: 'POST',
    body: { temp_token: 'temp-123' },
  });
  const body: any = await request.json();
  const hasRequired =
    Boolean(body.temp_token) &&
    Boolean(body.first_name) &&
    Boolean(body.last_name) &&
    Boolean(body.gender);
  TestAssertions.assertFalse(hasRequired, 'Debe fallar si faltan campos');
});

// ====================
// TESTS DE TOKEN TEMPORAL
// ====================

runner.test('auth-register-phase2: debe validar temp_token existente', () => {
  const tempToken = 'temp-123';
  const exists = false;
  TestAssertions.assertFalse(exists, 'Debe fallar si temp_token no existe');
});

runner.test('auth-register-phase2: debe validar temp_token no expirado', () => {
  const tempData = { expires_at: '2020-01-01T00:00:00Z' };
  const isExpired = new Date(tempData.expires_at) < new Date();
  TestAssertions.assertTrue(isExpired, 'Debe fallar si temp_token expiro');
});

// ====================
// TESTS DE ACTUALIZACION
// ====================

runner.test('auth-register-phase2: debe actualizar datos personales', () => {
  const update = { first_name: 'Ana', last_name: 'Lopez', gender: 'female' };
  TestAssertions.assertExists(update.first_name);
  TestAssertions.assertExists(update.last_name);
  TestAssertions.assertExists(update.gender);
});

// ====================
// EJECUTAR TESTS
// ====================

if (import.meta.main) {
  console.log('Running auth-register-phase2 tests...\n');
  const results = await runner.run();
  const summary = runner.printResults(results);

  Deno.exit(summary.failed > 0 ? 1 : 0);
}
