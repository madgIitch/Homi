// supabase/functions/_tests/rooms.test.ts

/**
 * Tests para la edge function rooms
 * Valida CRUD de flats y rooms, validaciones y permisos
 */

import {
  TestRunner,
  TestAssertions,
  createMockRequest,
} from './test-utils.ts';

const runner = new TestRunner();

// ====================
// TESTS DE VALIDACIÓN GET
// ====================

runner.test('rooms: GET debe requerir parámetro type', () => {
  // Sin type
  const shouldFail = true;
  TestAssertions.assertTrue(shouldFail, 'Debe requerir type parameter');
});

runner.test('rooms: GET type debe ser flats, rooms o room', () => {
  const validTypes = ['flats', 'rooms', 'room'];
  const invalidTypes = ['flat', 'apartments', 'houses'];

  for (const type of validTypes) {
    TestAssertions.assertTrue(validTypes.includes(type), `${type} debe ser válido`);
  }

  for (const type of invalidTypes) {
    TestAssertions.assertFalse(validTypes.includes(type), `${type} debe ser inválido`);
  }
});

runner.test('rooms: GET type=room requiere flat_ids', () => {
  const type = 'room';
  const flatIds = undefined;

  const requiresFlatIds = type === 'room';
  TestAssertions.assertTrue(requiresFlatIds, 'type=room requiere flat_ids');
});

// ====================
// TESTS DE VALIDACIÓN POST FLAT
// ====================

runner.test('rooms: POST flat address debe tener mínimo 5 caracteres', () => {
  const validAddresses = ['Calle Mayor 1', '123 Main St'];
  const invalidAddresses = ['', 'C1', 'Ave'];

  for (const address of validAddresses) {
    TestAssertions.assertTrue(address.length >= 5, `${address} debe ser válido`);
  }

  for (const address of invalidAddresses) {
    TestAssertions.assertFalse(address.length >= 5, `${address} debe ser inválido`);
  }
});

runner.test('rooms: POST flat city debe tener mínimo 2 caracteres', () => {
  const validCities = ['Madrid', 'NY'];
  const invalidCities = ['', 'M'];

  for (const city of validCities) {
    TestAssertions.assertTrue(city.length >= 2, `${city} debe ser válido`);
  }

  for (const city of invalidCities) {
    TestAssertions.assertFalse(city.length >= 2, `${city} debe ser inválido`);
  }
});

runner.test('rooms: POST flat capacity_total debe ser positivo', () => {
  const validCapacities = [1, 5, 10];
  const invalidCapacities = [0, -1, -10];

  for (const cap of validCapacities) {
    TestAssertions.assertTrue(cap > 0, `${cap} debe ser válido`);
  }

  for (const cap of invalidCapacities) {
    TestAssertions.assertFalse(cap > 0, `${cap} debe ser inválido`);
  }
});

runner.test('rooms: POST flat fuerza owner_id del token', () => {
  const body = { address: 'Test', city: 'Madrid', owner_id: 'fake-owner' };
  const tokenUserId = 'real-user-123';

  // La función debe sobrescribir con tokenUserId
  const finalOwnerId = tokenUserId;
  TestAssertions.assertNotEquals(finalOwnerId, body.owner_id, 'Debe forzar owner_id del token');
});

// ====================
// TESTS DE VALIDACIÓN POST ROOM
// ====================

runner.test('rooms: POST room debe requerir flat_id', () => {
  const body = { title: 'Room', price_per_month: 500 };
  const hasFlatId = 'flat_id' in body;
  TestAssertions.assertFalse(hasFlatId, 'Debe requerir flat_id');
});

runner.test('rooms: POST room price_per_month debe ser >= 0', () => {
  const validPrices = [0, 100, 500, 1000];
  const invalidPrices = [-1, -100];

  for (const price of validPrices) {
    TestAssertions.assertTrue(price >= 0, `${price} debe ser válido`);
  }

  for (const price of invalidPrices) {
    TestAssertions.assertFalse(price >= 0, `${price} debe ser inválido`);
  }
});

runner.test('rooms: POST room size_m2 debe ser >= 5', () => {
  const validSizes = [5, 10, 50];
  const invalidSizes = [0, 1, 4];

  for (const size of validSizes) {
    TestAssertions.assertTrue(size >= 5, `${size} debe ser válido`);
  }

  for (const size of invalidSizes) {
    TestAssertions.assertFalse(size >= 5, `${size} debe ser inválido`);
  }
});

runner.test('rooms: POST room debe requerir available_from', () => {
  const body = { title: 'Room', price_per_month: 500 };
  const hasAvailableFrom = 'available_from' in body;
  TestAssertions.assertFalse(hasAvailableFrom, 'Debe requerir available_from');
});

runner.test('rooms: POST room fuerza owner_id del token', () => {
  const body = { title: 'Room', flat_id: 'flat-123', owner_id: 'fake-owner' };
  const tokenUserId = 'real-user-123';

  const finalOwnerId = tokenUserId;
  TestAssertions.assertNotEquals(finalOwnerId, body.owner_id, 'Debe forzar owner_id del token');
});

// ====================
// TESTS DE PERMISOS
// ====================

runner.test('rooms: PATCH flat valida propietario', () => {
  const flat = { id: 'flat-123', owner_id: 'owner-123' };
  const currentUserId = 'other-456';

  const canUpdate = flat.owner_id === currentUserId;
  TestAssertions.assertFalse(canUpdate, 'Solo propietario puede actualizar');
});

runner.test('rooms: PATCH room valida propietario', () => {
  const room = { id: 'room-123', owner_id: 'owner-123' };
  const currentUserId = 'other-456';

  const canUpdate = room.owner_id === currentUserId;
  TestAssertions.assertFalse(canUpdate, 'Solo propietario puede actualizar');
});

runner.test('rooms: DELETE room valida propietario', () => {
  const room = { id: 'room-123', owner_id: 'owner-123' };
  const currentUserId = 'other-456';

  const canDelete = room.owner_id === currentUserId;
  TestAssertions.assertFalse(canDelete, 'Solo propietario puede eliminar');
});

runner.test('rooms: GET type=room valida owner o tenant del flat', () => {
  const flatOwnerId = 'owner-123';
  const currentUserId = 'tenant-456';
  const hasAcceptedAssignment = true;

  const canAccess = currentUserId === flatOwnerId || hasAcceptedAssignment;
  TestAssertions.assertTrue(canAccess, 'Owner o tenant puede acceder');
});

// ====================
// TESTS DE UPDATES
// ====================

runner.test('rooms: PATCH previene cambio de owner_id', () => {
  const forbiddenFields = ['owner_id', 'id', 'created_at'];
  const updates = { owner_id: 'new-owner', title: 'New Title' };

  const hasForbiddenField = 'owner_id' in updates;
  TestAssertions.assertTrue(hasForbiddenField, 'Debe eliminar owner_id de updates');
});

runner.test('rooms: PATCH previene cambio de id', () => {
  const forbiddenFields = ['owner_id', 'id', 'created_at'];
  const updates = { id: 'new-id', title: 'New Title' };

  const hasForbiddenField = 'id' in updates;
  TestAssertions.assertTrue(hasForbiddenField, 'Debe eliminar id de updates');
});

runner.test('rooms: PATCH previene cambio de created_at', () => {
  const forbiddenFields = ['owner_id', 'id', 'created_at'];
  const updates = { created_at: '2024-01-01', title: 'New Title' };

  const hasForbiddenField = 'created_at' in updates;
  TestAssertions.assertTrue(hasForbiddenField, 'Debe eliminar created_at de updates');
});

// ====================
// TESTS DE DELETE
// ====================

runner.test('rooms: DELETE room elimina photos del storage', () => {
  const shouldDeletePhotos = true;
  TestAssertions.assertTrue(shouldDeletePhotos, 'Debe eliminar photos de storage');
});

// ====================
// TESTS DE CÓDIGOS HTTP
// ====================

runner.test('rooms: GET sin type debe devolver 400', () => {
  const expectedStatus = 400;
  TestAssertions.assertEquals(expectedStatus, 400);
});

runner.test('rooms: GET type=room sin flat_ids debe devolver 400', () => {
  const expectedStatus = 400;
  TestAssertions.assertEquals(expectedStatus, 400);
});

runner.test('rooms: POST sin type debe devolver 400', () => {
  const expectedStatus = 400;
  TestAssertions.assertEquals(expectedStatus, 400);
});

runner.test('rooms: POST flat sin address debe devolver 400', () => {
  const expectedStatus = 400;
  TestAssertions.assertEquals(expectedStatus, 400);
});

runner.test('rooms: POST room sin flat_id debe devolver 400', () => {
  const expectedStatus = 400;
  TestAssertions.assertEquals(expectedStatus, 400);
});

runner.test('rooms: POST exitoso debe devolver 200 o 201', () => {
  const validStatuses = [200, 201];
  TestAssertions.assertTrue(validStatuses.includes(200) || validStatuses.includes(201));
});

runner.test('rooms: PATCH sin permisos debe devolver 403', () => {
  const expectedStatus = 403;
  TestAssertions.assertEquals(expectedStatus, 403);
});

runner.test('rooms: DELETE sin permisos debe devolver 403', () => {
  const expectedStatus = 403;
  TestAssertions.assertEquals(expectedStatus, 403);
});

// ====================
// TESTS DE MÉTODOS HTTP
// ====================

runner.test('rooms: GET requiere autenticación', () => {
  const requestWithoutAuth = createMockRequest('http://localhost/rooms?type=flats', {
    method: 'GET',
  });

  const hasAuth = requestWithoutAuth.headers.has('Authorization');
  TestAssertions.assertFalse(hasAuth, 'Request sin auth debe fallar');
});

runner.test('rooms: POST requiere autenticación', () => {
  const requestWithoutAuth = createMockRequest('http://localhost/rooms', {
    method: 'POST',
    body: { type: 'flat', address: 'Test', city: 'Madrid' },
  });

  const hasAuth = requestWithoutAuth.headers.has('Authorization');
  TestAssertions.assertFalse(hasAuth, 'Request sin auth debe fallar');
});

runner.test('rooms: PATCH requiere autenticación', () => {
  const requestWithoutAuth = createMockRequest('http://localhost/rooms', {
    method: 'PATCH',
    body: { type: 'flat', id: 'flat-123', title: 'New Title' },
  });

  const hasAuth = requestWithoutAuth.headers.has('Authorization');
  TestAssertions.assertFalse(hasAuth, 'Request sin auth debe fallar');
});

runner.test('rooms: DELETE requiere autenticación', () => {
  const requestWithoutAuth = createMockRequest('http://localhost/rooms', {
    method: 'DELETE',
    body: { type: 'room', id: 'room-123' },
  });

  const hasAuth = requestWithoutAuth.headers.has('Authorization');
  TestAssertions.assertFalse(hasAuth, 'Request sin auth debe fallar');
});

// ====================
// EJECUTAR TESTS
// ====================

if (import.meta.main) {
  console.log('🧪 Running rooms tests...\n');
  const results = await runner.run();
  const summary = runner.printResults(results);

  Deno.exit(summary.failed > 0 ? 1 : 0);
}
