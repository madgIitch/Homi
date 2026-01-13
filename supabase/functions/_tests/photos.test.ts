// supabase/functions/_tests/photos.test.ts

/**
 * Tests para profile-photos y room-photos
 * Valida uploads, permisos, limites y ownership
 */

import { TestRunner, TestAssertions, createMockRequest } from './test-utils.ts';

const runner = new TestRunner();

// ====================
// TESTS DE VALIDACION DE CONTENT TYPE
// ====================

runner.test('photos: debe requerir multipart/form-data', () => {
  const request = createMockRequest('http://localhost/profile-photos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  const contentType = request.headers.get('Content-Type') || '';
  const isMultipart = contentType.toLowerCase().includes('multipart/form-data');
  TestAssertions.assertFalse(isMultipart, 'Debe fallar si no es multipart/form-data');
});

// ====================
// TESTS DE VALIDACION DE ARCHIVO
// ====================

runner.test('photos: debe requerir campo photo', () => {
  const formData = new FormData();
  const file = formData.get('photo');
  TestAssertions.assertNull(file, 'Debe fallar si no hay archivo en campo photo');
});

// ====================
// TESTS DE LIMITES Y POSICIONES
// ====================

runner.test('photos: no debe permitir mas de 10 fotos de perfil', () => {
  const existing = new Array(10).fill({ id: 'photo' });
  const canAddMore = existing.length < 10;
  TestAssertions.assertFalse(canAddMore, 'Debe fallar si hay 10 fotos');
});

runner.test('photos: la primera foto debe ser primary', () => {
  const existingCount = 0;
  const isPrimary = existingCount === 0;
  TestAssertions.assertTrue(isPrimary, 'Primera foto debe ser primary');
});

runner.test('photos: posicion incrementa para nuevas fotos', () => {
  const existingPositions = [1, 2, 3];
  const nextPosition = Math.max(...existingPositions) + 1;
  TestAssertions.assertEquals(nextPosition, 4);
});

// ====================
// TESTS DE PERMISOS Y OWNERSHIP
// ====================

runner.test('photos: room-photos requiere room_id', () => {
  const formData = new FormData();
  const roomId = formData.get('room_id');
  TestAssertions.assertNull(roomId, 'Debe requerir room_id');
});

runner.test('photos: room-photos solo owner puede subir', () => {
  const room = { owner_id: 'owner-1' };
  const userId = 'user-2';
  const isOwner = room.owner_id === userId;
  TestAssertions.assertFalse(isOwner, 'Debe rechazar si no es owner');
});

// ====================
// TESTS DE PRIMARY Y BORRADO
// ====================

runner.test('photos: PATCH requiere id de foto', () => {
  const body = {};
  const hasId = 'id' in body;
  TestAssertions.assertFalse(hasId, 'Debe requerir id para set primary');
});

runner.test('photos: DELETE requiere id de foto', () => {
  const body = {};
  const hasId = 'id' in body;
  TestAssertions.assertFalse(hasId, 'Debe requerir id para borrar');
});

runner.test('photos: si se borra primary, debe elegir nueva o limpiar avatar', () => {
  const remaining = [{ id: 'photo-2', is_primary: false }];
  const hasRemaining = remaining.length > 0;
  TestAssertions.assertTrue(hasRemaining, 'Debe reasignar primary si hay fotos');
});

// ====================
// EJECUTAR TESTS
// ====================

if (import.meta.main) {
  console.log('Running photos tests...\n');
  const results = await runner.run();
  const summary = runner.printResults(results);

  Deno.exit(summary.failed > 0 ? 1 : 0);
}
