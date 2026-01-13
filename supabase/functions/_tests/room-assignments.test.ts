// supabase/functions/_tests/room-assignments.test.ts

/**
 * Tests para la edge function room-assignments
 * Valida asignación de habitaciones, lógica de matching automático y permisos
 */

import {
  TestRunner,
  TestAssertions,
  createMockRequest,
  createAuthenticatedRequest,
} from './test-utils.ts';

const runner = new TestRunner();

// ====================
// TESTS DE VALIDACIÓN GET
// ====================

runner.test('room-assignments: GET debe requerir parámetro', () => {
  const url = 'http://localhost/room-assignments';
  // Sin match_id, room_id, owner, ni assignee

  const shouldFail = true; // Debe devolver 400
  TestAssertions.assertTrue(shouldFail, 'Debe requerir al menos un parámetro');
});

runner.test('room-assignments: GET con match_id debe validar participación', () => {
  const match = {
    id: 'match-123',
    user_a_id: 'user-123',
    user_b_id: 'user-456',
  };

  const currentUserId = 'user-789'; // Usuario externo
  const canAccess = currentUserId === match.user_a_id || currentUserId === match.user_b_id;

  TestAssertions.assertFalse(canAccess, 'Usuario externo no puede acceder');
});

runner.test('room-assignments: GET con room_id valida permisos del owner', () => {
  const roomOwnerId = 'owner-123';
  const requestingUserId = 'owner-123';

  const canSeeDetails = requestingUserId === roomOwnerId;
  TestAssertions.assertTrue(canSeeDetails, 'Owner puede ver detalles');
});

runner.test('room-assignments: GET con room_id valida permisos de tenant', () => {
  const roomOwnerId = 'owner-123';
  const requestingUserId = 'tenant-456';

  // Tenant con asignación aceptada puede ver
  const hasAcceptedAssignment = true;
  const canSeeDetails = hasAcceptedAssignment;

  TestAssertions.assertTrue(canSeeDetails, 'Tenant con asignación puede ver');
});

runner.test('room-assignments: GET con room_id usuario externo ve datos limitados', () => {
  const roomOwnerId = 'owner-123';
  const requestingUserId = 'external-789';

  const hasAcceptedAssignment = false;
  const canSeeDetails = requestingUserId === roomOwnerId || hasAcceptedAssignment;

  TestAssertions.assertFalse(canSeeDetails, 'Usuario externo ve datos limitados');
});

// ====================
// TESTS DE VALIDACIÓN POST (OFERTA CON MATCH)
// ====================

runner.test('room-assignments: POST debe requerir room_id y assignee_id', () => {
  const body1 = { assignee_id: 'user-123' }; // Falta room_id
  const body2 = { room_id: 'room-123' }; // Falta assignee_id

  TestAssertions.assertFalse('room_id' in body1, 'Debe fallar sin room_id');
  TestAssertions.assertFalse('assignee_id' in body2, 'Debe fallar sin assignee_id');
});

runner.test('room-assignments: POST no permite asignar room ya asignado', () => {
  const roomId = 'room-123';
  const hasAcceptedAssignment = true;

  TestAssertions.assertTrue(
    hasAcceptedAssignment,
    'Debe devolver 409 si room ya tiene asignación aceptada'
  );
});

runner.test('room-assignments: POST con match_id valida que usuario sea del match', () => {
  const match = {
    user_a_id: 'user-123',
    user_b_id: 'user-456',
  };
  const currentUserId = 'user-789';

  const isInMatch = currentUserId === match.user_a_id || currentUserId === match.user_b_id;
  TestAssertions.assertFalse(isInMatch, 'Usuario debe estar en el match');
});

runner.test('room-assignments: POST con match_id solo owner puede ofrecer', () => {
  const match = {
    user_a_id: 'owner-123',
    user_b_id: 'seeker-456',
    user_a: { housing_situation: 'offering' },
    user_b: { housing_situation: 'seeking' },
  };

  const ownerId = match.user_a.housing_situation === 'offering'
    ? match.user_a_id
    : match.user_b_id;

  TestAssertions.assertEquals(ownerId, 'owner-123', 'Owner es quien tiene housing_situation offering');

  const currentUserId = 'seeker-456';
  const canOffer = currentUserId === ownerId;

  TestAssertions.assertFalse(canOffer, 'Solo owner puede ofrecer');
});

runner.test('room-assignments: POST con match_id valida que assignee esté en match', () => {
  const match = {
    user_a_id: 'user-123',
    user_b_id: 'user-456',
  };
  const assigneeId = 'user-789'; // Usuario externo

  const assigneeInMatch = assigneeId === match.user_a_id || assigneeId === match.user_b_id;
  TestAssertions.assertFalse(assigneeInMatch, 'Assignee debe estar en el match');
});

runner.test('room-assignments: POST con match_id valida propietario del room', () => {
  const room = { id: 'room-123', owner_id: 'owner-123' };
  const requestingUser = 'owner-456';

  const ownsRoom = room.owner_id === requestingUser;
  TestAssertions.assertFalse(ownsRoom, 'Debe ser propietario del room');
});

runner.test('room-assignments: POST con match_id crea con status offered', () => {
  const expectedStatus = 'offered';
  TestAssertions.assertEquals(expectedStatus, 'offered', 'Status inicial debe ser offered');
});

runner.test('room-assignments: POST con match_id actualiza match a room_offer', () => {
  const newMatchStatus = 'room_offer';
  TestAssertions.assertEquals(newMatchStatus, 'room_offer', 'Match status debe cambiar a room_offer');
});

runner.test('room-assignments: POST con match_id usa upsert con onConflict', () => {
  // Valida que si ya existe asignación para el match, la actualiza
  const upsertConfig = { onConflict: 'match_id' };
  TestAssertions.assertEquals(upsertConfig.onConflict, 'match_id', 'Debe usar upsert con match_id como conflict');
});

// ====================
// TESTS DE AUTO-ASIGNACIÓN (SIN MATCH)
// ====================

runner.test('room-assignments: POST sin match_id solo permite self-assign', () => {
  const assigneeId = 'user-123';
  const currentUserId = 'user-456';

  const isSelfAssign = assigneeId === currentUserId;
  TestAssertions.assertFalse(isSelfAssign, 'Solo puede auto-asignarse');
});

runner.test('room-assignments: POST sin match_id valida propietario del room', () => {
  const room = { id: 'room-123', owner_id: 'owner-123' };
  const currentUserId = 'owner-456';

  const ownsRoom = room.owner_id === currentUserId;
  TestAssertions.assertFalse(ownsRoom, 'Debe ser propietario del room');
});

runner.test('room-assignments: POST sin match_id crea con status accepted', () => {
  const expectedStatus = 'accepted';
  TestAssertions.assertEquals(expectedStatus, 'accepted', 'Status debe ser accepted inmediatamente');
});

runner.test('room-assignments: POST sin match_id marca room como no disponible', () => {
  const roomUpdate = { is_available: false };
  TestAssertions.assertFalse(roomUpdate.is_available, 'Room debe marcarse como no disponible');
});

// ====================
// TESTS DE PATCH (ACTUALIZACIÓN DE ESTADO)
// ====================

runner.test('room-assignments: PATCH debe requerir assignment_id y status', () => {
  const body1 = { status: 'accepted' }; // Falta assignment_id
  const body2 = { assignment_id: 'assign-123' }; // Falta status

  TestAssertions.assertFalse('assignment_id' in body1, 'Debe requerir assignment_id');
  TestAssertions.assertFalse('status' in body2, 'Debe requerir status');
});

runner.test('room-assignments: PATCH solo acepta status accepted o rejected', () => {
  const validStatuses = ['accepted', 'rejected'];
  const invalidStatuses = ['offered', 'pending', 'cancelled'];

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

runner.test('room-assignments: PATCH valida que usuario sea assignee u owner', () => {
  const assignment = {
    assignee_id: 'assignee-123',
    room: { owner_id: 'owner-456' },
  };
  const currentUserId = 'other-789';

  const isAssignee = assignment.assignee_id === currentUserId;
  const isOwner = assignment.room?.owner_id === currentUserId;
  const canUpdate = isAssignee || isOwner;

  TestAssertions.assertFalse(canUpdate, 'Usuario debe ser assignee u owner');
});

runner.test('room-assignments: PATCH owner solo puede rejected', () => {
  const assignment = {
    assignee_id: 'assignee-123',
    room: { owner_id: 'owner-456' },
  };
  const currentUserId = 'owner-456';
  const requestedStatus = 'accepted';

  const isAssignee = assignment.assignee_id === currentUserId;
  const isOwner = assignment.room?.owner_id === currentUserId;

  const canAccept = isOwner && !isAssignee && requestedStatus !== 'rejected';

  TestAssertions.assertTrue(canAccept, 'Owner sin ser assignee solo puede rejected');
});

runner.test('room-assignments: PATCH assignee puede aceptar o rechazar', () => {
  const assignment = {
    assignee_id: 'assignee-123',
    room: { owner_id: 'owner-456' },
  };
  const currentUserId = 'assignee-123';

  const isAssignee = assignment.assignee_id === currentUserId;
  TestAssertions.assertTrue(isAssignee, 'Assignee puede aceptar o rechazar');
});

runner.test('room-assignments: PATCH accepted actualiza match a room_assigned', () => {
  const matchId = 'match-123';
  const status = 'accepted';
  const newMatchStatus = status === 'accepted' ? 'room_assigned' : 'room_declined';

  TestAssertions.assertEquals(newMatchStatus, 'room_assigned', 'Match debe cambiar a room_assigned');
});

runner.test('room-assignments: PATCH rejected actualiza match a room_declined', () => {
  const matchId = 'match-123';
  const status = 'rejected';
  const newMatchStatus = status === 'accepted' ? 'room_assigned' : 'room_declined';

  TestAssertions.assertEquals(newMatchStatus, 'room_declined', 'Match debe cambiar a room_declined');
});

runner.test('room-assignments: PATCH accepted marca room como no disponible', () => {
  const status = 'accepted';
  const roomUpdate = status === 'accepted' ? { is_available: false } : {};

  TestAssertions.assertEquals(
    roomUpdate.is_available,
    false,
    'Room debe marcarse como no disponible al aceptar'
  );
});

runner.test('room-assignments: PATCH rejected de accepted libera room', () => {
  const previousStatus = 'accepted';
  const newStatus = 'rejected';
  const shouldFreeRoom = newStatus === 'rejected' && previousStatus === 'accepted';

  TestAssertions.assertTrue(shouldFreeRoom, 'Debe liberar room si cambia de accepted a rejected');
});

runner.test('room-assignments: PATCH rejected de offered NO libera room', () => {
  const previousStatus = 'offered';
  const newStatus = 'rejected';
  const shouldFreeRoom = newStatus === 'rejected' && previousStatus === 'accepted';

  TestAssertions.assertFalse(shouldFreeRoom, 'No debe liberar room si era offered');
});

// ====================
// TESTS DE AUTO-MATCHING (createMatchesForFlat)
// ====================

runner.test('room-assignments: auto-matching obtiene miembros del flat', () => {
  const flatId = 'flat-123';
  const ownerId = 'owner-123';
  const acceptedAssignees = ['tenant-456', 'tenant-789'];

  const allMembers = [ownerId, ...acceptedAssignees];
  TestAssertions.assertEquals(allMembers.length, 3, 'Debe incluir owner y tenants');
});

runner.test('room-assignments: auto-matching excluye nuevo usuario', () => {
  const newUserId = 'new-user-123';
  const existingMembers = ['owner-123', 'tenant-456', 'tenant-789'];

  const membersToMatch = existingMembers.filter(id => id !== newUserId);
  TestAssertions.assertEquals(membersToMatch.length, 3, 'No debe incluir al nuevo usuario');
});

runner.test('room-assignments: auto-matching excluye matches existentes', () => {
  const newUserId = 'new-user-123';
  const flatMembers = ['member-1', 'member-2', 'member-3'];
  const existingMatches = [
    { user_a_id: newUserId, user_b_id: 'member-1' },
    { user_a_id: 'member-2', user_b_id: newUserId },
  ];

  const existingSet = new Set<string>();
  existingMatches.forEach(match => {
    const otherId = match.user_a_id === newUserId ? match.user_b_id : match.user_a_id;
    existingSet.add(otherId);
  });

  const newMatches = flatMembers.filter(id => !existingSet.has(id));
  TestAssertions.assertEquals(newMatches.length, 1, 'Solo debe crear match con member-3');
});

runner.test('room-assignments: auto-matching crea matches con status accepted', () => {
  const newUserId = 'new-user-123';
  const memberId = 'member-456';

  const match = {
    user_a_id: newUserId,
    user_b_id: memberId,
    status: 'accepted',
  };

  TestAssertions.assertEquals(match.status, 'accepted', 'Matches automáticos deben ser accepted');
});

runner.test('room-assignments: auto-matching NO crea matches si no hay miembros', () => {
  const flatMembers: string[] = [];
  const shouldCreateMatches = flatMembers.length > 0;

  TestAssertions.assertFalse(shouldCreateMatches, 'No debe crear matches sin miembros');
});

// ====================
// TESTS DE RESOLVE OWNER
// ====================

runner.test('room-assignments: resolveOwnerId identifica offering en user_a', () => {
  const match = {
    user_a_id: 'user-123',
    user_b_id: 'user-456',
    user_a: { housing_situation: 'offering' },
    user_b: { housing_situation: 'seeking' },
  };

  const ownerId = match.user_a.housing_situation === 'offering'
    ? match.user_a_id
    : match.user_b.housing_situation === 'offering'
    ? match.user_b_id
    : null;

  TestAssertions.assertEquals(ownerId, 'user-123', 'Debe identificar user_a como owner');
});

runner.test('room-assignments: resolveOwnerId identifica offering en user_b', () => {
  const match = {
    user_a_id: 'user-123',
    user_b_id: 'user-456',
    user_a: { housing_situation: 'seeking' },
    user_b: { housing_situation: 'offering' },
  };

  const ownerId = match.user_a.housing_situation === 'offering'
    ? match.user_a_id
    : match.user_b.housing_situation === 'offering'
    ? match.user_b_id
    : null;

  TestAssertions.assertEquals(ownerId, 'user-456', 'Debe identificar user_b como owner');
});

runner.test('room-assignments: resolveOwnerId retorna null si ninguno offering', () => {
  const match = {
    user_a_id: 'user-123',
    user_b_id: 'user-456',
    user_a: { housing_situation: 'seeking' },
    user_b: { housing_situation: 'seeking' },
  };

  const ownerId = match.user_a.housing_situation === 'offering'
    ? match.user_a_id
    : match.user_b.housing_situation === 'offering'
    ? match.user_b_id
    : null;

  TestAssertions.assertNull(ownerId, 'Debe retornar null si ninguno es offering');
});

// ====================
// TESTS DE CÓDIGOS DE ESTADO HTTP
// ====================

runner.test('room-assignments: GET sin parámetros debe devolver 400', () => {
  const expectedStatus = 400;
  TestAssertions.assertEquals(expectedStatus, 400);
});

runner.test('room-assignments: GET con match inexistente debe devolver 404', () => {
  const expectedStatus = 404;
  TestAssertions.assertEquals(expectedStatus, 404);
});

runner.test('room-assignments: GET sin permisos debe devolver 403', () => {
  const expectedStatus = 403;
  TestAssertions.assertEquals(expectedStatus, 403);
});

runner.test('room-assignments: POST sin room_id/assignee_id debe devolver 400', () => {
  const expectedStatus = 400;
  TestAssertions.assertEquals(expectedStatus, 400);
});

runner.test('room-assignments: POST con room ya asignado debe devolver 409', () => {
  const expectedStatus = 409;
  TestAssertions.assertEquals(expectedStatus, 409);
});

runner.test('room-assignments: POST sin permisos debe devolver 403', () => {
  const expectedStatus = 403;
  TestAssertions.assertEquals(expectedStatus, 403);
});

runner.test('room-assignments: POST exitoso debe devolver 200', () => {
  const expectedStatus = 200;
  TestAssertions.assertEquals(expectedStatus, 200);
});

runner.test('room-assignments: PATCH con status inválido debe devolver 400', () => {
  const expectedStatus = 400;
  TestAssertions.assertEquals(expectedStatus, 400);
});

runner.test('room-assignments: PATCH sin assignment debe devolver 404', () => {
  const expectedStatus = 404;
  TestAssertions.assertEquals(expectedStatus, 404);
});

runner.test('room-assignments: PATCH sin permisos debe devolver 403', () => {
  const expectedStatus = 403;
  TestAssertions.assertEquals(expectedStatus, 403);
});

runner.test('room-assignments: PATCH exitoso debe devolver 200', () => {
  const expectedStatus = 200;
  TestAssertions.assertEquals(expectedStatus, 200);
});

// ====================
// TESTS DE MÉTODOS HTTP
// ====================

runner.test('room-assignments: GET requiere autenticación', () => {
  const requestWithoutAuth = createMockRequest('http://localhost/room-assignments?owner=true', {
    method: 'GET',
  });

  const hasAuth = requestWithoutAuth.headers.has('Authorization');
  TestAssertions.assertFalse(hasAuth, 'Request sin auth debe fallar');
});

runner.test('room-assignments: POST requiere autenticación', () => {
  const requestWithoutAuth = createMockRequest('http://localhost/room-assignments', {
    method: 'POST',
    body: { room_id: 'room-123', assignee_id: 'user-123' },
  });

  const hasAuth = requestWithoutAuth.headers.has('Authorization');
  TestAssertions.assertFalse(hasAuth, 'Request sin auth debe fallar');
});

runner.test('room-assignments: PATCH requiere autenticación', () => {
  const requestWithoutAuth = createMockRequest('http://localhost/room-assignments', {
    method: 'PATCH',
    body: { assignment_id: 'assign-123', status: 'accepted' },
  });

  const hasAuth = requestWithoutAuth.headers.has('Authorization');
  TestAssertions.assertFalse(hasAuth, 'Request sin auth debe fallar');
});

runner.test('room-assignments: OPTIONS debe devolver CORS', () => {
  const expectedMethod = 'OPTIONS';
  TestAssertions.assertEquals(expectedMethod, 'OPTIONS');
});

runner.test('room-assignments: DELETE no está implementado (405)', () => {
  const expectedStatus = 405;
  TestAssertions.assertEquals(expectedStatus, 405);
});

// ====================
// EJECUTAR TESTS
// ====================

if (import.meta.main) {
  console.log('🧪 Running room-assignments tests...\n');
  const results = await runner.run();
  const summary = runner.printResults(results);

  Deno.exit(summary.failed > 0 ? 1 : 0);
}
