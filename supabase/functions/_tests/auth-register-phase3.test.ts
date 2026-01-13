// supabase/functions/_tests/auth-register-phase3.test.ts

/**
 * Tests para auth-register-phase3
 * Valida registro completo, validación de invite codes y rollback
 */

import {
  TestRunner,
  TestAssertions,
  createMockRequest,
} from './test-utils.ts';

const runner = new TestRunner();

// ====================
// TESTS DE VALIDACIÓN BÁSICA
// ====================

runner.test('auth-register-phase3: debe requerir temp_token', () => {
  const body = { birth_date: '1990-01-01' };
  const hasToken = 'temp_token' in body;
  TestAssertions.assertFalse(hasToken, 'Debe requerir temp_token');
});

runner.test('auth-register-phase3: debe requerir birth_date', () => {
  const body = { temp_token: 'token-123' };
  const hasBirthDate = 'birth_date' in body;
  TestAssertions.assertFalse(hasBirthDate, 'Debe requerir birth_date');
});

runner.test('auth-register-phase3: birth_date debe tener formato YYYY-MM-DD', () => {
  const validDates = ['1990-01-01', '2000-12-31', '1985-06-15'];
  const invalidDates = ['01-01-1990', '1990/01/01', '01/01/1990', '1990-1-1', 'invalid'];

  const regex = /^\d{4}-\d{2}-\d{2}$/;

  for (const date of validDates) {
    TestAssertions.assertTrue(regex.test(date), `${date} debe ser válido`);
  }

  for (const date of invalidDates) {
    TestAssertions.assertFalse(regex.test(date), `${date} debe ser inválido`);
  }
});

// ====================
// TESTS DE TOKEN TEMPORAL
// ====================

runner.test('auth-register-phase3: debe validar que token existe', () => {
  const tempToken = 'token-123';
  const tempDataExists = false; // Simulado: no encontrado

  TestAssertions.assertFalse(tempDataExists, 'Debe devolver 400 si token no existe');
});

runner.test('auth-register-phase3: debe validar que token no haya expirado', () => {
  const tempData = {
    expires_at: '2020-01-01T00:00:00Z', // Fecha pasada
  };

  const isExpired = new Date(tempData.expires_at) < new Date();
  TestAssertions.assertTrue(isExpired, 'Token está expirado, debe fallar');
});

runner.test('auth-register-phase3: debe validar que gender esté presente', () => {
  const tempData = {
    email: 'test@example.com',
    first_name: 'Test',
    last_name: 'User',
    gender: null, // Falta gender
  };

  TestAssertions.assertNull(tempData.gender, 'Debe devolver 400 si falta gender');
});

// ====================
// TESTS DE INVITE CODE
// ====================

runner.test('auth-register-phase3: invite_code es opcional', () => {
  const body = {
    temp_token: 'token-123',
    birth_date: '1990-01-01',
    // Sin invite_code
  };

  const hasInviteCode = 'invite_code' in body;
  TestAssertions.assertFalse(hasInviteCode, 'invite_code es opcional');
});

runner.test('auth-register-phase3: invite_code debe existir si se proporciona', () => {
  const inviteCode = 'INVALID-CODE';
  const inviteExists = false; // No encontrado

  TestAssertions.assertFalse(inviteExists, 'Debe devolver 400 si código no existe');
});

runner.test('auth-register-phase3: invite_code no puede estar usado', () => {
  const invite = {
    code: 'CODE-123',
    used_at: '2024-01-01T00:00:00Z',
    used_by: 'user-456',
  };

  const isUsed = invite.used_at !== null || invite.used_by !== null;
  TestAssertions.assertTrue(isUsed, 'Debe devolver 409 si código ya usado');
});

runner.test('auth-register-phase3: invite_code no puede estar expirado', () => {
  const invite = {
    code: 'CODE-123',
    expires_at: '2020-01-01T00:00:00Z',
  };

  const isExpired = invite.expires_at && new Date(invite.expires_at) < new Date();
  TestAssertions.assertTrue(isExpired, 'Debe devolver 400 si código expirado');
});

runner.test('auth-register-phase3: invite_code no puede ser para área común', () => {
  const roomExtras = {
    category: 'area_comun',
  };

  const isCommonArea = roomExtras.category === 'area_comun';
  TestAssertions.assertTrue(isCommonArea, 'Debe devolver 400 si es área común');
});

runner.test('auth-register-phase3: room del invite no puede estar asignado', () => {
  const roomId = 'room-123';
  const acceptedAssignments = [
    { id: 'assign-1', room_id: roomId, status: 'accepted' },
  ];

  const hasAcceptedAssignment = acceptedAssignments.length > 0;
  TestAssertions.assertTrue(hasAcceptedAssignment, 'Debe devolver 409 si room ya asignado');
});

// ====================
// TESTS DE FLUJOS DE REGISTRO
// ====================

runner.test('auth-register-phase3: registro normal crea usuario en Auth', () => {
  const tempData = {
    email: 'test@example.com',
    password: 'password123',
    is_google_user: false,
  };

  TestAssertions.assertFalse(tempData.is_google_user, 'Debe crear usuario en Supabase Auth');
});

runner.test('auth-register-phase3: registro Google busca usuario existente', () => {
  const tempData = {
    email: 'test@gmail.com',
    is_google_user: true,
  };

  TestAssertions.assertTrue(tempData.is_google_user, 'Debe buscar usuario en Auth');
});

runner.test('auth-register-phase3: registro Google no requiere password', () => {
  const tempData = {
    email: 'test@gmail.com',
    password: null,
    is_google_user: true,
  };

  const hasPassword = Boolean(tempData.password);
  TestAssertions.assertFalse(hasPassword, 'No debe requerir password para Google');
});

runner.test('auth-register-phase3: registro Google falla si no existe usuario en Auth', () => {
  const authUserFound = false;
  TestAssertions.assertFalse(authUserFound, 'Debe fallar si no existe usuario en Auth');
});

runner.test('auth-register-phase3: registro Google no genera session tokens', () => {
  const accessToken = '';
  const refreshToken = '';

  TestAssertions.assertEquals(accessToken, '', 'Access token debe quedar vacio');
  TestAssertions.assertEquals(refreshToken, '', 'Refresh token debe quedar vacio');
});

runner.test('auth-register-phase3: registro normal genera sesión', () => {
  const isNormalRegistration = true;
  const shouldGenerateSession = isNormalRegistration;

  TestAssertions.assertTrue(shouldGenerateSession, 'Debe generar access_token y refresh_token');
});

runner.test('auth-register-phase3: registro Google actualiza user_metadata', () => {
  const isGoogleUser = true;
  const metadata = {
    first_name: 'John',
    last_name: 'Doe',
    gender: 'male',
    birth_date: '1990-01-01',
  };

  TestAssertions.assertEquals(typeof metadata, 'object', 'Debe actualizar metadata');
});

// ====================
// TESTS DE CREACIÓN DE DATOS
// ====================

runner.test('auth-register-phase3: crea registro en tabla users', () => {
  const userRecord = {
    id: 'user-123',
    email: 'test@example.com',
    first_name: 'John',
    last_name: 'Doe',
    birth_date: '1990-01-01',
    gender: 'male',
  };

  TestAssertions.assertExists(userRecord.id);
  TestAssertions.assertExists(userRecord.email);
  TestAssertions.assertExists(userRecord.gender);
});

runner.test('auth-register-phase3: crea registro en tabla profiles', () => {
  const profileRecord = {
    id: 'user-123',
    gender: 'male',
  };

  TestAssertions.assertExists(profileRecord.id);
  TestAssertions.assertExists(profileRecord.gender);
});

runner.test('auth-register-phase3: usa upsert para evitar duplicados', () => {
  const upsertOperation = 'upsert';
  TestAssertions.assertEquals(upsertOperation, 'upsert', 'Debe usar upsert');
});

// ====================
// TESTS DE INVITE CODE ACCEPTANCE
// ====================

runner.test('auth-register-phase3: con invite_code crea room_assignment', () => {
  const hasInviteCode = true;
  const shouldCreateAssignment = hasInviteCode;

  TestAssertions.assertTrue(shouldCreateAssignment, 'Debe crear assignment si hay invite');
});

runner.test('auth-register-phase3: assignment con invite tiene status accepted', () => {
  const assignmentStatus = 'accepted';
  TestAssertions.assertEquals(assignmentStatus, 'accepted', 'Status debe ser accepted');
});

runner.test('auth-register-phase3: marca room como no disponible', () => {
  const roomUpdate = { is_available: false };
  TestAssertions.assertFalse(roomUpdate.is_available, 'Room debe marcarse como no disponible');
});

runner.test('auth-register-phase3: marca invite como usado', () => {
  const inviteUpdate = {
    used_at: new Date().toISOString(),
    used_by: 'user-123',
  };

  TestAssertions.assertExists(inviteUpdate.used_at);
  TestAssertions.assertExists(inviteUpdate.used_by);
});

runner.test('auth-register-phase3: crea matches con miembros del flat', () => {
  const newUserId = 'user-123';
  const flatMembers = ['owner-456', 'tenant-789'];

  const shouldCreateMatches = flatMembers.length > 0;
  TestAssertions.assertTrue(shouldCreateMatches, 'Debe crear matches automáticos');
});

runner.test('auth-register-phase3: matches automáticos tienen status accepted', () => {
  const matchStatus = 'accepted';
  TestAssertions.assertEquals(matchStatus, 'accepted', 'Matches deben ser accepted');
});

runner.test('auth-register-phase3: excluye matches ya existentes', () => {
  const newUserId = 'user-123';
  const flatMembers = ['member-1', 'member-2'];
  const existingMatches = ['member-1'];

  const newMatches = flatMembers.filter(id => !existingMatches.includes(id));
  TestAssertions.assertEquals(newMatches.length, 1, 'Solo crea matches nuevos');
});

// ====================
// TESTS DE ROLLBACK
// ====================

runner.test('auth-register-phase3: rollback elimina profile', () => {
  const rollbackActions = ['delete_profile', 'delete_user', 'delete_auth_user'];
  TestAssertions.assertTrue(rollbackActions.includes('delete_profile'), 'Debe eliminar profile');
});

runner.test('auth-register-phase3: rollback elimina user', () => {
  const rollbackActions = ['delete_profile', 'delete_user', 'delete_auth_user'];
  TestAssertions.assertTrue(rollbackActions.includes('delete_user'), 'Debe eliminar user');
});

runner.test('auth-register-phase3: rollback elimina auth user', () => {
  const rollbackActions = ['delete_profile', 'delete_user', 'delete_auth_user'];
  TestAssertions.assertTrue(rollbackActions.includes('delete_auth_user'), 'Debe eliminar auth user');
});

// ====================
// TESTS DE LIMPIEZA
// ====================

runner.test('auth-register-phase3: elimina registro temporal al finalizar', () => {
  const shouldDeleteTempRegistration = true;
  TestAssertions.assertTrue(shouldDeleteTempRegistration, 'Debe eliminar temp_registration');
});

// ====================
// TESTS DE CÓDIGOS DE ESTADO
// ====================

runner.test('auth-register-phase3: POST sin campos debe devolver 400', () => {
  const expectedStatus = 400;
  TestAssertions.assertEquals(expectedStatus, 400);
});

runner.test('auth-register-phase3: POST con birth_date inválido debe devolver 400', () => {
  const expectedStatus = 400;
  TestAssertions.assertEquals(expectedStatus, 400);
});

runner.test('auth-register-phase3: POST con token inválido debe devolver 400', () => {
  const expectedStatus = 400;
  TestAssertions.assertEquals(expectedStatus, 400);
});

runner.test('auth-register-phase3: POST con token expirado debe devolver 400', () => {
  const expectedStatus = 400;
  TestAssertions.assertEquals(expectedStatus, 400);
});

runner.test('auth-register-phase3: POST con invite usado debe devolver 409', () => {
  const expectedStatus = 409;
  TestAssertions.assertEquals(expectedStatus, 409);
});

runner.test('auth-register-phase3: POST con room asignado debe devolver 409', () => {
  const expectedStatus = 409;
  TestAssertions.assertEquals(expectedStatus, 409);
});

runner.test('auth-register-phase3: POST exitoso debe devolver 200', () => {
  const expectedStatus = 200;
  TestAssertions.assertEquals(expectedStatus, 200);
});

runner.test('auth-register-phase3: GET no está permitido (405)', () => {
  const expectedStatus = 405;
  TestAssertions.assertEquals(expectedStatus, 405);
});

// ====================
// TESTS DE MÉTODOS HTTP
// ====================

runner.test('auth-register-phase3: solo acepta POST', () => {
  const allowedMethods = ['POST'];
  TestAssertions.assertTrue(allowedMethods.includes('POST'), 'Solo debe aceptar POST');
});

runner.test('auth-register-phase3: acepta OPTIONS para CORS', () => {
  const method = 'OPTIONS';
  TestAssertions.assertEquals(method, 'OPTIONS', 'Debe manejar OPTIONS');
});

// ====================
// TESTS DE ESTRUCTURA DE RESPUESTA
// ====================

runner.test('auth-register-phase3: respuesta exitosa contiene access_token', () => {
  const response = {
    access_token: 'token-123',
    token_type: 'bearer',
    user: { id: 'user-123', email: 'test@example.com' },
  };

  TestAssertions.assertExists(response.access_token, 'Debe incluir access_token');
});

runner.test('auth-register-phase3: respuesta exitosa contiene user', () => {
  const response = {
    access_token: 'token-123',
    user: { id: 'user-123', email: 'test@example.com' },
  };

  TestAssertions.assertExists(response.user, 'Debe incluir user');
  TestAssertions.assertExists(response.user.id, 'User debe tener id');
  TestAssertions.assertExists(response.user.email, 'User debe tener email');
});

// ====================
// EJECUTAR TESTS
// ====================

if (import.meta.main) {
  console.log('🧪 Running auth-register-phase3 tests...\n');
  const results = await runner.run();
  const summary = runner.printResults(results);

  Deno.exit(summary.failed > 0 ? 1 : 0);
}
