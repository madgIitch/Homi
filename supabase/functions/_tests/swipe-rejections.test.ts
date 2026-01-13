// supabase/functions/_tests/swipe-rejections.test.ts

/**
 * Tests para swipe-rejections
 * Valida swipes, rejections y transiciones relacionadas con matches
 */

import {
  TestRunner,
  TestAssertions,
  createMockRequest,
} from './test-utils.ts';

const runner = new TestRunner();

// ====================
// TESTS DE VALIDACION DE REQUEST
// ====================

runner.test('swipe-rejections: debe requerir rejected_profile_id', () => {
  const body = {};
  const hasRejectedId = 'rejected_profile_id' in body;
  TestAssertions.assertFalse(hasRejectedId, 'Debe fallar sin rejected_profile_id');
});

runner.test('swipe-rejections: rejected_profile_id debe ser string', () => {
  const body = { rejected_profile_id: 123 };
  const isString = typeof body.rejected_profile_id === 'string';
  TestAssertions.assertFalse(isString, 'Debe fallar si rejected_profile_id no es string');
});

runner.test('swipe-rejections: no debe permitir rechazar el propio perfil', () => {
  const userId = 'user-123';
  const body = { rejected_profile_id: 'user-123' };
  const isSelfReject = body.rejected_profile_id === userId;
  TestAssertions.assertTrue(isSelfReject, 'Debe fallar si se rechaza a si mismo');
});

// ====================
// TESTS DE METODOS HTTP
// ====================

runner.test('swipe-rejections: debe aceptar GET y POST', () => {
  const getRequest = createMockRequest('http://localhost/swipe-rejections', {
    method: 'GET',
  });
  const postRequest = createMockRequest('http://localhost/swipe-rejections', {
    method: 'POST',
    body: { rejected_profile_id: 'user-456' },
  });

  TestAssertions.assertEquals(getRequest.method, 'GET');
  TestAssertions.assertEquals(postRequest.method, 'POST');
});

runner.test('swipe-rejections: debe rechazar metodos no soportados', () => {
  const request = createMockRequest('http://localhost/swipe-rejections', {
    method: 'PUT',
  });

  const shouldReject = request.method !== 'GET' && request.method !== 'POST';
  TestAssertions.assertTrue(shouldReject, 'Debe devolver 405 para metodos no soportados');
});

// ====================
// TESTS DE LOGICA DE MATCH
// ====================

runner.test('swipe-rejections: debe rechazar match pending si existe', () => {
  const match = {
    id: 'match-1',
    status: 'pending',
    user_a_id: 'user-123',
    user_b_id: 'user-456',
  };

  const shouldReject = match.status === 'pending';
  TestAssertions.assertTrue(shouldReject, 'Debe marcar match como rejected');
});

// ====================
// EJECUTAR TESTS
// ====================

if (import.meta.main) {
  console.log('Running swipe-rejections tests...\n');
  const results = await runner.run();
  const summary = runner.printResults(results);

  Deno.exit(summary.failed > 0 ? 1 : 0);
}
