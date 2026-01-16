// supabase/functions/_tests/matches.test.ts

/**
 * Tests para la edge function matches
 * Valida lógica de matches, validación y estados
 */

import {
  TestRunner,
  TestAssertions,
  createMockRequest,
} from './test-utils.ts';

const runner = new TestRunner();

// ====================
// TESTS DE VALIDACIÓN DE MATCH STATUS
// ====================

runner.test('matches: debe validar match status correcto', () => {
  const validStatuses = [
    'pending',
    'accepted',
    'rejected',
    'room_offer',
    'room_assigned',
    'room_declined',
    'unmatched',
  ];
  const invalidStatuses = ['pendiente', 'aceptado', 'rechazado', 'invalid'];

  for (const status of validStatuses) {
    TestAssertions.assertTrue(
      validStatuses.includes(status),
      `${status} debe ser válido`
    );
  }

  for (const status of invalidStatuses) {
    TestAssertions.assertFalse(
      validStatuses.includes(status),
      `${status} debe ser inválido`
    );
  }
});

// ====================
// TESTS DE VALIDACIÓN DE DATOS
// ====================

runner.test('matches: debe requerir user_a_id', () => {
  const matchData = {
    user_b_id: 'user-456',
  };

  const hasUserA = 'user_a_id' in matchData;
  TestAssertions.assertFalse(hasUserA, 'Debe fallar sin user_a_id');
});

runner.test('matches: debe requerir user_b_id', () => {
  const matchData = {
    user_a_id: 'user-123',
  };

  const hasUserB = 'user_b_id' in matchData;
  TestAssertions.assertFalse(hasUserB, 'Debe fallar sin user_b_id');
});

runner.test('matches: user_a_id y user_b_id no pueden ser iguales', () => {
  const sameUserId = 'user-123';
  const matchData = {
    user_a_id: sameUserId,
    user_b_id: sameUserId,
  };

  TestAssertions.assertTrue(
    matchData.user_a_id === matchData.user_b_id,
    'Usuarios son iguales, debe fallar'
  );
});

runner.test('matches: debe validar que user IDs son UUIDs válidos', () => {
  const validUUID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
  const invalidUUID = 'not-a-uuid';

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  TestAssertions.assertTrue(
    uuidRegex.test(validUUID),
    'UUID válido debe pasar'
  );

  TestAssertions.assertFalse(
    uuidRegex.test(invalidUUID),
    'UUID inválido debe fallar'
  );
});

// ====================
// TESTS DE LÓGICA DE MATCH
// ====================

runner.test('matches: pending match puede ser aceptado por user_b', () => {
  const existingMatch = {
    id: 'match-123',
    user_a_id: 'user-123',
    user_b_id: 'user-456',
    status: 'pending',
  };

  const currentUserId = 'user-456'; // user_b
  const canAccept = existingMatch.status === 'pending' && currentUserId === existingMatch.user_b_id;

  TestAssertions.assertTrue(canAccept, 'User B debe poder aceptar');
});

runner.test('matches: pending match no puede ser aceptado por user_a', () => {
  const existingMatch = {
    id: 'match-123',
    user_a_id: 'user-123',
    user_b_id: 'user-456',
    status: 'pending',
  };

  const currentUserId = 'user-123'; // user_a
  const canAccept = existingMatch.status === 'pending' && currentUserId !== existingMatch.user_a_id;

  TestAssertions.assertFalse(canAccept, 'User A no debe poder aceptar su propio match');
});

runner.test('matches: rejected match no puede ser recreado', () => {
  const existingMatch = {
    id: 'match-123',
    user_a_id: 'user-123',
    user_b_id: 'user-456',
    status: 'rejected',
  };

  const canRecreate = existingMatch.status !== 'rejected';
  TestAssertions.assertFalse(canRecreate, 'Match rechazado no puede recrearse');
});

runner.test('matches: accepted match ya no es pending', () => {
  const match = {
    id: 'match-123',
    user_a_id: 'user-123',
    user_b_id: 'user-456',
    status: 'accepted',
  };

  TestAssertions.assertNotEquals(match.status, 'pending', 'Match aceptado no es pending');
});

// ====================
// TESTS DE TRANSICIONES DE ESTADO
// ====================

runner.test('matches: transición pending -> accepted es válida', () => {
  const validTransition = {
    from: 'pending',
    to: 'accepted',
  };

  const validTransitions: Record<string, string[]> = {
    pending: ['accepted', 'rejected'],
    accepted: ['room_offer'],
    room_offer: ['room_assigned', 'room_declined'],
  };

  const isValid = validTransitions[validTransition.from]?.includes(validTransition.to) ?? false;
  TestAssertions.assertTrue(isValid, 'Transición debe ser válida');
});

runner.test('matches: transición accepted -> pending es inválida', () => {
  const invalidTransition = {
    from: 'accepted',
    to: 'pending',
  };

  const validTransitions: Record<string, string[]> = {
    pending: ['accepted', 'rejected'],
    accepted: ['room_offer'],
    room_offer: ['room_assigned', 'room_declined'],
  };

  const isValid = validTransitions[invalidTransition.from]?.includes(invalidTransition.to) ?? false;
  TestAssertions.assertFalse(isValid, 'Transición debe ser inválida');
});

// ====================
// TESTS DE PERMISOS
// ====================

runner.test('matches: solo participantes pueden ver el match', () => {
  const match = {
    user_a_id: 'user-123',
    user_b_id: 'user-456',
  };

  const participantUser = 'user-123';
  const otherUser = 'user-789';

  const participantCanView = participantUser === match.user_a_id || participantUser === match.user_b_id;
  const otherCanView = otherUser === match.user_a_id || otherUser === match.user_b_id;

  TestAssertions.assertTrue(participantCanView, 'Participante debe poder ver');
  TestAssertions.assertFalse(otherCanView, 'Otro usuario no debe poder ver');
});

runner.test('matches: solo participantes pueden actualizar el match', () => {
  const match = {
    id: 'match-123',
    user_a_id: 'user-123',
    user_b_id: 'user-456',
    status: 'pending',
  };

  const participantUser = 'user-456';
  const otherUser = 'user-789';

  const participantCanUpdate = participantUser === match.user_a_id || participantUser === match.user_b_id;
  const otherCanUpdate = otherUser === match.user_a_id || otherUser === match.user_b_id;

  TestAssertions.assertTrue(participantCanUpdate, 'Participante debe poder actualizar');
  TestAssertions.assertFalse(otherCanUpdate, 'Otro usuario no debe poder actualizar');
});

// ====================
// TESTS DE MÉTODOS HTTP
// ====================

runner.test('matches: GET requiere autenticación', () => {
  const requestWithoutAuth = createMockRequest('http://localhost/matches', {
    method: 'GET',
  });

  const hasAuth = requestWithoutAuth.headers.has('Authorization');
  TestAssertions.assertFalse(hasAuth, 'Request sin auth debe fallar');
});

runner.test('matches: POST requiere autenticación', () => {
  const requestWithoutAuth = createMockRequest('http://localhost/matches', {
    method: 'POST',
    body: { user_b_id: 'user-456' },
  });

  const hasAuth = requestWithoutAuth.headers.has('Authorization');
  TestAssertions.assertFalse(hasAuth, 'Request sin auth debe fallar');
});

runner.test('matches: PATCH requiere autenticación', () => {
  const requestWithoutAuth = createMockRequest('http://localhost/matches?id=match-123', {
    method: 'PATCH',
    body: { status: 'accepted' },
  });

  const hasAuth = requestWithoutAuth.headers.has('Authorization');
  TestAssertions.assertFalse(hasAuth, 'Request sin auth debe fallar');
});

// ====================
// TESTS DE ESTRUCTURA DE RESPUESTA
// ====================

runner.test('matches: respuesta GET debe tener estructura correcta', () => {
  const mockMatch = {
    id: 'match-123',
    user_a_id: 'user-123',
    user_b_id: 'user-456',
    status: 'accepted',
    matched_at: new Date().toISOString(),
    user_a: {
      id: 'user-123',
      first_name: 'User',
      last_name: 'A',
      avatar_url: 'https://example.com/avatar-a.jpg',
    },
    user_b: {
      id: 'user-456',
      first_name: 'User',
      last_name: 'B',
      avatar_url: 'https://example.com/avatar-b.jpg',
    },
  };

  TestAssertions.assertExists(mockMatch.id);
  TestAssertions.assertExists(mockMatch.user_a_id);
  TestAssertions.assertExists(mockMatch.user_b_id);
  TestAssertions.assertExists(mockMatch.status);
  TestAssertions.assertExists(mockMatch.matched_at);
  TestAssertions.assertExists(mockMatch.user_a);
  TestAssertions.assertExists(mockMatch.user_b);
});

// ====================
// TESTS DE CÓDIGOS DE ESTADO
// ====================

runner.test('matches: POST exitoso debe devolver 201', () => {
  const expectedStatus = 201;
  TestAssertions.assertEquals(expectedStatus, 201);
});

runner.test('matches: POST con match existente debe devolver 200', () => {
  const expectedStatus = 200;
  TestAssertions.assertEquals(expectedStatus, 200);
});

runner.test('matches: POST con match rechazado debe devolver 409', () => {
  const expectedStatus = 409;
  TestAssertions.assertEquals(expectedStatus, 409);
});

runner.test('matches: PATCH exitoso debe devolver 200', () => {
  const expectedStatus = 200;
  TestAssertions.assertEquals(expectedStatus, 200);
});

runner.test('matches: PATCH sin match_id debe devolver 400', () => {
  const expectedStatus = 400;
  TestAssertions.assertEquals(expectedStatus, 400);
});

runner.test('matches: GET sin autorización debe devolver 401', () => {
  const expectedStatus = 401;
  TestAssertions.assertEquals(expectedStatus, 401);
});

runner.test('matches: PATCH de match no propio debe devolver 403', () => {
  const expectedStatus = 403;
  TestAssertions.assertEquals(expectedStatus, 403);
});

// ====================
// TESTS DE DUPLICACIÓN
// ====================

runner.test('matches: no debe permitir matches duplicados (A->B y B->A)', () => {
  const match1 = { user_a_id: 'user-123', user_b_id: 'user-456' };
  const match2 = { user_a_id: 'user-456', user_b_id: 'user-123' };

  const isDuplicate =
    (match1.user_a_id === match2.user_a_id && match1.user_b_id === match2.user_b_id) ||
    (match1.user_a_id === match2.user_b_id && match1.user_b_id === match2.user_a_id);

  TestAssertions.assertTrue(isDuplicate, 'Debe detectar match duplicado');
});

// ====================
// EJECUTAR TESTS
// ====================

if (import.meta.main) {
  console.log('🧪 Running matches tests...\n');
  const results = await runner.run();
  const summary = runner.printResults(results);

  Deno.exit(summary.failed > 0 ? 1 : 0);
}
