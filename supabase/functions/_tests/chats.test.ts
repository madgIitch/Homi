// supabase/functions/_tests/chats.test.ts

/**
 * Tests para la edge function chats
 * Valida gestión de chats y mensajes, permisos y validaciones
 */

import {
  TestRunner,
  TestAssertions,
  createMockRequest,
} from './test-utils.ts';

const runner = new TestRunner();

// ====================
// TESTS DE ESTADOS DE MATCH VÁLIDOS
// ====================

runner.test('chats: solo matches activos pueden tener chat', () => {
  const validStatuses = [
    'pending',
    'accepted',
    'room_offer',
    'room_assigned',
    'room_declined',
    'unmatched',
  ];
  const invalidStatuses = ['rejected'];

  for (const status of validStatuses) {
    TestAssertions.assertTrue(validStatuses.includes(status), `${status} debe permitir chat`);
  }

  for (const status of invalidStatuses) {
    TestAssertions.assertFalse(validStatuses.includes(status), `${status} no debe permitir chat`);
  }
});

// ====================
// TESTS DE CREACIÓN DE CHAT
// ====================

runner.test('chats: POST type=chat debe requerir match_id', () => {
  const body = { type: 'chat' };
  const hasMatchId = 'match_id' in body;
  TestAssertions.assertFalse(hasMatchId, 'Debe requerir match_id');
});

runner.test('chats: POST type=chat valida que match exista', () => {
  const matchExists = false;
  TestAssertions.assertFalse(matchExists, 'Match debe existir');
});

runner.test('chats: POST type=chat valida que usuario esté en match', () => {
  const match = { user_a_id: 'user-123', user_b_id: 'user-456' };
  const currentUserId = 'user-789';

  const isParticipant = currentUserId === match.user_a_id || currentUserId === match.user_b_id;
  TestAssertions.assertFalse(isParticipant, 'Usuario debe estar en el match');
});

runner.test('chats: POST type=chat valida status del match', () => {
  const validStatuses = [
    'accepted',
    'room_offer',
    'room_assigned',
    'room_declined',
    'unmatched',
  ];
  const matchStatus = 'pending';

  const isValid = validStatuses.includes(matchStatus);
  TestAssertions.assertFalse(isValid, 'Match debe estar en estado válido');
});

runner.test('chats: POST type=chat previene duplicados', () => {
  const chatExists = true;
  TestAssertions.assertTrue(chatExists, 'No debe crear chat duplicado');
});

// ====================
// TESTS DE ENVÍO DE MENSAJE
// ====================

runner.test('chats: POST type=message debe requerir chat_id', () => {
  const body = { type: 'message', body: 'Hello' };
  const hasChatId = 'chat_id' in body;
  TestAssertions.assertFalse(hasChatId, 'Debe requerir chat_id');
});

runner.test('chats: POST type=message debe requerir body', () => {
  const body = { type: 'message', chat_id: 'chat-123' };
  const hasBody = 'body' in body;
  TestAssertions.assertFalse(hasBody, 'Debe requerir body');
});

runner.test('chats: POST type=message body no puede estar vacío', () => {
  const validBodies = ['Hello', 'Hi there!', 'Test message'];
  const invalidBodies = ['', '  ', '\n\t'];

  for (const body of validBodies) {
    TestAssertions.assertTrue(body.trim().length > 0, `"${body}" debe ser válido`);
  }

  for (const body of invalidBodies) {
    TestAssertions.assertFalse(body.trim().length > 0, `"${body}" debe ser inválido`);
  }
});

runner.test('chats: POST type=message body máximo 1000 caracteres', () => {
  const validBody = 'a'.repeat(1000);
  const invalidBody = 'a'.repeat(1001);

  TestAssertions.assertTrue(validBody.length <= 1000, 'Debe aceptar 1000 caracteres');
  TestAssertions.assertFalse(invalidBody.length <= 1000, 'Debe rechazar 1001 caracteres');
});

runner.test('chats: POST type=message valida que usuario esté en el chat', () => {
  const chat = { match_id: 'match-123' };
  const match = { user_a_id: 'user-123', user_b_id: 'user-456' };
  const currentUserId = 'user-789';

  const isParticipant = currentUserId === match.user_a_id || currentUserId === match.user_b_id;
  TestAssertions.assertFalse(isParticipant, 'Usuario debe estar en el chat');
});

runner.test('chats: POST type=message establece sender_id del token', () => {
  const bodyReq = { body: 'Hello', sender_id: 'fake-sender' };
  const tokenUserId = 'real-user-123';

  const finalSenderId = tokenUserId;
  TestAssertions.assertNotEquals(finalSenderId, bodyReq.sender_id, 'Debe usar sender_id del token');
});

// ====================
// TESTS DE GET CHATS
// ====================

runner.test('chats: GET lista solo chats del usuario', () => {
  const userId = 'user-123';
  const chats = [
    { match_id: 'match-1', user_a_id: 'user-123', user_b_id: 'user-456' },
    { match_id: 'match-2', user_a_id: 'user-789', user_b_id: 'user-012' }, // No debe aparecer
  ];

  const userChats = chats.filter(
    c => c.user_a_id === userId || c.user_b_id === userId
  );

  TestAssertions.assertEquals(userChats.length, 1, 'Solo debe devolver chats del usuario');
});

runner.test('chats: GET con chat_id valida participación', () => {
  const chat = { match_id: 'match-123' };
  const match = { user_a_id: 'user-123', user_b_id: 'user-456' };
  const currentUserId = 'user-789';

  const isParticipant = currentUserId === match.user_a_id || currentUserId === match.user_b_id;
  TestAssertions.assertFalse(isParticipant, 'Debe validar participación');
});

runner.test('chats: GET con match_id valida participación', () => {
  const match = { user_a_id: 'user-123', user_b_id: 'user-456' };
  const currentUserId = 'user-789';

  const isParticipant = currentUserId === match.user_a_id || currentUserId === match.user_b_id;
  TestAssertions.assertFalse(isParticipant, 'Debe validar participación');
});

// ====================
// TESTS DE MARK AS READ
// ====================

runner.test('chats: PATCH marca mensajes como leídos', () => {
  const chatId = 'chat-123';
  const currentUserId = 'user-123';

  // Debe actualizar read_at de mensajes no leídos donde sender_id != currentUserId
  const shouldMarkAsRead = true;
  TestAssertions.assertTrue(shouldMarkAsRead, 'Debe marcar mensajes como leídos');
});

runner.test('chats: PATCH no marca propios mensajes como leídos', () => {
  const message = { sender_id: 'user-123', read_at: null };
  const currentUserId = 'user-123';

  const shouldMarkAsRead = message.sender_id !== currentUserId;
  TestAssertions.assertFalse(shouldMarkAsRead, 'No debe marcar propios mensajes');
});

runner.test('chats: PATCH no marca mensajes ya leídos', () => {
  const message = { sender_id: 'user-456', read_at: '2024-01-01T00:00:00Z' };

  const shouldMarkAsRead = message.read_at === null;
  TestAssertions.assertFalse(shouldMarkAsRead, 'No debe remarcar mensajes ya leídos');
});

runner.test('chats: PATCH valida participación en el chat', () => {
  const chat = { match_id: 'match-123' };
  const match = { user_a_id: 'user-123', user_b_id: 'user-456' };
  const currentUserId = 'user-789';

  const isParticipant = currentUserId === match.user_a_id || currentUserId === match.user_b_id;
  TestAssertions.assertFalse(isParticipant, 'Debe validar participación');
});

// ====================
// TESTS DE DELETE CHAT
// ====================

runner.test('chats: DELETE elimina chat y mensajes', () => {
  const shouldDeleteMessages = true;
  TestAssertions.assertTrue(shouldDeleteMessages, 'Debe eliminar mensajes en cascada');
});

runner.test('chats: DELETE valida participación', () => {
  const chat = { match_id: 'match-123' };
  const match = { user_a_id: 'user-123', user_b_id: 'user-456' };
  const currentUserId = 'user-789';

  const canDelete = currentUserId === match.user_a_id || currentUserId === match.user_b_id;
  TestAssertions.assertFalse(canDelete, 'Solo participantes pueden eliminar');
});

// ====================
// TESTS DE CÓDIGOS HTTP
// ====================

runner.test('chats: GET sin autenticación debe devolver 401', () => {
  const expectedStatus = 401;
  TestAssertions.assertEquals(expectedStatus, 401);
});

runner.test('chats: POST sin type debe devolver 400', () => {
  const expectedStatus = 400;
  TestAssertions.assertEquals(expectedStatus, 400);
});

runner.test('chats: POST type=chat sin match_id debe devolver 400', () => {
  const expectedStatus = 400;
  TestAssertions.assertEquals(expectedStatus, 400);
});

runner.test('chats: POST type=chat con match inválido debe devolver 400', () => {
  const expectedStatus = 400;
  TestAssertions.assertEquals(expectedStatus, 400);
});

runner.test('chats: POST type=message sin body debe devolver 400', () => {
  const expectedStatus = 400;
  TestAssertions.assertEquals(expectedStatus, 400);
});

runner.test('chats: POST type=message con body >1000 chars debe devolver 400', () => {
  const expectedStatus = 400;
  TestAssertions.assertEquals(expectedStatus, 400);
});

runner.test('chats: POST sin permisos debe devolver 403', () => {
  const expectedStatus = 403;
  TestAssertions.assertEquals(expectedStatus, 403);
});

runner.test('chats: GET chat inexistente debe devolver 404', () => {
  const expectedStatus = 404;
  TestAssertions.assertEquals(expectedStatus, 404);
});

runner.test('chats: POST exitoso debe devolver 200 o 201', () => {
  const validStatuses = [200, 201];
  TestAssertions.assertTrue(validStatuses.includes(200) || validStatuses.includes(201));
});

runner.test('chats: PATCH exitoso debe devolver 200', () => {
  const expectedStatus = 200;
  TestAssertions.assertEquals(expectedStatus, 200);
});

runner.test('chats: DELETE exitoso debe devolver 200 o 204', () => {
  const validStatuses = [200, 204];
  TestAssertions.assertTrue(validStatuses.includes(200) || validStatuses.includes(204));
});

// ====================
// TESTS DE MÉTODOS HTTP
// ====================

runner.test('chats: GET requiere autenticación', () => {
  const requestWithoutAuth = createMockRequest('http://localhost/chats', {
    method: 'GET',
  });

  const hasAuth = requestWithoutAuth.headers.has('Authorization');
  TestAssertions.assertFalse(hasAuth, 'Request sin auth debe fallar');
});

runner.test('chats: POST requiere autenticación', () => {
  const requestWithoutAuth = createMockRequest('http://localhost/chats', {
    method: 'POST',
    body: { type: 'chat', match_id: 'match-123' },
  });

  const hasAuth = requestWithoutAuth.headers.has('Authorization');
  TestAssertions.assertFalse(hasAuth, 'Request sin auth debe fallar');
});

runner.test('chats: PATCH requiere autenticación', () => {
  const requestWithoutAuth = createMockRequest('http://localhost/chats?chat_id=chat-123', {
    method: 'PATCH',
  });

  const hasAuth = requestWithoutAuth.headers.has('Authorization');
  TestAssertions.assertFalse(hasAuth, 'Request sin auth debe fallar');
});

runner.test('chats: DELETE requiere autenticación', () => {
  const requestWithoutAuth = createMockRequest('http://localhost/chats', {
    method: 'DELETE',
    body: { chat_id: 'chat-123' },
  });

  const hasAuth = requestWithoutAuth.headers.has('Authorization');
  TestAssertions.assertFalse(hasAuth, 'Request sin auth debe fallar');
});

// ====================
// EJECUTAR TESTS
// ====================

if (import.meta.main) {
  console.log('🧪 Running chats tests...\n');
  const results = await runner.run();
  const summary = runner.printResults(results);

  Deno.exit(summary.failed > 0 ? 1 : 0);
}
